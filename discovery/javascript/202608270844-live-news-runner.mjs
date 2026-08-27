import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  BBC_ENRICHMENT_LIMITS,
  classifyEnrichedBbcArticle,
  enrichBbcArticle,
  validateBbcArticleUrl,
} from './202608270844-bbc-enrichment.mjs';

export const GENERATION = '202608270844';
export const LIMITS = Object.freeze({
  selected_projects: 25,
  queries_per_project: 2,
  queries_per_run: 50,
  results_per_query: 10,
  request_timeout_ms: 5_000,
  response_bytes: 1_048_576,
  snippet_chars: 300,
  bbc_link_depth: 1,
  bbc_enrichment_roots_per_run: 10,
  solar_minimum_mw: 49,
  bess_minimum_mw: 99,
  wind_included: false,
});

const PRODUCTION_CONTRACT_SCHEMA = 'pipelinenews.live-news-discovery.contract.v1';
const CANONICAL_CONTRACT_SCHEMA = 'pipelinenews.live-news-discovery-contract.v1';
const EVIDENCE_SCHEMA = 'pipelinenews.bbc-live-news-evidence.v1';
const RELATED_CONTEXT_LABEL = 'RELATED CONTEXT ONLY — NOT A PROJECT BINDING';
const DEFAULT_FOREIGN_CONFLICT_TERMS = Object.freeze([
  'Australia',
  'Canada',
  'India',
  'Ireland',
  'New Zealand',
  'United States',
]);

const APPROVED_ARTICLES = Object.freeze([
  Object.freeze({
    article_id: 'GG2050-NEWS-B4B91FD3DA8F596C',
    url: 'https://www.bbc.co.uk/news/articles/clyelee255do',
    headline: 'Huge Norfolk solar farm near Long Stratton set to cost £1bn',
    role: 'PRIMARY_MATCH',
    relationship: null,
    repd_ref: '17494',
    gg_project_id: 'GG2050-REPD-17494',
    event: 'PROJECT UPDATE',
    event_detail: null,
    confidence: 100,
    eligible_for_news_signal: true,
    related_context_repd_ref: null,
    related_components: [Object.freeze({
      role: 'RELATED_DEVELOPMENT',
      repd_ref: '20670',
      gg_project_id: 'GG2050-REPD-20670',
      technology: 'bess',
      official_capacity_mw: null,
      eligible_for_news_signal: false,
    })],
  }),
  Object.freeze({
    article_id: 'GG2050-NEWS-C3D0A5910F32E821',
    url: 'https://www.bbc.co.uk/news/articles/c93e5lndl9vo',
    headline: 'Heckington solar farm approval may face legal challenge',
    role: 'PRIMARY_MATCH',
    relationship: null,
    repd_ref: '13599',
    gg_project_id: 'GG2050-REPD-13599',
    event: 'PROJECT UPDATE',
    event_detail: 'POTENTIAL_LEGAL_CHALLENGE_TO_CONSENT',
    confidence: 100,
    eligible_for_news_signal: true,
    related_context_repd_ref: null,
    related_components: [Object.freeze({
      role: 'RELATED_DEVELOPMENT',
      repd_ref: '13600',
      gg_project_id: 'GG2050-REPD-13600',
      technology: 'bess',
      official_capacity_mw: 600,
      eligible_for_news_signal: false,
    })],
  }),
  Object.freeze({
    article_id: 'GG2050-NEWS-0E813A86D54E39FC',
    url: 'https://www.bbc.co.uk/news/articles/cz64qyy59g4o',
    headline: 'Lincolnshire farmer says turning to solar is only way to survive',
    role: 'RELATED_MENTION',
    relationship: 'EDITORIAL_CONTEXT',
    repd_ref: null,
    gg_project_id: null,
    event: 'PROJECT UPDATE',
    event_detail: null,
    confidence: 100,
    eligible_for_news_signal: false,
    related_context_repd_ref: '13599',
    related_components: [],
  }),
]);

export class LiveNewsDiscoveryError extends Error {
  constructor(code) {
    super(code);
    this.name = 'LiveNewsDiscoveryError';
    this.code = code;
  }
}

function fail(code) {
  throw new LiveNewsDiscoveryError(code);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, code) {
  if (!isPlainObject(value)) fail(code);
}

function assertExactKeys(value, keys, code) {
  assertPlainObject(value, code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
}

function assertString(value, code, { allowEmpty = false, maximum = 500 } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > maximum) fail(code);
}

function assertNullableString(value, code, maximum = 500) {
  if (value !== null) assertString(value, code, { maximum });
}

