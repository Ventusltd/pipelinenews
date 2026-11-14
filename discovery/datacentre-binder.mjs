// Data-centre topic binder: news items -> released GridAtlas data-centre register site ids.
//
// Source of truth (NL-019, until Agent A or the owner says otherwise): GridAtlas
// data/uk_datacentre_pipeline_202610312133.geojson, 226 sites, sha256 pinned below
// and in the GridAtlas offtakers overlay (atlas/modules/202610312138-uk-offtakers-overlay.js:12).
//
// Rules
// - Topic gate: the existing sector rule (discovery/javascript/202609010015-sector-topic-evidence.mjs)
//   must say DATA_CENTRES. Nothing else is bound here.
// - A data centre is its own category. It never receives a REPD ref or a GG2050-REPD id.
// - Bind to a dc_site_id only when exactly one site name is named in the headline, or named
//   in the text and corroborated by its place or operator. An operator alone (Equinix runs
//   11 listed sites) or a place alone ("west London") is never a site identity.
// - Publication (NL-019 decision, Agent A 2026-11-14): a site named in an article is a
//   review item, not a published binding. Every result has publish:false and dc_site_id:null;
//   a unique named site is returned as review_candidate.dc_site_id for the review queue.
// - Map status comes from the register: EXACT_SITE, APPROXIMATE (settlement/region centroid,
//   not from the source) or NO_MAP when geometry is missing. Nothing is invented.
import {createHash} from 'node:crypto';
import {classifySectorTopic} from './javascript/202609010015-sector-topic-evidence.mjs';

export const DC_SCHEMA = 'pipelinenews.datacentre-binding.v1';
export const DC_REGISTER_PIN = Object.freeze({
  repository: 'Ventusltd/gridatlas',
  path: 'data/uk_datacentre_pipeline_202610312133.geojson',
  sha256: '87337db5d3bf7959f7f605d3abd029dd4196ab24a79107ceb95210c5b7751654',
  sites: 226,
});

const DC_DESCRIPTORS = new Set(['data', 'centre', 'centres', 'center', 'centers', 'datacentre', 'datacentres', 'campus', 'dc',
  'hyperscale', 'facility', 'site', 'park', 'building', 'hall', 'phase', 'ai', 'growth', 'zone', 'supercomputer', 'computing',
  'colocation', 'colo', 'the', 'of', 'and', 'at', 'land', 'unnamed', 'new', 'next', 'national', 'uk', 'ltd', 'limited', 'plc',
  'north', 'south', 'east', 'west', 'road', 'lane', 'former', 'landfill', 'services', 'it', 'technology', 'group']);

export const normalise = value => String(value ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const distinctive = alias => alias.split(' ').filter(token => token.length > 1 && !DC_DESCRIPTORS.has(token) && !/^\d+$/.test(token));
const mentions = (text, phrase) => Boolean(phrase) && new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(text);

export function verifyRegisterBytes(bytes, pin = DC_REGISTER_PIN) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== pin.sha256) throw Error(`Data-centre register digest ${digest} does not match pin ${pin.sha256}`);
  const register = JSON.parse(bytes);
  if (register?.type !== 'FeatureCollection' || !Array.isArray(register.features)) throw Error('Not a GeoJSON FeatureCollection');
  if (register.features.length !== pin.sites) throw Error(`Register has ${register.features.length} sites, pin says ${pin.sites}`);
  return register;
}

const noteValue = (notes, key) => (notes ?? []).find(note => note.startsWith(`${key}:`))?.slice(key.length + 1).trim() ?? null;

