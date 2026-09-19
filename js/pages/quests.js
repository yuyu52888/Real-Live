import { completionInstanceId, countDailyQuestSlots } from "../services/quest-service.js";
import { resolveAsset } from "../services/asset-registry.js";
import { uiText } from "../services/ui-copy.js";
import { filterTasks, getTaskActivityControl, getTaskById, TASK_FILTER_ALIASES } from "../repositories/tasks.js";
import { avatarImage, escapeHtml, foxImage, icon } from "../ui/components.js";
import { taskAllowedBySettings } from "../services/parent-settings.js";

const FILTER_ORDER = Object.freeze(Object.keys(TASK_FILTER_ALIASES));

export function renderQuests(state) {
  const questUi = state.questUi;
  const enabledTasks = questUi.tasks.filter((task) => taskAllowedBySettings(task, state.onboarding.settings));
  const filtered = filterTasks(enabledTasks, questUi.filter);
  const selected = getTaskById(filtered, questUi.selectedTaskId) ?? filtered[0] ?? null;
  const dailyLimit = Number(state.onboarding.settings.dailyTaskGoal ?? 2);
  const dailyUsed = countDailyQuestSlots(questUi.history);
  const atDailyLimit = dailyUsed >= dailyLimit;

  return `
    <section class="quests-page" aria-labelledby="quests-title">
      <header class="quest-hero-banner">
        <div class="quest-hero-brand" aria-label="Real Life Quest">
          <span class="quest-hero-brand__compass" aria-hidden="true">🧭</span>
          <div><strong>Real Life<br>Quest</strong><small>把真實生活・變成大冒險</small></div>
        </div>
        <div class="quest-hero-title">
          <p class="eyebrow">ADVENTURE BOARD</p>
          <h1 id="quests-title">${uiText("quests.title")}</h1>
          <p>完成任務，讓自己變得更棒！</p>
        </div>
        <div class="quest-hero-party" aria-hidden="true">
          ${avatarImage(state.onboarding.avatarVariant, "happy")}
          ${foxImage("happy")}
        </div>
        <aside class="quest-daily-limit" role="status">
          <span><strong>${dailyUsed} / ${dailyLimit}</strong> 今日任務額度</span>
          <small>每天 00:00 重置</small>
        </aside>
      </header>
      <div class="quest-filters" role="tablist" aria-label="任務分類">
        ${FILTER_ORDER.map((filter) => filterButton(filter, questUi.filter)).join("")}
      </div>
      <div class="quest-browser">
        <div class="quest-list" aria-label="任務列表">
          ${filtered.length ? filtered.map((task) => questCard(task, state, task.id === selected?.id, atDailyLimit)).join("") : emptyState()}
        </div>
        <div class="quest-preview">
          ${selected ? questDetail(selected, state, atDailyLimit) : emptyState()}
        </div>
      </div>
    </section>
  `;
}

function filterButton(filter, activeFilter) {
  const active = filter === activeFilter;
  return `<button class="quest-filter ${active ? "is-active" : ""}" type="button" role="tab" aria-selected="${active}" data-quest-filter="${filter}"><span aria-hidden="true">${filterIcon(filter)}</span><strong>${uiText(`quests.tabs.${filter}`)}</strong></button>`;
}

function questCard(task, state, selected, atDailyLimit) {
  const history = currentHistory(task, state);
  return `
    <article class="quest-card ${selected ? "is-selected" : ""}" data-status="${history?.status ?? "available"}">
      <button class="quest-card__select" type="button" data-select-quest="${task.id}" aria-label="查看 ${escapeHtml(task.name)}">
        <span class="quest-card__thumb" aria-hidden="true">${taskThumbnail(task, state.onboarding.avatarVariant)}</span>
        <span class="quest-card__body">
          <strong>${escapeHtml(task.name)}</strong>
          <small>${escapeHtml(task.description)}</small>
          <span class="quest-card__meta"><span>難度 ${escapeHtml(task.difficulty)}</span><b>EXP +${task.exp}</b></span>
        </span>
        <span class="quest-card__chevron" aria-hidden="true">›</span>
      </button>
      <div class="quest-card__action">
        ${history
          ? `<span class="quest-state">${stateLabel(history.status)}</span>`
          : atDailyLimit
            ? `<span class="quest-state">今日已達上限</span>`
            : `<button class="button button--small button--primary" type="button" data-start-quest="${task.id}">${uiText("quests.card.start")} <span aria-hidden="true">›</span></button>`}
      </div>
    </article>
  `;
}

