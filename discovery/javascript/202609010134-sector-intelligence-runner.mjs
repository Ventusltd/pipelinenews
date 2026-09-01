#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GENERATION = "202609010134";
const CONTRACT_SCHEMA = "pipelinenews.sector-intelligence-contract.v3";
const FIXTURE_SCHEMA = "pipelinenews.sector-intelligence-fixture.v3";
const LEDGER_SCHEMA = "pipelinenews.sector-intelligence-ledger.v3";
const USAGE_CONTEXT = "NON_COMMERCIAL_OPEN_SOURCE";
const NETWORK_ADAPTERS = new Set(["PINNED_OWNER_EXPORT_V1", "GOVUK_SEARCH_V1", "OFFICIAL_RSS_V1"]);
const LOCAL_ADAPTERS = new Set(["FROZEN_GENERIC_NEWS_V1", "STATIC_LINK_V1"]);
const FORBIDDEN_ITEM_FIELDS = new Set([
  "repd_ref", "gg_project_id", "project", "technology", "capacity_mw", "operator", "county", "related_context_repd_ref",
]);
const ITEM_FIELDS = Object.freeze([
  "intelligence_item_id", "generation", "item_kind", "source_id", "source_item_id", "title", "summary",
  "canonical_url", "source_published_at", "observed_at", "collection_anchor_at", "staleness_state", "status",
  "evidence_class", "usage_context", "source_licence_id", "source_terms_url", "redistribution_rights",
  "attribution", "owner_repository", "owner_generation", "owner_record_id", "generic_article_id", "value_min",
  "value_max", "unit", "eligible_for_news_signal",
]);
const TOPIC_FIELDS = Object.freeze([
  "intelligence_item_id", "topic_code", "generation", "assignment_basis", "display_rank", "eligible_for_news_signal",
]);
const BINDING_FIELDS = Object.freeze([
  "intelligence_item_id", "repd_ref", "binding_role", "generation", "decision", "evidence", "eligible_for_news_signal",
]);
const APPROVED_LIMITS = Object.freeze({
  maximum_network_requests: 9,
  maximum_concurrency: 3,
  maximum_results_per_source: 6,
  maximum_total_items: 96,
  maximum_rows_per_browser_topic: 24,
  request_timeout_ms: 5000,
  maximum_response_bytes: 1048576,
  maximum_feed_entries_scanned: 48,
  maximum_feed_scan_operations: 512,
  maximum_raw_feed_entry_characters: 65536,
  maximum_raw_feed_field_characters: 8192,
  maximum_raw_feed_tag_characters: 2048,
  maximum_raw_text_characters: 8192,
  maximum_title_characters: 180,
  maximum_summary_characters: 300,
  maximum_url_characters: 700,
  redirects: 0,
  retained_raw_html_bytes: 0,
  retained_article_body_bytes: 0,
  retained_search_snippet_characters: 0,
});
const APPROVED_TIME_PROVENANCE = Object.freeze({
  generation_label_timezone: "Europe/London",
  generation_label_utc_anchor: "2026-08-27T20:30:00Z",
  live_collection_anchor_field: "collection_anchor_at",
  live_collection_anchor_basis: "ACTIONS_LIVE_COLLECTION_STARTED_AT",
  github_run_id_is_execution_provenance: true,
  collection_anchor_claims_wall_clock_fetch_time: true,
});
const APPROVED_SOURCE_CLOSURE = Object.freeze([
  { id: "DATA_CENTRES_OWNER_EXPORT", topic_code: "DATA_CENTRES", adapter: "PINNED_OWNER_EXPORT_V1", source_url: "https://raw.githubusercontent.com/Ventusltd/data-centres-gb/432864748d3af7b5fffcc51b65804aa6903672dd/exports/202608271727-pipelinenews-data-centres.json", item_hosts: ["www.bbc.co.uk"] },
  { id: "FROZEN_GENERIC_DATA_CENTRE_NEWS", topic_code: "DATA_CENTRES", adapter: "FROZEN_GENERIC_NEWS_V1", source_url: "https://github.com/Ventusltd/pipelinenews", item_hosts: ["news.google.com"] },
  { id: "GOVUK_INVERTER_SECURITY", topic_code: "INVERTER_SECURITY_POLICY", adapter: "GOVUK_SEARCH_V1", source_url: "https://www.gov.uk/api/search.json?count=6&order=-public_timestamp&q=solar%20inverter%20cyber%20security", item_hosts: ["www.gov.uk"] },
  { id: "FCC_CURRENT_COVERED_LIST", topic_code: "INVERTER_SECURITY_POLICY", adapter: "STATIC_LINK_V1", source_url: "https://www.fcc.gov/supplychain/coveredlist", item_hosts: ["www.fcc.gov"] },
  { id: "FCC_EDOCS_NEWS_RSS", topic_code: "INVERTER_SECURITY_POLICY", adapter: "OFFICIAL_RSS_V1", source_url: "https://api2.fcc.gov/edocs/public/api/v1/rss/docTypes/News_Release", item_hosts: ["www.fcc.gov", "docs.fcc.gov", "api2.fcc.gov"] },
  { id: "EC_ENERGY_RSS", topic_code: "INVERTER_SECURITY_POLICY", adapter: "OFFICIAL_RSS_V1", source_url: "https://energy.ec.europa.eu/node/2/rss_en", item_hosts: ["energy.ec.europa.eu"] },
  { id: "GOVUK_GRID_UPGRADE", topic_code: "GREAT_GRID_UPGRADE", adapter: "GOVUK_SEARCH_V1", source_url: "https://www.gov.uk/api/search.json?count=6&order=-public_timestamp&q=Great%20Grid%20Upgrade%20electricity%20transmission", item_hosts: ["www.gov.uk"] },
  { id: "NATIONAL_GRID_GREAT_GRID_UPGRADE", topic_code: "GREAT_GRID_UPGRADE", adapter: "STATIC_LINK_V1", source_url: "https://www.nationalgrid.com/the-great-grid-upgrade", item_hosts: ["www.nationalgrid.com"] },
  { id: "OFGEM_GRID_RSS", topic_code: "GREAT_GRID_UPGRADE", adapter: "OFFICIAL_RSS_V1", source_url: "https://www.ofgem.gov.uk/rss.xml", item_hosts: ["www.ofgem.gov.uk"] },
  { id: "GOVUK_WORLDWIDE_PV", topic_code: "WORLDWIDE_PV", adapter: "GOVUK_SEARCH_V1", source_url: "https://www.gov.uk/api/search.json?count=6&order=-public_timestamp&q=global%20solar%20photovoltaic%20deployment", item_hosts: ["www.gov.uk"] },
  { id: "EIA_SOLAR_RSS", topic_code: "WORLDWIDE_PV", adapter: "OFFICIAL_RSS_V1", source_url: "https://www.eia.gov/rss/todayinenergy.xml", item_hosts: ["www.eia.gov", "eia.gov"] },
  { id: "GOVUK_MV_HV_COMPONENTS", topic_code: "MV_HV_COMPONENTS", adapter: "GOVUK_SEARCH_V1", source_url: "https://www.gov.uk/api/search.json?count=6&order=-public_timestamp&q=power%20transformer%20high%20voltage%20cable%20grid", item_hosts: ["www.gov.uk"] },
]);
const APPROVED_SOURCE_TERMS = Object.freeze([
  "https://github.com/Ventusltd/data-centres-gb",
  "https://policies.google.com/terms",
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  "https://www.usa.gov/government-copyright",
  "https://www.usa.gov/government-copyright",
  "https://commission.europa.eu/legal-notice_en",
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  "https://www.nationalgrid.com/terms-and-conditions",
  "https://www.ofgem.gov.uk/c-ofgem-2026",
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  "https://www.eia.gov/about/copyrights_reuse.php",
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function decodeEntity(token) {
  const named = { amp: "&", quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " " };
  const lower = token.toLocaleLowerCase("en-GB");
  if (Object.hasOwn(named, lower)) return named[lower];
  let codePoint = null;
  if (lower.startsWith("#x") && /^[a-f0-9]+$/u.test(lower.slice(2))) codePoint = Number.parseInt(lower.slice(2), 16);
  else if (lower.startsWith("#") && /^[0-9]+$/u.test(lower.slice(1))) codePoint = Number.parseInt(lower.slice(1), 10);
  if (Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return String.fromCodePoint(codePoint);
  }
  return null;
}

function linearCleanText(raw) {
  const source = raw.startsWith("<![CDATA[") && raw.endsWith("]]>") ? raw.slice(9, -3) : raw;
  const output = [];
  let inTag = false;
  let pendingSpace = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inTag) {
      if (character === ">") {
        inTag = false;
        pendingSpace = output.length > 0;
      }
      continue;
    }
    if (character === "<") {
      inTag = true;
      continue;
    }
    let retained = character;
    if (character === "&") {
      let semicolon = -1;
      const entityWindowEnd = Math.min(source.length, index + 19);
      for (let probe = index + 1; probe < entityWindowEnd; probe += 1) {
        if (source[probe] === ";") {
          semicolon = probe;
          break;
        }
      }
      if (semicolon > index) {
        const decoded = decodeEntity(source.slice(index + 1, semicolon));
        if (decoded !== null) {
          retained = decoded;
          index = semicolon;
        }
      }
    }
    const whitespace = retained === " " || retained === "\t" || retained === "\r" || retained === "\n" || retained === "\f";
    if (whitespace) {
      pendingSpace = output.length > 0;
      continue;
    }
    if (pendingSpace) output.push(" ");
    output.push(retained);
    pendingSpace = false;
  }
  return output.join("");
}

