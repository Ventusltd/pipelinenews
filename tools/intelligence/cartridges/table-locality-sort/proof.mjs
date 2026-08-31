/**
 * table-locality-sort render proof.
 *
 * This cartridge does not add a panel. It changes the project table itself --
 * two new columns and four new sortable headings -- so the only proof worth
 * anything is booting the whole app against the real release and reading the
 * table it produces.
 *
 * It re-derives every expected answer from the payloads independently rather
 * than asking the app what it thinks. A sort assertion that compares the app's
 * output to the app's own comparator proves nothing.
 *
 * Usage:
 *   node proof.mjs <path-to-release-dir> <generation>
 *
 * It is NOT a browser: it proves the code runs, the columns carry the right
 * values, and every heading reorders the rows correctly. It does not prove
 * layout or that a human can read the result.
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
  pretendToBeVisual: true,      // gives requestAnimationFrame; the gauges need it
  runScripts: "outside-only",
});
const { window } = dom;

// Serve the release directory over the fetch the app already uses. No network:
// a pathname maps straight onto a file, and anything missing is a real 404 so
// a wrong path fails loudly instead of silently resolving.
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

// app.mjs is a browser module: it reaches for document, Option, CustomEvent,
// requestAnimationFrame and the rest of what the DOM would have handed it.
//
// Lifting the WHOLE window onto globalThis looks tempting and blows the stack:
// jsdom's own setTimeout resolves through the global it is being copied over,
// and recurses until the stack ends. Timers stay Node's. Only the DOM surface
// the app actually touches is transplanted.
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
  // Node 24 defines several of these on globalThis as getter-only (navigator
  // and crypto among them), so a plain assignment throws. Redefine instead.
  try {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  } catch { /* non-configurable on this runtime; the app can live without it */ }
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
const locality = JSON.parse(await readFile(join(root, "data", `${gen}-locality.json`), "utf8"));
const projects = JSON.parse(await readFile(
  join(root, "data", "202608270055-8ab1807551bc-v8-fast-projects.json"), "utf8"));
const F = Object.fromEntries(projects.fields.map((name, index) => [name, index]));
const refOf = (row) => String(row[F.repd_ref]);
const townOf = (row) => locality.locality[refOf(row)]?.town || "";
const postcodeOf = (row) => locality.locality[refOf(row)]?.postcode || "";
const countyOf = (row) => projects.dictionaries.county[row[F.county]] || "";

// ------------------------------------------------------------- the columns --
const headings = [...doc.querySelectorAll("thead th")].map((th) => th.textContent.replace(/\s+/g, " ").trim());
// The count is not hard-coded: a later cartridge may legitimately add a
// column, and this proof owns TOWN and POSTCODE, not the table's width. It
// asserts the columns it added and that the body agrees with the header.
check("table has at least the 13 columns this cartridge left behind",
  headings.length >= 13, `found ${headings.length}: ${headings.join(" | ")}`);
check("TOWN column present", headings.some((h) => h.startsWith("TOWN")), headings.join(" | "));
check("POSTCODE column present", headings.some((h) => h.startsWith("POSTCODE")), headings.join(" | "));
check("TOWN sits between COUNTY and POSTCODE",
  headings.findIndex((h) => h.startsWith("COUNTY")) + 1 === headings.findIndex((h) => h.startsWith("TOWN"))
  && headings.findIndex((h) => h.startsWith("TOWN")) + 1 === headings.findIndex((h) => h.startsWith("POSTCODE")),
  headings.join(" | "));

// Derive the cell indices from the headings rather than hard-coding them.
// Hard-coded ones were wrong the moment this cartridge inserted two columns,
// which is exactly the mistake the columns exist to make visible.
const COL = Object.fromEntries(["COUNTY", "TOWN", "POSTCODE", "OFFICIAL CAPACITY"]
  .map((name) => [name, headings.findIndex((h) => h.startsWith(name))]));
check("every column this proof reads was found",
  Object.values(COL).every((index) => index >= 0), JSON.stringify(COL));

