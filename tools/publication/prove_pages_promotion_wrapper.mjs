#!/usr/bin/env node
/** Prove a Pages promotion wrapper against its exact Grid production receiver. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const releaseId = process.argv[2];
const gridFlag = process.argv.indexOf("--gridatlas");
if (!/^\d{12}-pipelinenews$/u.test(releaseId || "") || gridFlag < 0) {
  throw new Error("usage: node prove_pages_promotion_wrapper.mjs <release-id> --gridatlas <checkout>");
}
const grid = resolve(process.argv[gridFlag + 1]);
const release = join(repo, "releases", releaseId);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (relative) => readFile(join(release, relative));
const json = async (relative) => JSON.parse((await read(relative)).toString("utf8"));
let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed += 1; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? `: ${detail}` : ""}`); }
};

const releaseManifest = await json("release-manifest.json");
const buildManifest = await json("build-manifest.json");
const atlas = await json("atlas-link-manifest.json");
check("release is an explicit Pages promotion wrapper",
  releaseManifest.promotion_wrapper?.schema === "pipelinenews.pages-promotion-wrapper.v1"
    && releaseManifest.schema === "pipelinenews.current-atlas-link-release.v2");
check("build and release bind the same promotion source",
  JSON.stringify(buildManifest.promotion_wrapper) === JSON.stringify(releaseManifest.promotion_wrapper));
const receiver = atlas.receiver;
check("wrapper carries a production receiver contract",
  receiver?.schema === "pipelinenews.gridatlas-production-receiver.v1"
    && receiver.repository === "Ventusltd/gridatlas");
check("all manifests bind the same receiver",
  JSON.stringify(buildManifest.receiver) === JSON.stringify(receiver)
    && releaseManifest.atlas_receiver_commit === receiver.commit
    && releaseManifest.atlas_receiver_version === receiver.version);

for (const [label, record] of Object.entries({
  "measurement cartridge": receiver.measurement_cartridge,
  "engine cartridge": receiver.engine_cartridge,
  "composition manifest": receiver.composition_manifest,
  "production proof": receiver.production_proof,
})) {
  const payload = await readFile(join(grid, record.path));
  check(`pinned Grid ${label} bytes match`,
    payload.length === record.bytes && sha256(payload) === record.sha256,
    `${payload.length} ${sha256(payload)}`);
}
const gridHead = execFileSync("git", ["-C", grid, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
check("Grid checkout is the exact wrapper-bound commit", gridHead === receiver.commit, gridHead);

const registry = await json("data/202608291447-registry.json");
const entry = registry.supplemental_assets?.map_corpus_contract;
check("wrapper retains the source MAP corpus registry entry", Boolean(entry));
const app = (await read("assets/202608291447-app.mjs")).toString("utf8");
const senderName = app.match(
  /^import \{ buildAtlasV9DeepLink \} from "\.\/(\d{12}-atlas-pointer-deep-link\.mjs)";/mu
)?.[1];
check("wrapper runtime imports one canonical sender", Boolean(senderName));
if (!entry || !senderName) throw new Error("wrapper MAP wiring is incomplete");
const sender = await import(pathToFileURL(join(release, "assets", senderName)).href);
const wider = await import(pathToFileURL(join(release, entry.cartridge.path)).href);
check("sender self-test passes", sender.selfTest().ok);

const compact = await json("data/202608270055-8ab1807551bc-v8-fast-projects.json");
const decode = (row) => Object.fromEntries(compact.fields.map((field, index) => {
  const value = row[index];
  return [field, compact.dictionaries[field] ? (compact.dictionaries[field][value] ?? "") : value];
}));
const spine = compact.rows.map(decode).filter((row) => row.geometry_status === "valid");
const sourceWider = await json("data/202609030009-wider-fleet.json");
const outputWider = await json(entry.payload.path);
const corpus = [
  ...spine.map((project) => ({ lane: "spine", project })),
  ...sourceWider.map((row) => ({ lane: "wider", project: {
    repd_ref: row.ref || "", name: row.n, technology: row.t, capacity_mw: row.c,
    longitude: row.ll?.[0], latitude: row.ll?.[1], geometry_status: "valid",
  } })),
];
check("complete source population is derived", spine.length === 7652
  && sourceWider.length === 1104 && corpus.length === 8756);

const parameterOrder = [
  "repd_ref", "project", "technology", "capacity_mw", "latitude", "longitude", "zoom",
];
const canonical = new Set(sender.CANONICAL_PROJECT_TECHNOLOGIES);
let clickable = 0;
let unresolved = 0;
let malformed = 0;
const refs = [];
for (const { project } of corpus) {
  const ref = String(project.repd_ref ?? "").trim();
  const href = sender.buildAtlasV9DeepLink(project);
  if (!ref) {
    unresolved += 1;
    if (href) malformed += 1;
    continue;
  }
  clickable += 1;
  try {
    const url = new URL(href);
    const ok = url.origin === "https://ventusltd.github.io"
      && url.pathname === "/gridatlas/atlas/"
      && [...url.searchParams.keys()].join(",") === parameterOrder.join(",")
      && parameterOrder.every((name) => url.searchParams.getAll(name).length === 1)
      && url.searchParams.get("repd_ref") === ref
      && canonical.has(url.searchParams.get("technology"))
      && Number.isFinite(Number(url.searchParams.get("latitude")))
      && Number.isFinite(Number(url.searchParams.get("longitude")));
    if (!ok) malformed += 1;
    refs.push(ref);
  } catch { malformed += 1; }
}
check("all exact identities emit canonical seven-parameter MAP URLs",
  clickable === 8743 && malformed === 0, `${clickable} clickable, ${malformed} malformed`);
check("unresolved source rows fail closed", unresolved === 13, String(unresolved));
check("clickable identities remain unique", new Set(refs).size === refs.length,
  `${refs.length - new Set(refs).size} duplicates`);

const identity = (row) => JSON.stringify([row.n, row.rt, row.c, row.ll]);
const sourceRefs = sourceWider.flatMap((row) => row.ref ? [String(row.ref)] : []).sort();
const outputRefs = outputWider.flatMap((row) => Array.isArray(row.repd_records)
  ? row.repd_records.map(({ ref }) => String(ref)) : (row.ref ? [String(row.ref)] : [])).sort();
check("three wider display duplicates collapse without reference loss",
  outputWider.length === 1101
    && new Set(outputWider.map(identity)).size === 1101
    && JSON.stringify(sourceRefs) === JSON.stringify(outputRefs));
check("the active wider runtime exposes all retained MAP actions",
  outputWider.flatMap((row) => wider.mapLinksForRow(row)).length === 1091);

const measurementSource = (await readFile(join(grid, receiver.measurement_cartridge.path))).toString("utf8");
const engineSource = (await readFile(join(grid, receiver.engine_cartridge.path))).toString("utf8");
check("production receiver reads every canonical URL input",
  ["longitude", "latitude", "repd_ref", "technology", "project", "capacity_mw", "zoom"]
    .every((name) => measurementSource.includes(`q.get('${name}')`)
      || engineSource.includes(`params.get('${name}')`)));
const allowed = engineSource.match(/const allowedTechnologies = new Set\(\[([\s\S]*?)\]\);/u)?.[1] || "";
const accepted = new Set([...allowed.matchAll(/'([^']+)'/gu)].map((match) => match[1]));
const rejected = [...canonical].filter((technology) => !accepted.has(technology));
check("production engine accepts every sender technology", rejected.length === 0, rejected.join(", "));

try {
  const output = execFileSync(process.execPath, [join(grid, receiver.production_proof.path)], {
    cwd: grid,
    env: { ...process.env, PIPELINENEWS_REPO: repo },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  check("exact Grid production proof is wholly green", /(\d+)\/\1 checks passed/u.test(output));
  check("Grid production dispatches all 8,756 points measure-first",
    /every published point takes the product receiver's measure-first route[^\n]*8756\/8756/u.test(output));
  check("Grid production closes the Markinch acceptance fixture",
    /Markinch ref 155[^\n]*\[PASS\]|\[PASS\][^\n]*Markinch ref 155/u.test(output));
} catch (error) {
  failures.push(`exact Grid production proof failed: ${error.stdout || error.stderr || error}`);
}

console.log(`\n${passed}/${passed + failures.length} checks passed`);
console.log(JSON.stringify({ source_rows: corpus.length, clickable_rows: clickable,
  unresolved_rows: unresolved, receiver_commit: receiver.commit, receiver_version: receiver.version }));
if (failures.length) {
  console.error("\nFAILURES");
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
