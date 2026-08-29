#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const GENERATION = "202608291310";
const RELEASE_ID = `${GENERATION}-pipelinenews`;
const RELEASE_PATH = `releases/${RELEASE_ID}`;
const ATLAS_BASE = "https://ventusltd.github.io/gridatlas/202608291239-atlas-v9/";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.match(argv[index] || "", /^--[a-z-]+$/u);
    assert.ok(argv[index + 1], `missing ${argv[index]} value`);
    result[argv[index].slice(2)] = argv[index + 1];
  }
  for (const key of ["root", "browser-proof", "comparator-report", "equivalence-report", "pages-run-id", "deployed-commit", "verified-at-utc", "out-root"]) {
    assert.ok(result[key], `missing --${key}`);
  }
  assert.match(result["pages-run-id"], /^\d+$/u);
  assert.match(result["deployed-commit"], /^[0-9a-f]{40}$/u);
  assert.equal(Number.isNaN(Date.parse(result["verified-at-utc"])), false, "invalid verification timestamp");
  return result;
}

const sha256 = (raw) => createHash("sha256").update(raw).digest("hex");
const record = (relative, raw) => ({ path: relative, bytes: raw.length, sha256: sha256(raw) });

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const outRoot = path.resolve(args["out-root"]);
  const manifestPath = path.join(root, RELEASE_PATH, "release-manifest.json");
  const manifestRaw = await readFile(manifestPath);
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.schema, "pipelinenews.timestamp-folder-successor.v1");
  assert.equal(manifest.release_id, RELEASE_ID);
  assert.equal(manifest.classification, "IMMUTABLE_TIMESTAMPED_RELEASE");
  assert.equal(manifest.outputs.length, 39);
  for (const output of manifest.outputs) {
    const raw = await readFile(path.join(root, output.path));
    assert.equal(raw.length, output.bytes, `release output byte drift: ${output.path}`);
    assert.equal(sha256(raw), output.sha256, `release output digest drift: ${output.path}`);
  }

  const buildPath = path.join(root, RELEASE_PATH, "build-manifest.json");
  const buildRaw = await readFile(buildPath);
  const build = JSON.parse(buildRaw);
  assert.equal(build.schema, "pipelinenews.timestamp-folder-build-manifest.v1");
  assert.equal(build.parent_evidence.exact_manifest.sha256, "025daf70f1c4b9c9a7c84a70d41ceb50e96232771f736faa309ca92c2c9c134d");

  const proofRaw = await readFile(path.resolve(args["browser-proof"]));
  const proof = JSON.parse(proofRaw);
  assert.equal(proof.classification, "VERIFIED_REAL_ATLAS_V9_RECEIVER");
  assert.equal(proof.candidate_url, `https://ventusltd.github.io/pipelinenews/${RELEASE_PATH}/`);
  assert.equal(proof.inbound_repd_ref, "17494");
  assert.equal(proof.receiver_text.includes("REPD 17494 selected"), true);
  assert.equal(proof.beacon_fen?.outbound_href, `${ATLAS_BASE}?repd_ref=13599`);
  assert.equal(proof.beacon_fen?.receiver_text.includes("REPD 13599 selected"), true);
  assert.equal(proof.external_atlas_network_used, true);
  assert.equal(proof.synthetic_receiver, false);
  assert.equal(proof.route_interceptions, 0);
  assert.deepEqual(proof.errors, []);

  const comparatorRaw = await readFile(path.resolve(args["comparator-report"]));
  const comparator = JSON.parse(comparatorRaw);
  assert.equal(comparator.classification, "VERIFIED_PIPELINENEWS_ATLAS_V9_SUCCESSOR");
  assert.equal(comparator.promotion_eligible, true);
  assert.equal(comparator.failed, 0);
  const equivalenceRaw = await readFile(path.resolve(args["equivalence-report"]));
  const equivalence = JSON.parse(equivalenceRaw);
  assert.deepEqual(equivalence.summary, { checks: 420, passed: 420, failed: 0 });
  assert.equal(equivalence.promotion_eligible, true);

  const pointer = {
    schema: "pipelinenews.live-pointer.v3",
    generation: GENERATION,
    release_id: RELEASE_ID,
    classification: "VERIFIED_LIVE_TIMESTAMPED_RELEASE",
    route: `/pipelinenews/${RELEASE_PATH}/`,
    entrypoint: `${RELEASE_PATH}/index.html`,
    release_manifest: record(`${RELEASE_PATH}/release-manifest.json`, manifestRaw),
    build_manifest: record(`${RELEASE_PATH}/build-manifest.json`, buildRaw),
    release_source_commit: manifest.source_commit,
    deployed_commit: args["deployed-commit"],
    verified_at_utc: args["verified-at-utc"],
    atlas_v9_receiver: {
      base_url: ATLAS_BASE,
      golden_repd_ref: "17494",
      expected_selection: "REPD 17494 selected",
    },
    public_proof: {
      pages_run_id: args["pages-run-id"],
      browser_proof_sha256: sha256(proofRaw),
      comparator_report_sha256: sha256(comparatorRaw),
      equivalence_report_sha256: sha256(equivalenceRaw),
      receiver_url: proof.receiver_url,
      receiver_text: proof.receiver_text,
      synthetic_receiver: false,
      route_interceptions: 0,
    },
  };
  const pointerRaw = Buffer.from(`${JSON.stringify(pointer, null, 2)}\n`);
  for (const relative of ["releases/current-v3.json", "state/live-set.json"]) {
    const target = path.join(outRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, pointerRaw, { flag: "wx" });
  }
  process.stdout.write(`${JSON.stringify({
    classification: pointer.classification,
    release_id: RELEASE_ID,
    pages_run_id: args["pages-run-id"],
    pointer_bytes: pointerRaw.length,
    pointer_sha256: sha256(pointerRaw),
    byte_identical_copies: 2,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
