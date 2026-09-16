export const CORE_PACK_ID = "core300-zhTW";
export const VOCAB_SCHEMA_VERSION = 1;
export const REVIEW_SCHEDULE_DAYS = Object.freeze([1, 3, 7, 14, 30]);

export class VocabularyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VocabularyError";
    this.code = code;
  }
}

export function normalizeCorePack(records) {
  if (!Array.isArray(records)) {
    throw new VocabularyError("VOCAB_REQUIRED_FIELD", "Core 300 必須是單字陣列。");
  }
  const pack = {
    schemaVersion: VOCAB_SCHEMA_VERSION,
    packId: CORE_PACK_ID,
    packVersion: "1.0.0",
    title: "Core 300",
    locale: "zh-TW",
    sourceType: "builtin",
    description: "國小核心英文第一階段",
    order: 10,
    enabledByDefault: true,
    words: records.map(normalizeCoreWord),
  };
  return validateVocabularyPack(pack);
}

export async function loadCoreVocabulary(url = "./02_DATA/core300_words_enriched.json", fetcher = fetch) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Core 300 載入失敗：HTTP ${response.status}`);
  return normalizeCorePack(await response.json());
}

export function parseVocabularyPack(input) {
  if (typeof input !== "string") return structuredClone(input);
  try {
    return JSON.parse(input);
  } catch {
    throw new VocabularyError("JSON_PARSE_ERROR", "字庫 JSON 格式不正確。");
  }
}

export function validateVocabularyPack(input) {
  const pack = parseVocabularyPack(input);
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    requiredField("字庫必須是物件。");
  }
  if (pack.schemaVersion !== VOCAB_SCHEMA_VERSION) {
    throw new VocabularyError("VOCAB_SCHEMA_VERSION", "不支援這個字庫格式版本。");
  }
  for (const field of ["packId", "packVersion", "title", "locale"]) {
    if (!nonblank(pack[field])) requiredField(`缺少 ${field}。`);
  }
  if (!Array.isArray(pack.words)) requiredField("缺少 words 陣列。");

  const ids = new Set();
  const words = pack.words.map((source) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) requiredField("單字資料格式不正確。");
    for (const field of ["wordId", "packId", "word", "meaningZh"]) {
      if (!nonblank(source[field])) requiredField(`單字缺少 ${field}。`);
    }
    if (source.packId !== pack.packId) {
      throw new VocabularyError("VOCAB_PACK_ID_MISMATCH", `${source.wordId} 的 packId 不一致。`);
    }
    if (ids.has(source.wordId)) {
      throw new VocabularyError("VOCAB_DUPLICATE_WORD_ID", `重複的 wordId：${source.wordId}`);
    }
    ids.add(source.wordId);
    const hasExample = nonblank(source.example);
    const hasExampleZh = nonblank(source.exampleZh);
    if (hasExample !== hasExampleZh || ((source.example != null || source.exampleZh != null) && !hasExample)) {
      throw new VocabularyError("VOCAB_EXAMPLE_PAIR", `${source.wordId} 的例句與翻譯必須成對。`);
    }
    if (source.reviewScheduleDays != null && (!Array.isArray(source.reviewScheduleDays) ||
      !source.reviewScheduleDays.length || source.reviewScheduleDays.some((day) => !Number.isInteger(day) || day < 0))) {
      throw new VocabularyError("VOCAB_REVIEW_SCHEDULE", `${source.wordId} 的複習間隔無效。`);
    }
    return { ...source };
  });
  return { ...pack, words };
}

function normalizeCoreWord(source) {
  if (!source || !nonblank(source.id)) requiredField("Core 單字缺少 id。");
  const {
    id,
    mastery: _mastery,
    correctCount: _correctCount,
    wrongCount: _wrongCount,
    lastReview: _lastReview,
    nextReview: _nextReview,
    speech: _speech,
    ...content
  } = source;
  return {
    ...content,
    wordId: `${CORE_PACK_ID}:${id}`,
    legacyId: id,
    packId: CORE_PACK_ID,
    imageAsset: source.imageAsset ?? null,
    tags: Array.isArray(source.tags) ? [...source.tags] : [],
  };
}

function requiredField(message) {
  throw new VocabularyError("VOCAB_REQUIRED_FIELD", message);
}

function nonblank(value) {
  return typeof value === "string" && Boolean(value.trim());
}