export function cleanText(value, maximum, { nullable = false, rawMaximum = APPROVED_LIMITS.maximum_raw_text_characters } = {}) {
  const raw = String(value ?? "");
  assert.ok(raw.length <= rawMaximum, "retained text exceeds its raw pre-parse bound");
  const text = linearCleanText(raw);
  if (!text && nullable) return null;
  assert.ok(text, "required retained text is empty");
  assert.ok([...text].length <= maximum, "retained text exceeds its declared bound");
  return text;
}

function iso(value, label, { nullable = false, dateOnly = false } = {}) {
  if ((value === null || value === undefined || value === "") && nullable) return null;
  const input = dateOnly && /^\d{4}-\d{2}-\d{2}$/u.test(String(value)) ? `${value}T00:00:00Z` : String(value);
  const timestamp = Date.parse(input);
  assert.ok(Number.isFinite(timestamp), `${label} is not an ISO-compatible timestamp`);
  return new Date(timestamp).toISOString().replace(".000Z", "Z");
}

function httpsUrl(value, label, allowedHosts = null) {
  assert.ok(String(value || "").length <= 700, `${label} exceeds the URL bound`);
  const parsed = new URL(String(value));
  assert.equal(parsed.protocol, "https:", `${label} must be HTTPS`);
  assert.equal(parsed.username, "", `${label} contains credentials`);
  assert.equal(parsed.password, "", `${label} contains credentials`);
  assert.equal(parsed.port, "", `${label} must use the default HTTPS port`);
  assert.equal(parsed.hash, "", `${label} must not contain a fragment`);
  for (const key of parsed.searchParams.keys()) {
    assert.doesNotMatch(key, /(?:api[_-]?key|token|secret|password|credential)/iu, `${label} has a secret-shaped parameter`);
  }
  if (allowedHosts) assert.ok(allowedHosts.includes(parsed.hostname), `${label} host is outside the closed allowlist`);
  return parsed.href;
}

