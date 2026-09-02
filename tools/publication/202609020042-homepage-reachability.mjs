/**
 * Is the published snapshot reachable from the homepage that serves it?
 *
 * The overnight runner publishes `releases/<generation>-pipelinenews/` into
 * `../globalgrid2050/pipelinenews_intelligence/<generation>/`, verifies it byte
 * for byte, pushes it, and waits for the public host to serve it. All of that
 * held for 202609012326 and 202609020025 and both were still, in the only sense
 * a reader cares about, unpublished: `index.html` is the only route to those
 * directories and it named neither, so the newest reachable version was
 * 202608312339, three behind the head of the lineage.
 *
 * The runner does not edit that homepage - naming a release there is a
 * deliberate act governed by a numbered-snapshot ritual - so this module does
 * not either. It reports. A cut that is served but reachable from nothing is
 * recorded as exactly that, instead of being recorded as finished.
 *
 *   node tools/publication/202609020042-homepage-reachability.mjs
 *   node tools/publication/202609020042-homepage-reachability.mjs --generation 202609020025
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const GG = path.resolve(ROOT, '..', 'globalgrid2050');

const SNAPSHOT_URL = /url:"\.\/pipelinenews_intelligence\/([0-9]{12})\/"/g;

/**
 * @param {{ globalgrid?: string }} options
 * @returns {{ available: boolean, reason?: string, published: string[], named: string[],
 *             presentedFirst: string|null, unreachable: string[], dangling: string[] }}
 */
export function homepageReachability({ globalgrid = GG } = {}) {
  const index = path.join(globalgrid, 'index.html');
  const snapshots = path.join(globalgrid, 'pipelinenews_intelligence');
  if (!fs.existsSync(index) || !fs.existsSync(snapshots)) {
    return {
      available: false,
      reason: `no globalgrid2050 checkout beside this repository at ${globalgrid}`,
      published: [], named: [], presentedFirst: null, unreachable: [], dangling: [],
    };
  }

  const published = fs.readdirSync(snapshots, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[0-9]{12}$/.test(entry.name))
    .map(entry => entry.name)
    .sort();

  const html = fs.readFileSync(index, 'utf8');
  const named = [...html.matchAll(SNAPSHOT_URL)].map(match => match[1]);
  const namedSet = new Set(named);

  return {
    available: true,
    published,
    named,
    presentedFirst: named[0] ?? null,
    unreachable: published.filter(generation => !namedSet.has(generation)),
    dangling: named.filter(generation => !published.includes(generation)),
  };
}

/**
 * The one question the runner asks: is this generation both served and named?
 */
export function isReachable(generation, options) {
  const state = homepageReachability(options);
  if (!state.available) return { ...state, generation, served: false, named: false };
  return {
    ...state,
    generation,
    served: state.published.includes(generation),
    named: state.named.includes(generation),
    is_newest_named: state.presentedFirst === generation,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('202609020042-homepage-reachability.mjs')) {
  const index = process.argv.indexOf('--generation');
  const state = homepageReachability();
  if (!state.available) {
    console.log(`skipped: ${state.reason}`);
    process.exit(0);
  }
  if (index > 0) {
    const report = isReachable(process.argv[index + 1]);
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.served && report.named ? 0 : 1);
  }
  console.log(`published: ${state.published.length}   named: ${new Set(state.named).size}   newest named first: ${state.presentedFirst}`);
  if (state.unreachable.length) console.log(`served but reachable from nothing: ${state.unreachable.join(', ')}`);
  if (state.dangling.length) console.log(`named but not published: ${state.dangling.join(', ')}`);
  process.exit(state.unreachable.length || state.dangling.length ? 1 : 0);
}
