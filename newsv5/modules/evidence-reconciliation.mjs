export const RECONCILER_VERSION = "reason-evidence-reconciler.v1";

export function reconcileReasonEvidence({identityConflict = false, eventVerificationStatus = null, directProjectRecord = true, podcastOnly = false, compositeLabelOnly = false, proximityOnly = false, gridConnectionRecord = false, contextFreshness = null}) {
  if (identityConflict) return {decision: "REJECT", code: "CONFLICTING_AUTHORITATIVE_IDENTITY"};
  if (eventVerificationStatus === "HEADLINE_DERIVED_UNVERIFIED" || contextFreshness === "STALE") {
    return {decision: "HOLD_FOR_VERIFICATION", code: "DIRECT_EVENT_EVIDENCE_REQUIRED"};
  }
  if (!directProjectRecord || podcastOnly || compositeLabelOnly || (proximityOnly && !gridConnectionRecord)) {
    return {decision: "ABSTAIN", code: "INSUFFICIENT_DIRECT_PROJECT_EVIDENCE"};
  }
  if (eventVerificationStatus === "DIRECT_PUBLIC_RECORD_VERIFIED") {
    return {decision: "PUBLISH_REASON_TO_RESEARCH", code: "DIRECT_EVENT_EVIDENCE_PRESENT"};
  }
  return {decision: "ABSTAIN", code: "NO_PUBLISHABLE_EVIDENCE"};
}

export function reconcileHostileCase(caseId) {
  const inputs = {
    SHARED_NAME_CONFLICTING_PROJECT_IDS: {identityConflict: true},
    COMPOSITE_OPERATOR_LABEL_ONLY: {compositeLabelOnly: true},
    PODCAST_GUEST_WITHOUT_PROJECT_EVIDENCE: {podcastOnly: true, directProjectRecord: false},
    STALE_MARKET_RECORD_WITH_UNVERIFIED_EVENT: {eventVerificationStatus: "HEADLINE_DERIVED_UNVERIFIED", contextFreshness: "STALE"},
    HEADLINE_WITHOUT_VERIFIED_EVENT: {eventVerificationStatus: "HEADLINE_DERIVED_UNVERIFIED"},
    NEARBY_SUBSTATION_WITHOUT_CONNECTION_EVIDENCE: {proximityOnly: true, gridConnectionRecord: false}
  }[caseId];
  if (!inputs) throw new Error(`Unknown hostile case: ${caseId}`);
  return reconcileReasonEvidence(inputs);
}
