const BBC_ORIGIN = 'https://www.bbc.co.uk';
const BBC_ARTICLE_PATH = /^\/news\/articles\/[a-z0-9]+$/;
const MAX_INTERNAL_ARTICLE_LINKS = 10;

export const BBC_ENRICHMENT_LIMITS = Object.freeze({
  request_timeout_ms: 5_000,
  response_bytes: 1_048_576,
  snippet_chars: 300,
  max_link_depth: 1,
  max_internal_article_links: MAX_INTERNAL_ARTICLE_LINKS,
});

export class BbcEnrichmentError extends Error {
  constructor(code) {
    super(code);
    this.name = 'BbcEnrichmentError';
    this.code = code;
  }
}

function fail(code) {
  throw new BbcEnrichmentError(code);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function compactText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
  const named = new Map([
    ['amp', '&'],
    ['apos', "'"],
    ['gt', '>'],
    ['hellip', '…'],
    ['ldquo', '“'],
    ['lsquo', '‘'],
    ['lt', '<'],
    ['nbsp', ' '],
    ['pound', '£'],
    ['quot', '"'],
    ['rdquo', '”'],
    ['rsquo', '’'],
    ['ndash', '–'],
    ['mdash', '—'],
  ]);

  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, token) => {
    if (token[0] === '#') {
      const radix = token[1]?.toLowerCase() === 'x' ? 16 : 10;
      const digits = radix === 16 ? token.slice(2) : token.slice(1);
      const codePoint = Number.parseInt(digits, radix);
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return named.get(token.toLowerCase()) ?? match;
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactPhraseRegExp(phrase) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(phrase)})(?=$|[^\\p{L}\\p{N}])`, 'iu');
}

function findPhrase(text, phrase) {
  const match = exactPhraseRegExp(phrase).exec(text);
  return match ? match.index + match[1].length : -1;
}

function boundedSnippet(text, phrase, maximum = BBC_ENRICHMENT_LIMITS.snippet_chars) {
  const clean = compactText(text);
  const index = findPhrase(clean, phrase);
  if (index < 0) return '';
  const before = Math.max(0, index - Math.floor((maximum - phrase.length) / 2));
  const after = Math.min(clean.length, before + maximum);
  let snippet = clean.slice(before, after).trim();
  if (before > 0) snippet = `…${snippet.slice(1)}`;
  if (after < clean.length) snippet = `${snippet.slice(0, -1)}…`;
  return snippet.slice(0, maximum);
}

function parseTagAttributes(tag) {
  const attributes = Object.create(null);
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(tag))) {
    const key = match[1].toLowerCase();
    if (key === 'meta' || key === 'a' || key === 'link') continue;
    attributes[key] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function metaContent(html, key, expected) {
  const tags = String(html).match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attributes = parseTagAttributes(tag);
    if (String(attributes[key] ?? '').toLowerCase() === expected.toLowerCase()) {
      return compactText(attributes.content);
    }
  }
  return '';
}

function findNewsArticleJsonLd(html) {
  const scripts = String(html).match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const candidates = [];

  const visit = (node) => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!isPlainObject(node)) return;
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.some((type) => ['NewsArticle', 'Article', 'ReportageNewsArticle'].includes(type))) {
      candidates.push(node);
    }
    if (Array.isArray(node['@graph'])) visit(node['@graph']);
  };

  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      visit(JSON.parse(body));
    } catch {
      // Invalid JSON-LD is ignored; BBC metadata tags remain authoritative input.
    }
  }
  return candidates[0] ?? null;
}

function jsonLdAboutNames(article) {
  const values = Array.isArray(article?.about) ? article.about : article?.about ? [article.about] : [];
  return values
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
    .map(compactText)
    .filter(Boolean);
}

function articlePlainText(html) {
  return compactText(decodeHtmlEntities(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ));
}

export function validateBbcArticleUrl(value) {
  if (typeof value !== 'string' || value.length > 200) fail('BBC_URL_INVALID');
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('BBC_URL_INVALID');
  }
  if (
    url.origin !== BBC_ORIGIN
    || url.protocol !== 'https:'
    || url.hostname !== 'www.bbc.co.uk'
    || url.port
    || url.username
    || url.password
    || url.search
    || url.hash
    || !BBC_ARTICLE_PATH.test(url.pathname)
  ) {
    fail('BBC_URL_NOT_APPROVED');
  }
  const canonical = `${BBC_ORIGIN}${url.pathname}`;
  if (value !== canonical) fail('BBC_URL_NOT_CANONICAL');
  return canonical;
}

function internalArticleUrls(html, articleUrl) {
  const urls = [];
  const seen = new Set([articleUrl]);
  const tags = String(html).match(/<a\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const href = parseTagAttributes(tag).href;
    if (!href) continue;
    let candidate;
    try {
      candidate = new URL(href, articleUrl).toString();
      candidate = validateBbcArticleUrl(candidate);
    } catch {
      continue;
    }
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    urls.push(candidate);
    if (urls.length === MAX_INTERNAL_ARTICLE_LINKS) break;
  }
  return urls;
}

function normaliseGazetteer(gazetteer) {
  if (!Array.isArray(gazetteer)) fail('BBC_GAZETTEER_INVALID');
  return gazetteer.map((entry) => {
    if (!isPlainObject(entry) || typeof entry.repd_ref !== 'string' || !Array.isArray(entry.aliases)) {
      fail('BBC_GAZETTEER_INVALID');
    }
    const aliases = [...new Set([entry.name, ...entry.aliases].map(compactText).filter(Boolean))];
    if (!aliases.length) fail('BBC_GAZETTEER_INVALID');
    return { repd_ref: entry.repd_ref, name: compactText(entry.name), aliases };
  });
}

export function extractBbcArticleMetadata(html, articleUrl, options = {}) {
  const url = validateBbcArticleUrl(articleUrl);
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf8') > BBC_ENRICHMENT_LIMITS.response_bytes) {
    fail('BBC_HTML_INVALID');
  }
  const gazetteer = normaliseGazetteer(options.gazetteer ?? []);
  const subjectNames = [...new Set((options.subject_names ?? []).map(compactText).filter(Boolean))];
  const jsonLd = findNewsArticleJsonLd(html);
  const headline = compactText(
    metaContent(html, 'property', 'og:title')
      || metaContent(html, 'name', 'twitter:title')
      || jsonLd?.headline,
  );
  const publishedAt = compactText(
    metaContent(html, 'property', 'article:published_time')
      || jsonLd?.datePublished,
  );
  const description = compactText(
    metaContent(html, 'property', 'og:description')
      || metaContent(html, 'name', 'description')
      || jsonLd?.description,
  ).slice(0, BBC_ENRICHMENT_LIMITS.snippet_chars);
  if (!headline || headline.length > 300) fail('BBC_HEADLINE_INVALID');
  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) fail('BBC_PUBLICATION_DATE_INVALID');

  const text = articlePlainText(html);
  const aboutNames = [...new Set(jsonLdAboutNames(jsonLd))].slice(0, 10);
  const searchSpaces = [
    ['headline', headline],
    ['description', description],
    ['about', aboutNames.join(' | ')],
    ['article', text],
  ];
  const phrases = [];
  for (const entry of gazetteer) {
    for (const alias of entry.aliases) phrases.push({ alias, repd_ref: entry.repd_ref, canonical_name: entry.name });
  }
  for (const name of subjectNames) phrases.push({ alias: name, repd_ref: null, canonical_name: name });

  const mentions = [];
  const seen = new Set();
  const evidenceSnippets = [];
  for (const phrase of phrases) {
    const locations = searchSpaces.filter(([, space]) => findPhrase(space, phrase.alias) >= 0).map(([location]) => location);
    if (!locations.length) continue;
    const key = `${phrase.repd_ref ?? ''}\u0000${phrase.alias.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const snippet = boundedSnippet(text, phrase.alias);
    if (snippet && !evidenceSnippets.includes(snippet)) evidenceSnippets.push(snippet);
    mentions.push({
      mention: phrase.alias,
      canonical_name: phrase.canonical_name,
      repd_ref: phrase.repd_ref,
      locations,
      evidence_snippet: snippet,
    });
  }

  return Object.freeze({
    schema: 'pipelinenews.bbc-article-compact.v1',
    url,
    headline,
    published_at: publishedAt || null,
    description,
    about_names: aboutNames,
    exact_project_mentions: mentions,
    internal_article_urls: internalArticleUrls(html, url),
    evidence_snippets: evidenceSnippets.slice(0, 20),
  });
}

