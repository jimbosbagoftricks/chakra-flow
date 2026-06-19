import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = 4599;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".jsx": "text/javascript",
  ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".json": "application/json", ".png": "image/png", ".md": "text/markdown",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