function stableItemId(sourceId, sourceItemId, canonicalUrl) {
  const digest = sha256(Buffer.from([sourceId, sourceItemId, canonicalUrl].join("\u001f")));
  return `GG2050-SECTOR-ITEM-${digest.slice(0, 20).toUpperCase()}`;
}

function staleness(sourceAt, collectionAnchorAt, staleAfterHours) {
  const reference = Date.parse(sourceAt || collectionAnchorAt);
  const age = Math.max(0, (Date.parse(collectionAnchorAt) - reference) / 3_600_000);
  return age > staleAfterHours ? "STALE" : "CURRENT";
}

function itemRow(source, values, collectionAnchorAt, limits) {
  const url = httpsUrl(values.canonical_url, `${source.id} item URL`, source.item_hosts);
  const sourceItemId = cleanText(values.source_item_id || url, 500);
  const published = iso(values.source_published_at, `${source.id} source_published_at`, { nullable: true, dateOnly: true });
  const observed = iso(values.observed_at || published || collectionAnchorAt, `${source.id} observed_at`, { dateOnly: true });
  const row = {
    intelligence_item_id: stableItemId(source.id, sourceItemId, url),
    generation: GENERATION,
    item_kind: values.item_kind || "SOURCE_METADATA",
    source_id: source.id,
    source_item_id: sourceItemId,
    title: cleanText(values.title, limits.maximum_title_characters),
    summary: cleanText(values.summary, limits.maximum_summary_characters, { nullable: true }),
    canonical_url: url,
    source_published_at: published,
    observed_at: observed,
    collection_anchor_at: collectionAnchorAt,
    staleness_state: staleness(published || observed, collectionAnchorAt, source.stale_after_hours),
    status: values.status || "RETAINED_METADATA",
    evidence_class: values.evidence_class || source.evidence_class,
    usage_context: USAGE_CONTEXT,
    source_licence_id: cleanText(values.source_licence_id || source.source_licence_id, 180),
    source_terms_url: httpsUrl(values.source_terms_url || source.source_terms_url, `${source.id} terms URL`),
    redistribution_rights: cleanText(values.redistribution_rights || source.redistribution_rights, 240),
    attribution: cleanText(values.attribution || source.attribution, 300),
    owner_repository: values.owner_repository || null,
    owner_generation: values.owner_generation || null,
    owner_record_id: values.owner_record_id || null,
    generic_article_id: values.generic_article_id || null,
    value_min: values.value_min ?? null,
    value_max: values.value_max ?? null,
    unit: values.unit || null,
    eligible_for_news_signal: false,
  };
  assert.deepEqual(Object.keys(row), ITEM_FIELDS);
  for (const field of FORBIDDEN_ITEM_FIELDS) assert.equal(Object.hasOwn(row, field), false);
  return row;
}

function topicRow(item, source, topicRanks, assignmentBasis) {
  const row = {
    intelligence_item_id: item.intelligence_item_id,
    topic_code: source.topic_code,
    generation: GENERATION,
    assignment_basis: assignmentBasis,
    display_rank: topicRanks.get(source.topic_code),
    eligible_for_news_signal: false,
  };
  assert.deepEqual(Object.keys(row), TOPIC_FIELDS);
  return row;
}

function tagBoundary(character) {
  return character === ">" || character === "/" || " \t\r\n".includes(character);
}

function boundedRaw(value, maximum, label) {
  assert.equal(typeof value, "string", `${label} is not text`);
  assert.ok(value.length <= maximum, `${label} exceeds its raw pre-parse bound`);
  return value;
}

export function scanFeedEntries(text, limits) {
  assert.equal(typeof text, "string", "feed body is not text");
  assert.ok(text.length <= limits.maximum_response_bytes, "decoded feed exceeds its response-character bound");
  for (const field of [
    "maximum_feed_entries_scanned", "maximum_feed_scan_operations", "maximum_raw_feed_entry_characters",
    "maximum_raw_feed_field_characters", "maximum_raw_feed_tag_characters",
  ]) assert.ok(Number.isSafeInteger(limits[field]) && limits[field] > 0, `invalid RSS bound: ${field}`);
  const lower = text.toLocaleLowerCase("en-GB");
  const entries = [];
  let cursor = 0;
  let entriesScanned = 0;
  let operations = 0;
  let terminalReason = "END_OF_FEED";
  function nextOpening() {
    while (cursor < lower.length) {
      if (operations >= limits.maximum_feed_scan_operations) {
        return { operation_limit: true };
      }
      operations += 1;
      const start = lower.indexOf("<", cursor);
      if (start < 0) {
        cursor = lower.length;
        return null;
      }
      cursor = start + 1;
      for (const kind of ["item", "entry"]) {
        const after = start + kind.length + 1;
        if (lower.startsWith(`<${kind}`, start) && tagBoundary(lower[after] || "")) {
          return { kind, start };
        }
      }
    }
    return null;
  }
  while (entriesScanned < limits.maximum_feed_entries_scanned) {
    const opening = nextOpening();
    if (opening?.operation_limit) {
      terminalReason = "OPERATION_LIMIT";
      break;
    }
    if (!opening) break;
    entriesScanned += 1;
    if (operations >= limits.maximum_feed_scan_operations) {
      terminalReason = "OPERATION_LIMIT";
      break;
    }
    operations += 1;
    const openEnd = lower.indexOf(">", opening.start + opening.kind.length + 1);
    if (openEnd < 0) {
      terminalReason = "MALFORMED_OPEN_TAG";
      break;
    }
    if (openEnd - opening.start + 1 > limits.maximum_raw_feed_tag_characters) {
      terminalReason = "ENTRY_RAW_LIMIT";
      break;
    }
    if (operations >= limits.maximum_feed_scan_operations) {
      terminalReason = "OPERATION_LIMIT";
      break;
    }
    operations += 1;
    const closeToken = `</${opening.kind}>`;
    const closeStart = lower.indexOf(closeToken, openEnd + 1);
    if (closeStart < 0) {
      terminalReason = "MALFORMED_UNCLOSED_ENTRY";
      break;
    }
    const contentStart = openEnd + 1;
    const contentLength = closeStart - contentStart;
    if (contentLength > limits.maximum_raw_feed_entry_characters) {
      terminalReason = "ENTRY_RAW_LIMIT";
      break;
    }
    entries.push({ kind: opening.kind, content_start: contentStart, content_end: closeStart });
    cursor = closeStart + closeToken.length;
  }
  if (terminalReason === "END_OF_FEED" && entriesScanned >= limits.maximum_feed_entries_scanned) {
    const extra = nextOpening();
    if (extra?.operation_limit) terminalReason = "OPERATION_LIMIT";
    else if (extra) terminalReason = "ENTRY_LIMIT";
  }
  return {
    entries,
    entries_scanned: entriesScanned,
    scan_operations: operations,
    terminal_reason: terminalReason,
  };
}

