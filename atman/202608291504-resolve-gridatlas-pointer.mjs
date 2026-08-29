#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const DEFAULT_REPOSITORY = "Ventusltd/gridatlas";
const POINTER_PATH = "releases/current-v3.json";
const MIRROR_PATH = "state/live-set.json";
const FALLBACK = Object.freeze({
  classification: "LAST_KNOWN_GREEN_V8_PUBLIC_CANDIDATE",
  generation: "202608271524",
  route: "/pipelinenews/releases/202608271524-v8-fast-candidate.html",
  public_url: "https://ventusltd.github.io/pipelinenews/releases/202608271524-v8-fast-candidate.html",
  pages_run_id: 33085685060,
  manifest_path: "build/202608271524-v8-fast-site-manifest.json",
  manifest_sha256: "fef485accb1509297dbc64c5e30806c60d977bedb06591e8b324e7bbab06e818",
  retention_rule: "PRESERVE_ON_ANY_GRIDATLAS_POINTER_OR_RECEIVER_FAILURE",
});

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.match(argv[index] || "", /^--[a-z0-9-]+$/u);
    assert.ok(argv[index + 1], `missing value for ${argv[index]}`);
    args[argv[index].slice(2)] = argv[index + 1];
  }
  assert.ok(args.output, "missing --output");
  assert.ok(Boolean(args["gridatlas-root"]) !== Boolean(args.repository), "provide exactly one of --gridatlas-root or --repository");
  if (args.repository) assert.match(args.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u);
  if (args["expected-pointer-sha256"]) assert.match(args["expected-pointer-sha256"], /^[0-9a-f]{64}$/u);
  if (args["expected-commit"]) assert.match(args["expected-commit"], /^[0-9a-f]{40}$/u);
  return args;
}

const sha256 = (raw) => createHash("sha256").update(raw).digest("hex");
const record = (relative, raw) => Object.freeze({ path: relative, bytes: raw.length, sha256: sha256(raw) });

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "User-Agent": "PipelineNews-GridAtlas-Pointer-Resolver/1",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  assert.equal(response.ok, true, `GitHub ${response.status}: ${url}`);
  return response.json();
}

async function githubFile(repository, commit, relative, token) {
  const value = await githubJson(`https://api.github.com/repos/${repository}/contents/${relative}?ref=${commit}`, token);
  assert.equal(value.type, "file", `not a GitHub file: ${relative}`);
  assert.equal(value.encoding, "base64", `unexpected GitHub encoding: ${relative}`);
  return Buffer.from(String(value.content || "").replace(/\s/gu, ""), "base64");
}

async function readBundle(args) {
  if (args["gridatlas-root"]) {
    const root = path.resolve(args["gridatlas-root"]);
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
    const commit = stdout.trim();
    assert.match(commit, /^[0-9a-f]{40}$/u);
    const pointerRaw = await readFile(path.join(root, POINTER_PATH));
    const pointer = JSON.parse(pointerRaw);
    const releaseId = pointer?.current?.release_id;
    assert.match(String(releaseId || ""), /^\d{12}-atlas-v9$/u);
    return {
      repository: DEFAULT_REPOSITORY,
      commit,
      pointerRaw,
      mirrorRaw: await readFile(path.join(root, MIRROR_PATH)),
      manifestPath: `${releaseId}/release-manifest.json`,
      manifestRaw: await readFile(path.join(root, releaseId, "release-manifest.json")),
    };
  }

  const repository = args.repository;
  const token = process.env.GH_TOKEN || "";
  const branch = await githubJson(`https://api.github.com/repos/${repository}/branches/main`, token);
  const commit = branch?.commit?.sha;
  assert.match(String(commit || ""), /^[0-9a-f]{40}$/u, "GridAtlas main commit unavailable");
  const pointerRaw = await githubFile(repository, commit, POINTER_PATH, token);
  const pointer = JSON.parse(pointerRaw);
  const releaseId = pointer?.current?.release_id;
  assert.match(String(releaseId || ""), /^\d{12}-atlas-v9$/u);
  const manifestPath = `${releaseId}/release-manifest.json`;
  const [mirrorRaw, manifestRaw] = await Promise.all([
    githubFile(repository, commit, MIRROR_PATH, token),
    githubFile(repository, commit, manifestPath, token),
  ]);
  return { repository, commit, pointerRaw, mirrorRaw, manifestPath, manifestRaw };
}

