const CACHE_PREFIX = "real-life-quest";
const CACHE_VERSION = "stage10-v1";
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const IMAGE_FALLBACK = "./assets/icons/pwa-icon-192.png";

const CORE_PATHS = Object.freeze([
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/onboarding.css",
  "./css/shell.css",
  "./css/home.css",
  "./css/quests.css",
  "./css/learn.css",
  "./css/stories.css",
  "./css/hero.css",
  "./css/boss.css",
  "./css/parent.css",
  "./css/stage10.css",
  "./js/app.js",
  "./js/core/app-state.js",
  "./js/core/database.js",
  "./js/core/db-schema.js",
  "./js/core/pwa.js",
  "./js/core/router.js",
  "./js/pages/onboarding.js",
  "./js/pages/home.js",
  "./js/pages/placeholder.js",
  "./js/pages/quests.js",
  "./js/pages/learn.js",
  "./js/pages/stories.js",
  "./js/pages/hero.js",
  "./js/pages/boss.js",
  "./js/pages/parent-approvals.js",
  "./js/pages/parent-sections.js",
  "./js/repositories/approvals.js",
  "./js/repositories/boss-progress.js",
  "./js/repositories/bosses.js",
  "./js/repositories/player.js",
  "./js/repositories/quest-history.js",
  "./js/repositories/rewards.js",
  "./js/repositories/settings.js",
  "./js/repositories/stories.js",
  "./js/repositories/story-progress.js",
  "./js/repositories/tasks.js",
  "./js/repositories/transactions.js",
  "./js/repositories/vocabulary.js",
  "./js/services/asset-registry.js",
  "./js/services/backup.js",
  "./js/services/boss-service.js",
  "./js/services/english-engine.js",
  "./js/services/matching-game.js",
  "./js/services/onboarding-storage.js",
  "./js/services/parent-auth.js",
  "./js/services/parent-dashboard.js",
  "./js/services/parent-settings.js",
  "./js/services/quest-service.js",
  "./js/services/review-scheduler.js",
  "./js/services/reward-service.js",
  "./js/services/reward-system.js",
  "./js/services/speech.js",
  "./js/services/story-chapters.js",
  "./js/services/story-service.js",
  "./js/services/ui-copy.js",
  "./js/services/vocabulary-import.js",
  "./js/services/vocabulary-pack.js",
  "./js/services/weekly-report.js",
  "./js/ui/app-shell.js",
  "./js/ui/components.js",
  "./js/ui/parent-bindings.js",
  "./data/copy/UI_COPY_ZH_TW.json",
  "./02_DATA/core300_words_enriched.json",
  "./02_DATA/reality_tasks_120.json",
  "./02_DATA/exercise_task_cards_30.json",
  "./02_DATA/chore_task_cards_30.json",
  "./02_DATA/thinking_stories_30.json",
  "./02_DATA/speech_settings.json",
  "./03_REWARDS_BOSSES/REWARD_SYSTEM.json",
  "./03_REWARDS_BOSSES/BOSSES_6.json",
  "./assets/ASSET_MANIFEST.json",
  "./assets/backgrounds/bg_home_adventure_camp.png",
  "./assets/icons/pwa-icon-192.png",
  "./assets/icons/pwa-icon-512.png",
  "./assets/icons/pwa-icon-maskable-512.png",
  "./assets/characters/boy/boy_idle.png",
  "./assets/characters/boy/boy_happy.png",
  "./assets/characters/boy/boy_portrait.png",
  "./assets/characters/girl/girl_idle.png",
  "./assets/characters/girl/girl_happy.png",
  "./assets/characters/girl/girl_portrait.png",
  "./assets/pets/fox/fox_happy.png"
]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(CORE_PATHS.map(scopedUrl));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && ![STATIC_CACHE, RUNTIME_CACHE].includes(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (request.destination === "image" || /\.(?:png|webp|jpe?g|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(imageResponse(request));
    return;
  }

  event.respondWith(staticResponse(request));
});

async function navigationResponse(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const network = await fetch(request);
    if (network.ok) {
      await putSafely(cache, request, network.clone());
      await putSafely(cache, scopedUrl("./index.html"), network.clone());
    }
    return network;
  } catch {
    return (await cache.match(request, { ignoreSearch: true }))
      ?? (await cache.match(scopedUrl("./index.html")))
      ?? Response.error();
  }
}

async function staticResponse(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  try {
    const network = await fetch(request);
    if (network.ok) {
      const core = isCoreRequest(request.url);
      const cache = await caches.open(core ? STATIC_CACHE : RUNTIME_CACHE);
      await putSafely(cache, request, network.clone());
      if (!core) await trimRuntimeCache();
    }
    return network;
  } catch {
    return cached ?? Response.error();
  }
}

async function imageResponse(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const network = await fetch(request);
    if (network.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await putSafely(cache, request, network.clone());
      await trimRuntimeCache();
    }
    return network;
  } catch {
    const fallback = await caches.match(scopedUrl(IMAGE_FALLBACK));
    return fallback ?? Response.error();
  }
}

async function putSafely(cache, request, response) {
  try {
    await cache.put(request, response);
  } catch (error) {
    console.warn("Runtime cache write skipped.", error);
  }
}

async function trimRuntimeCache(maxEntries = 48) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const keys = await cache.keys();
    while (keys.length > maxEntries) {
      const oldest = keys.shift();
      if (oldest) await cache.delete(oldest);
    }
  } catch (error) {
    console.warn("Runtime cache trim skipped.", error);
  }
}

let coreUrls;

function isCoreRequest(url) {
  coreUrls ??= new Set(CORE_PATHS.map(scopedUrl));
  return coreUrls.has(url);
}

function scopedUrl(path) {
  return new URL(path, self.registration.scope).href;
}