function assertIsoDate(value, code) {
  assertString(value, code, { maximum: 40 });
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail(code);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncateSnippet(value) {
  return compactText(value).slice(0, LIMITS.snippet_chars);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text, phrase) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

function getProject(projectByRef, repdRef) {
  if (projectByRef instanceof Map) return projectByRef.get(String(repdRef));
  if (isPlainObject(projectByRef)) return projectByRef[String(repdRef)];
  fail('PROJECT_GAZETTEER_INVALID');
}

function projectValues(projectByRef) {
  if (projectByRef instanceof Map) return [...projectByRef.values()];
  if (isPlainObject(projectByRef)) return Object.values(projectByRef);
  fail('PROJECT_GAZETTEER_INVALID');
}

function assertExactProject(project, expected, prefix) {
  if (!project) fail(`${prefix}_MISSING`);
  const comparisons = [
    ['repd_ref', expected.repd_ref],
    ['gg_project_id', expected.gg_project_id],
    ['name', expected.name],
    ['technology', expected.technology],
    ['capacity_mw', expected.official_capacity_mw],
    ['operator', expected.operator],
    ['county', expected.county],
    ['country', expected.country],
    ['planning_application_reference', expected.planning_reference],
  ];
  for (const [field, expectedValue] of comparisons) {
    if (project[field] !== expectedValue) fail(`${prefix}_${field.toUpperCase()}_MISMATCH`);
  }
}

function validateCanonicalContract(contract) {
  assertExactKeys(contract, [
    'schema',
    'generation',
    'deployment_status',
    'limits',
    'related_context_label',
    'gazetteer',
    'articles',
    'excluded_primary_subjects',
    'foreign_conflict_terms',
  ], 'CONTRACT_KEYS_INVALID');
  if (contract.schema !== CANONICAL_CONTRACT_SCHEMA) fail('CONTRACT_SCHEMA_INVALID');
  if (contract.generation !== GENERATION) fail('CONTRACT_GENERATION_INVALID');
  if (contract.deployment_status !== 'not-authorised') fail('CONTRACT_DEPLOYMENT_STATUS_INVALID');
  if (contract.related_context_label !== RELATED_CONTEXT_LABEL) fail('CONTRACT_RELATED_LABEL_INVALID');
  const contractLimitKeys = [
    'selected_projects',
    'queries_per_project',
    'queries_per_run',
    'results_per_query',
    'request_timeout_ms',
    'response_bytes',
    'snippet_chars',
    'bbc_link_depth',
    'solar_minimum_mw',
    'bess_minimum_mw',
    'wind_included',
  ];
  assertExactKeys(contract.limits, contractLimitKeys, 'CONTRACT_LIMIT_KEYS_INVALID');
  for (const key of contractLimitKeys) {
    if (contract.limits[key] !== LIMITS[key]) fail(`CONTRACT_LIMIT_${key.toUpperCase()}_INVALID`);
  }
  if (!Array.isArray(contract.gazetteer) || contract.gazetteer.length !== 2) fail('CONTRACT_GAZETTEER_INVALID');
  for (const entry of contract.gazetteer) {
    assertExactKeys(entry, [
      'repd_ref',
      'gg_project_id',
      'name',
      'technology',
      'official_capacity_mw',
      'operator',
      'county',
      'country',
      'planning_reference',
      'aliases',
    ], 'CONTRACT_GAZETTEER_ENTRY_INVALID');
    assertString(entry.repd_ref, 'CONTRACT_REPD_REF_INVALID', { maximum: 16 });
    if (!Array.isArray(entry.aliases) || !entry.aliases.length) fail('CONTRACT_ALIASES_INVALID');
    for (const alias of entry.aliases) assertString(alias, 'CONTRACT_ALIAS_INVALID', { maximum: 100 });
  }
  if (!Array.isArray(contract.articles) || contract.articles.length !== 3) fail('CONTRACT_ARTICLES_INVALID');
  for (const article of contract.articles) {
    assertExactKeys(article, [
      'article_id',
      'url',
      'headline',
      'role',
      'relationship',
      'repd_ref',
      'gg_project_id',
      'event',
      'event_detail',
      'confidence',
      'eligible_for_news_signal',
      'related_context_repd_ref',
      'related_components',
    ], 'CONTRACT_ARTICLE_KEYS_INVALID');
    validateBbcArticleUrl(article.url);
    if (article.confidence !== 100) fail('CONTRACT_CONFIDENCE_INVALID');
    if (article.event !== 'PROJECT UPDATE') fail('CONTRACT_EVENT_INVALID');
    if (!Array.isArray(article.related_components)) fail('CONTRACT_RELATED_COMPONENTS_INVALID');
  }
  if (!Array.isArray(contract.excluded_primary_subjects) || contract.excluded_primary_subjects.length !== 1) {
    fail('CONTRACT_EXCLUDED_SUBJECTS_INVALID');
  }
  for (const subject of contract.excluded_primary_subjects) {
    assertExactKeys(subject, ['name', 'operator', 'reason'], 'CONTRACT_EXCLUDED_SUBJECT_INVALID');
  }
  if (!Array.isArray(contract.foreign_conflict_terms)) fail('CONTRACT_FOREIGN_TERMS_INVALID');
  return contract;
}

function productionContractToCanonical(contract) {
  assertExactKeys(contract, [
    'schema',
    'generation',
    'name',
    'incepted_at',
    'repository',
    'protected_parent',
    'rollback_generation',
    'deployment',
    'expected',
    'acquisition',
    'eligibility',
    'identity_policy',
    'bbc_enrichment',
    'closed_gazetteer',
    'excluded_primary_subjects',
  ], 'CONTRACT_KEYS_INVALID');
  if (contract.schema !== PRODUCTION_CONTRACT_SCHEMA) fail('CONTRACT_SCHEMA_INVALID');
  if (contract.generation !== GENERATION || contract.name !== 'Live News Discovery') fail('CONTRACT_GENERATION_INVALID');
  if (contract.repository !== 'Ventusltd/pipelinenews') fail('CONTRACT_REPOSITORY_INVALID');
  if (contract.protected_parent !== '77bda8c3809d02550d06a1c4154315f56d1120fb') fail('CONTRACT_PARENT_INVALID');
  if (contract.rollback_generation !== '202608270055') fail('CONTRACT_ROLLBACK_INVALID');
  if (contract.deployment !== 'not-authorised') fail('CONTRACT_DEPLOYMENT_STATUS_INVALID');
  if (Number.isNaN(Date.parse(contract.incepted_at))) fail('CONTRACT_INCEPTED_AT_INVALID');

  assertExactKeys(contract.expected, [
    'project_count',
    'capacity_mw',
    'headline_count',
    'canonical_uk_headline_count',
    'international_headline_count',
    'added_bbc_records',
    'primary_matches',
    'related_editorial_mentions',
  ], 'CONTRACT_EXPECTED_INVALID');
  const expectedCounts = {
    project_count: 7_680,
    capacity_mw: 356_474.09,
    headline_count: 136,
    canonical_uk_headline_count: 47,
    international_headline_count: 19,
    added_bbc_records: 3,
    primary_matches: 2,
    related_editorial_mentions: 1,
  };
  if (!sameJson(contract.expected, expectedCounts)) fail('CONTRACT_EXPECTED_INVALID');

  assertExactKeys(contract.acquisition, [
    'default_provider',
    'optional_providers',
    'maximum_selected_projects',
    'queries_per_project',
    'maximum_queries_per_run',
    'maximum_results_per_query',
    'request_timeout_ms',
    'maximum_response_bytes',
    'maximum_retained_snippet_characters',
    'secrets_must_not_be_retained',
  ], 'CONTRACT_ACQUISITION_INVALID');
  if (
    contract.acquisition.default_provider !== 'bing_news_rss'
    || !sameJson(contract.acquisition.optional_providers, ['brave', 'google_cse', 'serper'])
    || contract.acquisition.maximum_selected_projects !== LIMITS.selected_projects
    || contract.acquisition.queries_per_project !== LIMITS.queries_per_project
    || contract.acquisition.maximum_queries_per_run !== LIMITS.queries_per_run
    || contract.acquisition.maximum_results_per_query !== LIMITS.results_per_query
    || contract.acquisition.request_timeout_ms !== LIMITS.request_timeout_ms
    || contract.acquisition.maximum_response_bytes !== LIMITS.response_bytes
    || contract.acquisition.maximum_retained_snippet_characters !== LIMITS.snippet_chars
    || contract.acquisition.secrets_must_not_be_retained !== true
  ) fail('CONTRACT_ACQUISITION_INVALID');
  assertExactKeys(contract.eligibility, ['solar_minimum_capacity_mw', 'bess_minimum_capacity_mw', 'excluded_technologies'], 'CONTRACT_ELIGIBILITY_INVALID');
  if (
    contract.eligibility.solar_minimum_capacity_mw !== LIMITS.solar_minimum_mw
    || contract.eligibility.bess_minimum_capacity_mw !== LIMITS.bess_minimum_mw
    || !sameJson(contract.eligibility.excluded_technologies, ['wind_onshore', 'wind_offshore'])
  ) fail('CONTRACT_ELIGIBILITY_INVALID');
  assertExactKeys(contract.identity_policy, [
    'query_context_establishes_identity',
    'primary_match_requires_returned_evidence',
    'primary_match_requires_closed_gazetteer',
    'ambiguous_result',
    'foreign_conflict',
    'wind_result',
    'related_mentions_drive_project_signal',
  ], 'CONTRACT_IDENTITY_POLICY_INVALID');
  if (!sameJson(contract.identity_policy, {
    query_context_establishes_identity: false,
    primary_match_requires_returned_evidence: true,
    primary_match_requires_closed_gazetteer: true,
    ambiguous_result: 'ABSTAIN',
    foreign_conflict: 'REJECT',
    wind_result: 'REJECT',
    related_mentions_drive_project_signal: false,
  })) fail('CONTRACT_IDENTITY_POLICY_INVALID');
  assertExactKeys(contract.bbc_enrichment, [
    'allowed_origin',
    'allowed_path_pattern',
    'redirects',
    'maximum_link_depth',
    'retain_raw_html',
    'retain_article_body',
    'retained_fields',
  ], 'CONTRACT_BBC_ENRICHMENT_INVALID');
  if (
    contract.bbc_enrichment.allowed_origin !== 'https://www.bbc.co.uk'
    || contract.bbc_enrichment.allowed_path_pattern !== '^/news/articles/[a-z0-9]+$'
    || contract.bbc_enrichment.redirects !== 'reject'
    || contract.bbc_enrichment.maximum_link_depth !== 1
    || contract.bbc_enrichment.retain_raw_html !== false
    || contract.bbc_enrichment.retain_article_body !== false
    || !sameJson(contract.bbc_enrichment.retained_fields, [
      'compact_metadata',
      'exact_project_mentions',
      'internal_article_urls',
      'bounded_evidence_snippets',
    ])
  ) fail('CONTRACT_BBC_ENRICHMENT_INVALID');

  if (!Array.isArray(contract.closed_gazetteer) || contract.closed_gazetteer.length !== 4) fail('CONTRACT_GAZETTEER_INVALID');
  const gazetteerByRef = new Map();
  for (const entry of contract.closed_gazetteer) {
    const requiredKeys = [
      'repd_ref',
      'gg_project_id',
      'name',
      'aliases',
      'technology',
      'official_capacity_mw',
      'operator',
      'county',
      'country',
      'planning_reference',
      'catalogue_eligible',
    ];
    const allowedKeys = entry.relationship_only === undefined ? requiredKeys : [...requiredKeys, 'relationship_only'];
    assertExactKeys(entry, allowedKeys, 'CONTRACT_GAZETTEER_ENTRY_INVALID');
    if (gazetteerByRef.has(entry.repd_ref) || !Array.isArray(entry.aliases) || !entry.aliases.length) fail('CONTRACT_GAZETTEER_ENTRY_INVALID');
    if (entry.gg_project_id !== `GG2050-REPD-${entry.repd_ref}`) fail('CONTRACT_GAZETTEER_ID_INVALID');
    gazetteerByRef.set(entry.repd_ref, entry);
  }
  if (!sameJson([...gazetteerByRef.keys()], ['17494', '20670', '13599', '13600'])) fail('CONTRACT_GAZETTEER_SET_INVALID');
  if (
    gazetteerByRef.get('17494').official_capacity_mw !== 500
    || gazetteerByRef.get('20670').official_capacity_mw !== null
    || gazetteerByRef.get('13599').official_capacity_mw !== 400
    || gazetteerByRef.get('13600').official_capacity_mw !== 600
  ) fail('CONTRACT_GAZETTEER_CAPACITY_INVALID');
  if (!Array.isArray(contract.excluded_primary_subjects) || contract.excluded_primary_subjects.length !== 1) fail('CONTRACT_EXCLUDED_SUBJECTS_INVALID');
  assertExactKeys(contract.excluded_primary_subjects[0], ['name', 'operator', 'reason'], 'CONTRACT_EXCLUDED_SUBJECT_INVALID');

  const primaryGazetteer = contract.closed_gazetteer
    .filter((entry) => entry.catalogue_eligible === true && entry.relationship_only !== true && entry.technology !== 'bess')
    .map((entry) => ({
      repd_ref: entry.repd_ref,
      gg_project_id: entry.gg_project_id,
      name: entry.name,
      technology: entry.technology,
      official_capacity_mw: entry.official_capacity_mw,
      operator: entry.operator,
      county: entry.county,
      country: entry.country,
      planning_reference: entry.planning_reference,
      aliases: [...entry.aliases],
    }));
  return validateCanonicalContract({
    schema: CANONICAL_CONTRACT_SCHEMA,
    generation: contract.generation,
    deployment_status: contract.deployment,
    limits: {
      selected_projects: contract.acquisition.maximum_selected_projects,
      queries_per_project: contract.acquisition.queries_per_project,
      queries_per_run: contract.acquisition.maximum_queries_per_run,
      results_per_query: contract.acquisition.maximum_results_per_query,
      request_timeout_ms: contract.acquisition.request_timeout_ms,
      response_bytes: contract.acquisition.maximum_response_bytes,
      snippet_chars: contract.acquisition.maximum_retained_snippet_characters,
      bbc_link_depth: contract.bbc_enrichment.maximum_link_depth,
      solar_minimum_mw: contract.eligibility.solar_minimum_capacity_mw,
      bess_minimum_mw: contract.eligibility.bess_minimum_capacity_mw,
      wind_included: false,
    },
    related_context_label: RELATED_CONTEXT_LABEL,
    gazetteer: primaryGazetteer,
    articles: APPROVED_ARTICLES.map((article) => ({ ...article, related_components: article.related_components.map((item) => ({ ...item })) })),
    excluded_primary_subjects: contract.excluded_primary_subjects.map((subject) => ({
      name: subject.name,
      operator: subject.operator,
      reason: subject.reason.toUpperCase().replaceAll('-', '_'),
    })),
    foreign_conflict_terms: [...DEFAULT_FOREIGN_CONFLICT_TERMS],
  });
}

export function normaliseDiscoveryContract(contract) {
  return productionContractToCanonical(contract);
}

function validateContract(contract) {
  if (contract?.schema === CANONICAL_CONTRACT_SCHEMA) return validateCanonicalContract(contract);
  return productionContractToCanonical(contract);
}

function validateRelatedComponent(component, expected, primaryProject, projectByRef, recordIndex) {
  assertExactKeys(component, [
    'role',
    'repd_ref',
    'gg_project_id',
    'technology',
    'official_capacity_mw',
    'eligible_for_news_signal',
  ], `EVIDENCE_${recordIndex}_RELATED_COMPONENT_KEYS_INVALID`);
  if (!sameJson(component, expected)) fail(`EVIDENCE_${recordIndex}_RELATED_COMPONENT_MISMATCH`);
  if (component.role !== 'RELATED_DEVELOPMENT' || component.eligible_for_news_signal !== false) {
    fail(`EVIDENCE_${recordIndex}_RELATED_COMPONENT_ROLE_INVALID`);
  }
  const relatedRefs = new Set([
    ...(primaryProject?.direct_related_repd_refs ?? []),
    ...(primaryProject?.development_repd_refs ?? []),
    ...(primaryProject?.planning_sibling_repd_refs ?? []),
  ].map(String));
  if (!relatedRefs.has(component.repd_ref)) fail(`EVIDENCE_${recordIndex}_RELATED_COMPONENT_NOT_LINKED`);

  const relatedProject = getProject(projectByRef, component.repd_ref);
  if (component.repd_ref === '20670') {
    if (component.official_capacity_mw !== null) fail('EAST_PYE_BESS_CAPACITY_MUST_REMAIN_UNKNOWN');
    if (relatedProject?.capacity_known || Number.isFinite(relatedProject?.capacity_mw)) {
      fail('EAST_PYE_BESS_CAPACITY_MUST_REMAIN_UNKNOWN');
    }
    return;
  }
  if (!relatedProject) fail(`EVIDENCE_${recordIndex}_RELATED_PROJECT_MISSING`);
  if (
    relatedProject.repd_ref !== component.repd_ref
    || relatedProject.gg_project_id !== component.gg_project_id
    || relatedProject.technology !== component.technology
    || relatedProject.capacity_mw !== component.official_capacity_mw
  ) {
    fail(`EVIDENCE_${recordIndex}_RELATED_PROJECT_MISMATCH`);
  }
}

function validateEvidenceRecord(record, expected, contract, projectByRef, index) {
  assertExactKeys(record, [
    'article_id',
    'url',
    'headline',
    'published_at',
    'source',
    'confidence',
    'evidence',
    'binding',
  ], `EVIDENCE_${index}_RECORD_KEYS_INVALID`);
  if (record.article_id !== expected.article_id) fail(`EVIDENCE_${index}_ARTICLE_ID_MISMATCH`);
  if (validateBbcArticleUrl(record.url) !== expected.url) fail(`EVIDENCE_${index}_URL_MISMATCH`);
  if (record.headline !== expected.headline) fail(`EVIDENCE_${index}_HEADLINE_MISMATCH`);
  assertIsoDate(record.published_at, `EVIDENCE_${index}_PUBLISHED_AT_INVALID`);
  if (record.source !== 'BBC News') fail(`EVIDENCE_${index}_SOURCE_INVALID`);
  if (record.confidence !== expected.confidence || record.confidence !== 100) fail(`EVIDENCE_${index}_CONFIDENCE_INVALID`);

  assertExactKeys(record.evidence, [
    'enrichment_url',
    'exact_project_mentions',
    'internal_article_urls',
    'snippets',
  ], `EVIDENCE_${index}_EVIDENCE_KEYS_INVALID`);
  if (validateBbcArticleUrl(record.evidence.enrichment_url) !== record.url) {
    fail(`EVIDENCE_${index}_ENRICHMENT_URL_INVALID`);
  }
  if (!Array.isArray(record.evidence.exact_project_mentions) || !record.evidence.exact_project_mentions.length) {
    fail(`EVIDENCE_${index}_MENTIONS_INVALID`);
  }
  for (const mention of record.evidence.exact_project_mentions) {
    assertString(mention, `EVIDENCE_${index}_MENTION_INVALID`, { maximum: 120 });
  }
  if (!Array.isArray(record.evidence.internal_article_urls) || record.evidence.internal_article_urls.length > 10) {
    fail(`EVIDENCE_${index}_INTERNAL_URLS_INVALID`);
  }
  for (const url of record.evidence.internal_article_urls) validateBbcArticleUrl(url);
  if (!Array.isArray(record.evidence.snippets) || !record.evidence.snippets.length) {
    fail(`EVIDENCE_${index}_SNIPPETS_INVALID`);
  }
  for (const snippet of record.evidence.snippets) {
    assertString(snippet, `EVIDENCE_${index}_SNIPPET_INVALID`, { maximum: LIMITS.snippet_chars });
    if (Array.from(snippet).length > LIMITS.snippet_chars || /<\/?(?:html|body|script)\b/i.test(snippet)) {
      fail(`EVIDENCE_${index}_SNIPPET_UNBOUNDED`);
    }
  }

  assertExactKeys(record.binding, [
    'role',
    'relationship',
    'repd_ref',
    'gg_project_id',
    'project_name',
    'technology',
    'official_capacity_mw',
    'operator',
    'county',
    'country',
    'planning_reference',
    'event',
    'event_detail',
    'eligible_for_news_signal',
    'related_context_repd_ref',
    'related_context_label',
    'related_components',
  ], `EVIDENCE_${index}_BINDING_KEYS_INVALID`);
  const binding = record.binding;
  const contractFields = [
    'role',
    'relationship',
    'repd_ref',
    'gg_project_id',
    'event',
    'event_detail',
    'eligible_for_news_signal',
    'related_context_repd_ref',
    'related_components',
  ];
  for (const field of contractFields) {
    if (!sameJson(binding[field], expected[field])) fail(`EVIDENCE_${index}_${field.toUpperCase()}_MISMATCH`);
  }
  if (binding.event === 'FINANCIAL CLOSE') fail(`EVIDENCE_${index}_FINANCIAL_CLOSE_FORBIDDEN`);
  if (binding.role === 'PRIMARY_MATCH') {
    if (!binding.eligible_for_news_signal || binding.relationship !== null || binding.related_context_repd_ref !== null) {
      fail(`EVIDENCE_${index}_PRIMARY_SEMANTICS_INVALID`);
    }
    if (binding.related_context_label !== null) fail(`EVIDENCE_${index}_PRIMARY_LABEL_INVALID`);
    const contractProject = contract.gazetteer.find((entry) => entry.repd_ref === binding.repd_ref);
    if (!contractProject) fail(`EVIDENCE_${index}_PRIMARY_NOT_IN_CLOSED_GAZETTEER`);
    const project = getProject(projectByRef, binding.repd_ref);
    assertExactProject(project, contractProject, `EVIDENCE_${index}_PRIMARY`);
    const bindingFields = [
      ['project_name', contractProject.name],
      ['technology', contractProject.technology],
      ['official_capacity_mw', contractProject.official_capacity_mw],
      ['operator', contractProject.operator],
      ['county', contractProject.county],
      ['country', contractProject.country],
      ['planning_reference', contractProject.planning_reference],
    ];
    for (const [field, value] of bindingFields) {
      if (binding[field] !== value) fail(`EVIDENCE_${index}_${field.toUpperCase()}_MISMATCH`);
    }
    if (!record.evidence.exact_project_mentions.some((mention) => contractProject.aliases.includes(mention))) {
      fail(`EVIDENCE_${index}_PRIMARY_MENTION_MISSING`);
    }
    if (binding.related_components.length !== expected.related_components.length) {
      fail(`EVIDENCE_${index}_RELATED_COMPONENT_COUNT_MISMATCH`);
    }
    binding.related_components.forEach((component, componentIndex) => {
      validateRelatedComponent(component, expected.related_components[componentIndex], project, projectByRef, index);
    });
    return;
  }

  if (
    binding.role !== 'RELATED_MENTION'
    || binding.relationship !== 'EDITORIAL_CONTEXT'
    || binding.repd_ref !== null
    || binding.gg_project_id !== null
    || binding.official_capacity_mw !== null
    || binding.planning_reference !== null
    || binding.eligible_for_news_signal !== false
    || binding.related_context_label !== contract.related_context_label
    || binding.related_components.length !== 0
  ) {
    fail(`EVIDENCE_${index}_RELATED_CONTEXT_SEMANTICS_INVALID`);
  }
  if (binding.project_name !== 'Windsock Solar Farm' || binding.operator !== 'BLC Energy') {
    fail(`EVIDENCE_${index}_WINDSOCK_SUBJECT_INVALID`);
  }
  const contextProject = getProject(projectByRef, binding.related_context_repd_ref);
  if (!contextProject || contextProject.repd_ref !== '13599') fail(`EVIDENCE_${index}_RELATED_CONTEXT_PROJECT_MISSING`);
  if (!record.evidence.exact_project_mentions.includes('Beacon Fen Energy Park')) {
    fail(`EVIDENCE_${index}_RELATED_CONTEXT_MENTION_MISSING`);
  }
  if (projectValues(projectByRef).some((project) => project?.name === 'Windsock Solar Farm')) {
    fail(`EVIDENCE_${index}_WINDSOCK_MUST_NOT_BE_REPD_BOUND`);
  }
}

function normaliseProductionEvidence(evidence) {
  assertExactKeys(evidence, [
    'schema',
    'generation',
    'name',
    'decision_recorded_at',
    'publisher',
    'retention',
    'records',
  ], 'EVIDENCE_ROOT_KEYS_INVALID');
  if (evidence.schema !== EVIDENCE_SCHEMA) fail('EVIDENCE_SCHEMA_INVALID');
  if (evidence.generation !== GENERATION || evidence.name !== 'Live News Discovery') fail('EVIDENCE_GENERATION_INVALID');
  if (evidence.publisher !== 'BBC News') fail('EVIDENCE_PUBLISHER_INVALID');
  if (Number.isNaN(Date.parse(evidence.decision_recorded_at))) fail('EVIDENCE_DECISION_DATE_INVALID');
  assertExactKeys(evidence.retention, ['raw_html', 'article_bodies', 'maximum_snippet_characters'], 'EVIDENCE_RETENTION_INVALID');
  if (
    evidence.retention.raw_html !== false
    || evidence.retention.article_bodies !== false
    || evidence.retention.maximum_snippet_characters !== LIMITS.snippet_chars
  ) fail('EVIDENCE_RETENTION_INVALID');
  if (!Array.isArray(evidence.records) || evidence.records.length !== 3) fail('EVIDENCE_RECORD_COUNT_INVALID');

  const canonicalRecords = evidence.records.map((record, index) => {
    assertExactKeys(record, [
      'gg_article_id',
      'url',
      'headline',
      'published_at',
      'source',
      'compact_metadata',
      'exact_project_mentions',
      'internal_article_urls',
      'bounded_evidence_snippets',
      'binding',
    ], `EVIDENCE_${index}_RECORD_KEYS_INVALID`);
    assertString(record.gg_article_id, `EVIDENCE_${index}_ARTICLE_ID_INVALID`, { maximum: 64 });
    validateBbcArticleUrl(record.url);
    assertString(record.headline, `EVIDENCE_${index}_HEADLINE_INVALID`, { maximum: 300 });
    assertIsoDate(record.published_at, `EVIDENCE_${index}_PUBLISHED_AT_INVALID`);
    if (record.source !== 'BBC News') fail(`EVIDENCE_${index}_SOURCE_INVALID`);

    const related = record.binding?.role === 'RELATED_MENTION';
    const metadataKeys = related
      ? ['country', 'county', 'technology', 'primary_subject', 'primary_operator']
      : ['country', 'county', 'technology'];
    assertExactKeys(record.compact_metadata, metadataKeys, `EVIDENCE_${index}_COMPACT_METADATA_INVALID`);
    for (const key of metadataKeys) assertString(record.compact_metadata[key], `EVIDENCE_${index}_COMPACT_METADATA_INVALID`, { maximum: 120 });
    if (!Array.isArray(record.exact_project_mentions) || !record.exact_project_mentions.length) {
      fail(`EVIDENCE_${index}_MENTIONS_INVALID`);
    }
    for (const mention of record.exact_project_mentions) {
      assertExactKeys(mention, ['text', 'canonical_name', 'paragraph_index'], `EVIDENCE_${index}_MENTION_INVALID`);
      assertString(mention.text, `EVIDENCE_${index}_MENTION_INVALID`, { maximum: 120 });
      assertNullableString(mention.canonical_name, `EVIDENCE_${index}_MENTION_INVALID`, 120);
      if (!Number.isInteger(mention.paragraph_index) || mention.paragraph_index < 0) fail(`EVIDENCE_${index}_MENTION_INVALID`);
    }
    if (!Array.isArray(record.internal_article_urls) || record.internal_article_urls.length > 10) {
      fail(`EVIDENCE_${index}_INTERNAL_URLS_INVALID`);
    }
    for (const url of record.internal_article_urls) validateBbcArticleUrl(url);
    if (!Array.isArray(record.bounded_evidence_snippets) || !record.bounded_evidence_snippets.length) {
      fail(`EVIDENCE_${index}_SNIPPETS_INVALID`);
    }
    for (const snippet of record.bounded_evidence_snippets) {
      assertString(snippet, `EVIDENCE_${index}_SNIPPET_INVALID`, { maximum: LIMITS.snippet_chars });
      if (Array.from(snippet).length > LIMITS.snippet_chars || /<\/?(?:html|body|script)\b/i.test(snippet)) {
        fail(`EVIDENCE_${index}_SNIPPET_UNBOUNDED`);
      }
    }

    const primaryBindingKeys = [
      'role',
      'repd_ref',
      'gg_project_id',
      'project',
      'technology',
      'official_capacity_mw',
      'operator',
      'county',
      'country',
      'planning_reference',
      'event',
      'event_detail',
      'confidence',
      'canonical_relevant',
      'eligible_for_news_signal',
      'related_components',
    ];
    const relatedBindingKeys = [
      'role',
      'relationship',
      'repd_ref',
      'gg_project_id',
      'project',
      'technology',
      'official_capacity_mw',
      'operator',
      'county',
      'country',
      'planning_reference',
      'event',
      'event_detail',
      'confidence',
      'canonical_relevant',
      'eligible_for_news_signal',
      'related_context_repd_ref',
      'related_context_project',
      'binding_label',
      'related_components',
    ];
    assertExactKeys(record.binding, related ? relatedBindingKeys : primaryBindingKeys, `EVIDENCE_${index}_BINDING_KEYS_INVALID`);
    if (!Array.isArray(record.binding.related_components)) fail(`EVIDENCE_${index}_RELATED_COMPONENTS_INVALID`);
    if (record.binding.confidence !== 100) fail(`EVIDENCE_${index}_CONFIDENCE_INVALID`);
    if (record.binding.canonical_relevant !== !related) fail(`EVIDENCE_${index}_CANONICAL_FLAG_INVALID`);
    if (related && record.binding.related_context_project !== 'Beacon Fen Energy Park') {
      fail(`EVIDENCE_${index}_RELATED_CONTEXT_PROJECT_INVALID`);
    }
    for (const component of record.binding.related_components) {
      assertExactKeys(component, [
        'role',
        'repd_ref',
        'gg_project_id',
        'project',
        'technology',
        'official_capacity_mw',
        'eligible_for_news_signal',
      ], `EVIDENCE_${index}_RELATED_COMPONENT_KEYS_INVALID`);
      if (component.project !== record.binding.project) fail(`EVIDENCE_${index}_RELATED_COMPONENT_PROJECT_INVALID`);
    }

    return {
      article_id: record.gg_article_id,
      url: record.url,
      headline: record.headline,
      published_at: record.published_at,
      source: record.source,
      confidence: record.binding.confidence,
      evidence: {
        enrichment_url: record.url,
        exact_project_mentions: record.exact_project_mentions.map((mention) => mention.canonical_name ?? mention.text),
        internal_article_urls: [...record.internal_article_urls],
        snippets: [...record.bounded_evidence_snippets],
      },
      binding: {
        role: record.binding.role,
        relationship: record.binding.relationship ?? null,
        repd_ref: record.binding.repd_ref || null,
        gg_project_id: record.binding.gg_project_id || null,
        project_name: record.binding.project,
        technology: record.binding.technology,
        official_capacity_mw: record.binding.official_capacity_mw,
        operator: record.binding.operator,
        county: record.binding.county,
        country: record.binding.country,
        planning_reference: record.binding.planning_reference || null,
        event: record.binding.event,
        event_detail: record.binding.event_detail || null,
        eligible_for_news_signal: record.binding.eligible_for_news_signal,
        related_context_repd_ref: record.binding.related_context_repd_ref ?? null,
        related_context_label: record.binding.binding_label ?? null,
        related_components: record.binding.related_components.map((component) => ({
          role: component.role,
          repd_ref: component.repd_ref,
          gg_project_id: component.gg_project_id,
          technology: component.technology,
          official_capacity_mw: component.official_capacity_mw,
          eligible_for_news_signal: component.eligible_for_news_signal,
        })),
      },
    };
  });
  return {
    schema: EVIDENCE_SCHEMA,
    generation: evidence.generation,
    created_at: new Date(evidence.decision_recorded_at).toISOString(),
    limits: {
      request_timeout_ms: LIMITS.request_timeout_ms,
      response_bytes: LIMITS.response_bytes,
      snippet_chars: evidence.retention.maximum_snippet_characters,
      bbc_link_depth: LIMITS.bbc_link_depth,
    },
    records: canonicalRecords,
  };
}

export function validateApprovedEvidence({ evidence, contract, projectByRef }) {
  const canonicalContract = validateContract(contract);
  const canonicalEvidence = normaliseProductionEvidence(evidence);
  assertExactKeys(canonicalEvidence, ['schema', 'generation', 'created_at', 'limits', 'records'], 'EVIDENCE_ROOT_KEYS_INVALID');
  if (canonicalEvidence.schema !== EVIDENCE_SCHEMA) fail('EVIDENCE_SCHEMA_INVALID');
  if (canonicalEvidence.generation !== GENERATION) fail('EVIDENCE_GENERATION_INVALID');
  assertIsoDate(canonicalEvidence.created_at, 'EVIDENCE_CREATED_AT_INVALID');
  assertExactKeys(canonicalEvidence.limits, ['request_timeout_ms', 'response_bytes', 'snippet_chars', 'bbc_link_depth'], 'EVIDENCE_LIMIT_KEYS_INVALID');
  for (const key of Object.keys(canonicalEvidence.limits)) {
    if (canonicalEvidence.limits[key] !== LIMITS[key]) fail(`EVIDENCE_LIMIT_${key.toUpperCase()}_INVALID`);
  }
  if (!Array.isArray(canonicalEvidence.records) || canonicalEvidence.records.length !== 3) fail('EVIDENCE_RECORD_COUNT_INVALID');
  const expectedById = new Map(canonicalContract.articles.map((article) => [article.article_id, article]));
  const seen = new Set();
  canonicalEvidence.records.forEach((record, index) => {
    const expected = expectedById.get(record?.article_id);
    if (!expected || seen.has(record.article_id)) fail(`EVIDENCE_${index}_ARTICLE_SET_INVALID`);
    seen.add(record.article_id);
    validateEvidenceRecord(record, expected, canonicalContract, projectByRef, index);
  });
  if (seen.size !== expectedById.size) fail('EVIDENCE_ARTICLE_SET_INVALID');
  const primaryMatches = canonicalEvidence.records.filter((record) => record.binding.role === 'PRIMARY_MATCH').length;
  const relatedMentions = canonicalEvidence.records.filter((record) => record.binding.role === 'RELATED_MENTION').length;
  if (primaryMatches !== 2 || relatedMentions !== 1) fail('EVIDENCE_DECISION_COUNTS_INVALID');
  return Object.freeze({
    valid: true,
    generation: GENERATION,
    records: 3,
    primary_matches: primaryMatches,
    related_mentions: relatedMentions,
    eligible_for_news_signal: 2,
    deployment_status: canonicalContract.deployment_status,
  });
}

export function approvedEvidenceToNewsItems({ evidence, contract, projectByRef }) {
  validateApprovedEvidence({ evidence, contract, projectByRef });
  const canonicalEvidence = normaliseProductionEvidence(evidence);
  return canonicalEvidence.records.map((record) => {
    const binding = record.binding;
    return Object.freeze({
      gg_article_id: record.article_id,
      repd_ref: binding.repd_ref,
      gg_project_id: binding.gg_project_id,
      project_name: binding.project_name,
      technology: binding.technology,
      capacity_mw: binding.official_capacity_mw,
      operator: binding.operator,
      county: binding.county,
      country: binding.country,
      event: binding.event,
      event_detail: binding.event_detail,
      headline: record.headline,
      published_at: record.published_at,
      source: record.source,
      url: record.url,
      confidence: record.confidence,
      canonical_relevant: binding.role === 'PRIMARY_MATCH' && binding.eligible_for_news_signal,
      role: binding.role,
      relationship: binding.relationship,
      related_context_repd_ref: binding.related_context_repd_ref,
      related_context_label: binding.related_context_label,
      eligible_for_news_signal: binding.eligible_for_news_signal,
      related_components: binding.related_components.map((component) => Object.freeze({ ...component })),
      exact_project_mentions: [...record.evidence.exact_project_mentions],
      internal_article_urls: [...record.evidence.internal_article_urls],
      evidence_snippets: [...record.evidence.snippets],
    });
  });
}

export const compileApprovedBbcRecords = approvedEvidenceToNewsItems;

export function selectEligibleProjects(projects) {
  if (!Array.isArray(projects)) fail('COLLECTOR_PROJECTS_INVALID');
  return projects
    .filter((project) => {
      const technology = String(project?.technology ?? '').toLowerCase();
      const capacity = Number(project?.capacity_mw);
      if (!Number.isFinite(capacity)) return false;
      if (technology === 'solar') return capacity >= LIMITS.solar_minimum_mw;
      if (technology === 'bess') return capacity >= LIMITS.bess_minimum_mw;
      return false;
    })
    .sort((left, right) => (
      Number(right.capacity_mw) - Number(left.capacity_mw)
      || String(left.repd_ref).localeCompare(String(right.repd_ref), 'en', { numeric: true })
    ))
    .slice(0, LIMITS.selected_projects);
}

function quoteQueryTerm(value) {
  return `"${compactText(value).replace(/["\r\n]/g, ' ')}"`;
}

export function buildBoundedQueryPlan(projects) {
  const selected = selectEligibleProjects(projects);
  const queries = [];
  for (const project of selected) {
    const technologyTerms = project.technology === 'bess' ? 'battery storage' : 'solar';
    queries.push({
      repd_ref: String(project.repd_ref),
      query_index: 0,
      query: `${quoteQueryTerm(project.name)} ${quoteQueryTerm(project.county)} ${technologyTerms}`,
    });
    queries.push({
      repd_ref: String(project.repd_ref),
      query_index: 1,
      query: `${quoteQueryTerm(project.name)} ${quoteQueryTerm(project.operator)} planning`,
    });
  }
  if (queries.length > LIMITS.queries_per_run) fail('COLLECTOR_QUERY_LIMIT_EXCEEDED');
  return Object.freeze({ selected_projects: selected, queries });
}

function decodeXml(value) {
  return compactText(String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&'));
}

function xmlTag(item, name) {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(item);
  return match ? decodeXml(match[1]) : '';
}

export function parseBingNewsRss(xml) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml, 'utf8') > LIMITS.response_bytes) fail('BING_RSS_INVALID');
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, LIMITS.results_per_query).map((item) => ({
    title: xmlTag(item, 'title'),
    url: xmlTag(item, 'link'),
    snippet: truncateSnippet(xmlTag(item, 'description')),
    published_at: xmlTag(item, 'pubDate') || null,
    source: xmlTag(item, 'News:Source') || xmlTag(item, 'source') || null,
  })).filter((item) => item.title && item.url);
}

