/**
 * Minimal static server for reviewing a pipelinenews release locally.
 *
 *   node serve.mjs                          serve the newest release
 *   node serve.mjs 202608311314-pipelinenews
 *   node serve.mjs <release> 9000           on a specific port
 *
 * The app is an ES module that fetches six relative paths, so it cannot run
 * from file:// - the browser blocks module loading and fetch on that scheme.
 * It needs an HTTP origin, which is all this provides.
 *
 * Localhost only, read-only, no dependencies, no network access outbound.
 * Stop it with Ctrl+C. Nothing is written to disk.
 */

import { createServer } from "node:http";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const RELEASES = resolve(HERE, "..", "..", "releases");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".parquet": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const args = process.argv.slice(2);
const port = Number(args.find((a) => /^\d+$/.test(a))) || 8787;
let release = args.find((a) => !/^\d+$/.test(a));

if (!release) {
  const dirs = (await readdir(RELEASES, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && /^\d{12}-pipelinenews$/.test(d.name))
    .map((d) => d.name)
    .sort();
  release = dirs[dirs.length - 1];
  if (!release) {
    console.error("no release directories found in", RELEASES);
    process.exit(1);
  }
}

const root = join(RELEASES, release);
try {
  await stat(join(root, "index.html"));
} catch {
  console.error("not a release (no index.html):", root);
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";

    // Path traversal guard: the resolved target must stay under root.
    const target = resolve(join(root, rel));
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end("forbidden");
      console.log(`403 ${rel}`);
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
    console.log(`200 ${rel} (${body.length} bytes)`);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 500).end(String(error.code || error));
    console.log(`${error.code === "ENOENT" ? 404 : 500} ${req.url}`);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\n  serving ${release}`);
  console.log(`  from    ${root}`);
  console.log(`\n  OPEN:   http://localhost:${port}/\n`);
  console.log("  Ctrl+C to stop. Watch this log: every fetch the app makes appears here,");
  console.log("  so a 404 tells you immediately which asset is missing.\n");
});
