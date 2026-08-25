export const IDENTITY_RULE_VERSION = "PN-DC-IDENTITY-V1";
export const linkDecision = ({exactSharedSourceObject = false, atlasIdentityLost = false} = {}) => exactSharedSourceObject && !atlasIdentityLost ? "LINK_EXACT_SOURCE_OBJECT" : "ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE";
export const hostileDecision = (caseId) => caseId === "CAPACITY_NUMBER_WITHOUT_TYPE" ? "ABSTAIN_UNTYPED_CAPACITY" : caseId === "OUTBOUND_DIRECTORY_IDENTITY" ? "ABSTAIN_SOURCE_NOT_ADMISSIBLE" : "ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE";
