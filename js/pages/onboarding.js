import { avatarImage, escapeHtml, foxImage, icon, logo } from "../ui/components.js";
import { uiText } from "../services/ui-copy.js";

const STEP_INDEX = {
  avatar: 0,
  nickname: 1,
  parent: 2,
  settings: 3,
};

export function mountOnboarding(root, state, actions) {
  const { step } = state.onboarding;
  root.innerHTML = `
    <main class="onboarding-shell">
      ${step === "welcome" ? renderWelcome() : renderSetupHeader(step)}
      <section class="onboarding-card" aria-labelledby="setup-title">
        ${renderStep(state)}
      </section>
    </main>
  `;

  root.querySelector("[data-start]")?.addEventListener("click", () => actions.advance());

  for (const button of root.querySelectorAll("[data-avatar]")) {
    button.addEventListener("click", () => actions.selectAvatar(button.dataset.avatar));
  }

  root.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = step === "settings"
      ? {
          dailyTaskGoal: form.get("dailyTaskGoal"),
          exerciseEnabled: form.has("exerciseEnabled"),
          choresEnabled: form.has("choresEnabled"),
          parentApprovalRequired: form.has("parentApprovalRequired"),
        }
      : Object.fromEntries(form);
    actions.advance(input);
  });
}

function renderWelcome() {
  return `
    <header class="welcome-header">
      <div class="welcome-brand">${logo()}</div>
      <div class="welcome-art" aria-hidden="true">
        ${avatarImage("girl", "idle", "welcome-avatar welcome-avatar--girl")}
        ${foxImage("happy", "welcome-fox")}
        ${avatarImage("boy", "idle", "welcome-avatar welcome-avatar--boy")}
      </div>
      <div class="welcome-copy">
        <p class="eyebrow">你的冒險，從今天開始</p>
        <h1 id="setup-title">${uiText("onboarding.welcome.subtitle")}</h1>
        <p>學習、運動、家事和勇敢嘗試，都會成為你的成長足跡。</p>
      </div>
    </header>
  `;
}

function renderSetupHeader(step) {
  const activeIndex = STEP_INDEX[step] ?? 0;
  return `
    <header class="setup-header">
      <div class="setup-brand">${logo()}</div>
      <div class="step-progress" aria-label="設定進度：第 ${activeIndex + 1} 步，共 4 步">
        ${Array.from({ length: 4 }, (_, index) => `<span class="${index <= activeIndex ? "is-active" : ""}"></span>`).join("")}
      </div>
    </header>
  `;
}

