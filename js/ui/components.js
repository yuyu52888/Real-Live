import { assetSource } from "../services/asset-registry.js";
import { uiText } from "../services/ui-copy.js";

const ICON_PATHS = {
  home: "M3 11.5 12 4l9 7.5V21a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z",
  quests: "M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2Zm2 4h8M8 12h8M8 16h5",
  learn: "M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23zm16 0A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z",
  hero: "M12 3 9.5 8l-5.5.8 4 3.9-.9 5.5 4.9-2.6 4.9 2.6-.9-5.5 4-3.9-5.5-.8z",
  parent: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  arrow: "m9 5 7 7-7 7",
  lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6z",
  check: "m5 12 4 4L19 6",
};

export function icon(name, className = "") {
  const path = ICON_PATHS[name];
  if (!path) {
    return "";
  }
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
}

export function logo() {
  return `
    <span class="brand-mark" aria-hidden="true">✦</span>
    <span class="brand-copy">
      <strong>${uiText("common.appName")}</strong>
      <small>${uiText("common.tagline")}</small>
    </span>
  `;
}

export function avatarImage(variant, pose = "idle", className = "") {
  const safeVariant = variant === "girl" ? "girl" : "boy";
  const safePose = ["idle", "portrait", "happy"].includes(pose) ? pose : "idle";
  const label = uiText(`onboarding.avatar.${safeVariant}`);
  const fallbackPath = `./assets/characters/${safeVariant}/${safeVariant}_${safePose}.png`;
  const source = assetSource(`character.${safeVariant}.${safePose}`, { avatarVariant: safeVariant }, fallbackPath);
  return `<img class="${className}" src="${source}" alt="${label}" draggable="false">`;
}

export function foxImage(pose = "idle", className = "") {
  const safePose = ["idle", "portrait", "happy"].includes(pose) ? pose : "idle";
  const fallbackPath = `./assets/pets/fox/fox_${safePose}.png`;
  const source = assetSource(`pet.fox.${safePose}`, {}, fallbackPath);
  return `<img class="${className}" src="${source}" alt="狐狸冒險夥伴" draggable="false">`;
}

export function expBar(current, target) {
  const currentValue = Math.max(Number(current) || 0, 0);
  const maximum = Math.max(Number(target) || 1, 1);
  const value = Math.min(currentValue, maximum);
  const percentage = Math.round((value / maximum) * 100);
  return `
    <div class="exp-bar" role="progressbar" aria-label="${uiText("accessibility.expProgress", { current: currentValue, target: maximum })}" aria-valuemin="0" aria-valuemax="${maximum}" aria-valuenow="${value}">
      <span style="width: ${percentage}%"></span>
    </div>
    <span class="exp-caption">${uiText("common.labels.exp")} ${currentValue} / ${maximum}</span>
  `;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
