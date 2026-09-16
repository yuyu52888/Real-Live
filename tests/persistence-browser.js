import { openDatabase, getRecord, putRecord, runTransaction } from "../js/core/database.js";
import { MIGRATIONS, STORE_KEYS } from "../js/core/db-schema.js";
import { exportBackup, importBackup } from "../js/services/backup.js";
import { resetDevelopmentDatabase } from "../js/dev/reset.js";
import { createInitialState } from "../js/core/app-state.js";
import { persistOnboarding, loadOnboarding } from "../js/services/onboarding-storage.js";

export async function testPersistence() {
  const name = `rlq-test-${crypto.randomUUID()}`;
  let db = await openDatabase({ name, version: 1 });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    const state = createInitialState();
    state.onboarding.avatarVariant = "boy";
    state.onboarding.step = "nickname";
    await persistOnboarding(db, state);
    const original = { wordId: "core:W001", state: "practiced", correctCount: 9 };
    await putRecord(db, "wordProgress", original);
    await putRecord(db, "approvals", { id: "approval:quest-a", status: "pending" });
    await putRecord(db, "transactions", { id: "transaction:quest-a", amount: 20 });
    db.close();
    db = await openDatabase({ name });
    check(db.version === 2, "Upgrade version");
    check((await loadOnboarding(db)).onboarding.avatarVariant === "boy", "Player/settings survive upgrade");
    check(JSON.stringify(await getRecord(db, "wordProgress", original.wordId)) === JSON.stringify(original), "Upgrade preserves progress");
    check(db.transaction("wordProgress").objectStore("wordProgress").indexNames.contains("state"), "Upgrade adds index");
    db.close();
    let failed = false;
    try {
      await openDatabase({ name, version: 3, migrations: {
        ...MIGRATIONS,
        3(database, tx) {
          tx.objectStore("wordProgress").put({ ...original, correctCount: 0 });
          throw new Error("Injected migration failure");
        },
      } });
    } catch { failed = true; }
    check(failed, "Broken migration must reject");
    db = await openDatabase({ name });
    check(db.version === 2 && (await getRecord(db, "wordProgress", original.wordId)).correctCount === 9, "Migration rollback preserves version and records");

    const backup = await exportBackup(db);
    await putRecord(db, "wordProgress", { ...original, correctCount: 10 });
    await importBackup(db, JSON.stringify(backup));
    check((await getRecord(db, "wordProgress", original.wordId)).correctCount === 9, "Backup roundtrip");
    const invalid = structuredClone(backup);
    invalid.stores.wordProgress.push({ wordId: original.wordId });
    failed = false;
    try { await importBackup(db, invalid); } catch { failed = true; }
    check(failed && (await getRecord(db, "wordProgress", original.wordId)).correctCount === 9, "Invalid restore leaves data untouched");
    check((await getRecord(db, "approvals", "approval:quest-a")).status === "pending", "Approval retained");
    check((await getRecord(db, "transactions", "transaction:quest-a")).amount === 20, "Transaction retained");

    try {
      await runTransaction(db, ["wordProgress"], "readwrite", (tx) => {
        tx.objectStore("wordProgress").put({ ...original, correctCount: 100 });
        tx.objectStore("wordProgress").add(original);
      });
      throw new Error("Expected duplicate key abort");
    } catch (error) { check(error.name === "ConstraintError", "Expected atomic abort"); }
    check((await getRecord(db, "wordProgress", original.wordId)).correctCount === 9, "Aborted transaction rolls back writes");

    // Storage-only extension: content writes must never replace wordProgress.
    for (const total of [300, 600, 800, 2000]) {
      await runTransaction(db, ["vocabularyWords"], "readwrite", (tx) => {
        for (let word = 1; word <= total; word += 1) {
          tx.objectStore("vocabularyWords").put({ wordId: `fixture:word-${word}`, packId: "fixture" });
        }
      });
      check((await getRecord(db, "wordProgress", original.wordId)).correctCount === 9, `Progress retained at ${total} words`);
    }
    failed = false;
    try { await resetDevelopmentDatabase(db); } catch { failed = true; }
    check(failed, "Reset requires explicit guards");
    failed = false;
    try {
      await resetDevelopmentDatabase(db, {
        enabled: true, confirmation: `RESET ${name}`,
        preserveBackup: async () => putRecord(db, "approvals", { id: "approval:new", status: "pending" }),
      });
    } catch { failed = true; }
    check(failed && Boolean(await getRecord(db, "wordProgress", original.wordId)), "Reset rejects concurrent changes without clearing data");
    let savedBackup;
    await resetDevelopmentDatabase(db, {
      enabled: true, confirmation: `RESET ${name}`, preserveBackup: async (data) => { savedBackup = data; },
    });
    check(savedBackup.stores.wordProgress.length === 1, "Reset preserves backup first");
    check(db.objectStoreNames.length === Object.keys(STORE_KEYS).length, "Reset retains schema");
    check(!(await getRecord(db, "wordProgress", original.wordId)), "Explicit test reset clears records");
    return "PASS: upgrade, rollback, atomic transactions, backup, approvals, word extension, guarded reset";
  } finally {
    db.close();
    // Only this UUID-named test database is removed; production migrations never delete databases.
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }
}
