import {
  getWordProgress,
  listDueWordProgress,
  listEnabledVocabularyWords,
  listWordProgress,
  saveWordProgress,
} from "../repositories/vocabulary.js";
import { REVIEW_SCHEDULE_DAYS } from "./vocabulary-pack.js";

export const WORD_STATES = Object.freeze(["unseen", "seen", "known", "practiced", "mastered"]);

export async function buildDailyWordPlan(db, { now = new Date(), reviewLimit = 5, newLimit = 5 } = {}) {
  const [enabledWords, due, allProgress] = await Promise.all([
    listEnabledVocabularyWords(db),
    listDueWordProgress(db, now),
    listWordProgress(db),
  ]);
  const enabledById = new Map(enabledWords.map((word) => [word.wordId, word]));
  const progressById = new Map(allProgress.map((progress) => [progress.wordId, progress]));
  const reviews = due
    .filter((progress) => enabledById.has(progress.wordId))
    .slice(0, clampDaily(reviewLimit))
    .map((progress) => ({ type: "review", word: enabledById.get(progress.wordId), progress }));
  const newWords = enabledWords
    .filter((word) => !progressById.has(word.wordId))
    .slice(0, clampDaily(newLimit))
    .map((word) => ({ type: "new", word, progress: progressById.get(word.wordId) ?? null }));
  return { reviews, newWords, items: [...reviews, ...newWords] };
}

export async function recordWordAnswer(db, word, correct, now = new Date()) {
  const current = await getWordProgress(db, word.wordId);
  const next = nextWordProgress(current, word, Boolean(correct), now);
  await saveWordProgress(db, next);
  return next;
}

export function nextWordProgress(current, word, correct, now = new Date()) {
  const timestamp = now.toISOString();
  const existing = current ?? {
    wordId: word.wordId,
    state: "unseen",
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    lastSeenAt: null,
    lastReviewAt: null,
    nextReviewAt: null,
    spellingUnlocked: false,
  };
  if (!correct) {
    return {
      ...existing,
      state: existing.state === "unseen" ? "seen" : existing.state,
      wrongCount: existing.wrongCount + 1,
      streak: 0,
      lastSeenAt: timestamp,
      lastReviewAt: timestamp,
      nextReviewAt: addHours(now, 6).toISOString(),
    };
  }
  const currentIndex = Math.max(0, WORD_STATES.indexOf(existing.state));
  const state = WORD_STATES[Math.min(currentIndex + 1, WORD_STATES.length - 1)];
  const streak = existing.streak + 1;
  const intervalIndex = Math.min(Math.max(streak - 1, 0), REVIEW_SCHEDULE_DAYS.length - 1);
  return {
    ...existing,
    state,
    correctCount: existing.correctCount + 1,
    streak,
    lastSeenAt: timestamp,
    lastReviewAt: timestamp,
    nextReviewAt: addDays(now, REVIEW_SCHEDULE_DAYS[intervalIndex]).toISOString(),
    spellingUnlocked: Boolean(existing.spellingUnlocked || (word.spellingRequired && WORD_STATES.indexOf(state) >= WORD_STATES.indexOf("practiced"))),
  };
}

function clampDaily(value) {
  return Math.min(5, Math.max(3, Math.trunc(Number(value) || 5)));
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date, days) {
  return addHours(date, days * 24);
}
