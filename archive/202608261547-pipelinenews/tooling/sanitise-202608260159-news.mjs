import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { classifyInternationalV9_6_2, regionalCountsV9_6_2 } from "../202608260159-pipelinenews/scripts/core/news-regions-v9-6-2.js";

const path = new URL("../202608260159-pipelinenews/dist/major_project_news_v9_5_1.json", import.meta.url);
const source = JSON.parse(await readFile(path, "utf8"));
const cleanToken = (value, fallback) => {
  const token = String(value || "").toUpperCase().replace(/[^A-Z0-9 +&/-]/gu, " ").replace(/\s+/gu, " ").trim();
  return token || fallback;
};
const safeUrl = (value) => {
  try { return `${new URL(value).origin}/`; } catch { return "https://globalgrid2050.com/"; }
};
const safeItem = (item) => {
  const classification = classifyInternationalV9_6_2(item);
  const geography = item.canonical_relevant === true
    ? "UK"
    : classification?.region === "INTERNATIONAL_OTHER" ? "INTERNATIONAL" : classification?.region || "DISCOVERY";
  const technology = cleanToken(item.canonical_technology || item.technology, "RENEWABLES");
  const event = cleanToken(item.event, "PROJECT UPDATE");
  const repdRef = String(item.repd_ref || "");
  const projectId = repdRef && item.gg_project_id === `GG2050-REPD-${repdRef}` ? item.gg_project_id : "";
  const url = safeUrl(item.url);
  return {
    role: projectId && item.role === "PRIMARY_MATCH" ? "PRIMARY_MATCH" : "ABSTAIN",
    eligible_for_news_signal: Boolean(projectId && item.eligible_for_news_signal === true),
    canonical_relevant: Boolean(projectId && item.canonical_relevant === true),
    repd_ref: projectId ? repdRef : null,
    gg_project_id: projectId || null,
    canonical_project: projectId || "ABSTAIN",
    project: projectId || "ABSTAIN",
    operator: "",
    canonical_technology: technology,
    technology,
    event,
    published: /^\d{4}-\d{2}-\d{2}$/u.test(String(item.published || "")) ? item.published : "",
    confidence: Number(item.confidence || 0),
    canonical_capacity_mw: Number(item.canonical_capacity_mw || 0),
    capacity_mw: Number(item.canonical_capacity_mw || item.capacity_mw || 0),
    headline: `${geography} · ${technology} · ${event} · ${projectId || "ABSTAIN"}`,
    source: new URL(url).hostname,
    url,
  };
};

const allItems = source.all_items.map(safeItem);
const canonicalItems = allItems.filter((item) => item.canonical_relevant === true);
const output = {
  schema: "globalgrid2050.major-project-news.v9.5.1",
  release: "9.5.1",
  updated: source.updated,
  all_headline_count: allItems.length,
  relevant_headline_count: canonicalItems.length,
  v9_4_baseline_headline_count: 125,
  v6_canonical_headline_count: source.v6_canonical_headline_count,
  v5_revalidated_primary_count: source.v5_revalidated_primary_count,
  privacy: {
    raw_headlines_published: false,
    raw_project_labels_published: false,
    operator_labels_published: false,
    individual_people_names_published: false,
    source_links_reduced_to_origins: true,
  },
  beacon_fen_contract: {
    repd_ref: "13599",
    gg_project_id: "GG2050-REPD-13599",
    official_capacity_mw: 400,
  },
  canonical_items: canonicalItems,
  all_items: allItems,
};

assert.equal(allItems.length, 133);
assert.equal(canonicalItems.length, 45);
assert.deepEqual(regionalCountsV9_6_2(allItems), { international: 19, us: 4, europe: 9, other: 6 });
assert.ok(canonicalItems.some((item) => item.repd_ref === "13599"));
assert.ok(allItems.every((item) => item.operator === "" && !item.headline.includes("undefined")));
await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
console.log("PASS privacy-safe V9.6.2 newspaper: 133 total · 45 UK · 19 international");
