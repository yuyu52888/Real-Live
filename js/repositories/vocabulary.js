import { getRecord, newRecordId, putRecord, runTransaction } from "../core/database.js";
import { VocabularyError } from "../services/vocabulary-pack.js";

export function installVocabularyPack(db, pack, { conflict = "update" } = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["vocabularyPacks", "vocabularyWords"], "readwrite");
    const packs = transaction.objectStore("vocabularyPacks");
    const words = transaction.objectStore("vocabularyWords");
    const existingPackRequest = packs.get(pack.packId);
    let failure;

    const abort = (error) => {
      failure = error;
      transaction.abort();
    };

    existingPackRequest.onerror = () => abort(existingPackRequest.error);
    existingPackRequest.onsuccess = () => {
      const existingPack = existingPackRequest.result;
      if (existingPack && conflict === "reject") {
        abort(new VocabularyError("VOCAB_PACK_ID_CONFLICT", `字庫 ${pack.packId} 已安裝。`));
        return;
      }
      const checks = pack.words.map((word) => words.get(word.wordId));
      let remaining = checks.length;
      const write = () => {
        const enabled = existingPack?.enabled ?? pack.enabledByDefault ?? true;
        const installedAt = existingPack?.installedAt ?? new Date().toISOString();
        packs.put({ ...withoutWords(pack), enabled, installedAt, updatedAt: new Date().toISOString() });
        if (!existingPack) {
          for (const word of pack.words) words.put(word);
          return;
        }
        const oldWords = words.index("packId").getAll(pack.packId);
        oldWords.onerror = () => abort(oldWords.error);
        oldWords.onsuccess = () => {
          const nextIds = new Set(pack.words.map(({ wordId }) => wordId));
          for (const oldWord of oldWords.result) {
            if (!nextIds.has(oldWord.wordId)) words.delete(oldWord.wordId);
          }
          for (const word of pack.words) words.put(word);
        };
      };
      if (!remaining) {
        write();
        return;
      }
      for (const request of checks) {
        request.onerror = () => abort(request.error);
        request.onsuccess = () => {
          if (request.result && request.result.packId !== pack.packId) {
            abort(new VocabularyError("VOCAB_DUPLICATE_WORD_ID", `wordId 已由其他字庫使用：${request.result.wordId}`));
            return;
          }
          remaining -= 1;
          if (remaining === 0) write();
        };
      }
    };
    transaction.oncomplete = () => resolve({ packId: pack.packId, wordCount: pack.words.length });
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("字庫寫入失敗。"));
    transaction.onerror = () => {};
  });
}

export function getVocabularyPack(db, packId) {
  return getRecord(db, "vocabularyPacks", packId);
}

export function listVocabularyPacks(db) {
  return getAll(db, "vocabularyPacks");
}

export async function setVocabularyPackEnabled(db, packId, enabled) {
  const pack = await getVocabularyPack(db, packId);
  if (!pack) throw new Error(`找不到字庫：${packId}`);
  await putRecord(db, "vocabularyPacks", { ...pack, enabled: Boolean(enabled), updatedAt: new Date().toISOString() });
}

export function getVocabularyWord(db, wordId) {
  return getRecord(db, "vocabularyWords", wordId);
}

export function listVocabularyWords(db) {
  return getAll(db, "vocabularyWords");
}

export async function listEnabledVocabularyWords(db) {
  const [packs, words] = await Promise.all([listVocabularyPacks(db), listVocabularyWords(db)]);
  const enabled = new Set(packs.filter((pack) => pack.enabled).map((pack) => pack.packId));
  return words.filter((word) => enabled.has(word.packId));
}

export async function countEnabledWords(db) {
  return (await listEnabledVocabularyWords(db)).length;
}

export function getWordProgress(db, wordId) {
  return getRecord(db, "wordProgress", wordId);
}

export function saveWordProgress(db, progress) {
  return putRecord(db, "wordProgress", progress);
}

export function listWordProgress(db) {
  return getAll(db, "wordProgress");
}

export async function listDueWordProgress(db, now = new Date()) {
  const timestamp = now.toISOString();
  return (await listWordProgress(db))
    .filter((progress) => progress.nextReviewAt && progress.nextReviewAt <= timestamp)
    .sort((left, right) => left.nextReviewAt.localeCompare(right.nextReviewAt));
}

export function saveWordSession(db, session) {
  const record = {
    ...session,
    id: session.id ?? newRecordId(),
    startedAt: session.startedAt ?? new Date().toISOString(),
  };
  return putRecord(db, "wordSessions", record).then(() => record);
}

export function listWordSessions(db) {
  return getAll(db, "wordSessions");
}

function getAll(db, store) {
  return runTransaction(db, [store], "readonly", (tx) => {
    const request = tx.objectStore(store).getAll();
    return () => request.result;
  });
}

function withoutWords(pack) {
  const { words: _words, ...metadata } = pack;
  return metadata;
}
