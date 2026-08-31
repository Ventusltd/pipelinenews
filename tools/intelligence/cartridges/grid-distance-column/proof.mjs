/**
 * grid-distance-column render proof.
 *
 * This cartridge does not add a panel. It changes the project table itself --
 * a new column and a new sort mode -- so the only proof worth anything is
 * booting the whole app against the real release and reading the table it
 * produces.
 *
 * Every expectation is re-derived from the payload independently. A sort
 * assertion that compares the app's output to the app's own comparator proves
 * nothing, and a cell assertion that reads the number back out of the cell it
 * came from proves less than that.
 *
 * It also checks the two things that make this column honest rather than merely
 * present: that a project with no mapped circuit renders a dash rather than a
 * number, and that the BETA caveat on the page actually says headroom cannot be
 * inferred from distance.
 *
 * Usage:
 *   node proof.mjs <path-to-release-dir> <generation>
 *
 * It is NOT a browser: it proves the code runs, the column carries the right
 * values, and the heading reorders the rows correctly. It does not prove layout
 * or that a human can read the result.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";

const root = process.argv[2];
const gen = process.argv[3];
if (!root || !gen) {
  console.error("usage: node proof.mjs <release-dir> <generation>");
  process.exit(2);
}

let passed = 0;
const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------- the DOM --
const html = await readFile(join(root, "index.html"), "utf8");
const dom = new JSDOM(html, {
  url: "http://localhost/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
});
const { window } = dom;

window.fetch = async (input) => {
  const url = new URL(input instanceof URL ? input.href : String(input?.url ?? input),
                      "http://localhost/");
  const file = join(root, decodeURIComponent(url.pathname).replace(/^\//, ""));
  try {
    const body = await readFile(file, "utf8");
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  } catch {
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
  }
};

const FROM_WINDOW = [
  "document", "location", "history", "navigator", "screen", "matchMedia",
  "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame",
  "Event", "CustomEvent", "EventTarget", "AbortController", "AbortSignal",
  "Node", "Element", "HTMLElement", "HTMLInputElement", "HTMLSelectElement",
  "HTMLOptionElement", "Option", "Image", "DocumentFragment", "NodeList",
  "DOMParser", "XMLHttpRequest", "FormData", "Blob", "URL", "URLSearchParams",
  "MutationObserver", "IntersectionObserver", "ResizeObserver",
  "localStorage", "sessionStorage", "innerWidth", "innerHeight",
];
for (const key of FROM_WINDOW) {
  let value;
  try { value = window[key]; } catch { continue; }
  if (value === undefined) continue;
  try {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  } catch { /* non-configurable on this runtime */ }
}
for (const [key, value] of [["window", window],
                            ["fetch", window.fetch],
                            ["crypto", webcrypto],
                            ["addEventListener", window.addEventListener.bind(window)],
                            ["dispatchEvent", window.dispatchEvent.bind(window)]]) {
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
}

// ------------------------------------------------------------ boot the app --
const appUrl = pathToFileURL(join(root, "assets", "202608291447-app.mjs")).href;
await import(appUrl);

const ready = await new Promise((resolve) => {
  const started = Date.now();
  const poll = setInterval(() => {
    if (window.document.body.dataset.fastReady === "true") { clearInterval(poll); resolve(true); }
    else if (window.document.body.dataset.fastFailed === "true") { clearInterval(poll); resolve(false); }
    else if (Date.now() - started > 60000) { clearInterval(poll); resolve(false); }
  }, 40);
});
check("app boots", ready, window.document.body.dataset.fastFailed === "true"
  ? "boot() threw and the table failed closed" : "timed out");
if (!ready) {
  console.error("\nthe app did not boot; nothing below can be trusted\n");
  console.error(failures.join("\n"));
  process.exit(1);
}

const doc = window.document;
const $ = (sel) => doc.querySelector(sel);
const rowsOf = () => [...doc.querySelectorAll("#tbody tr")];
const cellsOf = (tr) => [...tr.querySelectorAll("td")];

// ------------------------------------------------------- the payload, again --
const payload = JSON.parse(await readFile(
  join(root, "data", `${gen}-grid-distance.json`), "utf8"));
const projects = JSON.parse(await readFile(
  join(root, "data", "202608270055-8ab1807551bc-v8-fast-projects.json"), "utf8"));
const F = Object.fromEntries(projects.fields.map((name, index) => [name, index]));
const refOf = (row) => String(row[F.repd_ref]);
const kmOf = (row) => {
  const hit = payload.grid[refOf(row)];
  return hit && typeof hit.k === "number" ? hit.k : null;
};