async function readBoundedText(response) {
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > LIMITS.response_bytes) fail('PROVIDER_RESPONSE_TOO_LARGE');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > LIMITS.response_bytes) fail('PROVIDER_RESPONSE_TOO_LARGE');
  return new TextDecoder().decode(bytes);
}

async function providerRequest(url, init, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIMITS.request_timeout_ms);
  try {
    const response = await fetchImpl(url, { ...init, redirect: 'error', signal: controller.signal });
    if (!response || response.status !== 200 || response.redirected) fail('PROVIDER_RESPONSE_NOT_OK');
    return await readBoundedText(response);
  } catch (error) {
    if (error instanceof LiveNewsDiscoveryError) throw error;
    fail(controller.signal.aborted ? 'PROVIDER_REQUEST_TIMEOUT' : 'PROVIDER_REQUEST_FAILED');
  } finally {
    clearTimeout(timeout);
  }
}

function secretValue(secretEnv, key) {
  const value = secretEnv?.[key];
  return typeof value === 'string' && value ? value : null;
}

function compactProviderItem(item) {
  return {
    title: compactText(item.title),
    url: compactText(item.url ?? item.link),
    snippet: truncateSnippet(item.snippet ?? item.description),
    published_at: compactText(item.published_at ?? item.age ?? item.date) || null,
    source: compactText(item.source ?? item.profile?.long_name) || null,
  };
}

