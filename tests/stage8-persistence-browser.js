import { getRecord, openDatabase, putRecord } from "../js/core/database.js";
import { getApproval } from "../js/repositories/approvals.js";
import { getPlayer, savePlayer } from "../js/repositories/player.js";
import { getSettings, saveSettings } from "../js/repositories/settings.js";
import { loadTasks } from "../js/repositories/tasks.js";
import { getVocabularyPack, getWordProgress, setVocabularyPackEnabled } from "../js/repositories/vocabulary.js";
import { loadOnboarding } from "../js/services/onboarding-storage.js";
import { saveParentPreferences, switchPlayerAvatar } from "../js/services/parent-settings.js";
import { approveQuestCompletion, completionInstanceId, requestQuestCompletion, returnQuestCompletion, startQuest, updateQuestProgress } from "../js/services/quest-service.js";
import { getSpeechPreferences, setSpeechRate } from "../js/services/speech.js";
import { importVocabularyPack } from "../js/services/vocabulary-import.js";

export async function testStage8Persistence() {
  const name = `real-life-quest-stage8-${crypto.randomUUID()}`;
  const now = new Date(2026, 8, 18, 9);
  let db = await openDatabase({ name });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    await savePlayer(db, { nickname: "家長測試", avatarVariant: "boy", onboardingStep: "complete", progress: { level: 1, title: "新手冒險家", exp: { current: 0, target: 100 } } });
    await saveSettings(db, { preferences: { dailyTaskGoal: 2, exerciseEnabled: true, choresEnabled: true, parentApprovalRequired: true, speechRate: 1 } });
    const tasks = await loadTasks();
    const ordinary = tasks.find((task) => !task.requiresParentConfirmation);
    await startQuest(db, ordinary, { now });
    await updateQuestProgress(db, ordinary, 7, { now });
    await requestQuestCompletion(db, ordinary, { now, parentApprovalRequired: true });
    const completionId = completionInstanceId(ordinary, now);
    check((await getRecord(db, "questHistory", completionId)).status === "pending_approval", "global approval policy creates pending state");
    check((await getPlayer(db)).progress.exp.current === 0, "pending item receives no early EXP");

    await returnQuestCompletion(db, completionId, { now: new Date(2026, 8, 18, 10) });
    let history = await getRecord(db, "questHistory", completionId);
    let approval = await getApproval(db, `approval:${completionId}`);
    check(history.status === "returned" && history.progress.value === 7, "return preserves progress");
    check(approval.status === "returned" && approval.returnEvents.length === 1, "return event appended");
    await updateQuestProgress(db, ordinary, 8, { now });
    await requestQuestCompletion(db, ordinary, { now, parentApprovalRequired: true });
    approval = await getApproval(db, `approval:${completionId}`);
    check(approval.status === "pending" && approval.id === `approval:${completionId}`, "resubmit reuses approval identity");
    await approveQuestCompletion(db, completionId, { now });
    await approveQuestCompletion(db, completionId, { now });
    check((await getPlayer(db)).progress.exp.current === ordinary.exp, "approval pays once");
    await returnQuestCompletion(db, completionId, { now });
    check((await getRecord(db, "questHistory", completionId)).status === "completed", "approved completion cannot be returned");
    const canonicalApprovalTask = tasks.find((task) => task.requiresParentConfirmation);
    const canonicalNow = new Date(2026, 8, 19, 9);
    await startQuest(db, canonicalApprovalTask, { now: canonicalNow });
    await requestQuestCompletion(db, canonicalApprovalTask, { now: canonicalNow, parentApprovalRequired: false });
    const canonicalId = completionInstanceId(canonicalApprovalTask, canonicalNow);
    check((await getRecord(db, "questHistory", canonicalId)).status === "pending_approval", "canonical approval cannot be bypassed");

    const saved = await saveParentPreferences(db, {
      dailyTaskGoal: 3, exerciseEnabled: false, choresEnabled: true, parentApprovalRequired: false,
      maxTaskDifficulty: 2, restDays: [0], speechMinRate: 0.7, speechMaxRate: 0.9, materialRewardsEnabled: true,
    });
    check(saved.speechRate === 0.9, "saving narrower bounds clamps existing rate");
    let rejected = false;
    try { await setSpeechRate(db, 1); } catch { rejected = true; }
    check(rejected, "child speech control respects parent bounds");
    check((await getSpeechPreferences(db)).rates.join(",") === "0.7,0.75,0.8,0.85,0.9", "speech choices follow bounds");
    await switchPlayerAvatar(db, "girl");
    db.close();
    db = await openDatabase({ name });
    const loaded = await loadOnboarding(db);
    check(loaded.onboarding.avatarVariant === "girl" && loaded.player.exp.current === ordinary.exp, "avatar switch survives reload without progress loss");
    check(loaded.onboarding.settings.maxTaskDifficulty === 2, "parent settings survive reload");

    const pack = await fetch("/incoming/chatgpt/data/vocabulary-fixtures/valid_minimal_pack_2.json").then((response) => response.json());
    await importVocabularyPack(db, pack);
    await putRecord(db, "wordProgress", { wordId: pack.words[0].wordId, state: "practiced", correctCount: 2 });
    await setVocabularyPackEnabled(db, pack.packId, false);
    check((await getVocabularyPack(db, pack.packId)).enabled === false, "pack can be disabled");
    check((await getWordProgress(db, pack.words[0].wordId)).correctCount === 2, "disable preserves progress");
    await importVocabularyPack(db, { ...pack, packVersion: "1.0.1" }, { allowUpdate: true });
    check((await getWordProgress(db, pack.words[0].wordId)).correctCount === 2, "explicit update preserves progress");
    return "Stage 8 persistence PASS: return/resubmit, one-time EXP, settings/avatar reload, speech bounds, pack progress.";
  } finally {
    db.close();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }
}
