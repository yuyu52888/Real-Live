import { getRecord, putRecord } from "../core/database.js";

export const SETTINGS_ID = "app-settings";
export function getSettings(db) { return getRecord(db, "settings", SETTINGS_ID); }
export function saveSettings(db, settings) {
  return putRecord(db, "settings", { ...settings, id: SETTINGS_ID });
}
