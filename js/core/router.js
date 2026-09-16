export const APP_ROUTES = Object.freeze([
  { id: "home", labelKey: "navigation.home", icon: "home" },
  { id: "quests", labelKey: "navigation.quests", icon: "quests" },
  { id: "learn", labelKey: "navigation.learn", icon: "learn" },
  { id: "hero", labelKey: "navigation.hero", icon: "hero" },
  { id: "parent", labelKey: "navigation.parent", icon: "parent" },
]);

export function navigate(state, route) {
  if (!APP_ROUTES.some((item) => item.id === route)) {
    throw new Error(`未知頁面：${route}`);
  }
  if (state.onboarding.step !== "complete") {
    return state;
  }
  return { ...state, route };
}
