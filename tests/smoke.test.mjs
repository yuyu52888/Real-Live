import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { createStaticServer } from "../tools/dev-server.mjs";

let baseUrl;
let server;

before(async () => {
  server = createStaticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("app shell and referenced bootstrap assets are served", async () => {
  const paths = [
    "/",
    "/css/tokens.css",
    "/css/base.css",
    "/css/components.css",
    "/css/onboarding.css",
    "/css/shell.css",
    "/css/home.css",
    "/css/quests.css",
    "/js/app.js",
    "/js/core/app-state.js",
    "/js/core/database.js",
    "/js/core/db-schema.js",
    "/js/repositories/player.js",
    "/js/repositories/settings.js",
    "/js/repositories/tasks.js",
    "/js/repositories/quest-history.js",
    "/js/repositories/approvals.js",
    "/js/repositories/transactions.js",
    "/js/services/onboarding-storage.js",
    "/js/services/backup.js",
    "/js/services/quest-service.js",
    "/js/services/parent-auth.js",
    "/js/core/pwa.js",
    "/js/core/router.js",
    "/js/pages/home.js",
    "/js/pages/onboarding.js",
    "/js/pages/placeholder.js",
    "/js/pages/quests.js",
    "/js/pages/parent-approvals.js",
    "/js/services/asset-registry.js",
    "/js/services/ui-copy.js",
    "/js/ui/app-shell.js",
    "/js/ui/components.js",
    "/data/copy/UI_COPY_ZH_TW.json",
    "/assets/ASSET_MANIFEST.json",
    "/manifest.webmanifest",
    "/service-worker.js",
    "/02_DATA/reality_tasks_120.json",
    "/02_DATA/exercise_task_cards_30.json",
    "/02_DATA/chore_task_cards_30.json",
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} should load`);
  }
});

test("manifest is valid JSON and index declares the Stage 1 module entry point", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.equal(manifest.name, "Real Life Quest");
  assert.match(html, /<script type="module" src="\.\/js\/app\.js"><\/script>/);
  assert.match(html, /lang="zh-Hant"/);
  assert.match(html, /id="app"/);
});
