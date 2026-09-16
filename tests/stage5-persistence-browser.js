import { openDatabase, putRecord } from "../js/core/database.js";
import { getStoryProgress, listStoryProgress, markStoryCompleted } from "../js/repositories/story-progress.js";
import { chapterProgress } from "../js/services/story-chapters.js";

export async function testStage5Persistence() {
  const name = `real-life-quest-stage5-${Date.now()}-${Math.random()}`;
  let db = await openDatabase({ name });
  const sentinels = {
    player: { id: "local-player", progress: { exp: { current: 17, target: 100 } } },
    rewards: { id: "reward-sentinel", type: "test" },
    transactions: { id: "transaction-sentinel", amount: 9 },
    bossProgress: { bossId: "B01", hp: 3 },
  };
  await Promise.all(Object.entries(sentinels).map(([store, record]) => putRecord(db, store, record)));

  const timestamp = "2026-09-16T08:00:00.000Z";
  const [first, duplicate] = await Promise.all([
    markStoryCompleted(db, "S01", timestamp),
    markStoryCompleted(db, "S01", "2026-09-16T09:00:00.000Z"),
  ]);
  assertEqual(Number(first.firstCompletion) + Number(duplicate.firstCompletion), 1, "concurrent first completion count");
  assertEqual((await listStoryProgress(db)).length, 1, "concurrent record count");
  assertEqual((await getStoryProgress(db, "S01")).completedAt, timestamp, "first timestamp preserved");

  db.close();
  db = await openDatabase({ name });
  const reread = await markStoryCompleted(db, "S01", "2026-09-17T08:00:00.000Z");
  assertEqual(reread.firstCompletion, false, "reload reread idempotency");
  assertEqual((await listStoryProgress(db)).length, 1, "reload record count");
  assertEqual((await getStoryProgress(db, "S01")).completedAt, timestamp, "reload timestamp preserved");

  for (const storyId of ["S02", "S03", "S04", "S05"]) await markStoryCompleted(db, storyId, timestamp);
  const progress = await listStoryProgress(db);
  const chapter = { stories: ["S01", "S02", "S03", "S04", "S05"].map((id) => ({ id })) };
  assertEqual(JSON.stringify(chapterProgress(chapter, progress)), JSON.stringify({ completed: 5, total: 5, complete: true }), "chapter 5/5");

  for (const [store, expected] of Object.entries(sentinels)) {
    const actual = await new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).get(store === "bossProgress" ? "B01" : expected.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), `${store} unchanged`);
  }
  db.close();
  return "Stage 5 persistence PASS: concurrent/reload/reread idempotency, first timestamp, 5/5, no EXP/reward/Boss mutations.";
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}