function renderStep(state) {
  const { step, avatarVariant, nickname, settings } = state.onboarding;
  if (step === "welcome") {
    return `
      <div class="welcome-action">
        <button class="button button--primary button--wide" type="button" data-start>
          ${uiText("onboarding.welcome.start")} ${icon("arrow")}
        </button>
        <p>約 2 分鐘完成設定</p>
      </div>
    `;
  }
  if (step === "avatar") {
    return `
      <div class="step-copy">
        <p class="eyebrow">第一步</p>
        <h1 id="setup-title">${uiText("onboarding.avatar.title")}</h1>
        <p>${uiText("onboarding.avatar.note")}</p>
      </div>
      <form class="setup-form">
        <div class="avatar-grid" role="radiogroup" aria-label="主角選擇">
          ${avatarChoice("boy", uiText("onboarding.avatar.boy"), uiText("onboarding.avatar.boyDescription"), avatarVariant === "boy")}
          ${avatarChoice("girl", uiText("onboarding.avatar.girl"), uiText("onboarding.avatar.girlDescription"), avatarVariant === "girl")}
        </div>
        <button class="button button--primary" type="submit" ${avatarVariant ? "" : "disabled"}>
          ${uiText("onboarding.avatar.selected")} ${icon("arrow")}
        </button>
      </form>
    `;
  }
  if (step === "nickname") {
    return `
      <div class="step-copy">
        <p class="eyebrow">第二步</p>
        <h1 id="setup-title">${uiText("onboarding.nickname.title")}</h1>
        <p>輸入喜歡的暱稱，${uiText("onboarding.nickname.hint")}。</p>
      </div>
      <form class="setup-form setup-form--narrow">
        <label class="field-label" for="nickname">我的暱稱</label>
        <input class="text-field" id="nickname" name="nickname" value="${escapeHtml(nickname)}" maxlength="12" autocomplete="nickname" required autofocus>
        <p class="field-hint">之後可以在家長模式中調整。</p>
        <button class="button button--primary" type="submit">${uiText("onboarding.nickname.create")} ${icon("arrow")}</button>
      </form>
    `;
  }
  if (step === "parent") {
    return `
      <div class="step-copy">
        <div class="round-icon">${icon("lock")}</div>
        <p class="eyebrow">第三步・請家長協助</p>
        <h1 id="setup-title">${uiText("onboarding.parentSetup.title")}</h1>
        <p>請由家長設定 4 位數字。設定會保存在這台裝置。</p>
      </div>
      <form class="setup-form setup-form--narrow">
        <label class="field-label" for="parent-pin">${uiText("onboarding.parentSetup.pinLabel")}</label>
        <input class="text-field pin-field" id="parent-pin" name="parentPin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" aria-describedby="pin-hint" required autofocus>
        <p class="field-hint" id="pin-hint">請選擇容易記住、孩子不容易猜到的數字。</p>
        <button class="button button--primary" type="submit">${uiText("common.buttons.next")} ${icon("arrow")}</button>
      </form>
    `;
  }
  return `
    <div class="step-copy">
      <p class="eyebrow">第四步・基本設定</p>
      <h1 id="setup-title">安排舒服的冒險節奏</h1>
      <p>先使用建議設定，之後可由家長再調整。</p>
    </div>
    <form class="setup-form settings-form">
      <label class="setting-row" for="daily-goal">
        <span><strong>${uiText("onboarding.parentSetup.dailyQuestCount")}</strong><small>每天安排幾個任務</small></span>
        <select id="daily-goal" name="dailyTaskGoal">
          ${[1, 2, 3].map((count) => `<option value="${count}" ${settings.dailyTaskGoal === count ? "selected" : ""}>${count} 個</option>`).join("")}
        </select>
      </label>
      ${toggle("exerciseEnabled", uiText("onboarding.parentSetup.enableExercise"), "安排安全、離開螢幕的活動", settings.exerciseEnabled)}
      ${toggle("choresEnabled", uiText("onboarding.parentSetup.enableChores"), "練習參與日常生活", settings.choresEnabled)}
      ${toggle("parentApprovalRequired", uiText("onboarding.parentSetup.requireApproval"), "完成指定任務後等待家長核准", settings.parentApprovalRequired)}
      <div class="setting-row setting-row--static">
        <span><strong>${uiText("onboarding.parentSetup.speechRate")}</strong><small>建議的清楚慢速</small></span>
        <strong class="setting-value">0.75×</strong>
      </div>
      <button class="button button--primary" type="submit">${uiText("onboarding.parentSetup.finish")} ${icon("arrow")}</button>
    </form>
  `;
}

function avatarChoice(variant, title, description, selected) {
  return `
    <button class="avatar-choice ${selected ? "is-selected" : ""}" type="button" role="radio" aria-checked="${selected}" data-avatar="${variant}">
      <span class="avatar-choice__check">${icon("check")}</span>
      <span class="avatar-choice__art">${avatarImage(variant, "idle")}</span>
      <strong>${title}</strong>
      <span>${description}</span>
    </button>
  `;
}

function toggle(name, title, description, checked) {
  return `
    <label class="setting-row">
      <span><strong>${title}</strong><small>${description}</small></span>
      <span class="switch"><input name="${name}" type="checkbox" ${checked ? "checked" : ""}><span aria-hidden="true"></span></span>
    </label>
  `;
}
