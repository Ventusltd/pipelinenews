// Quarter-to-quarter delta of the Pipeline News project register, with a safety gate.
//
// A new REPD quarter reaches news discovery as a new release whose registry points
// at a new projects payload (see register-source.mjs). This module compares two
// decoded registers and reports what discovery must react to: new refs, removed
// refs, operator renames, site renames, status changes and capacity edits. It
// never edits either register. The gate HOLDs (does not apply) on a delta that
// looks like a broken source rather than a normal quarter.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolveRegister, decodeProjects, listReleases} from './register-source.mjs';

export const DELTA_SCHEMA = 'pipelinenews.register-delta.v1';
export const DEFAULT_LIMITS = Object.freeze({
  max_removed_fraction: 0.02,   // Q2->Q3 2026 spine: 6 of 7,680 removed (0.08%)
  max_added_fraction: 0.05,     // Q2->Q3 2026 spine: 101 of 7,680 added (1.3%)
  max_operator_change_fraction: 0.15, // Q2->Q3 2026 full REPD: 530 of 14,648 retained (3.6%)
  min_projects: 1000,
});

// Status transitions that make a project newsworthy again.
export const SIGNAL_STATUSES = Object.freeze(new Set([
  'Awaiting Construction', 'Under Construction', 'Operational',
  'Application Refused', 'Appeal Refused', 'Application Withdrawn', 'Appeal Lodged', 'Abandoned',
  'Planning Permission Expired', 'Decommissioned',
]));

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
export const normaliseName = value => clean(value).normalize('NFKC').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

// Operator spelling: "/", "&", "+" and "and" are the same separator; legal suffixes ignored.
export const normaliseOperator = value => normaliseName(String(value ?? '').replace(/[\/&+;,]/g, ' and '))
  .replace(/\b(and|ltd|limited|plc|llp)\b/g, ' ').replace(/\s+/g, ' ').trim();

