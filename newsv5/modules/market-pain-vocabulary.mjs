export const VOCABULARY_VERSION = "market-pain-vocabulary.v1";

export function buildMarketPainVocabulary(audit) {
  if (audit.purpose !== "Build a source-grounded search taxonomy, not a prospect or opportunity list.") {
    throw new Error("Theme audit usage contract changed");
  }
  return audit.themes.map((theme) => {
    if (theme.claim_status !== "THEME_ONLY_NOT_OPPORTUNITY" || theme.decision !== "INCLUDE_AS_SEARCH_TAXONOMY") {
      throw new Error(`Unsafe theme evidence: ${theme.theme_evidence_id}`);
    }
    return {
      theme_evidence_id: theme.theme_evidence_id,
      theme: theme.theme,
      search_terms: [...theme.search_terms],
      source_url: theme.episode_url,
      evidence_class: theme.evidence_class,
      claim_status: theme.claim_status,
      permitted_use: "SEARCH_VOCABULARY_ONLY"
    };
  });
}