check("payload schema is the one the registry declares",
  payload.schema === "pipelinenews.grid-distance.v1", payload.schema);
check("payload generation matches the release", payload.generation === gen, payload.generation);
check("payload makes no runtime network claim", payload.network_at_runtime === false);

// ------------------------------------------------------------- the columns --
const headings = [...doc.querySelectorAll("thead th")]
  .map((th) => th.textContent.replace(/\s+/g, " ").trim());
// From 202608311858 the GRID column was deliberately removed and the distance
// moved into the ACTIONS cell beside MAP, because the column sat past the fold
// on any window narrower than about 1920px. This proof describes the releases
// that HAD the column; on a later one it stands down rather than reporting a
// failure for a change that was the point. The check must come BEFORE the
// column-count assertion, or standing down still leaves a recorded failure.
if (!headings.some((h) => h.startsWith("GRID"))) {
  console.log("\nSKIP  this release has no GRID column.");
  console.log("      The distance moved into ACTIONS in 202608311858; that placement");
  console.log("      is covered by cartridges/grid-actions-inline/proof.mjs.");
  process.exit(0);
}

check("table has 14 columns", headings.length === 14,
  `found ${headings.length}: ${headings.join(" | ")}`);

const gridIndex = headings.findIndex((h) => h.startsWith("GRID"));
const postcodeIndex = headings.findIndex((h) => h.startsWith("POSTCODE"));
const operatorIndex = headings.findIndex((h) => h.startsWith("OPERATOR"));
check("GRID column present", gridIndex !== -1, headings.join(" | "));
check("GRID sits between POSTCODE and OPERATOR",
  postcodeIndex !== -1 && gridIndex === postcodeIndex + 1 && operatorIndex === gridIndex + 1,
  `postcode ${postcodeIndex}, grid ${gridIndex}, operator ${operatorIndex}`);
check("GRID heading carries the BETA marker",
  doc.querySelector("#gridHeader .beta-chip")?.textContent.trim() === "BETA",
  doc.querySelector("#gridHeader")?.textContent.replace(/\s+/g, " ").trim());
check("GRID heading is a sort control",
  doc.querySelector("#gridHeader button#sortGrid") !== null);

// -------------------------------------------------------------- the cells --
const first = rowsOf();
check("rows render", first.length > 0, `${first.length} rows`);
check("every row has 14 cells", first.every((tr) => cellsOf(tr).length === 14),
  `widths ${[...new Set(first.map((tr) => cellsOf(tr).length))].join(",")}`);

const failRow = (await readFile(join(root, "assets", "202608291447-app.mjs"), "utf8"))
  .match(/colspan="(\d+)" class="fast-fail"/);
check("fail-closed row spans the whole table", failRow && failRow[1] === "14",
  failRow ? failRow[1] : "not found");

const byRef = new Map(projects.rows.map((row) => [refOf(row), row]));
let cellMatches = 0;
let dashes = 0;
let dashesCorrect = 0;
for (const tr of first) {
  const ref = tr.id.replace(/^repd-/, "");
  const cell = cellsOf(tr)[gridIndex];
  const text = cell.textContent.replace(/\s+/g, " ").trim();
  const want = kmOf(byRef.get(ref) ?? []);
  if (want === null) {
    dashes += 1;
    if (text === "-") dashesCorrect += 1;
  } else if (text === `${want.toFixed(2)}km` || text === `${want.toFixed(2)}km · ${payload.grid[ref].v}kV`) {
    cellMatches += 1;
  }
}
check("every measured GRID cell matches the payload",
  cellMatches + dashes === first.length,
  `${cellMatches} matched, ${dashes} blank, of ${first.length}`);
check("a project with no mapped circuit shows a dash, never a number",
  dashes === dashesCorrect, `${dashes - dashesCorrect} of ${dashes} blanks were not a dash`);

// ---------------------------------------------------------------- the sort --
const clickAndRead = (selector) => {
  $(selector).dispatchEvent(new window.Event("click", { bubbles: true }));
  return rowsOf().map((tr) => tr.id.replace(/^repd-/, ""));
};

// Independently re-derived: sort the payload the way the column claims to and
// take the first window. Blanks last in BOTH directions.
const WINDOW = 100;
function expected(direction) {
  const order = projects.rows.map((_row, index) => index);
  order.sort((left, right) => {
    const a = kmOf(projects.rows[left]);
    const b = kmOf(projects.rows[right]);
    if (a === null && b === null) return left - right;
    if (a === null) return 1;
    if (b === null) return -1;
    return direction * (a - b) || left - right;
  });
  return order.slice(0, WINDOW).map((index) => refOf(projects.rows[index]));
}