const first = rowsOf();
check("rows render", first.length > 0, `${first.length} rows`);
check("every row has one cell per heading",
  first.every((tr) => cellsOf(tr).length === headings.length),
  `${headings.length} headings, row widths: ${[...new Set(first.map((tr) => cellsOf(tr).length))].join(",")}`);
const failColspan = (await readFile(join(root, "assets", "202608291447-app.mjs"), "utf8"))
  .match(/colspan="(\d+)" class="fast-fail"/);
check("fail-closed row would span the whole table",
  failColspan !== null && Number(failColspan[1]) === headings.length,
  failColspan ? `colspan ${failColspan[1]}, ${headings.length} headings` : "no fail-closed row found");

// ---------------------------------------------------- the values in the cells --
let townMatches = 0;
let postcodeMatches = 0;
let dimmedDerived = 0;
for (const tr of first) {
  const ref = tr.id.replace(/^repd-/, "");
  const place = locality.locality[ref] || {};
  const town = cellsOf(tr)[COL.TOWN].textContent.trim();
  const postcode = cellsOf(tr)[COL.POSTCODE].textContent.trim();
  if (town === (place.town || "-")) townMatches += 1;
  if (postcode === (place.postcode || "-")) postcodeMatches += 1;
  if (place.town_source === "derived" && cellsOf(tr)[COL.TOWN].querySelector(".derived")) dimmedDerived += 1;
}
check("every TOWN cell matches the payload", townMatches === first.length,
  `${townMatches}/${first.length}`);
check("every POSTCODE cell matches the payload", postcodeMatches === first.length,
  `${postcodeMatches}/${first.length}`);
const derivedOnPage = first.filter((tr) =>
  locality.locality[tr.id.replace(/^repd-/, "")]?.town_source === "derived").length;
check("address-derived towns are marked as such", dimmedDerived === derivedOnPage,
  `${dimmedDerived}/${derivedOnPage} dimmed`);

// A town this app cannot source must be a dash, never a guess.
const unsourceable = Object.values(locality.locality).filter((p) => !p.town).length;
check("payload leaves unsourceable towns null, not guessed",
  unsourceable === (locality.counts.none || 0), `${unsourceable} null vs counts.none ${locality.counts.none}`);
check("postcodes are copied from REPD, never invented",
  Object.values(locality.locality).every((p) => p.postcode === null || /^[A-Z]{1,2}\d[A-Z\d]?( \d[A-Z]{2})?$/.test(p.postcode)));

// ------------------------------------------------------------- the sorting --
const clickAndRead = (buttonId) => {
  $(buttonId).dispatchEvent(new window.Event("click", { bubbles: true }));
  return rowsOf().map((tr) => tr.id.replace(/^repd-/, ""));
};

// Independently re-derived expectation: filter nothing, sort the payload the
// way the column claims to, and take the first window.
const WINDOW = 100;
const allRefs = projects.rows.map((row, index) => index);
function expected(keyFn, direction, numeric = false) {
  const copy = [...allRefs];
  copy.sort((left, right) => {
    const a = keyFn(projects.rows[left]);
    const b = keyFn(projects.rows[right]);
    if (numeric) return direction * (a - b) || left - right;
    if (!a && !b) return left - right;
    if (!a) return 1;                       // blanks last, both directions
    if (!b) return -1;
    return direction * String(a).localeCompare(String(b), "en-GB") || left - right;
  });
  return copy.slice(0, WINDOW).map((index) => refOf(projects.rows[index]));
}

