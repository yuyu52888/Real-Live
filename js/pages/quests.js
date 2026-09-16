import { completionInstanceId } from "../services/quest-service.js";
import { resolveAsset } from "../services/asset-registry.js";
import { uiText } from "../services/ui-copy.js";
import { filterTasks, getTaskActivityControl, getTaskById, TASK_FILTER_ALIASES } from "../repositories/tasks.js";
import { escapeHtml, icon } from "../ui/components.js";

const FILTER_ORDER = Object.freeze(Object.keys(TASK_FILTER_ALIASES));

export function renderQuests(state) {
  const questUi = state.questUi;
  const enabledTasks = questUi.tasks.filter((task) => (
    (task.taskFamily !== "exercise" || state.onboarding.settings.exerciseEnabled) &&
    (task.taskFamily !== "chore" || state.onboarding.settings.choresEnabled)
  ));
  const filtered = filterTasks(enabledTasks, questUi.filter);
  const selected = getTaskById(filtered, questUi.selectedTaskId) ?? filtered[0] ?? null;

  return `
    <section class="quests-page" aria-labelledby="quests-title">
      <header class="quests-header">
        <div><p class="eyebrow">REAL LIFE QUEST</p><h1 id="quests-title">${uiText("quests.title")}</h1></div>
        <p>從真實生活選一項挑戰，開始後再到現實世界完成它。</p>
      </header>
      <div class="quest-filters" role="tablist" aria-label="任務分類">
        ${FILTER_ORDER.map((filter) => filterButton(filter, questUi.filter)).join("")}
      </div>
      <div class="quest-browser">
        <div class="quest-list" aria-label="任務列表">
          ${filtered.length ? filtered.map((task) => questCard(task, state, task.id === selected?.id)).join("") : emptyState()}
        </div>
        <div class="quest-preview">
          ${selected ? questDetail(selected, state) : emptyState()}
        </div>
      </div>
    </section>
  `;
}

function filterButton(filter, activeFilter) {
  const active = filter === activeFilter;
  return `<button class="quest-filter ${active ? "is-active" : ""}" type="button" role="tab" aria-selected="${active}" data-quest-filter="${filter}">${uiText(`quests.tabs.${filter}`)}</button>`;
}

function questCard(task, state, selected) {
  const history = currentHistory(task, state);
  return `
    <article class="quest-card ${selected ? "is-selected" : ""}" data-status="${history?.status ?? "available"}">
      <button class="quest-card__select" type="button" data-select-quest="${task.id}" aria-label="查看 ${escapeHtml(task.name)}">
        <span class="quest-card__icon" aria-hidden="true">${escapeHtml(task.imageDisplay?.iconEmoji ?? "✦")}</span>
        <span class="quest-card__body">
          <strong>${escapeHtml(task.name)}</strong>
          <small>${escapeHtml(task.description)}</small>
          <span class="quest-card__meta">${escapeHtml(task.difficulty)} · ${task.exp} EXP ${task.requiresParentConfirmation ? `· ${uiText("quests.card.requiresApproval")}` : ""}</span>
        </span>
      </button>
      ${history ? `<span class="quest-state">${stateLabel(history.status)}</span>` : `<button class="button button--small button--primary" type="button" data-start-quest="${task.id}">${uiText("quests.card.start")}</button>`}
    </article>
  `;
}

function questDetail(task, state) {
  const history = currentHistory(task, state);
  const status = history?.status ?? "available";
  const tips = task.movementTipsZh ?? [];
  const activity = getTaskActivityControl(task);
  return `
    <article class="quest-detail" aria-labelledby="quest-detail-title">
      <div class="quest-detail__art">${taskArtwork(task, state.onboarding.avatarVariant)}</div>
      <div class="quest-detail__heading">
        <div><p class="eyebrow">${detailType(task)}</p><h2 id="quest-detail-title">${escapeHtml(task.name)}</h2></div>
        <span class="reward-chip">${task.exp} EXP</span>
      </div>
      <p class="quest-description">${escapeHtml(task.description)}</p>
      <dl class="quest-facts">
        <div><dt>${uiText("quests.detail.goal")}</dt><dd>${escapeHtml(task.completionCriteria)}</dd></div>
        <div><dt>${uiText("common.labels.difficulty")}</dt><dd aria-label="任務難度">${escapeHtml(task.difficulty)}</dd></div>
        <div><dt>畫面模式</dt><dd>${task.screenMode === "offscreen" ? "離開螢幕完成" : "短時間使用畫面"}</dd></div>
      </dl>
      ${tips.length ? tipsPanel(task, tips) : ""}
      ${task.safetyNote ? safetyPanel(task.safetyNote) : ""}
      ${status === "in_progress" && activity ? activityPanel(task, activity, history.progress?.value ?? 0, state.questUi.activeTimerTaskId === task.id) : ""}
      ${task.taskFamily === "chore" ? photoPlaceholder() : ""}
      <div class="quest-detail__actions">${detailActions(task, status)}</div>
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

function detailActions(task, status) {
  if (status === "available") return `<button class="button button--primary button--wide" type="button" data-start-quest="${task.id}">${uiText("quests.detail.start")} ${icon("arrow")}</button>`;
  if (status === "in_progress") return `<button class="button button--gold button--wide" type="button" data-complete-quest="${task.id}">${task.taskFamily === "chore" ? uiText("chores.complete") : task.taskFamily === "exercise" ? uiText("exercise.complete") : uiText("quests.state.completed")}</button>`;
  if (status === "pending_approval") return `<p class="pending-message" role="status">${uiText("quests.state.pendingApproval")}</p>`;
  return `<p class="completed-message" role="status">✓ ${uiText("quests.state.completed")}</p>`;
}

function currentHistory(task, state) {
  const id = completionInstanceId(task);
  return state.questUi.history.find((record) => record.id === id) ?? null;
}

function stateLabel(status) {
  if (status === "in_progress") return uiText("quests.state.inProgress");
  if (status === "pending_approval") return uiText("quests.state.pendingApproval");
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