export function validatePointerBundle(bundle, expectations = {}) {
  assert.equal(bundle.pointerRaw.equals(bundle.mirrorRaw), true, "GridAtlas current-v3/live-set bytes differ");
  const pointerRecord = record(POINTER_PATH, bundle.pointerRaw);
  if (expectations.pointerSha256) assert.equal(pointerRecord.sha256, expectations.pointerSha256, "GridAtlas pointer digest changed");
  if (expectations.commit) assert.equal(bundle.commit, expectations.commit, "GridAtlas pointer commit changed");

  const pointer = JSON.parse(bundle.pointerRaw);
  assert.equal(pointer.schema, "gridatlas.live-set.v3");
  assert.equal(pointer.classification, "VERIFIED_LIVE_ATLAS_V9");
  assert.match(String(pointer.generation || ""), /^\d{12}$/u);
  const current = pointer.current || {};
  assert.match(String(current.release_id || ""), /^\d{12}-atlas-v9$/u);
  assert.equal(current.query_contract?.parameter, "repd_ref");
  assert.match(String(current.query_contract?.golden_value || ""), /^\d+$/u);
  assert.match(String(current.source_commit || ""), /^[0-9a-f]{40}$/u);
  assert.match(String(current.publication_commit || ""), /^[0-9a-f]{40}$/u);
  assert.match(String(current.release_manifest_sha256 || ""), /^[0-9a-f]{64}$/u);

  const live = new URL(current.live_url);
  assert.equal(live.protocol, "https:");
  assert.equal(live.hostname, "ventusltd.github.io");
  assert.equal(live.pathname, `/gridatlas/${current.release_id}/`);
  assert.equal(live.search, "");
  assert.equal(live.hash, "");
  assert.equal(current.route, live.pathname);

  const manifestRecord = record(bundle.manifestPath, bundle.manifestRaw);
  assert.equal(manifestRecord.sha256, current.release_manifest_sha256, "GridAtlas release manifest digest changed");
  const manifest = JSON.parse(bundle.manifestRaw);
  assert.equal(manifest.schema, "gridatlas.timestamped-live-release.v1");
  assert.equal(manifest.classification, "LIVE_RELEASE");
  assert.equal(manifest.release_id, current.release_id);
  assert.equal(manifest.generation, pointer.generation);
  assert.equal(manifest.live_url, current.live_url);
  assert.equal(manifest.source_commit, current.source_commit);
  assert.equal(manifest.route_contract?.query_parameter, "repd_ref");
  assert.equal(manifest.route_contract?.route, current.route);
  const golden = new URL(manifest.route_contract?.golden_deep_link);
  assert.equal(golden.origin, live.origin);
  assert.equal(golden.pathname, live.pathname);
  assert.deepEqual([...golden.searchParams.keys()], ["repd_ref"]);
  assert.equal(golden.searchParams.get("repd_ref"), String(current.query_contract.golden_value));

  return Object.freeze({
    schema: "pipelinenews.gridatlas-pointer-receipt.v1",
    classification: "VERIFIED_GRIDATLAS_LIVE_POINTER",
    repository: bundle.repository,
    resolved_ref: "refs/heads/main",
    resolved_commit: bundle.commit,
    pointer: pointerRecord,
    mirror: record(MIRROR_PATH, bundle.mirrorRaw),
    release_manifest: manifestRecord,
    receiver: Object.freeze({
      generation: pointer.generation,
      release_id: current.release_id,
      base_url: current.live_url,
      route: current.route,
      query_parameter: "repd_ref",
      golden_repd_ref: String(current.query_contract.golden_value),
      source_commit: current.source_commit,
      publication_commit: current.publication_commit,
    }),
    fallback: FALLBACK,
  });
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const bundle = await readBundle(args);
  const receipt = validatePointerBundle(bundle, {
    pointerSha256: args["expected-pointer-sha256"],
    commit: args["expected-commit"],
  });
  const output = path.resolve(args.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ classification: receipt.classification, commit: receipt.resolved_commit, receiver: receipt.receiver.base_url, golden_repd_ref: receipt.receiver.golden_repd_ref })}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
