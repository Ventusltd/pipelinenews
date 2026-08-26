import { createHash } from "node:crypto";

const allowedRoles = new Set(["DEVELOPER", "OWNER", "EPC", "PRINCIPAL_CONTRACTOR", "ICP", "OM_PROVIDER", "LENDER", "TECHNICAL_ADVISER"]);
const allowedStatuses = new Set(["CONFIRMED", "REPORTED", "ABSTAIN"]);
const forbiddenKeys = /(^|_)(person|individual|officer|name_of_person)($|_)/iu;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function assertNoPersonKeys(value, path = "row") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.test(key)) throw new Error(`person-keyed field forbidden at ${path}.${key}`);
    assertNoPersonKeys(child, `${path}.${key}`);
  }
}

export function normaliseAttribution(input) {
  assertNoPersonKeys(input);
  if (!String(input.repd_ref ?? "").match(/^\d+$/u)) throw new Error("numeric repd_ref required");
  const expectedProjectId = `GG2050-REPD-${input.repd_ref}`;
  if (input.gg_project_id !== expectedProjectId) throw new Error("canonical project ID mismatch");
  if (!allowedRoles.has(input.role)) throw new Error(`unsupported role: ${input.role}`);
  if (!allowedStatuses.has(input.claim_status)) throw new Error(`unsupported claim status: ${input.claim_status}`);
  if (!String(input.organisation ?? "").trim()) throw new Error("organisation required");
  const url = new URL(input.evidence_url);
  if (url.protocol !== "https:") throw new Error("evidence URL must use HTTPS");
  const credibility = Number(input.credibility);
  if (!(credibility > 0 && credibility <= 1)) throw new Error("credibility must be in (0, 1]");
  if (input.claim_status === "CONFIRMED" && credibility < 0.7) throw new Error("CONFIRMED requires tier-one or tier-two evidence");
  const identity = `${expectedProjectId}\n${input.role}\n${String(input.organisation).trim()}\n${url.toString()}\n${input.observed_at}`;
  return {
    attribution_id: `PN-ATTR-${sha256(identity).slice(0, 20).toUpperCase()}`,
    repd_ref: String(input.repd_ref),
    gg_project_id: expectedProjectId,
    role: input.role,
    organisation: String(input.organisation).trim(),
    company_number: input.company_number ? String(input.company_number) : null,
    effective_from: input.effective_from ?? null,
    effective_to: input.effective_to ?? null,
    evidence_url: url.toString(),
    evidence_domain: url.hostname.toLowerCase(),
    evidence_kind: input.evidence_kind,
    credibility,
    observed_at: input.observed_at,
    claim_status: input.claim_status
  };
}

export function appendAttributions(existing, incoming) {
  const rows = [...existing, ...incoming].map(normaliseAttribution);
  const byId = new Map();
  for (const row of rows) if (!byId.has(row.attribution_id)) byId.set(row.attribution_id, row);
  return [...byId.values()].sort((left, right) => left.gg_project_id.localeCompare(right.gg_project_id, "en", { numeric: true }) || left.role.localeCompare(right.role) || left.observed_at.localeCompare(right.observed_at) || left.attribution_id.localeCompare(right.attribution_id));
}

export function attributionsFromRegisteredCharge(project, charge) {
  if (charge.source_domain !== "find-and-update.company-information.service.gov.uk") throw new Error("registered-charge source must be the official company register");
  if (!Array.isArray(charge.persons_entitled) || !charge.persons_entitled.length) return [];
  return charge.persons_entitled.map((organisation) => normaliseAttribution({
    repd_ref: project.repd_ref,
    gg_project_id: project.gg_project_id,
    role: "LENDER",
    organisation,
    company_number: charge.company_number,
    effective_from: charge.created_on,
    effective_to: null,
    evidence_url: charge.evidence_url,
    evidence_kind: "REGISTERED_CHARGE_NAMED_SECURED_PARTY",
    credibility: 1,
    observed_at: charge.observed_at,
    claim_status: "CONFIRMED"
  }));
}

export function buildChargeFixtureProof(fixture) {
  if (fixture.schema !== "pipelinenews.attribution-charge-fixture.v1" || fixture.fixture_only !== true) throw new Error("fixture marker required");
  const roles = attributionsFromRegisteredCharge(fixture.project, fixture.charge);
  return {
    schema: "pipelinenews.attribution-charge-fixture-proof.v1",
    fixture_only: true,
    counts: { roles: roles.length, confirmed: roles.filter((row) => row.claim_status === "CONFIRMED").length },
    roles,
    interpretation: {
      named_secured_party_confirmed: true,
      registered_charge_date_confirmed: true,
      financial_close_inferred_from_charge_alone: false
    }
  };
}

export { allowedRoles, allowedStatuses };
