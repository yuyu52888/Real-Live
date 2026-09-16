let activeResolver = createAssetResolver({ assets: [], logicalFallbacks: {} });

export async function loadAssetManifest(url = "./assets/ASSET_MANIFEST.json") {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contract = await response.json();
    activeResolver = createAssetResolver(contract);
  } catch (error) {
    console.warn("Using stable asset path fallbacks.", error);
  }
  return activeResolver;
}

export function assetSource(logicalId, context, fallbackPath) {
  const resolved = activeResolver.resolve(logicalId, context);
  return resolved.type === "path" ? resolved.value : fallbackPath;
}

export function resolveAsset(logicalId, context = {}) {
  return activeResolver.resolve(logicalId, context);
}

export function createAssetResolver(contract) {
  const assets = new Map((contract.assets ?? []).map((asset) => [asset.logicalId, asset]));
  const fallbacks = contract.logicalFallbacks ?? {};

  return {
    resolve(logicalId, context = {}) {
      return resolveLogicalId(substitute(logicalId, context), context, new Set());
    },
  };

  function resolveLogicalId(logicalId, context, visited) {
    if (visited.has(logicalId)) return { type: "missing", logicalId };
    visited.add(logicalId);

    const asset = assets.get(logicalId);
    if (asset?.status === "ready" && asset.path) {
      return { type: "path", logicalId, value: normalizePath(asset.path) };
    }

    const fallback = asset?.fallbackLogicalId ?? asset?.fallbackStrategy ?? fallbacks[logicalId];
    if (!fallback) return { type: "missing", logicalId };
    const substitutedFallback = substitute(fallback, context);
    if (substitutedFallback.startsWith("css-")) {
      return { type: "css", logicalId, value: substitutedFallback };
    }
    if (substitutedFallback.startsWith("text-")) {
      return { type: "text", logicalId, value: substitutedFallback };
    }
    return resolveLogicalId(substitutedFallback, context, visited);
  }
}

function substitute(value, context) {
  return value.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, token) => (
    Object.hasOwn(context, token) ? String(context[token]) : match
  ));
}

function normalizePath(path) {
  return path.startsWith("./") || path.startsWith("/") ? path : `./${path}`;
}
