/**
 * grid-actions-inline render proof.
 *
 * The GRID column is gone and the two distances now live inside ACTIONS. That
 * is a placement change, so the things worth proving are: the numbers survived
 * the move unchanged, the substation distance is real, the caveats travelled
 * with them, and the sort that used to hang off the heading still works from
 * the dropdown.
 *
 * Every count and value is re-derived from the payloads, never read back out of
 * the element it came from.
 *
 *   node proof.mjs <release-dir> <generation> <grid-distance-generation>
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";

const root = process.argv[2];
const gen = process.argv[3];
const gridGen = process.argv[4] ?? gen;
if (!root || !gen) {
  console.error("usage: node proof.mjs <release-dir> <generation> [grid-gen]");
  process.exit(2);
}

let passed = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  if (ok) passed += 1; else failures.push(`${label}${detail ? ` -- ${detail}` : ""}`);
};

const html = await readFile(join(root, "index.html"), "utf8");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;
window.fetch = async (i) => {
  const u = new URL(String(i?.url ?? i), "http://localhost/");
  try {
    const b = await readFile(join(root, decodeURIComponent(u.pathname).replace(/^\//, "")), "utf8");
    return { ok: true, status: 200, json: async () => JSON.parse(b), text: async () => b };
  } catch { return { ok: false, status: 404, json: async () => ({}), text: async () => "" }; }
};
const K = ["document","location","history","navigator","screen","matchMedia","getComputedStyle","requestAnimationFrame","cancelAnimationFrame","Event","CustomEvent","EventTarget","AbortController","AbortSignal","Node","Element","HTMLElement","HTMLInputElement","HTMLSelectElement","HTMLOptionElement","Option","Image","DocumentFragment","NodeList","DOMParser","XMLHttpRequest","FormData","Blob","URL","URLSearchParams","MutationObserver","IntersectionObserver","ResizeObserver","localStorage","sessionStorage","innerWidth","innerHeight"];
for (const k of K) { let v; try { v = window[k]; } catch { continue; } if (v === undefined) continue;
  try { Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true }); } catch {} }
for (const [k, v] of [["window", window], ["fetch", window.fetch], ["crypto", webcrypto],
  ["addEventListener", window.addEventListener.bind(window)], ["dispatchEvent", window.dispatchEvent.bind(window)]])
  Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true });

await import(pathToFileURL(join(root, "assets", "202608291447-app.mjs")).href);
const ready = await new Promise((r) => { const t = Date.now(); const p = setInterval(() => {
  if (window.document.body.dataset.fastReady === "true") { clearInterval(p); r(true); }
  else if (window.document.body.dataset.fastFailed === "true") { clearInterval(p); r(false); }
  else if (Date.now() - t > 60000) { clearInterval(p); r(false); } }, 40); });
check("app boots", ready);
if (!ready) { console.error("did not boot"); console.error(failures.join("\n")); process.exit(1); }

const doc = window.document;
const $ = (s) => doc.querySelector(s);
const rowsOf = () => [...doc.querySelectorAll("#tbody tr")];

// ------------------------------------------------------- the payloads -----
const subs = JSON.parse(await readFile(join(root, "data", `${gen}-substation-33kv.json`), "utf8"));
const grid = JSON.parse(await readFile(join(root, "data", `${gridGen}-grid-distance.json`), "utf8"));

check("substation payload schema", subs.schema === "pipelinenews.substation-33kv.v1", subs.schema);
check("substation payload generation matches the release", subs.generation === gen, subs.generation);
check("substation scope is 33 kV and above", subs.scope?.minimum_kv === 33, String(subs.scope?.minimum_kv));
check("the scope records why 11 kV is excluded",
  /behind the meter/i.test(subs.scope?.why ?? ""), subs.scope?.why);
check("every substation in the layer qualifies, so nothing is silently dropped",
  subs.scope?.qualifying === subs.scope?.layer_features && subs.scope?.excluded_below_33kv === 0,
  `${subs.scope?.qualifying} of ${subs.scope?.layer_features}, ${subs.scope?.excluded_below_33kv} excluded`);
check("the substation payload makes no runtime network claim", subs.network_at_runtime === false);
check("the substation caveat names DNO impedance and a study",
  /impedance/i.test(subs.caveat?.headroom ?? "") && /connection study/i.test(subs.caveat?.headroom ?? ""),
  subs.caveat?.headroom?.slice(0, 120));

// ------------------------------------------------- the column is gone -----
const headings = [...doc.querySelectorAll("thead th")].map((th) => th.textContent.replace(/\s+/g, " ").trim());
check("the table is back to 13 columns", headings.length === 13, `${headings.length}: ${headings.join(" | ")}`);
check("no GRID heading remains", !headings.some((h) => h.startsWith("GRID")), headings.join(" | "));
check("no GRID header element remains", doc.getElementById("gridHeader") === null);
const app = await readFile(join(root, "assets", "202608291447-app.mjs"), "utf8");
const colspan = app.match(/colspan="(\d+)" class="fast-fail"/);
check("fail-closed row spans 13", colspan && colspan[1] === "13", colspan?.[1]);
const rows = rowsOf();
check("every row has 13 cells", rows.every((tr) => tr.querySelectorAll("td").length === 13),
  [...new Set(rows.map((tr) => tr.querySelectorAll("td").length))].join(","));

// ------------------------------------------- the metrics live in ACTIONS --
const actionsIndex = headings.findIndex((h) => h.startsWith("ACTIONS"));
check("ACTIONS is still the last column", actionsIndex === headings.length - 1, String(actionsIndex));

const projects = JSON.parse(await readFile(
  join(root, "data", "202608270055-8ab1807551bc-v8-fast-projects.json"), "utf8"));
const F = Object.fromEntries(projects.fields.map((n, i) => [n, i]));
const refOf = (r) => String(r[F.repd_ref]);
const byRef = new Map(projects.rows.map((r) => [refOf(r), r]));

let gridOk = 0; let subOk = 0; let gridDash = 0; let subDash = 0; let orderOk = 0;
for (const tr of rows) {
  const ref = tr.id.replace(/^repd-/, "");
  const cell = [...tr.querySelectorAll("td")][actionsIndex];
  const chips = [...cell.querySelectorAll(".action-metric")];
  const kids = [...cell.querySelector(".project-actions").children];
  const mapAt = kids.findIndex((e) => /MAP/.test(e.textContent));
  const gridAt = kids.findIndex((e) => e.classList.contains("action-metric") && /GRID/.test(e.textContent));
  const subAt = kids.findIndex((e) => e.classList.contains("action-metric") && /SUB/.test(e.textContent));
  if (mapAt !== -1 && gridAt === mapAt + 1 && subAt === gridAt + 1) orderOk += 1;

  const g = grid.grid[ref];
  const s = subs.substation[ref];
  const gText = chips.find((c) => /GRID/.test(c.textContent))?.textContent.replace(/\s+/g, "") ?? "";
  const sText = chips.find((c) => /SUB/.test(c.textContent))?.textContent.replace(/\s+/g, "") ?? "";
  if (g) { if (gText.includes(g.k.toFixed(2))) gridOk += 1; } else { if (gText.includes("-")) gridDash += 1; }
  if (s) { if (sText.includes(s.k.toFixed(2))) subOk += 1; } else { if (sText.includes("-")) subDash += 1; }
}
check("MAP, then GRID, then SUB, in that order on every row",
  orderOk === rows.length, `${orderOk} of ${rows.length}`);
check("every GRID chip matches the payload or is a dash",
  gridOk + gridDash === rows.length, `${gridOk} matched, ${gridDash} dashed, of ${rows.length}`);
check("every SUB chip matches the payload or is a dash",
  subOk + subDash === rows.length, `${subOk} matched, ${subDash} dashed, of ${rows.length}`);
check("the substation distance is present on real rows, not universally blank",
  subOk > 0, `${subOk} populated`);

const measuredChip = [...doc.querySelectorAll(".action-metric")].find((c) => /SUB/.test(c.textContent) && /\d/.test(c.textContent));
const subTitle = measuredChip?.getAttribute("title") ?? "";
check("a SUB chip says 33 kV or above", /33 kV or above/i.test(subTitle), subTitle.slice(0, 120));
check("a SUB chip carries the capacity caveat",
  /does not confirm capacity/i.test(subTitle), subTitle.slice(0, 160));
check("a SUB chip carries the headroom caveat",
  /impedance/i.test(subTitle) && /connection study/i.test(subTitle), subTitle.slice(0, 200));

const gridChip = [...doc.querySelectorAll(".action-metric")].find((c) => /GRID/.test(c.textContent) && /\d/.test(c.textContent));
const gridTitle = gridChip?.getAttribute("title") ?? "";
check("a GRID chip still says it is not a cable route",
  /not a cable route/i.test(gridTitle), gridTitle.slice(0, 160));
check("a GRID chip still carries the headroom caveat",
  /impedance/i.test(gridTitle) && /connection study/i.test(gridTitle), gridTitle.slice(0, 200));

// ------------------------------------------------- the sort survived ------
const options = [...doc.querySelectorAll("#sortProjects option")].map((o) => o.value);
check("grid_asc is still offered in the sort control", options.includes("grid_asc"), options.join(","));
check("grid_desc is still offered", options.includes("grid_desc"));

const kmOf = (row) => { const h = grid.grid[refOf(row)]; return h && typeof h.k === "number" ? h.k : null; };
const WINDOW = 100;
const expected = (direction) => {
  const order = projects.rows.map((_r, i) => i);
  order.sort((l, r) => {
    const a = kmOf(projects.rows[l]); const b = kmOf(projects.rows[r]);
    if (a === null && b === null) return l - r;
    if (a === null) return 1;
    if (b === null) return -1;
    return direction * (a - b) || l - r;
  });
  return order.slice(0, WINDOW).map((i) => refOf(projects.rows[i]));
};
for (const [mode, dir] of [["grid_asc", 1], ["grid_desc", -1]]) {
  $("#sortProjects").value = mode;
  $("#sortProjects").dispatchEvent(new window.Event("change", { bubbles: true }));
  const got = rowsOf().map((tr) => tr.id.replace(/^repd-/, ""));
  const want = expected(dir);
  check(`${mode} still orders the register correctly from the dropdown`,
    got.join(",") === want.join(","),
    `first 5 got ${got.slice(0, 5).join(",")} want ${want.slice(0, 5).join(",")}`);
}

// ------------------------------------------------------- the strip --------
const note = doc.getElementById("gridDistanceNote");
const noteText = note?.textContent ?? "";
check("the strip names both metrics", /GRID/.test(noteText) && /SUB/.test(noteText), noteText.slice(0, 160));
check("the strip says where they now are", /ACTIONS/i.test(noteText), noteText.slice(0, 160));
check("the strip still marks the work BETA", /BETA/.test(noteText));
check("the strip states headroom needs DNO data and a study",
  /impedance/i.test(noteText) && /connection study/i.test(noteText), noteText.slice(0, 260));

console.log(`\ngrid-actions-inline proof: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES");
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("GRID and SUB sit beside MAP, carry their caveats, and the sort survived the column.");
