import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderHome } from "../js/pages/home.js";
import { renderLearn } from "../js/pages/learn.js";
import { renderStories } from "../js/pages/stories.js";
import { validateStories } from "../js/repositories/stories.js";
import { createAssetResolver } from "../js/services/asset-registry.js";
import { buildStoryChapters, chapterNumberForStory, chapterProgress } from "../js/services/story-chapters.js";

const readJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const stories = await readJson("02_DATA/thinking_stories_30.json");
const bosses = await readJson("03_REWARDS_BOSSES/BOSSES_6.json");
const chapters = buildStoryChapters(stories, bosses);

test("Stage 5 loads exactly 30 canonical S01-S30 stories with required fields", () => {
  assert.equal(validateStories(stories), stories);
  assert.deepEqual(stories.map(({ id }) => id), Array.from({ length: 30 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`));
  for (const story of stories) {
    assert.equal(story.questions.length, 4);
    assert.ok(story.body.length > 0);
    assert.ok(story.realityTask);
    assert.ok(story.takeaway);
    assert.ok(story.estimatedMinutes >= 4 && story.estimatedMinutes <= 8);
  }
});

test("Stage 5 resolves chapters from stable IDs and canonical Boss metadata", () => {
  assert.equal(chapterNumberForStory("S01"), 1);
  assert.equal(chapterNumberForStory("S05"), 1);
  assert.equal(chapterNumberForStory("S06"), 2);
  assert.equal(chapterNumberForStory("S30"), 6);
  assert.throws(() => chapterNumberForStory("S31"));
  assert.deepEqual(chapters.map(({ chapterName, bossId }) => [chapterName, bossId]), [
    ["金錢森林", "B01"], ["等待之谷", "B02"], ["成長山脈", "B03"],
    ["智慧迷宮", "B04"], ["時間王國", "B05"], ["友情之城", "B06"],
  ]);
  assert.ok(chapters.every(({ stories: items }) => items.length === 5));
});

test("Stage 5 overview and reader expose canonical content without scoring", () => {
  const base = { stories, chapters, progress: [], selectedChapter: 1, selectedStoryId: null };
  const overview = renderStories({ storyUi: base });
  assert.match(overview, /30|思維故事/);
  assert.equal((overview.match(/data-open-story=/g) ?? []).length, 5);
  assert.match(overview, /0 \/ 5/);

  const reader = renderStories({ storyUi: { ...base, selectedStoryId: "S01" } });
  assert.match(reader, /第 1 章 · 金錢森林 · 約 8 分鐘/);
  for (const paragraph of stories[0].body.split(/\n+/).filter(Boolean)) assert.match(reader, new RegExp(escapeRegExp(paragraph)));
  for (const question of stories[0].questions) assert.match(reader, new RegExp(escapeRegExp(question)));
  assert.equal((reader.match(/<li>/g) ?? []).length, 4);
  assert.match(reader, new RegExp(escapeRegExp(stories[0].realityTask)));
  assert.match(reader, new RegExp(escapeRegExp(stories[0].takeaway)));
  assert.doesNotMatch(reader, /data-(?:answer|score|correct)/i);
  assert.doesNotMatch(reader, /答對|答錯|分數|計分/);
});

test("Stage 5 progress is derived at 1/5 and 5/5", () => {
  const oneCompletion = [{ storyId: "S01", completedAt: "2026-09-16T00:00:00.000Z" }];
  const fiveCompletions = chapters[0].stories.map(({ id }) => ({ storyId: id, completedAt: "2026-09-16T00:00:00.000Z" }));
  assert.deepEqual(chapterProgress(chapters[0], oneCompletion), { completed: 1, total: 5, complete: false });
  assert.deepEqual(chapterProgress(chapters[0], fiveCompletions), { completed: 5, total: 5, complete: true });
  assert.match(renderStories({ storyUi: { stories, chapters, progress: oneCompletion, selectedChapter: 1, selectedStoryId: "S01" } }), /本章進度 1 \/ 5/);
  const completedChapterReader = renderStories({ storyUi: { stories, chapters, progress: fiveCompletions, selectedChapter: 1, selectedStoryId: "S05" } });
  assert.match(completedChapterReader, /本章進度 5 \/ 5/);
  assert.match(completedChapterReader, /本章完成/);
});

test("Stage 5 pending covers resolve through the declared fox reading fallback", async () => {
  const manifest = await readJson("assets/ASSET_MANIFEST.json");
  const resolver = createAssetResolver(manifest);
  for (const story of stories) {
    assert.deepEqual(resolver.resolve(`story.${story.id}.cover`), {
      type: "path", logicalId: "pet.fox.reading", value: "./assets/pets/fox/fox_reading.png",
    });
  }
});

test("Stage 5 keeps one Learn route with working Home shortcuts and Stage 4 modes", () => {
  const home = renderHome({
    onboarding: { nickname: "測試者", avatarVariant: "girl", settings: { dailyTaskGoal: 2, exerciseEnabled: true, choresEnabled: true } },
    player: { level: 1, title: "新手冒險家", exp: { current: 0, target: 100 } },
    questUi: { tasks: [], history: [] },
  });
  assert.match(home, /data-learn-surface-link="english"/);
  assert.match(home, /data-learn-surface-link="stories"/);
  const english = renderLearn({ learnSurface: "english", learnUi: { totalWords: 300, masteredWords: 0, dueCount: 0, newCount: 5, plan: { items: [] }, speechRate: .75 } });
  assert.equal((english.match(/data-learn-mode=/g) ?? []).length, 5);
  const storyHub = renderLearn({ learnSurface: "stories", storyUi: { stories, chapters, progress: [], selectedChapter: 1, selectedStoryId: null } });
  assert.match(storyHub, /data-learn-surface="english"/);
  assert.match(storyHub, /data-learn-surface="stories"/);
});

test("Stage 5 runtime modules contain no EXP, reward, or Boss progress writes", async () => {
  const source = await Promise.all([
    "js/repositories/story-progress.js", "js/services/story-service.js", "js/pages/stories.js",
  ].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
  assert.doesNotMatch(source.join("\n"), /\b(?:player|transactions|rewards|bossProgress)\b/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
