import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const compact = (value) => String(value ?? "").normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/gu, "");

const pointer = await json("releases/current.json");
const manifest = await json(pointer.manifest);
const fixture = await json("tests/fixtures/official-source-v3-collisions.json");
const engineDescriptor = manifest.objects.modules.find((item) =>
  ["authority_safe_frontier_engine", "official_frontier_engine"].includes(item.role)
  && item.path.includes("/sha256/"));
assert.ok(engineDescriptor, "current release must expose the content-addressed v3 frontier engine");

const {
  POLICY_ID,
  buildReferenceGroups,
  normalisePlanningReference,
  resolvePlanningBinding,
} = await import(new URL(engineDescriptor.path, root));
assert.equal(POLICY_ID, "PN-OFFICIAL-FRONTIER-V3-AUTHORITY-SAFE");
assert.equal(fixture.schema, "pipelinenews.official-source-v3-collision-fixture.v1");

const expectedCaseIds = [
  "little-kilmain-authority-positive",
  "north-ray-authority-positive",
  "east-pye-name-positive",
  "cricket-st-thomas-bradford-negative",
  "minch-moor-bolsover-negative",
  "falahill-bedford-negative",
  "dogger-bank-duplicate-negative",
  "capacity-only-negative",
  "authority-substring-negative",
];
assert.deepEqual(fixture.cases.map((item) => item.case_id), expectedCaseIds);

function groupFor(projects) {
  const groups = buildReferenceGroups(projects);
  assert.equal(groups.length, 1, "each collision fixture must describe one planning-reference group");
  return groups[0];
}

for (const item of fixture.cases) {
  const group = groupFor(item.projects);
  const decision = resolvePlanningBinding(item.record, group);
  assert.equal(decision.role, item.expected.role, item.case_id);
  if (item.expected.repd_ref) assert.equal(decision.repd_ref, item.expected.repd_ref, item.case_id);
  if (item.expected.method) assert.equal(decision.method, item.expected.method, item.case_id);
  if (item.expected.reason) assert.equal(decision.reason, item.expected.reason, item.case_id);
  if (item.expected.candidate_repd_refs) {
    assert.deepEqual(decision.candidate_repd_refs, item.expected.candidate_repd_refs, item.case_id);
  }

  const changedCapacityProjects = item.projects.map((project, index) => ({
    ...project,
    capacity_mw: index % 2 === 0 ? 0.001 : 999999,
  }));
  const changedCapacityDecision = resolvePlanningBinding(item.record, groupFor(changedCapacityProjects));
  assert.deepEqual(changedCapacityDecision, decision, `${item.case_id}: capacity changed identity decision`);
}

const capacityOnly = fixture.cases.find((item) => item.case_id === "capacity-only-negative");
assert.equal(resolvePlanningBinding(capacityOnly.record, groupFor(capacityOnly.projects)).role, "ABSTAIN");
const eastPye = fixture.cases.find((item) => item.case_id === "east-pye-name-positive");
assert.equal(resolvePlanningBinding(eastPye.record, groupFor(eastPye.projects)).gg_project_id, "GG2050-REPD-17494");
const dogger = fixture.cases.find((item) => item.case_id === "dogger-bank-duplicate-negative");
assert.equal(resolvePlanningBinding(dogger.record, groupFor(dogger.projects)).role, "ABSTAIN");

const projectDescriptors = manifest.objects.inputs
  .filter((item) => item.role.startsWith("canonical_projects_part_"))
  .sort((left, right) => left.role.localeCompare(right.role));
assert.equal(projectDescriptors.length, 16);
const projects = [];
for (const descriptor of projectDescriptors) {
  const payload = await json(descriptor.path);
  projects.push(...(Array.isArray(payload) ? payload : payload.projects || payload.items || []));
}
assert.equal(projects.length, 7680);

const rawDescriptor = manifest.objects.inputs.find((item) => item.role === "pinned_raw_official_snapshot");
const auditedDescriptor = manifest.objects.artifacts.find((item) => item.role === "authority_safe_audited_snapshot");
const contractDescriptor = manifest.objects.artifacts.find((item) => item.role === "authority_safe_frontier_contract");
assert.ok(rawDescriptor && auditedDescriptor && contractDescriptor);
const [raw, audited, contract] = await Promise.all([
  json(rawDescriptor.path),
  json(auditedDescriptor.path),
  json(contractDescriptor.path),
]);

