import { advanceOnboarding, createInitialState, selectAvatar } from "./core/app-state.js";
import { navigate } from "./core/router.js";
import { registerServiceWorker } from "./core/pwa.js";
import { mountOnboarding } from "./pages/onboarding.js";
import { loadAssetManifest } from "./services/asset-registry.js";
import { loadUiCopy } from "./services/ui-copy.js";
import { mountAppShell } from "./ui/app-shell.js";
import { openDatabase } from "./core/database.js";
import { loadOnboarding, persistOnboarding } from "./services/onboarding-storage.js";
import { loadTasks, getTaskById } from "./repositories/tasks.js";
import { listQuestHistory } from "./repositories/quest-history.js";
import { listPendingApprovals } from "./repositories/approvals.js";
import { getPlayer } from "./repositories/player.js";
import { approveQuestCompletion, completionInstanceId, requestQuestCompletion, startQuest, updateQuestProgress } from "./services/quest-service.js";
import { verifyParentPin } from "./services/parent-auth.js";
import { ensureCoreVocabulary, loadEnglishDashboard, saveLearningSession } from "./services/english-engine.js";
import { createMatchingGame, selectMatchingCard as advanceMatchingGame } from "./services/matching-game.js";
import { recordWordAnswer } from "./services/review-scheduler.js";
import { setSpeechRate, speakVocabulary } from "./services/speech.js";
import { getStoryById } from "./repositories/stories.js";
import { completeStory as recordStoryCompletion, loadStoryDashboard } from "./services/story-service.js";

const root = document.querySelector("#app");
let state = createInitialState();
let database;
let saving = false;
let taskCatalog = [];
let questTimer = null;

if (!root) {
  throw new Error("App root is missing.");
}

