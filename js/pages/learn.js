import { uiText } from "../services/ui-copy.js";
import { SPEECH_DEFAULTS } from "../services/speech.js";
import { escapeHtml, icon } from "../ui/components.js";

export const LEARN_MODES = Object.freeze([
  { id: "meaning", labelKey: "learn.newWords", title: "中文找英文", symbol: "中 / EN" },
  { id: "image", labelKey: "learn.imageChoose", title: "英文找圖片", symbol: "▧" },
  { id: "listening", labelKey: "learn.listenFind", title: "聽音找字", symbol: "♪" },
  { id: "matching", labelKey: "learn.memoryMatch", title: "記憶翻牌", symbol: "▦" },
  { id: "spelling", labelKey: "learn.spelling", title: "拼字挑戰", symbol: "Aa" },
]);

export function renderLearn(state) {
  const ui = state.learnUi;
  if (!ui || ui.loading) return loadingView();
  if (ui.sessionDone) return doneView(ui);
  if (ui.active) return sessionView(ui);
  return overview(ui);
}

function overview(ui) {
  const percentage = ui.totalWords ? Math.round((ui.masteredWords / ui.totalWords) * 100) : 0;
  return `
    <section class="learn-page" aria-labelledby="learn-title">
      <header class="learn-hero">
        <div>
          <p class="eyebrow">ENGLISH ADVENTURE</p>
          <h1 id="learn-title">${uiText("learn.englishTitle")}</h1>
          <p>${uiText("learn.dueFirst")}</p>
        </div>
        <div class="learn-progress" aria-label="已掌握 ${ui.masteredWords} / ${ui.totalWords}">
          <strong>${ui.masteredWords} / ${ui.totalWords}</strong><span>已掌握</span>
          <div><i style="width:${percentage}%"></i></div>
        </div>
      </header>
      <div class="learn-today">
        <article><span>↻</span><strong>${ui.dueCount}</strong><small>${uiText("learn.reviews")}</small></article>
        <article><span>＋</span><strong>${ui.newCount}</strong><small>${uiText("learn.newWords")}</small></article>
      </div>
      ${ui.dueCount === 0 ? `<p class="learn-notice">${uiText("learn.noDueReview")}</p>` : ""}
      <div class="learn-mode-grid" aria-label="英文學習模式">
        ${LEARN_MODES.map((mode) => modeButton(mode, ui)).join("")}
      </div>
      <section class="speech-panel" aria-labelledby="speech-rate-title">
        <div><strong id="speech-rate-title">${uiText("learn.speechRate")}</strong><small>單字、例句與聽力共用設定</small></div>
        <div class="speech-rates">${SPEECH_DEFAULTS.quickRates.map((rate) => rateButton(rate, ui.speechRate)).join("")}</div>
      </section>
    </section>
  `;
}

function modeButton(mode, ui) {
  const spellingReady = ui.plan.items.some(({ word, progress }) => word.spellingRequired && progress?.spellingUnlocked);
  const disabled = ui.plan.items.length === 0 || (mode.id === "spelling" && !spellingReady);
  return `<button class="learn-mode" type="button" data-learn-mode="${mode.id}" ${disabled ? "disabled" : ""}>
    <span>${mode.symbol}</span><strong>${escapeHtml(mode.title)}</strong><small>${uiText(mode.labelKey)}</small>
  </button>`;
}

function sessionView(ui) {
  const mode = LEARN_MODES.find(({ id }) => id === ui.mode) ?? LEARN_MODES[0];
  if (ui.mode === "matching") return matchingSessionView(ui, mode);
  const item = ui.sessionItems[ui.sessionIndex];
  if (!item) return doneView(ui);
  const { word } = item;
  const choices = makeChoices(ui.sessionItems, ui.sessionIndex);
  return `
    <section class="learn-page learn-session" aria-labelledby="learn-session-title">
      <header class="learn-session__header">
        <button class="learn-back" type="button" data-learn-exit aria-label="返回英文學習總覽">←</button>
        <div><p class="eyebrow">${escapeHtml(mode.title)}</p><h1 id="learn-session-title">${ui.sessionIndex + 1} / ${ui.sessionItems.length}</h1></div>
        <span class="learn-kind">${item.type === "review" ? uiText("learn.reviews") : uiText("learn.newWords")}</span>
      </header>
      <article class="word-card">
        ${cueView(word, ui.mode)}
        <div class="word-card__speech">
          <button type="button" data-speak="word">♪ ${uiText("learn.pronounce")}</button>
          ${word.example ? `<button type="button" data-speak="example">♪ ${uiText("learn.examplePronounce")}</button>` : ""}
        </div>
        ${answerView(word, ui.mode, choices)}
      </article>
    </section>
  `;
}

function cueView(word, mode) {
  if (mode === "listening") {
    return `<div class="word-cue word-cue--listen" aria-label="先聽發音"><span>♪</span><strong>仔細聽，選出你聽到的字</strong></div>`;
  }
  if (mode === "image") {
    return `<div class="word-cue"><span class="word-class">image match</span><h2>${escapeHtml(word.word)}</h2><small>選出最符合這個英文單字的圖片提示</small></div>`;
  }
  if (mode === "spelling") {
    const visual = word.imageAsset
      ? `<img class="spelling-cue__image" src="${escapeHtml(word.imageAsset)}" alt="${escapeHtml(word.meaningZh)}">`
      : `<span class="image-cue" aria-hidden="true">▧</span>`;
    return `<div class="word-cue spelling-cue">${visual}<h2>${escapeHtml(word.meaningZh)}</h2><small>先聽發音，再輸入你聽到的英文單字。</small></div>`;
  }
  if (mode === "meaning") {
    return `<div class="word-cue"><span class="word-class">${escapeHtml(word.partOfSpeech ?? "word")}</span><h2>${escapeHtml(word.meaningZh)}</h2><small>哪一個英文單字符合這個意思？</small></div>`;
  }
  return `<div class="word-cue"><span class="word-class">${escapeHtml(word.partOfSpeech ?? "word")}</span><h2>${escapeHtml(word.word)}</h2><strong>${escapeHtml(word.meaningZh)}</strong>${word.example ? `<p>${escapeHtml(word.example)}<br><small>${escapeHtml(word.exampleZh)}</small></p>` : ""}</div>`;
}

