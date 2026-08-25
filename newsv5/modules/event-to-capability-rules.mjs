export const RULE_VERSION = "event-to-capability.v1";

export const EVENT_TO_CAPABILITY_RULES = Object.freeze([
  {event_type: "ACQUISITION", capability: "TRANSACTION_TECHNICAL_DUE_DILIGENCE", theme_evidence_id: "VENTUS-PODCAST-THEME-005"},
  {event_type: "CONSENT", capability: "CONSENT_TO_DELIVERY_RESEARCH", theme_evidence_id: "VENTUS-PODCAST-THEME-001"},
  {event_type: "CONTRACT", capability: "PROCUREMENT_AND_DELIVERY_RESEARCH", theme_evidence_id: "VENTUS-PODCAST-THEME-006"},
  {event_type: "FINANCIAL_CLOSE", capability: "INVESTMENT_TECHNICAL_DUE_DILIGENCE", theme_evidence_id: "VENTUS-PODCAST-THEME-005"},
  {event_type: "PROJECT_UPDATE", capability: "PROJECT_LIFECYCLE_RESEARCH", theme_evidence_id: "VENTUS-PODCAST-THEME-001"},
  {event_type: "REFUSAL", capability: "PLANNING_AND_DELIVERY_RISK_RESEARCH", theme_evidence_id: "VENTUS-PODCAST-THEME-001"}
]);

export function ruleForEvent(eventType) {
  return EVENT_TO_CAPABILITY_RULES.find((rule) => rule.event_type === eventType) ?? null;
}
