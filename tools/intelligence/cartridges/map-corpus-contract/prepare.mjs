#!/usr/bin/env node
/** Deterministically derive the deduplicated wider payload and its UI module. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
const parent = join(repo, "releases", "202609032329-pipelinenews");
const sourcePayloadPath = join(parent, "data", "202609030009-wider-fleet.json");
const sourceModulePath = join(parent, "assets", "202609030009-wider-fleet.mjs");
const assetDirectory = join(here, "assets");
const dataDirectory = join(here, "data");

const sourceRows = JSON.parse(await readFile(sourcePayloadPath, "utf8"));
if (!Array.isArray(sourceRows) || sourceRows.length !== 1104) {
  throw new Error(`expected 1,104 immutable wider rows, found ${sourceRows?.length}`);
}

const identity = (row) => JSON.stringify([row.n, row.rt, row.c, row.ll]);
const groups = new Map();
for (const row of sourceRows) {
  const key = identity(row);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const rows = [];
let duplicateGroups = 0;
for (const group of groups.values()) {
  const base = structuredClone(group[0]);
  if (group.length > 1) {
    duplicateGroups += 1;
    base.source_occurrences = group.length;
    const records = group
      .filter((row) => row.ref)
      .map((row) => ({
        ref: String(row.ref),
        status: row.s,
        operator: row.o,
        ...(row.cty ? { county: row.cty } : {}),
        ...(row.pc ? { postcode: row.pc } : {}),
      }));
    if (records.length) base.repd_records = records;
    delete base.ref;
  }
  rows.push(base);
}

if (duplicateGroups !== 3 || rows.length !== 1101) {
  throw new Error(`dedup boundary moved: ${duplicateGroups} groups, ${rows.length} identities`);
}
const sourceRefs = sourceRows.flatMap((row) => row.ref ? [String(row.ref)] : []).sort();
const outputRefs = rows.flatMap((row) => row.repd_records
  ? row.repd_records.map(({ ref }) => String(ref))
  : (row.ref ? [String(row.ref)] : [])).sort();
if (JSON.stringify(sourceRefs) !== JSON.stringify(outputRefs)) {
  throw new Error("deduplication lost or invented a REPD reference");
}

let moduleText = await readFile(sourceModulePath, "utf8");
moduleText = `import { buildAtlasV9DeepLink } from "./{GEN}-atlas-pointer-deep-link.mjs";\n\n${moduleText}`;
moduleText = moduleText.replace(
  '  generation: "202609030009",',
  '  generation: "{GEN}",\n  source_rows: 1104,\n  display_identities: 1101,\n  map_actions: 1091,\n  duplicate_identities_removed: 3,'
);

const oldLink = `const ATLAS = "https://ventusltd.github.io/gridatlas/atlas/";
const PAGE = 50;

const esc = (value) => String(value == null ? "" : value)
  .replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[c]));
/* The Atlas resolves an arrival by REPD ref and nothing else
   (identity_rule: EXACT_REPD_REF_ONLY). Without one it reports status ABSENT
   and its place-search cartridge returns before its own flyTo, so the card
   opens and the measurement runs while the camera stays on the default UK
   view -- which reads as "the map cannot find it". Watched live for Rainham
   Phase II on 2026-09-02. A row that genuinely has no resolved ref still
   links without one: the card and the measurement work, only the camera
   does not move, and that is better than sending a guessed identity. */
function atlasLink(row) {
  const query = new URLSearchParams();
  if (row.ref) query.set("repd_ref", row.ref);
  query.set("project", row.n);
  query.set("technology", row.t);
  query.set("capacity_mw", String(row.c));
  query.set("latitude", String(row.ll[1]));
  query.set("longitude", String(row.ll[0]));
  query.set("zoom", "12");
  return \`${"${ATLAS}"}?${"${query.toString()}"}\`;
}`;

const newLink = `const PAGE = 50;

const esc = (value) => String(value == null ? "" : value)
  .replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[c]));

function repdRecords(row) {
  const records = Array.isArray(row.repd_records) ? row.repd_records : [row];
  const seen = new Set();
  return records.filter((record) => {
    const ref = String(record?.ref ?? "").trim();
    if (!ref || seen.has(ref)) return false;
    seen.add(ref);
    return true;
  });
}

export function mapLinksForRow(row) {
  return repdRecords(row).flatMap((record) => {
    const href = buildAtlasV9DeepLink({ ...row, ref: record.ref });
    return href ? [{ href, ref: String(record.ref) }] : [];
  });
}

function mapActions(row) {
  const actions = mapLinksForRow(row);
  if (!actions.length) {
    return '<span class="action-disabled" title="No exact REPD reference is available; no MAP identity is guessed">NO MAP</span>';
  }
  return actions.map(({ href, ref }) => \`<a class="action-link" target="_blank" rel="noopener" href="${"${esc(href)}"}">MAP${"${actions.length > 1 ? ` ${esc(ref)}` : \"\"}"} &nearr;</a>\`).join(" ");
}

const displayRefs = (row) => repdRecords(row).map(({ ref }) => String(ref)).join(" / ");
const displayStatuses = (row) => {
  const statuses = Array.isArray(row.repd_records)
    ? [...new Set(row.repd_records.map(({ status }) => status).filter(Boolean))]
    : [row.s];
  return statuses.join(" / ");
};`;

if (!moduleText.includes(oldLink)) throw new Error("wider URL-builder anchor drifted");
moduleText = moduleText.replace(oldLink, newLink);
const edits = [
  ['  "REPD Ref": (row) => row.ref,', '  "REPD Ref": (row) => displayRefs(row),'],
  ['      <td>${esc(row.s)}</td>', '      <td>${esc(displayStatuses(row))}</td>'],
  ['      <td class="hide-mobile reference-cell repd-ref">${esc(row.ref || "\u2014")}</td>',
    '      <td class="hide-mobile reference-cell repd-ref">${esc(displayRefs(row) || "\u2014")}</td>'],
  ['      <td class="hide-mobile reference-cell globalgrid-ref">${row.ref ? "GG2050-REPD-" + esc(row.ref) : "&mdash;"}</td>',
    '      <td class="hide-mobile reference-cell globalgrid-ref">${displayRefs(row) ? repdRecords(row).map(({ ref }) => "GG2050-REPD-" + esc(ref)).join(" / ") : "&mdash;"}</td>'],
  ['      <td><div class="project-actions"><a class="action-link" target="_blank" rel="noopener" href="${atlasLink(row)}">MAP \u2197</a></div></td>',
    '      <td><div class="project-actions">${mapActions(row)}</div></td>'],
];
for (const [from, to] of edits) {
  if (moduleText.split(from).length !== 2) throw new Error(`wider module anchor drifted: ${from}`);
  moduleText = moduleText.replace(from, to);
}
moduleText = moduleText.replace("this cut's own 1,104 rows", "this cut's own 1,101 display identities");

await mkdir(assetDirectory, { recursive: true });
await mkdir(dataDirectory, { recursive: true });
await writeFile(join(assetDirectory, "{GEN}-wider-fleet.mjs"), moduleText, "utf8");
await writeFile(join(dataDirectory, "{GEN}-wider-fleet.json"), `${JSON.stringify(rows)}\n`, "utf8");
console.log(JSON.stringify({ source_rows: sourceRows.length, display_identities: rows.length,
  duplicate_identities_removed: duplicateGroups, repd_refs_preserved: outputRefs.length }));
