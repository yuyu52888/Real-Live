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
  await refreshQuestState();
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