function questDetail(task, state, atDailyLimit) {
  const history = currentHistory(task, state);
  const status = history?.status ?? "available";
  const tips = task.movementTipsZh ?? [];
  const activity = getTaskActivityControl(task);
  return `
    <article class="quest-detail" aria-labelledby="quest-detail-title">
      <div class="quest-detail__art">
        ${taskArtwork(task, state.onboarding.avatarVariant)}
        <div class="quest-detail__art-label"><span>${escapeHtml(detailType(task))}</span><strong>${escapeHtml(task.name)}</strong></div>
      </div>
      <div class="quest-detail__heading">
        <div><p class="eyebrow">MISSION DETAIL</p><h2 id="quest-detail-title">${escapeHtml(task.name)}</h2><p class="quest-description">${escapeHtml(task.description)}</p></div>
        <span class="reward-chip">EXP +${task.exp}</span>
      </div>
      <div class="quest-summary-strip">
        <span><small>難度</small><strong>${escapeHtml(task.difficulty)}</strong></span>
        <span><small>完成目標</small><strong>${escapeHtml(task.completionCriteria)}</strong></span>
        <span><small>任務方式</small><strong>${task.screenMode === "offscreen" ? "離開螢幕完成" : "短時間使用畫面"}</strong></span>
      </div>
      ${tips.length ? tipsPanel(task, tips) : ""}
      ${task.safetyNote ? safetyPanel(task.safetyNote) : ""}
      ${["in_progress", "returned"].includes(status) && activity ? activityPanel(task, activity, history.progress?.value ?? 0, state.questUi.activeTimerTaskId === task.id) : ""}
      ${task.taskFamily === "chore" ? photoPlaceholder() : ""}
      <div class="quest-detail__actions">${detailActions(task, status, atDailyLimit)}</div>
    </article>
  `;
}

function taskArtwork(task, avatarVariant) {
  if (!task.assetLogicalId) {
    return `<div class="quest-art-fallback" role="img" aria-label="${escapeHtml(task.name)}"><span>${escapeHtml(task.imageDisplay?.iconEmoji ?? "✦")}</span></div>`;
  }
  const resolved = resolveAsset(task.assetLogicalId, { avatarVariant });
  if (resolved.type === "path") {
    return `<img src="${escapeHtml(resolved.value)}" alt="${escapeHtml(task.imageDisplay?.visualLabelZh ?? task.name)}" draggable="false">`;
  }
  return `<div class="quest-art-fallback" role="img" aria-label="${escapeHtml(task.imageDisplay?.visualLabelZh ?? task.name)}"><span>${escapeHtml(task.imageDisplay?.iconEmoji ?? "✦")}</span></div>`;
}

function taskThumbnail(task, avatarVariant) {
  if (task.assetLogicalId) {
    const resolved = resolveAsset(task.assetLogicalId, { avatarVariant });
    if (resolved.type === "path") {
      return `<img src="${escapeHtml(resolved.value)}" alt="" draggable="false">`;
    }
  }
  return `<span class="quest-card__emoji">${escapeHtml(task.imageDisplay?.iconEmoji ?? categoryEmoji(task.category))}</span>`;
}

function filterIcon(filter) {
  return ({
    all: "▦",
    reading: "📖",
    english: "🔤",
    exercise: "👟",
    chores: "🏠",
    life: "🌱",
    hidden: "✨",
  })[filter] ?? "✦";
}

