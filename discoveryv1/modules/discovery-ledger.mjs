import { credibilityForDomain } from "./credibility.mjs";
import { canonicalUrl, clusterMentions, mentionId } from "./mention-normalizer.mjs";
import { matchDiscoveryMention } from "./matcher-bridge.mjs";

export function buildDiscoveryLedger(input) {
  if (input.schema !== "pipelinenews.discovery-fixture.v1") throw new Error("unexpected discovery input schema");
  if (input.fixture_only !== true) throw new Error("fixture marker required for candidate ledger build");
  const rows = input.observations.map((observation) => {
    if (Object.hasOwn(observation, "body")) throw new Error("article body storage is forbidden");
    const url = canonicalUrl(observation.url);
    const sourceDomain = new URL(url).hostname.toLowerCase();
    const snippet = String(observation.snippet ?? "").slice(0, 300);
    const binding = matchDiscoveryMention({ ...observation, snippet }, input.projects);
    const row = {
      mention_id: null,
      repd_ref: binding.repd_ref,
      gg_project_id: binding.gg_project_id,
      candidate_gg_project_ids: binding.candidate_gg_project_ids,
      canonical_url: url,
      source_domain: sourceDomain,
      credibility: credibilityForDomain(sourceDomain),
      title: observation.title,
      snippet,
      published_at: observation.published_at ?? null,
      discovered_at: observation.discovered_at,
      discovery_method: observation.discovery_method,
      query_used: observation.query_used,
      binding_evidence: { reason: binding.reason, ...binding.binding_evidence },
      binding_status: binding.binding_status,
      cluster_id: null
    };
    row.mention_id = mentionId(row);
    return row;
  });
  const clustered = clusterMentions(rows);
  if (new Set(clustered.map((row) => row.mention_id)).size !== clustered.length) throw new Error("duplicate mention IDs");
  return {
    schema: "pipelinenews.discovery-mentions.v1",
    release_id: input.release_id,
    fixture_only: true,
    publication_status: "REGRESSION_FIXTURE_ONLY",
    counts: {
      observations: clustered.length,
      primary_match: clustered.filter((row) => row.binding_status === "PRIMARY_MATCH").length,
      abstain: clustered.filter((row) => row.binding_status === "ABSTAIN").length,
      rejected: clustered.filter((row) => row.binding_status === "REJECTED").length
    },
    mentions: clustered,
    publication_law: {
      repd_mutated: false,
      credibility_gates_binding: false,
      outbound_result_pages_fetched: false,
      article_bodies_stored: false,
      abstentions_retained: true
    }
  };
}
