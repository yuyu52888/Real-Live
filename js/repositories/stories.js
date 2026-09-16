const STORY_URL = "./02_DATA/thinking_stories_30.json";
const STORY_ID = /^S(0[1-9]|[12]\d|30)$/;

export async function loadStories(url = STORY_URL, fetcher = fetch) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`無法讀取思維故事（HTTP ${response.status}）`);
  const stories = await response.json();
  validateStories(stories);
  return stories;
}

export function validateStories(stories) {
  if (!Array.isArray(stories) || stories.length !== 30) throw new Error("思維故事必須正好有 30 篇。");
  const ids = new Set();
  for (const story of stories) {
    if (!STORY_ID.test(story.id) || ids.has(story.id)) throw new Error(`故事 ID 無效或重複：${story.id}`);
    ids.add(story.id);
    for (const field of ["title", "theme", "body", "realityTask", "takeaway"]) {
      if (!String(story[field] ?? "").trim()) throw new Error(`${story.id} 缺少 ${field}`);
    }
    if (!Array.isArray(story.questions) || story.questions.length !== 4) throw new Error(`${story.id} 必須有 4 個想一想問題。`);
    if (!Number.isFinite(story.estimatedMinutes) || story.estimatedMinutes <= 0) throw new Error(`${story.id} 閱讀時間無效。`);
  }
  return stories;
}

export function getStoryById(stories, storyId) {
  return stories.find(({ id }) => id === storyId);
}
