import { getSettings, saveSettings } from "../repositories/settings.js";

export const SPEECH_DEFAULTS = Object.freeze({
  locale: "en-US",
  rate: 0.75,
  min: 0.6,
  max: 1.1,
  step: 0.05,
  quickRates: Object.freeze([0.6, 0.75, 0.9, 1, 1.1]),
});

export async function getSpeechPreferences(db) {
  const settings = await getSettings(db);
  const min = normalizeSpeechRate(settings?.preferences?.speechMinRate ?? SPEECH_DEFAULTS.min);
  const max = normalizeSpeechRate(settings?.preferences?.speechMaxRate ?? SPEECH_DEFAULTS.max);
  const storedRate = normalizeSpeechRate(settings?.preferences?.speechRate ?? SPEECH_DEFAULTS.rate);
  const rate = Math.min(max, Math.max(min, storedRate));
  return { min, max, rate, rates: speechRatesInRange(min, max) };
}

export async function getSpeechRate(db) {
  return (await getSpeechPreferences(db)).rate;
}

export async function setSpeechRate(db, rate) {
  const normalized = normalizeSpeechRate(rate);
  const settings = await getSettings(db);
  const min = normalizeSpeechRate(settings?.preferences?.speechMinRate ?? SPEECH_DEFAULTS.min);
  const max = normalizeSpeechRate(settings?.preferences?.speechMaxRate ?? SPEECH_DEFAULTS.max);
  if (normalized < min || normalized > max) {
    throw new RangeError(`語速必須介於家長設定的 ${min.toFixed(2)} 與 ${max.toFixed(2)}。`);
  }
  await saveSettings(db, {
    ...settings,
    preferences: { ...settings?.preferences, speechRate: normalized },
  });
  return normalized;
}

export function speechRatesInRange(min = SPEECH_DEFAULTS.min, max = SPEECH_DEFAULTS.max) {
  const lower = normalizeSpeechRate(min);
  const upper = normalizeSpeechRate(max);
  if (lower > upper) throw new RangeError("最低語速不得高於最高語速。");
  const rates = [];
  for (let rate = lower; rate <= upper + 0.000001; rate += SPEECH_DEFAULTS.step) {
    rates.push(Number(rate.toFixed(2)));
  }
  return rates;
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
