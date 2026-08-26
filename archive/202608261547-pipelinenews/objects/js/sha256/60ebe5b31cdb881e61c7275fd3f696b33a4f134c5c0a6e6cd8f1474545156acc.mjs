import * as previous from "./bf8b87533cda64fa145de9ca28998b29bf7f863f483a26a78e34fc3272fe9f7d.mjs";

export const POLICY_ID = "PN-OFFICIAL-FRONTIER-V3-AUTHORITY-SAFE";
export const SOURCE_SCORES = previous.SOURCE_SCORES;
export const normalisePlanningReference = previous.normalisePlanningReference;
export const buildReferenceGroups = previous.buildReferenceGroups;
export const selectFrontier = previous.selectFrontier;
export const sourceHealth = previous.sourceHealth;

const text = (value) => String(value ?? "").normalize("NFKC").trim();
const compact = (value) => text(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
const projectRef = (project) => text(project.repd_ref || project.Ref_ID || project.ref_id);
const projectName = (project) => text(project.name || project.project_name || project.site_name);

// PlanIt uses a small number of documented service-area labels rather than the
// exact REPD authority label. Keep those mappings explicit and reviewable; do
// not replace this list with substring or fuzzy matching.
const authorityAliases = new Map([
  ["ARGYLL", "ARGYLLANDBUTE"],
  ["BABERGHMIDSUFFOLK", "MIDSUFFOLK"],
  ["DUMFRIES", "DUMFRIESANDGALLOWAY"],
  ["SOUTHWESTDEVON", "WESTDEVON"],
]);

function canonicalPlanningAuthority(value) {
  const normalised = compact(value);
  return authorityAliases.get(normalised) || normalised;
}

function recordReferences(record) {
  return [record.uid, record.reference, record.altid]
    .map(normalisePlanningReference)
    .filter(Boolean);
}

function projectNameMatches(record, project) {
  const name = compact(projectName(project));
  if (name.length < 8) return false;
  const body = compact([record.name, record.description, record.applicant].filter(Boolean).join(" "));
  return body.includes(name);
}

function planningAuthorityMatches(record, project) {
  const observed = canonicalPlanningAuthority(record.area_name);
  const expected = canonicalPlanningAuthority(project.planning_authority);
  if (observed.length < 4 || expected.length < 4) return false;
  return observed === expected;
}

function primaryMatch(project, method) {
  return {
    role: "PRIMARY_MATCH",
    method,
    repd_ref: projectRef(project),
    gg_project_id: text(project.gg_project_id) || `GG2050-REPD-${projectRef(project)}`,
    project_name: projectName(project),
    planning_application_reference: text(project.planning_application_reference),
    planning_authority: text(project.planning_authority) || null,
    news_may_overwrite_official_facts: false,
  };
}

export function resolvePlanningBinding(record, referenceGroup) {
  const recordRefs = new Set(recordReferences(record));
  if (!recordRefs.has(referenceGroup.normalised_reference)) {
    return { role: "ABSTAIN", reason: "PLANNING_REFERENCE_NOT_EXACT" };
  }

  const nameMatches = referenceGroup.projects.filter((project) => projectNameMatches(record, project));
  if (nameMatches.length === 1) return primaryMatch(nameMatches[0], "EXACT_REFERENCE_PLUS_EXACT_PROJECT_NAME");
  if (nameMatches.length > 1) {
    return {
      role: "ABSTAIN",
      reason: "AMBIGUOUS_EXACT_PROJECT_NAME",
      candidate_repd_refs: nameMatches.map(projectRef),
    };
  }

  const authorityMatches = referenceGroup.projects.filter((project) => planningAuthorityMatches(record, project));
  if (authorityMatches.length === 1) return primaryMatch(authorityMatches[0], "EXACT_REFERENCE_PLUS_PLANNING_AUTHORITY");

  return {
    role: "ABSTAIN",
    reason: authorityMatches.length > 1
      ? "AMBIGUOUS_PLANNING_AUTHORITY"
      : "PLANNING_AUTHORITY_OR_PROJECT_NAME_NOT_CONFIRMED",
    candidate_repd_refs: referenceGroup.projects.map(projectRef),
  };
}

export function buildFrontierContract(input) {
  const contract = previous.buildFrontierContract(input);
  const groups = buildReferenceGroups(input.fixture.projects);
  const eastPyeGroup = groups.find((group) => group.normalised_reference === normalisePlanningReference("EN0110014"));
  const duplicateGroup = groups.find((group) => group.projects.length > 1);
  if (!eastPyeGroup || !duplicateGroup) throw new Error("authority-safe binding fixtures incomplete");
  const eastPyeBinding = resolvePlanningBinding(input.fixture.planit_unique, eastPyeGroup);
  const duplicateBinding = resolvePlanningBinding(input.fixture.planit_duplicate, duplicateGroup);
  if (eastPyeBinding.repd_ref !== "17494") throw new Error("East Pye authority-safe regression failed");
  if (duplicateBinding.role !== "ABSTAIN") throw new Error("duplicate planning reference must abstain");

  return {
    ...contract,
    policy_id: POLICY_ID,
    fixture_proof: {
      ...contract.fixture_proof,
      east_pye_binding: eastPyeBinding,
      duplicate_reference_decision: duplicateBinding,
    },
    binding_gate: {
      exact_reference_required: true,
      exact_project_name_or_planning_authority_required: true,
      planning_authority_matching: "EXACT_AFTER_EXPLICIT_ALIAS_MAP",
      planning_authority_aliases: Object.fromEntries(authorityAliases),
      reference_unique_inside_repd_is_not_globally_unique: true,
      capacity_used_for_identity: false,
      ambiguous_action: "ABSTAIN",
    },
    publication_law: {
      ...contract.publication_law,
      cached_bindings_require_current_policy_reclassification: true,
    },
  };
}
