import { createHash } from "node:crypto";

export const POLICY_ID = "PN-OFFICIAL-FRONTIER-V1";
export const SOURCE_SCORES = Object.freeze({
  OFFICIAL_REPD_REGISTER: 100,
  OFFICIAL_GOV_UK: 95,
  OFFICIAL_PLANNING_AUTHORITY: 95,
  OFFICIAL_AGGREGATOR_PLANIT: 90,
  ORIGINAL_PUBLISHER: 65,
  NEWS_AGGREGATOR_GOOGLE: 30,
});

const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value) => String(value ?? "").normalize("NFKC").trim();
const compact = (value) => text(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function normalisePlanningReference(value) {
  return compact(value);
}

function projectName(project) {
  return text(project.name || project.project_name || project.site_name);
}

function projectRef(project) {
  return text(project.repd_ref || project.Ref_ID || project.ref_id);
}

function projectPriority(project) {
  const state = `${text(project.lifecycle)} ${text(project.status || project.official_status)}`.toLowerCase();
  if (state.includes("live_pre_construction") || state.includes("application") || state.includes("construction")) return 0;
  if (state.includes("operational")) return 2;
  if (state.includes("refused") || state.includes("withdrawn") || state.includes("abandoned")) return 3;
  return 1;
}

export function buildReferenceGroups(projects) {
  invariant(Array.isArray(projects), "projects must be an array");
  const groups = new Map();
  for (const project of projects) {
    const rawReference = text(project.planning_application_reference);
    const normalisedReference = normalisePlanningReference(rawReference);
    if (!normalisedReference) continue;
    invariant(projectRef(project), "every scheduled project requires a REPD reference");
    const group = groups.get(normalisedReference) || { normalised_reference: normalisedReference, query_references: new Set(), projects: [] };
    group.query_references.add(rawReference);
    group.projects.push(project);
    groups.set(normalisedReference, group);
  }
  return [...groups.values()].map((group) => ({
    normalised_reference: group.normalised_reference,
    query_reference: [...group.query_references].sort((a, b) => a.length - b.length || a.localeCompare(b))[0],
    priority: Math.min(...group.projects.map(projectPriority)),
    projects: group.projects.sort((a, b) => projectRef(a).localeCompare(projectRef(b), "en", { numeric: true })),
  })).sort((a, b) => a.priority - b.priority || a.normalised_reference.localeCompare(b.normalised_reference));
}

export function selectFrontier(groups, state = {}, budget = 48) {
  invariant(Number.isInteger(budget) && budget > 0, "budget must be a positive integer");
  if (!groups.length) return { selected: [], next_index: 0, total_groups: 0, wrapped: false };
  const start = Number.isInteger(state.next_index) ? ((state.next_index % groups.length) + groups.length) % groups.length : 0;
  const count = Math.min(budget, groups.length);
  const selected = Array.from({ length: count }, (_, offset) => groups[(start + offset) % groups.length]);
  invariant(new Set(selected.map((group) => group.normalised_reference)).size === selected.length, "frontier emitted duplicate references");
  return {
    selected,
    next_index: (start + count) % groups.length,
    total_groups: groups.length,
    wrapped: start + count >= groups.length,
  };
}

function recordReferences(record) {
  return [record.uid, record.reference, record.altid, record.name].map(normalisePlanningReference).filter(Boolean);
}

export function resolvePlanningBinding(record, referenceGroup) {
  const recordRefs = new Set(recordReferences(record));
  if (!recordRefs.has(referenceGroup.normalised_reference)) {
    return { role: "ABSTAIN", reason: "PLANNING_REFERENCE_NOT_EXACT" };
  }
  if (referenceGroup.projects.length === 1) {
    const project = referenceGroup.projects[0];
    return {
      role: "PRIMARY_MATCH",
      method: "REPD_AND_PLANIT_EXACT_REFERENCE",
      repd_ref: projectRef(project),
      gg_project_id: text(project.gg_project_id) || `GG2050-REPD-${projectRef(project)}`,
      project_name: projectName(project),
      planning_application_reference: text(project.planning_application_reference),
      news_may_overwrite_official_facts: false,
    };
  }

  const body = compact([record.description, record.name, record.applicant, record.area_name].filter(Boolean).join(" "));
  const named = referenceGroup.projects.filter((project) => {
    const name = compact(projectName(project));
    return name.length >= 8 && body.includes(name);
  });
  if (named.length === 1) {
    const project = named[0];
    return {
      role: "PRIMARY_MATCH",
      method: "EXACT_REFERENCE_PLUS_EXACT_PROJECT_NAME",
      repd_ref: projectRef(project),
      gg_project_id: text(project.gg_project_id) || `GG2050-REPD-${projectRef(project)}`,
      project_name: projectName(project),
      planning_application_reference: text(project.planning_application_reference),
      news_may_overwrite_official_facts: false,
    };
  }
  return {
    role: "ABSTAIN",
    reason: "AMBIGUOUS_REPD_PLANNING_REFERENCE",
    candidate_repd_refs: referenceGroup.projects.map(projectRef),
  };
}

export function sourceHealth({ attempted, succeeded, statusCode, priorGoodAt = null, message = null }) {
  const status = succeeded === attempted && attempted > 0 ? "LIVE" : succeeded > 0 ? "DEGRADED" : "UNAVAILABLE";
  return { status, attempted, succeeded, status_code: statusCode ?? null, prior_good_at: priorGoodAt, message };
}

export function buildFrontierContract(input) {
  invariant(input.schema === "pipelinenews.official-frontier-input.v1", "unexpected input schema");
  invariant(/^\d{12}-PipelineNews$/.test(input.release_id), "invalid release ID");
  invariant(input.app_title === "PipelineNews", "fixed app title changed");
  invariant(input.spine.total_projects === input.spine.with_planning_reference + input.spine.without_planning_reference, "spine coverage does not reconcile");
  invariant(input.sources.google_news.enabled, "Google discovery must remain enabled");
  invariant(SOURCE_SCORES.OFFICIAL_GOV_UK > SOURCE_SCORES.ORIGINAL_PUBLISHER, "official sources must outrank publishers");
  invariant(SOURCE_SCORES.ORIGINAL_PUBLISHER > SOURCE_SCORES.NEWS_AGGREGATOR_GOOGLE, "publishers must outrank aggregators");

  const groups = buildReferenceGroups(input.fixture.projects);
  const frontier = selectFrontier(groups, input.fixture.state, input.scheduler.reference_budget_per_run);
  const uniqueGroup = groups.find((group) => group.normalised_reference === normalisePlanningReference("EN0110014"));
  const duplicateGroup = groups.find((group) => group.projects.length > 1);
  invariant(uniqueGroup && duplicateGroup, "binding fixtures incomplete");
  const uniqueBinding = resolvePlanningBinding(input.fixture.planit_unique, uniqueGroup);
  const duplicateBinding = resolvePlanningBinding(input.fixture.planit_duplicate, duplicateGroup);
  invariant(uniqueBinding.repd_ref === "17494", "East Pye regression failed");
  invariant(duplicateBinding.role === "ABSTAIN", "duplicate planning reference must abstain");

  const sourceOrder = Object.entries(SOURCE_SCORES).map(([source_class, score]) => ({ source_class, score })).sort((a, b) => b.score - a.score || a.source_class.localeCompare(b.source_class));
  return {
    schema: "pipelinenews.official-frontier-contract.v1",
    release_id: input.release_id,
    app_title: input.app_title,
    incepted_at: input.incepted_at,
    policy_id: POLICY_ID,
    contract_id: `PN-CONTRACT-${sha256(JSON.stringify(input.spine)).slice(0, 20).toUpperCase()}`,
    spine: input.spine,
    scheduler: { ...input.scheduler, strategy: "PERSISTENT_PRIORITY_FRONTIER", unfinished_work_resumes: true, duplicate_queries_per_run: false },
    source_order: sourceOrder,
    adapters: input.sources,
    fixture_proof: {
      selected_references: frontier.selected.map((group) => group.query_reference),
      next_index: frontier.next_index,
      east_pye_binding: uniqueBinding,
      duplicate_reference_decision: duplicateBinding,
    },
    publication_law: {
      full_repd_spine_retained: true,
      official_sources_rank_above_news: true,
      google_discovery_retained: true,
      original_outlet_gets_outbound_link: true,
      article_body_stored: false,
      empty_fetch_means_no_news: false,
      ambiguous_binding: "ABSTAIN",
      news_may_overwrite_repd: false,
    },
    mission_invariants: input.v1_v5_mission_invariants,
  };
}
