const RELEASE_ID = "202608251929-pipelinenews";
const EXPECTED_PROJECTS = 7680;
const EXPECTED_CAPACITY_MW = 356474.09;
const ROWS_PER_PAGE = 100;
const SITE_LABEL_REDACTIONS = new Set(["10199", "5212"]);
const PATHS = Object.freeze({
  projectManifest: "../newsv7/data/v9.1/build_manifest.json",
  projectRoot: "../newsv7/",
  evidence: document.documentElement.dataset.evidenceObject,
  summary: document.documentElement.dataset.summaryObject,
});
const state = {
  projects: [],
  filtered: [],
  news: [],
  regional: [],
  newsMode: "ALL",
  newsQuery: "",
  technology: "all",
  status: "All",
  region: "All",
  minMw: null,
  maxMw: null,
  query: "",
  sort: "capacity_desc",
  page: 0,
  newsByProject: new Map(),
  organisationEvidence: new Map(),
};

function invariant(condition, message) {
  if (!condition) throw new Error(`Release contract failed: ${message}`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? `${url.origin}/` : "";
  } catch {
    return "";
  }
}

async function fetchJson(path, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL(path, window.location.href), {
      cache: "default",
      signal: controller.signal,
    });
    invariant(response.ok, `same-origin object returned ${response.status}`);
    invariant(new URL(response.url).origin === window.location.origin, "cross-origin redirect refused");
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function safeSiteLabel(project) {
  return SITE_LABEL_REDACTIONS.has(String(project.repd_ref))
    ? `SITE LABEL WITHHELD · ${project.gg_project_id}`
    : project.name;
}

function technologyLabel(value) {
  return ({ solar: "Solar", bess: "Battery storage", wind_onshore: "Onshore wind", wind_offshore: "Offshore wind" })[value] || value;
}

function unitFor(value) {
  return value === "solar" ? "MWp" : "MW";
}

function formatNumber(value, maximumFractionDigits = 2) {
  return Number(value || 0).toLocaleString("en-GB", { maximumFractionDigits });
}