const groups = buildReferenceGroups(projects);
const groupByReference = new Map(groups.map((group) => [group.normalised_reference, group]));
let retained = 0;
let rawPrimary = 0;
let primary = 0;
let abstain = 0;
let unsafePrimary = 0;

function independentlySafe(record, project) {
  const authorityAliases = new Map([
    ["ARGYLL", "ARGYLLANDBUTE"],
    ["BABERGHMIDSUFFOLK", "MIDSUFFOLK"],
    ["DUMFRIES", "DUMFRIESANDGALLOWAY"],
    ["SOUTHWESTDEVON", "WESTDEVON"],
  ]);
  const authority = (value) => {
    const normalised = compact(value);
    return authorityAliases.get(normalised) || normalised;
  };
  const exactName = compact(project.name).length >= 8
    && compact(`${record.name ?? ""} ${record.description ?? ""} ${record.applicant ?? ""}`).includes(compact(project.name));
  const observedAuthority = authority(record.area_name);
  const expectedAuthority = authority(project.planning_authority);
  const exactAuthority = observedAuthority.length >= 4
    && expectedAuthority.length >= 4
    && observedAuthority === expectedAuthority;
  return exactName || exactAuthority;
}

for (const [reference, entry] of Object.entries(raw.planit_by_reference || {})) {
  const group = groupByReference.get(reference);
  assert.ok(group, `raw snapshot reference missing from REPD: ${reference}`);
  const auditedEntry = audited.planit_by_reference[reference];
  assert.ok(auditedEntry, `audited snapshot omitted reference: ${reference}`);
  assert.equal(auditedEntry.records.length, entry.records.length, `record loss at ${reference}`);

  for (let index = 0; index < entry.records.length; index += 1) {
    const record = entry.records[index];
    retained += 1;
    if (record.binding?.role === "PRIMARY_MATCH") rawPrimary += 1;
    const decision = resolvePlanningBinding(record, group);
    assert.deepEqual(auditedEntry.records[index].binding, decision, `audited decision drift at ${reference}/${index}`);
    const recordRefs = [record.uid, record.reference, record.altid]
      .map(normalisePlanningReference)
      .filter(Boolean);
    if (decision.role === "PRIMARY_MATCH") {
      primary += 1;
      assert.equal(recordRefs.includes(reference), true, `non-exact primary reference at ${reference}/${index}`);
      const project = group.projects.find((candidate) => String(candidate.repd_ref) === decision.repd_ref);
      assert.ok(project, `primary project absent from reference group at ${reference}/${index}`);
      if (!independentlySafe(record, project)) unsafePrimary += 1;
    } else {
      abstain += 1;
      assert.equal(decision.role, "ABSTAIN", `unexpected non-primary action at ${reference}/${index}`);
    }
  }
}

assert.equal(retained, 128);
assert.equal(rawPrimary, 128);
assert.equal(primary, 23);
assert.equal(abstain, 105);
assert.equal(unsafePrimary, 0, "local-reference primary match escaped authority/name corroboration");
assert.deepEqual(audited.counts, {
  reference_groups: 48,
  records: 128,
  previous_primary_match: 128,
  authority_safe_primary_match: 23,
  exact_name_confirmed: 0,
  planning_authority_confirmed: 23,
  abstain: 105,
  abstain_by_reason: {
    PLANNING_AUTHORITY_OR_PROJECT_NAME_NOT_CONFIRMED: 103,
    PLANNING_REFERENCE_NOT_EXACT: 2,
  },
  changed_primary_to_abstain: 105,
});
assert.equal(contract.binding_gate.capacity_used_for_identity, false);
assert.equal(contract.binding_gate.ambiguous_action, "ABSTAIN");
assert.equal(manifest.acceptance.capacity_used_for_identity, false);
assert.equal(audited.policy.capacity_used_for_identity, false);

const pollerSource = await readFile(new URL("tooling/poll-official-sources-v3.mjs", root), "utf8");
assert.match(pollerSource, /altid: record\.altid \?\? null/u, "poller must preserve the alternate reference used by the matcher");
assert.match(pollerSource, /planit_last_good_at/u, "PlanIt health needs its own last-known-good clock");
assert.match(pollerSource, /govuk_last_good_at/u, "GOV.UK health needs its own last-known-good clock");
assert.doesNotMatch(pollerSource, /priorGoodAt: state\.last_good_at/u, "one adapter must not refresh the other's health");

console.log("PASS official-source v3: 128 retained; 23 authority-safe PRIMARY_MATCH; 105 ABSTAIN; zero unsafe primary; capacity independent");
