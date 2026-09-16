import { avatarImage, escapeHtml } from "../ui/components.js";

const PAGE_COPY = {
  quests: ["任務總覽", "任務資料與完成流程將在 Stage 3 實作。", "📋"],
  learn: ["學習天地", "英文學習與思維故事會依各自階段接入正式資料。", "📚"],
  parent: ["家長模式", "PIN 驗證、審核與週報功能將在 Stage 8 實作。", "⚙️"],
};

export function renderPlaceholder(route, state) {
  if (route === "hero") {
    return `
      <section class="placeholder-page" aria-labelledby="page-title">
        <div class="placeholder-page__art">${avatarImage(state.onboarding.avatarVariant, "idle")}</div>
        <p class="eyebrow">我的角色</p>
        <h1 id="page-title">${escapeHtml(state.onboarding.nickname)}</h1>
        <p>目前選擇只會改變主角外觀，不會改變等級、能力或可使用的內容。</p>
        <span class="stage-badge">角色裝備功能將在 Stage 6 實作</span>
      </section>
    `;
  }

  const [title, description, symbol] = PAGE_COPY[route] ?? PAGE_COPY.quests;
  return `
    <section class="placeholder-page" aria-labelledby="page-title">
      <span class="placeholder-page__symbol" aria-hidden="true">${symbol}</span>
      <p class="eyebrow">開發中</p>
      <h1 id="page-title">${title}</h1>
      <p>${description}</p>
      <span class="stage-badge">Stage 1 僅建立導覽入口</span>
    </section>
  `;
}
