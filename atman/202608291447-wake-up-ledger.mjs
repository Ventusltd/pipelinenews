#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GENERATION = "202608291447";
const RELEASE_ID = `${GENERATION}-pipelinenews`;
const FALLBACK = Object.freeze({
  generation: "202608271524",
  route: "/pipelinenews/releases/202608271524-v8-fast-candidate.html",
  manifest: "build/202608271524-v8-fast-site-manifest.json",
  manifest_sha256: "fef485accb1509297dbc64c5e30806c60d977bedb06591e8b324e7bbab06e818",
});

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.match(argv[index] || "", /^--[a-z-]+$/u);
    assert.ok(argv[index + 1], `missing value for ${argv[index]}`);
    args[argv[index].slice(2)] = argv[index + 1];
  }
  for (const key of ["root", "output"]) assert.ok(args[key], `missing --${key}`);
  return args;
}

const sha256 = (raw) => createHash("sha256").update(raw).digest("hex");
async function exists(relative) {
  try { await access(relative); return true; } catch { return false; }
}

async function readJsonIfPresent(relative) {
  if (!(await exists(relative))) return null;
  return JSON.parse(await readFile(relative, "utf8"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const head = stdout.trim();
  assert.match(head, /^[0-9a-f]{40}$/u);

  const releaseManifestPath = path.join(root, "releases", RELEASE_ID, "release-manifest.json");
  const pointerPaths = [path.join(root, "releases/current-v3.json"), path.join(root, "state/live-set.json")];
  const releasePresent = await exists(releaseManifestPath);
  const pointerPresence = await Promise.all(pointerPaths.map(exists));
  assert.ok(pointerPresence[0] === pointerPresence[1], "PipelineNews pointer copies are split");
  const livePointer = pointerPresence[0] ? JSON.parse(await readFile(pointerPaths[0], "utf8")) : null;
  if (livePointer) assert.equal(await readFile(pointerPaths[0], "utf8"), await readFile(pointerPaths[1], "utf8"), "PipelineNews pointer copies differ");

  let receiver = null;
  let receiverStatus = "NOT_CAPTURED";
  if (args["gridatlas-receiver"] && await exists(path.resolve(args["gridatlas-receiver"]))) {
    receiver = await readJsonIfPresent(path.resolve(args["gridatlas-receiver"]));
    receiverStatus = receiver?.classification === "VERIFIED_GRIDATLAS_LIVE_POINTER" ? "VERIFIED" : "INVALID";
  }

  const fallbackManifestRaw = await readFile(path.join(root, FALLBACK.manifest));
  assert.equal(sha256(fallbackManifestRaw), FALLBACK.manifest_sha256, "last-known-green V8 fallback manifest drift");
  const fallbackManifest = JSON.parse(fallbackManifestRaw);
  assert.equal(fallbackManifest.generation, FALLBACK.generation);
  const fallbackOutputPaths = new Set(fallbackManifest.outputs.map((entry) => entry.path));
  assert.equal(fallbackOutputPaths.has(`releases/${FALLBACK.generation}-v8-fast-candidate.html`), true);

  let classification;
  let nextAction;
  if (receiverStatus !== "VERIFIED") {
    classification = "PRESERVE_LAST_KNOWN_GREEN_V8";
    nextAction = "Repair or recapture GridAtlas current-v3; do not stage or promote PipelineNews.";
  } else if (livePointer?.release_id === RELEASE_ID) {
    classification = "LIVE_READ_ONLY_DRIFT_AUDIT";
    nextAction = "Run receiver readback, comparator and inherited 420 checks without repository mutation.";
  } else if (releasePresent) {
    classification = "WAIT_PUBLIC_FOLDER_PROOF_OR_STAGE_POINTER";
    nextAction = "Verify the exact immutable public folder, then stage only byte-identical live pointers.";
  } else {
    classification = "BUILD_IMMUTABLE_POINTER_SUCCESSOR";
    nextAction = "Build and stage the 202608291447 immutable folder from the authenticated receiver receipt.";
  }

  const ledger = {
    schema: "pipelinenews.wake-up-ledger.v1",
    generation: GENERATION,
    release_id: RELEASE_ID,
    classification,
    repository_head: head,
    workflow: {
      event: args.event || process.env.GITHUB_EVENT_NAME || "local",
      run_id: args["run-id"] || process.env.GITHUB_RUN_ID || null,
      repository_mutation_allowed: false,
      dispatch_allowed: false,
      purpose: "scheduled/read-only recovery consciousness",
    },
    observed: {
      receiver_status: receiverStatus,
      receiver_commit: receiver?.resolved_commit || null,
      receiver_release_id: receiver?.receiver?.release_id || null,
      immutable_release_present: releasePresent,
      pipeline_pointer_present: Boolean(livePointer),
      pipeline_pointer_release_id: livePointer?.release_id || null,
    },
    fallback: {
      ...FALLBACK,
      verified: true,
      rule: "Never replace this V8 fallback unless the full V9 receiver, comparator, browser and pointer gates are green.",
    },
    next_action: nextAction,
  };
  const output = path.resolve(args.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(ledger, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ classification, receiver_status: receiverStatus, release_present: releasePresent, pointer_release: livePointer?.release_id || null })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