export async function searchNewsProvider(query, options = {}) {
  assertString(query, 'PROVIDER_QUERY_INVALID', { maximum: 500 });
  const provider = options.provider ?? 'bing';
  const fetchImpl = options.fetch_impl ?? globalThis.fetch;
  const secretEnv = options.secret_env ?? process.env;
  if (typeof fetchImpl !== 'function') fail('PROVIDER_FETCH_UNAVAILABLE');
  let payload;
  let parsed;
  if (provider === 'bing') {
    const url = new URL('https://www.bing.com/news/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'rss');
    payload = await providerRequest(url, { headers: { accept: 'application/rss+xml,application/xml;q=0.9' } }, fetchImpl);
    return parseBingNewsRss(payload);
  }
  if (provider === 'brave') {
    const key = secretValue(secretEnv, 'BRAVE_SEARCH_API_KEY');
    if (!key) fail('BRAVE_SECRET_NOT_CONFIGURED');
    const url = new URL('https://api.search.brave.com/res/v1/news/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(LIMITS.results_per_query));
    payload = await providerRequest(url, { headers: { accept: 'application/json', 'x-subscription-token': key } }, fetchImpl);
    try { parsed = JSON.parse(payload); } catch { fail('BRAVE_RESPONSE_INVALID'); }
    return (parsed.results ?? []).slice(0, LIMITS.results_per_query).map(compactProviderItem).filter((item) => item.title && item.url);
  }
  if (provider === 'google_cse') {
    const key = secretValue(secretEnv, 'GOOGLE_CSE_API_KEY');
    const cx = secretValue(secretEnv, 'GOOGLE_CSE_ID');
    if (!key || !cx) fail('GOOGLE_CSE_SECRET_NOT_CONFIGURED');
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', key);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(LIMITS.results_per_query));
    payload = await providerRequest(url, { headers: { accept: 'application/json' } }, fetchImpl);
    try { parsed = JSON.parse(payload); } catch { fail('GOOGLE_CSE_RESPONSE_INVALID'); }
    return (parsed.items ?? []).slice(0, LIMITS.results_per_query).map((item) => compactProviderItem({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: item.displayLink,
    })).filter((item) => item.title && item.url);
  }
  if (provider === 'serper') {
    const key = secretValue(secretEnv, 'SERPER_API_KEY');
    if (!key) fail('SERPER_SECRET_NOT_CONFIGURED');
    payload = await providerRequest('https://google.serper.dev/news', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ q: query, num: LIMITS.results_per_query }),
    }, fetchImpl);
    try { parsed = JSON.parse(payload); } catch { fail('SERPER_RESPONSE_INVALID'); }
    return (parsed.news ?? []).slice(0, LIMITS.results_per_query).map(compactProviderItem).filter((item) => item.title && item.url);
  }
  fail('PROVIDER_NOT_APPROVED');
}

