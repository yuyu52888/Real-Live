import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { STORE_KEYS } from "../js/core/db-schema.js";
import { backupFilename, previewBackup } from "../js/services/backup.js";
import { renderParentApprovals } from "../js/pages/parent-approvals.js";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 9 manifest is installable and declares local app icons", async () => {
  const manifest = JSON.parse(await readText("manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.id, "./");
  assert.equal(manifest.lang, "zh-Hant-TW");
  assert.ok(manifest.icons.some(({ sizes, purpose }) => sizes === "192x192" && purpose === "any"));
  assert.ok(manifest.icons.some(({ sizes, purpose }) => sizes === "512x512" && purpose === "any"));
  assert.ok(manifest.icons.some(({ sizes, purpose }) => sizes === "512x512" && purpose === "maskable"));
  for (const icon of manifest.icons) {
    const url = new URL(`../${icon.src.replace(/^\.\//, "")}`, import.meta.url);
    await access(url);
    const bytes = await readFile(url);
    assert.equal(bytes.toString("ascii", 1, 4), "PNG");
    const [expectedWidth, expectedHeight] = icon.sizes.split("x").map(Number);
    assert.equal(bytes.readUInt32BE(16), expectedWidth);
    assert.equal(bytes.readUInt32BE(20), expectedHeight);
  }
});

test("Stage 9 service worker precaches the core shell and has offline fallbacks", async () => {
  const source = await readText("service-worker.js");
  assert.match(source, /CACHE_VERSION\s*=\s*"stage\d+-v\d+"/);
  assert.match(source, /cache\.addAll\(/);
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /IMAGE_FALLBACK/);
  assert.match(source, /caches\.delete/);
  const coreBlock = source.slice(source.indexOf("const CORE_PATHS"), source.indexOf("]);", source.indexOf("const CORE_PATHS")));
  const paths = [...coreBlock.matchAll(/"(\.\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 70, `expected broad offline shell, got ${paths.length}`);
  for (const path of paths.filter((value) => value !== "./")) {
    await access(new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url));
  }
});

test("Stage 9 backup preview supports the safe v1 to v2 conversion and rejects malformed data", () => {
  const stores = Object.fromEntries(Object.keys(STORE_KEYS).map((name) => [name, []]));
  const v1 = {
    format: "real-life-quest", schemaVersion: 1, dbVersion: 1,
    exportedAt: "2026-09-18T00:00:00.000Z", stores,
  };
  const preview = previewBackup(v1, 2);
  assert.equal(preview.sourceDbVersion, 1);
  assert.equal(preview.backup.dbVersion, 2);
  assert.equal(preview.migrated, true);
  assert.equal(backupFilename(new Date(2026, 8, 18)), "real-life-quest-backup-2026-09-18.json");
  const invalid = structuredClone(v1);
  delete invalid.stores.rewards;
  assert.throws(() => previewBackup(invalid, 2), /all stores/);
});

test("Stage 9 keeps DB schema stable and renders parent backup preview controls", async () => {
  const [schema, bindings, app] = await Promise.all([
    readText("js/core/db-schema.js"), readText("js/ui/parent-bindings.js"), readText("js/app.js"),
  ]);
  assert.match(schema, /DB_VERSION = 2/);
  assert.match(bindings, /previewBackup/);
  assert.match(app, /restoreBackupSnapshot/);
  assert.match(app, /installConnectivityIndicator/);

  const html = renderParentApprovals({
    onboarding: {
      avatarVariant: "boy",
      settings: {
        dailyTaskGoal: 2, maxTaskDifficulty: 5, exerciseEnabled: true, choresEnabled: true,
        parentApprovalRequired: true, materialRewardsEnabled: false, restDays: [],
        speechMinRate: 0.6, speechMaxRate: 1.1,
      },
    },
    questUi: { parentUnlocked: true, approvals: [], tasks: [] },
    parentUi: {
      activeTab: "settings", packs: [], settings: {
        dailyTaskGoal: 2, maxTaskDifficulty: 5, exerciseEnabled: true, choresEnabled: true,
        parentApprovalRequired: true, materialRewardsEnabled: false, restDays: [],
        speechMinRate: 0.6, speechMaxRate: 1.1,
      },
      backupPreview: {
        sourceDbVersion: 2, migrated: false,
        summary: {
          nickname: "<測試>", exportedAt: "2026-09-18T00:00:00.000Z", questHistory: 1,
          wordProgress: 2, wordSessions: 3, storyProgress: 4, rewards: 5, bossProgress: 6,
        },
      },
    },
  });
  assert.match(html, /data-backup-export/);
  assert.match(html, /data-backup-preview-form/);
  assert.match(html, /data-backup-restore/);
  assert.match(html, /&lt;測試&gt;/);
  assert.doesNotMatch(html, /<測試>/);
});