for (const [label, wanted, mode, aria] of [
  ["GRID first click sorts nearest first", () => expected(1), "grid_asc", "ascending"],
  ["GRID second click sorts furthest first", () => expected(-1), "grid_desc", "descending"],
]) {
  const got = clickAndRead("#sortGrid");
  const want = wanted();
  check(label, got.join(",") === want.join(","),
    `first 5 got ${got.slice(0, 5).join(",")} want ${want.slice(0, 5).join(",")}`);
  check(`${label} syncs the sort control`, $("#sortProjects").value === mode,
    $("#sortProjects").value);
  check(`${label} sets aria-sort`,
    doc.getElementById("gridHeader").getAttribute("aria-sort") === aria,
    doc.getElementById("gridHeader").getAttribute("aria-sort"));
}

// Nearest-first must really ascend, and blanks must really be at the bottom.
$("#sortProjects").value = "grid_asc";
$("#sortProjects").dispatchEvent(new window.Event("change", { bubbles: true }));
const ascending = rowsOf().map((tr) => kmOf(byRef.get(tr.id.replace(/^repd-/, "")) ?? []));
check("grid_asc really ascends",
  ascending.every((v, i) => i === 0 || v === null || ascending[i - 1] === null || ascending[i - 1] <= v),
  ascending.slice(0, 6).join(","));

$("#sortProjects").value = "grid_desc";
$("#sortProjects").dispatchEvent(new window.Event("change", { bubbles: true }));
const descending = rowsOf().map((tr) => kmOf(byRef.get(tr.id.replace(/^repd-/, "")) ?? []));
check("grid_desc really descends",
  descending.every((v, i) => i === 0 || v === null || descending[i - 1] === null || descending[i - 1] >= v),
  descending.slice(0, 6).join(","));
check("blanks sit last in both directions",
  ascending.indexOf(null) === -1 || ascending.slice(ascending.indexOf(null)).every((v) => v === null));

// ------------------------------------------------------------- the caveat --
const note = doc.getElementById("gridDistanceNote");
check("the GRID note rendered", note !== null && note.textContent.trim().length > 0,
  note?.textContent);
check("the note marks the column BETA", /BETA/.test(note?.textContent ?? ""), note?.textContent);
check("the note says it is not a cable route",
  /not a cable route/i.test(note?.textContent ?? ""), note?.textContent);
check("the note says the column is not headroom",
  /headroom/i.test(note?.textContent ?? ""), note?.textContent);

const title = note?.getAttribute("title") ?? "";
check("the caveat names DNO data as what headroom needs",
  /DNO/.test(title) && /impedance/i.test(title), title.slice(0, 200));
check("the caveat says headroom needs a connection study",
  /connection study/i.test(title), title.slice(0, 200));
check("the caveat states absence from a layer is not absence on the ground",
  /absence on the ground/i.test(title), title.slice(0, 200));
check("the caveat names the canonical implementation",
  /grid-distance-maths/.test(title), title.slice(0, 300));

// A cell tooltip must carry the same limits as the strip, or a user who reads
// only the cell is told less than one who reads only the note.
const measured = first.find((tr) => kmOf(byRef.get(tr.id.replace(/^repd-/, "")) ?? []) !== null);
const cellTitle = measured ? cellsOf(measured)[gridIndex].querySelector("span")?.getAttribute("title") ?? "" : "";
check("a measured cell carries the straight-line caveat",
  /not a cable route/i.test(cellTitle), cellTitle.slice(0, 160));
check("a measured cell carries the headroom caveat",
  /headroom/i.test(cellTitle) && /impedance/i.test(cellTitle), cellTitle.slice(0, 240));

// ------------------------------------------------------ the numbers are the panel's --
const proximityFile = (await readFile(join(root, "data", "202608291447-registry.json"), "utf8"))
  .match(/"(\d{12})-grid-proximity\.json"/);
if (proximityFile) {
  const panel = JSON.parse(await readFile(
    join(root, "data", `${proximityFile[1]}-grid-proximity.json`), "utf8"));
  let same = 0;
  let differ = 0;
  for (const row of panel.rows) {
    const mine = payload.grid[String(row.ref)];
    const theirs = row.circuit?.km;
    if (mine === undefined || theirs === undefined || theirs === null) continue;
    if (Math.abs(mine.k - theirs) < 1e-9) same += 1; else differ += 1;
  }
  check("every column value is the GRID panel's own number", differ === 0,
    `${same} identical, ${differ} differ`);
}

// ------------------------------------------------------------------ report --
console.log(`\ngrid-distance-column proof: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES");
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("the column renders, sorts, blanks honestly, and carries its caveat.");
