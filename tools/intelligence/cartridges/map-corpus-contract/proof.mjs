#!/usr/bin/env node
/** Prove every coordinate-bearing source row and the exact Grid receiver API. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
const releaseId = process.argv[2];
if (!/^\d{12}-pipelinenews$/u.test(releaseId || "")) {
  throw new Error("usage: node proof.mjs <release-id> [--gridatlas <candidate-worktree>]");
}
const gridFlag = process.argv.indexOf("--gridatlas");
const grid = gridFlag >= 0
  ? resolve(process.argv[gridFlag + 1])
  : resolve(repo, "../gridatlas-20260904-30x");
const release = join(repo, "releases", releaseId);

let passed = 0;
const failures = [];
const check = (name, condition, detail = "") => {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? `: ${detail}` : ""}`);
    console.error(`FAIL  ${name}${detail ? `: ${detail}` : ""}`);
  }
};
const text = (relative) => readFile(join(release, relative), "utf8");
const json = async (relative) => JSON.parse(await text(relative));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const app = await text("assets/202608291447-app.mjs");
const registry = await json("data/202608291447-registry.json");
const entry = registry.supplemental_assets?.map_corpus_contract;
check("active registry carries the MAP corpus contract", Boolean(entry));
check("old wider receipt is explicitly superseded",
  registry.supplemental_assets?.wider_fleet?.ui_state === "superseded");

const senderMatch = app.match(
  /^import \{ buildAtlasV9DeepLink \} from "\.\/(\d{12}-atlas-pointer-deep-link\.mjs)";/mu
);
check("runtime imports exactly one timestamped MAP sender",
  Boolean(senderMatch) && (app.match(/-atlas-pointer-deep-link\.mjs"/gu) || []).length === 1);
check("wider runtime selects the successor registry entry",
  (app.match(/supplemental_assets\?\.map_corpus_contract/gu) || []).length === 1
    && !app.includes("supplemental_assets?.wider_fleet"));
if (!entry || !senderMatch) throw new Error("release wiring is incomplete");

const senderPath = join(release, "assets", senderMatch[1]);
const widerPath = join(release, entry.cartridge.path);
const sender = await import(pathToFileURL(senderPath).href);
const widerRuntime = await import(pathToFileURL(widerPath).href);
const senderBytes = await readFile(senderPath);
const widerBytes = await readFile(widerPath);
check("sender digest and byte count are registry-bound",
  entry.sender.sha256 === sha256(senderBytes) && entry.sender.bytes === senderBytes.length);
check("wider runtime digest and byte count are registry-bound",
  entry.cartridge.sha256 === sha256(widerBytes) && entry.cartridge.bytes === widerBytes.length);
check("sender self-test passes", sender.selfTest().ok,
  sender.selfTest().checks.filter(({ ok }) => !ok).map(({ name }) => name).join(", "));
check("runtime and registry generations agree",
  sender.ATLAS_DEEP_LINK_CONTRACT.generation === entry.generation
    && widerRuntime.WIDER_FLEET_CONTRACT.generation === entry.generation);

const compact = await json("data/202608270055-8ab1807551bc-v8-fast-projects.json");
const decode = (row) => Object.fromEntries(compact.fields.map((field, index) => {
  const value = row[index];
  const dictionary = compact.dictionaries[field];
  return [field, dictionary ? (dictionary[value] ?? "") : value];
}));
const spine = compact.rows.map(decode);
const eligibleSpine = spine.filter(({ geometry_status: state }) => state === "valid");
const sourceWider = await json("data/202609030009-wider-fleet.json");
const outputWider = await json(entry.payload.path);
const corpus = [
  ...eligibleSpine.map((project) => ({ lane: "spine", project })),
  ...sourceWider.map((row) => ({ lane: "wider", project: {
    repd_ref: row.ref || "", name: row.n, technology: row.t, capacity_mw: row.c,
    longitude: row.ll?.[0], latitude: row.ll?.[1], geometry_status: "valid",
  } })),
];
const derivedCorpusCount = eligibleSpine.length + sourceWider.length;
check("source boundary derives 7,652 valid spine rows",
  eligibleSpine.length === 7652, `derived ${eligibleSpine.length}`);
check("source boundary reads all 1,104 wider rows",
  sourceWider.length === 1104, `derived ${sourceWider.length}`);
check("the complete MAP corpus is derived, not sampled",
  corpus.length === derivedCorpusCount && derivedCorpusCount === 8756,
  `derived ${eligibleSpine.length} + ${sourceWider.length} = ${derivedCorpusCount}`);

const expectedOrder = [
  "repd_ref", "project", "technology", "capacity_mw", "latitude", "longitude", "zoom",
];
const canonicalTechnologies = new Set(sender.CANONICAL_PROJECT_TECHNOLOGIES);
const canonicalName = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();
let clickable = 0;
let unresolved = 0;
let malformed = 0;
let processed = 0;
const receiverRows = [];
const malformedExamples = [];
for (const { lane, project } of corpus) {
  processed += 1;
  const href = sender.buildAtlasV9DeepLink(project);
  const ref = String(project.repd_ref ?? "").trim();
  if (!ref) {
    unresolved += 1;
    if (href) malformed += 1;
    continue;
  }
  clickable += 1;
  let ok = Boolean(href);
  let url;
  try { url = new URL(href); } catch { ok = false; }
  if (url) {
    const names = [...url.searchParams.keys()];
    ok = ok
      && url.protocol === "https:"
      && url.hostname === "ventusltd.github.io"
      && url.pathname === "/gridatlas/atlas/"
      && names.join(",") === expectedOrder.join(",")
      && names.every((name) => url.searchParams.getAll(name).length === 1)
      && url.searchParams.get("repd_ref") === ref
      && url.searchParams.get("project") === canonicalName(project.name)
      && url.searchParams.get("technology") === project.technology
      && canonicalTechnologies.has(project.technology)
      && Number(url.searchParams.get("capacity_mw")) === Number(project.capacity_mw)
      && Number(url.searchParams.get("latitude")) === Number(project.latitude)
      && Number(url.searchParams.get("longitude")) === Number(project.longitude)
      && url.searchParams.get("zoom") === "12";
  }
  if (!ok) {
    malformed += 1;
    if (malformedExamples.length < 10) malformedExamples.push(`${lane}:${ref}:${href}`);
  } else {
    receiverRows.push({
      repd_ref: ref,
      longitude: Number(project.longitude), latitude: Number(project.latitude),
      technology: project.technology,
      ...(canonicalName(project.name) ? { name: canonicalName(project.name) } : {}),
      capacity_mw: Number(project.capacity_mw), status: "Pipeline News transport fixture",
      href,
    });
  }
}
check("all 8,756 corpus rows reached a terminal gate decision", processed === derivedCorpusCount);
check("all 8,743 rows with exact identity emit canonical seven-parameter URLs",
  clickable === 8743 && malformed === 0,
  `${clickable} clickable, ${malformed} malformed; ${malformedExamples.join(" | ")}`);
check("the 13 unresolved wider rows fail closed instead of dropping identity",
  unresolved === 13, `found ${unresolved}`);

const identity = (row) => JSON.stringify([row.n, row.rt, row.c, row.ll]);
const outputIdentities = new Set(outputWider.map(identity));
const occurrenceCount = outputWider.reduce(
  (sum, row) => sum + (Number.isInteger(row.source_occurrences) ? row.source_occurrences : 1), 0
);
const sourceRefs = sourceWider.flatMap((row) => row.ref ? [String(row.ref)] : []).sort();
const outputRefs = outputWider.flatMap((row) => Array.isArray(row.repd_records)
  ? row.repd_records.map(({ ref }) => String(ref))
  : (row.ref ? [String(row.ref)] : [])).sort();
const duplicateRows = outputWider.filter((row) => row.source_occurrences > 1);
const sourceCapacity = sourceWider.reduce((sum, row) => sum + row.c, 0);
const outputCapacity = outputWider.reduce((sum, row) => sum + row.c, 0);
check("three duplicate display identities collapse to 1,101 rows",
  outputWider.length === 1101 && outputIdentities.size === outputWider.length
    && duplicateRows.length === 3);
check("deduplication accounts for every one of the 1,104 source rows",
  occurrenceCount === sourceWider.length, `accounted for ${occurrenceCount}`);
check("all 1,091 distinct source references survive deduplication",
  sourceRefs.length === 1091 && JSON.stringify(outputRefs) === JSON.stringify(sourceRefs));
check("only the measured 47.30 MW duplicate capacity is removed",
  Math.abs((sourceCapacity - outputCapacity) - 47.3) < 1e-9,
  `removed ${(sourceCapacity - outputCapacity).toFixed(2)} MW`);
check("the two multi-reference identities expose both exact MAP actions",
  duplicateRows.filter((row) => row.repd_records?.length === 2).length === 2);
const runtimeActions = outputWider.flatMap((row) => widerRuntime.mapLinksForRow(row));
check("active wider runtime retains all 1,091 valid MAP actions",
  runtimeActions.length === 1091
    && new Set(runtimeActions.map(({ ref }) => ref)).size === 1091);

const receiverModuleRelative = entry.receiver_contract.module;
const receiverModulePath = join(grid, receiverModuleRelative);
check("pinned Grid receiver module is available", existsSync(receiverModulePath), receiverModulePath);
if (!existsSync(receiverModulePath)) throw new Error("Grid candidate is required for contract proof");
const receiverModuleBytes = await readFile(receiverModulePath);
check("Grid receiver module matches pinned candidate bytes",
  receiverModuleBytes.length === entry.receiver_contract.module_bytes
    && sha256(receiverModuleBytes) === entry.receiver_contract.module_sha256);
const candidateHead = execFileSync("git", ["-C", grid, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
check("Grid checkout is the reviewed receiver candidate",
  candidateHead === entry.receiver_contract.candidate_commit, candidateHead);
const receiver = await import(pathToFileURL(receiverModulePath).href);
check("sender and receiver canonical vocabularies are byte-for-byte equal",
  JSON.stringify(sender.CANONICAL_PROJECT_TECHNOLOGIES)
    === JSON.stringify(receiver.PROJECT_TECHNOLOGIES));
const uniqueReceiverRefs = new Set(receiverRows.map(({ repd_ref }) => repd_ref));
check("the complete clickable corpus has unique exact identities",
  uniqueReceiverRefs.size === receiverRows.length,
  `${receiverRows.length - uniqueReceiverRefs.size} repeated refs`);

const receiverInput = receiverRows.map(({ href: ignored, ...row }) => row);
const receiverInputBytes = Buffer.from(JSON.stringify(receiverInput));
const provenance = {
  source_id: "project_register",
  release: `${releaseId}:all-map-senders`,
  sha256: sha256(receiverInputBytes),
  bytes: receiverInputBytes.length,
};
let receiverAccepted = 0;
try {
  const receiverRegister = receiver.createProjectRegister(receiverInput, provenance);
  const receiverIndex = receiver.createProjectIndex(receiverRegister);
  for (const row of receiverRows) {
    const arrival = receiver.parseProjectDeepLink(row.href, receiverIndex);
    if (arrival.selection.repd_ref === row.repd_ref
        && arrival.project.technology === row.technology
        && arrival.diagnostics.length === 0) receiverAccepted += 1;
  }
} catch (error) {
  failures.push(`receiver rejected corpus: ${error.stack || error}`);
}
check("Grid candidate parses every emitted URL without fallback or diagnostics",
  receiverAccepted === receiverRows.length,
  `${receiverAccepted} of ${receiverRows.length}`);

console.log(`\n${passed}/${passed + failures.length} checks passed`);
console.log(JSON.stringify({
  source_rows: derivedCorpusCount,
  clickable_rows: clickable,
  unresolved_rows: unresolved,
  display_identities: outputWider.length,
  receiver_accepted: receiverAccepted,
}));
if (failures.length) {
  console.error("\nFAILURES");
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
