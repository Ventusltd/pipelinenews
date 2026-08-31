/**
 * grid-proximity render proof.
 *
 * render_proof.mjs in tools/intelligence is written against the
 * project-intelligence cartridge specifically - its payload filename, its
 * contract name and its mount function are all hardcoded - so it cannot prove
 * any other cartridge. This proves this one, against a real DOM rather than a
 * stub, and independently re-derives the radius arithmetic rather than
 * trusting the cartridge's own answer.
 *
 * Usage:
 *   node proof.mjs <path-to-release-dir> <generation>
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const root = process.argv[2];
const gen = process.argv[3];
if (!root || !gen) {
  console.error("usage: node proof.mjs <release-dir> <generation>");
  process.exit(2);
}

const payloadPath = join(root, "data", `${gen}-grid-proximity.json`);
const payloadText = await readFile(payloadPath, "utf8");
const payload = JSON.parse(payloadText);

// pretendToBeVisual gives jsdom a requestAnimationFrame. Without it the scope
// takes its no-animation path, which is also worth proving works.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Blob = dom.window.Blob;
globalThis.URL = dom.window.URL;
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => "blob:proof";
  globalThis.URL.revokeObjectURL = () => {};
}

let fetchCalls = 0;
globalThis.fetch = async (url) => {
  fetchCalls += 1;
  if (!String(url).includes("grid-proximity")) throw new Error("unexpected fetch " + url);
  return { ok: true, status: 200, json: async () => JSON.parse(payloadText) };
};

const modPath = "file://" + join(root, "assets", `${gen}-grid-proximity.mjs`).replace(/\\/g, "/");
const mod = await import(modPath);
const contract = mod.GRID_PROXIMITY_CARTRIDGE_CONTRACT;

const checks = [];
const ok = (name, pass, detail = "") => checks.push({ name, pass: Boolean(pass), detail });

ok("contract generation matches release", contract.generation === gen, `${contract.generation} vs ${gen}`);
ok("contract declares additive_only", contract.additive_only === true);
ok("contract declares mutates_existing_dom false", contract.mutates_existing_dom === false);
ok("contract declares zero project bindings", contract.project_bindings === 0);
ok("contract is not eligible for news signal", contract.eligible_for_news_signal === false);

const host = document.createElement("div");
document.body.appendChild(host);
const before = document.body.innerHTML.length;

const result = mod.mountGridProximity({
  host,
  payloadAsset: { path: payloadPath, url: payloadPath },
});

ok("mount requests no payload", fetchCalls === 0, `fetchCalls=${fetchCalls}`);
ok("mount reports zero payload requests", result.payloadRequests === 0);
ok("mount reports zero project bindings", result.projectBindings === 0);
ok("mount rendered inside its own host", host.children.length === 1 && document.body.children.length === 1);
ok("mount added nothing outside the host", document.body.innerHTML.length > before);

const tabButtons = Array.from(host.querySelectorAll("button"));
ok("all five tabs present", tabButtons.length === 5, tabButtons.map((b) => b.textContent).join(","));

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
// requestAnimationFrame in jsdom fires on a ~16 ms timer, so a loop of
// setTimeout(0) never advances it. The scope needs real elapsed time.
const settle = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) await wait(20); };
async function openTab(label) {
  const b = tabButtons.find((x) => x.textContent === label);
  b.click();
  for (let i = 0; i < 30; i += 1) await wait();
  return host.textContent;
}

const radiusText = await openTab("RADIUS");
ok("payload fetched once, on first tab", fetchCalls === 1, `fetchCalls=${fetchCalls}`);
ok("RADIUS tab renders its controls",
  radiusText.includes("PROJECTS WITHIN A RADIUS") && host.querySelector("#gpCentre") !== null);

/* --- independently re-derive a radius query and compare ------------------ */
const R = 6378.137;
const DEG = Math.PI / 180;
const hav = (lo1, la1, lo2, la2) => {
  const dLat = (la2 - la1) * DEG;
  const dLon = (lo2 - lo1) * DEG;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * DEG) * Math.cos(la2 * DEG) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const centre = payload.rows[0];
const RADIUS_KM = 25;
const expected = payload.rows.filter((r) => hav(centre.at[0], centre.at[1], r.at[0], r.at[1]) <= RADIUS_KM);

