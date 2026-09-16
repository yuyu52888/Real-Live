import { createInitialState } from "../core/app-state.js";
import { runTransaction } from "../core/database.js";
import { PLAYER_ID } from "../repositories/player.js";
import { SETTINGS_ID } from "../repositories/settings.js";

export async function loadOnboarding(db) {
  const [player, settings] = await runTransaction(db, ["player", "settings"], "readonly", (tx) => {
    const p = tx.objectStore("player").get(PLAYER_ID);
    const s = tx.objectStore("settings").get(SETTINGS_ID);
    return () => [p.result, s.result];
  });
  const initial = createInitialState();
  if (!player && !settings) return initial;
  if (!player || !settings) throw new Error("設定資料不完整，請先保留資料並重試。");
  return {
    ...initial,
    player: player.progress,
    onboarding: {
      ...initial.onboarding,
      step: player.onboardingStep, nickname: player.nickname, avatarVariant: player.avatarVariant,
      settings: { ...initial.onboarding.settings, ...settings.preferences },
    },
  };
}

export async function persistOnboarding(db, state) {
  const { onboarding } = state;
  // WebCrypto must finish before opening the IDB transaction.
  const pinCredential = onboarding.parentPin ? await hashPin(onboarding.parentPin) : null;
  await runTransaction(db, ["player", "settings"], "readwrite", (tx) => {
    const players = tx.objectStore("player");
    const settings = tx.objectStore("settings");
    const oldPlayer = players.get(PLAYER_ID);
    const oldSettings = settings.get(SETTINGS_ID);
    oldPlayer.onsuccess = () => players.put({
      ...oldPlayer.result, id: PLAYER_ID, nickname: onboarding.nickname,
      avatarVariant: onboarding.avatarVariant, onboardingStep: onboarding.step, progress: state.player,
    });
    oldSettings.onsuccess = () => settings.put({
      ...oldSettings.result, id: SETTINGS_ID, preferences: onboarding.settings,
      pinCredential: pinCredential ?? oldSettings.result?.pinCredential ?? null,
    });
  });
  return { ...state, onboarding: { ...onboarding, parentPin: "" } };
}

async function hashPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const iterations = 100000;
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  const hex = (bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return { algorithm: "PBKDF2-SHA-256", iterations, salt: hex(salt), hash: hex(new Uint8Array(hash)) };
}
