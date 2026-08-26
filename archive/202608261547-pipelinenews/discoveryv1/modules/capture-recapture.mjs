export function lincolnPetersen(nA, nB, overlap) {
  for (const [name, value] of Object.entries({ nA, nB, overlap })) if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  if (overlap > Math.min(nA, nB)) throw new Error("overlap cannot exceed either channel");
  if (overlap === 0) return { estimated_total: null, recall_a: null, recall_b: null, note: "no overlap — channels not comparable" };
  return {
    estimated_total: Math.round((nA * nB) / overlap),
    recall_a: Number((overlap / nB).toFixed(3)),
    recall_b: Number((overlap / nA).toFixed(3)),
    note: "optimistic two-channel estimate; source dependence requires three-channel log-linear review"
  };
}

export function weeklyCoverageReport({ week_ending, search_index_events, register_events, overlap }) {
  return {
    schema: "pipelinenews.discovery-coverage.v1",
    week_ending,
    channels: { search_index_events, register_events, overlap },
    estimate: lincolnPetersen(search_index_events, register_events, overlap),
    alert_threshold: 0.8
  };
}

export function publicationReadiness({ evaluated_at, latest_discovered_at, maximum_age_hours = 24, provider_statuses = [] }) {
  const evaluated = Date.parse(evaluated_at);
  const latest = Date.parse(latest_discovered_at);
  if (!Number.isFinite(evaluated) || !Number.isFinite(latest)) throw new Error("valid freshness timestamps required");
  const ageHours = (evaluated - latest) / 3_600_000;
  const unavailable = provider_statuses.filter((row) => row.status !== "LIVE").map((row) => row.provider);
  const current = ageHours >= 0 && ageHours <= maximum_age_hours;
  return {
    status: current && unavailable.length === 0 ? "CURRENT" : "CANDIDATE_NOT_CURRENT",
    evaluated_at,
    latest_discovered_at,
    age_hours: Number(ageHours.toFixed(3)),
    maximum_age_hours,
    unavailable_providers: unavailable,
    empty_result_means_no_mentions: false
  };
}
