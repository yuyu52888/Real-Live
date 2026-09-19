export const MINI_GAMES = Object.freeze([
  Object.freeze({
    id: "pattern-scout",
    title: "規律偵探",
    icon: "🧩",
    duration: "約 2 分鐘",
    abilities: ["學習力", "專注力"],
    reason: "讓孩子從數字與圖形變化中找出規律，練習觀察、假設與驗證，而不是只背答案。",
    learn: "辨認規律、預測下一步、用線索排除不合理答案。",
  }),
  Object.freeze({
    id: "reaction-lantern",
    title: "反應燈塔",
    icon: "⚡",
    duration: "約 1 分鐘",
    abilities: ["專注力"],
    reason: "必須等待訊號才動作，訓練抑制衝動與視覺反應；太早按也會得到立即回饋。",
    learn: "等待訊號、控制衝動、觀察自己的反應時間。",
  }),
  Object.freeze({
    id: "balance-lab",
    title: "平衡實驗室",
    icon: "⚖️",
    duration: "約 3 分鐘",
    abilities: ["學習力", "耐心力"],
    reason: "用簡化翹翹板理解『重量 × 距離』的效果，讓物理觀念先從直覺與比較開始。",
    learn: "力矩概念、因果關係、用計算驗證直覺。",
  }),
  Object.freeze({
    id: "robot-maze",
    title: "機器人迷宮",
    icon: "🤖",
    duration: "約 2 分鐘",
    abilities: ["學習力", "專注力"],
    reason: "孩子要先在腦中模擬指令，再選出能到達終點的路徑，練習分解問題與空間推理。",
    learn: "順序思考、空間方向、先規劃再行動。",
  }),
]);

const QUESTION_BANKS = Object.freeze({
  "pattern-scout": Object.freeze([
    { prompt: "2、4、6、8、？", choices: ["9", "10", "12"], answer: "10", explain: "每次都 +2，所以 8 + 2 = 10。" },
    { prompt: "3、6、12、24、？", choices: ["30", "36", "48"], answer: "48", explain: "每次都 ×2，所以 24 × 2 = 48。" },
    { prompt: "○、△、○、△、○、？", choices: ["○", "△", "□"], answer: "△", explain: "○ 和 △ 輪流出現。" },
  ]),
  "balance-lab": Object.freeze([
    { prompt: "左邊：2 kg 放在距中心 3 格。右邊放 3 kg，要距中心幾格才平衡？", choices: ["1 格", "2 格", "3 格"], answer: "2 格", explain: "左邊 2×3=6；右邊 3×2=6，所以平衡。" },
    { prompt: "左邊：4 kg × 2 格。右邊：2 kg × ？格。", choices: ["2 格", "3 格", "4 格"], answer: "4 格", explain: "左邊力矩 8，右邊要 2×4=8。" },
    { prompt: "同樣重的兩個物體，哪一個放得離中心越遠，對翹翹板的影響越大？", choices: ["離中心近", "離中心遠", "都一樣"], answer: "離中心遠", explain: "距離越遠，轉動效果越大。" },
  ]),
  "robot-maze": Object.freeze([
    { prompt: "🤖 面向右方。終點在右邊 2 格、下方 1 格。哪組指令能到終點？", choices: ["前、前、右轉、前", "前、右轉、前、前", "右轉、前、前、前"], answer: "前、前、右轉、前", explain: "先向右前進 2 格，再右轉朝下走 1 格。" },
    { prompt: "🤖 面向上方。終點在左邊 1 格、上方 2 格。哪組最短？", choices: ["前、前、左轉、前", "左轉、前、右轉、前、前", "前、左轉、前、右轉、前"], answer: "前、前、左轉、前", explain: "先向上 2 格，再左轉走 1 格。" },
    { prompt: "要讓機器人重複『前進、前進、右轉』4次，哪個概念最適合？", choices: ["迴圈", "刪除", "猜測"], answer: "迴圈", explain: "重複相同指令時，可以用迴圈簡化。" },
  ]),
});

export function getMiniGame(gameId) {
  return MINI_GAMES.find(({ id }) => id === gameId) ?? null;
}

export function createMiniGameSession(gameId) {
  if (gameId === "reaction-lantern") {
    return { gameId, phase: "ready", attempts: [], feedback: "按開始後，看到綠燈再點！" };
  }
  const bank = QUESTION_BANKS[gameId];
  if (!bank) throw new Error("找不到這個小遊戲。");
  return { gameId, round: 0, score: 0, complete: false, feedback: null, lastCorrect: null };
}

export function currentMiniGameQuestion(session) {
  const bank = QUESTION_BANKS[session?.gameId];
  if (!bank || session?.complete) return null;
  return bank[session.round % bank.length];
}

export function answerMiniGameQuestion(session, answer) {
  const question = currentMiniGameQuestion(session);
  if (!question) return session;
  const correct = String(answer) === question.answer;
  const bank = QUESTION_BANKS[session.gameId];
  const nextRound = session.round + 1;
  return {
    ...session,
    round: nextRound,
    score: session.score + (correct ? 1 : 0),
    complete: nextRound >= bank.length,
    lastCorrect: correct,
    feedback: correct ? `答對了！${question.explain}` : `再想想：${question.explain}`,
  };
}

export function reactionRating(milliseconds) {
  const ms = Number(milliseconds);
  if (!Number.isFinite(ms) || ms < 0) return "再試一次";
  if (ms < 220) return "反應非常快";
  if (ms < 350) return "反應很不錯";
  if (ms < 500) return "穩定反應";
  return "先專注看訊號，再挑戰一次";
}
