export const DB_NAME = "real-life-quest";
export const DB_VERSION = 2;
export const STORE_KEYS = Object.freeze({
  player: "id",
  settings: "id",
  questHistory: "id",
  approvals: "id",
  rewards: "id",
  transactions: "id",
  vocabularyPacks: "packId",
  vocabularyWords: "wordId",
  wordProgress: "wordId",
  wordSessions: "id",
  storyProgress: "storyId",
  bossProgress: "bossId",
});

// Append migrations; never edit a released migration or delete stores.
export const MIGRATIONS = Object.freeze({
  1(db) {
    for (const [name, keyPath] of Object.entries(STORE_KEYS)) {
      db.createObjectStore(name, { keyPath });
    }
  },
  2(db, transaction) {
    const indexes = {
      questHistory: ["questId", "completedAt"],
      approvals: ["status", "questHistoryId"],
      transactions: ["sourceId"],
      vocabularyWords: ["packId", "category", "level"],
      wordProgress: ["nextReviewAt", "state"],
      wordSessions: ["wordId", "startedAt"],
    };
    for (const [store, fields] of Object.entries(indexes)) {
      for (const field of fields) transaction.objectStore(store).createIndex(field, field);
    }
  },
});
