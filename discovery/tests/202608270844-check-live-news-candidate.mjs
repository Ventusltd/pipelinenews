import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GENERATION,
  LIMITS,
  LiveNewsDiscoveryError,
  approvedEvidenceToNewsItems,
  buildBoundedQueryPlan,
  classifySearchResult,
  configuredOptionalProviders,
  parseBingNewsRss,
  searchNewsProvider,
  validateApprovedEvidence,
} from '../javascript/202608270844-live-news-runner.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const contract = readJson('data/news-discovery/202608270844-live-news-discovery-contract.json');
const evidence = readJson('data/news-discovery/202608270844-bbc-live-news-evidence.json');

const projectByRef = new Map();
let projectCount = 0;
let capacityMw = 0;
for (const filename of fs.readdirSync(path.join(root, 'data/projects')).filter((name) => /^202608261927-project-partition-v9-1-\d+\.json$/.test(name)).sort()) {
  const partition = readJson(`data/projects/${filename}`);
  for (const project of partition.projects) {
    projectCount += 1;
    capacityMw += Number(project.capacity_mw) || 0;
    projectByRef.set(String(project.repd_ref), project);
  }
}
assert.equal(projectCount, 7_680);
assert.equal(Number(capacityMw.toFixed(2)), 356_474.09);

const validation = validateApprovedEvidence({ evidence, contract, projectByRef });
assert.deepEqual(validation, {
  valid: true,
  generation: GENERATION,
  records: 3,
  primary_matches: 2,
  related_mentions: 1,
  eligible_for_news_signal: 2,
  deployment_status: 'not-authorised',
});
const items = approvedEvidenceToNewsItems({ evidence, contract, projectByRef });
assert.equal(items.length, 3);
assert.equal(items.filter((item) => item.canonical_relevant).length, 2);
assert.ok(items.every((item) => item.confidence === 100));

const eastPye = items.find((item) => item.gg_article_id === 'GG2050-NEWS-B4B91FD3DA8F596C');
assert.equal(eastPye.repd_ref, '17494');
assert.equal(eastPye.gg_project_id, 'GG2050-REPD-17494');
assert.equal(eastPye.capacity_mw, 500);
assert.equal(eastPye.event, 'PROJECT UPDATE');
assert.equal(eastPye.event_detail, null);
assert.deepEqual(eastPye.related_components, [{
  role: 'RELATED_DEVELOPMENT',
  repd_ref: '20670',
  gg_project_id: 'GG2050-REPD-20670',
  technology: 'bess',
  official_capacity_mw: null,
  eligible_for_news_signal: false,
}]);

const beacon = items.find((item) => item.gg_article_id === 'GG2050-NEWS-C3D0A5910F32E821');
assert.equal(beacon.repd_ref, '13599');
assert.equal(beacon.event, 'PROJECT UPDATE');
assert.equal(beacon.event_detail, 'POTENTIAL_LEGAL_CHALLENGE_TO_CONSENT');
assert.equal(beacon.related_components[0].repd_ref, '13600');
assert.equal(beacon.related_components[0].official_capacity_mw, 600);
assert.equal(beacon.related_components[0].eligible_for_news_signal, false);

const windsock = items.find((item) => item.gg_article_id === 'GG2050-NEWS-0E813A86D54E39FC');
assert.equal(windsock.project_name, 'Windsock Solar Farm');
assert.equal(windsock.repd_ref, null);
assert.equal(windsock.gg_project_id, null);
assert.equal(windsock.role, 'RELATED_MENTION');
assert.equal(windsock.relationship, 'EDITORIAL_CONTEXT');
assert.equal(windsock.related_context_repd_ref, '13599');
assert.equal(windsock.related_context_label, 'RELATED CONTEXT ONLY — NOT A PROJECT BINDING');
assert.equal(windsock.eligible_for_news_signal, false);
assert.equal(windsock.canonical_relevant, false);
assert.ok(!JSON.stringify(items).includes('FINANCIAL CLOSE'));

const missingBessCapacity = structuredClone(evidence);
missingBessCapacity.records.find((record) => record.gg_article_id === beacon.gg_article_id)
  .binding.related_components[0].official_capacity_mw = undefined;
assert.throws(
  () => validateApprovedEvidence({ evidence: missingBessCapacity, contract, projectByRef }),
  (error) => error instanceof LiveNewsDiscoveryError && /RELATED_COMPONENTS?_MISMATCH/.test(error.code),
);

const eligiblePool = [...projectByRef.values()];
const queryPlan = buildBoundedQueryPlan(eligiblePool);
assert.equal(queryPlan.selected_projects.length, LIMITS.selected_projects);
assert.equal(queryPlan.queries.length, LIMITS.queries_per_run);
assert.ok(queryPlan.selected_projects.every((project) => ['solar', 'bess'].includes(project.technology)));
assert.ok(!queryPlan.selected_projects.some((project) => String(project.technology).startsWith('wind')));
assert.equal(queryPlan.queries.filter((query) => query.repd_ref === queryPlan.selected_projects[0].repd_ref).length, 2);

const contextOnlySearch = {
  title: 'Lincolnshire farmer says turning to solar is only way to survive',
  url: 'https://www.bbc.co.uk/news/articles/cz64qyy59g4o',
  snippet: 'The Windsock Solar Farm proposal is discussed, with Beacon Fen appearing as separate context.',
  published_at: '2026-08-27T04:56:46.518Z',
  source: 'BBC News',
};
assert.deepEqual(classifySearchResult(contextOnlySearch, contract), {
  outcome: 'ABSTAIN',
  reason: 'SNIPPET_CONTEXT_ONLY',
  repd_ref: null,
});

const rssItems = Array.from({ length: 12 }, (_, index) => `<item><title>Result ${index}</title><link>https://example.com/${index}</link><description>${'x'.repeat(350)}</description><pubDate>Thu, 27 Aug 2026 08:00:00 GMT</pubDate><source>Publisher</source></item>`).join('');
const parsedRss = parseBingNewsRss(`<rss><channel>${rssItems}</channel></rss>`);
assert.equal(parsedRss.length, LIMITS.results_per_query);
assert.ok(parsedRss.every((item) => item.snippet.length === LIMITS.snippet_chars));
assert.deepEqual(configuredOptionalProviders({}), []);
assert.deepEqual(configuredOptionalProviders({
  BRAVE_SEARCH_API_KEY: 'configured',
  GOOGLE_CSE_API_KEY: 'configured',
  GOOGLE_CSE_ID: 'configured',
  SERPER_API_KEY: 'configured',
}), ['brave', 'google_cse', 'serper']);

const secret = 'SECRET_MUST_NEVER_ESCAPE';
await assert.rejects(
  searchNewsProvider('Beacon Fen', {
    provider: 'google_cse',
    secret_env: { GOOGLE_CSE_API_KEY: secret, GOOGLE_CSE_ID: 'cx' },
    fetch_impl: async () => { throw new Error(`network error ${secret}`); },
  }),
  (error) => error instanceof LiveNewsDiscoveryError && error.code === 'PROVIDER_REQUEST_FAILED' && !String(error).includes(secret),
);

console.log(JSON.stringify({
  gate: '202608270844-check-live-news-candidate',
  projects: projectCount,
  capacity_mw: Number(capacityMw.toFixed(2)),
  records: items.length,
  primary_matches: validation.primary_matches,
  related_mentions: validation.related_mentions,
  queries: queryPlan.queries.length,
  deployment_status: validation.deployment_status,
}));
