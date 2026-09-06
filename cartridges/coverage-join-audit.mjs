// PIPELINE-01: identity coverage only. Presence does not establish network capacity.
function key(value) {
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) {
    throw new TypeError('REPD identity must be a non-empty digit string or integer');
  }
  return String(value);
}

function identities(rows, label) {
  const seen = new Set();
  for (const value of rows) {
    const id = key(value);
    if (seen.has(id)) throw new Error(`${label}: duplicate REPD ${id}`);
    seen.add(id);
  }
  return seen;
}

export function auditCoverage(proximity, grid, substation) {
  if (!Array.isArray(proximity?.rows)) throw new TypeError('proximity.rows must be an array');
  for (const [label, value] of [['grid', grid?.grid], ['substation', substation?.substation]]) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} index missing`);
  }
  const invalidProximity = [];
  const validRows = proximity.rows.filter((row, index) => {
    try { key(row.ref); return true; }
    catch { invalidProximity.push({index, ref: row.ref ?? null, name: row.name ?? '', reason:'missing-or-invalid-repd-identity'}); return false; }
  });
  const p = identities(validRows.map(row => row.ref), 'proximity');
  const g = identities(Object.keys(grid.grid), 'grid');
  const s = identities(Object.keys(substation.substation), 'substation');
  const difference = (a, b) => [...a].filter(id => !b.has(id)).sort();
  const missingGrid = difference(p, g), missingSubstation = difference(p, s);
  const extraGrid = difference(g, p), extraSubstation = difference(s, p);
  return {
    schema: 'pipelinenews.coverage-join-audit.v1',
    counts: { proximity: proximity.rows.length, validProximityIdentities: p.size, grid: g.size, substation: s.size },
    invalidProximity,
    missingGrid, missingSubstation, extraGrid, extraSubstation,
    equalKeySets: ![missingGrid, missingSubstation, extraGrid, extraSubstation, invalidProximity].some(a => a.length),
    byTechnology: Object.fromEntries([...new Set(proximity.rows.map(r => r.tech))].sort().map(tech => {
      const rows = proximity.rows.filter(r => r.tech === tech);
      return [tech, { proximity: rows.length, grid: rows.filter(r => g.has(String(r.ref))).length,
        substation: rows.filter(r => s.has(String(r.ref))).length }];
    })),
    caveat: 'Identity coverage only. Missing records are unavailable, not zero distance or absent infrastructure. Mapped proximity does not establish headroom.'
  };
}
