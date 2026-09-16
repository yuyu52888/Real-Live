export const MATCHING_SIDES = Object.freeze(["en", "zh"]);

export function createMatchingGame(items, limit = 4) {
  const wordIds = [];
  for (const item of items ?? []) {
    const wordId = item?.word?.wordId;
    if (typeof wordId === "string" && wordId && !wordIds.includes(wordId)) wordIds.push(wordId);
    if (wordIds.length === limit) break;
  }
  return { wordIds, selected: null, resolvedWordIds: [] };
}

export function selectMatchingCard(game, wordId, side) {
  if (!game?.wordIds?.includes(wordId) || !MATCHING_SIDES.includes(side)) {
    return { game, matchedWordId: null, ignored: true };
  }
  if (game.resolvedWordIds.includes(wordId)) {
    return { game, matchedWordId: null, ignored: true };
  }
  const card = { wordId, side };
  if (!game.selected) {
    return { game: { ...game, selected: card }, matchedWordId: null, ignored: false };
  }
  if (game.selected.wordId === wordId && game.selected.side === side) {
    return { game, matchedWordId: null, ignored: true };
  }
  if (game.selected.wordId === wordId && game.selected.side !== side) {
    return {
      game: {
        ...game,
        selected: null,
        resolvedWordIds: [...game.resolvedWordIds, wordId],
      },
      matchedWordId: wordId,
      ignored: false,
    };
  }
  return { game: { ...game, selected: card }, matchedWordId: null, ignored: false };
}
