// Register-driven project binder for news items.
//
// Generalises the closed 4-entry gazetteer of discovery/javascript/202608270844-*
// to the whole project register a release serves (decoded with
// tools/intelligence/register-source.mjs). Identity rules are those of the
// existing contract (data/news-discovery/202608270844-live-news-discovery-contract.json):
// query context never establishes identity, only returned text does; ambiguity
// abstains; foreign conflict rejects. Wind is no longer rejected because the
// register now includes onshore and offshore wind.
//
// Publication rule (NL-019 decision, Agent A 2026-11-14, consistent with the owner's spec):
// the UK REPD Ref ID is the only authoritative project key, and an article is never
// published as bound to a project on name, operator or place evidence. This binder only
// proposes: every result carries publish:false and repd_ref:null, and a unique
// name-based candidate goes to the review queue as review_candidate. Only independent
// exact identity evidence (outside this module) may promote a binding.
//
// Outcome per item:
//   NAME_MATCH_REVIEW exactly one project, named in the headline (alone or
//                   corroborated by county or operator): queued for review.
//   AMBIGUOUS       named text matches more than one development; candidates kept.
//   CONTEXT_ONLY    one project named only in the snippet with no corroboration.
//   NO_MATCH        no register project named.
//   REJECT          foreign conflict.
// Development siblings (same stripped name and county, e.g. a solar farm and its
// co-located BESS) are returned as related_components, never as extra primaries.

export const BINDER_SCHEMA = 'pipelinenews.register-binding.v1';

export const GENERIC_SUFFIXES = Object.freeze([
  'battery energy storage system', 'battery energy storage facility', 'battery energy storage', 'battery storage system',
  'battery storage facility', 'battery storage', 'energy storage system', 'energy storage facility', 'energy storage project',
  'energy storage', 'storage system', 'storage facility', 'storage project', 'bess', 'battery farm', 'battery',
  'offshore wind farm', 'onshore wind farm', 'wind farm extension', 'wind farm', 'wind park', 'wind cluster',
  'wind turbines', 'wind turbine', 'wind project', 'wind energy project', 'wind energy', 'wind',
  'solar farm extension', 'solar farm', 'solar park', 'solar array', 'solar arrays', 'solar panels', 'solar project', 'solar pv',
  'solar photovoltaic farm', 'solar', 'photovoltaic array', 'photovoltaic panels', 'photovoltaic farm', 'photovoltaic system',
  'photovoltaic', 'pv array', 'pv arrays', 'pv panels', 'pv farm', 'pv', 'energy park', 'energy hub', 'energy centre',
  'energy project', 'energy facility', 'energy development', 'renewable energy park', 'extension', 'repowering',
  'phase 1', 'phase 2', 'phase 3', 'phase one', 'phase two', 'and bess', 'farm',
]);

// Words that alone, or together, do not identify a site.
export const GENERIC_WORDS = Object.freeze(new Set([
  'farm', 'hall', 'manor', 'house', 'park', 'home', 'lodge', 'court', 'mill', 'grange', 'green', 'hill', 'field', 'fields',
  'north', 'south', 'east', 'west', 'upper', 'lower', 'new', 'old', 'great', 'little', 'land', 'at', 'the', 'of', 'and',
  'road', 'lane', 'wood', 'moor', 'top', 'end', 'cross', 'bridge', 'barn', 'cottage', 'industrial', 'estate', 'business',
  'site', 'works', 'treatment', 'station', 'substation', 'grid', 'energy', 'power', 'project', 'development', 'uk',
  'church', 'common', 'heath', 'marsh', 'valley', 'view', 'well', 'place', 'street', 'way', 'land', 'adjacent', 'near',
  'rear', 'former', 'airfield', 'quarry', 'landfill', 'school', 'college', 'hospital', 'university', 'council', 'county',
]));

