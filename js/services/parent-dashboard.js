import { listVocabularyPacks, listVocabularyWords } from "../repositories/vocabulary.js";
import { getSettings } from "../repositories/settings.js";
import { loadWeeklyReport } from "./weekly-report.js";
import { PARENT_SETTING_DEFAULTS, normalizeParentPreferences } from "./parent-settings.js";

export async function loadParentDashboard(db, tasks) {
  const [settings, packs, words, report] = await Promise.all([
    getSettings(db), listVocabularyPacks(db), listVocabularyWords(db), loadWeeklyReport(db, tasks),
  ]);
  const counts = new Map();
  for (const word of words) counts.set(word.packId, (counts.get(word.packId) ?? 0) + 1);
  return {
    settings: normalizeParentPreferences(settings?.preferences ?? PARENT_SETTING_DEFAULTS, settings?.preferences),
    packs: packs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.packId.localeCompare(b.packId)).map((pack) => ({ ...pack, wordCount: counts.get(pack.packId) ?? 0 })),
    report,
  };
}
