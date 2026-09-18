import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function createStaticServer(root = projectRoot) {
  const rootWithSeparator = `${resolve(root)}${sep}`;

  return createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
    const filePath = resolve(root, relativePath);

    if (!filePath.startsWith(rootWithSeparator)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      if (!statSync(filePath).isFile()) {
        throw new Error("Not a file");
      }
    } catch {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env.PORT ?? "8080", 10);
  createStaticServer().listen(port, "127.0.0.1", () => {
    console.log(`Real Life Quest is available at http://127.0.0.1:${port}`);
  });
}
