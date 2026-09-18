import { escapeHtml } from "../ui/components.js";

const WEEKDAYS = Object.freeze([
  [1, "一"], [2, "二"], [3, "三"], [4, "四"], [5, "五"], [6, "六"], [0, "日"],
]);

export function renderParentTab(state, active, pending, approvalCard) {
  if (active === "report") return reportView(state.parentUi?.report);
  if (active === "settings") return settingsView(state);
  return `<article class="parent-panel"><h2>待審核</h2>${pending.length
    ? pending.map((approval) => approvalCard(approval, state)).join("")
    : `<p class="parent-empty">目前沒有待審核項目。</p>`}</article>`;
}

function reportView(report) {
  if (!report) return `<article class="parent-panel"><p>正在整理本週紀錄…</p></article>`;
  const focus = report.focusMinutes == null ? "未記錄" : `${report.focusMinutes} 分鐘`;
  const strongest = report.strongestAbility ? `${escapeHtml(report.strongestAbility.label)} +${report.strongestAbility.exp}` : "尚無資料";
  return `
    <article class="parent-panel parent-report" aria-labelledby="weekly-report-title">
      <h2 id="weekly-report-title">本週報告</h2>
      <p class="parent-note">每週一重新起算；只統計已保存的結構化紀錄。</p>
      <div class="report-grid">
        ${metric("完成任務", report.completedQuests)}
        ${metric("英文場次", report.englishSessions)}
        ${metric("答題卡片", report.answeredCards)}
        ${metric("故事", report.stories)}
        ${metric("運動", report.exercise)}
        ${metric("家事", report.chores)}
        ${metric("退回再試", report.retries)}
        ${metric("專注時間", focus)}
      </div>
      <p class="strongest-ability"><strong>本週最強能力：</strong>${strongest}</p>
    </article>`;
}

function metric(label, value) {
  return `<div><strong>${escapeHtml(value)}</strong><small>${label}</small></div>`;
}

function settingsView(state) {
  const settings = state.parentUi?.settings ?? state.onboarding.settings;
  const restDays = new Set(settings.restDays ?? []);
  return `
    <div class="parent-settings-stack">
      <form class="parent-panel parent-settings" data-parent-settings>
        <h2>孩子與任務設定</h2>
        <div class="parent-avatar-choice" role="group" aria-label="主角外觀">
          ${avatarButton("boy", "男主角", state.onboarding.avatarVariant)}
          ${avatarButton("girl", "女主角", state.onboarding.avatarVariant)}
        </div>
        <label>每日任務目標
          <select name="dailyTaskGoal">${options([1, 2, 3], settings.dailyTaskGoal)}</select>
        </label>
        <label>最高任務難度
          <select name="maxTaskDifficulty">${options([1, 2, 3, 4, 5], settings.maxTaskDifficulty ?? 5, (value) => `${value} 星`)}</select>
        </label>
        ${checkbox("exerciseEnabled", "顯示運動任務", settings.exerciseEnabled)}
        ${checkbox("choresEnabled", "顯示家事任務", settings.choresEnabled)}
        ${checkbox("parentApprovalRequired", "所有任務完成後需家長確認", settings.parentApprovalRequired)}
        ${checkbox("materialRewardsEnabled", "允許家長控制的物質獎勵選項", settings.materialRewardsEnabled)}
        <fieldset><legend>休息日</legend><div class="weekday-options">${WEEKDAYS.map(([value, label]) => checkbox("restDays", `週${label}`, restDays.has(value), value)).join("")}</div></fieldset>
        <fieldset><legend>英文語速範圍</legend><div class="speech-bound-fields">
          <label>最低 <input name="speechMinRate" type="number" min="0.60" max="1.10" step="0.05" value="${Number(settings.speechMinRate ?? 0.6).toFixed(2)}"></label>
          <label>最高 <input name="speechMaxRate" type="number" min="0.60" max="1.10" step="0.05" value="${Number(settings.speechMaxRate ?? 1.1).toFixed(2)}"></label>
        </div></fieldset>
        <button class="button button--primary" type="submit">儲存設定</button>
      </form>
      ${packManager(state.parentUi?.packs ?? [])}
      ${backupManager(state.parentUi?.backupPreview, state.parentUi?.backupStatus)}
    </div>`;
}