function categoryEmoji(category) {
  if (category === "reading_story") return "📚";
  if (category === "english") return "🔤";
  if (category === "exercise" || category === "exercise_home") return "👟";
  if (category === "chores_home") return "🏠";
  if (category === "life") return "🌱";
  return "✦";
}

function tipsPanel(task, tips) {
  const title = task.taskFamily === "chore" ? uiText("chores.stepsTitle") : uiText("exercise.tipsTitle");
  return `<section class="quest-tips"><h3>${title}</h3><ol>${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ol></section>`;
}

function safetyPanel(note) {
  return `<aside class="safety-notice"><strong>${uiText("quests.detail.safety")}</strong><p>${escapeHtml(note)}</p></aside>`;
}

function activityPanel(task, activity, value, timerActive) {
  const display = activity.type === "timer" ? uiText("exercise.secondsUnit", { seconds: value }) : `${value} / ${activity.target} ${activity.unit}`;
  return `
    <section class="activity-control" aria-label="${uiText("exercise.counterTitle")}">
      <div><small>${activity.type === "timer" ? uiText("exercise.timerMode") : uiText("exercise.manualCounter")}</small><strong>${display}</strong></div>
      ${activity.type === "timer"
        ? `<button class="button button--secondary" type="button" data-toggle-quest-timer="${task.id}">${timerActive ? "暫停計時" : "開始計時"}</button>`
        : `<div class="counter-buttons"><button type="button" data-adjust-quest="${task.id}" data-delta="-1" aria-label="${uiText("exercise.counterDecrease")}">−</button><button type="button" data-adjust-quest="${task.id}" data-delta="1" aria-label="${uiText("exercise.counterIncrease")}">＋</button></div>`}
    </section>
  `;
}

function photoPlaceholder() {
  return `<div class="photo-placeholder"><button class="button button--secondary" type="button" disabled>${uiText("chores.photo")}</button><small>${uiText("chores.photoOptional")} 本機儲存路徑將在後續階段接入。</small></div>`;
}

function detailActions(task, status, atDailyLimit) {
  if (status === "available") {
    if (atDailyLimit) return `<p class="completed-message" role="status">今日任務額度已用完，明天 00:00 重置後可再挑戰。</p>`;
    return `<button class="button button--primary button--wide" type="button" data-start-quest="${task.id}">${uiText("quests.detail.start")} ${icon("arrow")}</button>`;
  }
  if (status === "in_progress") {
    if (atDailyLimit) return `<p class="completed-message" role="status">今日任務額度已用完；這個進行中的任務可在明天重置後完成。</p>`;
    return `<button class="button button--gold button--wide" type="button" data-complete-quest="${task.id}">${task.taskFamily === "chore" ? uiText("chores.complete") : task.taskFamily === "exercise" ? uiText("exercise.complete") : uiText("quests.state.completed")}</button>`;
  }
  if (status === "pending_approval") return `<p class="pending-message" role="status">${uiText("quests.state.pendingApproval")}</p>`;
  if (status === "returned") return `<div><p class="pending-message" role="status">家長退回了這次紀錄，可以調整後重新送出。</p><button class="button button--gold button--wide" type="button" data-resubmit-quest="${task.id}">重新送出審核</button></div>`;
  return `<p class="completed-message" role="status">✓ ${uiText("quests.state.completed")}${task.repeatable ? "，明天重置後可再次挑戰。" : "。"}</p>`;
}

function currentHistory(task, state) {
  const id = completionInstanceId(task);
  return state.questUi.history.find((record) => record.id === id) ?? null;
}

function stateLabel(status) {
  if (status === "in_progress") return uiText("quests.state.inProgress");
  if (status === "pending_approval") return uiText("quests.state.pendingApproval");
  if (status === "returned") return "待調整";
  return uiText("quests.state.completed");
}

function detailType(task) {
  if (task.taskFamily === "exercise") return uiText("exercise.title");
  if (task.taskFamily === "chore") return uiText("chores.title");
  return escapeHtml(task.id);
}

function emptyState() {
  return `<div class="quest-empty"><span aria-hidden="true">🧭</span><p>${uiText("quests.empty")}</p></div>`;
}
