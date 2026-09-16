import { STORE_KEYS } from "../core/db-schema.js";
import { runTransaction } from "../core/database.js";

export async function exportBackup(db) {
  const stores = await runTransaction(db, Object.keys(STORE_KEYS), "readonly", (tx) => {
    const requests = Object.fromEntries(Object.keys(STORE_KEYS).map((name) => [name, tx.objectStore(name).getAll()]));
    return () => Object.fromEntries(Object.entries(requests).map(([name, request]) => [name, request.result]));
  });
  const backup = { format: "real-life-quest", schemaVersion: 1, dbVersion: db.version, exportedAt: new Date().toISOString(), stores };
  assertJson(backup);
  return backup;
}

// Merge-only primitive. Parent preview/confirmation and cross-version conversion come later.
export async function importBackup(db, input) {
  const backup = typeof input === "string" ? JSON.parse(input) : structuredClone(input);
  validateBackup(backup, db.version);
  await runTransaction(db, Object.keys(STORE_KEYS), "readwrite", (tx) => {
    for (const [name, records] of Object.entries(backup.stores)) {
      for (const record of records) tx.objectStore(name).put(record);
    }
  });
}

export function validateBackup(backup, dbVersion) {
  assertJson(backup);
  if (backup.format !== "real-life-quest" || backup.schemaVersion !== 1 ||
      backup.dbVersion !== dbVersion || !Number.isFinite(Date.parse(backup.exportedAt))) {
    throw new Error("Unsupported backup format or database version");
  }
  if (!backup.stores || Object.keys(backup.stores).length !== Object.keys(STORE_KEYS).length) {
    throw new Error("Backup must contain all stores");
  }
  for (const [name, key] of Object.entries(STORE_KEYS)) {
    const records = backup.stores[name];
    if (!Array.isArray(records)) throw new Error(`Missing store ${name}`);
    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record[key] !== "string" || !record[key].trim() || ids.has(record[key])) {
        throw new Error(`Invalid or duplicate stable ID in ${name}`);
      }
      ids.add(record[key]);
    }
  }
  const player = backup.stores.player;
  const settings = backup.stores.settings;
  if (player.length !== settings.length || player.length > 1) throw new Error("Invalid profile pair");
  if (player.length) {
    const p = player[0];
    const s = settings[0];
    const steps = ["welcome", "avatar", "nickname", "parent", "settings", "complete"];
    if (p.id !== "local-player" || s.id !== "app-settings" || !steps.includes(p.onboardingStep) ||
        ![null, "boy", "girl"].includes(p.avatarVariant) || typeof p.nickname !== "string" || p.nickname.length > 12 ||
        !p.progress || !Number.isInteger(p.progress.level) || p.progress.level < 1 || !p.progress.exp ||
        !Number.isFinite(p.progress.exp.current) || p.progress.exp.current < 0 ||
        !Number.isFinite(p.progress.exp.target) || p.progress.exp.target <= 0 ||
        typeof p.progress.title !== "string" || !s.preferences ||
        ![1, 2, 3].includes(s.preferences.dailyTaskGoal) ||
        !Number.isFinite(s.preferences.speechRate) || s.preferences.speechRate < 0.6 || s.preferences.speechRate > 1.1 ||
        ["exerciseEnabled", "choresEnabled", "parentApprovalRequired"].some((key) => typeof s.preferences[key] !== "boolean")) {
      throw new Error("Invalid player/settings record");
    }
    const step = steps.indexOf(p.onboardingStep);
    if ((step >= 2 && !p.avatarVariant) || (step >= 3 && !p.nickname.trim())) {
      throw new Error("Incomplete onboarding record");
    }
    const pin = s.pinCredential;
    if ((step >= 4 && !pin) || (pin && (pin.algorithm !== "PBKDF2-SHA-256" ||
        pin.iterations !== 100000 || !/^[a-f0-9]{32}$/.test(pin.salt) || !/^[a-f0-9]{64}$/.test(pin.hash)))) {
      throw new Error("Invalid PIN verifier");
    }
  }
  return backup;
}

// Fail explicitly for Blob/Date/undefined instead of silently losing them in JSON.
function assertJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach(assertJson); return; }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    Object.values(value).forEach(assertJson);
    return;
  }
  throw new Error("Backup contains unsupported non-JSON data");
}
