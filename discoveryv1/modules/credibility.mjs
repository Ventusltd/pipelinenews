import { createHash } from "node:crypto";

const scores = new Map(Object.entries({
  "gov.uk": 1,
  "planninginspectorate.gov.uk": 1,
  "planning.data.gov.uk": 1,
  "planit.org.uk": 1,
  "neso.energy": 1,
  "nationalgrideso.com": 1,
  "find-and-update.company-information.service.gov.uk": 1,
  "thegazette.co.uk": 1,
  "lowcarboncontracts.uk": 1,
  "ofgem.gov.uk": 1,
  "solarpowerportal.co.uk": 0.7,
  "energy-storage.news": 0.7,
  "current-news.co.uk": 0.7,
  "renews.biz": 0.7,
  "constructionenquirer.com": 0.7,
  "theconstructionindex.co.uk": 0.7,
  "pv-magazine.com": 0.7,
  "businessgreen.com": 0.7,
  "bbc.co.uk": 0.6,
  "bbc.com": 0.6,
  "theguardian.com": 0.6,
  "ft.com": 0.6,
  "thetimes.co.uk": 0.6,
  "x.com": 0.3,
  "medium.com": 0.3
}));

const restrictedApexDigests = new Set([
  "68c1e55b7e7549913f34030a5f0d49a94613b05469ac21f5eea1e6cb32cd5eb7"
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normaliseDomain = (value) => String(value ?? "").toLowerCase().replace(/^www\./u, "").replace(/\.$/u, "");

export function credibilityForDomain(value) {
  const domain = normaliseDomain(value);
  const labels = domain.split(".");
  const apex = labels.slice(-2).join(".");
  if (restrictedApexDigests.has(sha256(apex))) return 0.3;
  const matches = [...scores.entries()].filter(([known]) => domain === known || domain.endsWith(`.${known}`));
  if (!matches.length) return 0.3;
  matches.sort((left, right) => right[0].length - left[0].length);
  return matches[0][1];
}

export function eventConfidence(mentions) {
  if (!Array.isArray(mentions) || mentions.length === 0) throw new Error("event confidence requires mentions");
  const values = mentions.map((mention) => Number(mention.credibility));
  if (values.some((value) => !Number.isFinite(value) || value <= 0 || value > 1)) throw new Error("credibility must be in (0, 1]");
  const best = Math.max(...values);
  const distinct = new Set(mentions.map((mention) => normaliseDomain(mention.source_domain))).size;
  const corroboration = Math.min(0.2, 0.05 * Math.max(0, distinct - 1));
  return Number(Math.min(1, best + corroboration).toFixed(2));
}

export { scores as credibilityScores };