function rawTagValue(block, tag, limits) {
  boundedRaw(block, limits.maximum_raw_feed_entry_characters, `${tag} entry`);
  const lower = block.toLocaleLowerCase("en-GB");
  let cursor = 0;
  for (let probe = 0; probe < 32; probe += 1) {
    const start = lower.indexOf(`<${tag}`, cursor);
    if (start < 0) return "";
    const after = start + tag.length + 1;
    if (!tagBoundary(lower[after] || "")) {
      cursor = start + 1;
      continue;
    }
    const openEnd = lower.indexOf(">", after);
    if (openEnd < 0) return "";
    assert.ok(openEnd - start + 1 <= limits.maximum_raw_feed_tag_characters, `${tag} opening tag exceeds its raw pre-parse bound`);
    const closeStart = lower.indexOf(`</${tag}>`, openEnd + 1);
    if (closeStart < 0) return "";
    assert.ok(closeStart - openEnd - 1 <= limits.maximum_raw_feed_field_characters, `${tag} value exceeds its raw pre-parse bound`);
    return block.slice(openEnd + 1, closeStart);
  }
  throw new Error(`${tag} tag probe limit exceeded`);
}

function rawLinkHref(block, limits) {
  const lower = block.toLocaleLowerCase("en-GB");
  let cursor = 0;
  for (let probe = 0; probe < 32; probe += 1) {
    const start = lower.indexOf("<link", cursor);
    if (start < 0) return "";
    const after = start + 5;
    if (!tagBoundary(lower[after] || "")) {
      cursor = start + 1;
      continue;
    }
    const openEnd = lower.indexOf(">", after);
    if (openEnd < 0) return "";
    assert.ok(openEnd - start + 1 <= limits.maximum_raw_feed_tag_characters,
      "link opening tag exceeds its raw pre-parse bound");
    const opening = block.slice(start, openEnd + 1);
    const href = opening.match(/\bhref\s*=\s*["']([^"']+)["']/iu)?.[1] || "";
    return boundedRaw(href, limits.maximum_raw_feed_field_characters, "link href");
  }
  throw new Error("link tag probe limit exceeded");
}

function rssItems(source, text, collectionAnchorAt, limits) {
  const scan = scanFeedEntries(text, limits);
  if (scan.terminal_reason !== "END_OF_FEED") {
    const error = new Error(scan.terminal_reason);
    error.code = ["ENTRY_LIMIT", "OPERATION_LIMIT"].includes(scan.terminal_reason) ? "SCAN_LIMIT" : "FEED_FORMAT";
    throw error;
  }
  const keywords = source.retained_if_any_keywords.map((word) => word.toLocaleLowerCase("en-GB"));
  const retained = [];
  for (const descriptor of scan.entries) {
    const block = text.slice(descriptor.content_start, descriptor.content_end);
    try {
      const title = cleanText(rawTagValue(block, "title", limits), limits.maximum_title_characters);
      if (!keywords.some((keyword) => title.toLocaleLowerCase("en-GB").includes(keyword))) continue;
      const link = cleanText(rawLinkHref(block, limits) || rawTagValue(block, "link", limits), limits.maximum_url_characters);
      const guid = cleanText(rawTagValue(block, "guid", limits) || rawTagValue(block, "id", limits) || link, 500);
      const published = rawTagValue(block, "pubDate", limits) || rawTagValue(block, "published", limits)
        || rawTagValue(block, "updated", limits) || null;
      retained.push({
        source_item_id: guid,
        title,
        canonical_url: link,
        source_published_at: iso(published, `${source.id} RSS date`, { nullable: true }),
        observed_at: iso(published || collectionAnchorAt, `${source.id} RSS observation`),
        summary: null,
        status: "RETAINED_METADATA",
      });
    } catch {
      // A malformed item is rejected without weakening the bounded source result.
    }
    if (retained.length >= limits.maximum_results_per_source) break;
  }
  return retained;
}

function govukItems(source, text, collectionAnchorAt, limits) {
  const payload = JSON.parse(text);
  assert.ok(Array.isArray(payload.results), `${source.id} GOV.UK results are missing`);
  return payload.results.slice(0, limits.maximum_results_per_source).flatMap((result) => {
    try {
      const canonical = new URL(String(result.link || result.url), "https://www.gov.uk").href;
      const published = result.public_timestamp || result.first_published_at || result.updated_at || null;
      return [{
        source_item_id: cleanText(result.content_id || canonical, 500),
        title: cleanText(result.title, limits.maximum_title_characters),
        canonical_url: canonical,
        source_published_at: iso(published, `${source.id} GOV.UK date`, { nullable: true }),
        observed_at: iso(published || collectionAnchorAt, `${source.id} GOV.UK observation`),
        summary: null,
        status: "RETAINED_METADATA",
      }];
    } catch {
      return [];
    }
  });
}

