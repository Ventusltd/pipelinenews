const text = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const compact = (value) => text(value).replace(/\s+/gu, "");
const descriptorTail = /\s+(solar\s+farm|solar\s+park|battery\s+storage|energy\s+storage|wind\s+farm|energy\s+park|power\s+station).*$/iu;
const foreignLocation = /\b(usa|united states|california|canada|australia|germany|spain|italy|france|india|china)\b/iu;

function technologyClass(value) {
  const source = text(value);
  if (/\b(battery|bess|energy storage)\b/u.test(source)) return "BATTERY";
  if (/\b(solar|photovoltaic|pv)\b/u.test(source)) return "SOLAR";
  if (/\b(offshore wind)\b/u.test(source)) return "WIND_OFFSHORE";
  if (/\b(onshore wind|wind farm|wind turbine)\b/u.test(source)) return "WIND_ONSHORE";
  return null;
}

function projectTechnology(value) {
  const source = text(value);
  if (source.includes("battery")) return "BATTERY";
  if (source.includes("solar") || source.includes("photovoltaic")) return "SOLAR";
  if (source.includes("offshore")) return "WIND_OFFSHORE";
  if (source.includes("wind")) return "WIND_ONSHORE";
  return null;
}

function nameStem(name) {
  const first = String(name ?? "").split(/\s+-\s+|,/u)[0];
  return text(first).replace(descriptorTail, "").trim();
}

function evidenceFor(project, haystack, observedTechnology) {
  const exactName = haystack.includes(text(project.name));
  const stem = nameStem(project.name);
  const stemTokens = stem.split(/\s+/u).filter(Boolean);
  const stemMatch = stemTokens.length >= 2 && haystack.includes(stem);
  const planningReference = compact(project.planning_application_reference);
  const planningMatch = planningReference.length >= 6 && compact(haystack).includes(planningReference);
  const projectTech = projectTechnology(project.technology);
  const technologyMatch = !observedTechnology || observedTechnology === projectTech;
  const operatorMatch = text(project.operator).length >= 4 && haystack.includes(text(project.operator));
  const locationMatch = text(project.county).length >= 3 && haystack.includes(text(project.county));
  const capacityMatch = Number.isFinite(Number(project.capacity_mw)) && new RegExp(`\\b${Number(project.capacity_mw)}\\s*mw\\b`, "iu").test(haystack);
  const identityGate = planningMatch || exactName || stemMatch;
  const score = (planningMatch ? 10 : 0) + (exactName ? 6 : 0) + (stemMatch ? 4 : 0) + (operatorMatch ? 2 : 0) + (technologyMatch && observedTechnology ? 2 : 0) + (locationMatch ? 1 : 0) + (capacityMatch ? 1 : 0);
  return { identity_gate: identityGate, exact_name: exactName, name_stem: stemMatch, planning_reference: planningMatch, operator: operatorMatch, technology: technologyMatch, location: locationMatch, capacity: capacityMatch, score };
}

export function matchDiscoveryMention(mention, projects) {
  if (!Array.isArray(projects) || !projects.length) throw new Error("closed REPD gazetteer is required");
  const haystack = text(`${mention.title ?? ""} ${mention.snippet ?? ""}`);
  if (foreignLocation.test(haystack) && !/\b(uk|united kingdom|england|scotland|wales|northern ireland|norfolk)\b/iu.test(haystack)) {
    return { binding_status: "REJECTED", reason: "FOREIGN_LOCATION_CONFLICT", repd_ref: null, gg_project_id: null, candidate_gg_project_ids: [], binding_evidence: { foreign_location_veto: true } };
  }
  const observedTechnology = technologyClass(haystack);
  const candidates = projects.map((project) => ({ project, evidence: evidenceFor(project, haystack, observedTechnology) }))
    .filter((row) => row.evidence.identity_gate && row.evidence.technology)
    .sort((left, right) => right.evidence.score - left.evidence.score || String(left.project.repd_ref).localeCompare(String(right.project.repd_ref), "en", { numeric: true }));

  if (!candidates.length) {
    return { binding_status: "ABSTAIN", reason: "NO_IDENTITY_EVIDENCE", repd_ref: null, gg_project_id: null, candidate_gg_project_ids: [], binding_evidence: { observed_technology: observedTechnology, credibility_used: false } };
  }
  const top = candidates[0];
  const tied = candidates.filter((row) => row.evidence.score === top.evidence.score);
  if (tied.length !== 1 || top.evidence.score < 4) {
    return {
      binding_status: "ABSTAIN",
      reason: "AMBIGUOUS_IDENTITY_EVIDENCE",
      repd_ref: null,
      gg_project_id: null,
      candidate_gg_project_ids: tied.map((row) => row.project.gg_project_id ?? `GG2050-REPD-${row.project.repd_ref}`),
      binding_evidence: { observed_technology: observedTechnology, top_score: top.evidence.score, credibility_used: false }
    };
  }
  return {
    binding_status: "PRIMARY_MATCH",
    reason: "CLOSED_GAZETTEER_GATES_PASSED",
    repd_ref: String(top.project.repd_ref),
    gg_project_id: top.project.gg_project_id ?? `GG2050-REPD-${top.project.repd_ref}`,
    candidate_gg_project_ids: [top.project.gg_project_id ?? `GG2050-REPD-${top.project.repd_ref}`],
    binding_evidence: { ...top.evidence, observed_technology: observedTechnology, credibility_used: false, news_may_overwrite_repd: false }
  };
}
