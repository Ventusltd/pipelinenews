const INTELLIGENCE_URL = "data/newsv7/cumulative_intelligence.json";
const FETCH_TIMEOUT_MS = 15000;

let intelligencePromise = null;
let model = null;
let byArticleId = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));
}

function validate(payload) {
  return payload
    && payload.schema === "pipelinenews.cumulative-intelligence.newsv7.v1"
    && payload.release === "newsv7"
    && payload.status === "CANDIDATE"
    && payload.baseline?.project_count === 7680
    && payload.baseline?.all_headlines === 133
    && payload.baseline?.beacon_fen_repd_ref === "13599"
    && payload.counts?.material_event_assertions === 45
    && payload.counts?.transaction_role_abstentions === 45
    && payload.counts?.publishable_reasons === 0
    && payload.counts?.held_reasons === 45
    && payload.counts?.current_context_sources === 0
    && payload.counts?.data_centre_observations === 2
    && payload.counts?.renewable_data_centre_identity_links === 0
    && Array.isArray(payload.event_intelligence)
    && payload.event_intelligence.length === 45
    && !payload.event_intelligence.some((row) => row.repd_ref === "13600");
}

function statusClass(status) {
  if (status === "STALE") return "stale";
  if (status === "UNAVAILABLE") return "unavailable";
  return "degraded";
}

function renderPanel(payload) {
  const counts = payload.counts;
  document.getElementById("intelligenceStatus").textContent = "PASS · governed candidates loaded · no unsupported claim promoted";
  document.getElementById("intelligenceCards").innerHTML = `
    <article class="intelligence-card"><strong>${counts.material_event_assertions}</strong><span>MATERIAL EVENTS</span><small>Headline-derived assertions; event dates remain unverified.</small></article>
    <article class="intelligence-card"><strong>${counts.organisation_labels} / ${counts.project_operator_role_assertions}</strong><span>ORGANISATION EVIDENCE</span><small>Exact source labels / direct REPD operator-label claims.</small></article>
    <article class="intelligence-card warning"><strong>${counts.current_context_sources} CURRENT</strong><span>SOURCE HEALTH</span><small>1 stale · 4 degraded · 1 unavailable; context cannot prove project events.</small></article>
    <article class="intelligence-card warning"><strong>${counts.publishable_reasons} / ${counts.held_reasons}</strong><span>RESEARCH REASONS</span><small>Published / held for direct public-record verification.</small></article>
    <article class="intelligence-card"><strong>${counts.data_centre_observations}</strong><span>DATA-CENTRE OBSERVATIONS</span><small>6 governed sources · zero renewable-project identity links.</small></article>`;

  document.getElementById("sourceHealthRows").innerHTML = payload.source_health.map((source) => `
    <a href="${escapeHtml(source.source_page_url)}" target="_blank" rel="noopener">
      <span class="health-state ${statusClass(source.status)}">${escapeHtml(source.status)}</span>
      <b>${escapeHtml(source.source_product_id)}</b>
      <small>${escapeHtml(source.decision_reason)}</small>
    </a>`).join("");

  document.getElementById("dataCentreRows").innerHTML = payload.data_centres.observations.map((observation) => `
    <a href="${escapeHtml(observation.source_record_url)}" target="_blank" rel="noopener">
      <b>${escapeHtml(observation.source_label)}</b>
      <span>${escapeHtml(observation.operator_label || "operator not established")} · ${escapeHtml(observation.lifecycle)}</span>
      <small>${escapeHtml(observation.observation_decision)} · capacity abstained unless typed public evidence exists</small>
    </a>`).join("");
}

async function fetchIntelligence() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(`../../${INTELLIGENCE_URL}`, import.meta.url), {
      cache: "default",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`cumulative intelligence ${response.status}`);
    const payload = await response.json();
    if (!validate(payload)) throw new Error("cumulative intelligence contract mismatch");
    model = payload;
    byArticleId = new Map(payload.event_intelligence.map((row) => [row.article_id, row]));
    renderPanel(payload);
    return payload;
  } catch (error) {
    document.getElementById("intelligenceStatus").textContent = "FAIL CLOSED · cumulative intelligence unavailable · V9.7 baseline remains usable";
    document.getElementById("intelligenceCards").innerHTML = '<div class="intelligence-empty">No derived intelligence has been promoted. Official REPD facts and frozen newspaper remain available.</div>';
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function loadCumulativeIntelligenceNewsV7() {
  if (!intelligencePromise) {
    intelligencePromise = fetchIntelligence().catch((error) => {
      intelligencePromise = null;
      console.error("NewsV7 cumulative intelligence unavailable", error);
      throw error;
    });
  }
  return intelligencePromise;
}

export function intelligenceForArticleNewsV7(articleId) {
  return byArticleId.get(articleId) || null;
}

export function intelligenceForRepdNewsV7(repdRef) {
  if (!model) return null;
  return model.event_intelligence.find((row) => row.repd_ref === String(repdRef)) || null;
}
