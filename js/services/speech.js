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

const ACTIVE_UTTERANCES = new Set();

export async function speakVocabulary({ text, audioFile = null, locale = SPEECH_DEFAULTS.locale, rate = SPEECH_DEFAULTS.rate } = {}) {
  const normalizedRate = normalizeSpeechRate(rate);
  const phrase = String(text ?? "").trim();
  if (!phrase) return { method: "unavailable", expAwarded: 0, reason: "empty" };

  if (audioFile && "Audio" in globalThis) {
    try {
      const audio = new Audio(audioFile);
      audio.playbackRate = normalizedRate;
      audio.volume = 1;
      await audio.play();
      return { method: "audio", expAwarded: 0 };
    } catch (error) {
      console.warn("Vocabulary audio file failed; falling back to speech synthesis.", error);
    }
  }

  const synthesis = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  if (!synthesis || !Utterance) return { method: "unavailable", expAwarded: 0, reason: "unsupported" };

  if (synthesis.paused) synthesis.resume();
  const voices = await waitForSpeechVoices(synthesis);
  const candidates = speechVoiceCandidates(voices, locale);

  for (const voice of candidates) {
    try {
      const result = await speakAttempt({ synthesis, Utterance, phrase, locale, rate: normalizedRate, voice });
      return { method: "speechSynthesis", expAwarded: 0, voice: result.voice };
    } catch (error) {
      console.warn("Speech synthesis attempt failed.", error);
    }
  }

  return { method: "unavailable", expAwarded: 0, reason: "not-started" };
}

export function chooseSpeechVoice(voices = [], locale = SPEECH_DEFAULTS.locale) {
  return speechVoiceCandidates(voices, locale)[0] ?? null;
}

export function speechVoiceCandidates(voices = [], locale = SPEECH_DEFAULTS.locale) {
  const wanted = String(locale || SPEECH_DEFAULTS.locale).toLowerCase();
  const language = wanted.split("-")[0];
  const english = voices.filter((voice) => {
    const lang = String(voice.lang ?? "").toLowerCase();
    return lang === wanted || lang.startsWith(`${language}-`) || lang === language;
  });
  english.sort((left, right) => {
    const leftLang = String(left.lang ?? "").toLowerCase();
    const rightLang = String(right.lang ?? "").toLowerCase();
    const score = (voice, lang) =>
      (lang === wanted ? 8 : 0)
      + (voice.localService ? 4 : 0)
      + (voice.default ? 2 : 0);
    return score(right, rightLang) - score(left, leftLang);
  });
  return english.length ? [...english, null] : [null];
}

async function waitForSpeechVoices(synthesis, timeoutMs = 700) {
  if (typeof synthesis.getVoices !== "function") return [];
  const initial = synthesis.getVoices();
  if (initial.length) return initial;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synthesis.removeEventListener?.("voiceschanged", finish);
      resolve(synthesis.getVoices());
    };
    synthesis.addEventListener?.("voiceschanged", finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

function speakAttempt({ synthesis, Utterance, phrase, locale, rate, voice }) {
  return new Promise((resolve, reject) => {
    const utterance = new Utterance(phrase);
    utterance.lang = locale || SPEECH_DEFAULTS.locale;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    ACTIVE_UTTERANCES.add(utterance);
    let started = false;
    const timeout = setTimeout(() => {
      if (started) return;
      ACTIVE_UTTERANCES.delete(utterance);
      try { synthesis.cancel(); } catch {}
      reject(new Error("speech-start-timeout"));
    }, 1800);

    utterance.onstart = () => {
      started = true;
      clearTimeout(timeout);
      resolve({ voice: voice?.name ?? null });
    };
    utterance.onend = () => {
      clearTimeout(timeout);
      ACTIVE_UTTERANCES.delete(utterance);
      if (!started) reject(new Error("speech-ended-before-start"));
    };
    utterance.onerror = (event) => {
      clearTimeout(timeout);
      ACTIVE_UTTERANCES.delete(utterance);
      reject(new Error(event?.error || "speech-error"));
    };

    if (synthesis.paused) synthesis.resume();
    synthesis.speak(utterance);
    setTimeout(() => {
      if (synthesis.paused) synthesis.resume();
    }, 0);
  });
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
