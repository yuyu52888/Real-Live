import { avatarImage, escapeHtml } from "../ui/components.js";

export function renderHero(state) {
  const ui = state.rewardUi;
  if (!ui || ui.loading) return `<section class="hero-page hero-loading" aria-live="polite"><p>獎勵資料準備中…</p></section>`;
  const player = ui.player ?? state.player;
  const ariaExp = Math.min(Math.max(Number(player.exp.current) || 0, 0), Math.max(Number(player.exp.target) || 1, 1));
  return `<section class="hero-page" aria-labelledby="hero-title">
    <header class="hero-profile">
      <div class="hero-profile__avatar">${avatarImage(state.onboarding.avatarVariant, "happy")}</div>
      <div><p class="eyebrow">MY HERO</p><h1 id="hero-title">${escapeHtml(state.onboarding.nickname)}</h1><strong>Lv.${player.level} · ${escapeHtml(player.title)}</strong>
        <div class="hero-exp" role="progressbar" aria-valuemin="0" aria-valuemax="${player.exp.target}" aria-valuenow="${ariaExp}"><i style="width:${Math.round(ariaExp / Math.max(1, player.exp.target) * 100)}%"></i></div>
        <small>累積 EXP ${player.exp.current} / ${player.exp.target}</small>
      </div>
      <div class="fragment-orb"><strong>${ui.fragments.current} / ${ui.fragments.needed}</strong><span>寶箱碎片</span></div>
    </header>

    ${ui.pendingClaims.length ? `<section class="reward-section" aria-labelledby="milestone-title"><h2 id="milestone-title">升級里程碑</h2><p>每個等級挑一個最喜歡的獎勵，選定後會永久保存。</p><div class="milestone-list">${ui.pendingClaims.map(milestoneCard).join("")}</div></section>` : ""}

    <section class="reward-section" aria-labelledby="chest-title"><h2 id="chest-title">我的寶箱</h2>
      <div class="collection-grid">${ui.chests.length ? ui.chests.map(chestCard).join("") : emptyCard("目前沒有未開啟的寶箱")}</div>
    </section>

    <section class="reward-section title-section" aria-labelledby="title-title"><h2 id="title-title">稱號收藏</h2>
      <div class="collection-grid">${ui.titles.length ? ui.titles.map((title) => titleCard(title, player.activeTitleId)).join("") : emptyCard("完成冒險後會解鎖稱號")}</div>
    </section>

    <div class="hero-collections">
      ${collection("徽章", ui.badges, "badge")}
      ${collection("外觀收藏", ui.cosmetics, "cosmetic")}
      ${collection("票券", ui.tickets, "ticket")}
      ${collection("特別獎勵", ui.privileges, "privilege")}
    </div>
    <aside class="cosmetic-note">外觀只讓角色更有自己的風格，不會改變能力值或可使用的內容。</aside>
  </section>`;
}

function milestoneCard(reward) {
  return `<article class="milestone-card"><header><span>Lv.${reward.level}</span><strong>三選一</strong></header><div class="milestone-options">${reward.options.map((option) => `
    <button type="button" data-claim-level="${reward.level}" data-reward-option="${escapeHtml(option.id)}" ${option.available ? "" : "disabled"}>
      <span>${option.type === "cosmetic" ? "◇" : option.type === "ticket" ? "券" : "★"}</span><strong>${escapeHtml(option.name)}</strong><small>${option.available ? "選擇這個" : escapeHtml(option.deferredReason ?? "目前未開放")}</small>
    </button>`).join("")}</div></article>`;
}

function chestCard(chest) {
  return `<article class="collection-card chest-card"><span aria-hidden="true">▣</span><strong>普通寶箱</strong><small>獎勵已經保存，重新載入也不會改變。</small><button class="button button--gold" type="button" data-open-chest="${escapeHtml(chest.id)}">開啟寶箱</button></article>`;
}

function titleCard(title, activeTitleId) {
  const active = title.itemId === activeTitleId;
  return `<article class="collection-card"><span aria-hidden="true">✦</span><strong>${escapeHtml(title.name)}</strong><button type="button" data-select-title="${escapeHtml(title.itemId)}" ${active ? "disabled" : ""}>${active ? "使用中" : "設為稱號"}</button></article>`;
}

function collection(title, items, kind) {
  return `<section class="reward-section"><h2>${title}</h2><div class="collection-grid">${items.length ? items.map((item) => `
    <article class="collection-card collection-card--${kind}"><span aria-hidden="true">${kind === "badge" ? "★" : kind === "ticket" ? "券" : "◇"}</span><strong>${escapeHtml(item.name)}</strong>${item.quantity > 1 || kind === "ticket" ? `<small>數量：${item.quantity}</small>` : ""}</article>`).join("") : emptyCard(`尚未解鎖${title}`)}</div></section>`;
}

function emptyCard(text) {
  return `<p class="collection-empty">${text}</p>`;
}
