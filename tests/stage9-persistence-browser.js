import { getRecord, openDatabase, putRecord } from "../js/core/database.js";
import { savePlayer } from "../js/repositories/player.js";
import { saveSettings } from "../js/repositories/settings.js";
import { exportBackup, previewBackup, restoreBackup } from "../js/services/backup.js";

export async function testStage9Persistence() {
  const name = `real-life-quest-stage9-${crypto.randomUUID()}`;
  let db = await openDatabase({ name });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    await savePlayer(db, {
      nickname: "備份測試", avatarVariant: "girl", onboardingStep: "complete",
      progress: { level: 3, title: "小小冒險家", exp: { current: 70, target: 105 } },
    });
    await saveSettings(db, {
      preferences: {
        dailyTaskGoal: 2, exerciseEnabled: true, choresEnabled: true, parentApprovalRequired: true,
        speechRate: 0.75, maxTaskDifficulty: 5, restDays: [], speechMinRate: 0.6, speechMaxRate: 1.1,
        materialRewardsEnabled: false,
      },
      pinCredential: { algorithm: "PBKDF2-SHA-256", iterations: 100000, salt: "a".repeat(32), hash: "b".repeat(64) },
    });
    await putRecord(db, "questHistory", { id: "quest:T001:2026-09-18", questId: "T001", status: "completed", exp: 3 });
    await putRecord(db, "wordProgress", { wordId: "core300-zhTW:W001", state: "practiced", correctCount: 4 });
    await putRecord(db, "storyProgress", { storyId: "S01", completedAt: "2026-09-18T01:00:00.000Z" });
    await putRecord(db, "rewards", { id: "inventory:badge:test", type: "inventory", category: "badge", quantity: 1 });
    await putRecord(db, "bossProgress", { bossId: "B01", completedSteps: [1], startedAt: "2026-09-18T01:00:00.000Z" });

    const backup = await exportBackup(db, { now: new Date("2026-09-18T02:00:00.000Z") });
    check(backup.stores.questHistory.length === 1 && backup.stores.wordProgress.length === 1, "export captures representative progress");

    await putRecord(db, "questHistory", { id: "quest:T001:2026-09-18", questId: "T001", status: "completed", exp: 999 });
    await putRecord(db, "questHistory", { id: "quest:EXTRA:2026-09-18", questId: "EXTRA", status: "completed", exp: 99 });
    await restoreBackup(db, backup);
    check((await getRecord(db, "questHistory", "quest:T001:2026-09-18")).exp === 3, "restore replaces mutated record");
    check(!(await getRecord(db, "questHistory", "quest:EXTRA:2026-09-18")), "restore removes records absent from backup");
    check((await getRecord(db, "wordProgress", "core300-zhTW:W001")).correctCount === 4, "restore preserves word progress");

    const invalid = structuredClone(backup);
    invalid.stores.wordProgress.push({ ...invalid.stores.wordProgress[0] });
    let rejected = false;
    try { await restoreBackup(db, invalid); } catch { rejected = true; }
    check(rejected, "duplicate backup is rejected");
    check((await getRecord(db, "questHistory", "quest:T001:2026-09-18")).exp === 3, "invalid restore leaves current data untouched");

    const v1 = structuredClone(backup);
    v1.dbVersion = 1;
    const preview = previewBackup(v1, db.version);
    check(preview.migrated && preview.sourceDbVersion === 1 && preview.backup.dbVersion === 2, "v1 backup previews as safe v2 migration");
    return "Stage 9 persistence PASS: export, replacement restore, rollback safety, v1→v2 preview.";
  } finally {
    db.close();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }
}
