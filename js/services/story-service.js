import { listStoryProgress, markStoryCompleted } from "../repositories/story-progress.js";
import { loadStories } from "../repositories/stories.js";
import { buildStoryChapters } from "./story-chapters.js";

const BOSS_URL = "./03_REWARDS_BOSSES/BOSSES_6.json";

export async function loadStoryDashboard(db, options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const [stories, bossResponse, progress] = await Promise.all([
    loadStories(options.storyUrl, fetcher),
    fetcher(options.bossUrl ?? BOSS_URL),
    listStoryProgress(db),
  ]);
  if (!bossResponse.ok) throw new Error(`無法讀取章節資料（HTTP ${bossResponse.status}）`);
  const chapters = buildStoryChapters(stories, await bossResponse.json());
  return { stories, chapters, progress };
}

export async function completeStory(db, storyId, completedAt) {
  const completion = await markStoryCompleted(db, storyId, completedAt);
  return { ...completion, progress: await listStoryProgress(db) };
}