function displayDate(value) {
  if (!value) return "NOT SUPPLIED";
  const parts = String(value).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

function atlasUrl(project) {
  if (project.geometry_status !== "valid") return "";
  const url = new URL("https://globalgrid2050.com/repd_grid_atlasv8/");
  url.searchParams.set("repd_ref", project.repd_ref);
  url.searchParams.set("project", safeSiteLabel(project));
  url.searchParams.set("technology", project.technology);
  url.searchParams.set("capacity_mw", project.capacity_mw);
  url.searchParams.set("latitude", project.latitude);
  url.searchParams.set("longitude", project.longitude);
  url.searchParams.set("zoom", "12");
  return url.href;
}

function connectionMarkup(project) {
  const signal = state.newsByProject.get(String(project.repd_ref));
  const organisation = state.organisationEvidence.get(String(project.repd_ref));
  const event = signal ? String(signal.event || "PROJECT UPDATE").toUpperCase() : "NO EXACT NEWS SIGNAL";
  const evidence = organisation
    ? `<span class="organisation-evidence">NEWS/ORGANISATION EVIDENCE: ${escapeHtml(organisation)} · not an official REPD operator field</span>`
    : "";
  const discovery = String(project.repd_ref) === "17494"
    ? '<span class="abstain">DISCOVERY BINDING: ABSTAIN · fixture-only sentinel, not current live discovery</span>'
    : "";
  return `<span><b>TIMING:</b> <strong class="unknown">UNKNOWN</strong> · no exact dated network milestone in pinned evidence</span><span><b>METHOD:</b> <strong class="unknown">UNKNOWN</strong> · no exact voltage, substation, route, bay or connection method in pinned evidence</span><span>NEWS SIGNAL: ${escapeHtml(event)}</span>${discovery}${evidence}<small>Next gate: accepted connection offer, network register, energisation notice or exact official network document.</small>`;
}

function renderTable() {
  const body = document.getElementById("projectRows");
  const pages = Math.max(1, Math.ceil(state.filtered.length / ROWS_PER_PAGE));
  state.page = Math.min(state.page, pages - 1);
  const start = state.page * ROWS_PER_PAGE;
  const rows = state.filtered.slice(start, start + ROWS_PER_PAGE);
  body.innerHTML = rows.map((project) => {
    const atlas = atlasUrl(project);
    const location = [project.county, project.region].filter(Boolean).join(" · ") || "NOT SUPPLIED";
    return `<tr data-project-id="${escapeHtml(project.gg_project_id)}">
      <td class="site"><strong>${escapeHtml(safeSiteLabel(project))}</strong><small>Official REPD record</small></td>
      <td>${escapeHtml(location)}</td>
      <td><span class="withheld">OPERATOR LABEL WITHHELD</span></td>
      <td><span class="technology ${escapeHtml(project.technology)}">${escapeHtml(technologyLabel(project.technology))}</span></td>
      <td>${escapeHtml(project.status)}</td>
      <td class="number">${formatNumber(project.capacity_mw)} ${unitFor(project.technology)}</td>
      <td class="mono">${escapeHtml(project.repd_ref)}</td>
      <td class="mono">${escapeHtml(project.gg_project_id)}</td>
      <td>${escapeHtml(displayDate(project.repd_record_updated))}</td>
      <td class="connection">${connectionMarkup(project)}</td>
      <td><div class="actions">${atlas ? `<a href="${escapeHtml(atlas)}" target="_blank" rel="noopener">ATLAS ↗</a>` : '<span class="disabled">NO MAP</span>'}<a href="https://www.google.com/search?tbm=nws&q=${encodeURIComponent(`${safeSiteLabel(project)} UK energy project`)}" target="_blank" rel="noopener">NEWS ↗</a><button type="button" data-copy="${escapeHtml(project.gg_project_id)}">COPY ID</button></div></td>
    </tr>`;
  }).join("");
  const from = state.filtered.length ? start + 1 : 0;
  const to = Math.min(start + ROWS_PER_PAGE, state.filtered.length);
  document.getElementById("pageStatus").textContent = state.filtered.length
    ? `SHOWING ${formatNumber(from, 0)}–${formatNumber(to, 0)} OF ${formatNumber(state.filtered.length, 0)} · PAGE ${state.page + 1} OF ${pages}`
    : "NO PROJECTS MATCH THIS FILTER";
  document.getElementById("previousPage").disabled = state.page === 0;
  document.getElementById("nextPage").disabled = state.page >= pages - 1 || !state.filtered.length;
}

function projectSearchText(project) {
  return [
    safeSiteLabel(project), project.repd_ref, project.gg_project_id, project.gg_development_id,
    project.planning_application_reference, project.planning_authority, project.county,
    project.region, project.status, project.technology,
  ].filter(Boolean).join(" ").toLocaleLowerCase("en-GB");
}

function applyProjectFilters({ resetPage = true } = {}) {
  const tokens = state.query.toLocaleLowerCase("en-GB").split(/\s+/u).filter(Boolean);
  state.filtered = state.projects.filter((project) => {
    if (state.technology !== "all" && project.technology !== state.technology) return false;
    if (state.status !== "All" && project.status !== state.status) return false;
    if (state.region !== "All" && project.region !== state.region) return false;
    if (state.minMw !== null && project.capacity_mw < state.minMw) return false;
    if (state.maxMw !== null && project.capacity_mw > state.maxMw) return false;
    if (tokens.length && !tokens.every((token) => projectSearchText(project).includes(token))) return false;
    return true;
  });
  const comparators = {
    capacity_desc: (left, right) => right.capacity_mw - left.capacity_mw,
    capacity_asc: (left, right) => left.capacity_mw - right.capacity_mw,
    updated_desc: (left, right) => String(right.repd_record_updated || "").localeCompare(String(left.repd_record_updated || "")),
    updated_asc: (left, right) => String(left.repd_record_updated || "").localeCompare(String(right.repd_record_updated || "")),
    site_asc: (left, right) => safeSiteLabel(left).localeCompare(safeSiteLabel(right), "en-GB"),
  };
  state.filtered.sort(comparators[state.sort] || comparators.capacity_desc);
  if (resetPage) state.page = 0;
  const totalCapacity = state.filtered.reduce((sum, row) => sum + row.capacity_mw, 0);
  document.getElementById("filteredProjects").textContent = formatNumber(state.filtered.length, 0);
  document.getElementById("filteredCapacity").textContent = formatNumber(totalCapacity);
  document.getElementById("largestProject").textContent = formatNumber(Math.max(0, ...state.filtered.map((row) => row.capacity_mw)));
  document.getElementById("resultsMeta").textContent = `${formatNumber(state.filtered.length, 0)} OF ${formatNumber(state.projects.length, 0)} PROJECTS · ${formatNumber(totalCapacity)} MW`;
  renderTable();
}

function populateProjectControls() {
  const regions = [...new Set(state.projects.map((row) => row.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en-GB"));
  const region = document.getElementById("regionFilter");
  for (const value of regions) region.add(new Option(value, value));
  const statuses = [...new Set(state.projects.map((row) => row.status).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en-GB"));
  const status = document.getElementById("statusFilter");
  for (const value of statuses) status.add(new Option(value, value));
}

function bindProjectControls() {
  document.querySelectorAll("[data-technology]").forEach((button) => {
    button.addEventListener("click", () => {
      state.technology = button.dataset.technology;
      document.querySelectorAll("[data-technology]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
      applyProjectFilters();
    });
  });
  document.getElementById("statusFilter").addEventListener("change", (event) => { state.status = event.target.value; applyProjectFilters(); });
  document.getElementById("regionFilter").addEventListener("change", (event) => { state.region = event.target.value; applyProjectFilters(); });
  document.getElementById("minCapacity").addEventListener("input", (event) => { state.minMw = event.target.value === "" ? null : Number(event.target.value); applyProjectFilters(); });
  document.getElementById("maxCapacity").addEventListener("input", (event) => { state.maxMw = event.target.value === "" ? null : Number(event.target.value); applyProjectFilters(); });
  document.getElementById("projectSearch").addEventListener("input", (event) => { state.query = event.target.value.trim(); applyProjectFilters(); });
  document.getElementById("projectSort").addEventListener("change", (event) => { state.sort = event.target.value; applyProjectFilters(); });
  document.getElementById("clearFilters").addEventListener("click", () => {
    Object.assign(state, { technology: "all", status: "All", region: "All", minMw: null, maxMw: null, query: "", sort: "capacity_desc" });
    document.querySelectorAll("[data-technology]").forEach((button) => button.classList.toggle("active", button.dataset.technology === "all"));
    document.getElementById("statusFilter").value = "All";
    document.getElementById("regionFilter").value = "All";
    document.getElementById("minCapacity").value = "";
    document.getElementById("maxCapacity").value = "";
    document.getElementById("projectSearch").value = "";
    document.getElementById("projectSort").value = "capacity_desc";
    applyProjectFilters();
  });
  document.getElementById("previousPage").addEventListener("click", () => { if (state.page > 0) { state.page -= 1; renderTable(); } });
  document.getElementById("nextPage").addEventListener("click", () => { if ((state.page + 1) * ROWS_PER_PAGE < state.filtered.length) { state.page += 1; renderTable(); } });
  document.getElementById("projectRows").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "COPIED";
  });
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = ["Site label", "Region", "Operator", "Technology", "Official status", "Official capacity", "REPD Ref", "GlobalGrid Ref", "REPD updated", "Connection timing", "Connection method", "Next evidence gate", "Atlas URL"];
  const rows = state.filtered.map((project) => [
    safeSiteLabel(project), project.region, "OPERATOR LABEL WITHHELD", technologyLabel(project.technology), project.status,
    project.capacity_mw, project.repd_ref, project.gg_project_id, project.repd_record_updated, "UNKNOWN", "UNKNOWN",
    "Accepted connection offer, network register, energisation notice or exact official network document", atlasUrl(project),
  ]);
  const csv = `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${RELEASE_ID}-projects.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeStory(item) {
  return {
    rank: Number(item.rank),
    evidenceId: String(item.evidence_id),
    evidenceUrlHash: String(item.source_url_sha256),
    evidenceUrl: safeHttpUrl(item.source_origin),
    date: item.published || "DATE NOT SUPPLIED",
    technology: String(item.technology || "ENERGY").toUpperCase(),
    event: String(item.event || "PROJECT UPDATE").toUpperCase(),
    projectId: item.project_id || "NO PROJECT BINDING",
    siteLabel: item.site_label || "",
    officialStatus: item.official_status || "",
    officialCapacityMw: Number.isFinite(item.official_capacity_mw) ? Number(item.official_capacity_mw) : null,
    geography: String(item.geography || ""),
    region: String(item.region || "DISCOVERY"),
    eligible: item.eligible === true,
    confidence: Number(item.confidence || 0),
    restricted: item.restricted === true,
  };
}

function visibleStories() {
  const base = state.news.map(safeStory);
  const regional = state.regional.map(safeStory);
  const rows = ["INTERNATIONAL", "US", "EUROPE"].includes(state.newsMode) ? regional : base;
  const query = state.newsQuery.toLocaleLowerCase("en-GB").split(/\s+/u).filter(Boolean);
  return rows.filter((story) => {
    if (state.newsMode === "UK" && !story.eligible) return false;
    if (state.newsMode === "US" && story.region !== "US") return false;
    if (state.newsMode === "EUROPE" && story.region !== "EUROPE") return false;
    if (state.newsMode === "SOLAR" && !story.technology.includes("SOLAR")) return false;
    if (state.newsMode === "BESS" && !story.technology.includes("BESS")) return false;
    if (state.newsMode === "CONSENT" && story.event !== "CONSENT") return false;
    if (state.newsMode === "CONSTRUCTION" && story.event !== "CONSTRUCTION") return false;
    if (query.length && !query.every((token) => [story.siteLabel, story.officialStatus, story.geography, story.technology, story.event, story.projectId, story.region, story.date, story.evidenceId, story.evidenceUrlHash, String(story.rank)].join(" ").toLocaleLowerCase("en-GB").includes(token))) return false;
    return true;
  });
}

function renderNews() {
  const rows = visibleStories();
  document.getElementById("stories").innerHTML = rows.length ? rows.map((story) => {
    const title = story.restricted
      ? `EVIDENCE ITEM ${String(story.rank).padStart(3, "0")} · PERSONAL IDENTIFIER WITHHELD`
      : story.siteLabel
        ? `${story.siteLabel} · ${story.event}`
        : `${story.technology} · ${story.event} · ${story.geography || story.region}`;
    const binding = story.eligible
      ? `OFFICIAL REPD: ${story.officialStatus} · ${formatNumber(story.officialCapacityMw)} MW · ${story.projectId} · PRIMARY MATCH ${story.confidence}%`
      : `DISCOVERY ONLY · NO PROJECT SIGNAL · IDENTITY ABSTAINS`;
    const evidenceLink = !story.restricted && story.evidenceUrl
      ? `<a href="${escapeHtml(story.evidenceUrl)}" target="_blank" rel="noopener">SOURCE DOMAIN ↗</a>`
      : '<span class="disabled">EVIDENCE LINK WITHHELD</span>';
    return `<article class="story ${story.technology.includes("BESS") ? "bess" : "solar"}"><p class="kicker">${escapeHtml(story.region)} · ${escapeHtml(story.date)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(binding)}</p><p class="provenance"><span>${escapeHtml(story.evidenceId)}</span><code>URL SHA-256 ${escapeHtml(story.evidenceUrlHash)}</code></p><p class="story-law">Typed evidence label only. Raw headline, summary, operator text and article paths are not republished.</p>${evidenceLink}</article>`;
  }).join("") : '<div class="empty">No evidence items match this filter.</div>';
  document.getElementById("newsMeta").textContent = `${rows.length} SHOWN · ${state.news.length} BASE LEDGER · ${state.regional.length} REGIONAL LEDGER`;
}

function bindNewsControls() {
  document.querySelectorAll("[data-news-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.newsMode = button.dataset.newsMode;
      document.querySelectorAll("[data-news-mode]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
      renderNews();
    });
  });
  document.getElementById("newsSearch").addEventListener("input", (event) => { state.newsQuery = event.target.value.trim(); renderNews(); });
}

function renderTechnologyGauges() {
  for (const [technology, elementId] of [["solar", "solarGauge"], ["bess", "bessGauge"], ["wind_onshore", "onshoreGauge"], ["wind_offshore", "offshoreGauge"]]) {
    const rows = state.projects.filter((project) => project.technology === technology);
    const capacity = rows.reduce((sum, project) => sum + project.capacity_mw, 0);
    document.getElementById(elementId).textContent = `${formatNumber(rows.length, 0)} / ${formatNumber(capacity)}`;
  }
}

async function loadProjects() {
  const manifest = await fetchJson(PATHS.projectManifest);
  invariant(manifest.project_count === EXPECTED_PROJECTS, "project manifest count mismatch");
  invariant(Array.isArray(manifest.project_partitions) && manifest.project_partitions.length === 16, "project partition contract mismatch");
  const partitions = await Promise.all(manifest.project_partitions.map(async (descriptor) => {
    const payload = await fetchJson(`${PATHS.projectRoot}${descriptor.path}`);
    invariant(payload.record_count === descriptor.record_count, "partition count mismatch");
    return payload.projects;
  }));
  state.projects = partitions.flat();
  invariant(state.projects.length === EXPECTED_PROJECTS, "project spine count mismatch");
  const refs = new Set();
  let capacity = 0;
  for (const project of state.projects) {
    invariant(project.gg_project_id === `GG2050-REPD-${project.repd_ref}`, "stable project identity mismatch");
    invariant(!refs.has(project.repd_ref), "duplicate project identity");
    refs.add(project.repd_ref);
    capacity += project.capacity_mw;
  }
  invariant(Math.round(capacity * 100) / 100 === EXPECTED_CAPACITY_MW, "project capacity mismatch");
  invariant(refs.has("13599") && refs.has("17494"), "sentinel identity missing");
  renderTechnologyGauges();
  populateProjectControls();
  bindProjectControls();
  applyProjectFilters();
  document.getElementById("projectStatus").textContent = `${formatNumber(state.projects.length, 0)} OFFICIAL PROJECTS LOADED · ${formatNumber(capacity)} MW`;
}

async function loadNews() {
  const payload = await fetchJson(PATHS.evidence);
  invariant(payload.schema === "pipelinenews.safe-evidence-ledger.v2", "safe evidence contract mismatch");
  invariant(Array.isArray(payload.base) && payload.base.length === 133, "headline ledger count mismatch");
  invariant(Array.isArray(payload.regional) && payload.regional.length === 19, "regional ledger count mismatch");
  invariant(payload.raw_fields_republished === false, "raw evidence publication refused");
  invariant([...payload.base, ...payload.regional].every((item) => /^[a-f0-9]{64}$/u.test(item.source_url_sha256)), "evidence URL hash mismatch");
  state.news = payload.base;
  state.regional = payload.regional;
  state.newsByProject = new Map(payload.base.filter((item) => item.eligible === true && item.repd_ref).map((item) => [String(item.repd_ref), item]));
  renderNews();
}

function renderIntelligence(summary) {
  invariant(summary.schema === "pipelinenews.safe-intelligence-summary.v2", "safe intelligence summary mismatch");
  const cards = [
    ["FASTEST ROUTE TO NET ZERO", `${formatNumber(summary.spine.solar.capacity_mw)} MWp solar · ${formatNumber(summary.spine.bess.capacity_mw)} MW BESS`, "Official capacity and status remain distinct from news and planning evidence."],
    ["SOLAR + BESS PROGRESS", `${formatNumber(summary.spine.solar.projects, 0)} solar · ${formatNumber(summary.spine.bess.projects, 0)} BESS`, "Full admitted project spine retained; editorial focus never filters the register."],
    ["WHEN CONNECTING?", summary.connection.when, summary.connection.next_gate],
    ["HOW CONNECTING?", summary.connection.how, summary.connection.next_gate],
    ["OFFICIAL-SOURCE FRONTIER", `${summary.frontier.cursor} / ${formatNumber(summary.frontier.total_groups, 0)} groups · ${summary.frontier.records} observations`, `${summary.frontier.primary_match} authority-safe · ${summary.frontier.abstain} abstain · ${summary.frontier.status}`],
  ];
  document.getElementById("intelligenceCards").innerHTML = cards.map(([title, value, note]) => `<article><h3>${escapeHtml(title)}</h3><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></article>`).join("");
  state.organisationEvidence = new Map(summary.sentinels.filter((row) => row.organisation_evidence).map((row) => [String(row.repd_ref), row.organisation_evidence]));
  if (state.projects.length) renderTable();
  document.getElementById("intelligenceStatus").textContent = "SAFE TYPED SUMMARY LOADED · OPTIONAL TO CORE BOOT";
}

async function loadOptionalIntelligence() {
  try {
    renderIntelligence(await fetchJson(PATHS.summary));
  } catch {
    document.getElementById("intelligenceCards").innerHTML = '<div class="empty">Optional intelligence unavailable. Newspaper and full project register remain usable.</div>';
    document.getElementById("intelligenceStatus").textContent = "OPTIONAL INTELLIGENCE UNAVAILABLE · CORE UNAFFECTED";
  }
}

async function boot() {
  bindNewsControls();
  const projectPromise = loadProjects().catch(() => {
    document.getElementById("projectRows").innerHTML = '<tr><td colspan="11" class="empty">Official project spine unavailable. The project surface has failed closed.</td></tr>';
    document.getElementById("projectStatus").textContent = "OFFICIAL PROJECT SPINE UNAVAILABLE · FAILED CLOSED";
  });
  const newsPromise = loadNews().catch(() => {
    document.getElementById("stories").innerHTML = '<div class="empty">Newspaper ledger unavailable. The project register remains usable.</div>';
    document.getElementById("newsMeta").textContent = "NEWSPAPER UNAVAILABLE · PROJECT REGISTER UNAFFECTED";
  });
  await Promise.allSettled([projectPromise, newsPromise]);
  setTimeout(loadOptionalIntelligence, 0);
}

boot();