async function readBoundedHtml(response) {
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > BBC_ENRICHMENT_LIMITS.response_bytes) {
    fail('BBC_RESPONSE_TOO_LARGE');
  }
  const chunks = [];
  let total = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > BBC_ENRICHMENT_LIMITS.response_bytes) {
        await reader.cancel().catch(() => {});
        fail('BBC_RESPONSE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } else if (typeof response.arrayBuffer === 'function') {
    const bytes = new Uint8Array(await response.arrayBuffer());
    total = bytes.byteLength;
    if (total > BBC_ENRICHMENT_LIMITS.response_bytes) fail('BBC_RESPONSE_TOO_LARGE');
    chunks.push(bytes);
  } else {
    fail('BBC_RESPONSE_BODY_INVALID');
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(joined);
}

export async function fetchBbcArticleMetadata(articleUrl, options = {}) {
  const url = validateBbcArticleUrl(articleUrl);
  const fetchImpl = options.fetch_impl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') fail('BBC_FETCH_UNAVAILABLE');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BBC_ENRICHMENT_LIMITS.request_timeout_ms);
  const externalSignal = options.signal;
  const abort = () => controller.abort();
  externalSignal?.addEventListener?.('abort', abort, { once: true });
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9',
        'user-agent': 'PipelineNews-Live-News-Discovery/202608270844',
      },
    });
    if (!response || response.status !== 200) fail('BBC_RESPONSE_NOT_OK');
    if (response.redirected) fail('BBC_REDIRECT_REJECTED');
    if (response.url && response.url !== url) fail('BBC_REDIRECT_REJECTED');
    const contentType = String(response.headers?.get?.('content-type') ?? 'text/html').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      fail('BBC_RESPONSE_TYPE_REJECTED');
    }
    const html = await readBoundedHtml(response);
    return extractBbcArticleMetadata(html, url, options);
  } catch (error) {
    if (error instanceof BbcEnrichmentError) throw error;
    fail(controller.signal.aborted ? 'BBC_REQUEST_TIMEOUT' : 'BBC_REQUEST_FAILED');
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener?.('abort', abort);
  }
}

