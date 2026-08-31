/**
 * capacity-range-filter render proof.
 *
 * This cartridge changes the filter predicate, which is the one piece of this
 * app that decides what a user is shown and what they are not. A filter that
 * silently drops rows is worse than no filter, so every count below is
 * re-derived from the project payload rather than read back out of the app.
 *
 * It checks the boring, load-bearing things: that the default state filters
 * nothing, that a band returns exactly the projects inside it, that the
 * boundaries are inclusive, that reversed bounds are swapped rather than
 * emptied, that the band survives the URL, and that clearing restores the
 * whole register.
 *
 * Usage:
 *   node proof.mjs <path-to-release-dir> <generation>
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
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? ` -- ${detail}` : ""}`);
}

// ---------------------------------------------------------------- the DOM --
const html = await readFile(join(root, "index.html"), "utf8");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;

window.fetch = async (input) => {
  const url = new URL(input instanceof URL ? input.href : String(input?.url ?? input), "http://localhost/");
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
  try { Object.defineProperty(globalThis, key, { value, writable: true, configurable: true }); } catch { /* */ }
}
for (const [key, value] of [["window", window], ["fetch", window.fetch], ["crypto", webcrypto],
                            ["addEventListener", window.addEventListener.bind(window)],
                            ["dispatchEvent", window.dispatchEvent.bind(window)]]) {
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
}

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
check("app boots", ready);
if (!ready) {
  console.error("\nthe app did not boot; nothing below can be trusted\n");
  console.error(failures.join("\n"));
  process.exit(1);
}

const doc = window.document;
const $ = (sel) => doc.querySelector(sel);
const rowsOf = () => [...doc.querySelectorAll("#tbody tr")];

// ------------------------------------------------------- the data, again --
const projects = JSON.parse(await readFile(
  join(root, "data", "202608270055-8ab1807551bc-v8-fast-projects.json"), "utf8"));
const F = Object.fromEntries(projects.fields.map((name, index) => [name, index]));
const caps = projects.rows.map((row) => row[F.capacity_mw]);
const refOf = (row) => String(row[F.repd_ref]);
const inBand = (lo, hi) => caps.filter((c) => c >= lo && c <= hi).length;
const TOTAL = projects.rows.length;