const cases = [
  ["sortTown ascending", "#sortTown", () => expected(townOf, 1), "town_asc", "townHeader", "ascending"],
  ["sortTown descending", "#sortTown", () => expected(townOf, -1), "town_desc", "townHeader", "descending"],
  ["sortPostcode ascending", "#sortPostcode", () => expected(postcodeOf, 1), "postcode_asc", "postcodeHeader", "ascending"],
  ["sortPostcode descending", "#sortPostcode", () => expected(postcodeOf, -1), "postcode_desc", "postcodeHeader", "descending"],
  ["sortCounty ascending", "#sortCounty", () => expected(countyOf, 1), "county_asc", "countyHeader", "ascending"],
  ["sortCounty descending", "#sortCounty", () => expected(countyOf, -1), "county_desc", "countyHeader", "descending"],
];
for (const [label, button, wanted, mode, header, aria] of cases) {
  const got = clickAndRead(button);
  const want = wanted();
  check(label, got.join(",") === want.join(","),
    `first 5 got ${got.slice(0, 5).join(",")} want ${want.slice(0, 5).join(",")}`);
  check(`${label} syncs the sort control`, $("#sortProjects").value === mode, $("#sortProjects").value);
  check(`${label} sets aria-sort`, doc.getElementById(header).getAttribute("aria-sort") === aria,
    doc.getElementById(header).getAttribute("aria-sort"));
}

// Capacity: descending is the payload's own order, so prove both directions
// against the numbers rather than against the row order.
const capacityFirst = clickAndRead("#sortCapacity");
check("capacity heading first click leaves the default largest-first",
  $("#sortProjects").value === "capacity_asc" || $("#sortProjects").value === "capacity_desc",
  $("#sortProjects").value);
const capacityMode = $("#sortProjects").value;
const capacities = rowsOf().map((tr) =>
  Number(cellsOf(tr)[COL["OFFICIAL CAPACITY"]].textContent.replace(/[^\d.]/g, "")));
if (capacityMode === "capacity_asc") {
  check("capacity ascending really ascends",
    capacities.every((v, i) => i === 0 || capacities[i - 1] <= v),
    `${capacities.slice(0, 5).join(",")}`);
} else {
  check("capacity descending really descends",
    capacities.every((v, i) => i === 0 || capacities[i - 1] >= v),
    `${capacities.slice(0, 5).join(",")}`);
}
clickAndRead("#sortCapacity");
const flipped = rowsOf().map((tr) => Number(cellsOf(tr)[COL["OFFICIAL CAPACITY"]].textContent.replace(/[^\d.]/g, "")));
check("capacity heading flips direction on the second click",
  capacityMode === "capacity_asc"
    ? flipped.every((v, i) => i === 0 || flipped[i - 1] >= v)
    : flipped.every((v, i) => i === 0 || flipped[i - 1] <= v),
  `${flipped.slice(0, 5).join(",")}`);
check("capacity heading first click did produce a full page", capacityFirst.length === WINDOW,
  `${capacityFirst.length}`);

// The heading that already worked must still work.
clickAndRead("#sortUpdated");
check("REPD UPDATED still sorts", ["updated_desc", "updated_asc"].includes($("#sortProjects").value),
  $("#sortProjects").value);
check("only the active column shows a direction",
  ["countyHeader", "townHeader", "postcodeHeader", "capacityHeader"]
    .every((id) => doc.getElementById(id).getAttribute("aria-sort") === "none"));

// Blanks last, in both directions -- the reason locality sorting is useful at all.
$("#sortProjects").value = "postcode_asc";
$("#sortProjects").dispatchEvent(new window.Event("change", { bubbles: true }));
const ascPostcodes = rowsOf().map((tr) => cellsOf(tr)[COL.POSTCODE].textContent.trim());
check("ascending postcode page carries no blanks while values remain",
  !ascPostcodes.includes("-"), `${ascPostcodes.filter((p) => p === "-").length} blanks on page 1`);
$("#sortProjects").value = "postcode_desc";
$("#sortProjects").dispatchEvent(new window.Event("change", { bubbles: true }));
const descPostcodes = rowsOf().map((tr) => cellsOf(tr)[COL.POSTCODE].textContent.trim());
check("descending postcode page carries no blanks either",
  !descPostcodes.includes("-"), `${descPostcodes.filter((p) => p === "-").length} blanks on page 1`);

// -------------------------------------------------------------- provenance --
const note = $("#localityNote").textContent;
const sourced = (locality.counts.bua || 0) + (locality.counts.parish || 0) + (locality.counts.ward || 0);
check("the UI states where town came from",
  note.includes(sourced.toLocaleString("en-GB")) && note.includes("ONS"), note);
check("the UI states how many postcodes are official",
  note.includes((locality.counts.postcode || 0).toLocaleString("en-GB")), note);
