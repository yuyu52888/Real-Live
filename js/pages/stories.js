import { getStoryById } from "../repositories/stories.js";
import { assetSource } from "../services/asset-registry.js";
import { chapterProgress, chapterNumberForStory } from "../services/story-chapters.js";
import { escapeHtml, icon } from "../ui/components.js";

export function renderStories(state) {
  const ui = state.storyUi;
  if (!ui || ui.loading) return `<section class="story-page story-loading" aria-live="polite"><p>故事正在準備中…</p></section>`;
  const selected = getStoryById(ui.stories, ui.selectedStoryId);
  return selected ? readerView(selected, ui) : overviewView(ui);
}

function overviewView(ui) {
  const selectedChapter = Number(ui.selectedChapter) || 1;
  const chapter = ui.chapters.find(({ number }) => number === selectedChapter) ?? ui.chapters[0];
  const progress = chapterProgress(chapter, ui.progress);
  return `<section class="story-page" aria-labelledby="story-title">
    <header class="story-hero">
      <div><p class="eyebrow">THINKING STORIES</p><h1 id="story-title">思維故事</h1><p>讀一段故事，慢慢想出自己的答案。</p></div>
      <div class="story-chapter-progress"><strong>${progress.completed} / ${progress.total}</strong><span>${escapeHtml(chapter.chapterName)}</span></div>
    </header>
    <div class="chapter-tabs" role="tablist" aria-label="故事章節">
      ${ui.chapters.map((item) => chapterTab(item, ui)).join("")}
    </div>
    <section class="chapter-heading" aria-label="第 ${chapter.number} 章">
      <div><small>第 ${chapter.number} 章</small><h2>${escapeHtml(chapter.chapterName)}</h2></div>
      <span>關聯守關者：${escapeHtml(chapter.bossName)}</span>
    </section>
    <div class="story-grid">${chapter.stories.map((story) => storyCard(story, ui.progress)).join("")}</div>
  </section>`;
}

function chapterTab(chapter, ui) {
  const active = chapter.number === (Number(ui.selectedChapter) || 1);
  const progress = chapterProgress(chapter, ui.progress);
  return `<button type="button" role="tab" class="chapter-tab ${active ? "is-active" : ""}" data-story-chapter="${chapter.number}" aria-selected="${active}">
    <span>${chapter.number}</span><strong>${escapeHtml(chapter.chapterName)}</strong><small>${progress.completed}/${progress.total}</small>
  </button>`;
}

function storyCard(story, progress) {
  const completed = progress.some((record) => record.storyId === story.id && record.completedAt);
  return `<article class="story-card ${completed ? "is-complete" : ""}">
    <img src="${coverSource(story.id)}" alt="${escapeHtml(story.title)}的故事封面替代圖" draggable="false">
    <div><span class="story-theme">${escapeHtml(story.theme)}</span><h3>${escapeHtml(story.title)}</h3>
      <p>第 ${chapterNumberForStory(story.id)} 章 · 約 ${story.estimatedMinutes} 分鐘</p>
      <button class="button button--primary" type="button" data-open-story="${story.id}">${completed ? "再次閱讀" : "開始閱讀"} ${icon("arrow")}</button>
    </div>
    ${completed ? '<span class="story-complete-mark" aria-label="已完成">✓ 已完成</span>' : ""}
  </article>`;
}

function readerView(story, ui) {
  const completed = ui.progress.some((record) => record.storyId === story.id && record.completedAt);
  const paragraphs = story.body.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return `<section class="story-page story-reader" aria-labelledby="story-reader-title">
    <header class="story-reader__header">
      <button class="story-back" type="button" data-story-back aria-label="返回故事總覽">←</button>
      <div><p>第 ${chapterNumberForStory(story.id)} 章 · 約 ${story.estimatedMinutes} 分鐘</p><h1 id="story-reader-title">${escapeHtml(story.title)}</h1><span>${escapeHtml(story.theme)}</span></div>
      <img src="${coverSource(story.id)}" alt="狐狸陪伴閱讀">
    </header>
    <article class="story-body">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</article>
    <section class="reflection-card" aria-labelledby="reflection-title"><h2 id="reflection-title">想一想</h2><p>沒有標準答案，說說你真正想到的事。</p><ol>${story.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol></section>
    <section class="reality-card"><div><small>今日現實任務</small><h2>${escapeHtml(story.realityTask)}</h2></div></section>
    <blockquote class="thought-card"><small>今日思維卡</small><p>${escapeHtml(story.takeaway)}</p></blockquote>
    <button class="button button--primary story-complete-button" type="button" data-complete-story="${story.id}">${completed ? "已完成閱讀，可再次確認" : "完成閱讀"}</button>
    ${completed ? '<p class="story-completed-note" role="status">✓ 這篇故事已完成，重讀不會重複計算。</p>' : ""}
  </section>`;
}

function coverSource(storyId) {
  return assetSource(`story.${storyId}.cover`, {}, "./assets/pets/fox/fox_reading.png");
}
