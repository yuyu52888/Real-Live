export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.warn("Service worker registration failed.", error);
      return null;
    }
  };

  if (document.readyState === "complete") return register();
  return new Promise((resolve) => {
    window.addEventListener("load", () => resolve(register()), { once: true });
  });
}

export function installConnectivityIndicator() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  const setOffline = (offline) => {
    document.documentElement.dataset.connectivity = offline ? "offline" : "online";
    let node = document.querySelector("#offline-status");
    if (!offline) {
      node?.remove();
      return;
    }
    if (!node) {
      node = document.createElement("p");
      node.id = "offline-status";
      node.className = "offline-status";
      node.setAttribute("role", "status");
      node.textContent = "目前是離線模式，已儲存的進度與核心內容仍可使用。";
      document.body.prepend(node);
    }
  };

  const onOnline = () => setOffline(false);
  const onOffline = () => setOffline(true);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  setOffline(navigator.onLine === false);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.querySelector("#offline-status")?.remove();
  };
}
