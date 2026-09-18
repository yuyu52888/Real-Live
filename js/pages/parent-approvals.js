import { uiText } from "../services/ui-copy.js";
import { escapeHtml } from "../ui/components.js";
import { getTaskById } from "../repositories/tasks.js";
import { renderParentTab } from "./parent-sections.js";

export function renderParentApprovals(state) {
  if (!state.questUi.parentUnlocked) return lockedView();
  const active = state.parentUi?.activeTab ?? "approvals";
  const pending = state.questUi.approvals.filter((approval) => approval.status === "pending");
  return `
    <section class="parent-page" aria-labelledby="parent-title">
      <header><p class="eyebrow">PARENT</p><h1 id="parent-title">${uiText("parent.title")}</h1></header>
      <div class="parent-tabs" role="tablist" aria-label="家長專區">
        ${tabButton("approvals", "待審核", active)}
        ${tabButton("report", "本週報告", active)}
        ${tabButton("settings", "設定", active)}
      </div>
      ${renderParentTab(state, active, pending, approvalCard)}
    </section>
  `;
}

function tabButton(id, label, active) {
  return `<button type="button" role="tab" data-parent-tab="${id}" class="${id === active ? "is-active" : ""}" aria-selected="${id === active}">${label}</button>`;
}

function lockedView() {
  return `
    <section class="parent-page parent-page--locked" aria-labelledby="parent-title">
      <div class="parent-lock" aria-hidden="true">🔒</div>
      <h1 id="parent-title">${uiText("parent.title")}</h1>
      <form data-parent-unlock>
        <label class="field-label" for="parent-unlock-pin">${uiText("parent.enterPin")}</label>
        <input class="text-field" id="parent-unlock-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required>
        <p class="form-error" id="parent-error" role="alert" hidden></p>
        <button class="button button--primary button--wide" type="submit">${uiText("parent.unlock")}</button>
      </form>
    </section>
  `;
}

function approvalCard(approval, state) {
  const task = getTaskById(state.questUi.tasks, approval.questId);
  return `
    <article class="approval-card">
      <div><strong>${escapeHtml(task?.name ?? approval.questId)}</strong><small>${uiText("parent.completedAt", { time: formatTime(approval.requestedAt) })}</small></div>
      <div class="approval-card__actions">
        <button class="button button--secondary" type="button" data-return-completion="${escapeHtml(approval.questHistoryId)}">退回再調整</button>
        <button class="button button--gold" type="button" data-approve-completion="${escapeHtml(approval.questHistoryId)}">${uiText("parent.approve")}</button>
      </div>
    </article>
  `;
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
}
