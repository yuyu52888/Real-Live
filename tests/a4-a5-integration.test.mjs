import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { applyReadyAssetOverlay, createAssetResolver } from "../js/services/asset-registry.js";
import { interpolate } from "../js/services/ui-copy.js";

const copy = JSON.parse(await readFile(new URL("../data/copy/UI_COPY_ZH_TW.json", import.meta.url), "utf8"));
const assets = JSON.parse(await readFile(new URL("../assets/ASSET_MANIFEST.json", import.meta.url), "utf8"));
const a6Ready = JSON.parse(await readFile(new URL("../assets/A6_READY_ASSETS.json", import.meta.url), "utf8"));
const effectiveAssets = applyReadyAssetOverlay(assets, a6Ready.readyLogicalIds);

test("A4 runtime copy is Traditional Chinese fixed UI copy", () => {
  assert.equal(copy.locale, "zh-TW");
  assert.deepEqual(Object.values(copy.copy.navigation), ["首頁", "任務", "學習", "角色", "家長"]);
  assert.equal(copy.copy.common.tagline, "把真實生活，變成大冒險");
  assert.equal(interpolate("完成 {done} / {total}", { done: 1 }), "完成 1 / {total}");
});

test("A5 base contract plus A6 readiness overlay preserves 167 stable logical IDs", () => {
  assert.equal(assets.status, "coding-ready logical asset contract");
  assert.equal(assets.assets.length, 167);
  assert.equal(assets.assets.filter((asset) => asset.status === "ready").length, 37);
  assert.equal(a6Ready.readyLogicalIds.length, 130);
  assert.equal(new Set(a6Ready.readyLogicalIds).size, 130);
  assert.equal(new Set(assets.assets.map((asset) => asset.logicalId)).size, 167);
  assert.equal(effectiveAssets.assets.filter((asset) => asset.status === "ready").length, 167);
  assert.equal(effectiveAssets.assets.filter((asset) => asset.status === "pending").length, 0);
  assert.ok(assets.canonicalMasterAliases["assets/characters/boy/boy_master.png"]);
});

test("A6 task art resolves directly to canonical production artwork", () => {
  const resolver = createAssetResolver(effectiveAssets);
  assert.deepEqual(resolver.resolve("task.exercise.EX001", { avatarVariant: "girl" }), {
    type: "path",
    logicalId: "task.exercise.EX001",
    value: "./assets/exercise/exercise_ex001_jump_rope_01.png",
  });
  assert.deepEqual(resolver.resolve("task.chore.CH001", { avatarVariant: "boy" }), {
    type: "path",
    logicalId: "task.chore.CH001",
    value: "./assets/chores/chore_ch001_clean_desk_01.png",
  });
});

test("A6 story and Boss art resolve directly instead of fallbacks", () => {
  const resolver = createAssetResolver(effectiveAssets);
  assert.deepEqual(resolver.resolve("story.S01.cover"), {
    type: "path",
    logicalId: "story.S01.cover",
    value: "./assets/backgrounds/story_s01_cover.png",
  });
  assert.deepEqual(resolver.resolve("boss.B01"), {
    type: "path",
    logicalId: "boss.B01",
    value: "./assets/bosses/boss_b01_greedy_money_bag_01.png",
  });
});

test("all 167 effective ready assets exist at their canonical paths", async () => {
  for (const asset of effectiveAssets.assets) {
    assert.equal(asset.status, "ready", `${asset.logicalId} should be ready`);
    const bytes = await readFile(new URL(`../${asset.path}`, import.meta.url));
    assert.ok(bytes.length > 0, asset.path);
  }
});

test("original A5 checksum-protected assets retain their canonical SHA-256", async () => {
  for (const asset of assets.assets.filter((item) => item.status === "ready" && item.sha256)) {
    const bytes = await readFile(new URL(`../${asset.path}`, import.meta.url));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest, asset.sha256, asset.path);
  }
});