export function configuredOptionalProviders(secretEnv = process.env) {
  const providers = [];
  if (secretValue(secretEnv, 'BRAVE_SEARCH_API_KEY')) providers.push('brave');
  if (secretValue(secretEnv, 'GOOGLE_CSE_API_KEY') && secretValue(secretEnv, 'GOOGLE_CSE_ID')) providers.push('google_cse');
  if (secretValue(secretEnv, 'SERPER_API_KEY')) providers.push('serper');
  return providers;
}

export function classifySearchResult(result, contract) {
  const canonicalContract = validateContract(contract);
  assertExactKeys(result, ['title', 'url', 'snippet', 'published_at', 'source'], 'SEARCH_RESULT_KEYS_INVALID');
  const returnedEvidence = compactText([result.title, result.snippet, result.source].join(' '));
  if (/\bwind\s*(?:farm|turbine|energy|power)?\b/i.test(returnedEvidence)) {
    return Object.freeze({ outcome: 'REJECT', reason: 'WIND_EXCLUDED', repd_ref: null });
  }
  if (canonicalContract.foreign_conflict_terms.some((term) => containsPhrase(returnedEvidence, term))) {
    return Object.freeze({ outcome: 'REJECT', reason: 'FOREIGN_CONFLICT', repd_ref: null });
  }
  const matches = canonicalContract.gazetteer.filter((entry) => entry.aliases.some((alias) => containsPhrase(returnedEvidence, alias)));
  const titleMatches = matches.filter((entry) => entry.aliases.some((alias) => containsPhrase(result.title, alias)));
  if (titleMatches.length === 1 && matches.length === 1) {
    return Object.freeze({ outcome: 'PRIMARY_MATCH', reason: 'RETURNED_SEARCH_EVIDENCE', repd_ref: titleMatches[0].repd_ref });
  }
  return Object.freeze({
    outcome: 'ABSTAIN',
    reason: matches.length > 1 ? 'AMBIGUOUS_IDENTITY' : matches.length === 1 ? 'SNIPPET_CONTEXT_ONLY' : 'NO_CLOSED_GAZETTEER_MATCH',
    repd_ref: null,
  });
}

