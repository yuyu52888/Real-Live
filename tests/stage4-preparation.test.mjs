import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const readJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
const core = await readJson("02_DATA/core300_words_enriched.json");
const englishSpec = await readJson("02_DATA/ENGLISH_MODULE_SPEC.json");
const speechSettings = await readJson("02_DATA/speech_settings.json");
const fixtureRoot = "incoming/chatgpt/data/vocabulary-fixtures";
const fixtureManifest = await readJson(`${fixtureRoot}/fixture_manifest.json`);
const expansion300 = await readJson(`${fixtureRoot}/mock_expansion_300.json`);
const expansion200 = await readJson(`${fixtureRoot}/mock_expansion_200.json`);
const minimalPack = await readJson(`${fixtureRoot}/valid_minimal_pack_2.json`);
const reviewBaseline = [1, 3, 7, 14, 30];

test("Stage 4 prep: canonical Core 300 shape and stable identities remain valid", () => {
  assert.equal(core.length, 300);
  assert.equal(new Set(core.map(({ id }) => id)).size, 300);
  assert.equal(new Set(core.map(({ word }) => word.toLocaleLowerCase("en-US"))).size, 300);
  assert.deepEqual(core.map(({ id }) => id), Array.from({ length: 300 }, (_, index) => `W${String(index + 1).padStart(3, "0")}`));
  const normalizedWordIds = core.map(({ id }) => `core300-zhTW:${id}`);
  assert.equal(new Set(normalizedWordIds).size, 300);
});

test("Stage 4 prep: Core levels, spelling targets, examples, and content fields pass", () => {
  const levelCounts = Object.groupBy(core, ({ level }) => level);
  assert.equal(levelCounts.A.length, 100);
  assert.equal(levelCounts.B.length, 100);
  assert.equal(levelCounts.C.length, 100);
  assert.equal(core.filter(({ spellingRequired }) => spellingRequired).length, 180);
  for (const entry of core) {
    assert.equal(entry.difficulty, { A: 1, B: 2, C: 3 }[entry.level]);
    assert.ok(nonblank(entry.word) && nonblank(entry.meaningZh));
    assert.ok(nonblank(entry.partOfSpeech) && nonblank(entry.imageCueZh));
    assert.ok(nonblank(entry.example) && nonblank(entry.exampleZh));
    assert.ok(entry.example.toLocaleLowerCase("en-US").includes(entry.word.toLocaleLowerCase("en-US")), `${entry.id} example`);
  }
});

test("Stage 4 prep: review and speech metadata match authoritative baselines", () => {
  assert.deepEqual(englishSpec.reviewScheduleDays, reviewBaseline);
  assert.equal(speechSettings.defaultLocale, "en-US");
  assert.equal(speechSettings.defaultRate, 0.75);
  assert.equal(speechSettings.minRate, 0.6);
  assert.equal(speechSettings.maxRate, 1.1);
  assert.equal(speechSettings.step, 0.05);
  assert.deepEqual(englishSpec.speech.quickRates, speechSettings.quickRates);
  const normalizedEnglishTargets = englishSpec.speech.applyTo.map((value) => value === "exampleSentence" ? "example" : value);
  assert.deepEqual(normalizedEnglishTargets, speechSettings.applyTo);
  for (const entry of core) {
    assert.deepEqual(entry.reviewScheduleDays, reviewBaseline);
    assert.equal(entry.audioLocale, "en-US");
    assert.equal(entry.speech.locale, "en-US");
    assert.equal(entry.speech.defaultRate, 0.75);
    assert.equal(entry.speech.minRate, 0.6);
    assert.equal(entry.speech.maxRate, 1.1);
    assert.equal(entry.speech.step, 0.05);
  }
});

test("Stage 4 prep: valid A1 packs prove 300 -> 600 -> 800 with global stable IDs", () => {
  validatePack(expansion300, 300);
  validatePack(expansion200, 200);
  validatePack(minimalPack, 2);
  const coreIds = core.map(({ id }) => `core300-zhTW:${id}`);
  const firstTotal = [...coreIds, ...expansion300.words.map(({ wordId }) => wordId)];
  const secondTotal = [...firstTotal, ...expansion200.words.map(({ wordId }) => wordId)];
  assert.equal(firstTotal.length, 600);
  assert.equal(new Set(firstTotal).size, 600);
  assert.equal(secondTotal.length, 800);
  assert.equal(new Set(secondTotal).size, 800);
  assert.notEqual(expansion300.packId, expansion200.packId);
});

test("Stage 4 prep: invalid A1 files remain declared rejection fixtures only", async () => {
  assert.equal(fixtureManifest.invalidFixtures.length, 8);
  assert.deepEqual(new Set(fixtureManifest.reservedInstalledPackIds), new Set(["core300-zhTW"]));
  for (const fixture of fixtureManifest.invalidFixtures) {
    assert.match(fixture.file, /^invalid_.+\.json$/);
    assert.match(fixture.expectedErrorCode, /^(?:VOCAB_|JSON_)/);
    await access(new URL(`../${fixtureRoot}/${fixture.file}`, import.meta.url));
  }
});

function validatePack(pack, expectedCount) {
  assert.equal(pack.schemaVersion, 1);
  assert.ok(nonblank(pack.packId) && nonblank(pack.packVersion) && nonblank(pack.title) && nonblank(pack.locale));
  assert.equal(pack.words.length, expectedCount);
  assert.equal(new Set(pack.words.map(({ wordId }) => wordId)).size, expectedCount);
  for (const word of pack.words) {
    assert.equal(word.packId, pack.packId);
    assert.ok(nonblank(word.wordId) && nonblank(word.word) && nonblank(word.meaningZh));
    if (word.example != null || word.exampleZh != null) {
      assert.ok(nonblank(word.example) && nonblank(word.exampleZh));
    }
  }
}

function nonblank(value) {
  return typeof value === "string" && Boolean(value.trim());
}
