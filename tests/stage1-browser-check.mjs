import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStaticServer } from "../tools/dev-server.mjs";

const browserPath = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find(existsSync);

if (!browserPath) {
  throw new Error("找不到 Chrome、Chromium 或 Edge；可用 CHROME_PATH 指定瀏覽器。");
}

const server = createStaticServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const appPort = server.address().port;
const debugPort = await reservePort();
const profile = await mkdtemp(join(tmpdir(), "rlq-stage1-"));
const browser = spawn(browserPath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

try {
  await waitForDevTools(browser);
  const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?about%3Ablank`, { method: "PUT" });
  const target = await targetResponse.json();
  const client = await createClient(target.webSocketDebuggerUrl);
  const pageErrors = [];

  client.onEvent((message) => {
    if (message.method === "Runtime.exceptionThrown") {
      pageErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      pageErrors.push("console.error was called");
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      pageErrors.push(message.params.entry.text);
    }
  });

  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("Log.enable")]);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `http://127.0.0.1:${appPort}` });
  await waitFor(() => client.evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-start]'))"));

  await client.evaluate(`document.querySelector('[data-start]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-avatar="girl"]'))`));
  await client.evaluate(`document.querySelector('[data-avatar="girl"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelector('[data-avatar="girl"]').getAttribute('aria-checked') === 'true' && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`document.querySelector('[data-avatar="girl"]')?.getAttribute('aria-checked') === 'true'`));
  await client.evaluate(`document.querySelector('form').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#nickname'))`));
  await client.evaluate(`document.querySelector('#nickname').value = '小晴'; document.querySelector('form').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#parent-pin'))`));
  await client.evaluate(`document.querySelector('#parent-pin').value = '0123'; document.querySelector('form').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#daily-goal'))`));
  await client.evaluate(`document.querySelector('#daily-goal').value = '3'; document.querySelector('form').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  const homeResult = await client.evaluate(`(() => {
    const selectedGirl = 'true';
    const homeName = document.querySelector('#home-title')?.textContent;
    const navCount = document.querySelectorAll('.bottom-nav__item').length;
    const homeAvatar = document.querySelector('.adventure-party__hero')?.getAttribute('src');
    return {
      selectedGirl,
      homeName,
      navCount,
      homeAvatar,
      goal: document.querySelector('.progress-card h2').textContent,
    };
  })()`);

  await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getPlayer, savePlayer } = await import('/js/repositories/player.js');
    const db = await openDatabase();
    const player = await getPlayer(db);
    await savePlayer(db, { ...player, progress: { ...player.progress, level: 1, exp: { ...player.progress.exp, current: 30, target: 100 } } });
    db.close();
  })()`);
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  const rewardHome = await client.evaluate(`({
    level: document.querySelector('.level-pill')?.textContent,
    exp: document.querySelector('.exp-caption')?.textContent,
    fragments: document.querySelector('.status-chip__icon--chest')?.nextElementSibling?.querySelector('small')?.textContent,
  })`);
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="hero"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.hero-page [data-claim-level="2"]'))`));
  const rewardHero = await client.evaluate(`({
    name: document.querySelector('#hero-title')?.textContent,
    pendingLevel2: document.querySelectorAll('[data-claim-level="2"]').length,
    exp: document.querySelector('.hero-profile small')?.textContent,
  })`);
  await client.evaluate(`document.querySelector('[data-claim-level="2"][data-reward-option="frame_bronze"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelector('.hero-page')?.textContent?.includes('青銅冒險框') && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="hero"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelector('.hero-page')?.textContent?.includes('青銅冒險框')`));
  const claimPersisted = await client.evaluate(`document.querySelectorAll('[data-claim-level="2"]').length === 0`);
  const chestId = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { loadRewardSystem } = await import('/js/services/reward-system.js');
    const { grantChestFragments } = await import('/js/services/reward-service.js');
    const db = await openDatabase();
    const system = await loadRewardSystem('/03_REWARDS_BOSSES/REWARD_SYSTEM.json');
    const grant = await grantChestFragments(db, system, { sourceType: 'browser-test', sourceId: 'one', amount: 5, rng: () => 0 });
    db.close();
    return grant.chestIds[0];
  })()`);
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  const realFragmentText = await client.evaluate(`document.querySelector('.status-chip__icon--chest')?.nextElementSibling?.querySelector('small')?.textContent`);
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="hero"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-open-chest]'))`));
  await client.evaluate(`document.querySelector('[data-open-chest]').click()`);
  await waitFor(() => client.evaluate(`!document.querySelector('[data-open-chest]') && !document.querySelector('#app').hasAttribute('aria-busy')`));
  const chestRepeat = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getRewardRecord } = await import('/js/repositories/rewards.js');
    const { loadRewardSystem } = await import('/js/services/reward-system.js');
    const { openChest } = await import('/js/services/reward-service.js');
    const db = await openDatabase();
    const system = await loadRewardSystem('/03_REWARDS_BOSSES/REWARD_SYSTEM.json');
    const before = await getRewardRecord(db, ${JSON.stringify("PLACEHOLDER")});
    const first = await openChest(db, system, ${JSON.stringify("PLACEHOLDER")});
    const second = await openChest(db, system, ${JSON.stringify("PLACEHOLDER")});
    const inventory = first.inventoryId ? await getRewardRecord(db, first.inventoryId) : null;
    db.close();
    return { sameOpenedAt: first.openedAt === second.openedAt, quantity: inventory?.quantity ?? 0, outcome: before?.outcome?.id };
  })()`.replaceAll(JSON.stringify("PLACEHOLDER"), JSON.stringify(chestId)));
  if (!rewardHome.level?.includes('2') || !rewardHome.exp?.includes('30 / 65') || rewardHome.fragments !== '0 / 5') throw new Error(`Stage 6 Home normalization failed: ${JSON.stringify(rewardHome)}`);
  if (rewardHero.name !== '小晴' || rewardHero.pendingLevel2 !== 3 || !rewardHero.exp?.includes('30 / 65') || !claimPersisted) throw new Error(`Stage 6 Hero claim failed: ${JSON.stringify({ rewardHero, claimPersisted })}`);
  if (realFragmentText !== '0 / 5' || !chestRepeat.sameOpenedAt || chestRepeat.quantity !== 1 || !chestRepeat.outcome) throw new Error(`Stage 6 chest failed: ${JSON.stringify({ realFragmentText, chestRepeat })}`);
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="home"]').click()`);
  await client.evaluate(`document.querySelector('[data-learn-surface-link="stories"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelectorAll('.story-card').length === 5`));
  const storyOverview = await client.evaluate(`({
    activeRoute: document.querySelector('.bottom-nav__item.is-active')?.dataset.route,
    chapterCount: document.querySelectorAll('[data-story-chapter]').length,
    cardCount: document.querySelectorAll('.story-card').length,
    cover: document.querySelector('.story-card img')?.getAttribute('src'),
  })`);
  await client.evaluate(`document.querySelector('[data-open-story="S01"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.story-reader'))`));
  const storyReader = await client.evaluate(`(async () => {
    const canonical = (await (await fetch('/02_DATA/thinking_stories_30.json')).json()).find(({ id }) => id === 'S01');
    const renderedBody = [...document.querySelectorAll('.story-body p')].map((node) => node.textContent).join('\\n');
    return {
      fullBody: renderedBody === canonical.body.split(/\\n+/).filter(Boolean).join('\\n'),
      questionCount: document.querySelectorAll('.reflection-card li').length,
      realityTask: document.querySelector('.reality-card h2')?.textContent === canonical.realityTask,
      takeaway: document.querySelector('.thought-card p')?.textContent === canonical.takeaway,
      hasScoring: Boolean(document.querySelector('[data-answer], [data-score], [data-correct]')),
    };
  })()`);
  await client.evaluate(`document.querySelector('[data-complete-story="S01"]').click()`);
  await waitFor(() => client.evaluate(`(() => { const failure = document.querySelector('#page-error')?.textContent; if (failure) throw new Error(failure); return document.querySelector('.story-reader-progress')?.textContent?.includes('本章進度 1 / 5') && !document.querySelector('#app').hasAttribute('aria-busy'); })()`));
  await client.evaluate(`document.querySelector('[data-story-back]').click()`);
  await waitFor(() => client.evaluate(`document.querySelector('.story-chapter-progress strong')?.textContent?.trim() === '1 / 5'`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  await client.evaluate(`document.querySelector('[data-learn-surface-link="stories"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelector('.story-chapter-progress strong')?.textContent?.trim() === '1 / 5'`));
  await client.evaluate(`document.querySelector('[data-open-story="S01"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.story-completed-note'))`));
  await client.evaluate(`document.querySelector('[data-complete-story="S01"]').click()`);
  await waitFor(() => client.evaluate(`!document.querySelector('#app').hasAttribute('aria-busy')`));
  const storyRecordCount = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { listStoryProgress } = await import('/js/repositories/story-progress.js');
    const db = await openDatabase();
    const count = (await listStoryProgress(db)).filter(({ storyId }) => storyId === 'S01').length;
    db.close();
    return count;
  })()`);
  if (storyOverview.activeRoute !== 'learn' || storyOverview.chapterCount !== 6 || storyOverview.cardCount !== 5 || !storyOverview.cover?.includes('story_s01_cover.png')) throw new Error(`Stage 5 overview failed: ${JSON.stringify(storyOverview)}`);
  if (!storyReader.fullBody || storyReader.questionCount !== 4 || !storyReader.realityTask || !storyReader.takeaway || storyReader.hasScoring) throw new Error(`Stage 5 reader failed: ${JSON.stringify(storyReader)}`);
  if (storyRecordCount !== 1) throw new Error(`Stage 5 reread paid twice: ${storyRecordCount} records`);
  await client.evaluate(`document.querySelector('[data-learn-surface="english"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.learn-page'))`));
  const learnResult = await client.evaluate(`({
    activeRoute: document.querySelector('.bottom-nav__item.is-active')?.dataset.route,
    total: document.querySelector('.learn-progress strong')?.textContent?.trim(),
    modeCount: document.querySelectorAll('[data-learn-mode]').length,
    speechRate: document.querySelector('[data-speech-rate].is-active')?.dataset.speechRate,
  })`);
  await client.evaluate(`document.querySelector('[data-learn-mode="meaning"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.word-card [data-learn-answer="true"]'))`));
  await client.evaluate(`document.querySelector('.word-card [data-learn-answer="true"]').click()`);
  await waitFor(() => client.evaluate(`!document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.evaluate(`document.querySelector('[data-learn-exit]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.learn-mode-grid')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  if (learnResult.activeRoute !== "learn" || learnResult.total !== "0 / 300" || learnResult.modeCount !== 5 || learnResult.speechRate !== "0.75") {
    throw new Error(`Stage 4 Learn UI failed: ${JSON.stringify(learnResult)}`);
  }

  await client.evaluate(`document.querySelector('[data-learn-mode="matching"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelectorAll('[data-match-card]').length >= 2`));
  const matchingStart = await client.evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-match-card]')];
    const first = cards.find((card) => card.dataset.matchSide === 'en');
    return { allHidden: cards.every((card) => card.querySelector('span')?.textContent === '?'), wordId: first?.dataset.matchWordId };
  })()`);
  if (!matchingStart.allHidden || !matchingStart.wordId) throw new Error("Matching cards exposed answers before interaction");
  const matchingWordId = JSON.stringify(matchingStart.wordId);
  await client.evaluate(`[...document.querySelectorAll('[data-match-card]')].find((card) => card.dataset.matchWordId === ${matchingWordId} && card.dataset.matchSide === 'en').click()`);
  await waitFor(() => client.evaluate(`[...document.querySelectorAll('[data-match-card]')].find((card) => card.dataset.matchWordId === ${matchingWordId} && card.dataset.matchSide === 'en')?.querySelector('span')?.textContent !== '?'`));
  await client.evaluate(`[...document.querySelectorAll('[data-match-card]')].find((card) => card.dataset.matchWordId === ${matchingWordId} && card.dataset.matchSide === 'zh').click()`);
  await waitFor(() => client.evaluate(`[...document.querySelectorAll('[data-match-card]')].filter((card) => card.dataset.matchWordId === ${matchingWordId} && card.classList.contains('is-resolved')).length === 2 && !document.querySelector('#app').hasAttribute('aria-busy')`));
  const matchingCount = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getWordProgress } = await import('/js/repositories/vocabulary.js');
    const db = await openDatabase();
    const progress = await getWordProgress(db, ${matchingWordId});
    db.close();
    return progress?.correctCount;
  })()`);
  await client.evaluate(`[...document.querySelectorAll('[data-match-card]')].find((card) => card.dataset.matchWordId === ${matchingWordId} && card.dataset.matchSide === 'en').click()`);
  const matchingCountAfterRepeat = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getWordProgress } = await import('/js/repositories/vocabulary.js');
    const db = await openDatabase();
    const progress = await getWordProgress(db, ${matchingWordId});
    db.close();
    return progress?.correctCount;
  })()`);
  if (matchingCount !== 1 || matchingCountAfterRepeat !== 1) throw new Error("Resolved matching pair updated progress more than once");
  await client.evaluate(`document.querySelector('[data-learn-exit]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.learn-mode-grid')) && !document.querySelector('#app').hasAttribute('aria-busy')`));

  const spellingWord = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getVocabularyWord, saveWordProgress } = await import('/js/repositories/vocabulary.js');
    const db = await openDatabase();
    const word = await getVocabularyWord(db, 'core300-zhTW:W050');
    await saveWordProgress(db, {
      wordId: word.wordId, state: 'practiced', correctCount: 3, wrongCount: 0, streak: 3,
      lastSeenAt: '2026-09-01T08:00:00.000Z', lastReviewAt: '2026-09-01T08:00:00.000Z',
      nextReviewAt: '2000-01-01T00:00:00.000Z', spellingUnlocked: true,
    });
    db.close();
    return { wordId: word.wordId, word: word.word };
  })()`);
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="learn"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-learn-mode="spelling"]:not(:disabled)'))`));
  await client.evaluate(`document.querySelector('[data-learn-mode="spelling"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-spelling-form]'))`));
  const spellingBefore = await client.evaluate(`({
    text: document.querySelector('.word-card')?.textContent?.toLocaleLowerCase('en-US'),
    hasPronounce: Boolean(document.querySelector('[data-speak="word"]')),
  })`);
  if (spellingBefore.text.includes(spellingWord.word.toLocaleLowerCase('en-US')) || !spellingBefore.hasPronounce) {
    throw new Error("Spelling challenge exposed the answer or removed pronunciation");
  }
  await client.evaluate(`document.querySelector('[data-speak="word"]').click(); document.querySelector('#spelling-input').value='not-the-answer'; document.querySelector('[data-spelling-form]').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.learn-done')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  let spellingProgress = await readWordProgress(client, spellingWord.wordId);
  if (spellingProgress.state !== "practiced" || spellingProgress.wrongCount !== 1 || spellingProgress.correctCount !== 3) throw new Error("Incorrect spelling result was not persisted correctly");

  await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getWordProgress, saveWordProgress } = await import('/js/repositories/vocabulary.js');
    const db = await openDatabase();
    const progress = await getWordProgress(db, 'core300-zhTW:W050');
    await saveWordProgress(db, { ...progress, nextReviewAt: '2000-01-01T00:00:00.000Z' });
    db.close();
  })()`);
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="learn"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-learn-mode="spelling"]:not(:disabled)'))`));
  await client.evaluate(`document.querySelector('[data-learn-mode="spelling"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-spelling-form]'))`));
  await client.evaluate(`document.querySelector('#spelling-input').value=${JSON.stringify(spellingWord.word)}; document.querySelector('[data-spelling-form]').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.learn-done')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  spellingProgress = await readWordProgress(client, spellingWord.wordId);
  if (spellingProgress.state !== "mastered" || spellingProgress.wrongCount !== 1 || spellingProgress.correctCount !== 4) throw new Error("Correct spelling result was not persisted correctly");

  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="quests"]').click()`);
  await waitFor(() => client.evaluate(`document.querySelectorAll('.quest-card').length === 180`));
  const questResult = await client.evaluate(`(() => {
    document.querySelector('[data-quest-filter="exercise"]').click();
    return {
      filterCount: document.querySelectorAll('.quest-filter').length,
      questActiveRoute: document.querySelector('.bottom-nav__item.is-active')?.dataset.route,
    };
  })()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-select-quest="EX001"]'))`));
  await client.evaluate(`document.querySelector('[data-select-quest="EX001"]').click()`);
  const exerciseResult = await client.evaluate(`({
    tipCount: document.querySelectorAll('.quest-tips li').length,
    hasSafety: Boolean(document.querySelector('.safety-notice')),
    artSource: document.querySelector('.quest-detail__art img')?.getAttribute('src'),
  })`);
  await client.evaluate(`document.querySelector('.quest-detail [data-start-quest="EX001"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.quest-detail [data-complete-quest="EX001"]')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#home-title'))`));
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="quests"]').click(); document.querySelector('[data-quest-filter="exercise"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-select-quest="EX001"]'))`));
  await client.evaluate(`document.querySelector('[data-select-quest="EX001"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.quest-detail [data-complete-quest="EX001"]'))`));
  await client.evaluate(`document.querySelector('.quest-detail [data-complete-quest="EX001"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.pending-message')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="parent"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#parent-unlock-pin'))`));
  await client.evaluate(`document.querySelector('#parent-unlock-pin').value='0123'; document.querySelector('[data-parent-unlock]').requestSubmit()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-approve-completion]'))`));
  const parentTabs = await client.evaluate(`document.querySelectorAll('[data-parent-tab]').length`);
  if (parentTabs !== 3) throw new Error(`Stage 8 Parent tabs: expected 3, received ${parentTabs}`);
  await client.evaluate(`document.querySelector('[data-parent-tab="report"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#weekly-report-title'))`));
  await client.evaluate(`document.querySelector('[data-parent-tab="settings"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-parent-settings]'))`));
  await client.evaluate(`document.querySelector('[data-parent-tab="approvals"]').click()`);
  await client.evaluate(`document.querySelector('[data-approve-completion]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.parent-empty')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.evaluate(`document.querySelector('.bottom-nav__item[data-route="home"]').click(); document.querySelector('.bottom-nav__item[data-route="parent"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('#parent-unlock-pin'))`));
  const parentRelocked = await client.evaluate(`!document.querySelector('[data-parent-tab]')`);
  if (!parentRelocked) throw new Error("Stage 8 Parent page did not relock after leaving");
  await client.evaluate(`(async () => {
    const { openDatabase, putRecord } = await import('/js/core/database.js');
    const db = await openDatabase();
    for (let index = 1; index <= 5; index += 1) await putRecord(db, 'storyProgress', { storyId: 'S0' + index, completedAt: new Date().toISOString() });
    db.close();
  })()`);
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-open-boss="B01"]'))`));
  const bossHomeArt = await client.evaluate(`document.querySelector('.boss-card__preview img')?.getAttribute('src')`);
  await client.evaluate(`document.querySelector('[data-open-boss="B01"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.boss-page [data-complete-boss-step="1"]'))`));
  const bossDetailArt = await client.evaluate(`document.querySelector('.boss-art img')?.getAttribute('src')`);
  await client.evaluate(`document.querySelector('[data-complete-boss-step="1"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-complete-boss-step="2"]')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-open-boss="B01"]'))`));
  await client.evaluate(`document.querySelector('[data-open-boss="B01"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-complete-boss-step="2"]'))`));
  await client.evaluate(`document.querySelector('[data-complete-boss-step="2"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('[data-complete-boss-step="3"]')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  await client.evaluate(`document.querySelector('[data-complete-boss-step="3"]').click()`);
  await waitFor(() => client.evaluate(`Boolean(document.querySelector('.boss-victory [data-open-boss-chest]')) && !document.querySelector('#app').hasAttribute('aria-busy')`));
  const bossVictory = await client.evaluate(`({
    text: document.querySelector('.boss-victory')?.textContent,
    hearts: document.querySelector('.boss-hp > span')?.textContent,
    navCount: document.querySelectorAll('.bottom-nav__item').length,
  })`);
  await client.evaluate(`document.querySelector('[data-open-boss-chest]').click()`);
  await waitFor(() => client.evaluate(`document.querySelector('.boss-victory')?.textContent?.includes('章節寶箱已開啟') && !document.querySelector('#app').hasAttribute('aria-busy')`));
  const stage7Browser = { bossHomeArt, bossDetailArt, ...bossVictory };


  if (process.env.STAGE1_SCREENSHOT) {
    const screenshot = await client.send("Page.captureScreenshot", { format: "png" });
    await writeFile(process.env.STAGE1_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }

  const heroResult = await client.evaluate(`(() => {
    document.querySelector('.bottom-nav__item[data-route="hero"]').click();
    return {
      heroName: document.querySelector('#hero-title')?.textContent,
      activeRoute: document.querySelector('.bottom-nav__item.is-active')?.dataset.route,
    };
  })()`);
  const result = { ...homeResult, ...heroResult, ...questResult, ...exerciseResult, ...stage7Browser };

  const failures = [
    result.selectedGirl !== "true" && "女主角未被標記為選取",
    result.homeName !== "小晴" && "暱稱未到達首頁",
    result.navCount !== 5 && "底部導覽不是 5 項",
    !result.homeAvatar?.includes("girl_happy.png") && "首頁未使用所選女主角資產",
    result.heroName !== "小晴" && "角色頁未保留暱稱",
    result.activeRoute !== "hero" && "角色導覽未成功",
    result.goal !== "0 / 3" && "Settings did not survive reload",
    result.filterCount !== 7 && "Quest filters are incomplete",
    result.questActiveRoute !== "quests" && "Quest navigation did not activate",
    result.tipCount !== 3 && "Exercise detail does not expose 3 tips",
    !result.hasSafety && "Exercise detail safety is missing",
    !result.artSource?.includes("exercise_ex001_jump_rope_01.png") && "A6 exercise production art was not used",
    ...pageErrors,
    !result.bossHomeArt?.includes("boss_b01_") && "Stage 7 Home did not use A6 Boss production art",
    !result.bossDetailArt?.includes("boss_b01_") && "Stage 7 detail did not use A6 Boss production art",
    !result.text?.includes("挑戰成功") && "Stage 7 Boss victory did not render",
    result.hearts !== "0 / 3" && "Stage 7 Boss HP did not persist across reload",
  ].filter(Boolean);

  if (failures.length) {
    throw new Error(`Stage 1 browser self-test failed:\n${failures.join("\n")}`);
  }
  const persistence = await client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getSettings } = await import('/js/repositories/settings.js');
    const db = await openDatabase();
    const settings = await getSettings(db);
    db.close();
    if (!settings.pinCredential?.hash || JSON.stringify(settings).includes('0123')) throw new Error('PIN was not protected');
    const { testPersistence } = await import('/tests/persistence-browser.js');
    return testPersistence();
  })()`);
  const stage3Persistence = await client.evaluate(`(async () => {
    const { testStage3Persistence } = await import('/tests/stage3-persistence-browser.js');
    return testStage3Persistence();
  })()`);
  const a7Stage3Persistence = await client.evaluate(`(async () => {
    const { testA7Stage3Persistence } = await import('/tests/a7-stage3-persistence-browser.js');
    return testA7Stage3Persistence();
  })()`);
  const stage4Persistence = await client.evaluate(`(async () => {
    const { testStage4Persistence } = await import('/tests/stage4-persistence-browser.js');
    return testStage4Persistence();
  })()`);
  const stage5Persistence = await client.evaluate(`(async () => {
    const { testStage5Persistence } = await import('/tests/stage5-persistence-browser.js');
    return testStage5Persistence();
  })()`);
  const stage6Persistence = await client.evaluate(`(async () => {
    const { testStage6Persistence } = await import('/tests/stage6-persistence-browser.js');
    return testStage6Persistence();
  })()`);
  console.log("Browser PASS: tablet portrait onboarding, quest list/detail, reload, pending approval, PIN approval, A6 production art, navigation.");
  console.log(persistence);
  const stage7Persistence = await client.evaluate(`(async () => {
    const { testStage7Persistence } = await import('/tests/stage7-persistence-browser.js');
    return testStage7Persistence();
  })()`);
  console.log(stage3Persistence);
  const stage8Persistence = await client.evaluate(`(async () => {
    const { testStage8Persistence } = await import('/tests/stage8-persistence-browser.js');
    return testStage8Persistence();
  })()`);
  console.log(a7Stage3Persistence);
  console.log(stage4Persistence);
  console.log(stage5Persistence);
  console.log(stage6Persistence);
  console.log(stage7Persistence);
  console.log(stage8Persistence);
  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
  client.close();
} finally {
  const browserExited = browser.exitCode === null
    ? new Promise((resolve) => browser.once("exit", resolve))
    : Promise.resolve();
  browser.kill();
  await browserExited;
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function reservePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function waitForDevTools(process) {
  let output = "";
  await Promise.race([
    new Promise((resolve, reject) => {
      process.stderr.on("data", (chunk) => {
        output += chunk;
        if (output.includes("DevTools listening on")) resolve();
      });
      process.once("exit", (code) => reject(new Error(`瀏覽器過早結束：${code}`)));
    }),
    delay(10_000).then(() => { throw new Error("瀏覽器啟動逾時"); }),
  ]);
}

async function createClient(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const listeners = new Set();
  let id = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
      return;
    }
    for (const listener of listeners) listener(message);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    async evaluate(expression) {
      const response = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
      return response.result.value;
    },
    onEvent(listener) { listeners.add(listener); },
    close() { socket.close(); },
  };
}

async function waitFor(check) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error("頁面載入逾時");
}

async function readWordProgress(client, wordId) {
  return client.evaluate(`(async () => {
    const { openDatabase } = await import('/js/core/database.js');
    const { getWordProgress } = await import('/js/repositories/vocabulary.js');
    const db = await openDatabase();
    const progress = await getWordProgress(db, ${JSON.stringify(wordId)});
    db.close();
    return progress;
  })()`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
