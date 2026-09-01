/** Affirmative, item-local evidence rules for neutral sector intelligence. */

export const ACTIVE_SECTOR_TOPICS = Object.freeze([
  "DATA_CENTRES",
  "INVERTER_SECURITY_POLICY",
  "GREAT_GRID_UPGRADE",
  "WORLDWIDE_PV",
  "MV_HV_COMPONENTS",
]);

export function normaliseSectorEvidence(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^a-z0-9+/. -]+/giu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-GB");
}

export function classifySectorTopic({ title, summary = null }) {
  const text = normaliseSectorEvidence(`${title || ""} ${summary || ""}`);

  if (/\bdata cent(?:re|er)s?\b/u.test(text)) {
    return { topic: "DATA_CENTRES", rule: "DATA_CENTRE_EXPLICIT" };
  }

  if (/\b(solar|photovoltaic|pv|inverter|pcs|power conversion)\b/u.test(text)
      && /\b(cyber\w*|security|vulnerab\w*|covered list|ban\w*|regulat\w*)\b/u.test(text)) {
    return { topic: "INVERTER_SECURITY_POLICY", rule: "POWER_ELECTRONICS_AND_SECURITY" };
  }

  if (/\bgreat grid upgrade\b/u.test(text)
      || (/\b(grid|electricity transmission|transmission network|substation|interconnector)\b/u.test(text)
          && /\b(upgrade|network|investment|connection\w*|reinforcement|programme|program)\b/u.test(text))) {
    return { topic: "GREAT_GRID_UPGRADE", rule: "GRID_ASSET_AND_PROGRAMME" };
  }

  if (/\b(solar|photovoltaic|pv|module|inverter)\b/u.test(text)
      && /\b(deployment|capacity|installation\w*|market|manufactur\w*|supply chain|surge|growth|record high\w*|auction|tender)\b/u.test(text)) {
    return { topic: "WORLDWIDE_PV", rule: "PV_AND_DEPLOYMENT" };
  }

  if (/\b(transformer|switchgear|circuit breaker|cable|conductor|substation|busbar|insulator|gis|hvdc)\b/u.test(text)
      && /\b(grid|voltage|procurement|manufactur\w*|outage|supply chain|rating|kv)\b/u.test(text)) {
    return { topic: "MV_HV_COMPONENTS", rule: "COMPONENT_AND_ENGINEERING" };
  }

  return null;
}
