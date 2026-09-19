export const ONBOARDING_STEPS = Object.freeze([
  "welcome",
  "avatar",
  "nickname",
  "parent",
  "settings",
  "complete",
]);

export const AVATAR_VARIANTS = Object.freeze(["boy", "girl"]);

export function createInitialState() {
  return {
    route: "home",
    onboarding: {
      step: "welcome",
      avatarVariant: null,
      nickname: "",
      parentPin: "",
      settings: {
        dailyTaskGoal: 2,
        exerciseEnabled: true,
        choresEnabled: true,
        parentApprovalRequired: true,
        speechRate: 0.75,
        maxTaskDifficulty: 5,
        restDays: [],
        speechMinRate: 0.6,
        speechMaxRate: 1.1,
        materialRewardsEnabled: false,
      },
    },
    player: {
      level: 1,
      title: "新手冒險家",
      exp: { current: 0, target: 100 },
    },
    learnUi: { loading: true },
    learnSurface: "english",
    storyUi: { loading: true },
    storyNarration: { status: "idle", storyId: null },
    gameUi: { selectedGameId: null, session: null },
    rewardUi: { loading: true },
    bossUi: { loading: true, selectedBossId: null },
    parentUi: { activeTab: "approvals", loading: true },
  };
}

export function selectAvatar(state, avatarVariant) {
  if (!AVATAR_VARIANTS.includes(avatarVariant)) {
    throw new Error("請選擇男主角或女主角。");
  }

  return {
    ...state,
    onboarding: { ...state.onboarding, avatarVariant },
  };
}

export function advanceOnboarding(state, input = {}) {
  const { onboarding } = state;

  switch (onboarding.step) {
    case "welcome":
      return withStep(state, "avatar");
    case "avatar":
      if (!onboarding.avatarVariant) {
        throw new Error("請先選擇你的冒險角色。");
      }
      return withStep(state, "nickname");
    case "nickname": {
      const nickname = String(input.nickname ?? "").trim();
      if (!nickname || nickname.length > 12) {
        throw new Error("暱稱需為 1～12 個字。");
      }
      return withOnboarding(state, { nickname, step: "parent" });
    }
    case "parent": {
      const parentPin = String(input.parentPin ?? "");
      if (!/^\d{4}$/.test(parentPin)) {
        throw new Error("請輸入 4 位數字 PIN。");
      }
      return withOnboarding(state, { parentPin, step: "settings" });
    }
    case "settings":
      return withOnboarding(state, {
        settings: normalizeSettings(input, onboarding.settings),
        step: "complete",
      });
    case "complete":
      return state;
    default:
      throw new Error("未知的設定步驟。");
  }
}

function normalizeSettings(input, current) {
  const dailyTaskGoal = Number(input.dailyTaskGoal);
  if (![1, 2, 3].includes(dailyTaskGoal)) {
    throw new Error("請選擇每天 1～3 個任務。");
  }

  return {
    ...current,
    dailyTaskGoal,
    exerciseEnabled: Boolean(input.exerciseEnabled),
    choresEnabled: Boolean(input.choresEnabled),
    parentApprovalRequired: Boolean(input.parentApprovalRequired),
  };
}

function withStep(state, step) {
  return withOnboarding(state, { step });
}

function withOnboarding(state, changes) {
  return {
    ...state,
    onboarding: { ...state.onboarding, ...changes },
  };
}
