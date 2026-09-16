import { getRecord, runTransaction } from "../core/database.js";

export function getStoryProgress(db, storyId) {
  return getRecord(db, "storyProgress", storyId);
}

export function listStoryProgress(db) {
  return runTransaction(db, ["storyProgress"], "readonly", (tx) => {
    const request = tx.objectStore("storyProgress").getAll();
    return () => request.result ?? [];
  });
}

export function markStoryCompleted(db, storyId, completedAt = new Date().toISOString()) {
  return runTransaction(db, ["storyProgress"], "readwrite", (tx) => {
    const store = tx.objectStore("storyProgress");
    const request = store.get(storyId);
    let record;
    let firstCompletion = false;
    request.onsuccess = () => {
      record = request.result;
      if (record?.completedAt) return;
      record = { storyId, completedAt };
      firstCompletion = true;
      store.put(record);
    };
    return () => ({ record, firstCompletion });
  });
}