export async function collectLiveNews({
  projects,
  contract,
  provider = 'bing',
  fetch_impl = globalThis.fetch,
  secret_env = process.env,
} = {}) {
  const canonicalContract = validateContract(contract);
  const plan = buildBoundedQueryPlan(projects);
  const candidates = [];
  const outcomes = { PRIMARY_MATCH: 0, RELATED_MENTION: 0, ABSTAIN: 0, REJECT: 0 };
  let completedQueries = 0;
  let failedQueries = 0;
  let bbcRoots = 0;
  let bbcArticles = 0;
  const enrichedUrls = new Set();

  for (const query of plan.queries) {
    let results;
    try {
      results = await searchNewsProvider(query.query, { provider, fetch_impl, secret_env });
      completedQueries += 1;
    } catch {
      failedQueries += 1;
      continue;
    }
    for (const result of results.slice(0, LIMITS.results_per_query)) {
      const searchDecision = classifySearchResult(result, canonicalContract);
      outcomes[searchDecision.outcome] += 1;
      candidates.push(Object.freeze({
        source_stage: 'SEARCH_RESULT',
        provider,
        query_context: { repd_ref: query.repd_ref, query_index: query.query_index },
        returned_evidence: result,
        decision: searchDecision,
      }));

      let exactBbcUrl;
      try { exactBbcUrl = validateBbcArticleUrl(result.url); } catch { continue; }
      if (enrichedUrls.has(exactBbcUrl) || bbcRoots >= LIMITS.bbc_enrichment_roots_per_run) continue;
      enrichedUrls.add(exactBbcUrl);
      bbcRoots += 1;
      try {
        const enriched = await enrichBbcArticle(exactBbcUrl, {
          fetch_impl,
          max_link_depth: LIMITS.bbc_link_depth,
          gazetteer: canonicalContract.gazetteer,
          subject_names: canonicalContract.excluded_primary_subjects.map((subject) => subject.name),
        });
        for (const article of [enriched.root, ...enriched.linked_articles]) {
          bbcArticles += 1;
          const decision = classifyEnrichedBbcArticle(article, canonicalContract);
          outcomes[decision.outcome] += 1;
          candidates.push(Object.freeze({
            source_stage: 'BBC_ENRICHMENT',
            provider,
            query_context: { repd_ref: query.repd_ref, query_index: query.query_index },
            returned_evidence: article,
            decision,
          }));
        }
      } catch {
        // Fail closed. Search evidence remains in the ledger with its own decision.
      }
    }
  }

  return Object.freeze({
    schema: 'pipelinenews.live-news-discovery-run.v1',
    generation: GENERATION,
    deployment_status: 'not-authorised',
    candidates,
    health: Object.freeze({
      provider,
      selected_projects: plan.selected_projects.length,
      queries_planned: plan.queries.length,
      queries_completed: completedQueries,
      queries_failed: failedQueries,
      search_results_retained: candidates.filter((candidate) => candidate.source_stage === 'SEARCH_RESULT').length,
      bbc_enrichment_roots: bbcRoots,
      bbc_articles_enriched: bbcArticles,
      decisions: outcomes,
      secrets_retained: false,
      raw_html_retained: false,
      article_bodies_retained: false,
      limits: {
        ...LIMITS,
        max_internal_article_links: BBC_ENRICHMENT_LIMITS.max_internal_article_links,
      },
    }),
  });
}

