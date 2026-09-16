import { uiText } from "../services/ui-copy.js";
import { escapeHtml } from "../ui/components.js";
import { getTaskById } from "../repositories/tasks.js";

export function renderParentApprovals(state) {
  if (!state.questUi.parentUnlocked) return lockedView();
  const pending = state.questUi.approvals.filter((approval) => approval.status === "pending");
  return `
    <section class="parent-page" aria-labelledby="parent-title">
      <header><p class="eyebrow">PARENT</p><h1 id="parent-title">${uiText("parent.title")}</h1></header>
      <article class="parent-panel">
        <h2>${uiText("parent.pending")}</h2>
        ${pending.length ? pending.map((approval) => approvalCard(approval, state)).join("") : `<p class="parent-empty">${uiText("parent.noPending")}</p>`}
      </article>
      <p class="stage-badge">週報、完整設定與退回流程將在後續階段接入</p>
    </section>
  `;
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
      <button class="button button--gold" type="button" data-approve-completion="${escapeHtml(approval.questHistoryId)}">${uiText("parent.approve")}</button>
    </article>
  `;
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
}
