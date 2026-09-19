let current = {
  storyId: null,
  status: "idle",
  index: 0,
  segments: [],
  onDone: null,
};

export function storyNarrationState() {
  return { storyId: current.storyId, status: current.status, index: current.index, total: current.segments.length };
}

export async function startStoryNarration(story, { rate = 0.92, onDone } = {}) {
  stopStoryNarration();
  const synthesis = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  if (!synthesis || !Utterance) return { ...storyNarrationState(), unavailable: true };

  current = {
    storyId: story.id,
    status: "playing",
    index: 0,
    segments: buildNarrationSegments(story.body),
    onDone: typeof onDone === "function" ? onDone : null,
  };
  const voices = await waitForVoices(synthesis);
  speakCurrent({ synthesis, Utterance, voices, rate });
  return storyNarrationState();
}

export function pauseStoryNarration() {
  if (current.status !== "playing" || !globalThis.speechSynthesis) return storyNarrationState();
  globalThis.speechSynthesis.pause();
  current.status = "paused";
  return storyNarrationState();
}

export function resumeStoryNarration({ rate = 0.92 } = {}) {
  if (current.status !== "paused" || !globalThis.speechSynthesis) return storyNarrationState();
  globalThis.speechSynthesis.resume();
  current.status = "playing";
  return storyNarrationState();
}

export function stopStoryNarration() {
  try { globalThis.speechSynthesis?.cancel(); } catch {}
  current = { storyId: null, status: "idle", index: 0, segments: [], onDone: null };
  return storyNarrationState();
}

export function buildNarrationSegments(body) {
  const paragraphs = String(body ?? "").split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const segments = [];
  let dialogueTurn = 0;
  for (const paragraph of paragraphs) {
    let cursor = 0;
    for (const match of paragraph.matchAll(/「([^」]+)」/g)) {
      const before = paragraph.slice(cursor, match.index).trim();
      if (before) segments.push({ text: before, role: "narrator" });
      const context = paragraph.slice(Math.max(0, match.index - 18), Math.min(paragraph.length, match.index + match[0].length + 18));
      const role = inferDialogueRole(context, dialogueTurn);
      segments.push({ text: match[1].trim(), role });
      dialogueTurn += 1;
      cursor = match.index + match[0].length;
    }
    const rest = paragraph.slice(cursor).trim();
    if (rest) segments.push({ text: rest, role: "narrator" });
  }
  return segments.filter(({ text }) => text);
}

function inferDialogueRole(context, turn) {
  if (/媽媽|奶奶|阿姨|姐姐|表姐|女老師/.test(context)) return "adultFemale";
  if (/爸爸|爺爺|叔叔|哥哥|男老師/.test(context)) return "adultMale";
  if (/老師/.test(context)) return "adult";
  return turn % 2 === 0 ? "childA" : "childB";
}

function speakCurrent({ synthesis, Utterance, voices, rate }) {
  if (current.status !== "playing") return;
  const segment = current.segments[current.index];
  if (!segment) {
    const done = current.onDone;
    current.status = "done";
    done?.();
    return;
  }

  const utterance = new Utterance(segment.text);
  const profile = voiceProfile(segment.role, voices);
  utterance.lang = profile.voice?.lang || "zh-TW";
  utterance.voice = profile.voice || null;
  utterance.rate = Math.max(0.72, Math.min(1.1, rate * profile.rate));
  utterance.pitch = profile.pitch;
  utterance.volume = 1;
  utterance.onend = () => {
    if (current.status !== "playing") return;
    current.index += 1;
    speakCurrent({ synthesis, Utterance, voices, rate });
  };
  utterance.onerror = () => {
    if (current.status !== "playing") return;
    current.index += 1;
    speakCurrent({ synthesis, Utterance, voices, rate });
  };
  synthesis.speak(utterance);
}

function voiceProfile(role, voices) {
  const chinese = voices.filter((voice) => /^zh(?:-|$)/i.test(String(voice.lang ?? "")));
  const taiwan = chinese.filter((voice) => /^zh-TW$/i.test(String(voice.lang ?? "")));
  const pool = taiwan.length ? taiwan : chinese;
  const pick = (index) => pool.length ? pool[index % pool.length] : null;
  const profiles = {
    narrator: { voice: pick(0), pitch: 1, rate: 0.96 },
    childA: { voice: pick(1), pitch: 1.18, rate: 1.02 },
    childB: { voice: pick(2), pitch: 1.08, rate: 1.04 },
    adultFemale: { voice: pick(3), pitch: 1.04, rate: 0.96 },
    adultMale: { voice: pick(4), pitch: 0.88, rate: 0.94 },
    adult: { voice: pick(5), pitch: 0.96, rate: 0.95 },
  };
  return profiles[role] ?? profiles.narrator;
}

async function waitForVoices(synthesis, timeoutMs = 700) {
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