function cliArguments(argv) {
  const allowed = new Set(['--collect', '--provider', '--health-out', '--ledger-out']);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!allowed.has(name) || values.has(name)) fail('CLI_ARGUMENT_INVALID');
    if (name === '--collect') {
      values.set(name, true);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail('CLI_ARGUMENT_INVALID');
    values.set(name, value);
    index += 1;
  }
  for (const name of allowed) {
    if (!values.has(name)) fail('CLI_ARGUMENT_MISSING');
  }
  const providerAliases = { bing: 'bing', brave: 'brave', google: 'google_cse', google_cse: 'google_cse', serper: 'serper' };
  const provider = providerAliases[values.get('--provider')];
  if (!provider) fail('PROVIDER_NOT_APPROVED');
  return Object.freeze({
    provider,
    health_out: values.get('--health-out'),
    ledger_out: values.get('--ledger-out'),
  });
}

function resolveOutput(root, requested) {
  if (typeof requested !== 'string' || !requested || requested.includes('\\')) fail('CLI_OUTPUT_PATH_INVALID');
  const resolved = path.resolve(root, requested);
  if (!resolved.startsWith(`${root}${path.sep}`)) fail('CLI_OUTPUT_PATH_INVALID');
  return resolved;
}

async function loadCollectorInputs(root) {
  const contract = JSON.parse(await readFile(path.join(
    root,
    'data/news-discovery/202608270844-live-news-discovery-contract.json',
  ), 'utf8'));
  const projectDirectory = path.join(root, 'data/projects');
  const filenames = (await readdir(projectDirectory))
    .filter((name) => /^202608261927-project-partition-v9-1-\d+\.json$/u.test(name))
    .sort();
  if (filenames.length !== 16) fail('COLLECTOR_PROJECT_PARTITIONS_INVALID');
  const projects = [];
  for (const filename of filenames) {
    const partition = JSON.parse(await readFile(path.join(projectDirectory, filename), 'utf8'));
    if (!Array.isArray(partition.projects)) fail('COLLECTOR_PROJECT_PARTITIONS_INVALID');
    projects.push(...partition.projects);
  }
  if (projects.length !== 7_680) fail('COLLECTOR_PROJECT_COUNT_INVALID');
  return { contract, projects };
}

