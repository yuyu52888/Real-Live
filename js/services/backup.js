import { STORE_KEYS } from "../core/db-schema.js";
import { runTransaction } from "../core/database.js";

export const BACKUP_FORMAT = "real-life-quest";
export const BACKUP_SCHEMA_VERSION = 1;

export async function exportBackup(db, { now = new Date() } = {}) {
  const stores = await runTransaction(db, Object.keys(STORE_KEYS), "readonly", (tx) => {
    const requests = Object.fromEntries(Object.keys(STORE_KEYS).map((name) => [name, tx.objectStore(name).getAll()]));
    return () => Object.fromEntries(Object.entries(requests).map(([name, request]) => [name, request.result]));
  });
  const backup = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    dbVersion: db.version,
    exportedAt: now.toISOString(),
    stores,
  };
  assertJson(backup);
  return backup;
}

export function serializeBackup(backup) {
  assertJson(backup);
  return JSON.stringify(backup, null, 2);
}

export function backupFilename(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.valueOf())) throw new TypeError("Invalid backup date");
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return \`real-life-quest-backup-\${year}-\${month}-\${day}.json\`;
}

export function previewBackup(input, dbVersion) {
  const prepared = prepareBackupForRestore(input, dbVersion);
  return {
    backup: prepared.backup,
    sourceDbVersion: prepared.sourceDbVersion,
    migrated: prepared.sourceDbVersion !== dbVersion,
    summary: summarizeBackup(prepared.backup),
  };
}

// Stage 2 merge primitive retained for backward compatibility.
// Product restore UI uses restoreBackup(), which replaces all stores atomically.
export async function importBackup(db, input) {
  const prepared = prepareBackupForRestore(input, db.version);
  await runTransaction(db, Object.keys(STORE_KEYS), "readwrite", (tx) => {
    for (const [name, records] of Object.entries(prepared.backup.stores)) {
      for (const record of records) tx.objectStore(name).put(record);
    }
  });
  return summarizeBackup(prepared.backup);
}

export async function restoreBackup(db, input) {
  const prepared = prepareBackupForRestore(input, db.version);
  await runTransaction(db, Object.keys(STORE_KEYS), "readwrite", (tx) => {
    for (const name of Object.keys(STORE_KEYS)) tx.objectStore(name).clear();
    for (const [name, records] of Object.entries(prepared.backup.stores)) {
      const store = tx.objectStore(name);
      for (const record of records) store.put(record);
    }
  });
  return {
    ...summarizeBackup(prepared.backup),
    sourceDbVersion: prepared.sourceDbVersion,
    migrated: prepared.sourceDbVersion !== db.version,
  };
}

export function validateBackup(input, dbVersion) {
  const backup = parseBackup(input);
  validateBackupShape(backup);
  if (backup.dbVersion !== dbVersion) {
    throw new Error(\`Unsupported backup database version: \${backup.dbVersion}\`);
  }
  validateProfile(backup);
  return backup;
}

function prepareBackupForRestore(input, dbVersion) {
  const source = parseBackup(input);
  validateBackupShape(source);
  const sourceDbVersion = source.dbVersion;
  const backup = migrateBackup(source, dbVersion);
  validateBackupShape(backup);
  if (backup.dbVersion !== dbVersion) throw new Error("Backup migration did not reach the current database version");
  validateProfile(backup);
  return { backup, sourceDbVersion };
}

function migrateBackup(source, currentDbVersion) {
  if (source.dbVersion === currentDbVersion) return source;
  // DB v1 and v2 share the same stores/record shapes; v2 only added indexes.
  if (source.dbVersion === 1 && currentDbVersion === 2) {
    return { ...source, dbVersion: 2 };
  }
  throw new Error(\`Unsupported backup database version: \${source.dbVersion}\`);
}

function parseBackup(input) {
  if (typeof input !== "string") return structuredClone(input);
  try {
    return JSON.parse(input);
  } catch {
    throw new Error("Backup JSON is invalid");
  }
}

function validateBackupShape(backup) {
  assertJson(backup);
  if (!backup || backup.format !== BACKUP_FORMAT || backup.schemaVersion !== BACKUP_SCHEMA_VERSION ||
      !Number.isInteger(backup.dbVersion) || backup.dbVersion < 1 ||
      !Number.isFinite(Date.parse(backup.exportedAt))) {
    throw new Error("Unsupported backup format");
  }
  const expectedStores = Object.keys(STORE_KEYS);
  if (!backup.stores || Object.keys(backup.stores).length !== expectedStores.length) {
    throw new Error("Backup must contain all stores");
  }
  for (const [name, key] of Object.entries(STORE_KEYS)) {
    const records = backup.stores[name];
    if (!Array.isArray(records)) throw new Error(\`Missing store \${name}\`);
    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record[key] !== "string" || !record[key].trim() || ids.has(record[key])) {
        throw new Error(\`Invalid or duplicate stable ID in \${name}\`);
      }
      ids.add(record[key]);
    }
  }
}

function validateProfile(backup) {
  const player = backup.stores.player;
  const settings = backup.stores.settings;
  if (player.length !== settings.length || player.length > 1) throw new Error("Invalid profile pair");
  if (!player.length) return;

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

function summarizeBackup(backup) {
  const count = (name) => backup.stores[name]?.length ?? 0;
  return {
    exportedAt: backup.exportedAt,
    dbVersion: backup.dbVersion,
    nickname: backup.stores.player[0]?.nickname ?? "",
    questHistory: count("questHistory"),
    wordProgress: count("wordProgress"),
    wordSessions: count("wordSessions"),
    storyProgress: count("storyProgress"),
    rewards: count("rewards"),
    bossProgress: count("bossProgress"),
    approvals: count("approvals"),
  };
}

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
