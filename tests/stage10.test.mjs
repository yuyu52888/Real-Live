import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderHero } from "../js/pages/hero.js";
import { buildNarrationSegments } from "../js/services/story-narration.js";
import { answerMiniGameQuestion, createMiniGameSession, currentMiniGameQuestion, MINI_GAMES } from "../js/services/mini-games.js";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 10 visual layer is loaded last and preserved for offline use", async () => {
  const [index, sw] = await Promise.all([readText("index.html"), readText("service-worker.js")]);
  const parentIndex = index.indexOf("./css/parent.css");
  const stage10Index = index.indexOf("./css/stage10.css");
  assert.ok(parentIndex >= 0 && stage10Index > parentIndex, "Stage 10 CSS must load after functional page CSS");
  assert.match(sw, /CACHE_VERSION = "stage10-v\d+"/);
  assert.match(sw, /"\.\/css\/stage10\.css"/);
  assert.match(sw, /bg_home_adventure_camp\.png/);
});

test("Stage 10 keeps tablet-first touch and responsive layout guarantees", async () => {
  const css = await readText("css/stage10.css");
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /\.bottom-nav__item/);
  assert.match(css, /\.home-page[\s\S]*bg_home_adventure_camp\.png/);
  assert.match(css, /\.quest-browser/);
  assert.match(css, /\.learn-switcher/);
  assert.match(css, /\.story-reader/);
  assert.match(css, /\.boss-stage/);
  assert.match(css, /\.hero-profile/);
  assert.match(css, /\.parent-tabs/);
  assert.match(css, /@media \(max-width: 56rem\)/);
  assert.match(css, /@media \(max-width: 42rem\)/);
  assert.doesNotMatch(css, /animation:\s*[^;]*(?:infinite|linear infinite)/i);
});

test("Stage 10 visual refinement does not replace the five-route information architecture", async () => {
  const [shell, router] = await Promise.all([readText("js/ui/app-shell.js"), readText("js/core/router.js")]);
  assert.match(shell, /APP_ROUTES\.map/);
  assert.match(router, /home/);
  assert.match(router, /quests/);
  assert.match(router, /learn/);
  assert.match(router, /hero/);
  assert.match(router, /parent/);
  assert.doesNotMatch(shell, /data-route="rewards"/);
});

test("Stage 10 uses production art rather than flattened reference screenshots", async () => {
  const css = await readText("css/stage10.css");
  assert.match(css, /\.\.\/assets\/backgrounds\/bg_home_adventure_camp\.png/);
  assert.doesNotMatch(css, /04_UI_REFERENCES/);
});


test("Stage 10 Hero shows all five canonical abilities without inventing new stats", () => {
  const html = renderHero({
    onboarding: { avatarVariant: "girl", nickname: "小冒險家" },
    player: { level: 2, title: "新手冒險家", exp: { current: 35, target: 65 } },
    questUi: {
      tasks: [
        { id: "A", ability: "learning", abilityExp: 2 },
        { id: "B", ability: "persistence", abilityExp: 1 },
      ],
      history: [
        { questId: "A", status: "completed" },
        { questId: "B", status: "completed" },
        { questId: "A", status: "in_progress" },
      ],
    },
    rewardUi: {
      loading: false,
      player: { level: 2, title: "新手冒險家", exp: { current: 35, target: 65 } },
      fragments: { current: 1, needed: 5 },
      pendingClaims: [], titles: [], badges: [], cosmetics: [], tickets: [], privileges: [], chests: [],
    },
  });
  for (const label of ["專注力", "學習力", "耐心力", "生活力", "合作力"]) assert.match(html, new RegExp(label));
  assert.match(html, /學習力[\s\S]*累積 \+2/);
  assert.match(html, /耐心力[\s\S]*累積 \+1/);
  assert.doesNotMatch(html, /勇氣力|思考力|戰鬥力/);
});


test("Stage 10 Quest board uses illustrated tablet layout without cropping task art", async () => {
  const [page, css] = await Promise.all([
    readText("js/pages/quests.js"),
    readText("css/stage10.css"),
  ]);
  assert.match(page, /quest-hero-banner/);
  assert.match(page, /quest-card__thumb/);
  assert.match(page, /quest-summary-strip/);
  assert.match(css, /\.quest-detail__art > img[\s\S]*object-fit:\s*contain\s*!important/);
  assert.match(css, /\.quest-card__thumb img[\s\S]*object-fit:\s*contain/);
  assert.match(css, /\.quest-browser[\s\S]*grid-template-columns/);
  assert.match(css, /\.quest-hero-title[\s\S]*repeating-linear-gradient/);
});


test("Stage 10 general exercise/life quests receive non-cropped category art and story links", async () => {
  const [page, css] = await Promise.all([readText("js/pages/quests.js"), readText("css/stage10.css")]);
  assert.match(page, /category === "exercise"/);
  assert.match(page, /avatarImage\(avatarVariant, "exercise"\)/);
  assert.match(page, /category === "life"/);
  assert.match(page, /avatarImage\(avatarVariant, "chore"\)/);
  assert.match(page, /data-learn-surface="stories"/);
  assert.match(css, /\.quest-detail__art > img[\s\S]*width:\s*86%\s*!important/);
});

test("Stage 10 story narration splits dialogue and assigns multiple roles", () => {
  const segments = buildNarrationSegments("媽媽說：「你好。」\n\n小安問：「真的嗎？」\n\n旁白繼續。");
  assert.ok(segments.length >= 5);
  assert.ok(segments.some(({ role }) => role === "adultFemale"));
  assert.ok(segments.some(({ role }) => role === "childA" || role === "childB"));
  assert.ok(segments.some(({ role }) => role === "narrator"));
});

test("Stage 10 mini games provide four educational designs and deterministic learning feedback", () => {
  assert.equal(MINI_GAMES.length, 4);
  for (const game of MINI_GAMES) {
    assert.ok(game.reason.length > 10);
    assert.ok(game.learn.length > 5);
    assert.ok(game.abilities.length >= 1);
  }
  let session = createMiniGameSession("pattern-scout");
  const question = currentMiniGameQuestion(session);
  session = answerMiniGameQuestion(session, question.answer);
  assert.equal(session.score, 1);
  assert.match(session.feedback, /答對了/);
});

test("Stage 10 Hero exposes a condition-based reward exchange surface", () => {
  const html = renderHero({
    onboarding: { avatarVariant: "boy", nickname: "冒險家" },
    player: { level: 3, title: "新手冒險家", exp: { current: 65, target: 105 } },
    questUi: { tasks: [], history: [] },
    rewardUi: {
      loading: false,
      surface: "exchange",
      player: { level: 3, title: "新手冒險家", exp: { current: 65, target: 105 } },
      fragments: { current: 2, needed: 5 },
      pendingClaims: [], titles: [], badges: [], cosmetics: [], tickets: [], privileges: [], chests: [],
      exchangeCatalog: [{
        level: 3, unlocked: true, claimed: false,
        options: [{ id: "hat", name: "探索帽", type: "cosmetic", available: true }],
      }],
      exchangeConditions: { titles: [{ id: "t", name: "任務新手", condition: "完成10個任務", owned: false }], badges: [] },
    },
  });
  assert.match(html, /冒險獎勵兌換所/);
  assert.match(html, /data-claim-level="3"/);
  assert.match(html, /完成10個任務/);
});
