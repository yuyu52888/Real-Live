import {
  countEnabledWords,
  installVocabularyPack,
  listEnabledVocabularyWords,
  listWordProgress,
  saveWordSession,
} from "../repositories/vocabulary.js";
import { buildDailyWordPlan } from "./review-scheduler.js";
import { getSpeechPreferences } from "./speech.js";
import { loadCoreVocabulary } from "./vocabulary-pack.js";

export async function ensureCoreVocabulary(db, options = {}) {
  const pack = await loadCoreVocabulary(options.url, options.fetcher);
  await installVocabularyPack(db, pack, { conflict: "update" });
  return pack;
}

export async function loadEnglishDashboard(db, options = {}) {
  const [totalWords, enabledWords, progress, plan, speech] = await Promise.all([
    countEnabledWords(db),
    listEnabledVocabularyWords(db),
    listWordProgress(db),
    buildDailyWordPlan(db, options),
    getSpeechPreferences(db),
  ]);
  const enabled = new Set(enabledWords.map(({ wordId }) => wordId));
  const masteredWords = progress.filter((item) => enabled.has(item.wordId) && item.state === "mastered").length;
  return {
    totalWords,
    masteredWords,
    dueCount: plan.reviews.length,
    newCount: plan.newWords.length,
    plan,
    speechRate: speech.rate,
    speechMinRate: speech.min,
    speechMaxRate: speech.max,
    speechRates: speech.rates,
  };
}

export function saveLearningSession(db, { mode, startedAt, results }) {
  return saveWordSession(db, {
    mode,
    wordId: results[0]?.wordId ?? null,
    wordIds: results.map(({ wordId }) => wordId),
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  });
}