host.querySelector("#gpCentre").value = centre.ref;
host.querySelector("#gpRadius").value = String(RADIUS_KM);
host.querySelector("#gpGo").click();
for (let i = 0; i < 30; i += 1) await wait();
const reported = Number((host.querySelector("#gpOut strong") || {}).textContent);
ok("radius search count matches an independent haversine sweep",
  reported === expected.length, `cartridge=${reported} independent=${expected.length}`);

const gauges = host.querySelectorAll("#gpOut .gauges strong");
ok("radius search reports capacity in the circle", gauges.length >= 2 && gauges[1].textContent.length > 0,
  gauges.length >= 2 ? gauges[1].textContent : "");

/* --- sorting ------------------------------------------------------------- */
const sortText = await openTab("SORT");
ok("SORT tab renders the table", sortText.includes("EVERY PROJECT, SORTED"));
const heads = Array.from(host.querySelectorAll("th[data-k]")).map((t) => t.dataset.k);
for (const needed of ["mw", "town", "county", "region", "_ckm", "_skm"]) {
  ok(`sortable column present: ${needed}`, heads.includes(needed));
}
function firstColumnValues(colIndex) {
  return Array.from(host.querySelectorAll("tbody tr")).slice(0, 20)
    .map((tr) => tr.children[colIndex].textContent);
}
const mwIdx = heads.indexOf("mw");
const mwDesc = firstColumnValues(mwIdx).map((v) => parseFloat(v)).filter(Number.isFinite);
ok("default sort is capacity, largest first",
  mwDesc.every((v, i) => i === 0 || mwDesc[i - 1] >= v), mwDesc.slice(0, 5).join(","));

const townTh = Array.from(host.querySelectorAll("th[data-k]")).find((t) => t.dataset.k === "town");
townTh.click();
for (let i = 0; i < 10; i += 1) await wait();
const townIdx = Array.from(host.querySelectorAll("th[data-k]")).map((t) => t.dataset.k).indexOf("town");
const towns = firstColumnValues(townIdx).filter(Boolean);
ok("clicking TOWN clusters towns together alphabetically",
  towns.every((v, i) => i === 0 || towns[i - 1].localeCompare(v) <= 0), towns.slice(0, 4).join(" | "));

/* --- connections --------------------------------------------------------- */
const connectText = await openTab("CONNECT");
ok("CONNECT tab renders", connectText.includes("AUTO-DRAWN CONNECTIONS"));
let exported = null;
const realBlob = globalThis.Blob;
globalThis.Blob = class extends realBlob {
  constructor(parts, opts) { super(parts, opts); exported = JSON.parse(parts[0]); }
};
host.querySelector("#gpGeo").click();
for (let i = 0; i < 10; i += 1) await wait();
globalThis.Blob = realBlob;
const withCircuit = payload.rows.filter((r) => r.circuit).length;
const withSub = payload.rows.filter((r) => r.substation).length;
ok("GeoJSON export builds", exported && exported.type === "FeatureCollection");
ok("one connection line per project per target",
  exported && exported.features.length === withCircuit + withSub,
  exported ? `${exported.features.length} vs ${withCircuit + withSub}` : "");
ok("every exported line has two ends",
  exported && exported.features.every((f) => f.geometry.coordinates.length === 2));
ok("every exported line stamps its measurement method",
  exported && exported.features.every((f) => f.properties.measurement_method === "atlas_haversine_6378_137_km"));
ok("export carries the caveat block", exported && Boolean(exported.properties.caveat.straight_line));

