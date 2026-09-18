import { avatarImage, escapeHtml, expBar, foxImage, icon, logo } from "../ui/components.js";
import { uiList, uiText } from "../services/ui-copy.js";
import { completionDateKey, completionInstanceId } from "../services/quest-service.js";
import { renderHomeBossCard } from "./boss.js";

export function renderHome(state) {
  const { onboarding, player } = state;
  const fragments = state.rewardUi?.fragments ?? { current: 0, needed: 5 };
  const nickname = escapeHtml(onboarding.nickname);
  const avatar = onboarding.avatarVariant;
  const encouragement = escapeHtml(uiList("home.encouragementPool")[0] ?? "先開始一小步，比等到完美更有力量。");
  const today = todayQuestSummary(state);

  return `
    <section class="home-page" aria-labelledby="home-title">
      <div class="home-sky" aria-hidden="true"></div>
      <header class="home-header">
        <a class="home-brand" href="#home" data-route="home" aria-label="Real Life Quest 首頁">${logo()}</a>
        <div class="encouragement">
          <span>今日小提醒</span>
          <strong>${encouragement}</strong>
        </div>
      </header>

      <div class="identity-grid">
        <article class="paper-card player-card">
          <div class="player-card__avatar">${avatarImage(avatar, "portrait")}</div>
          <div>
            <span class="level-pill">${uiText("common.labels.level", { level: player.level })}</span>
            <h1 id="home-title">${nickname}</h1>
            <p>${escapeHtml(player.title)}</p>
          </div>
          <div class="player-card__exp">${expBar(player.exp.current, player.exp.target)}</div>
        </article>

        <div class="adventure-party" aria-label="你的冒險隊伍">
          ${avatarImage(avatar, "happy", "adventure-party__hero")}
          ${foxImage("happy", "adventure-party__fox")}
        </div>

        <div class="status-stack">
          <article class="status-chip">
            <span class="status-chip__icon status-chip__icon--fire">🔥</span>
            <span><strong>${uiText("common.labels.streak")}</strong><small>尚未開始</small></span>
          </article>
          <article class="status-chip">
            <span class="status-chip__icon status-chip__icon--chest">◇</span>
            <span><strong>${uiText("common.labels.chestFragments")}</strong><small>${fragments.current} / ${fragments.needed}</small></span>
          </article>
        </div>
      </div>

      <div class="wood-sign"><span>${uiText("home.title")}</span><small>選一條路，踏出第一步</small></div>

      <div class="quick-grid" aria-label="主要冒險入口">
        ${quickCard("quests", uiText("home.quickEntries.todayQuests"), "完成生活中的小挑戰", "📜", "green")}
        ${quickCard("learn", uiText("home.quickEntries.english"), "先複習到期單字，再認識今天的新單字", "ABC", "blue", "english")}
        ${quickCard("learn", uiText("home.quickEntries.stories"), "讀故事、想一想，再把想法帶回生活", "📖", "orange", "stories")}
      </div>

      <div class="dashboard-grid">
        ${renderHomeBossCard(state.bossUi?.homeBoss)}

        <article class="feature-card progress-card">
          <div class="feature-card__heading">
            <span class="check-mark">✓</span>
            <div><small>${uiText("home.todayQuestProgress")}</small><h2>${today.completed} / ${onboarding.settings.dailyTaskGoal}</h2></div>
          </div>
          <div class="home-quest-list">${today.tasks.map((task) => homeQuest(task, state)).join("")}</div>
          <button class="button button--primary" type="button" data-route="quests">看看任務頁 ${icon("arrow")}</button>
        </article>
      </div>

      <aside class="growth-banner">
        <span aria-hidden="true">🧭</span>
        <div><strong>今天也來升級自己！</strong><small>每一個小行動，都是冒險的一部分。</small></div>
      </aside>
    </section>
  `;
}

function todayQuestSummary(state) {
  const enabled = (state.questUi?.tasks ?? []).filter((task) => (
    (task.taskFamily !== "exercise" || state.onboarding.settings.exerciseEnabled) &&
    (task.taskFamily !== "chore" || state.onboarding.settings.choresEnabled)
  ));
  const tasks = enabled.slice(0, state.onboarding.settings.dailyTaskGoal);
  const completed = Math.min(
    state.onboarding.settings.dailyTaskGoal,
    state.questUi.history.filter((record) => record.dateKey === completionDateKey() && record.status === "completed").length,
  );
  return { tasks, completed };
}

function homeQuest(task, state) {
  const history = state.questUi.history.find((record) => record.id === completionInstanceId(task));
  const status = history?.status === "completed" ? "✓" : history?.status === "pending_approval" ? "⌛" : "→";
  return `<button type="button" data-open-quest="${task.id}"><span>${status}</span><strong>${escapeHtml(task.name)}</strong><small>${task.exp} EXP</small></button>`;
}

function quickCard(route, title, description, symbol, color, learnSurface) {
  return `
    <button class="quick-card quick-card--${color}" type="button" ${route ? `data-route="${route}"${learnSurface ? ` data-learn-surface-link="${learnSurface}"` : ""}` : "disabled"}>
      <span class="quick-card__symbol" aria-hidden="true">${symbol}</span>
      <span><strong>${title}</strong><small>${description}</small></span>
      <span class="quick-card__arrow">${icon("arrow")}</span>
    </button>
  `;
}
