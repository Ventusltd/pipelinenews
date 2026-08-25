import { createHash } from "node:crypto";

export const POLICY_ID = "PN-EVIDENCE-CREDIBILITY-V1";

const CREDIBILITY = Object.freeze({
  OFFICIAL_REPD_REGISTER: 100,
  OFFICIAL_PLANNING_AUTHORITY: 95,
  OFFICIAL_AGGREGATOR: 90,
  ORIGINAL_PUBLISHER: 65,
  NEWS_AGGREGATOR: 30,
  SYNDICATION: 25,
});

const IDENTITY_AUTHORITIES = new Set(["OFFICIAL_REPD_REGISTER", "OFFICIAL_PLANNING_AUTHORITY"]);
const TRACKING_PARAMETERS = new Set(["utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"]);
const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function canonicaliseUrl(rawUrl) {
  const url = new URL(rawUrl);
  invariant(["http:", "https:"].includes(url.protocol), "evidence URL must use HTTP(S)");
  invariant(!url.username && !url.password, "URL credentials are forbidden");
  url.protocol = "https:";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function normaliseEvidence(observation) {
  invariant(Object.hasOwn(CREDIBILITY, observation.source_class), `unknown source class: ${observation.source_class}`);
  invariant(typeof observation.publisher_label === "string" && observation.publisher_label.length > 0, "publisher label required");
  invariant(typeof observation.source_ref === "string" && observation.source_ref.length > 0, "source reference required");
  const canonicalUrl = canonicaliseUrl(observation.url);
  const credibilityScore = CREDIBILITY[observation.source_class];
  const identityAuthority = IDENTITY_AUTHORITIES.has(observation.source_class);
  invariant(!observation.claims?.body, "third-party article bodies must not be stored");
  if (!identityAuthority) {
    invariant(!observation.claims?.repd_ref, "non-official evidence cannot assert a REPD reference");
    invariant(!observation.claims?.planning_application_reference, "non-official evidence cannot assert a planning reference");
  }
  const digest = sha256(`${observation.source_class}\n${observation.source_ref}\n${canonicalUrl}`);
  return {
    evidence_id: `PN-EVIDENCE-${digest.slice(0, 20).toUpperCase()}`,
    source_class: observation.source_class,
    credibility_score: credibilityScore,
    credibility_label: credibilityScore >= 90 ? "OFFICIAL" : credibilityScore >= 60 ? "PUBLISHER" : "DISCOVERY",
    identity_authority: identityAuthority,
    publisher_label: observation.publisher_label,
    source_ref: observation.source_ref,
    canonical_url: canonicalUrl,
    observed_at: observation.observed_at,
    permitted_use: observation.permitted_use,
    claims: observation.claims || {},
  };
}

function bindProject(projects, evidence) {
  const official = evidence.filter((row) => row.identity_authority);
  const assertedRefs = new Set(official.map((row) => row.claims.repd_ref).filter(Boolean));
  const planningRefs = new Set(official.map((row) => row.claims.planning_application_reference).filter(Boolean));
  const candidates = projects.filter((project) => assertedRefs.has(project.repd_ref) || planningRefs.has(project.planning_application_reference));
  invariant(candidates.length === 1, `official identity evidence must resolve exactly one project; got ${candidates.length}`);
  const project = candidates[0];
  invariant(!project.related_repd_refs.includes(project.repd_ref), "project cannot relate to itself");
  return {
    role: "PRIMARY_MATCH",
    method: assertedRefs.has(project.repd_ref) ? "EXACT_REPD_REF" : "EXACT_PLANNING_REFERENCE",
    repd_ref: project.repd_ref,
    gg_project_id: `GG2050-REPD-${project.repd_ref}`,
    project_name: project.project_name,
    technology: project.technology,
    official_capacity_mw: project.official_capacity_mw,
    planning_application_reference: project.planning_application_reference,
    related_repd_refs: project.related_repd_refs,
    news_may_overwrite_official_facts: false,
  };
}

export function buildEvidenceLedger(input) {
  invariant(input.schema === "pipelinenews.evidence-input.v1", "unexpected evidence input schema");
  invariant(/^\d{12}-PipelineNews$/.test(input.release_id), "invalid release ID");
  invariant(input.app_title === "PipelineNews", "app title must remain PipelineNews");
  invariant(Array.isArray(input.v1_v5_mission_invariants) && input.v1_v5_mission_invariants.length >= 5, "V1-V5 mission baseline missing");

  const evidence = input.observations.map(normaliseEvidence).sort((a, b) => b.credibility_score - a.credibility_score || a.evidence_id.localeCompare(b.evidence_id));
  invariant(new Set(evidence.map((row) => row.evidence_id)).size === evidence.length, "duplicate evidence ID");
  invariant(evidence.some((row) => row.source_class === "NEWS_AGGREGATOR"), "noisy news discovery must remain enabled");
  invariant(evidence.some((row) => row.credibility_score >= 90), "official evidence required");

  const binding = bindProject(input.projects, evidence);
  const publisher = evidence.find((row) => row.source_class === "ORIGINAL_PUBLISHER");
  invariant(publisher, "original publisher evidence required");
  const official = evidence.filter((row) => row.identity_authority);
  const eventDigest = sha256(`${binding.gg_project_id}\n${publisher.canonical_url}`);

  return {
    schema: "pipelinenews.evidence-ledger.v1",
    release_id: input.release_id,
    app_title: input.app_title,
    incepted_at: input.incepted_at,
    policy_id: POLICY_ID,
    counts: {
      observations: evidence.length,
      official_observations: evidence.filter((row) => row.credibility_score >= 90).length,
      publisher_observations: evidence.filter((row) => row.credibility_label === "PUBLISHER").length,
      discovery_observations: evidence.filter((row) => row.credibility_label === "DISCOVERY").length,
      primary_matches: 1,
    },
    event: {
      event_id: `PN-EVENT-${eventDigest.slice(0, 20).toUpperCase()}`,
      headline: publisher.claims.headline,
      direct_outbound_url: publisher.canonical_url,
      publisher_label: publisher.publisher_label,
      published_at: publisher.claims.published_at,
      publisher_reported_claim: publisher.claims.publisher_reported_claim,
      publisher_claim_credibility_score: publisher.credibility_score,
      official_status: official.map((row) => row.claims.official_status).find(Boolean),
      highest_credibility_score: Math.max(...evidence.map((row) => row.credibility_score)),
      binding,
    },
    evidence,
    source_adapters: input.source_adapters,
    mission_invariants: input.v1_v5_mission_invariants,
    publication_law: {
      official_sources_rank_above_news: true,
      google_discovery_retained: true,
      original_outlet_credited_and_linked: true,
      article_body_stored: false,
      non_official_sources_may_establish_identity: false,
      news_may_overwrite_repd: false,
      default_ambiguous_binding: "ABSTAIN",
    },
  };
}
