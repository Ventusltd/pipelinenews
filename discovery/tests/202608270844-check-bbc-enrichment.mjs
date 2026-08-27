import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BBC_ENRICHMENT_LIMITS,
  BbcEnrichmentError,
  classifyEnrichedBbcArticle,
  enrichBbcArticle,
  fetchBbcArticleMetadata,
  validateBbcArticleUrl,
} from '../javascript/202608270844-bbc-enrichment.mjs';
import { normaliseDiscoveryContract } from '../javascript/202608270844-live-news-runner.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const contract = normaliseDiscoveryContract(readJson('data/news-discovery/202608270844-live-news-discovery-contract.json'));
const pages = readJson('discovery/fixtures/202608270844-synthetic-bbc-pages.json');
const windsockUrl = 'https://www.bbc.co.uk/news/articles/cz64qyy59g4o';
const legalUrl = 'https://www.bbc.co.uk/news/articles/c93e5lndl9vo';
const eastPyeUrl = 'https://www.bbc.co.uk/news/articles/clyelee255do';
const requests = [];

const fixtureFetch = async (url, init) => {
  requests.push({ url, redirect: init?.redirect, method: init?.method, hasSignal: Boolean(init?.signal) });
  const html = pages[url];
  if (!html) return { status: 404, redirected: false, url, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) };
  const bytes = new TextEncoder().encode(html);
  return {
    status: 200,
    redirected: false,
    url,
    headers: {
      get(name) {
        if (name.toLowerCase() === 'content-type') return 'text/html; charset=utf-8';
        if (name.toLowerCase() === 'content-length') return String(bytes.byteLength);
        return null;
      },
    },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
};

assert.deepEqual(BBC_ENRICHMENT_LIMITS, {
  request_timeout_ms: 5_000,
  response_bytes: 1_048_576,
  snippet_chars: 300,
  max_link_depth: 1,
  max_internal_article_links: 10,
});
assert.equal(validateBbcArticleUrl(windsockUrl), windsockUrl);
for (const invalid of [
  'http://www.bbc.co.uk/news/articles/cz64qyy59g4o',
  'https://bbc.co.uk/news/articles/cz64qyy59g4o',
  'https://www.bbc.co.uk/news/articles/cz64qyy59g4o?output=amp',
  'https://www.bbc.co.uk/news/articles/cz64qyy59g4o#story',
  'https://www.bbc.co.uk/news/world/cz64qyy59g4o',
  'https://example.com/news/articles/cz64qyy59g4o',
]) {
  assert.throws(() => validateBbcArticleUrl(invalid), BbcEnrichmentError);
}

const enriched = await enrichBbcArticle(windsockUrl, {
  fetch_impl: fixtureFetch,
  max_link_depth: 1,
  gazetteer: contract.gazetteer,
  subject_names: contract.excluded_primary_subjects.map((subject) => subject.name),
});
assert.equal(enriched.root.url, windsockUrl);
assert.deepEqual(enriched.root.internal_article_urls, [legalUrl]);
assert.equal(enriched.linked_articles.length, 1);
assert.equal(enriched.linked_articles[0].url, legalUrl);
assert.ok(enriched.linked_articles[0].internal_article_urls.includes(eastPyeUrl));
assert.ok(!enriched.linked_articles.some((article) => article.url === eastPyeUrl), 'one-layer enrichment must not recurse');
assert.equal(enriched.health.maximum_link_depth, 1);
assert.equal(enriched.health.retained_raw_html, false);
assert.equal(enriched.health.retained_article_bodies, false);
assert.ok(requests.every((request) => request.redirect === 'error' && request.method === 'GET' && request.hasSignal));
assert.equal(requests.length, 2);

const serialised = JSON.stringify(enriched);
assert.ok(!serialised.includes('<html'));
assert.ok(!serialised.includes('<body'));
assert.ok(!serialised.includes('UNIQUE_RAW_BODY_MARKER_MUST_NOT_ESCAPE'));
assert.ok(enriched.root.evidence_snippets.every((snippet) => Array.from(snippet).length <= 300));

const rootDecision = classifyEnrichedBbcArticle(enriched.root, contract);
assert.deepEqual(rootDecision, {
  outcome: 'RELATED_MENTION',
  reason: 'NON_REPD_PRIMARY_WITH_EDITORIAL_CONTEXT',
  repd_ref: null,
  related_context_repd_ref: '13599',
  primary_subject: 'Windsock Solar Farm',
});
const legalDecision = classifyEnrichedBbcArticle(enriched.linked_articles[0], contract);
assert.deepEqual(legalDecision, {
  outcome: 'PRIMARY_MATCH',
  reason: 'RETURNED_PUBLISHER_EVIDENCE',
  repd_ref: '13599',
});

await assert.rejects(
  enrichBbcArticle(windsockUrl, { fetch_impl: fixtureFetch, max_link_depth: 2 }),
  (error) => error instanceof BbcEnrichmentError && error.code === 'BBC_LINK_DEPTH_INVALID',
);
await assert.rejects(
  fetchBbcArticleMetadata(windsockUrl, {
    fetch_impl: async (url) => ({
      status: 200,
      redirected: true,
      url,
      headers: { get: () => 'text/html' },
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  }),
  (error) => error instanceof BbcEnrichmentError && error.code === 'BBC_REDIRECT_REJECTED',
);
await assert.rejects(
  fetchBbcArticleMetadata(windsockUrl, {
    fetch_impl: async (url) => ({
      status: 200,
      redirected: false,
      url,
      headers: {
        get(name) {
          return name.toLowerCase() === 'content-length' ? String(BBC_ENRICHMENT_LIMITS.response_bytes + 1) : 'text/html';
        },
      },
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  }),
  (error) => error instanceof BbcEnrichmentError && error.code === 'BBC_RESPONSE_TOO_LARGE',
);

console.log(JSON.stringify({
  gate: '202608270844-check-bbc-enrichment',
  root_outcome: rootDecision.outcome,
  linked_outcome: legalDecision.outcome,
  fetched_articles: enriched.health.fetched_articles,
  raw_html_retained: false,
}));