const actions = {
  advance(input) {
    tryUpdate(() => advanceOnboarding(state, input));
  },
  selectAvatar(variant) {
    tryUpdate(() => selectAvatar(state, variant));
  },
  navigate(route) {
    if (route !== "quests") stopQuestTimer();
    state = navigate(state, route);
    render();
  },
  openLearnSurface(surface) {
    if (!["english", "stories"].includes(surface)) return;
    state = { ...state, route: "learn", learnSurface: surface };
    render();
  },
  selectStoryChapter(chapter) {
    if (!state.storyUi?.chapters?.some(({ number }) => number === chapter)) return;
    state = { ...state, storyUi: { ...state.storyUi, selectedChapter: chapter, selectedStoryId: null } };
    render();
  },
  openStory(storyId) {
    const story = getStoryById(state.storyUi?.stories ?? [], storyId);
    if (!story) return;
    state = { ...state, route: "learn", learnSurface: "stories", storyUi: { ...state.storyUi, selectedStoryId: storyId } };
    render();
  },
  closeStory() {
    state = { ...state, storyUi: { ...state.storyUi, selectedStoryId: null } };
    render();
  },
  completeStory(storyId) {
    if (!getStoryById(state.storyUi?.stories ?? [], storyId)) return Promise.resolve();
    return performStory(async () => {
      const result = await recordStoryCompletion(database, storyId);
      state = { ...state, storyUi: { ...state.storyUi, progress: result.progress } };
      render();
    });
  },
  selectLearnMode(mode) {
    const availableItems = state.learnUi?.plan?.items ?? [];
    const sessionItems = mode === "spelling"
      ? availableItems.filter(({ word, progress }) => word.spellingRequired && progress?.spellingUnlocked)
      : mode === "matching" ? availableItems.slice(0, 4) : availableItems;
    if (!sessionItems.length) return;
    const matchingGame = mode === "matching" ? createMatchingGame(sessionItems) : null;
    state = {
      ...state,
      learnUi: {
        ...state.learnUi,
        active: true,
        sessionDone: false,
        mode,
        sessionItems,
        sessionIndex: 0,
        sessionResults: [],
        sessionStartedAt: new Date().toISOString(),
        matchingGame,
      },
    };
    render();
    if (mode === "listening") actions.speakLearn("word");
  },
  selectMatchingCard(wordId, side) {
    const ui = state.learnUi;
    if (ui?.mode !== "matching" || !ui.matchingGame) return;
    const transition = advanceMatchingGame(ui.matchingGame, wordId, side);
    if (transition.ignored) return;
    if (!transition.matchedWordId) {
      state = { ...state, learnUi: { ...ui, matchingGame: transition.game } };
      render();
      return;
    }
    return performEnglish(async () => {
      const item = ui.sessionItems.find(({ word }) => word.wordId === transition.matchedWordId);
      if (!item) return;
      await recordWordAnswer(database, item.word, true);
      const results = [...ui.sessionResults, { wordId: item.word.wordId, correct: true }];
      if (transition.game.resolvedWordIds.length < transition.game.wordIds.length) {
        state = { ...state, learnUi: { ...ui, matchingGame: transition.game, sessionResults: results } };
        render();
        return;
      }
      await saveLearningSession(database, { mode: ui.mode, startedAt: ui.sessionStartedAt, results });
      const dashboard = await loadEnglishDashboard(database);
      state = { ...state, learnUi: { ...dashboard, active: false, sessionDone: true, lastSessionCount: results.length } };
      render();
    });
  },
  answerLearn(correct) {
    return performEnglish(async () => {
      const ui = state.learnUi;
      const item = ui.sessionItems[ui.sessionIndex];
      if (!item) return;
      await recordWordAnswer(database, item.word, Boolean(correct));
      const results = [...ui.sessionResults, { wordId: item.word.wordId, correct: Boolean(correct) }];
      const nextIndex = ui.sessionIndex + 1;
      if (nextIndex < ui.sessionItems.length) {
        state = { ...state, learnUi: { ...ui, sessionIndex: nextIndex, sessionResults: results } };
        render();
        if (ui.mode === "listening") actions.speakLearn("word");
        return;
      }
      await saveLearningSession(database, { mode: ui.mode, startedAt: ui.sessionStartedAt, results });
      const dashboard = await loadEnglishDashboard(database);
      state = { ...state, learnUi: { ...dashboard, active: false, sessionDone: true, lastSessionCount: results.length } };
      render();
    });
  },
  submitSpelling(value) {
    const item = state.learnUi?.sessionItems?.[state.learnUi.sessionIndex];
    const correct = String(value ?? "").trim().toLocaleLowerCase("en-US") === item?.word.word.toLocaleLowerCase("en-US");
    return actions.answerLearn(correct);
  },
  exitLearn() {
    return performEnglish(async () => {
      const dashboard = await loadEnglishDashboard(database);
      state = { ...state, learnUi: { ...dashboard, active: false, sessionDone: false } };
      render();
    });
  },
  changeSpeechRate(rate) {
    return performEnglish(async () => {
      const speechRate = await setSpeechRate(database, rate);
      state = { ...state, learnUi: { ...state.learnUi, speechRate } };
      render();
    });
  },
  async speakLearn(kind) {
    const item = state.learnUi?.sessionItems?.[state.learnUi.sessionIndex];
    if (!item) return;
    const text = kind === "example" ? item.word.example : item.word.word;
    const result = await speakVocabulary({
      text,
      audioFile: item.word.audioFile,
      locale: item.word.audioLocale,
      rate: state.learnUi.speechRate,
    });
    if (result.method === "unavailable") showPageError("這個瀏覽器目前無法播放語音，可以先看單字與例句。");
  },
  openQuest(taskId) {
    state = { ...state, route: "quests", questUi: { ...state.questUi, selectedTaskId: taskId } };
    render();
  },
  selectQuest(taskId) {
    state = { ...state, questUi: { ...state.questUi, selectedTaskId: taskId } };
    render();
  },
  filterQuests(filter) {
    state = { ...state, questUi: { ...state.questUi, filter, selectedTaskId: null } };
    render();
  },
  startQuest(taskId) {
    return performQuest(async (task) => startQuest(database, task), taskId);
  },
  completeQuest(taskId) {
    stopQuestTimer();
    return performQuest(async (task) => requestQuestCompletion(database, task), taskId);
  },
  adjustQuest(taskId, delta) {
    const task = getTaskById(taskCatalog, taskId);
    const history = task && state.questUi.history.find((record) => record.id === completionInstanceId(task));
    if (!task || !history) return Promise.resolve();
    return performQuest(() => updateQuestProgress(database, task, (history.progress?.value ?? 0) + delta), taskId);
  },
  toggleQuestTimer(taskId) {
    if (state.questUi.activeTimerTaskId === taskId) {
      stopQuestTimer();
      render();
      return;
    }
    stopQuestTimer();
    state = { ...state, questUi: { ...state.questUi, activeTimerTaskId: taskId } };
    questTimer = setInterval(() => actions.adjustQuest(taskId, 1), 1000);
    render();
  },
  async unlockParent(pin) {
    const unlocked = await verifyParentPin(database, pin);
    if (unlocked) {
      state = { ...state, questUi: { ...state.questUi, parentUnlocked: true } };
      render();
    }
    return unlocked;
  },
  approveCompletion(completionId) {
    return performQuest(() => approveQuestCompletion(database, completionId));
  },
};