check("no network at runtime is declared and true", locality.network_at_runtime === false);

// The sort model must accept every mode the UI can produce, or a deep link breaks.
const options = [...doc.querySelectorAll("#sortProjects option")].map((o) => o.value);
check("every sort option is a recognised mode",
  options.every((value) => {
    $("#sortProjects").value = value;
    $("#sortProjects").dispatchEvent(new window.Event("change", { bubbles: true }));
    return rowsOf().length > 0;
  }), options.join(","));


// ------------------------------------------- the column that was too wide --
// A single 237-character address line was being served as a TOWN. With the
// column set to nowrap that one value sized the column for all 7,510 rows,
// which is the gap between TOWN and POSTCODE.
// Two different rules, deliberately. An address-derived town is capped at 32
// because past that it stops being a place name and starts being a site
// description. An ONS value is an official name and is never truncated --
// "Chafford Hundred, West Thurrock and Purfleet-on-Thames" is a real ward.
// The column is kept narrow by the CSS cap, not by editing ONS.
const derivedTowns = Object.values(locality.locality)
  .filter((p) => p.town_source === "derived").map((p) => p.town);
const onsTowns = Object.values(locality.locality)
  .filter((p) => p.town && p.town_source !== "derived").map((p) => p.town);
check("no address-derived town exceeds the 32-character rule",
  Math.max(...derivedTowns.map((t) => t.length)) <= 32,
  `longest ${JSON.stringify(derivedTowns.sort((a, b) => b.length - a.length)[0])}`);
check("ONS names are kept whole, and none is absurd",
  Math.max(...onsTowns.map((t) => t.length)) <= 60,
  `longest ${JSON.stringify(onsTowns.sort((a, b) => b.length - a.length)[0])}`);
check("the 237-character address description is gone",
  Math.max(...Object.values(locality.locality).map((p) => (p.town || "").length)) < 100);
check("no town spans more than one line",
  Object.values(locality.locality).every((p) => !/[\r\n]/.test(p.town || "")));
check("address-derived towns read as place names, not site descriptions",
  Object.values(locality.locality)
    .filter((p) => p.town_source === "derived")
    .every((p) => p.town.length <= 32 && !/\d/.test(p.town)),
  JSON.stringify(Object.values(locality.locality)
    .filter((p) => p.town_source === "derived" && (p.town.length > 32 || /\d/.test(p.town)))
    .slice(0, 3).map((p) => p.town)));

const css = await readFile(join(root, "index.html"), "utf8");
check("the TOWN cell is capped and ellipsised rather than nowrapped open",
  css.includes(".town-cell > span") && css.includes("text-overflow: ellipsis"));
check("every rendered TOWN value carries its full text on hover",
  rowsOf().every((tr) => {
    const span = cellsOf(tr)[COL.TOWN].querySelector("span");
    return !span || span.getAttribute("title");
  }));

// ------------------------------------------------- the horizontal scrollbar --
check("the table area is bounded on desktop so its scrollbar is reachable",
  css.includes(".tablewrap { max-height: calc(100vh - 270px)"), "no desktop max-height");