function ownerExportItems(source, text, contract, fixtureMode) {
  const payload = JSON.parse(text);
  const owner = contract.federation.data_centres;
  assert.equal(payload.schema, "pipelinenews-data-centres-intelligence-v1");
  assert.equal(payload.generation, owner.owner_generation);
  assert.equal(payload.usage_context, USAGE_CONTEXT);
  assert.ok(Array.isArray(payload.records));
  if (!fixtureMode) assert.equal(payload.records.length, contract.invariants.owner_metric_rows_expected);
  return payload.records.map((record) => {
    assert.equal(record.record_kind, "CONTEXT_METRIC");
    assert.equal(record.section, "DATA_CENTRES");
    assert.equal(record.usage_context, USAGE_CONTEXT);
    assert.equal(record.eligible_for_project_signal, false);
    return {
      source_item_id: record.record_id,
      item_kind: "CONTEXT_METRIC",
      title: record.title,
      summary: record.summary,
      canonical_url: record.source_url,
      source_published_at: record.source_date,
      observed_at: record.source_date,
      status: "FEDERATED_OWNER_CONTEXT",
      evidence_class: "FEDERATED_OWNER_CONTEXT",
      source_licence_id: record.source_licence,
      source_terms_url: source.source_terms_url,
      redistribution_rights: record.source_rights_status,
      attribution: record.source_attribution,
      owner_repository: owner.owner_repository,
      owner_generation: owner.owner_generation,
      owner_record_id: record.record_id,
      value_min: record.value_min,
      value_max: record.value_max,
      unit: record.unit,
    };
  });
}

export function failureCode(error) {
  const value = String(error?.code || error?.name || "BOUNDED_FAILURE").toUpperCase();
  if (value.includes("ABORT")) return "TIMEOUT";
  if (value.includes("RESPONSE_LIMIT")) return "RESPONSE_LIMIT";
  if (value.includes("HTTP")) return "HTTP_STATUS";
  if (value.includes("SCAN_LIMIT")) return "SCAN_LIMIT";
  if (value.includes("FEED_FORMAT")) return "FEED_FORMAT";
  return "NETWORK_OR_FORMAT_FAILURE";
}