const sameNumber = (a, b) => (a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')
  ? true : Number(a) === Number(b);

export function computeDelta(previousProjects, nextProjects, {previous = {}, next = {}, limits = DEFAULT_LIMITS} = {}) {
  const reasons = [];
  const index = (rows, label) => {
    const map = new Map();
    for (const row of rows) {
      const ref = String(row.repd_ref);
      if (!/^\d+$/.test(ref)) reasons.push(`${label}: non-numeric repd_ref ${ref}`);
      if (map.has(ref)) reasons.push(`${label}: duplicate repd_ref ${ref}`);
      map.set(ref, row);
    }
    return map;
  };
  const before = index(previousProjects, 'previous');
  const after = index(nextProjects, 'next');
  const added = [], removed = [], operator = [], respelled = [], site = [], status = [], capacity = [], technology = [];
  for (const [ref, row] of after) {
    const old = before.get(ref);
    if (!old) { added.push(ref); continue; }
    if (normaliseOperator(old.operator) !== normaliseOperator(row.operator)) operator.push({repd_ref: ref, from: clean(old.operator) || null, to: clean(row.operator) || null});
    else if (clean(old.operator) !== clean(row.operator)) respelled.push({repd_ref: ref, from: clean(old.operator) || null, to: clean(row.operator) || null});
    if (normaliseName(old.name) !== normaliseName(row.name)) site.push({repd_ref: ref, from: clean(old.name), to: clean(row.name)});
    if ((old.status ?? null) !== (row.status ?? null)) status.push({repd_ref: ref, from: old.status ?? null, to: row.status ?? null, signal: SIGNAL_STATUSES.has(row.status)});
    if (!sameNumber(old.capacity_mw, row.capacity_mw)) capacity.push({repd_ref: ref, from: old.capacity_mw ?? null, to: row.capacity_mw ?? null});
    if ((old.technology ?? null) !== (row.technology ?? null)) technology.push({repd_ref: ref, from: old.technology ?? null, to: row.technology ?? null});
  }
  for (const ref of before.keys()) if (!after.has(ref)) removed.push(ref);
  const byNumber = (a, b) => Number(a) - Number(b);
  added.sort(byNumber); removed.sort(byNumber);
  const retained = after.size - added.length;
  if (after.size < limits.min_projects) reasons.push(`next register has only ${after.size} projects`);
  if (before.size && removed.length / before.size > limits.max_removed_fraction) reasons.push(`removed ${removed.length} of ${before.size} refs exceeds ${limits.max_removed_fraction}`);
  if (before.size && added.length / before.size > limits.max_added_fraction) reasons.push(`added ${added.length} refs exceeds ${limits.max_added_fraction} of ${before.size}`);
  if (retained && operator.length / retained > limits.max_operator_change_fraction) reasons.push(`operator changed on ${operator.length} of ${retained} retained refs`);
  const unchanged = previous.sha256 && previous.sha256 === next.sha256;
  return {
    schema: DELTA_SCHEMA,
    previous: describe(previous, before.size),
    next: describe(next, after.size),
    counts: {added: added.length, removed: removed.length, retained, operator_renamed: operator.length, operator_respelled: respelled.length, site_renamed: site.length,
      status_changed: status.length, status_signal: status.filter(row => row.signal).length, capacity_changed: capacity.length, technology_changed: technology.length},
    gate: {status: unchanged ? 'NO_CHANGE' : reasons.length ? 'HOLD' : 'PASS', reasons, limits: {...limits}},
    added, removed, operator_renamed: operator, operator_respelled: respelled, site_renamed: site, status_changed: status, capacity_changed: capacity, technology_changed: technology,
  };
}

function describe(meta, count) {
  return {release: meta.release ?? null, path: meta.path ?? null, sha256: meta.sha256 ?? null, dataset: meta.dataset ?? null, project_count: count};
}

// Every operator name a ref has carried across the two registers (normalised -> display).
// Used so that a provisional row or an article naming the previous operator still corroborates.
export function operatorAliases(delta) {
  const aliases = new Map();
  for (const row of [...delta.operator_renamed, ...(delta.operator_respelled ?? [])]) {
    aliases.set(row.repd_ref, [...new Set([row.from, row.to].filter(Boolean))]);
  }
  return aliases;
}

// Re-check existing article bindings against a new register. Bindings are never
// deleted: a removed ref is marked, a status change becomes a review signal.
export function reviewBindings(bindings, delta) {
  const removed = new Set(delta.removed);
  const status = new Map(delta.status_changed.map(row => [row.repd_ref, row]));
  const operator = new Map(delta.operator_renamed.map(row => [row.repd_ref, row]));
  const site = new Map(delta.site_renamed.map(row => [row.repd_ref, row]));
  return bindings.map(binding => {
    const ref = binding.repd_ref ? String(binding.repd_ref) : null;
    const flags = [];
    if (!ref) return {...binding, register_review: []};
    if (removed.has(ref)) flags.push({flag: 'REF_REMOVED_FROM_REGISTER', action: 'HOLD_BINDING_FOR_REVIEW'});
    if (status.has(ref)) flags.push({flag: 'STATUS_CHANGED', from: status.get(ref).from, to: status.get(ref).to, action: status.get(ref).signal ? 'RECHECK_FOR_NEW_COVERAGE' : 'NONE'});
    if (operator.has(ref)) flags.push({flag: 'OPERATOR_RENAMED', from: operator.get(ref).from, to: operator.get(ref).to, action: 'DISPLAY_NEW_KEEP_OLD_AS_ALIAS'});
    if (site.has(ref)) flags.push({flag: 'SITE_RENAMED', from: site.get(ref).from, to: site.get(ref).to, action: 'ADD_OLD_NAME_AS_ALIAS'});
    return {...binding, register_review: flags};
  });
}

// Discovery priority for the next collection run: new refs first, then refs whose
// status became newsworthy. Returns decoded projects; the existing bounded query
// planner (buildBoundedQueryPlan) still applies its own size and count limits.
export function discoveryPriority(delta, nextProjects) {
  const byRef = new Map(nextProjects.map(row => [String(row.repd_ref), row]));
  const picked = [], seen = new Set();
  const take = (ref, reason) => {
    if (seen.has(ref) || !byRef.has(ref)) return;
    seen.add(ref); picked.push({...byRef.get(ref), discovery_reason: reason});
  };
  for (const ref of delta.added) take(ref, 'NEW_IN_REGISTER');
  for (const row of delta.status_changed) if (row.signal) take(row.repd_ref, `STATUS_${row.from}_TO_${row.to}`);
  return picked;
}

// CLI: node tools/intelligence/register-delta.mjs [--previous <release>] [--next <release>] [--out file]
// Default compares the two newest releases whose registered projects digests differ.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
  const releases = listReleases('.');
  const next = resolveRegister('.', {release: args.get('--next') ?? releases.at(-1)});
  let previous = null;
  if (args.get('--previous')) previous = resolveRegister('.', {release: args.get('--previous')});
  else for (const release of [...releases].reverse()) {
    const candidate = resolveRegister('.', {release});
    if (candidate.sha256 !== next.sha256) { previous = candidate; break; }
  }
  if (!previous) previous = next;
  const delta = computeDelta(decodeProjects(previous.payload), decodeProjects(next.payload), {previous, next});
  const body = JSON.stringify(delta, null, 2) + '\n';
  if (args.get('--out')) writeFileSync(args.get('--out'), body);
  console.log(JSON.stringify({previous: delta.previous, next: delta.next, counts: delta.counts, gate: delta.gate}));
  if (delta.gate.status === 'HOLD') process.exit(2);
}
