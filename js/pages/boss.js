import { resolveAsset } from "../services/asset-registry.js";
import { escapeHtml } from "../ui/components.js";

export function renderBossPage(state) {
  const ui = state.bossUi;
  const boss = ui?.bosses?.find(({ id }) => id === ui.selectedBossId) ?? ui?.homeBoss;
  if (!boss) return `<section class="boss-page boss-page--loading"><p>Boss 資料準備中…</p></section>`;
  const asset = resolveAsset(`boss.${boss.id}`);
  const art = asset.type === "path"
    ? `<img src="${escapeHtml(asset.value)}" alt="${escapeHtml(boss.name)}">`
    : `<div class="boss-art__fallback" role="img" aria-label="${escapeHtml(boss.name)} 圖片預留位置">♛</div>`;
  const nextStep = boss.steps.find(({ step }) => !boss.progressRecord.completedSteps.includes(step));
  return `<section class="boss-page" aria-labelledby="boss-title">
    <button class="boss-back" type="button" data-boss-back>← 回到首頁</button>
    <div class="boss-stage">
      <div class="boss-art">${art}<span>第 ${boss.chapter} 章</span></div>
      <div class="boss-sheet">
        <p class="eyebrow">${escapeHtml(boss.chapterName)} · ${boss.id}</p>
        <h1 id="boss-title">${escapeHtml(boss.name)}</h1>
        <p>${escapeHtml(boss.story)}</p>
        <section class="boss-challenge"><strong>本章挑戰</strong><p>${escapeHtml(boss.challenge)}</p></section>
        ${boss.unlock.unlocked ? bossBattle(boss, nextStep) : lockedState(boss)}
      </div>
    </div>
    ${bossRoster(ui.bosses, boss.id)}
  </section>`;
}

export function renderHomeBossCard(boss) {
  if (!boss) return `<article class="feature-card boss-card"><p>Boss 資料準備中…</p></article>`;
  const asset = resolveAsset(`boss.${boss.id}`);
  const art = asset.type === "path" ? `<img src="${escapeHtml(asset.value)}" alt="">` : `<span aria-hidden="true">♛</span>`;
  const status = boss.defeated ? "已擊敗" : boss.unlock.unlocked ? `HP ${boss.remainingHp} / ${boss.hp}` : `${boss.unlock.completed} / ${boss.unlock.total} 篇故事`;
  const allComplete = boss.allDefeated === true;
  return `<article class="feature-card boss-card ${boss.unlock.unlocked ? "is-unlocked" : "is-locked"}">
    <div class="feature-card__heading"><span class="crown-mark">♛</span><div><small>${allComplete ? "六章 Boss 全部完成" : `今日 Boss · 第 ${boss.chapter} 章`}</small><h2>${escapeHtml(boss.name)}</h2></div></div>
    <div class="boss-card__preview">${art}<div><strong>${escapeHtml(boss.chapterName)}</strong><span>${status}</span></div></div>
    <p>${allComplete ? "你已完成六章故事與 Boss 挑戰，所有勝利紀錄都已保存。" : boss.defeated ? "勝利紀錄與章節獎勵已保存。" : boss.unlock.unlocked ? "依序完成真實挑戰，削減 Boss HP。" : "完成本章 5 篇故事即可解鎖。"}</p>
    <button class="button button--gold" type="button" data-open-boss="${boss.id}">${allComplete ? "查看完整勝利紀錄" : boss.defeated ? "查看勝利紀錄" : boss.unlock.unlocked ? "進入 Boss 挑戰" : "查看解鎖進度"}</button>
  </article>`;
}

function bossBattle(boss, nextStep) {
  const hp = Array.from({ length: boss.hp }, (_, index) => `<span class="${index < boss.remainingHp ? "is-full" : ""}" aria-hidden="true">♥</span>`).join("");
  const chest = boss.chapterChest;
  const cosmeticAsset = resolveAsset(`cosmetic.boss_${boss.id.toLowerCase()}`);
  const cosmeticPreview = cosmeticAsset.type === "path" ? `<img src="${escapeHtml(cosmeticAsset.value)}" alt="">` : "◇";

  return `<div class="boss-battle">
    <div class="boss-hp" aria-label="剩餘 HP ${boss.remainingHp} / ${boss.hp}"><strong>Boss HP</strong><div>${hp}</div><span>${boss.remainingHp} / ${boss.hp}</span></div>
    <ol class="boss-steps">${boss.steps.map((entry) => {
      const done = boss.progressRecord.completedSteps.includes(entry.step);
      const current = entry.step === nextStep?.step;
      return `<li class="${done ? "is-done" : current ? "is-current" : ""}"><span>${done ? "✓" : entry.step}</span><strong>${escapeHtml(entry.desc)}</strong>${current && !boss.defeated ? `<button type="button" data-complete-boss-step="${entry.step}" data-boss-id="${boss.id}">完成這一步</button>` : ""}</li>`;
    }).join("")}</ol>
    <div class="boss-reward-preview"><strong>勝利獎勵</strong><span>+${boss.rewards.exp} EXP</span><span>${escapeHtml(boss.rewards.badge)}徽章</span><span class="boss-cosmetic-preview">${cosmeticPreview}${escapeHtml(boss.rewards.cosmetic)}</span><span>5 寶箱碎片 + 章節寶箱</span></div>
    ${boss.defeated ? `<div class="boss-victory"><strong>挑戰成功！</strong><p>勝利與獎勵狀態已保存，重複進入不會再次發獎。</p>${chest?.status === "unopened" ? `<button class="button button--gold" type="button" data-open-boss-chest="${escapeHtml(chest.id)}">開啟章節寶箱</button>` : chest ? `<span>章節寶箱已開啟</span>` : `<span>獎勵同步中…</span>`}</div>` : ""}
  </div>`;
}

function lockedState(boss) {
  return `<div class="boss-locked"><strong>尚未解鎖</strong><p>本章故事進度 ${boss.unlock.completed} / ${boss.unlock.total}</p><div class="boss-story-dots">${Array.from({ length: boss.unlock.total }, (_, index) => `<span class="${index < boss.unlock.completed ? "is-done" : ""}"></span>`).join("")}</div></div>`;
}

function bossRoster(bosses, activeId) {
  return `<section class="boss-roster" aria-labelledby="boss-roster-title"><h2 id="boss-roster-title">六章 Boss</h2><div>${bosses.map((boss) => `<button type="button" data-open-boss="${boss.id}" class="${boss.id === activeId ? "is-active" : ""}"><span>第 ${boss.chapter} 章</span><strong>${escapeHtml(boss.name)}</strong><small>${boss.defeated ? "已擊敗" : boss.unlock.unlocked ? `HP ${boss.remainingHp}/${boss.hp}` : `${boss.unlock.completed}/5 故事`}</small></button>`).join("")}</div></section>`;
}
