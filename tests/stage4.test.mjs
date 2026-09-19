import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderLearn } from "../js/pages/learn.js";
import { createMatchingGame, selectMatchingCard } from "../js/services/matching-game.js";
import { nextWordProgress } from "../js/services/review-scheduler.js";
import { normalizeSpeechRate, speakVocabulary } from "../js/services/speech.js";
import { normalizeCorePack, validateVocabularyPack } from "../js/services/vocabulary-pack.js";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await readText(path));
const fixtureRoot = "incoming/chatgpt/data/vocabulary-fixtures";
const manifest = await readJson(`${fixtureRoot}/fixture_manifest.json`);
const fixtureText = new Map();
for (const fixture of manifest.invalidFixtures) {
  fixtureText.set(fixture.file, await readText(`${fixtureRoot}/${fixture.file}`));
}

test("Stage 4 loader normalizes only canonical Core content into stable IDs", async () => {
  const core = await readJson("02_DATA/core300_words_enriched.json");
  const pack = normalizeCorePack(core);
  assert.equal(pack.packId, "core300-zhTW");
  assert.equal(pack.words.length, 300);
  assert.equal(new Set(pack.words.map(({ wordId }) => wordId)).size, 300);
  assert.equal(pack.words[0].legacyId, "W001");
  assert.equal(pack.words[0].wordId, "core300-zhTW:W001");
  for (const field of ["mastery", "correctCount", "wrongCount", "lastReview", "nextReview", "speech"]) {
    assert.equal(Object.hasOwn(pack.words[0], field), false, `${field} leaked into runtime content`);
  }
});

test("Stage 4 validator accepts A1 valid packs and returns stable invalid-fixture codes", async () => {
  for (const fixture of manifest.validFixtures) {
    const pack = validateVocabularyPack(await readText(`${fixtureRoot}/${fixture.file}`));
    assert.equal(pack.words.length, fixture.expectedWordCount);
  }
  for (const fixture of manifest.invalidFixtures.filter(({ expectedErrorCode }) => expectedErrorCode !== "VOCAB_PACK_ID_CONFLICT")) {
    assert.throws(
      () => validateVocabularyPack(fixtureText.get(fixture.file)),
      (error) => error.code === fixture.expectedErrorCode,
      fixture.file,
    );
  }
});

test("Stage 4 progress follows stable states and wrong answers never subtract progress", () => {
  const word = { wordId: "core300-zhTW:W001", spellingRequired: true };
  const start = new Date("2026-09-16T08:00:00.000Z");
  const seen = nextWordProgress(null, word, true, start);
  const known = nextWordProgress(seen, word, true, start);
  const practiced = nextWordProgress(known, word, true, start);
  const mastered = nextWordProgress(practiced, word, true, start);
  assert.deepEqual([seen.state, known.state, practiced.state, mastered.state], ["seen", "known", "practiced", "mastered"]);
  assert.equal(practiced.spellingUnlocked, true);
  const firstWrong = nextWordProgress(null, word, false, start);
  assert.equal(firstWrong.state, "seen");
  assert.equal(firstWrong.correctCount, 0);
  assert.equal(firstWrong.wrongCount, 1);
  const wrong = nextWordProgress(mastered, word, false, start);
  assert.equal(wrong.state, "mastered");
  assert.equal(wrong.correctCount, mastered.correctCount);
  assert.equal(wrong.wrongCount, mastered.wrongCount + 1);
  assert.equal(wrong.nextReviewAt, "2026-09-16T14:00:00.000Z");
});