const operatorList = p => String(p.operator ?? '').split(/;|\//).map(part => normalise(part.replace(/\(.*$/, ''))).filter(Boolean);

export function buildSites(register) {
  // Operators that run several listed sites: their name never identifies one site.
  const operatorSites = new Map();
  for (const feature of register.features) for (const operator of new Set(operatorList(feature.properties ?? {}))) operatorSites.set(operator, (operatorSites.get(operator) ?? 0) + 1);
  const chain = name => [...operatorSites].some(([operator, count]) => count > 1 && (name === operator || name === `${operator} data centre` || name === `${operator} data centres`));
  const sites = register.features.map(feature => {
    const p = feature.properties ?? {};
    const precision = p.location?.precision ?? 'unknown';
    const geometry = feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates : null;
    const operators = operatorList(p);
    const place = noteValue(p.notes, 'place');
    const places = [p.location?.local_authority, ...(place ? place.split(',') : [])].map(normalise).filter(value => value && value.length >= 4);
    const nameAliases = [p.name, ...(p.aliases ?? [])].map(normalise).filter(Boolean);
    // A name that is only a multi-site operator's name or "unnamed data centre" identifies no site.
    const identities = new Set();
    for (const alias of nameAliases) {
      if (!distinctive(alias).length) continue;
      if (chain(alias)) continue;
      identities.add(alias);
      const core = alias.split(' ').filter(token => !['data', 'centre', 'centres', 'center', 'campus', 'datacentre'].includes(token)).join(' ').trim();
      if (core && core !== alias && distinctive(core).length) identities.add(core);
    }
    return {
      dc_site_id: p.id ?? feature.id, name: p.name ?? null, status: p.status ?? 'unknown', operator: p.operator ?? null,
      operators, places, identities: [...identities],
      it_load_mw: p.it_load_mw?.value ?? null, grid_connection_mw: p.grid_connection_mw?.value ?? null, unclassified_mw: p.unclassified_mw?.value ?? null,
      precision, longitude: geometry?.[0] ?? null, latitude: geometry?.[1] ?? null,
      map_status: !geometry ? 'NO_MAP' : precision === 'exact_site' ? 'EXACT_SITE' : 'APPROXIMATE',
      evidence_urls: p.evidence_urls ?? [],
    };
  });
  const index = new Map();
  for (const site of sites) for (const alias of site.identities) {
    const list = index.get(alias) ?? []; list.push(site); index.set(alias, list);
  }
  return {sites, index, aliases: [...index.keys()].sort((a, b) => b.length - a.length)};
}

export function bindDataCentreItem(item, register) {
  const headline = String(item.headline ?? item.title ?? '');
  const body = [item.summary, item.snippet, item.evidence_snippet].filter(Boolean).join(' ');
  const topic = classifySectorTopic({title: headline, summary: body || null});
  const base = {schema: DC_SCHEMA, category: 'DATA_CENTRE', repd_ref: null, topic: topic?.topic ?? null, topic_rule: topic?.rule ?? null,
    outcome: 'NOT_DATA_CENTRE_TOPIC', reason: null, publish: false, dc_site_id: null, review_candidate: null, map_status: null, candidates: []};
  if (topic?.topic !== 'DATA_CENTRES') return base;
  const h = normalise(headline), all = normalise(`${headline} ${body}`);
  const hits = [];
  for (const alias of register.aliases) {
    if (!mentions(all, alias)) continue;
    if (hits.some(hit => hit.alias.includes(alias))) continue; // a longer accepted name covers it
    for (const site of register.index.get(alias)) hits.push({alias, site, headline: mentions(h, alias)});
  }
  const bySite = new Map();
  for (const hit of hits) {
    const row = bySite.get(hit.site.dc_site_id) ?? {site: hit.site, aliases: new Set(), headline: false};
    row.aliases.add(hit.alias); row.headline ||= hit.headline; bySite.set(hit.site.dc_site_id, row);
  }
  for (const row of bySite.values()) {
    row.place = row.site.places.some(place => mentions(all, place));
    row.operator = row.site.operators.some(operator => operator.length >= 3 && mentions(all, operator));
    row.strong = [...row.aliases].some(alias => distinctive(alias).length >= 2 || alias.split(' ').length >= 3);
  }
  const usable = [...bySite.values()].filter(row => (row.headline && (row.strong || row.place || row.operator)) || (row.place && row.operator));
  const candidates = [...bySite.values()].map(row => ({dc_site_id: row.site.dc_site_id, name: row.site.name, status: row.site.status,
    aliases: [...row.aliases], in_headline: row.headline, place: row.place, operator: row.operator}));
  if (!bySite.size) {
    const operatorSites = register.sites.filter(site => site.operators.some(operator => operator.length >= 3 && mentions(all, operator)));
    return {...base, outcome: operatorSites.length ? 'OPERATOR_ONLY' : 'TOPIC_ONLY',
      reason: operatorSites.length ? `OPERATOR_NAMED_${operatorSites.length}_SITES` : 'NO_REGISTER_SITE_NAMED',
      candidates: operatorSites.slice(0, 20).map(site => ({dc_site_id: site.dc_site_id, name: site.name, status: site.status}))};
  }
  if (usable.length !== 1) return {...base, outcome: usable.length ? 'AMBIGUOUS' : 'CONTEXT_ONLY', reason: usable.length ? 'SEVERAL_SITES_NAMED' : 'SITE_NAME_WITHOUT_CORROBORATION', candidates};
  const site = usable[0].site;
  return {...base, outcome: 'SITE_NAME_MATCH_REVIEW', reason: usable[0].headline ? 'HEADLINE' : 'TEXT_WITH_PLACE_AND_OPERATOR',
    review_candidate: {queue: 'REVIEW', dc_site_id: site.dc_site_id},
    site_name: site.name, site_status: site.status, map_status: site.map_status,
    latitude: site.map_status === 'NO_MAP' ? null : site.latitude, longitude: site.map_status === 'NO_MAP' ? null : site.longitude,
    it_load_mw: site.it_load_mw, grid_connection_mw: site.grid_connection_mw, candidates};
}

export function bindDataCentres(items, register) {
  const results = items.map(item => ({item_id: item.id ?? item.url, ...bindDataCentreItem(item, register)}));
  const counts = {};
  for (const row of results) counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
  return {schema: DC_SCHEMA, register: DC_REGISTER_PIN, counts, results};
}
