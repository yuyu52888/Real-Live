const STORY_ID = /^S(0[1-9]|[12]\d|30)$/;

export function chapterNumberForStory(storyId) {
  const match = STORY_ID.exec(storyId);
  if (!match) throw new Error(`未知的故事 ID：${storyId}`);
  return Math.ceil(Number(match[1]) / 5);
}

export function buildStoryChapters(stories, bosses) {
  const bossByChapter = new Map(bosses.map((boss) => [boss.chapter, boss]));
  return Array.from({ length: 6 }, (_, index) => {
    const chapter = index + 1;
    const boss = bossByChapter.get(chapter);
    if (!boss?.id || !boss?.chapterName) throw new Error(`缺少第 ${chapter} 章的 canonical Boss metadata。`);
    return {
      number: chapter,
      chapterName: boss.chapterName,
      bossId: boss.id,
      bossName: boss.name,
      stories: stories.filter(({ id }) => chapterNumberForStory(id) === chapter),
    };
  });
}

export function chapterProgress(chapter, progressRecords) {
  const completed = new Set(progressRecords.filter(({ completedAt }) => completedAt).map(({ storyId }) => storyId));
  const count = chapter.stories.filter(({ id }) => completed.has(id)).length;
  return { completed: count, total: chapter.stories.length, complete: count === chapter.stories.length };
}
