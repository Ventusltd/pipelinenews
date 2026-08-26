import { appendAttributions } from "./attribution-ledger.mjs";

export function buildDiscrepancyView(rawRoles, projects) {
  const roles = appendAttributions([], rawRoles);
  const projectById = new Map(projects.map((project) => [project.gg_project_id, project]));
  const confirmed = roles.filter((row) => row.claim_status === "CONFIRMED");
  return roles.filter((row) => row.claim_status === "REPORTED").map((reported) => {
    const comparable = confirmed.filter((row) => row.gg_project_id === reported.gg_project_id && row.role === reported.role);
    const consistent = comparable.some((row) => row.organisation === reported.organisation);
    const status = !comparable.length ? "NO_CONFIRMED_RECORD" : consistent ? "CONSISTENT" : "CONFLICTS_WITH_CONFIRMED";
    const project = projectById.get(reported.gg_project_id);
    return {
      discrepancy_id: `${reported.attribution_id}-VIEW`,
      gg_project_id: reported.gg_project_id,
      project_name: project?.name ?? null,
      role: reported.role,
      reported_organisation: reported.organisation,
      reported_source: reported.evidence_url,
      reported_at: reported.observed_at,
      confirmed_records: comparable.map((row) => ({ organisation: row.organisation, evidence_url: row.evidence_url, observed_at: row.observed_at })),
      project_state_at_claim: project?.lifecycle ?? "UNKNOWN",
      status
    };
  }).sort((left, right) => left.gg_project_id.localeCompare(right.gg_project_id, "en", { numeric: true }) || left.role.localeCompare(right.role) || left.reported_organisation.localeCompare(right.reported_organisation));
}

export function buildDiscrepancyFixtureProof(fixture) {
  if (fixture.schema !== "pipelinenews.attribution-discrepancy-fixture.v1" || fixture.fixture_only !== true) throw new Error("fixture marker required");
  const rows = buildDiscrepancyView(fixture.roles, fixture.projects);
  const count = (status) => rows.filter((row) => row.status === status).length;
  return {
    schema: "pipelinenews.attribution-discrepancy-fixture-proof.v1",
    fixture_only: true,
    counts: { rows: rows.length, consistent: count("CONSISTENT"), conflicts_with_confirmed: count("CONFLICTS_WITH_CONFIRMED"), no_confirmed_record: count("NO_CONFIRMED_RECORD") },
    rows,
    publication_law: { descriptive_status_only: true, allegation_or_person_assessment: false, source_links_retained: true }
  };
}
