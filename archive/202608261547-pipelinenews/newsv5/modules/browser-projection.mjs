export const BROWSER_PROJECTION_VERSION = "reason-browser-projection.v1";

export function buildBrowserProjection(product) {
  return {
    schema: "pipelinenews.reason-to-research-browser.v1",
    release: product.release,
    status: product.status,
    generated_at: product.generated_at,
    source_artifact: "newsv5/data/reason_decision_ledger.json",
    order_law: "source display_order ascending, then reason_id ascending",
    count: product.reason_decisions.filter((row) => row.decision === "PUBLISH_REASON_TO_RESEARCH").length,
    reasons: product.reason_decisions
      .filter((row) => row.decision === "PUBLISH_REASON_TO_RESEARCH")
      .sort((a, b) => a.source_display_order - b.source_display_order || a.reason_id.localeCompare(b.reason_id))
      .map((row) => ({
        reason_id: row.reason_id,
        project_id: row.project_id,
        repd_ref: row.repd_ref,
        capability: row.capability,
        explanation: row.explanation,
        limitations: row.limitations,
        source_urls: row.source_urls,
        claim_status: row.claim_status
      }))
  };
}
