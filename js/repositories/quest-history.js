import { getRecord, runTransaction } from "../core/database.js";

export function getQuestHistory(db, completionId) {
  return getRecord(db, "questHistory", completionId);
}

export function listQuestHistory(db) {
  return runTransaction(db, ["questHistory"], "readonly", (tx) => {
    const request = tx.objectStore("questHistory").getAll();
    return () => request.result ?? [];
  });
}