export async function enrichBbcArticle(articleUrl, options = {}) {
  const requestedDepth = options.max_link_depth ?? BBC_ENRICHMENT_LIMITS.max_link_depth;
  if (!Number.isInteger(requestedDepth) || requestedDepth < 0 || requestedDepth > BBC_ENRICHMENT_LIMITS.max_link_depth) {
    fail('BBC_LINK_DEPTH_INVALID');
  }
  const root = await fetchBbcArticleMetadata(articleUrl, options);
  const linkedArticles = [];
  if (requestedDepth === 1) {
    for (const url of root.internal_article_urls.slice(0, MAX_INTERNAL_ARTICLE_LINKS)) {
      linkedArticles.push(await fetchBbcArticleMetadata(url, options));
    }
  }
  return Object.freeze({
    schema: 'pipelinenews.bbc-enrichment.v1',
    root,
    linked_articles: linkedArticles,
    health: Object.freeze({
      fetched_articles: 1 + linkedArticles.length,
      maximum_link_depth: requestedDepth,
      retained_raw_html: false,
      retained_article_bodies: false,
      request_timeout_ms: BBC_ENRICHMENT_LIMITS.request_timeout_ms,
      response_bytes: BBC_ENRICHMENT_LIMITS.response_bytes,
      snippet_chars: BBC_ENRICHMENT_LIMITS.snippet_chars,
    }),
  });
}

