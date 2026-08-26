import { createHash } from "node:crypto";
import { appendAttributions, normaliseAttribution } from "./attribution-ledger.mjs";

const sourcePolicy = Object.freeze({
  planit: ["planit.org.uk", "OFFICIAL_PLANNING_AGGREGATOR"],
  planning_data: ["planning.data.gov.uk", "OFFICIAL_PLANNING_DATA"],
  neso: ["neso.energy", "OFFICIAL_CONNECTION_REGISTER"],
  lccc: ["lowcarboncontracts.uk", "OFFICIAL_CFD_REGISTER"],
  gazette: ["thegazette.co.uk", "OFFICIAL_STATUTORY_NOTICE"]
});
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function sourceDetails(record) {
  const policy = sourcePolicy[record.source_type];
  if (!policy) throw new Error(`unsupported register source: ${record.source_type}`);
  const url = new URL(record.evidence_url);
  if (url.protocol !== "https:" || !(url.hostname === policy[0] || url.hostname.endsWith(`.${policy[0]}`))) throw new Error(`source URL does not match ${record.source_type} policy`);
  return { url, evidenceKind: policy[1] };
}

function normaliseOrganisationEvent(record, details) {
  if (!String(record.organisation ?? "").trim()) throw new Error("organisation event requires organisation");
  const identity = `${record.gg_project_id}\n${record.organisation}\n${record.event_type}\n${record.source_ref}\n${record.observed_at}`;
  return {
    organisation_event_id: `PN-ORG-EVENT-${sha256(identity).slice(0, 20).toUpperCase()}`,
    repd_ref: String(record.repd_ref),
    gg_project_id: record.gg_project_id,
    organisation: String(record.organisation).trim(),
    company_number: record.company_number ?? null,
    event_type: record.event_type,
    event_date: record.event_date ?? null,
    evidence_url: details.url.toString(),
    evidence_domain: details.url.hostname,
    evidence_kind: details.evidenceKind,
    credibility: 1,
    observed_at: record.observed_at
  };
}

export function ingestRegisterRecords(records) {
  if (!Array.isArray(records)) throw new Error("register records must be an array");
  const roles = [];
  const organisationEvents = [];
  const abstentions = [];
  for (const record of records) {
    const details = sourceDetails(record);
    if (record.source_type === "gazette") {
      organisationEvents.push(normaliseOrganisationEvent(record, details));
      continue;
    }
    if (!record.organisation) {
      abstentions.push({
        source_type: record.source_type,
        source_ref: record.source_ref,
        gg_project_id: record.gg_project_id,
        decision: "ABSTAIN",
        reason: "NO_EXPLICIT_ORGANISATION",
        observed_at: record.observed_at
      });
      continue;
    }
    roles.push(normaliseAttribution({
      repd_ref: record.repd_ref,
      gg_project_id: record.gg_project_id,
      role: record.role,
      organisation: record.organisation,
      company_number: record.company_number ?? null,
      effective_from: record.effective_from ?? null,
      effective_to: record.effective_to ?? null,
      evidence_url: details.url.toString(),
      evidence_kind: details.evidenceKind,
      credibility: 1,
      observed_at: record.observed_at,
      claim_status: "CONFIRMED"
    }));
  }
  return {
    roles: appendAttributions([], roles),
    organisation_events: organisationEvents.sort((left, right) => left.organisation_event_id.localeCompare(right.organisation_event_id)),
    abstentions: abstentions.sort((left, right) => left.source_ref.localeCompare(right.source_ref))
  };
}

export function buildRegisterFixtureProof(fixture) {
  if (fixture.schema !== "pipelinenews.attribution-register-fixture.v1" || fixture.fixture_only !== true) throw new Error("fixture marker required");
  const output = ingestRegisterRecords(fixture.records);
  return {
    schema: "pipelinenews.attribution-register-fixture-proof.v1",
    fixture_only: true,
    counts: { roles: output.roles.length, confirmed: output.roles.filter((row) => row.claim_status === "CONFIRMED").length, organisation_events: output.organisation_events.length, abstentions: output.abstentions.length },
    ...output,
    publication_law: { source_role_must_be_explicit: true, contradictions_overwritten: false, gazette_event_inferred_as_delivery_role: false }
  };
}

export { sourcePolicy };