const UK_TERMS = ['UK', 'United Kingdom', 'Britain', 'British', 'England', 'Scotland', 'Wales', 'Welsh', 'Scottish', 'Northern Ireland', 'GB'];
export const FOREIGN_TERMS = Object.freeze(['Australia', 'Canada', 'India', 'Ireland', 'New Zealand', 'United States', 'US', 'USA',
  'Germany', 'Spain', 'Italy', 'France', 'China', 'Japan', 'Chile', 'Brazil', 'Netherlands', 'Poland']);

const TECH_CUES = Object.freeze({
  solar: /\b(solar|photovoltaic|pv)\b/i,
  bess: /\b(batter(?:y|ies)|bess|energy storage|storage)\b/i,
  wind_onshore: /\b(wind|turbines?)\b/i,
  wind_offshore: /\b(offshore|wind)\b/i,
});

export const normalise = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^the /, '');

// Technology and descriptor words: present in names but never identifying on their own.
export const DESCRIPTOR_WORDS = Object.freeze(new Set(['solar', 'wind', 'battery', 'batteries', 'storage', 'bess', 'pv',
  'photovoltaic', 'panels', 'panel', 'array', 'arrays', 'turbine', 'turbines', 'offshore', 'onshore', 'renewable',
  'renewables', 'facility', 'system', 'scheme', 'cluster', 'extension', 'phase', 'repowering', 'hub', 'centre', 'ltd',
  'limited', 'plc', 'energy', 'power', 'electric', 'electricity', 'mw', 'mwp', 'mwh', 'gw', 'one', 'two', 'three', 'i', 'ii', 'iii']));
const TRAILING_FILLER = new Set(['and', 'with', 'plus', 'at', 'of', 'energy', 'power', 'renewables', 'ltd', 'limited']);

