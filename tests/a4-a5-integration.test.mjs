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

test("A5 canonical contract preserves ready assets and logical IDs", () => {
  assert.equal(assets.status, "coding-ready logical asset contract");
  assert.equal(assets.assets.length, 167);
  assert.equal(assets.assets.filter((asset) => asset.status === "ready").length, 37);
  assert.equal(new Set(assets.assets.map((asset) => asset.logicalId)).size, 167);
  assert.ok(assets.canonicalMasterAliases["assets/characters/boy/boy_master.png"]);
});

test("pending task art resolves through the declared avatar fallback", () => {
  const resolver = createAssetResolver(assets);
  assert.deepEqual(
    resolver.resolve("task.exercise.EX001", { avatarVariant: "girl" }),
    {
      type: "path",
      logicalId: "character.girl.exercise",
      value: "./assets/characters/girl/girl_exercise.png",
    },
  );
});

test("pending Boss art resolves to a generic CSS slot", () => {
  const resolver = createAssetResolver(assets);
  const boss = assets.assets.find((asset) => asset.kind === "boss-illustration");
  assert.equal(resolver.resolve(boss.logicalId).type, "css");
  assert.equal(resolver.resolve(boss.logicalId).value, "css-placeholder-card");
});

test("all pending art resolves to a non-blocking fallback", () => {
  const resolver = createAssetResolver(assets);
  for (const asset of assets.assets.filter((item) => item.status === "pending")) {
    assert.notEqual(
      resolver.resolve(asset.logicalId, { avatarVariant: "boy" }).type,
      "missing",
      `${asset.logicalId} must have a fallback`,
    );
  }
});

test("all ready asset files retain their canonical SHA-256", async () => {
  for (const asset of assets.assets.filter((item) => item.status === "ready")) {
    const bytes = await readFile(new URL(`../${asset.path}`, import.meta.url));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest, asset.sha256, asset.path);
  }
});
