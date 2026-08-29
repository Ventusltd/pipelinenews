#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, writeFile } from "node:fs/promises";

const GENERATION = "202608290202";
const SCHEMA = "pipelinenews.adaptive-build-controller.v1";

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    if (!values[index].startsWith("--")) continue;
    result[values[index].slice(2)] = values[index + 1];
    index += 1;
  }
  return result;
}

function sha256(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function isAbsent(filename) {
  try {
    await lstat(filename);
    return false;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

async function api(endpoint, { authenticated = true } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (authenticated) assert.ok(token, "GITHUB_TOKEN is required for remote contract attestation");
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (authenticated) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${process.env.GITHUB_API_URL ?? "https://api.github.com"}${endpoint}`, {
    headers,
  });
  assert.ok(response.ok, `GitHub API ${response.status}: ${endpoint}`);
  return response.json();
}

function validateMilestones(milestones) {
  assert.equal(milestones.length, 10);
  const ids = milestones.map(({ id }) => id);
  assert.deepEqual(ids, Array.from({ length: 10 }, (_, index) => `M${String(index + 1).padStart(2, "0")}`));
  for (const [index, milestone] of milestones.entries()) {
    assert.ok(milestone.title && milestone.acceptance.length > 0);
    for (const dependency of milestone.depends_on) {
      const dependencyIndex = ids.indexOf(dependency);
      assert.ok(dependencyIndex >= 0 && dependencyIndex < index, `${milestone.id} has a non-causal dependency: ${dependency}`);
    }
  }
}

async function validateContract(manifest, manifestPath) {
  assert.equal(manifest.schema, SCHEMA);
  assert.equal(manifest.generation, GENERATION);
  assert.equal(manifest.lifecycle, "write-once");
  assert.match(manifest.source_parent_commit, /^[0-9a-f]{40}$/u);
  assert.equal(manifest.controller.authoritative_task_id, "6a921120ec248191a3551a6e618ea000");
  assert.equal(manifest.controller.superseded_watchdog_id, "6a92242b34b88191ac51b68ccf595bf9");
  assert.equal(manifest.controller.failed_predecessor_id, "6a919a1495f08191949507e6b817cbeb");
  assert.equal(manifest.controller.github_workflow_role, "IMMUTABLE_CONTRACT_GATE_NOT_A_SECOND_TIMER");
  assert.equal(manifest.current_state.verified_through, "M00");
  assert.equal(manifest.current_state.earliest_unmet_milestone, "M01");
  assert.ok(manifest.mission.paris_agreement_article_2_1_a.includes("well below 2°C"));
  assert.ok(manifest.mission.paris_agreement_article_2_1_a.includes("1.5°C"));
  assert.equal(manifest.product_contract.projects, 7680);
  assert.equal(manifest.product_contract.capacity_mw, 356474.09);
  assert.equal(manifest.product_contract.headlines, 136);
  assert.equal(manifest.product_contract.rows_per_page, 100);
  assert.equal(manifest.product_contract.table_columns, 11);
  assert.equal(manifest.relationship_law.authoritative_writer, false);
  assert.equal(manifest.relationship_law.project_bindings, 0);
  assert.equal(manifest.relationship_law.decision, "ABSTAIN");
  validateMilestones(manifest.milestones);

  const expectedBoundary = [
    `.github/workflows/${GENERATION}-adaptive-controller-contract-gate.yml`,
    `atman/${GENERATION}-verify-adaptive-build-controller.mjs`,
    `manifests/${GENERATION}-adaptive-build-controller-prompt.md`,
    `manifests/${GENERATION}-adaptive-build-controller.json`,
  ].sort();
  assert.deepEqual(manifest.source_boundary.slice().sort(), expectedBoundary);
  assert.equal(manifestPath, `manifests/${GENERATION}-adaptive-build-controller.json`);
  assert.equal(manifest.source_files.length, 3);
  for (const pin of manifest.source_files) {
    const stat = await lstat(pin.path);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `not a regular controller source: ${pin.path}`);
    const raw = await readFile(pin.path);
    assert.equal(raw.length, pin.bytes, `controller byte drift: ${pin.path}`);
    assert.equal(sha256(raw), pin.sha256, `controller hash drift: ${pin.path}`);
  }

  const promptPin = manifest.source_files.find(({ path }) => path.endsWith("-prompt.md"));
  assert.ok(promptPin);
  const prompt = await readFile(promptPin.path, "utf8");
  for (const required of manifest.prompt_required_literals) {
    assert.ok(prompt.includes(required), `merged prompt lost required scope: ${required}`);
  }
  assert.ok(prompt.length > 24000, "merged prompt is unexpectedly truncated");
}

async function verifyArtifact(repository, expected) {
  const [run, artifact] = await Promise.all([
    api(`/repos/${repository}/actions/runs/${expected.run_id}`),
    api(`/repos/${repository}/actions/artifacts/${expected.artifact_id}`),
  ]);
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success");
  assert.equal(run.head_sha, expected.source_commit);
  assert.equal(artifact.workflow_run.id, expected.run_id);
  assert.equal(artifact.size_in_bytes, expected.artifact_bytes);
  assert.equal(artifact.digest, `sha256:${expected.artifact_sha256}`);
  assert.equal(artifact.expired, false);
  return { run_id: run.id, artifact_id: artifact.id, verdict: "MATCH" };
}

async function remoteAttestation(manifest) {
  const repository = manifest.controller.repository;
  const localHead = git("rev-parse", "HEAD");
  const [branch, workflow, candidate, equivalence, companies, dataCentres, globalGrid] = await Promise.all([
    api(`/repos/${repository}/branches/main`),
    api(`/repos/${repository}/actions/workflows/${GENERATION}-adaptive-controller-contract-gate.yml`),
    verifyArtifact(repository, manifest.verified_baton.candidate),
    verifyArtifact(repository, manifest.verified_baton.equivalence),
    api(`/repos/Ventusltd/companies/branches/main`, { authenticated: false }),
    api(`/repos/Ventusltd/data-centres-gb/branches/main`, { authenticated: false }),
    api(`/repos/Ventusltd/globalgrid2050/branches/main`, { authenticated: false }),
  ]);
  assert.equal(branch.commit.sha, localHead, "remote main moved beyond checked-out controller source");
  assert.equal(workflow.path, `.github/workflows/${GENERATION}-adaptive-controller-contract-gate.yml`);
  assert.equal(workflow.state, "active");
  assert.equal(companies.commit.sha, manifest.pinned_dependencies.companies_commit);
  assert.equal(dataCentres.commit.sha, manifest.pinned_dependencies.data_centres_commit);
  assert.equal(globalGrid.commit.sha, manifest.pinned_dependencies.globalgrid_commit);
  return {
    local_head: localHead,
    remote_main_head: branch.commit.sha,
    workflow: { id: workflow.id, path: workflow.path, state: workflow.state },
    baton: { candidate, equivalence },
    dependency_heads: {
      companies: companies.commit.sha,
      data_centres: dataCentres.commit.sha,
      globalgrid: globalGrid.commit.sha,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
assert.ok(args.manifest && args.report, "--manifest and --report are required");
const manifest = JSON.parse(await readFile(args.manifest, "utf8"));
await validateContract(manifest, args.manifest);

if (args["contract-only"] === "true") {
  await writeFile(args.report, `${JSON.stringify({
    schema: "pipelinenews.adaptive-build-controller-contract-check.v1",
    generation: GENERATION,
    contract_valid: true,
    prompt_path: manifest.controller.prompt,
    milestones: manifest.milestones.map(({ id, title, depends_on: dependencies }) => ({ id, title, dependencies })),
    checked_at: new Date().toISOString(),
  }, null, 2)}\n`);
  process.stdout.write("STATIC_CONTROLLER_CONTRACT_PASS\n");
  process.exit(0);
}

git("merge-base", "--is-ancestor", manifest.source_parent_commit, "HEAD");
const remote = await remoteAttestation(manifest);
const legacyPointer = await readFile(manifest.publication_hazard.legacy_current_path);
assert.equal(legacyPointer.length, manifest.publication_hazard.legacy_current_bytes);
assert.equal(sha256(legacyPointer), manifest.publication_hazard.legacy_current_sha256);
assert.equal(await isAbsent("state/live-set.json"), true);
assert.equal(await isAbsent("releases/current.json"), true);

const report = {
  schema: "pipelinenews.adaptive-build-controller-contract-source-attestation.v1",
  generation: GENERATION,
  contract_valid: true,
  github_contract_source_deployed: remote.workflow.state === "active",
  chatgpt_controller_adoption_attested: false,
  trigger: process.env.GITHUB_EVENT_NAME ?? "local",
  controller_run_id: Number(process.env.GITHUB_RUN_ID ?? 0) || null,
  source_parent_commit: manifest.source_parent_commit,
  source_head: remote.local_head,
  remote,
  legacy_pointer: {
    path: manifest.publication_hazard.legacy_current_path,
    bytes: legacyPointer.length,
    sha256: sha256(legacyPointer),
    verdict: "UNCHANGED",
  },
  publication_state: {
    candidate: "ACTIONS_ARTIFACT_ONLY",
    state_live_set_present: false,
    root_legacy_current_present: false,
    pages_changed_by_this_read_only_workflow: false,
    globalgrid_catalogue_changed_by_this_read_only_workflow: false,
  },
  verified_through: manifest.current_state.verified_through,
  earliest_unmet_milestone: manifest.current_state.earliest_unmet_milestone,
  next_required_action: manifest.milestones[0].title,
  github_workflow_role: manifest.controller.github_workflow_role,
  scheduler_boundary: manifest.controller.scheduler_boundary,
  generated_at: new Date().toISOString(),
};

await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  generation: report.generation,
  source_head: report.source_head,
  github_contract_source_deployed: report.github_contract_source_deployed,
  earliest_unmet_milestone: report.earliest_unmet_milestone,
})}\n`);