async function performStory(operation) {
  if (saving || !database) return;
  saving = true;
  root.setAttribute("aria-busy", "true");
  try {
    await operation();
  } catch (error) {
    console.error(error);
    showPageError(error.message);
  } finally {
    saving = false;
    root.removeAttribute("aria-busy");
  }
}

async function performEnglish(operation) {
  if (saving || !database) return;
  saving = true;
  root.setAttribute("aria-busy", "true");
  try {
    await operation();
  } catch (error) {
    console.error(error);
    showPageError(error.message);
  } finally {
    saving = false;
    root.removeAttribute("aria-busy");
  }
}

async function performQuest(operation, taskId) {
  if (saving || !database) return;
  const task = taskId ? getTaskById(taskCatalog, taskId) : null;
  if (taskId && !task) return;
  saving = true;
  root.setAttribute("aria-busy", "true");
  try {
    await operation(task);
    await refreshQuestState();
    render();
  } catch (error) {
    console.error(error);
    showPageError(error.message);
  } finally {
    saving = false;
    root.removeAttribute("aria-busy");
  }
}

async function refreshQuestState() {
  const [history, approvals, playerRecord] = await Promise.all([
    listQuestHistory(database),
    listPendingApprovals(database),
    getPlayer(database),
  ]);
  state = {
    ...state,
    player: playerRecord?.progress ?? state.player,
    questUi: {
      tasks: taskCatalog,
      history,
      approvals,
      filter: state.questUi?.filter ?? "all",
      selectedTaskId: state.questUi?.selectedTaskId ?? null,
      activeTimerTaskId: state.questUi?.activeTimerTaskId ?? null,
      parentUnlocked: state.questUi?.parentUnlocked ?? false,
    },
  };
}

function stopQuestTimer() {
  if (questTimer) clearInterval(questTimer);
  questTimer = null;
  if (state.questUi?.activeTimerTaskId) {
    state = { ...state, questUi: { ...state.questUi, activeTimerTaskId: null } };
  }
}

function showPageError(message) {
  const node = document.querySelector("#page-error") ?? document.createElement("p");
  node.id = "page-error";
  node.className = "form-error page-error";
  node.setAttribute("role", "alert");
  node.textContent = message;
  document.querySelector(".page-content")?.prepend(node);
}

async function tryUpdate(update) {
  if (saving || !database) return;
  saving = true;
  root.setAttribute("aria-busy", "true");
  try {
    state = await persistOnboarding(database, update());
    render();
  } catch (error) {
    const errorNode = document.querySelector("#form-error") ?? createErrorNode();
    errorNode.textContent = error.message;
  } finally {
    saving = false;
    root.removeAttribute("aria-busy");
  }
}

function createErrorNode() {
  const node = document.createElement("p");
  node.id = "form-error";
  node.className = "form-error";
  node.setAttribute("role", "alert");
  (document.querySelector("form") ?? root).prepend(node);
  return node;
}

function render() {
  if (state.onboarding.step === "complete") {
    mountAppShell(root, state, actions);
    return;
  }
  mountOnboarding(root, state, actions);
}

[, , taskCatalog] = await Promise.all([loadUiCopy(), loadAssetManifest(), loadTasks()]);
try {
  database = await openDatabase();
  state = await loadOnboarding(database);
  await ensureCoreVocabulary(database);
  const [english, storyDashboard] = await Promise.all([
    loadEnglishDashboard(database),
    loadStoryDashboard(database),
    refreshQuestState(),
  ]);
  state = { ...state, learnUi: { ...english, active: false, sessionDone: false }, storyUi: { ...storyDashboard, selectedChapter: 1, selectedStoryId: null } };
  render();
} catch (error) {
  root.textContent = "資料暫時讀不到，請重新載入再試。原有資料會保留。";
  const retry = document.createElement("button");
  retry.className = "button button--primary";
  retry.textContent = "重新載入";
  retry.addEventListener("click", () => location.reload());
  root.append(retry);
}
registerServiceWorker();
