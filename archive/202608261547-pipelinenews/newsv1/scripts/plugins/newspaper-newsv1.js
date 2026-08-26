import { state } from "../core/state.js";
import { escapeHtml, normaliseProject } from "../core/utils.js";
import { bindNewspaperNewsV1Base, drawNewsNewsV1Base, loadNewsNewsV1Base } from "./newspaper-newsv1-base.js";

const REGIONAL_MODES = new Set(["INTERNATIONAL", "US", "EUROPE"]);
let regionalItems = [];
let regionalManifest = null;

function queryMatches(item) {
  if (!state.newsQuery) return true;
  const haystack = normaliseProject([
    item.headline, item.source, item.technology, item.country, item.region,
  ].join(" "));
  return normaliseProject(state.newsQuery).split(" ").filter(Boolean)
    .every((token) => haystack.includes(token));
}

function regionalRows() {
  return regionalItems.filter((item) => {
    if (!queryMatches(item)) return false;
    if (state.newsMode === "US") return item.region === "US";
    if (state.newsMode === "EUROPE") return item.region === "EUROPE";
    return true;
  });
}

function drawRegional() {
  const stories = document.getElementById("stories");
  const rows = regionalRows();
  if (!rows.length) {
    stories.innerHTML = '<div class="news-empty">No build-verified regional solar or battery headlines match this filter.</div>';
    return;
  }
  stories.innerHTML = rows.map((item) => {
    const articleClass = item.technology.includes("BESS") ? "bess" : "solar";
    const region = item.region === "INTERNATIONAL_OTHER" ? "INTERNATIONAL" : item.region;
    return `<a class="story ${articleClass}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><div class="kicker">${escapeHtml(item.technology)} · REGIONAL DISCOVERY · ${escapeHtml(item.published)}</div><h3>${escapeHtml(item.headline)}</h3><p><span class="project">${escapeHtml(region)} · ${escapeHtml(item.country)}</span>${item.source ? ` · ${escapeHtml(item.source)}` : ""}</p><span class="source"><span class="news-quality relevant">${escapeHtml(region)}</span> · build-verified ${escapeHtml(item.classifier_version)} · published decision ledger · no REPD project signal</span></a>`;
  }).join("");
}

export function drawNewsNewsV1() {
  if (REGIONAL_MODES.has(state.newsMode)) {
    drawRegional();
    return;
  }
  if (state.newsMode === "UK") {
    state.newsMode = "RELEVANT";
    drawNewsNewsV1Base();
    state.newsMode = "UK";
    return;
  }
  drawNewsNewsV1Base();
}

async function fetchCommitted(path) {
  const url = new URL(path, import.meta.url);
  const response = await fetch(url, { cache: "default" });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

export async function loadNewsNewsV1() {
  await loadNewsNewsV1Base();
  try {
    const [regional, manifest] = await Promise.all([
      fetchCommitted("../../data/v9.7/regional_news.json"),
      fetchCommitted("../../data/v9.7/regional_manifest.json"),
    ]);
    if (regional.schema !== "globalgrid2050.regional-news.v9.7"
      || regional.release !== "9.7" || !Array.isArray(regional.articles)
      || !regional.articles.every((item) => item.project_signal_eligible === false)) {
      throw new Error("invalid committed regional artifact");
    }
    regionalItems = regional.articles;
    regionalManifest = manifest;
    const counts = regionalManifest.telemetry.by_region;
    const uk = state.newsItems.filter((item) => item.canonical_relevant === true).length;
    document.getElementById("newsMeta").textContent = `${uk} UK · ${regionalItems.length} international (${counts.US} US · ${counts.EUROPE} Europe · ${counts.INTERNATIONAL_OTHER} other) · ${state.newsItems.length} headlines · audited snapshot`;
  } catch (error) {
    regionalItems = [];
    document.getElementById("newsMeta").textContent = `${state.newsItems.length} inherited headlines · regional ledger unavailable`;
    console.error("V9.7 regional artifact unavailable", error);
  }
  drawNewsNewsV1();
}

export function bindNewspaperNewsV1(onNewsLoaded) {
  bindNewspaperNewsV1Base(onNewsLoaded);
  document.querySelectorAll("#newsTools button").forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll("#newsTools button").forEach((candidate) => candidate.classList.remove("active"));
      button.classList.add("active");
      state.newsMode = button.dataset.news;
      drawNewsNewsV1();
    };
  });
  document.getElementById("newsSearch").oninput = (event) => {
    state.newsQuery = event.target.value.trim();
    drawNewsNewsV1();
  };
}
