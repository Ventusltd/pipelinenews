export const SOURCE_POLICY_VERSION = "PN-DC-SOURCE-POLICY-V1";
export const allowedForObservation = (source) => ["STRUCTURED_DISCOVERY", "DIRECT_COMPANY_RECORD"].includes(source.evidence_class);
export const allowedForIdentityLink = (source) => source.identity_authority === "SOURCE_OBJECT_ONLY" && source.evidence_class !== "DISCOVERY_ONLY_IDENTITY_LOSS";