function answerView(word, mode, choices) {
  if (mode === "spelling") {
    return `<form class="spelling-form" data-spelling-form>
      <label for="spelling-input">聽完後輸入英文單字</label>
      <input id="spelling-input" class="text-field" name="spelling" autocomplete="off" autocapitalize="off" spellcheck="false" required>
      <button class="button button--primary" type="submit">確認拼字</button>
    </form>`;
  }
  if (mode === "image") {
    return `<div class="word-choices word-choices--images">${choices.map((choice) => imageChoice(choice, choice.wordId === word.wordId)).join("")}</div>`;
  }
  if (["meaning", "listening", "matching"].includes(mode)) {
    const useMeaning = mode === "matching";
    return `<div class="word-choices">${choices.map((choice) => `<button type="button" data-learn-answer="${choice.wordId === word.wordId}">${escapeHtml(useMeaning ? choice.meaningZh : choice.word)}</button>`).join("")}</div>`;
  }
  return `<div class="knowledge-actions"><button type="button" data-learn-answer="false">${uiText("learn.practiceAgain")}</button><button type="button" data-learn-answer="true">${uiText("learn.known")} ${icon("check")}</button></div>`;
}

function imageChoice(word, correct) {
  const visual = word.imageAsset
    ? `<img src="${escapeHtml(word.imageAsset)}" alt="${escapeHtml(word.imageCueZh ?? word.meaningZh)}">`
    : `<span class="image-choice__fallback" aria-hidden="true">▧</span>`;
  return `<button type="button" data-learn-answer="${correct}">${visual}<small>${escapeHtml(word.imageCueZh ?? word.meaningZh)}</small></button>`;
}

function matchingSessionView(ui, mode) {
  const game = ui.matchingGame;
  const byId = new Map(ui.sessionItems.map(({ word }) => [word.wordId, word]));
  const cards = [
    ...game.wordIds.map((wordId) => ({ wordId, side: "en" })),
    ...[...game.wordIds].reverse().map((wordId) => ({ wordId, side: "zh" })),
  ];
  return `
    <section class="learn-page learn-session" aria-labelledby="learn-session-title">
      <header class="learn-session__header">
        <button class="learn-back" type="button" data-learn-exit aria-label="返回英文學習總覽">←</button>
        <div><p class="eyebrow">${escapeHtml(mode.title)}</p><h1 id="learn-session-title">${game.resolvedWordIds.length} / ${game.wordIds.length}</h1></div>
        <span class="learn-kind">英中配對</span>
      </header>
      <article class="word-card matching-card">
        <p class="matching-instructions">每次翻兩張牌，找出英文和中文意思相同的一組。</p>
        <div class="matching-board">${cards.map((card) => matchingCard(byId.get(card.wordId), card, game)).join("")}</div>
      </article>
    </section>`;
}

function matchingCard(word, card, game) {
  const resolved = game.resolvedWordIds.includes(card.wordId);
  const selected = game.selected?.wordId === card.wordId && game.selected.side === card.side;
  const revealed = resolved || selected;
  const text = revealed ? (card.side === "en" ? word.word : word.meaningZh) : "?";
  const language = card.side === "en" ? "英文" : "中文";
  return `<button class="matching-tile ${revealed ? "is-revealed" : ""} ${resolved ? "is-resolved" : ""}" type="button"
    data-match-card data-match-word-id="${escapeHtml(card.wordId)}" data-match-side="${card.side}"
    aria-label="${resolved ? `已配對的${language}卡` : selected ? `已翻開的${language}卡` : `未翻開的${language}卡`}" ${resolved ? "disabled" : ""}>
    <span>${escapeHtml(text)}</span><small>${revealed ? language : "翻牌"}</small>
  </button>`;
}

function makeChoices(items, index) {
  const answer = items[index].word;
  const alternatives = items.map(({ word }) => word).filter(({ wordId }) => wordId !== answer.wordId).slice(0, 3);
  return [answer, ...alternatives].sort((left, right) => left.wordId.localeCompare(right.wordId));
}

function doneView(ui) {
  return `<section class="learn-page learn-done" aria-labelledby="learn-done-title">
    <span aria-hidden="true">★</span><h1 id="learn-done-title">${uiText("learn.sessionDone")}</h1>
    <p>完成 ${ui.lastSessionCount ?? 0} 個單字練習，學習紀錄已保存。</p>
    <button class="button button--primary" type="button" data-learn-exit>回到英文總覽</button>
  </section>`;
}

function loadingView() {
  return `<section class="learn-page learn-loading" aria-live="polite"><p>${uiText("common.status.loading")}</p></section>`;
}

function rateButton(rate, activeRate) {
  const active = rate === activeRate;
  return `<button type="button" data-speech-rate="${rate}" class="${active ? "is-active" : ""}" aria-pressed="${active}">${rate.toFixed(2)}x</button>`;
}
