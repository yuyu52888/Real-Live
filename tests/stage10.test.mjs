import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 10 visual layer is loaded last and preserved for offline use", async () => {
  const [index, sw] = await Promise.all([readText("index.html"), readText("service-worker.js")]);
  const parentIndex = index.indexOf("./css/parent.css");
  const stage10Index = index.indexOf("./css/stage10.css");
  assert.ok(parentIndex >= 0 && stage10Index > parentIndex, "Stage 10 CSS must load after functional page CSS");
  assert.match(sw, /CACHE_VERSION = "stage10-v1"/);
  assert.match(sw, /"\.\/css\/stage10\.css"/);
  assert.match(sw, /bg_home_adventure_camp\.png/);
});

test("Stage 10 keeps tablet-first touch and responsive layout guarantees", async () => {
  const css = await readText("css/stage10.css");
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /\.bottom-nav__item/);
  assert.match(css, /\.home-page[\s\S]*bg_home_adventure_camp\.png/);
  assert.match(css, /\.quest-browser/);
  assert.match(css, /\.learn-switcher/);
  assert.match(css, /\.story-reader/);
  assert.match(css, /\.boss-stage/);
  assert.match(css, /\.hero-profile/);
  assert.match(css, /\.parent-tabs/);
  assert.match(css, /@media \(max-width: 56rem\)/);
  assert.match(css, /@media \(max-width: 42rem\)/);
  assert.doesNotMatch(css, /animation:\s*[^;]*(?:infinite|linear infinite)/i);
});

test("Stage 10 visual refinement does not replace the five-route information architecture", async () => {
  const [shell, router] = await Promise.all([readText("js/ui/app-shell.js"), readText("js/core/router.js")]);
  assert.match(shell, /APP_ROUTES\.map/);
  assert.match(router, /home/);
  assert.match(router, /quests/);
  assert.match(router, /learn/);
  assert.match(router, /hero/);
  assert.match(router, /parent/);
  assert.doesNotMatch(shell, /data-route="rewards"/);
});

test("Stage 10 uses production art rather than flattened reference screenshots", async () => {
  const css = await readText("css/stage10.css");
  assert.match(css, /\.\.\/assets\/backgrounds\/bg_home_adventure_camp\.png/);
  assert.doesNotMatch(css, /04_UI_REFERENCES/);
});
