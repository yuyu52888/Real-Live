import { getRecord, putRecord } from "../core/database.js";

export const PLAYER_ID = "local-player";
export function getPlayer(db) { return getRecord(db, "player", PLAYER_ID); }
export function savePlayer(db, player) {
  return putRecord(db, "player", { ...player, id: PLAYER_ID });
}
