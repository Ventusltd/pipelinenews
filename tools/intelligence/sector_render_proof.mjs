#!/usr/bin/env node

/**
 * Mount the registered Sector Intelligence cartridge against its real payload.
 *
 * This is deliberately registry-driven: a later timestamp can inherit an
 * older immutable module and payload. A release directory's timestamp is not
 * the identity of every asset inside it.
 */

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const RELEASES = resolve(HERE, "..", "..", "releases");
const releaseId = process.argv[2];
if (!releaseId) {
  console.error("usage: node sector_render_proof.mjs <release-id>");
  process.exit(2);
}

const root = join(RELEASES, releaseId);
const registry = JSON.parse(await readFile(join(root, "data", "202608291447-registry.json"), "utf8"));
const entry = registry.supplemental_assets?.sector_intelligence_clean
  || registry.supplemental_assets?.sector_intelligence;
if (!entry?.cartridge?.path || !entry?.payload?.path) {
  throw new Error("sector-intelligence registry entry is missing");
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.className = "";
    this.textContent = "";
    this.hidden = false;
    this._listeners = {};
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(type, listener) { (this._listeners[type] ||= []).push(listener); }
  collectText() { return [this.textContent, ...this.children.map((child) => child.collectText())].join(" "); }
}

globalThis.HTMLElement = El;
globalThis.document = {
  head: new El("head"),
  createElement: (tag) => new El(tag),
  createTextNode: (text) => Object.assign(new El("#text"), { textContent: String(text) }),
  querySelector: () => null,
};

const payloadBytes = await readFile(join(root, entry.payload.path));
let fetchCalls = 0;
globalThis.fetch = async (url) => {
  fetchCalls += 1;
  if (String(url) !== entry.payload.path) throw new Error(`unexpected fetch ${url}`);
  const arrayBuffer = payloadBytes.buffer.slice(
    payloadBytes.byteOffset,
    payloadBytes.byteOffset + payloadBytes.byteLength,
  );
  return { ok: true, status: 200, arrayBuffer: async () => arrayBuffer };
};

const moduleUrl = "file://" + join(root, entry.cartridge.path).replace(/\\/g, "/");
const mod = await import(moduleUrl);
const contract = mod.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT;
const host = new El("div");
const result = mod.mountSectorIntelligence({
  host,
  payloadAsset: { ...entry.payload, url: entry.payload.path },
});

const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass: Boolean(pass), detail });

check("module contract matches registry generation",
  contract.generation === entry.generation,
  `${contract.generation} vs ${entry.generation}`);
check("mount requests no payload", result.payloadRequests === 0, `requests=${result.payloadRequests}`);
check("mount performs no fetch", fetchCalls === 0, `fetches=${fetchCalls}`);
check("only one evidenced topic is exposed", result.buttons.size === 1, `tabs=${result.buttons.size}`);
check("the exposed topic is DATA_CENTRES", result.buttons.has("DATA_CENTRES"));
check("withheld topics are absent from the controls",
  ![...result.buttons].some(([code]) => code !== "DATA_CENTRES"));

await result.select("DATA_CENTRES");
check("first selection fetches exactly once", fetchCalls === 1, `fetches=${fetchCalls}`);
check("nine evidenced rows render", result.list.children.length === 9,
  `rows=${result.list.children.length}`);
check("status reports successful landed readback",
  result.status.dataset.sectorStatus === "OK" && /9 rows/.test(result.status.textContent),
  result.status.textContent);
check("rendered cards contain data-centre evidence",
  /data centre/i.test(result.list.collectText()));

await result.select("DATA_CENTRES");
check("repeat selection does not refetch", fetchCalls === 1, `fetches=${fetchCalls}`);

let failures = 0;
for (const item of checks) {
  if (!item.pass) failures += 1;
  console.log(`  ${item.pass ? "PASS" : "FAIL"}  ${item.name}`
    + `${!item.pass && item.detail ? `  -> ${item.detail}` : ""}`);
}
console.log(`\n  ${checks.length} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