async function writeCliJson(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

async function cliMain() {
  const arguments_ = cliArguments(process.argv.slice(2));
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { contract, projects } = await loadCollectorInputs(repositoryRoot);
  const run = await collectLiveNews({
    projects,
    contract,
    provider: arguments_.provider,
  });
  const health = {
    schema: 'pipelinenews.live-news-discovery-health.v1',
    generation: run.generation,
    deployment_status: run.deployment_status,
    ...run.health,
  };
  const ledger = {
    schema: run.schema,
    generation: run.generation,
    deployment_status: run.deployment_status,
    candidates: run.candidates,
    secrets_retained: false,
    raw_html_retained: false,
    article_bodies_retained: false,
  };
  await writeCliJson(resolveOutput(repositoryRoot, arguments_.health_out), health);
  await writeCliJson(resolveOutput(repositoryRoot, arguments_.ledger_out), ledger);
  process.stdout.write(`${JSON.stringify({
    generation: run.generation,
    provider: run.health.provider,
    selected_projects: run.health.selected_projects,
    queries_planned: run.health.queries_planned,
    queries_completed: run.health.queries_completed,
    queries_failed: run.health.queries_failed,
    candidates: run.candidates.length,
    deployment_status: run.deployment_status,
  })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  cliMain().catch((error) => {
    const code = error instanceof LiveNewsDiscoveryError ? error.code : 'COLLECTOR_FAILED';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}
