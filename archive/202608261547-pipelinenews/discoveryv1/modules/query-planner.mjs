const lifecycleWeight = Object.freeze({
  UNDER_CONSTRUCTION: 1,
  LIVE_PRE_CONSTRUCTION: 0.85,
  UNKNOWN: 0.4,
  OPERATIONAL: 0.25,
  INACTIVE: 0.05,
});

const descriptorTail = /\s*[-,]?\s*(solar|battery|energy)\s+(farm|park|storage|project|facility|system)s?\b.*$/iu;
const administrativeSegment = /\s+-\s+|,/u;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function priority(candidate) {
  const weight = lifecycleWeight[candidate.lifecycle] ?? 0.3;
  const size = Math.min(1, Math.log10(Math.max(finite(candidate.capacity_mw, 1), 1)) / 3);
  const stale = Math.min(Math.max(finite(candidate.days_since_last_query), 0) / 90, 1);
  const yieldPrior = Math.min(Math.max(finite(candidate.hits_all_time), 0) / 5, 1);
  const daysSinceHit = candidate.days_since_last_hit === null || candidate.days_since_last_hit === undefined
    ? null
    : finite(candidate.days_since_last_hit);
  const heat = daysSinceHit === null ? 0 : Math.max(0, 1 - daysSinceHit / 60);
  return (0.35 * weight) + (0.15 * size) + (0.3 * stale) + (0.1 * yieldPrior) + (0.1 * heat);
}

export function queryForms(name, operator = null) {
  const sourceName = String(name ?? "").normalize("NFKC").trim();
  if (!sourceName) return [];
  const segment = sourceName.split(administrativeSegment)[0].trim();
  const stem = segment.replace(descriptorTail, "").trim();
  const forms = [];
  if (stem.split(/\s+/u).filter(Boolean).length >= 2) {
    forms.push(`"${stem} solar"`);
    forms.push(operator ? `"${stem}" "${String(operator).trim()}"` : `"${stem}" UK`);
  }
  forms.push(`"${sourceName}"`);
  return [...new Set(forms)].slice(0, 2);
}

export function siteRestrictedQueries(candidate, siteDomain) {
  const domain = String(siteDomain ?? "").trim().toLowerCase();
  if (!/^[a-z0-9.-]+$/u.test(domain) || domain.includes("..")) throw new Error("site domain must be a hostname");
  return queryForms(candidate.name, candidate.operator).map((query) => `${query} site:${domain}`);
}

export function selectDailyCandidates(candidates, budget, { maximumDaysWithoutQuery = 30 } = {}) {
  if (!Array.isArray(candidates)) throw new Error("candidates must be an array");
  if (!Number.isInteger(budget) || budget < 1) throw new Error("budget must be a positive integer");
  if (!Number.isInteger(maximumDaysWithoutQuery) || maximumDaysWithoutQuery < 1) throw new Error("maximumDaysWithoutQuery must be positive");

  const rows = candidates.map((candidate) => {
    if (!String(candidate.repd_ref ?? "").match(/^\d+$/u)) throw new Error("candidate requires numeric repd_ref");
    const neverQueried = candidate.days_since_last_query === null || candidate.days_since_last_query === undefined;
    const days = neverQueried ? Number.POSITIVE_INFINITY : finite(candidate.days_since_last_query);
    return {
      ...candidate,
      score: priority({ ...candidate, days_since_last_query: neverQueried ? maximumDaysWithoutQuery : days }),
      starvation_guard: neverQueried || days >= maximumDaysWithoutQuery,
      days_for_ordering: days,
    };
  });

  rows.sort((left, right) =>
    Number(right.starvation_guard) - Number(left.starvation_guard)
    || right.days_for_ordering - left.days_for_ordering
    || right.score - left.score
    || String(left.repd_ref).localeCompare(String(right.repd_ref), "en", { numeric: true }));

  return rows.slice(0, Math.min(budget, rows.length)).map((row) => ({
    repd_ref: String(row.repd_ref),
    gg_project_id: `GG2050-REPD-${row.repd_ref}`,
    priority: Number(row.score.toFixed(6)),
    starvation_guard: row.starvation_guard,
    query_forms: queryForms(row.name, row.operator),
  }));
}

export { lifecycleWeight };