function packManager(packs) {
  return `<article class="parent-panel pack-manager"><h2>英文單字包</h2>
    <div class="pack-list">${packs.map((pack) => `<div><span><strong>${escapeHtml(pack.nameZh ?? pack.title ?? pack.name ?? pack.packId)}</strong><small>${pack.wordCount} 個單字 · ${escapeHtml(pack.packVersion ?? pack.version ?? "")}</small></span><button class="button button--secondary" type="button" data-toggle-pack="${escapeHtml(pack.packId)}" data-pack-enabled="${!pack.enabled}">${pack.enabled ? "停用" : "啟用"}</button></div>`).join("")}</div>
    <form class="pack-import" data-pack-import><label>匯入本機 JSON<input name="packFile" type="file" accept="application/json,.json" required></label>${checkbox("allowUpdate", "明確允許更新同一 packId", false)}<button class="button button--secondary" type="submit">驗證並匯入</button></form>
    <p class="parent-note">停用或更新單字包不會刪除既有學習進度。</p>
  </article>`;
}

function avatarButton(value, label, active) {
  return `<button class="${value === active ? "is-active" : ""}" type="button" data-parent-avatar="${value}" aria-pressed="${value === active}">${label}</button>`;
}

function checkbox(name, label, checked, value = "true") {
  return `<label class="toggle-field"><input type="checkbox" name="${name}" value="${value}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
}

function options(values, selected, label = String) {
  return values.map((value) => `<option value="${value}" ${Number(selected) === value ? "selected" : ""}>${label(value)}</option>`).join("");
}


function backupManager(preview, status) {
  const summary = preview?.summary;
  return `<article class="parent-panel backup-manager" aria-labelledby="backup-manager-title">
    <h2 id="backup-manager-title">備份與還原</h2>
    <p class="parent-note">備份檔只儲存在你選擇的位置，包含孩子進度與本機家長設定，請妥善保管。</p>
    <div class="backup-actions">
      <button class="button button--secondary" type="button" data-backup-export>匯出 JSON 備份</button>
      <form class="backup-import" data-backup-preview-form>
        <label>選擇備份 JSON
          <input name="backupFile" type="file" accept="application/json,.json" required>
        </label>
        <button class="button button--secondary" type="submit">檢查備份</button>
      </form>
    </div>
    ${status ? `<p class="backup-status" role="status">${escapeHtml(status)}</p>` : ""}
    ${summary ? backupPreview(preview, summary) : ""}
  </article>`;
}

function backupPreview(preview, summary) {
  return `<section class="backup-preview" aria-labelledby="backup-preview-title">
    <h3 id="backup-preview-title">準備還原這份備份</h3>
    <p><strong>${escapeHtml(summary.nickname || "未命名角色")}</strong> · ${escapeHtml(formatDateTime(summary.exportedAt))}</p>
    <dl class="backup-summary">
      <div><dt>任務紀錄</dt><dd>${summary.questHistory}</dd></div>
      <div><dt>英文進度</dt><dd>${summary.wordProgress}</dd></div>
      <div><dt>英文場次</dt><dd>${summary.wordSessions}</dd></div>
      <div><dt>故事進度</dt><dd>${summary.storyProgress}</dd></div>
      <div><dt>獎勵</dt><dd>${summary.rewards}</dd></div>
      <div><dt>Boss 進度</dt><dd>${summary.bossProgress}</dd></div>
    </dl>
    ${preview.migrated ? `<p class="parent-note">將從資料庫版本 ${preview.sourceDbVersion} 安全轉換到目前版本。</p>` : ""}
    <p class="backup-warning">確認還原後，這台裝置目前的本機資料會由備份內容完整取代。</p>
    <div class="backup-confirm-actions">
      <button class="button button--secondary" type="button" data-backup-cancel>取消</button>
      <button class="button button--gold" type="button" data-backup-restore>確認還原</button>
    </div>
  </section>`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "日期不明" : date.toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}
