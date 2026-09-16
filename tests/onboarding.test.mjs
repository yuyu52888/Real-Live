import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceOnboarding,
  createInitialState,
  selectAvatar,
} from "../js/core/app-state.js";
import { navigate } from "../js/core/router.js";

test("onboarding follows the required route order", () => {
  let state = createInitialState();
  assert.equal(state.onboarding.step, "welcome");

  state = advanceOnboarding(state);
  assert.equal(state.onboarding.step, "avatar");

  state = selectAvatar(state, "girl");
  state = advanceOnboarding(state);
  assert.equal(state.onboarding.step, "nickname");

  state = advanceOnboarding(state, { nickname: "小晴" });
  assert.equal(state.onboarding.step, "parent");

  state = advanceOnboarding(state, { parentPin: "0123" });
  assert.equal(state.onboarding.step, "settings");

  state = advanceOnboarding(state, {
    dailyTaskGoal: 2,
    exerciseEnabled: true,
    choresEnabled: true,
    parentApprovalRequired: true,
  });
  assert.equal(state.onboarding.step, "complete");
});

test("avatar selection changes only avatarVariant", () => {
  const before = createInitialState();
  const after = selectAvatar(before, "boy");

  assert.equal(after.onboarding.avatarVariant, "boy");
  assert.deepEqual(after.player, before.player);
  assert.deepEqual(after.onboarding.settings, before.onboarding.settings);
  assert.equal(after.onboarding.nickname, before.onboarding.nickname);
  assert.equal(after.onboarding.parentPin, before.onboarding.parentPin);
  assert.equal(after.route, before.route);
});

test("app routing is locked until onboarding completes", () => {
  const state = createInitialState();
  assert.equal(navigate(state, "hero"), state);
});

test("PIN must contain exactly four digits", () => {
  let state = advanceOnboarding(createInitialState());
  state = selectAvatar(state, "boy");
  state = advanceOnboarding(state);
  state = advanceOnboarding(state, { nickname: "阿樂" });

  assert.throws(() => advanceOnboarding(state, { parentPin: "123" }), /4 位數字/);
  assert.doesNotThrow(() => advanceOnboarding(state, { parentPin: "9876" }));
});