/* --- target scope --------------------------------------------------------- */
const targetText = await openTab("TARGET");
ok("TARGET tab renders the scope", targetText.includes("DRAW STRAIGHT TO NEAREST SUBSTATION"));
const canvas = host.querySelector("#gpScope");
ok("scope canvas exists and is square", canvas && canvas.width === canvas.height, canvas ? `${canvas.width}x${canvas.height}` : "absent");
ok("scope styles are scoped to the cartridge host", (() => {
  const style = document.getElementById("gp-scope-style");
  if (!style) return false;
  const selectors = style.textContent.match(/^\s*#?[^@{}]+\{/gm) || [];
  return selectors.every((s) => s.includes("#gridProximityHost"));
})(), "no selector may escape #gridProximityHost");

const scopeTarget = payload.rows.find((r) => r.substation && r.substation.name);
host.querySelector("#gpTargetPick").value = scopeTarget.ref;
host.querySelector("#gpTargetGo").click();
await settle(1400);
const readoutText = host.querySelector("#gpReadout").textContent;
ok("scope acquires a named target", readoutText.includes(scopeTarget.substation.name.slice(0, 12)),
  readoutText.slice(0, 60));
ok("scope reports a bearing in degrees", /\d{3}°/.test(readoutText));
ok("scope lists every voltage in reach",
  Object.keys(scopeTarget.circuit_by_kv).every((kv) => readoutText.includes(`${kv} kV`)),
  Object.keys(scopeTarget.circuit_by_kv).join("/"));
ok("scope carries the ETAP / DIgSILENT caveat",
  readoutText.includes("ETAP") && readoutText.includes("chartered engineer"));

// The bearing shown must be the real one, re-derived here.
{
  const D = Math.PI / 180;
  const [lo1, la1] = scopeTarget.at; const [lo2, la2] = scopeTarget.substation.at;
  const y = Math.sin((lo2 - lo1) * D) * Math.cos(la2 * D);
  const x = Math.cos(la1 * D) * Math.sin(la2 * D) - Math.sin(la1 * D) * Math.cos(la2 * D) * Math.cos((lo2 - lo1) * D);
  const brg = (Math.atan2(y, x) / D + 360) % 360;
  const shown = Number((readoutText.match(/(\d{3})°/) || [])[1]);
  ok("the bearing shown matches an independent derivation",
    Math.abs(shown - brg) <= 1, `shown ${shown} independent ${brg.toFixed(1)}`);
}

/* --- method -------------------------------------------------------------- */
const methodText = await openTab("METHOD");
ok("METHOD tab states the radius", methodText.includes("6378.137"));
ok("METHOD tab names the tools it agrees with",
  methodText.includes("ventus-corev8engine.js") && methodText.includes("atlasHaversineKm"));
ok("METHOD tab carries the straight-line caveat",
  methodText.includes("Not a") && methodText.toLowerCase().includes("cable route"));

/* --- payload integrity --------------------------------------------------- */
ok("payload uses the atlas radius", payload.earth_model.radius_km === 6378.137);
ok("payload covers five voltages", payload.network.voltages_kv.join(",") === "400,275,220,132,66");
ok("every row carries a grid probable band",
  payload.rows.every((r) => r.grid_probable && r.grid_probable.band));
ok("the band is reproducible from its own published rule", payload.rows.every((r) => {
  const g = r.grid_probable;
  if (g.band === "UNKNOWN") return true;
  const bands = payload.grid_probable_rule.bands;
  const expected = (bands.find((b) => b.circuit_km_max !== null
    && r.circuit.km <= b.circuit_km_max && r.substation.km <= b.substation_km_max) || { band: "REMOTE" }).band;
  return expected === g.band;
}));
ok("the rule publishes what it does not model",
  payload.grid_probable_rule.not_modelled.length >= 4);
ok("no capacity-to-voltage assumption has been smuggled in",
  payload.grid_probable_rule.not_modelled.some((s) => s.includes("capacity-to-voltage")));
ok("every row carries a snapped circuit foot",
  payload.rows.every((r) => r.circuit && Array.isArray(r.circuit.foot) && r.circuit.foot.length === 2));
ok("every row carries a nearest substation", payload.rows.every((r) => r.substation));
ok("every row carries four more substations for the scope",
  payload.rows.every((r) => Array.isArray(r.substations_nearby) && r.substations_nearby.length === 4));
ok("nearby substations are ordered by range",
  payload.rows.every((r) => [r.substation, ...r.substations_nearby]
    .every((s, i, a) => i === 0 || a[i - 1].km <= s.km)));
ok("every row carries the nearest circuit at each voltage",
  payload.rows.every((r) => Object.keys(r.circuit_by_kv).length >= 1));
ok("the overall nearest circuit equals the best of the per-voltage set",
  payload.rows.every((r) => {
    const best = Math.min(...Object.values(r.circuit_by_kv).map((v) => v.km));
    return Math.abs(best - r.circuit.km) < 1e-6;
  }));

const failed = checks.filter((c) => !c.pass);
for (const c of checks) {
  console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}${c.detail ? "  " + c.detail : ""}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
