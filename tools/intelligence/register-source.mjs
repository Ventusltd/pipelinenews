// Resolve the project register a Pipeline News release actually serves.
//
// The release registry (data/202608291447-registry.json, assets.projects) is the
// only authority for which project payload is live in a release. Searching a
// release folder for "*-v8-fast-projects.json" is unsafe: release_builder copies
// every parent file forward, so a release that replaced its register (for example
// 202611132345, REPD Q3 2026) still carries the inherited Q2 payload under the old
// name. Choosing by file name silently reconciles against the previous quarter.
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const REGISTRY_FILE = 'data/202608291447-registry.json';
export const PROJECT_SCHEMA = 'pipelinenews.v8.fast-project-index.v1';
export const RELEASE_ID_RE = /^\d{12}-pipelinenews$/;
export const IDENTITY_FIELDS = ['repd_ref', 'name', 'operator', 'county', 'capacity_mw'];
export const OPTIONAL_FIELDS = ['technology', 'status', 'region', 'repd_record_updated', 'geometry_status', 'latitude', 'longitude', 'gg_project_id'];

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function listReleases(root = '.') {
  const dir = path.join(root, 'releases');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => RELEASE_ID_RE.test(name)).sort();
}

// Returns {release, path, sha256, dataset, admitted_project_count, payload, bytes}.
// Throws on any inconsistency; never falls back to a file-name search.
export function resolveRegister(root = '.', {release} = {}) {
  const releases = listReleases(root);
  const chosen = release ?? releases.at(-1);
  if (!chosen || !RELEASE_ID_RE.test(chosen)) throw Error('No release to read a register from');
  const registryPath = path.join(root, 'releases', chosen, REGISTRY_FILE);
  if (!existsSync(registryPath)) throw Error(`Release ${chosen} has no registry`);
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const asset = registry?.assets?.projects;
  if (!asset?.path || !/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) throw Error(`Release ${chosen} registry has no pinned projects asset`);
  const relative = path.posix.normalize(asset.path);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !relative.startsWith('data/')) throw Error('Projects asset escapes the release folder');
  const file = path.join(root, 'releases', chosen, relative);
  const bytes = readFileSync(file);
  const digest = sha256(bytes);
  if (digest !== asset.sha256) throw Error(`Projects asset digest mismatch in ${chosen}: ${digest} != ${asset.sha256}`);
  const payload = JSON.parse(bytes);
  validatePayload(payload);
  const admitted = registry?.source?.admitted_project_count;
  if (Number.isInteger(admitted) && admitted !== payload.rows.length) throw Error(`Registry admits ${admitted} projects but payload has ${payload.rows.length}`);
  return {
    release: chosen,
    path: path.posix.join('releases', chosen, relative),
    sha256: digest,
    dataset: registry?.source?.dataset ?? null,
    admitted_project_count: payload.rows.length,
    payload,
  };
}

export function validatePayload(payload) {
  if (payload?.schema !== PROJECT_SCHEMA || !Array.isArray(payload.fields) || !Array.isArray(payload.rows)) throw Error('Unsupported project payload');
  for (const field of IDENTITY_FIELDS) if (!payload.fields.includes(field)) throw Error('Project identity field missing: ' + field);
  return true;
}

// Decode the dictionary-compressed rows into plain objects (identity + optional fields).
export function decodeProjects(payload) {
  validatePayload(payload);
  const wanted = [...IDENTITY_FIELDS, ...OPTIONAL_FIELDS].filter(field => payload.fields.includes(field));
  const index = Object.fromEntries(wanted.map(field => [field, payload.fields.indexOf(field)]));
  return payload.rows.map(values => Object.fromEntries(wanted.map(field => {
    const raw = values[index[field]];
    const dictionary = payload.dictionaries?.[field];
    const value = dictionary && raw !== null && raw !== undefined ? dictionary[raw] : raw;
    return [field, field === 'repd_ref' ? String(value) : value ?? null];
  })));
}