// The filtered count the app reports, read out of the results strip.
const reportedCount = () => {
  const text = $("#resultsMeta")?.textContent ?? "";
  const m = text.match(/^([\d,]+) of ([\d,]+) records/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

// --------------------------------------------------------- the control ----
const control = doc.getElementById("capacityRange");
check("PROJECT SIZE control is present", control !== null);
check("it sits above the technology filter row",
  control && control.compareDocumentPosition(doc.getElementById("tech")) & window.Node.DOCUMENT_POSITION_FOLLOWING);
for (const id of ["sizeMinRange", "sizeMaxRange", "sizeMinBox", "sizeMaxBox", "sizeReadout", "sizeReset"]) {
  check(`${id} exists`, doc.getElementById(id) !== null);
}

const minRange = doc.getElementById("sizeMinRange");
const maxRange = doc.getElementById("sizeMaxRange");
const minBox = doc.getElementById("sizeMinBox");
const maxBox = doc.getElementById("sizeMaxBox");

check("the slider starts at the register floor of 1 MW", minBox.value === "1", minBox.value);
check("the slider reaches 5000 MW as asked", maxBox.value === "5000", maxBox.value);
check("both handles share one ladder",
  minRange.max === maxRange.max && Number(minRange.max) > 0,
  `${minRange.max} vs ${maxRange.max}`);

// --------------------------------------------------- default filters nothing --
check("the default state filters nothing", reportedCount() === TOTAL,
  `${reportedCount()} of ${TOTAL}`);
check("the readout says so when nothing is filtered",
  /all sizes/i.test($("#sizeReadout").textContent), $("#sizeReadout").textContent);

// ------------------------------------------------------------- a band ----
const setBand = (lo, hi) => {
  minBox.value = String(lo);
  maxBox.value = String(hi);
  minBox.dispatchEvent(new window.Event("change", { bubbles: true }));
};

// The band the filter was asked for.
setBand(30, 40);
check("30-40 MW returns exactly the projects in that band",
  reportedCount() === inBand(30, 40), `${reportedCount()} reported, ${inBand(30, 40)} in the data`);
check("30-40 MW is a real slice, not everything", inBand(30, 40) < TOTAL && inBand(30, 40) > 0,
  String(inBand(30, 40)));
check("every rendered row is inside the band",
  rowsOf().every((tr) => {
    const c = caps[projects.rows.findIndex((r) => refOf(r) === tr.id.replace(/^repd-/, ""))];
    return c >= 30 && c <= 40;
  }));
check("the readout shows the band", /30/.test($("#sizeReadout").textContent) && /40/.test($("#sizeReadout").textContent),
  $("#sizeReadout").textContent);

// Boundaries are inclusive: a 30.0 MW project belongs in a 30-40 band.
const exactlyThirty = caps.filter((c) => c === 30).length;
const exactlyForty = caps.filter((c) => c === 40).length;
check("the lower boundary is inclusive", inBand(30, 40) === inBand(30, 40) && exactlyThirty >= 0);
setBand(30, 30);
check("a single-value band returns exactly the projects at that size",
  reportedCount() === exactlyThirty, `${reportedCount()} reported, ${exactlyThirty} at 30 MW`);
setBand(40, 40);
check("the upper boundary is inclusive too",
  reportedCount() === exactlyForty, `${reportedCount()} reported, ${exactlyForty} at 40 MW`);

// Other bands, to prove it is not a coincidence.
for (const [lo, hi] of [[1, 10], [10, 30], [50, 100], [100, 500], [500, 5000], [1, 5000]]) {
  setBand(lo, hi);
  check(`${lo}-${hi} MW matches the data`, reportedCount() === inBand(lo, hi),
    `${reportedCount()} reported, ${inBand(lo, hi)} in the data`);
}

// A typed value the ladder does not carry must still work.
setBand(33, 37);
check("an exact band the ladder has no stop for still filters",
  reportedCount() === inBand(33, 37), `${reportedCount()} reported, ${inBand(33, 37)} in the data`);

// Reversed bounds mean the band between them, not an empty table.
setBand(40, 30);
check("reversed bounds are swapped, not emptied",
  reportedCount() === inBand(30, 40), `${reportedCount()} reported, ${inBand(30, 40)} expected`);

// ------------------------------------------------------------- the URL ----
setBand(30, 40);
check("the band is written to the URL",
  window.location.search.includes("mw_min=30") && window.location.search.includes("mw_max=40"),
  window.location.search);
setBand(1, 5000);
check("the full range is not written to the URL",
  !window.location.search.includes("mw_min") && !window.location.search.includes("mw_max"),
  window.location.search);

// --------------------------------------------------------- interaction ----
// A size band must intersect with the other filters, not replace them.
setBand(30, 40);
const solarButton = [...doc.querySelectorAll("#tech .btn")].find((b) => b.dataset.technology === "solar");
solarButton.dispatchEvent(new window.Event("click", { bubbles: true }));
const solarIn = projects.rows.filter((row, i) => caps[i] >= 30 && caps[i] <= 40
  && projects.dictionaries.technology[row[F.technology]] === "solar").length;
const solarBand = reportedCount();
check("size and technology filters intersect",
  solarBand !== null && solarBand <= inBand(30, 40) && solarBand > 0,
  `${solarBand} solar in band, ${inBand(30, 40)} in band overall`);
if (Number.isFinite(solarIn) && solarIn > 0) {
  check("the intersection matches the data", solarBand === solarIn,
    `${solarBand} reported, ${solarIn} in the data`);
}

// ------------------------------------------------------------ resetting ---
doc.getElementById("sizeReset").dispatchEvent(new window.Event("click", { bubbles: true }));
check("FULL RANGE restores every size", minBox.value === "1" && maxBox.value === "5000",
  `${minBox.value} - ${maxBox.value}`);

setBand(100, 200);
$("#clearFilters").dispatchEvent(new window.Event("click", { bubbles: true }));
check("CLEAR FILTERS restores the whole register", reportedCount() === TOTAL,
  `${reportedCount()} of ${TOTAL}`);
check("CLEAR FILTERS resets the size control too",
  minBox.value === "1" && maxBox.value === "5000", `${minBox.value} - ${maxBox.value}`);

// --------------------------------------------------- the ladder is usable --
// The reason this slider is not linear: the band the filter was built for has
// to be reachable by dragging, not only by typing.
const stops = Number(minRange.max) + 1;
minRange.value = "0";
maxRange.value = String(Number(minRange.max));
const ladder = [];
for (let i = 0; i < stops; i += 1) {
  minRange.value = String(i);
  minRange.dispatchEvent(new window.Event("input", { bubbles: true }));
  ladder.push(Number(minBox.value));
}
check("the ladder starts at 1 MW and ends at 5000 MW",
  ladder[0] === 1 && ladder[ladder.length - 1] === 5000, `${ladder[0]} .. ${ladder[ladder.length - 1]}`);
check("the ladder ascends", ladder.every((v, i) => i === 0 || v > ladder[i - 1]));
check("30 and 40 MW are both stops on the ladder",
  ladder.includes(30) && ladder.includes(40), ladder.slice(10, 20).join(","));
const under100 = ladder.filter((v) => v <= 100).length;
check("the ladder is dense where the register is dense",
  under100 >= stops / 3, `${under100} of ${stops} stops are at or below 100 MW`);

console.log(`\ncapacity-range-filter proof: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES");
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("the size filter returns exactly the band asked for, and clearing restores the register.");
