import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createAssetResolver } from "../js/services/asset-registry.js";
import { interpolate } from "../js/services/ui-copy.js";

const copy = JSON.parse(await readFile(new URL("../data/copy/UI_COPY_ZH_TW.json", import.meta.url), "utf8"));
const assets = JSON.parse(await readFile(new URL("../assets/ASSET_MANIFEST.json", import.meta.url), "utf8"));

test("A4 runtime copy is Traditional Chinese fixed UI copy", () => {
  assert.equal(copy.locale, "zh-TW");
  assert.deepEqual(Object.values(copy.copy.navigation), ["首頁", "任務", "學習", "角色", "家長"]);
  assert.equal(copy.copy.common.tagline, "把真實生活，變成大冒險");
  assert.equal(interpolate("完成 {done} / {total}", { done: 1 }), "完成 1 / {total}");
});

test("A6 canonical contract preserves all logical IDs with 167 ready assets", () => {
  assert.equal(assets.status, "coding-ready logical asset contract");
  assert.equal(assets.assets.length, 167);
  assert.equal(assets.assets.filter((asset) => asset.status === "ready").length, 167);
  assert.equal(assets.assets.filter((asset) => asset.status === "pending").length, 0);
  assert.equal(new Set(assets.assets.map((asset) => asset.logicalId)).size, 167);
  assert.ok(assets.canonicalMasterAliases["assets/characters/boy/boy_master.png"]);
});

test("A6 production logical slots resolve directly to canonical paths", () => {
  const resolver = createAssetResolver(assets);
  for (const logicalId of [
    "task.exercise.EX001",
    "task.chore.CH001",
    "story.S01.cover",
    "boss.B01",
    "badge.badge_first",
    "cosmetic.boss_b01",
  ]) {
    const asset = assets.assets.find((item) => item.logicalId === logicalId);
    assert.ok(asset, logicalId);
    assert.equal(asset.status, "ready", logicalId);
    assert.deepEqual(resolver.resolve(logicalId, { avatarVariant: "girl" }), {
      type: "path",
      logicalId,
      value: `./${asset.path}`,
    });
  }
});

test("all production asset files retain canonical metadata and SHA-256", async () => {
  for (const asset of assets.assets.filter((item) => item.status === "ready")) {
    const bytes = await readFile(new URL(`../${asset.path}`, import.meta.url));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest, asset.sha256, asset.path);
    assert.ok(asset.width > 0 && asset.height > 0, asset.path);
    assert.ok(["RGB", "RGBA"].includes(asset.mode), asset.path);
    assert.equal(typeof asset.transparent, "boolean", asset.path);
  }
});