test("Stage 4 matching hides pairs until flipped and resolved pairs cannot match twice", () => {
  const items = [
    { type: "new", word: { wordId: "pack:W001", word: "apple", meaningZh: "蘋果" } },
    { type: "new", word: { wordId: "pack:W002", word: "book", meaningZh: "書" } },
  ];
  const game = createMatchingGame(items);
  const baseUi = {
    active: true,
    sessionDone: false,
    mode: "matching",
    sessionItems: items,
    sessionIndex: 0,
    sessionResults: [],
    matchingGame: game,
  };
  const hiddenHtml = renderLearn({ learnUi: baseUi });
  assert.doesNotMatch(hiddenHtml, />apple</i);
  assert.doesNotMatch(hiddenHtml, />蘋果</);

  const firstFlip = selectMatchingCard(game, "pack:W001", "en");
  const oneCardHtml = renderLearn({ learnUi: { ...baseUi, matchingGame: firstFlip.game } });
  assert.match(oneCardHtml, />apple</i);
  assert.doesNotMatch(oneCardHtml, />蘋果</);

  const match = selectMatchingCard(firstFlip.game, "pack:W001", "zh");
  assert.equal(match.matchedWordId, "pack:W001");
  assert.deepEqual(match.game.resolvedWordIds, ["pack:W001"]);
  const repeated = selectMatchingCard(match.game, "pack:W001", "en");
  assert.equal(repeated.ignored, true);
  assert.equal(repeated.matchedWordId, null);
  assert.deepEqual(repeated.game.resolvedWordIds, ["pack:W001"]);
});

test("Stage 4 spelling hides target spelling while keeping meaning and pronunciation", () => {
  const item = { type: "review", word: {
    wordId: "core300-zhTW:W050", word: "kitchen", meaningZh: "廚房",
    spellingRequired: true, spellingUnlocked: true, imageAsset: null,
  }, progress: { spellingUnlocked: true } };
  const html = renderLearn({ learnUi: {
    active: true, sessionDone: false, mode: "spelling", sessionItems: [item],
    sessionIndex: 0, sessionResults: [], speechRate: 0.75,
  } });
  assert.doesNotMatch(html, /kitchen/i);
  assert.match(html, /廚房/);
  assert.match(html, /data-speak="word"/);
  assert.match(html, /data-spelling-form/);
});

test("Stage 4 speech rates enforce range/step and playback gives zero EXP", async () => {
  for (const rate of [0.6, 0.75, 0.9, 1, 1.1]) assert.equal(normalizeSpeechRate(rate), rate);
  for (const rate of [0.55, 0.62, 1.15]) assert.throws(() => normalizeSpeechRate(rate), RangeError);
  const result = await speakVocabulary({ text: "apple", rate: 0.75 });
  assert.equal(result.method, "unavailable");
  assert.equal(result.expAwarded, 0);
});

test("Stage 4 source does not hardcode a 300-word runtime ceiling or load legacy duplicate Core", async () => {
  const sources = await Promise.all([
    "js/services/vocabulary-pack.js",
    "js/repositories/vocabulary.js",
    "js/services/review-scheduler.js",
    "js/services/english-engine.js",
    "js/pages/learn.js",
  ].map(readText));
  const source = sources.join("\n");
  assert.doesNotMatch(source, /TOTAL_WORDS\s*=\s*300/);
  assert.doesNotMatch(source, /core300_words\.json/);
});


test("Stage 4 speech synthesis selects an English voice and actively resumes playback", async () => {
  const oldSynthesis = globalThis.speechSynthesis;
  const oldUtterance = globalThis.SpeechSynthesisUtterance;
  let spoken;
  class MockUtterance {
    constructor(text) { this.text = text; }
  }
  const mock = {
    speaking: false,
    pending: false,
    paused: true,
    getVoices: () => [
      { name: "中文", lang: "zh-TW" },
      { name: "English US", lang: "en-US" },
    ],
    cancel() {},
    resume() { this.paused = false; },
    speak(utterance) {
      spoken = utterance;
      queueMicrotask(() => {
        utterance.onstart?.();
        utterance.onend?.();
      });
    },
  };
  globalThis.speechSynthesis = mock;
  globalThis.SpeechSynthesisUtterance = MockUtterance;
  try {
    const result = await speakVocabulary({ text: "apple", locale: "en-US", rate: 0.75 });
    assert.equal(result.method, "speechSynthesis");
    assert.equal(result.voice, "English US");
    assert.equal(spoken.text, "apple");
    assert.equal(spoken.lang, "en-US");
    assert.equal(spoken.rate, 0.75);
    assert.equal(spoken.volume, 1);
    assert.equal(mock.paused, false);
  } finally {
    if (oldSynthesis === undefined) delete globalThis.speechSynthesis;
    else globalThis.speechSynthesis = oldSynthesis;
    if (oldUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
    else globalThis.SpeechSynthesisUtterance = oldUtterance;
  }
});