function evidenceText(article) {
  return compactText([
    article.headline,
    article.description,
    ...(article.about_names ?? []),
    ...(article.evidence_snippets ?? []),
  ].join(' '));
}

export function classifyEnrichedBbcArticle(article, contract) {
  if (!isPlainObject(article) || article.schema !== 'pipelinenews.bbc-article-compact.v1') {
    fail('BBC_COMPACT_ARTICLE_INVALID');
  }
  validateBbcArticleUrl(article.url);
  const gazetteer = normaliseGazetteer(contract?.gazetteer ?? []);
  const returnedEvidence = evidenceText(article);
  if (/\bwind\s*(?:farm|turbine|energy|power)?\b/i.test(returnedEvidence)) {
    return Object.freeze({ outcome: 'REJECT', reason: 'WIND_EXCLUDED', repd_ref: null });
  }
  const foreignTerms = Array.isArray(contract?.foreign_conflict_terms) ? contract.foreign_conflict_terms : [];
  if (foreignTerms.some((term) => findPhrase(returnedEvidence, term) >= 0)) {
    return Object.freeze({ outcome: 'REJECT', reason: 'FOREIGN_CONFLICT', repd_ref: null });
  }

  const subjectEvidence = compactText([article.headline, ...(article.about_names ?? [])].join(' '));
  const excludedSubject = (contract?.excluded_primary_subjects ?? []).find(
    (subject) => findPhrase(subjectEvidence, subject.name) >= 0,
  );
  const matches = [];
  for (const entry of gazetteer) {
    const aliases = entry.aliases.filter((alias) => findPhrase(returnedEvidence, alias) >= 0);
    if (!aliases.length) continue;
    const headlineAliases = aliases.filter((alias) => findPhrase(article.headline, alias) >= 0);
    const aboutAliases = aliases.filter((alias) => (article.about_names ?? []).some((name) => findPhrase(name, alias) >= 0));
    const original = contract.gazetteer.find((item) => item.repd_ref === entry.repd_ref);
    const corroborated = Boolean(
      original?.planning_reference && findPhrase(returnedEvidence, original.planning_reference) >= 0,
    );
    matches.push({ repd_ref: entry.repd_ref, aliases, headlineAliases, aboutAliases, corroborated });
  }
  if (excludedSubject) {
    if (matches.length === 1) {
      return Object.freeze({
        outcome: 'RELATED_MENTION',
        reason: 'NON_REPD_PRIMARY_WITH_EDITORIAL_CONTEXT',
        repd_ref: null,
        related_context_repd_ref: matches[0].repd_ref,
        primary_subject: excludedSubject.name,
      });
    }
    return Object.freeze({ outcome: 'ABSTAIN', reason: 'NON_REPD_PRIMARY_AMBIGUOUS', repd_ref: null });
  }
  const direct = matches.filter((match) => match.headlineAliases.length || match.aboutAliases.length || match.corroborated);
  if (direct.length === 1) {
    return Object.freeze({ outcome: 'PRIMARY_MATCH', reason: 'RETURNED_PUBLISHER_EVIDENCE', repd_ref: direct[0].repd_ref });
  }
  if (!direct.length && matches.length === 1) {
    return Object.freeze({ outcome: 'ABSTAIN', reason: 'BODY_MENTION_ONLY', repd_ref: null });
  }
  return Object.freeze({ outcome: 'ABSTAIN', reason: matches.length ? 'AMBIGUOUS_IDENTITY' : 'NO_CLOSED_GAZETTEER_MATCH', repd_ref: null });
}
