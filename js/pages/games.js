import { currentMiniGameQuestion, getMiniGame, MINI_GAMES, reactionRating } from "../services/mini-games.js";
import { escapeHtml } from "../ui/components.js";

export function renderGames(state) {
  const ui = state.gameUi ?? {};
  const selected = getMiniGame(ui.selectedGameId);
  if (!selected) return hubView();
  return gameView(selected, ui.session);
}

function hubView() {
  return `<section class="games-page" aria-labelledby="games-title">
    <header class="games-hero">
      <div><p class="eyebrow">BRAIN TRAINING CAMP</p><h1 id="games-title">冒險訓練場</h1><p>每次玩 1～3 分鐘就好。這些遊戲不是比排名，而是練習「想、看、等、再行動」。</p></div>
      <span aria-hidden="true">🎮</span>
    </header>
    <div class="game-grid">${MINI_GAMES.map(gameCard).join("")}</div>
    <aside class="games-note">建議一天選 1～2 款即可，避免增加太多平板時間。遊戲成績不會扣 EXP，也不和別人排名。</aside>
  </section>`;
}

function gameCard(game) {
  return `<article class="game-card">
    <span class="game-card__icon" aria-hidden="true">${game.icon}</span>
    <div><small>${escapeHtml(game.duration)}</small><h2>${escapeHtml(game.title)}</h2><p>${escapeHtml(game.reason)}</p></div>
    <div class="game-card__abilities">${game.abilities.map((ability) => `<span>${escapeHtml(ability)}</span>`).join("")}</div>
    <p class="game-card__learn"><strong>會練到：</strong>${escapeHtml(game.learn)}</p>
    <button class="button button--primary" type="button" data-open-mini-game="${game.id}">開始訓練</button>
  </article>`;
}

function gameView(game, session) {
  return `<section class="games-page game-play" aria-labelledby="game-title">
    <header class="game-play__header">
      <button class="learn-back" type="button" data-close-mini-game aria-label="回到小遊戲總覽">←</button>
      <div><p class="eyebrow">MINI GAME</p><h1 id="game-title">${game.icon} ${escapeHtml(game.title)}</h1><p>${escapeHtml(game.learn)}</p></div>
      <div class="game-play__abilities">${game.abilities.map((ability) => `<span>${escapeHtml(ability)}</span>`).join("")}</div>
    </header>
    ${game.id === "reaction-lantern" ? reactionView(session) : quizView(session)}
    <section class="game-why"><strong>為什麼這樣設計？</strong><p>${escapeHtml(game.reason)}</p></section>
  </section>`;
}

function quizView(session) {
  if (!session) return "";
  if (session.complete) {
    return `<article class="game-board game-result"><span aria-hidden="true">🏁</span><h2>完成！</h2><p>答對 ${session.score} / ${session.round} 題。</p><p>${escapeHtml(session.feedback ?? "")}</p><button class="button button--primary" type="button" data-reset-mini-game>再玩一次</button></article>`;
  }
  const question = currentMiniGameQuestion(session);
  return `<article class="game-board">
    <div class="game-score"><span>第 ${session.round + 1} 題</span><strong>目前 ${session.score} 分</strong></div>
    ${session.feedback ? `<p class="game-feedback ${session.lastCorrect ? "is-correct" : "is-review"}">${escapeHtml(session.feedback)}</p>` : ""}
    <h2>${escapeHtml(question.prompt)}</h2>
    <div class="game-choices">${question.choices.map((choice) => `<button type="button" data-mini-game-answer="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join("")}</div>
  </article>`;
}

function reactionView(session) {
  const phase = session?.phase ?? "ready";
  const attempts = session?.attempts ?? [];
  const last = attempts.at(-1);
  const average = attempts.length ? Math.round(attempts.reduce((sum, value) => sum + value, 0) / attempts.length) : null;
  return `<article class="game-board reaction-board reaction-board--${phase}">
    <div class="reaction-light" aria-live="polite"><span></span><strong>${phase === "waiting" ? "等等…" : phase === "go" ? "現在！" : phase === "early" ? "太早了" : "準備好了嗎？"}</strong></div>
    <p>${escapeHtml(session?.feedback ?? "按開始後，看到綠燈再點！")}</p>
    ${last != null ? `<div class="reaction-result"><strong>${last} ms</strong><span>${reactionRating(last)}</span></div>` : ""}
    ${average != null ? `<small>平均反應：${average} ms（只和自己比較）</small>` : ""}
    <div class="reaction-actions">
      ${phase === "waiting" || phase === "go"
        ? `<button class="button button--primary reaction-tap" type="button" data-reaction-tap>${phase === "go" ? "點！" : "先不要按"}</button>`
        : `<button class="button button--primary" type="button" data-reaction-start>開始一次</button>`}
    </div>
  </article>`;
}
