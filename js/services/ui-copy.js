const FALLBACK_COPY = {
  common: {
    appName: "Real Life Quest",
    tagline: "把真實生活，變成大冒險",
    buttons: { next: "下一步", start: "開始", startQuest: "開始任務" },
    labels: { level: "Lv.{level}", exp: "EXP", difficulty: "難度", streak: "連續冒險", chestFragments: "寶箱碎片" },
    status: { comingSoon: "準備中" },
  },
  navigation: { home: "首頁", quests: "任務", learn: "學習", hero: "角色", parent: "家長" },
  onboarding: {
    welcome: { subtitle: "把真實生活，變成大冒險", start: "開始冒險" },
    avatar: {
      title: "選擇你的冒險角色",
      boy: "男主角",
      girl: "女主角",
      boyDescription: "勇敢、開朗，準備開始新的挑戰。",
      girlDescription: "自信、溫暖，準備思考與成長。",
      selected: "就選這位！",
      note: "角色只改變外觀，不會影響能力、任務或獎勵。",
    },
    nickname: { title: "你的冒險名字是？", hint: "最多 12 個字", create: "建立角色" },
    parentSetup: {
      title: "家長設定",
      pinLabel: "設定 4 位數 PIN",
      dailyQuestCount: "每日任務量",
      enableExercise: "啟用運動任務",
      enableChores: "啟用家事任務",
      requireApproval: "完成任務後需要家長確認",
      speechRate: "英文發音預設速度",
      finish: "完成設定",
    },
  },
  home: {
    title: "今天的冒險",
    quickEntries: { todayQuests: "今日任務", english: "英文學習", stories: "思維故事" },
    todayBoss: "今日 Boss",
    todayQuestProgress: "今日任務進度",
    emptyToday: "今天還沒有完成任務。選一個最想開始的就好！",
    encouragementPool: ["先開始一小步，比等到完美更有力量。"],
  },
  quests: {
    title: "任務總覽",
    tabs: { all: "全部", reading: "閱讀", english: "英文", exercise: "運動", chores: "家事", life: "生活", hidden: "隱藏任務" },
    card: { start: "開始", requiresApproval: "家長確認", repeatable: "可重複挑戰" },
    detail: { goal: "任務目標", description: "任務說明", tips: "小技巧", safety: "安全提醒", completion: "完成條件", start: "開始任務" },
    state: { inProgress: "進行中", completed: "任務完成", pendingApproval: "已送出，等待家長確認", approved: "家長已確認" },
    empty: "目前沒有符合這個分類的任務。",
  },
  exercise: {
    title: "運動任務", tipsTitle: "動作小技巧", counterTitle: "目前完成", manualCounter: "手動計數", timerMode: "計時模式",
    secondsUnit: "{seconds} 秒", complete: "完成任務", counterDecrease: "減少一次", counterIncrease: "增加一次",
  },
  chores: {
    title: "家事任務", stepsTitle: "操作步驟", photo: "拍照紀錄", photoOptional: "照片只是紀錄，不是完成任務的必要條件。", complete: "完成任務",
  },
  parent: {
    title: "家長模式", enterPin: "輸入家長 PIN", unlock: "進入家長模式", wrongPin: "PIN 不正確，請再試一次。", pending: "待審核",
    approve: "核准", noPending: "目前沒有等待審核的任務。", completedAt: "完成時間：{time}",
  },
  accessibility: { bottomNav: "主要導覽", expProgress: "目前 EXP 進度 {current} / {target}" },
};

let activeCopy = FALLBACK_COPY;

export async function loadUiCopy(url = "./data/copy/UI_COPY_ZH_TW.json") {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const document = await response.json();
    if (document.locale !== "zh-TW" || !document.copy) throw new Error("Invalid UI copy contract");
    activeCopy = document.copy;
  } catch (error) {
    console.warn("Using built-in UI copy fallback.", error);
  }
  return activeCopy;
}

export function uiText(key, tokens = {}) {
  const value = key.split(".").reduce((current, segment) => current?.[segment], activeCopy);
  if (typeof value !== "string") {
    const fallback = key.split(".").reduce((current, segment) => current?.[segment], FALLBACK_COPY);
    return escapeMarkup(typeof fallback === "string" ? interpolate(fallback, tokens) : `[${key}]`);
  }
  return escapeMarkup(interpolate(value, tokens));
}

export function uiList(key) {
  const value = key.split(".").reduce((current, segment) => current?.[segment], activeCopy);
  return Array.isArray(value) ? [...value] : [];
}

export function interpolate(template, tokens = {}) {
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, token) => (
    Object.hasOwn(tokens, token) ? String(tokens[token]) : match
  ));
}

function escapeMarkup(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
