import { createHash } from "node:crypto";

export const DISCOVERY_POLICY_ID = "PN-DISCOVERY-RECALL-FIRST-STRICT-PROMOTION";

const TRACKING_PARAMETERS = new Set([
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const requiredNullFields = [
  "headline",
  "summary",
  "body",
  "author",
  "image_url",
  "article_id",
  "project_id",
  "repd_ref",
  "development_id",
  "data_centre_evidence_id",
  "event_type",
  "capacity_mw",
];

const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function canonicaliseSourceUrl(rawUrl, allowedHosts, canonicalHost) {
  const url = new URL(rawUrl);
  invariant(["http:", "https:"].includes(url.protocol), "source URL must use HTTP(S)");
  invariant(!url.username && !url.password, "source URL credentials are forbidden");
  const hosts = new Set(allowedHosts.map((host) => host.toLowerCase()));
  invariant(hosts.has(url.hostname.toLowerCase()), "source host is not allow-listed");
  invariant(hosts.has(canonicalHost.toLowerCase()), "canonical host is not allow-listed");

  url.protocol = "https:";
  url.hostname = canonicalHost.toLowerCase();
  url.port = "";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  invariant(/^\/news\/articles\/[a-z0-9]+$/.test(url.pathname), "source URL is not a BBC article path");
  return url.toString();
}

function validateMetadataObservation(observation) {
  invariant(["AGGREGATOR_METADATA", "SYNDICATION_METADATA"].includes(observation.evidence_class), "invalid metadata evidence class");
  invariant(observation.permitted_use === "DISCOVERY_METADATA_ONLY", "metadata observation cannot be promoted");
  invariant(observation.claim_eligible === false, "metadata observation cannot be claim-eligible");
  invariant(new URL(observation.observation_url).protocol === "https:", "metadata observation URL must use HTTPS");
  invariant(typeof observation.observed_title === "string" && observation.observed_title.length > 0, "metadata observation requires a title");
  invariant(Number.isFinite(Date.parse(observation.observed_published_at)), "metadata observation requires an ISO timestamp");
  return { ...observation };
}

export function discoverSource(seed) {
  invariant(seed.input_basis === "USER_PROVIDED_URL", "unsupported discovery input basis");
  invariant(seed.evidence_class === "PUBLISHER_DISCOVERY_SENTINEL", "unsupported source evidence class");
  invariant(seed.permitted_use === "CREDITED_OUTBOUND_LINK_ONLY", "publisher source must remain outbound-only");
  invariant(seed.identity_authority === "NONE", "publisher source cannot establish identity");
  for (const field of requiredNullFields) invariant(seed[field] === null, `${field} must remain null at URL-only discovery`);

  const canonicalUrl = canonicaliseSourceUrl(seed.url, seed.allowed_hosts, seed.canonical_host);
  const digest = sha256(canonicalUrl);
  const metadataObservations = (seed.metadata_observations || []).map(validateMetadataObservation);

  return {
    discovery_id: `PN-DISCOVERY-${digest.slice(0, 20).toUpperCase()}`,
    source_fingerprint: `sha256:${digest}`,
    canonical_url: canonicalUrl,
    publisher_label: seed.publisher_label,
    input_basis: seed.input_basis,
    evidence_class: seed.evidence_class,
    permitted_use: seed.permitted_use,
    identity_authority: seed.identity_authority,
    discovered_at: seed.discovered_at,
    discovery_status: "DISCOVERED_URL_ONLY",
    direct_source_metadata_status: "UNVERIFIED",
    content_retrieved: false,
    headline: null,
    summary: null,
    body: null,
    author: null,
    image_url: null,
    article_id: null,
    project_id: null,
    repd_ref: null,
    development_id: null,
    data_centre_evidence_id: null,
    event_type: null,
    capacity_mw: null,
    claim_eligible: false,
    metadata_observations: metadataObservations,
    decisions: {
      candidate_collection: "ACCEPT_RECALL_FIRST_URL",
      article_promotion: "HOLD_NO_DIRECT_SOURCE_METADATA",
      claim_extraction: "ABSTAIN_NO_DIRECT_ARTICLE_EVIDENCE",
      project_binding: "ABSTAIN_NO_IDENTITY_EVIDENCE",
      data_centre_binding: "ABSTAIN_NO_IDENTITY_EVIDENCE",
    },
  };
}

export function buildDiscoveryLedger(input) {
  invariant(input.schema === "pipelinenews.source-discovery-input.v1", "unexpected input schema");
  invariant(/^\d{12}-PipelineNews$/.test(input.release_id), "invalid timestamp release ID");
  invariant(input.app_title === "PipelineNews", "app title must remain PipelineNews");
  invariant(Number.isFinite(Date.parse(input.incepted_at)), "invalid inception timestamp");

  const candidates = input.candidates.map(discoverSource);
  invariant(new Set(candidates.map((row) => row.canonical_url)).size === candidates.length, "duplicate canonical source URL");
  invariant(new Set(candidates.map((row) => row.discovery_id)).size === candidates.length, "duplicate discovery ID");

  return {
    schema: "pipelinenews.source-discovery-ledger.v1",
    release_id: input.release_id,
    app_title: input.app_title,
    incepted_at: input.incepted_at,
    policy_id: DISCOVERY_POLICY_ID,
    status: "CANDIDATE",
    counts: {
      source_candidates: candidates.length,
      url_only_candidates: candidates.filter((row) => row.discovery_status === "DISCOVERED_URL_ONLY").length,
      promoted_articles: candidates.filter((row) => row.article_id !== null).length,
      project_bindings: candidates.filter((row) => row.project_id !== null).length,
      data_centre_bindings: candidates.filter((row) => row.data_centre_evidence_id !== null).length,
      claim_eligible: candidates.filter((row) => row.claim_eligible).length,
    },
    candidates,
    publication_law: {
      recall_first_candidate_collection: true,
      direct_source_verification_required_for_article_promotion: true,
      aggregator_metadata_may_create_claims: false,
      publisher_context_may_create_identity: false,
      url_discovery_may_change_official_repd_facts: false,
    },
  };
}
