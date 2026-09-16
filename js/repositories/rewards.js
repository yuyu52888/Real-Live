import { getRecord, runTransaction } from "../core/database.js";

export function getRewardRecord(db, id) {
  return getRecord(db, "rewards", id);
}

export function listRewardRecords(db) {
  return runTransaction(db, ["rewards"], "readonly", (tx) => {
    const request = tx.objectStore("rewards").getAll();
    return () => request.result ?? [];
  });
}
