import { getRecord, runTransaction } from "../core/database.js";

export function getBossProgress(db, bossId) {
  return getRecord(db, "bossProgress", bossId);
}

export function listBossProgress(db) {
  return runTransaction(db, ["bossProgress"], "readonly", (tx) => {
    const request = tx.objectStore("bossProgress").getAll();
    return () => request.result ?? [];
  });
}