export async function fetchBounded(source, fetchImpl, limits) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limits.request_timeout_ms);
  try {
    const response = await fetchImpl(httpsUrl(source.source_url, `${source.id} source URL`), {
      headers: { Accept: "application/json, application/rss+xml, application/xml, text/xml, text/html;q=0.1, */*;q=0.01" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error("HTTP_STATUS");
      error.code = "HTTP_STATUS";
      throw error;
    }
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > limits.maximum_response_bytes) {
      const error = new Error("RESPONSE_LIMIT");
      error.code = "RESPONSE_LIMIT";
      throw error;
    }
    const chunks = [];
    let total = 0;
    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > limits.maximum_response_bytes) {
            await reader.cancel("bounded response limit exceeded");
            const error = new Error("RESPONSE_LIMIT");
            error.code = "RESPONSE_LIMIT";
            throw error;
          }
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = Buffer.concat(chunks, total);
    return {
      bytes,
      contentType: String(response.headers.get("content-type") || "application/octet-stream").split(";", 1)[0].toLowerCase(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

function fixtureFetch(fixtures) {
  const byUrl = new Map();
  return async (url) => {
    const source = byUrl.get(url);
    assert.ok(source, `fixture request is undeclared: ${url}`);
    const body = typeof source.body === "string" ? source.body : JSON.stringify(source.body);
    return new Response(body, {
      status: source.status,
      headers: { "content-type": source.content_type, "content-length": String(Buffer.byteLength(body)) },
    });
  };
}

function bindFixtureSources(contract, fixture) {
  const responses = fixture.responses;
  const network = contract.sources.filter(({ adapter }) => NETWORK_ADAPTERS.has(adapter));
  assert.deepEqual(Object.keys(responses).sort(), network.map(({ id }) => id).sort());
  const byUrl = new Map(network.map((source) => [source.source_url, responses[source.id]]));
  return async (url) => {
    const response = byUrl.get(url);
    assert.ok(response, `fixture request is undeclared: ${url}`);
    const body = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
    return new Response(body, {
      status: response.status,
      headers: { "content-type": response.content_type, "content-length": String(Buffer.byteLength(body)) },
    });
  };
}

export function validateContract(contract) {
  assert.equal(contract.schema, CONTRACT_SCHEMA);
  assert.equal(contract.generation, GENERATION);
  assert.equal(contract.deployment, "not-authorised");
  assert.deepEqual(contract.project_posture, {
    owner: "Ventus Ltd",
    application: USAGE_CONTEXT,
    application_usage_establishes_upstream_rights: false,
    publisher_redistribution_rights: "SOURCE_SPECIFIC_NOT_INFERRED",
  });
  assert.deepEqual(contract.time_provenance, APPROVED_TIME_PROVENANCE,
    "time provenance differs from the approved deterministic closure");
  assert.equal(contract.topics.length, 5);
  const topicRanks = new Map(contract.topics.map(({ code, display_rank }) => [code, display_rank]));
  assert.equal(topicRanks.size, 5);
  assert.deepEqual([...topicRanks.values()], [1, 2, 3, 4, 5]);
  assert.equal(contract.datasets.length, 3);
  assert.deepEqual(contract.datasets.map(({ name, key }) => ({ name, key })), [
    { name: "sector_items", key: ["intelligence_item_id"] },
    { name: "sector_item_topics", key: ["intelligence_item_id", "topic_code"] },
    { name: "sector_project_bindings", key: ["intelligence_item_id", "repd_ref", "binding_role"] },
  ]);
  assert.deepEqual(contract.datasets[0].columns.map(({ name }) => name), ITEM_FIELDS);
  assert.deepEqual(contract.datasets[1].columns.map(({ name }) => name), TOPIC_FIELDS);
  assert.deepEqual(contract.datasets[2].columns.map(({ name }) => name), BINDING_FIELDS);
  assert.deepEqual(contract.limits, APPROVED_LIMITS, "bounded acquisition limits differ from the approved closure");
  assert.equal(contract.physical_layout.compression, "ZSTD");
  assert.equal(contract.physical_layout.path_template,
    `releases/data/intelligence/${GENERATION}/{dataset_directory}/${GENERATION}-part-000.parquet`);
  assert.deepEqual(contract.physical_layout.dataset_directories, {
    sector_items: "sector-items",
    sector_item_topics: "sector-item-topics",
    sector_project_bindings: "sector-project-bindings",
  });
  assert.equal(contract.physical_layout.generation_target_policy,
    "IMMUTABLE_FULL_GENERATION_WRITE_FROM_EMPTY_TARGET");
  assert.equal(contract.federation.data_centres.owner_parquet_copied, false);
  assert.equal(contract.federation.companies_house.acquisition_in_pipelinenews, false);
  assert.equal(contract.identity_policy.query_context_may_establish_project_identity, false);
  assert.deepEqual(contract.identity_policy.forbidden_sector_item_fields, [...FORBIDDEN_ITEM_FIELDS]);
  assert.equal(contract.invariants.generic_news_rows, 136);
  assert.equal(contract.invariants.data_centre_generic_rows_sanitised, 6);
  const ids = contract.sources.map(({ id }) => id);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(contract.sources.map(({ id, topic_code, adapter, source_url, item_hosts }) => ({
    id, topic_code, adapter, source_url, item_hosts,
  })), APPROVED_SOURCE_CLOSURE, "source URL, adapter or item-host closure changed");
  assert.deepEqual(contract.sources.map(({ source_terms_url }) => source_terms_url), APPROVED_SOURCE_TERMS,
    "source terms URL closure changed");
  assert.equal(contract.sources.filter(({ adapter }) => NETWORK_ADAPTERS.has(adapter)).length, contract.limits.maximum_network_requests);
  assert.equal(contract.sources.filter(({ adapter }) => LOCAL_ADAPTERS.has(adapter)).length, 3);
  for (const source of contract.sources) {
    assert.ok(topicRanks.has(source.topic_code));
    assert.ok(NETWORK_ADAPTERS.has(source.adapter) || LOCAL_ADAPTERS.has(source.adapter));
    httpsUrl(source.source_url, `${source.id} source URL`);
    httpsUrl(source.source_terms_url, `${source.id} terms URL`);
    for (const field of ["evidence_class", "source_licence_id", "redistribution_rights", "attribution"]) {
      assert.ok(String(source[field] || "").trim(), `${source.id} lacks ${field}`);
    }
  }
  const nationalGrid = contract.sources.find(({ id }) => id === "NATIONAL_GRID_GREAT_GRID_UPGRADE");
  assert.equal(nationalGrid.adapter, "STATIC_LINK_V1");
  assert.equal(nationalGrid.source_terms_url, "https://www.nationalgrid.com/terms-and-conditions");
  const fcc = contract.sources.find(({ id }) => id === "FCC_CURRENT_COVERED_LIST");
  assert.equal(fcc.adapter, "STATIC_LINK_V1");
  assert.equal(fcc.source_url, "https://www.fcc.gov/supplychain/coveredlist");
  assert.equal(fcc.current_notice_url, "https://docs.fcc.gov/public/attachments/DA-26-870A1.pdf");
  assert.equal(fcc.current_faq_url, "https://www.fcc.gov/covered-list-faqs-robots-inverters");
  assert.equal(fcc.historical_notice_only, "https://docs.fcc.gov/public/attachments/DA-26-786A1.pdf");
  const fccFeed = contract.sources.find(({ id }) => id === "FCC_EDOCS_NEWS_RSS");
  assert.equal(fccFeed.source_url, "https://api2.fcc.gov/edocs/public/api/v1/rss/docTypes/News_Release");
  assert.equal(fccFeed.redistribution_rights,
    "FCC_AUTHORED_OFFICIAL_METADATA_PUBLIC_DOMAIN_THIRD_PARTY_AND_LOGOS_EXCLUDED");
  const eia = contract.sources.find(({ id }) => id === "EIA_SOLAR_RSS");
  assert.equal(eia.redistribution_rights,
    "EIA_AUTHORED_METADATA_PUBLIC_DOMAIN_WITH_ATTRIBUTION_THIRD_PARTY_LOGOS_PHOTOS_EXCLUDED");
  const owner = contract.federation.data_centres;
  assert.match(owner.owner_commit, /^[a-f0-9]{40}$/u);
  assert.match(owner.export_sha256, /^[a-f0-9]{64}$/u);
  assert.match(owner.owner_parquet_sha256, /^[a-f0-9]{64}$/u);
  const ownerSource = contract.sources.find(({ id }) => id === "DATA_CENTRES_OWNER_EXPORT");
  assert.deepEqual(ownerSource.accepted_content_types, ["application/json", "application/ld+json", "text/plain"]);
  return contract;
}

async function collectNetworkSource(source, contract, fetchImpl, collectionAnchorAt, fixtureMode, topicRanks) {
  try {
    const { bytes, contentType } = await fetchBounded(source, fetchImpl, contract.limits);
    if (source.adapter === "PINNED_OWNER_EXPORT_V1") {
      assert.ok(source.accepted_content_types.includes(contentType), `${source.id} returned an undeclared media type`);
    }
    if (source.adapter === "GOVUK_SEARCH_V1") {
      assert.ok(["application/json", "application/ld+json"].includes(contentType), `${source.id} returned a non-JSON media type`);
    }
    if (source.adapter === "OFFICIAL_RSS_V1") {
      assert.ok(["application/rss+xml", "application/xml", "application/atom+xml", "text/xml"].includes(contentType),
        `${source.id} returned a non-feed media type`);
    }
    if (source.adapter === "PINNED_OWNER_EXPORT_V1" && !fixtureMode) {
      assert.equal(sha256(bytes), contract.federation.data_centres.export_sha256, "pinned owner export digest changed");
    }
    let values;
    if (source.adapter === "PINNED_OWNER_EXPORT_V1") values = ownerExportItems(source, bytes.toString("utf8"), contract, fixtureMode);
    else if (source.adapter === "GOVUK_SEARCH_V1") values = govukItems(source, bytes.toString("utf8"), collectionAnchorAt, contract.limits);
    else if (source.adapter === "OFFICIAL_RSS_V1") values = rssItems(source, bytes.toString("utf8"), collectionAnchorAt, contract.limits);
    else values = [{
      source_item_id: source.source_url,
      title: source.ventus_authored_label,
      canonical_url: source.source_url,
      source_published_at: null,
      observed_at: collectionAnchorAt,
      summary: null,
      status: "OFFICIAL_ENDPOINT_AVAILABLE",
    }];
    const items = values.map((value) => itemRow(source, value, collectionAnchorAt, contract.limits));
    const topics = items.map((item) => topicRow(item, source, topicRanks,
      source.adapter === "PINNED_OWNER_EXPORT_V1" ? "PINNED_OWNER_TOPIC" : "SOURCE_DEFINITION_TOPIC"));
    return {
      source_status: {
        source_id: source.id,
        result: "OK",
        requested: true,
        response_bytes: bytes.length,
        response_sha256: sha256(bytes),
        content_type: contentType,
        retained_items: items.length,
        error_code: null,
      },
      items,
      topics,
    };
  } catch (error) {
    return {
      source_status: {
        source_id: source.id,
        result: "FAILED_SOFT",
        requested: true,
        response_bytes: 0,
        response_sha256: null,
        content_type: null,
        retained_items: 0,
        error_code: failureCode(error),
      },
      items: [],
      topics: [],
    };
  }
}

async function collectFrozenGeneric(contract, genericNewsPath, collectionAnchorAt, topicRanks) {
  const source = contract.sources.find(({ adapter }) => adapter === "FROZEN_GENERIC_NEWS_V1");
  const bytes = await readFile(genericNewsPath);
  assert.equal(sha256(bytes), contract.frozen_generic_news.sha256);
  const payload = JSON.parse(bytes);
  assert.equal(payload.rows.length, contract.frozen_generic_news.expected_rows);
  const fields = payload.fields;
  const records = payload.rows.map((row) => Object.fromEntries(fields.map((field, index) => [field, row[index]])));
  const selected = records.filter((record) => record.role === "DISCOVERY_ONLY" && /data\s*cent(?:re|er)/iu.test(record.headline));
  assert.equal(selected.length, contract.frozen_generic_news.expected_data_centre_discovery_rows);
  assert.ok(selected.every((record) => record.repd_ref === "" && record.gg_project_id === "" && record.eligible_for_news_signal === false));
  assert.ok(selected.some((record) => record.project && record.capacity_mw), "fixture did not expose the query-context contamination being stripped");
  const items = selected.map((record) => itemRow(source, {
    source_item_id: record.gg_article_id,
    title: record.headline,
    summary: null,
    canonical_url: record.url,
    source_published_at: record.published,
    observed_at: record.published,
    status: "DISCOVERY_ONLY_QUERY_CONTEXT_STRIPPED",
    evidence_class: "DISCOVERY_ONLY",
    attribution: `${record.source}; Google News link-through`,
    generic_article_id: record.gg_article_id,
  }, collectionAnchorAt, contract.limits));
  const topics = items.map((item) => topicRow(item, source, topicRanks, "FROZEN_HEADLINE_TOPIC_QUERY_IDENTITY_STRIPPED"));
  return {
    source_status: {
      source_id: source.id,
      result: "OK",
      requested: false,
      response_bytes: bytes.length,
      response_sha256: sha256(bytes),
      content_type: "application/json",
      retained_items: items.length,
      error_code: null,
    },
    items,
    topics,
  };
}

function collectStaticLinks(contract, collectionAnchorAt, topicRanks) {
  return contract.sources.filter(({ adapter }) => adapter === "STATIC_LINK_V1").map((source) => {
    const item = itemRow(source, {
      source_item_id: source.source_url,
      title: source.ventus_authored_label,
      summary: null,
      canonical_url: source.source_url,
      source_published_at: null,
      observed_at: collectionAnchorAt,
      status: "STATIC_LINK_REFERENCE",
    }, collectionAnchorAt, contract.limits);
    return {
      source_status: {
        source_id: source.id,
        result: "STATIC_LINK",
        requested: false,
        response_bytes: 0,
        response_sha256: null,
        content_type: null,
        retained_items: 1,
        error_code: null,
      },
      items: [item],
      topics: [topicRow(item, source, topicRanks, "STATIC_LINK_TOPIC")],
    };
  });
}

export async function collectSectorIntelligence({
  contract,
  genericNewsPath,
  fetchImpl = fetch,
  fixture = null,
  collectionAnchorAt,
  collectionAnchorBasis,
}) {
  validateContract(contract);
  const normalisedCollectionAnchorAt = iso(
    collectionAnchorAt || fixture?.collection_anchor_at,
    "collection_anchor_at",
  );
  const normalisedCollectionAnchorBasis = collectionAnchorBasis || fixture?.collection_anchor_basis;
  assert.equal(normalisedCollectionAnchorBasis, fixture
    ? "SYNTHETIC_FIXTURE_GENERATION_ANCHOR"
    : contract.time_provenance.live_collection_anchor_basis,
  "collection anchor basis does not match its execution mode");
  const topicRanks = new Map(contract.topics.map(({ code, display_rank }) => [code, display_rank]));
  if (fixture) {
    assert.equal(fixture.schema, FIXTURE_SCHEMA);
    assert.equal(fixture.generation, GENERATION);
    assert.equal(fixture.usage_context, USAGE_CONTEXT);
    assert.ok(Object.values(fixture.forbidden_retained_content).every((value) => value === false));
    fetchImpl = bindFixtureSources(contract, fixture);
  }
  const networkSources = contract.sources.filter(({ adapter }) => NETWORK_ADAPTERS.has(adapter));
  const results = await mapLimit(networkSources, contract.limits.maximum_concurrency,
    (source) => collectNetworkSource(source, contract, fetchImpl, normalisedCollectionAnchorAt, Boolean(fixture), topicRanks));
  results.push(...collectStaticLinks(contract, normalisedCollectionAnchorAt, topicRanks));
  results.push(await collectFrozenGeneric(contract, genericNewsPath, normalisedCollectionAnchorAt, topicRanks));
  const items = results.flatMap(({ items: values }) => values);
  const topics = results.flatMap(({ topics: values }) => values);
  const bindings = [];
  items.sort((left, right) => left.intelligence_item_id.localeCompare(right.intelligence_item_id));
  topics.sort((left, right) => left.intelligence_item_id.localeCompare(right.intelligence_item_id) || left.topic_code.localeCompare(right.topic_code));
  assert.ok(items.length <= contract.limits.maximum_total_items);
  assert.equal(items.length, new Set(items.map(({ intelligence_item_id }) => intelligence_item_id)).size);
  assert.equal(topics.length, new Set(topics.map((row) => `${row.intelligence_item_id}\u001f${row.topic_code}`)).size);
  assert.ok(topics.every(({ intelligence_item_id }) => items.some((item) => item.intelligence_item_id === intelligence_item_id)));
  assert.ok(items.every(({ eligible_for_news_signal }) => eligible_for_news_signal === false));
  assert.ok(topics.every(({ eligible_for_news_signal }) => eligible_for_news_signal === false));
  assert.deepEqual(bindings, []);
  const serialisedItems = JSON.stringify(items);
  for (const field of FORBIDDEN_ITEM_FIELDS) assert.equal(new RegExp(`\"${field}\"`, "u").test(serialisedItems), false);
  assert.equal(/DESCRIPTION MUST NOT BE RETAINED|QUERY CONTEXT MUST NOT SURVIVE/iu.test(serialisedItems), false);
  const genericItems = items.filter(({ generic_article_id }) => generic_article_id !== null);
  assert.equal(genericItems.length, contract.invariants.data_centre_generic_rows_sanitised);
  const ownerItems = items.filter(({ owner_repository }) => owner_repository !== null);
  if (!fixture) assert.equal(ownerItems.length, contract.invariants.owner_metric_rows_expected);
  const ledger = {
    schema: LEDGER_SCHEMA,
    generation: GENERATION,
    collection_anchor_at: normalisedCollectionAnchorAt,
    collection_anchor_basis: normalisedCollectionAnchorBasis,
    usage_context: USAGE_CONTEXT,
    usage_context_establishes_upstream_rights: false,
    datasets: {
      sector_items: { fields: ITEM_FIELDS, rows: items },
      sector_item_topics: { fields: TOPIC_FIELDS, rows: topics },
      sector_project_bindings: { fields: BINDING_FIELDS, rows: bindings },
    },
    source_statuses: results.map(({ source_status }) => source_status).sort((a, b) => a.source_id.localeCompare(b.source_id)),
    policy_evidence: {
      network_requests: networkSources.length,
      upstream_data_centre_requests: 0,
      pinned_data_centre_owner_export_requests: 1,
      companies_house_requests: 0,
      generic_news_rows_preserved: contract.invariants.generic_news_rows,
      generic_data_centre_rows_sanitised: genericItems.length,
      query_context_used_for_project_identity: false,
      stripped_project_identity_fields: [...FORBIDDEN_ITEM_FIELDS],
      retained_raw_html_bytes: 0,
      retained_article_body_bytes: 0,
      retained_search_snippet_characters: 0,
      owner_parquet_copied: false,
      sector_project_bindings: 0,
      all_items_eligible_for_news_signal: false,
    },
    deployment: "not-authorised",
  };
  return ledger;
}

function parseArguments(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    assert.ok(key?.startsWith("--") && argv[index + 1] !== undefined, `invalid argument near ${key}`);
    output[key.slice(2)] = argv[index + 1];
  }
  for (const required of ["contract", "generic-news", "ledger"]) assert.ok(output[required], `--${required} is required`);
  return output;
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const contract = JSON.parse(await readFile(arguments_.contract));
  const fixture = arguments_.fixture ? JSON.parse(await readFile(arguments_.fixture)) : null;
  if (!fixture) {
    assert.ok(arguments_["collection-anchor-at"], "--collection-anchor-at is required for live collection");
    assert.ok(arguments_["collection-anchor-basis"], "--collection-anchor-basis is required for live collection");
  }
  const ledger = await collectSectorIntelligence({
    contract,
    genericNewsPath: arguments_["generic-news"],
    fixture,
    collectionAnchorAt: arguments_["collection-anchor-at"],
    collectionAnchorBasis: arguments_["collection-anchor-basis"],
  });
  const destination = path.resolve(arguments_.ledger);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, canonicalJson(ledger));
  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    generation: GENERATION,
    items: ledger.datasets.sector_items.rows.length,
    topics: ledger.datasets.sector_item_topics.rows.length,
    bindings: ledger.datasets.sector_project_bindings.rows.length,
    generic_data_centre_rows_sanitised: ledger.policy_evidence.generic_data_centre_rows_sanitised,
    deployment: "not-authorised",
  })}\n`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main().catch((error) => {
  process.stderr.write(`sector runner failed closed: ${error.stack || error}\n`);
  process.exitCode = 1;
});