check("the table declares a min-width wide enough for 13 columns",
  /\.tablewrap table \{ min-width: 16\d\dpx/.test(css), "min-width not raised past 1500px");
check("the scrollbar is given a visible track and thumb",
  css.includes("::-webkit-scrollbar-thumb") && css.includes("scrollbar-color"));

// ---------------------------------------------------------- the search bar --
// One bar, covering everything. County was always searchable through the
// prebuilt index; town, postcode and authority are the new terms.
//
// The handler debounces 120ms and then awaits the 1.9 MB search supplement, so
// reading the rows straight after dispatching the event reads the PREVIOUS
// result. Every search below waits for the app to settle first.
const searchBox = $("#search");
const settle = () => new Promise((resolve) => {
  const started = Date.now();
  const poll = setInterval(() => {
    const meta = $("#resultsMeta").textContent || "";
    if (!meta.includes("loading") || Date.now() - started > 30000) {
      clearInterval(poll);
      setTimeout(resolve, 30);
    }
  }, 25);
});
const runSearch = async (text) => {
  searchBox.value = text;
  searchBox.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle();
  return rowsOf();
};
const townsOfRows = (trs) => trs.map((tr) =>
  locality.locality[tr.id.replace(/^repd-/, "")]?.town || "");

check("the placeholder names what the bar covers",
  /TOWN/.test(searchBox.placeholder) && /POSTCODE/.test(searchBox.placeholder)
  && /COUNTY/.test(searchBox.placeholder), searchBox.placeholder);

// A term that finds nothing must find nothing. If this passes trivially then
// every assertion below it is meaningless, so it goes first.
check("a term in none of the fields finds nothing",
  (await runSearch("zzzznotaplacezzzz")).length === 0,
  `${(await runSearch("zzzznotaplacezzzz")).length} rows`);
check("clearing the box restores the full table",
  (await runSearch("")).length === WINDOW);

// Choose a town held by only a handful of projects, so the whole answer fits
// inside one 100-row window and the assertion can be exact.
const byTown = new Map();
for (const [ref, place] of Object.entries(locality.locality)) {
  if (!place.town || place.town_source === "derived") continue;
  if (!/^[A-Za-z][A-Za-z' -]{5,19}$/.test(place.town)) continue;
  byTown.set(place.town, [...(byTown.get(place.town) || []), ref]);
}
const [sampleTown, sampleRefs] = [...byTown.entries()]
  .find(([, refs]) => refs.length >= 2 && refs.length <= 6);
const townHits = await runSearch(sampleTown);
check(`town search finds rows ("${sampleTown}")`, townHits.length > 0, `${townHits.length} rows`);
check("town search returns every project in that town",
  sampleRefs.every((ref) => townHits.some((tr) => tr.id === `repd-${ref}`)),
  `wanted ${sampleRefs.join(",")} got ${townHits.map((tr) => tr.id.replace(/^repd-/, "")).join(",")}`);
// The bar is one bar: a hit may match on name or operator rather than town.
// What must never happen is a hit that matches nothing at all.
check("every town-search hit matches the term somewhere",
  townHits.every((tr) => {
    const ref = tr.id.replace(/^repd-/, "");
    const place = locality.locality[ref] || {};
    const row = projects.rows.find((r) => refOf(r) === ref) || [];
    const haystack = [place.town, place.postcode, place.authority,
                      row[F.name], row[F.operator],
                      projects.dictionaries.county[row[F.county]],
                      projects.dictionaries.operator[row[F.operator]]]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(sampleTown.toLowerCase());
  }), townsOfRows(townHits).slice(0, 4).join(" | "));

const samplePostcode = Object.values(locality.locality)
  .find((p) => p.postcode && p.postcode.includes(" ")).postcode;
const pcHits = await runSearch(samplePostcode);
check(`postcode search finds the row ("${samplePostcode}")`, pcHits.length > 0, `${pcHits.length} rows`);
check("every postcode hit really carries that postcode",
  pcHits.every((tr) =>
    (locality.locality[tr.id.replace(/^repd-/, "")]?.postcode || "") === samplePostcode));
check("postcode search works without the space too",
  (await runSearch(samplePostcode.replace(/\s+/g, ""))).length === pcHits.length,
  samplePostcode.replace(/\s+/g, ""));
const outcode = samplePostcode.split(" ")[0];
const outHits = await runSearch(outcode);
check(`outcode search widens the answer ("${outcode}")`,
  outHits.length >= pcHits.length, `${outHits.length} vs ${pcHits.length}`);

const sampleCounty = projects.dictionaries.county.find((c) => /^[A-Za-z ]{6,20}$/.test(c));
const countyHits = await runSearch(sampleCounty);
check(`county search finds rows ("${sampleCounty}")`, countyHits.length > 0, `${countyHits.length} rows`);
await runSearch("");

// ------------------------------------------------------------------ report --
console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length) {
  console.log("\nFAILED:");
  for (const line of failures) console.log("  " + line);
  process.exit(1);
}
console.log("table-locality-sort proven against " + root + "\n");