// All progressively stripped forms of a name: "Dean Moor Solar Farm & Battery Storage"
// -> "dean moor solar farm and battery storage", "dean moor solar farm", "dean moor".
export function nameForms(name, {segments: useSegments = true} = {}) {
  const forms = new Set();
  const full = normalise(name);
  if (!full) return [];
  forms.add(full);
  const segments = String(name).split(/,| - | \u2013 |:|\(/).map(normalise).filter(Boolean);
  const seeds = [full, ...(useSegments && segments.length > 1 ? [segments[0]] : [])];
  for (const seed of seeds) {
    let value = seed;
    forms.add(value);
    let changed = true;
    while (changed) {
      changed = false;
      const words = value.split(' ');
      if (words.length > 1 && TRAILING_FILLER.has(words.at(-1))) { value = words.slice(0, -1).join(' '); forms.add(value); changed = true; continue; }
      for (const suffix of GENERIC_SUFFIXES) {
        if (value.endsWith(` ${suffix}`) && value !== suffix) {
          const next = value.slice(0, value.length - suffix.length - 1).trim();
          // Keep "X farm" when stripping "farm" would leave a single word.
          if (suffix === 'farm' && next.split(' ').length < 2) continue;
          value = next; forms.add(value); changed = true; break;
        }
      }
    }
  }
  return [...forms].filter(Boolean);
}

export function stripGeneric(name) {
  const forms = nameForms(name);
  return forms.length ? forms.reduce((a, b) => (b.length < a.length && normalise(name).startsWith(b) ? b : a), forms[0]) : '';
}

export const distinctiveTokens = alias => alias.split(' ').filter(token => token && !GENERIC_WORDS.has(token) && !DESCRIPTOR_WORDS.has(token) && !/^\d+$/.test(token) && token.length > 1);

export const developmentKey = project => {
  const full = normalise(project.name);
  const forms = nameForms(project.name, {segments: false}).filter(form => full.startsWith(form) && distinctiveTokens(form).length);
  const shortest = forms.sort((a, b) => a.length - b.length)[0] ?? full;
  return `${shortest}|${normalise(project.county)}`;
};

// Corroborating operator phrases: each component of a joint name, and its first two words.
export function operatorKeys(names) {
  const keys = new Set();
  for (const name of names) {
    for (const part of String(name ?? '').split(/[\/&+;,]|\band\b|\(|\)/i)) {
      const words = normaliseOperator(part).split(' ').filter(word => word && !GENERIC_WORDS.has(word) && !DESCRIPTOR_WORDS.has(word));
      if (!words.length) continue;
      keys.add(words.join(' '));
      if (words.length > 2) keys.add(words.slice(0, 2).join(' '));
      if (words[0].length >= 3 && words.length === 1) keys.add(words[0]);
    }
  }
  return [...keys].filter(key => key.length >= 3);
}

// Operator names: separators "/", "&", "+", "and" are equivalent; legal suffixes dropped.
export const normaliseOperator = value => normalise(String(value ?? '').replace(/[\/&+;,]/g, ' and '))
  .replace(/\b(and)\b/g, ' ').replace(/\b(ltd|limited|plc|llp|uk|group|holdings)\b/g, ' ').replace(/\s+/g, ' ').trim();

// Build the alias index. Each alias maps to the set of refs that carry it.
// extraAliases: Map(repd_ref -> [names]) e.g. previous site names from register-delta.
export function buildGazetteer(projects, {extraAliases = new Map(), operatorAliases = new Map()} = {}) {
  const byRef = new Map();
  const aliasIndex = new Map();
  const add = (alias, ref, kind) => {
    if (!alias) return;
    const tokens = distinctiveTokens(alias);
    if (!tokens.length) return; // only generic or technology words: never an identity
    // Strong: two distinctive words, or the full register name with three or more words.
    const strength = tokens.length >= 2 || (kind === 'name' && alias.split(' ').length >= 3) ? 'strong' : 'weak';
    const entry = aliasIndex.get(alias) ?? {alias, refs: new Set(), strength, kinds: new Set(), token: tokens[0]};
    entry.refs.add(ref); entry.kinds.add(kind);
    if (strength === 'strong') entry.strength = 'strong';
    aliasIndex.set(alias, entry);
  };
  for (const project of projects) {
    const ref = String(project.repd_ref);
    const operators = operatorKeys([project.operator, ...(operatorAliases.get(ref) ?? [])]);
    byRef.set(ref, {...project, repd_ref: ref, development_key: developmentKey(project), operator_aliases: [...new Set(operators)]});
    const names = [project.name, ...(extraAliases.get(ref) ?? [])];
    for (const name of names) {
      const full = normalise(name);
      for (const form of nameForms(name)) add(form, ref, form === full ? 'name' : 'stripped');
    }
  }
  const developments = new Map();
  for (const project of byRef.values()) {
    const list = developments.get(project.development_key) ?? [];
    list.push(project.repd_ref); developments.set(project.development_key, list);
  }
  // Longest aliases first so that span subsumption prefers the most specific name.
  const aliases = [...aliasIndex.values()].sort((a, b) => b.alias.length - a.alias.length || a.alias.localeCompare(b.alias));
  const byFirstToken = new Map();
  for (const entry of aliases) {
    const first = entry.alias.split(' ')[0];
    const list = byFirstToken.get(first) ?? [];
    list.push(entry); byFirstToken.set(first, list);
  }
  return {byRef, aliases, byFirstToken, developments, project_count: byRef.size, alias_count: aliases.length};
}

// Find alias occurrences on token boundaries; returns [{entry, start, end}] with
// shorter spans inside a longer accepted span removed.
export function findAliases(text, gazetteer) {
  const norm = normalise(text);
  if (!norm) return [];
  const tokens = norm.split(' ');
  const offsets = [];
  let position = 0;
  for (const token of tokens) { offsets.push(position); position += token.length + 1; }
  const hits = [];
  for (let i = 0; i < tokens.length; i++) {
    for (const entry of gazetteer.byFirstToken.get(tokens[i]) ?? []) {
      const length = entry.alias.split(' ').length;
      if (tokens.slice(i, i + length).join(' ') === entry.alias) hits.push({entry, start: i, end: i + length, following: tokens.slice(i + length, i + length + 2), previous: tokens[i - 1] ?? null});
    }
  }
  hits.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const accepted = [];
  for (const hit of hits) {
    if (accepted.some(other => hit.start >= other.start && hit.end <= other.end && !(hit.start === other.start && hit.end === other.end))) continue;
    accepted.push(hit);
  }
  return accepted;
}

const SITE_WORDS = new Set(['farm', 'park', 'project', 'scheme', 'site', 'plant']);
const isDescriptor = token => DESCRIPTOR_WORDS.has(token) || SITE_WORDS.has(token);
// True when the matched name is used as a site name: the alias itself ends in a
// descriptor ("dean moor solar farm"), or the next word (after an optional phase
// number such as "1", "II", "C") is one ("Hessay Solar", "Coalburn 1 battery").
function describesSite(hit) {
  if (['near', 'in', 'at', 'outside', 'from'].includes(hit.previous)) return false;
  const words = hit.entry.alias.split(' ');
  const last = words.lastIndexOf(hit.entry.token);
  if (words.slice(last + 1).some(isDescriptor)) return true;
  const [next, after] = hit.following;
  if (next && isDescriptor(next)) return true;
  return Boolean(next && /^(\d{1,2}|i{1,3}|iv|[a-d])$/.test(next) && after && isDescriptor(after));
}

const mentions = (text, phrase) => phrase && new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(text);

export function bindItem(item, gazetteer) {
  const headline = String(item.headline ?? item.title ?? '');
  const body = [item.snippet, item.summary, item.evidence_snippet].filter(Boolean).join(' ');
  const raw = `${headline} ${body}`;
  const all = normalise(raw);
  const result = {schema: BINDER_SCHEMA, outcome: 'NO_MATCH', reason: null, publish: false, repd_ref: null, gg_project_id: null, review_candidate: null, candidates: [], related_components: []};
  const ukSignal = UK_TERMS.some(term => new RegExp(`\\b${term}\\b`).test(raw));
  const foreign = FOREIGN_TERMS.find(term => new RegExp(`\\b${term}\\b`).test(raw));
  const headlineHits = findAliases(headline, gazetteer);
  const bodyHits = findAliases(body, gazetteer);
  if (!headlineHits.length && !bodyHits.length) {
    result.reason = 'NO_REGISTER_NAME_IN_TEXT';
    return result;
  }
  if (foreign && !ukSignal) { result.outcome = 'REJECT'; result.reason = `FOREIGN_CONFLICT:${foreign}`; return result; }
  // Gather candidate refs with evidence per ref.
  const evidence = new Map();
  const note = (hit, place) => {
    for (const ref of hit.entry.refs) {
      const row = evidence.get(ref) ?? {repd_ref: ref, aliases: new Set(), headline: false, strong: false, descriptor_follows: false};
      row.aliases.add(hit.entry.alias);
      // "Hessay Solar", "Kintore battery", "Eccles BESS": a name used as a site name is followed
      // by a descriptor. "near York village" is a place, not a project.
      if (place === 'headline' && describesSite(hit)) row.descriptor_follows = true;
      if (place === 'headline') row.headline = true;
      if (hit.entry.strength === 'strong') row.strong = true;
      evidence.set(ref, row);
    }
  };
  headlineHits.forEach(hit => note(hit, 'headline'));
  bodyHits.forEach(hit => note(hit, 'body'));
  for (const row of evidence.values()) {
    const project = gazetteer.byRef.get(row.repd_ref);
    row.county = mentions(all, normalise(project.county));
    row.operator = project.operator_aliases.some(name => mentions(all, name));
    row.tech_cue = Boolean(TECH_CUES[project.technology]?.test(raw));
    row.capitalised = [...row.aliases].some(alias => { const entry = gazetteer.aliases.find(e => e.alias === alias); const token = entry?.token; return token && new RegExp(`\\b${token[0].toUpperCase()}${token.slice(1)}`, 'i').test(raw) && new RegExp(`\\b${token[0].toUpperCase()}`).test(raw.slice(raw.toLowerCase().indexOf(token))); });
    row.corroborated = row.county || row.operator;
    row.development_key = project.development_key;
  }
  // Weak aliases need corroboration (county or operator), or a headline mention
  // written as a proper noun together with the project's technology; strong aliases stand alone.
  for (const row of evidence.values()) row.usable = row.strong || row.corroborated || (row.headline && row.tech_cue && row.capitalised && row.descriptor_follows);
  let usable = [...evidence.values()].filter(row => row.usable);
  if (!usable.length) { result.reason = 'WEAK_ALIAS_WITHOUT_CORROBORATION'; result.candidates = summarise(evidence, gazetteer); return result; }
  // Several developments: keep only corroborated ones if that narrows the field.
  let keys = new Set(usable.map(row => row.development_key));
  if (keys.size > 1) {
    const corroborated = usable.filter(row => row.corroborated);
    const corroboratedKeys = new Set(corroborated.map(row => row.development_key));
    if (corroboratedKeys.size >= 1 && corroboratedKeys.size < keys.size) { usable = corroborated; keys = corroboratedKeys; }
  }
  if (keys.size > 1) {
    const headlineKeys = new Set(usable.filter(row => row.headline).map(row => row.development_key));
    if (headlineKeys.size === 1) { usable = usable.filter(row => row.headline); keys = headlineKeys; }
  }
  if (keys.size > 1) {
    result.outcome = 'AMBIGUOUS'; result.reason = 'SEVERAL_DEVELOPMENTS_NAMED'; result.candidates = summarise(new Map(usable.map(row => [row.repd_ref, row])), gazetteer);
    return result;
  }
  // One development: pick the primary component by technology cue.
  const [key] = keys;
  const members = gazetteer.developments.get(key).map(ref => gazetteer.byRef.get(ref));
  let primary = usable.length === 1 ? [gazetteer.byRef.get(usable[0].repd_ref)] : members.filter(member => usable.some(row => row.repd_ref === member.repd_ref));
  if (primary.length > 1) {
    const byOperator = primary.filter(member => evidence.get(member.repd_ref)?.operator);
    if (byOperator.length === 1) primary = byOperator;
  }
  if (primary.length > 1) {
    const cued = primary.filter(member => TECH_CUES[member.technology]?.test(raw));
    if (cued.length >= 1 && cued.length < primary.length) primary = cued;
  }
  if (primary.length > 1) {
    const live = primary.filter(member => !/Refused|Withdrawn|Abandoned|Expired|Decommissioned/.test(member.status ?? ''));
    if (live.length === 1) primary = live;
  }
  let defaulted = false;
  if (primary.length > 1 && new Set(primary.map(member => member.technology)).size === primary.length) {
    // Co-located components with no technology cue: the generating component is primary,
    // storage is a related development (the convention of the curated v5/v6 bindings).
    const order = ['solar', 'wind_offshore', 'wind_onshore', 'bess'];
    primary = [primary.slice().sort((a, b) => order.indexOf(a.technology) - order.indexOf(b.technology))[0]];
    defaulted = true;
  }
  if (primary.length > 1) {
    result.outcome = 'AMBIGUOUS'; result.reason = 'SEVERAL_COMPONENTS_OF_ONE_DEVELOPMENT'; result.candidates = summarise(new Map(usable.map(row => [row.repd_ref, row])), gazetteer);
    return result;
  }
  const chosen = primary[0];
  const chosenEvidence = evidence.get(chosen.repd_ref) ?? usable[0];
  const place = chosenEvidence.headline ? 'HEADLINE' : 'BODY';
  // As in the 202608270844 contract, a name that appears only outside the headline is
  // related context, never a primary binding, however well corroborated.
  if (place === 'BODY') {
    result.outcome = 'CONTEXT_ONLY'; result.reason = 'NAMED_IN_SNIPPET_ONLY'; result.candidates = summarise(new Map([[chosen.repd_ref, chosenEvidence]]), gazetteer);
    return result;
  }
  // Name-based evidence never binds publicly: the unique candidate is queued for review.
  result.outcome = 'NAME_MATCH_REVIEW';
  result.reason = `${place}${chosenEvidence.corroborated ? '_CORROBORATED' : chosenEvidence.strong ? '' : '_PROPER_NOUN_WITH_TECHNOLOGY'}${defaulted ? '_DEFAULT_GENERATING_COMPONENT' : ''}`;
  result.review_candidate = {queue: 'REVIEW', repd_ref: chosen.repd_ref, gg_project_id: `GG2050-REPD-${chosen.repd_ref}`};
  result.candidates = summarise(new Map([[chosen.repd_ref, chosenEvidence]]), gazetteer);
  result.capacity_check = capacityCheck(raw, chosen, members);
  result.related_components = members.filter(member => member.repd_ref !== chosen.repd_ref)
    .map(member => ({role: 'RELATED_DEVELOPMENT', repd_ref: member.repd_ref, technology: member.technology ?? null, eligible_for_news_signal: false}));
  return result;
}

// Reported MW (not MWh) in the text against the register. Blank register capacity is
// unknown, never zero, so it yields UNKNOWN. A conflict does not unbind: it is a
// review flag (e.g. a 1,900 MW headline bound to a 49.9 MW register entry).
export function reportedMw(text) {
  const values = [];
  for (const match of String(text).matchAll(/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*-?\s*(GW|MW)(?:p|ac|dc|e)?(?![a-z])/gi)) {
    const value = Number(match[1].replace(/,/g, '')) * (match[2].toUpperCase() === 'GW' ? 1000 : 1);
    if (Number.isFinite(value) && value > 0) values.push(value);
  }
  return values;
}

export function capacityCheck(text, chosen, members = [chosen]) {
  const reported = reportedMw(text);
  const known = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  if (!reported.length || !known(chosen.capacity_mw)) return {status: 'UNKNOWN', reported_mw: reported, register_mw: known(chosen.capacity_mw) ? Number(chosen.capacity_mw) : null};
  const total = members.filter(member => known(member.capacity_mw)).reduce((sum, member) => sum + Number(member.capacity_mw), 0);
  const near = (a, b) => Math.abs(a - b) <= Math.max(1, 0.15 * b);
  const ok = reported.some(value => near(value, Number(chosen.capacity_mw)) || near(value, total));
  // Solar is often reported in MWp (DC) while REPD records export (AC) capacity: allow DC/AC 0.9-1.5.
  const dcAc = chosen.technology === 'solar' && reported.some(value => value >= 0.9 * Number(chosen.capacity_mw) && value <= 1.5 * Number(chosen.capacity_mw));
  return {status: ok ? 'CONSISTENT' : dcAc ? 'CONSISTENT_DC_AC_BAND' : 'CONFLICT', reported_mw: reported, register_mw: Number(chosen.capacity_mw), development_mw: total};
}

function summarise(evidence, gazetteer) {
  return [...evidence.values()].map(row => {
    const project = gazetteer.byRef.get(row.repd_ref);
    return {repd_ref: row.repd_ref, name: project.name, technology: project.technology ?? null, county: project.county ?? null,
      status: project.status ?? null, aliases: [...row.aliases], in_headline: Boolean(row.headline), corroborated: Boolean(row.corroborated)};
  }).sort((a, b) => Number(a.repd_ref) - Number(b.repd_ref));
}

export function bindAll(items, gazetteer) {
  const results = items.map(item => ({item_id: item.id ?? item.url, ...bindItem(item, gazetteer)}));
  const counts = {};
  for (const row of results) counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
  return {schema: BINDER_SCHEMA, project_count: gazetteer.project_count, alias_count: gazetteer.alias_count, counts, results};
}
