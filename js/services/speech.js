import { getSettings, saveSettings } from "../repositories/settings.js";

export const SPEECH_DEFAULTS = Object.freeze({
  locale: "en-US",
  rate: 0.75,
  min: 0.6,
  max: 1.1,
  step: 0.05,
  quickRates: Object.freeze([0.6, 0.75, 0.9, 1, 1.1]),
});

export async function getSpeechRate(db) {
  const settings = await getSettings(db);
  return normalizeSpeechRate(settings?.preferences?.speechRate ?? SPEECH_DEFAULTS.rate);
}

export async function setSpeechRate(db, rate) {
  const normalized = normalizeSpeechRate(rate);
  const settings = await getSettings(db);
  await saveSettings(db, {
    ...settings,
    preferences: { ...settings?.preferences, speechRate: normalized },
  });
  return normalized;
}

export async function speakVocabulary({ text, audioFile = null, locale = SPEECH_DEFAULTS.locale, rate = SPEECH_DEFAULTS.rate } = {}) {
  const normalizedRate = normalizeSpeechRate(rate);
  if (audioFile) {
    const audio = new Audio(audioFile);
    audio.playbackRate = normalizedRate;
    await audio.play();
    return { method: "audio", expAwarded: 0 };
  }
  if (!("speechSynthesis" in globalThis) || !("SpeechSynthesisUtterance" in globalThis)) {
    return { method: "unavailable", expAwarded: 0 };
  }
  globalThis.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text ?? ""));
  utterance.lang = locale || SPEECH_DEFAULTS.locale;
  utterance.rate = normalizedRate;
  globalThis.speechSynthesis.speak(utterance);
  return { method: "speechSynthesis", expAwarded: 0 };
}

export function normalizeSpeechRate(rate) {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric) || numeric < SPEECH_DEFAULTS.min || numeric > SPEECH_DEFAULTS.max) {
    throw new RangeError(`語速必須介於 ${SPEECH_DEFAULTS.min} 與 ${SPEECH_DEFAULTS.max}。`);
  }
  const steps = Math.round((numeric - SPEECH_DEFAULTS.min) / SPEECH_DEFAULTS.step);
  const snapped = Number((SPEECH_DEFAULTS.min + steps * SPEECH_DEFAULTS.step).toFixed(2));
  if (Math.abs(snapped - numeric) > 0.000001) throw new RangeError("語速必須以 0.05 為單位調整。");
  return snapped;
}
