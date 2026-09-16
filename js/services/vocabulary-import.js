import { getVocabularyPack, installVocabularyPack } from "../repositories/vocabulary.js";
import { validateVocabularyPack, VocabularyError } from "./vocabulary-pack.js";

export async function importVocabularyPack(db, input, { allowUpdate = false } = {}) {
  const pack = validateVocabularyPack(input);
  const existing = await getVocabularyPack(db, pack.packId);
  if (existing && !allowUpdate) {
    throw new VocabularyError("VOCAB_PACK_ID_CONFLICT", `字庫 ${pack.packId} 已安裝。`);
  }
  return installVocabularyPack(db, pack, { conflict: allowUpdate ? "update" : "reject" });
}
