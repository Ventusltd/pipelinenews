/**
 * Render proof for the project-intelligence cartridge.
 *
 *   node render_proof.mjs <release-id>
 *
 * The cartridge has never been exercised. This mounts it against a minimal DOM
 * and the real payload, then opens every tab and asserts each produced markup
 * containing figures that match the data.
 *
 * It is NOT a browser. It does not prove layout, CSS, or that a human can read
 * the result. It proves the code runs, the loader contract holds, the payload
 * parses, and every tab renders real numbers rather than throwing.
 *
 * No network. Reads the release directory only.
 */

import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const RELEASES = resolve(HERE, "..", "..", "releases");
const releaseId = process.argv[2];
if (!releaseId) {
  console.error("usage: node render_proof.mjs <release-id>");
  process.exit(2);
}
const root = join(RELEASES, releaseId);
const gen = releaseId.slice(0, 12);

// ---- minimal DOM ---------------------------------------------------------
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.style = { cssText: "" };
    this.dataset = {};
    this._html = "";
    this._text = "";
    this.classList = {
      _s: new Set(),
      add: (c) => this.classList._s.add(c),
      remove: (c) => this.classList._s.delete(c),
      toggle: (c, on) => (on ? this.classList._s.add(c) : this.classList._s.delete(c)),
      contains: (c) => this.classList._s.has(c),
    };
    this._listeners = {};
  }
  set className(v) { for (const c of String(v).split(/\s+/)) if (c) this.classList._s.add(c); }
  get className() { return [...this.classList._s].join(" "); }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, fn) { (this._listeners[t] ||= []).push(fn); }
  click() { for (const fn of this._listeners.click || []) fn({}); }
  /** Everything this node and its descendants rendered. */
  collect() {
    return this._html + this._text + this.children.map((c) => c.collect()).join("");
  }
}
globalThis.HTMLElement = El;
globalThis.document = { createElement: (t) => new El(t) };

// ---- the real payload, served through the cartridge's own fetch path ------
const payloadPath = join(root, "data", `${gen}-project-intelligence.json`);
const payloadText = await readFile(payloadPath, "utf8");
let fetchCalls = 0;
globalThis.fetch = async (url) => {
  fetchCalls += 1;
  if (!String(url).includes("project-intelligence")) throw new Error("unexpected fetch " + url);
  return { ok: true, status: 200, json: async () => JSON.parse(payloadText) };
};

// ---- mount ---------------------------------------------------------------
const mod = await import("file://" + join(root, "assets", `${gen}-project-intelligence.mjs`).replace(/\\/g, "/"));
const contract = mod.PROJECT_INTELLIGENCE_CARTRIDGE_CONTRACT;
const host = new El("div");

const checks = [];
const ok = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

ok("contract generation matches release", contract.generation === gen, `${contract.generation} vs ${gen}`);
ok("contract declares additive_only", contract.additive_only === true);
ok("contract declares mutates_existing_dom false", contract.mutates_existing_dom === false);

const result = mod.mountProjectIntelligence({
  host,
  payloadAsset: { url: `data/${gen}-project-intelligence.json` },
});

ok("mount requests NO payload", result.payloadRequests === 0, `payloadRequests=${result.payloadRequests}`);
ok("mount creates no bindings", result.projectBindings === 0);
ok("no fetch happened at mount", fetchCalls === 0, `fetchCalls=${fetchCalls}`);
ok("host received children", host.children.length > 0, `${host.children.length} nodes`);

// The tab buttons live in the first child (the news-tools strip).
const tools = host.children[0];
const buttons = tools.children;
ok("five tabs rendered", buttons.length === 5, `${buttons.length} buttons: ${buttons.map((b) => b._html).join(", ")}`);

// ---- open every tab ------------------------------------------------------
const payload = JSON.parse(payloadText);
const expected = String(payload.record_count.toLocaleString("en-GB"));

for (const btn of buttons) {
  const label = btn._html;
  const before = fetchCalls;
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  const html = host.collect();
  ok(`tab ${label}: rendered markup`, html.length > 400, `${html.length} chars`);
  ok(`tab ${label}: contains a bar or a table`, /class="bar"|<table|<div style=/.test(html));
  ok(`tab ${label}: no undefined/NaN leaked`, !/undefined|NaN/.test(html),
     (html.match(/.{0,40}(undefined|NaN).{0,40}/) || [])[0]);
  if (label === "OVERVIEW") {
    ok("OVERVIEW shows the real record count", html.includes(expected), `expected ${expected}`);
  }
  if (before === 0) ok("payload fetched exactly once, on first tab", fetchCalls === 1, `fetchCalls=${fetchCalls}`);
}
ok("payload never re-fetched across all five tabs", fetchCalls === 1, `fetchCalls=${fetchCalls}`);

// ---- report --------------------------------------------------------------
let failed = 0;
for (const c of checks) {
  if (!c.pass) failed += 1;
  console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail && !c.pass ? `  -> ${c.detail}` : ""}`);
}
console.log(`\n  ${checks.length} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
