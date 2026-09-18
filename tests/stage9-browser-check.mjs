import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStaticServer } from "../tools/dev-server.mjs";

const browserPath = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find(existsSync);
if (!browserPath) throw new Error("找不到 Chrome、Chromium 或 Edge；可用 CHROME_PATH 指定瀏覽器。");

const server = createStaticServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const appPort = server.address().port;
const debugPort = await reservePort();
const profile = await mkdtemp(join(tmpdir(), "rlq-stage9-"));
const browser = spawn(browserPath, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

try {
  await waitForDevTools(browser);
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about%3Ablank`, { method: "PUT" })).json();
  const client = await createClient(target.webSocketDebuggerUrl);
  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("Network.enable")]);
  await client.send("Emulation.setDeviceMetricsOverride", { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true });
  await client.send("Page.navigate", { url: `http://127.0.0.1:${appPort}` });
  await waitFor(() => client.evaluate(`document.readyState === "complete" && Boolean(document.querySelector("[data-start]"))`));
  await waitFor(() => client.evaluate(`navigator.serviceWorker.ready.then((registration) => registration.active?.state === "activated")`));
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector("[data-start]")) && Boolean(navigator.serviceWorker.controller)`));

  const persistence = await client.evaluate(`(async () => {
    const { testStage9Persistence } = await import("/tests/stage9-persistence-browser.js");
    return testStage9Persistence();
  })()`);
  console.log(persistence);

  await client.send("Network.emulateNetworkConditions", {
    offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: "none",
  });
  await client.send("Page.reload");
  await waitFor(() => client.evaluate(`Boolean(document.querySelector("[data-start]"))`));
  await client.evaluate(`window.dispatchEvent(new Event("offline"))`);
  const offline = await client.evaluate(`(async () => {
    const core = await fetch("/02_DATA/thinking_stories_30.json");
    const critical = await fetch("/assets/characters/girl/girl_idle.png");
    const fallback = await fetch("/assets/backgrounds/story_s30_cover.png");
    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      coreOk: core.ok && (await core.json()).length === 30,
      criticalOk: critical.ok && critical.headers.get("content-type")?.includes("image/png"),
      fallbackOk: fallback.ok && fallback.headers.get("content-type")?.includes("image/png"),
      offlineBanner: document.querySelector("#offline-status")?.textContent ?? "",
    };
  })()`);
  if (!offline.controlled || !offline.coreOk || !offline.criticalOk || !offline.fallbackOk) {
    throw new Error(`Stage 9 offline failure: ${JSON.stringify(offline)}`);
  }
  if (!offline.offlineBanner.includes("離線模式")) throw new Error("Offline status banner did not render");
  console.log("Stage 9 browser PASS: controlled PWA reload, core JSON, critical art and uncached-image fallback work offline.");
  await client.send("Network.emulateNetworkConditions", {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: "wifi",
  });
  client.close();
} finally {
  const browserExited = browser.exitCode === null ? new Promise((resolve) => browser.once("exit", resolve)) : Promise.resolve();
  browser.kill();
  await browserExited;
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function reservePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function waitForDevTools(process) {
  let output = "";
  await Promise.race([
    new Promise((resolve, reject) => {
      process.stderr.on("data", (chunk) => { output += chunk; if (output.includes("DevTools listening on")) resolve(); });
      process.once("exit", (code) => reject(new Error(`瀏覽器過早結束：${code}`)));
    }),
    delay(10_000).then(() => { throw new Error("瀏覽器啟動逾時"); }),
  ]);
}

async function createClient(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id); pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id; pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    async evaluate(expression) {
      const response = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
      return response.result.value;
    },
    close() { socket.close(); },
  };
}

async function waitFor(check) {
  for (let attempt = 0; attempt < 100; attempt += 1) { if (await check()) return; await delay(100); }
  throw new Error("頁面載入逾時");
}
function delay(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
