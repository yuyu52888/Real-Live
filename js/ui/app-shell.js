import { APP_ROUTES } from "../core/router.js";
import { renderHome } from "../pages/home.js";
import { renderPlaceholder } from "../pages/placeholder.js";
import { renderQuests } from "../pages/quests.js";
import { renderParentApprovals } from "../pages/parent-approvals.js";
import { renderLearn } from "../pages/learn.js";
import { renderHero } from "../pages/hero.js";
import { uiText } from "../services/ui-copy.js";
import { icon } from "./components.js";

export function mountAppShell(root, state, actions) {
  const page = state.route === "home"
    ? renderHome(state)
    : state.route === "quests" ? renderQuests(state)
      : state.route === "learn" ? renderLearn(state)
      : state.route === "hero" ? renderHero(state)
      : state.route === "parent" ? renderParentApprovals(state)
        : renderPlaceholder(state.route, state);
  root.innerHTML = `
    <div class="app-shell">
      <main class="page-content">${page}</main>
      <nav class="bottom-nav" aria-label="${uiText("accessibility.bottomNav")}">
        ${APP_ROUTES.map((route) => navItem(route, state.route)).join("")}
      </nav>
    </div>
  `;

  for (const target of root.querySelectorAll("[data-route]")) {
    target.addEventListener("click", (event) => {
      event.preventDefault();
      if (target.dataset.learnSurfaceLink) {
        actions.openLearnSurface(target.dataset.learnSurfaceLink);
      } else {
        actions.navigate(target.dataset.route);
      }
    });
  }

  bindButtons(root, "[data-open-quest]", (target) => actions.openQuest(target.dataset.openQuest));
  bindButtons(root, "[data-select-quest]", (target) => actions.selectQuest(target.dataset.selectQuest));
  bindButtons(root, "[data-quest-filter]", (target) => actions.filterQuests(target.dataset.questFilter));
  bindButtons(root, "[data-start-quest]", (target) => actions.startQuest(target.dataset.startQuest));
  bindButtons(root, "[data-complete-quest]", (target) => actions.completeQuest(target.dataset.completeQuest));
  bindButtons(root, "[data-adjust-quest]", (target) => actions.adjustQuest(target.dataset.adjustQuest, Number(target.dataset.delta)));
  bindButtons(root, "[data-toggle-quest-timer]", (target) => actions.toggleQuestTimer(target.dataset.toggleQuestTimer));
  bindButtons(root, "[data-approve-completion]", (target) => actions.approveCompletion(target.dataset.approveCompletion));
  bindButtons(root, "[data-match-card]", (target) => actions.selectMatchingCard(target.dataset.matchWordId, target.dataset.matchSide));
  bindButtons(root, "[data-learn-mode]", (target) => actions.selectLearnMode(target.dataset.learnMode));
  bindButtons(root, "[data-learn-answer]", (target) => actions.answerLearn(target.dataset.learnAnswer === "true"));
  bindButtons(root, "[data-learn-exit]", () => actions.exitLearn());
  bindButtons(root, "[data-speech-rate]", (target) => actions.changeSpeechRate(Number(target.dataset.speechRate)));
  bindButtons(root, "[data-speak]", (target) => actions.speakLearn(target.dataset.speak));
  bindButtons(root, "[data-learn-surface]", (target) => actions.openLearnSurface(target.dataset.learnSurface));
  bindButtons(root, "[data-story-chapter]", (target) => actions.selectStoryChapter(Number(target.dataset.storyChapter)));
  bindButtons(root, "[data-open-story]", (target) => actions.openStory(target.dataset.openStory));
  bindButtons(root, "[data-story-back]", () => actions.closeStory());
  bindButtons(root, "[data-complete-story]", (target) => actions.completeStory(target.dataset.completeStory));
  bindButtons(root, "[data-claim-level]", (target) => actions.claimLevelReward(Number(target.dataset.claimLevel), target.dataset.rewardOption));
  bindButtons(root, "[data-select-title]", (target) => actions.selectActiveTitle(target.dataset.selectTitle));
  bindButtons(root, "[data-open-chest]", (target) => actions.openChest(target.dataset.openChest));

  const spellingForm = root.querySelector("[data-spelling-form]");
  spellingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.submitSpelling(new FormData(spellingForm).get("spelling"));
  });

  const parentForm = root.querySelector("[data-parent-unlock]");
  parentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = parentForm.querySelector("#parent-error");
    const unlocked = await actions.unlockParent(new FormData(parentForm).get("pin"));
    if (!unlocked && error) {
      error.hidden = false;
      error.textContent = uiText("parent.wrongPin");
    }
  });
}

function bindButtons(root, selector, action) {
  for (const target of root.querySelectorAll(selector)) {
    target.addEventListener("click", () => action(target));
  }
}

function navItem(route, activeRoute) {
  const active = route.id === activeRoute;
  return `
    <button class="bottom-nav__item ${active ? "is-active" : ""}" type="button" data-route="${route.id}" aria-current="${active ? "page" : "false"}">
      <span class="bottom-nav__icon">${icon(route.icon)}</span>
      <span>${uiText(route.labelKey)}</span>
    </button>
  `;
}
