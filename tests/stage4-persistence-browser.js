import { openDatabase } from "../js/core/database.js";
import { saveSettings } from "../js/repositories/settings.js";
import {
  countEnabledWords,
  getVocabularyPack,
  getWordProgress,
  installVocabularyPack,
  listWordProgress,
  listWordSessions,
  saveWordProgress,
  setVocabularyPackEnabled,
} from "../js/repositories/vocabulary.js";
import { saveLearningSession } from "../js/services/english-engine.js";
import { buildDailyWordPlan, nextWordProgress } from "../js/services/review-scheduler.js";
import { getSpeechRate, setSpeechRate, speakVocabulary } from "../js/services/speech.js";
import { importVocabularyPack } from "../js/services/vocabulary-import.js";
import { loadCoreVocabulary, validateVocabularyPack } from "../js/services/vocabulary-pack.js";

export async function testStage4Persistence() {
  const name = `real-life-quest-stage4-${Date.now()}-${Math.random()}`;
  let db = await openDatabase({ name });
  const core = await loadCoreVocabulary("/02_DATA/core300_words_enriched.json");
  await installVocabularyPack(db, core);
  assertEqual(await countEnabledWords(db), 300, "Core total");

  const originals = [];
  for (const word of core.words.slice(0, 10)) {
    const progress = nextWordProgress(null, word, true, new Date("2026-09-01T08:00:00.000Z"));
    await saveWordProgress(db, progress);
    originals.push(progress);
  }

  const expansion300Text = await (await fetch("/incoming/chatgpt/data/vocabulary-fixtures/mock_expansion_300.json")).text();
  const expansion200Text = await (await fetch("/incoming/chatgpt/data/vocabulary-fixtures/mock_expansion_200.json")).text();
  const expansion300 = validateVocabularyPack(expansion300Text);
  const expansion200 = validateVocabularyPack(expansion200Text);
  await importVocabularyPack(db, expansion300Text);
  assertEqual(await countEnabledWords(db), 600, "Core + 300 total");
  assertEqual(JSON.stringify(await Promise.all(originals.map(({ wordId }) => getWordProgress(db, wordId)))), JSON.stringify(originals), "Core progress after +300");
  await importVocabularyPack(db, expansion200Text);
  assertEqual(await countEnabledWords(db), 800, "Core + 300 + 200 total");

  await setVocabularyPackEnabled(db, core.packId, false);
  await setVocabularyPackEnabled(db, expansion200.packId, false);
  let plan = await buildDailyWordPlan(db);
  if (!plan.newWords.length || plan.newWords.some(({ word }) => word.packId !== expansion300.packId)) {
    throw new Error("Expansion words were not dynamically scheduled");
  }
  const expansionProgress = nextWordProgress(null, expansion300.words[0], true, new Date("2026-09-02T08:00:00.000Z"));
  await saveWordProgress(db, expansionProgress);
  await setVocabularyPackEnabled(db, expansion300.packId, false);
  plan = await buildDailyWordPlan(db);
  if (plan.newWords.some(({ word }) => word.packId === expansion300.packId)) throw new Error("Disabled pack supplied new words");
  assertEqual(JSON.stringify(await getWordProgress(db, expansionProgress.wordId)), JSON.stringify(expansionProgress), "Disabled pack progress retained");
  await setVocabularyPackEnabled(db, expansion300.packId, true);
  assertEqual(JSON.stringify(await getWordProgress(db, expansionProgress.wordId)), JSON.stringify(expansionProgress), "Re-enabled pack progress restored");
  await setVocabularyPackEnabled(db, core.packId, true);
  await setVocabularyPackEnabled(db, expansion200.packId, true);

  const beforeInvalid = JSON.stringify(await listWordProgress(db));
  const manifest = await (await fetch("/incoming/chatgpt/data/vocabulary-fixtures/fixture_manifest.json")).json();
  for (const fixture of manifest.invalidFixtures) {
    const input = await (await fetch(`/incoming/chatgpt/data/vocabulary-fixtures/${fixture.file}`)).text();
    let code;
    try {
      await importVocabularyPack(db, input);
    } catch (error) {
      code = error.code;
    }
    assertEqual(code, fixture.expectedErrorCode, fixture.file);
    assertEqual(await countEnabledWords(db), 800, `${fixture.file} atomic total`);
    assertEqual(JSON.stringify(await listWordProgress(db)), beforeInvalid, `${fixture.file} atomic progress`);
  }

  const collisionPack = structuredClone(expansion200);
  collisionPack.packId = "collision-fixture";
  collisionPack.words = [{ ...collisionPack.words[0], packId: collisionPack.packId, wordId: core.words[0].wordId }];
  let collisionCode;
  try { await importVocabularyPack(db, collisionPack); } catch (error) { collisionCode = error.code; }
  assertEqual(collisionCode, "VOCAB_DUPLICATE_WORD_ID", "installed wordId collision");
  assertEqual(await getVocabularyPack(db, collisionPack.packId), undefined, "collision pack not installed");

  await saveSettings(db, { preferences: { speechRate: 0.75 } });
  for (const rate of [0.6, 0.75, 0.9, 1, 1.1]) {
    await setSpeechRate(db, rate);
    assertEqual(await getSpeechRate(db), rate, `speech rate ${rate}`);
  }
  for (const rate of [0.55, 0.62, 1.15]) {
    let rejected = false;
    try { await setSpeechRate(db, rate); } catch (error) { rejected = error instanceof RangeError; }
    if (!rejected) throw new Error(`speech boundary ${rate} was accepted`);
  }
  const playback = await speakVocabulary({ text: "apple", rate: 0.75 });
  assertEqual(playback.expAwarded, 0, "audio playback EXP");
  if (!["speechSynthesis", "unavailable"].includes(playback.method)) throw new Error("Unexpected speech method");

  await saveLearningSession(db, { mode: "meaning", startedAt: "2026-09-16T08:00:00.000Z", results: [{ wordId: originals[0].wordId, correct: true }] });
  assertEqual((await listWordSessions(db)).length, 1, "session persisted");

  const due = { ...originals[0], nextReviewAt: "2026-09-01T00:00:00.000Z" };
  await saveWordProgress(db, due);
  plan = await buildDailyWordPlan(db, { now: new Date("2026-09-16T00:00:00.000Z") });
  assertEqual(plan.items[0].type, "review", "due reviews first");

  db.close();
  db = await openDatabase({ name });
  assertEqual(await countEnabledWords(db), 800, "reload total");
  assertEqual((await Promise.all(originals.map(({ wordId }) => getWordProgress(db, wordId)))).filter(Boolean).length, 10, "reload Core progress");
  assertEqual(await getSpeechRate(db), 1.1, "reload speech rate");
  assertEqual((await listWordSessions(db)).length, 1, "reload session");
  db.close();
  return "Stage 4 persistence PASS: 300→600→800, progress isolation, atomic rejection, disable/re-enable, reload, scheduling, speech.";
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}
