#!/usr/bin/env node
/** Browser proof for any fail-closed Pages promotion wrapper. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) throw new Error(`${flag} is required`);
  return args[index + 1];
};
const candidate = value('--candidate');
const output = value('--output');
const candidateBase = new URL(candidate);
const manifestUrl = new URL('atlas-link-manifest.json', candidateBase);
const manifestResponse = await fetch(manifestUrl);
if (!manifestResponse.ok) throw new Error(`wrapper manifest HTTP ${manifestResponse.status}`);
const manifest = await manifestResponse.json();
if (manifest.schema !== 'pipelinenews.atlas-current-link-manifest.v2') {
  throw new Error(`unsupported wrapper manifest: ${manifest.schema}`);
}
const receiver = manifest.receiver;
if (receiver?.base_url !== 'https://ventusltd.github.io/gridatlas/atlas/') {
  throw new Error('wrapper receiver is not the stable GridAtlas route');
}
const sha256 = (payload) => createHash('sha256').update(payload).digest('hex');
const fetchPublicBytes = async (url, label) => {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};
const publicCurrentUrl = new URL('current.json', receiver.base_url);
publicCurrentUrl.searchParams.set('receiver_commit', receiver.commit);
const publicCurrentBytes = await fetchPublicBytes(publicCurrentUrl, 'Grid current pointer');
const publicCurrent = JSON.parse(publicCurrentBytes.toString('utf8'));
if (publicCurrent.schema !== 'gridatlas.current.v2'
    || publicCurrent.generation !== receiver.generation) {
  throw new Error(`public Grid pointer is not receiver generation ${receiver.generation}`);
}
const publicCartridges = new Map(
  (publicCurrent.cartridges || []).map((item) => [item.id, item]),
);
const publicReceiverFiles = {};
for (const [id, record] of [
  ['sld-sandbox', receiver.measurement_cartridge],
  ['substation-intelligence', receiver.engine_cartridge],
]) {
  const current = publicCartridges.get(id);
  const expectedCurrentPath = `./${record.path.replace(/^atlas\//u, '')}`;
  if (current?.generation !== record.generation
      || current?.version !== record.version
      || current?.path !== expectedCurrentPath
      || current?.sha256 !== record.sha256) {
    throw new Error(`public Grid ${id} pointer does not match the wrapper receiver`);
  }
  const publicUrl = new URL(record.path.replace(/^atlas\//u, ''), receiver.base_url);
  publicUrl.searchParams.set('receiver_commit', receiver.commit);
  const payload = await fetchPublicBytes(publicUrl, `Grid ${id} cartridge`);
  const digest = sha256(payload);
  if (payload.length !== record.bytes || digest !== record.sha256) {
    throw new Error(`public Grid ${id} bytes do not match ${receiver.commit}`);
  }
  publicReceiverFiles[id] = {
    url: publicUrl.href,
    bytes: payload.length,
    sha256: digest,
    generation: current.generation,
    version: current.version,
  };
}

const repdRef = '155';
const networkProfile = {
  offline: false,
  latency: 100,
  downloadThroughput: (10 * 1024 * 1024) / 8,
  uploadThroughput: (5 * 1024 * 1024) / 8,
  connectionType: 'cellular4g',
};
const throttle = async (target) => {
  const session = await target.context().newCDPSession(target);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', networkProfile);
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
await throttle(page);
const pipelineErrors = [];
const pipelineFailures = [];
page.on('pageerror', (error) => pipelineErrors.push(String(error?.stack || error?.message || error)));
page.on('console', (message) => {
  if (message.type() === 'error') pipelineErrors.push(message.text());
});
page.on('requestfailed', (request) => pipelineFailures.push({
  url: request.url(), error: request.failure()?.errorText || 'unknown',
}));
const probe = new URL(candidateBase);
probe.searchParams.set('repd_ref', repdRef);
probe.searchParams.set('technology', 'Biomass (dedicated)');
await page.goto(probe.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => document.body?.dataset?.fastReady === 'true', null,
  { timeout: 90000 });
await page.waitForFunction((ref) => [...document.querySelectorAll('a.action-link[href]')]
  .some((anchor) => new URL(anchor.href).searchParams.get('repd_ref') === ref),
repdRef, { timeout: 90000 });
const pipeline = await page.evaluate((ref) => {
  const matches = [...document.querySelectorAll('a.action-link[href]')]
    .filter((candidate) => new URL(candidate.href).searchParams.get('repd_ref') === ref);
  const anchor = matches[0];
  const row = anchor?.closest('tr');
  const rect = anchor?.getBoundingClientRect();
  return {
    url: location.href,
    release_id: document.body.dataset.releaseId || null,
    fast_generation: document.body.dataset.fastGeneration || null,
    filtered_count: document.querySelector('#resultsMeta')?.dataset?.filteredCount || null,
    row_text: row?.textContent?.replace(/\s+/gu, ' ').trim() || null,
    atlas_href: anchor?.href || null,
    matching_action_count: matches.length,
    wider_technology: document.querySelector('#widerTechnology')?.value || null,
    action_box: rect ? { width: rect.width, height: rect.height } : null,
    horizontal_overflow: document.documentElement.scrollWidth - innerWidth,
  };
}, repdRef);
if (!pipeline.atlas_href) throw new Error('Markinch MAP action is absent');
const atlasUrl = new URL(pipeline.atlas_href);
const expectedParameters = [
  'repd_ref', 'project', 'technology', 'capacity_mw', 'latitude', 'longitude', 'zoom',
];
if (atlasUrl.origin + atlasUrl.pathname !== receiver.base_url) {
  throw new Error(`Atlas receiver changed: ${atlasUrl.origin}${atlasUrl.pathname}`);
}
if ([...atlasUrl.searchParams.keys()].join(',') !== expectedParameters.join(',')) {
  throw new Error(`MAP parameter contract changed: ${[...atlasUrl.searchParams.keys()]}`);
}
if (atlasUrl.searchParams.get('repd_ref') !== repdRef
    || atlasUrl.searchParams.get('technology') !== 'biomass'
    || atlasUrl.searchParams.get('project') !== 'Markinch Biomass CHP Plant'
    || Number(atlasUrl.searchParams.get('latitude')) !== 56.20118
    || Number(atlasUrl.searchParams.get('longitude')) !== -3.16226) {
  throw new Error(`Markinch transport changed: ${atlasUrl.href}`);
}
if (pipeline.matching_action_count !== 1 || pipeline.wider_technology !== 'Biomass (dedicated)'
    || !pipeline.row_text?.includes('Markinch Biomass CHP Plant')) {
  throw new Error('exact Pipeline identity did not render one Markinch MAP action');
}
if (pipeline.horizontal_overflow > 1) throw new Error(`Pipeline mobile overflow ${pipeline.horizontal_overflow}px`);
if (pipelineErrors.length || pipelineFailures.length) {
  throw new Error(`Pipeline browser errors: ${JSON.stringify({ pipelineErrors, pipelineFailures })}`);
}

const atlas = await context.newPage();
await throttle(atlas);
const atlasErrors = [];
const atlasFailures = [];
atlas.on('pageerror', (error) => atlasErrors.push(String(error?.stack || error?.message || error)));
atlas.on('console', (message) => {
  if (message.type() === 'error') atlasErrors.push(message.text());
});
atlas.on('requestfailed', (request) => atlasFailures.push({
  url: request.url(), error: request.failure()?.errorText || 'unknown',
}));
await atlas.goto(atlasUrl.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
await atlas.waitForSelector('#map canvas', { timeout: 90000 });
await atlas.waitForFunction((ref) => {
  const state = window.__GRIDATLAS_NEON_LINKS__;
  return state?.deep_linked === true
    && Number.isFinite(state.first_coordinate_answer_ms)
    && state.last_selection?.name === 'Markinch Biomass CHP Plant'
    && String(state.identity_verification?.repd_ref || '') === ref
    && ['VERIFIED', 'RECOMPUTED'].includes(state.identity_verification?.status);
}, repdRef, { timeout: 600000 });
const atlasState = await atlas.evaluate((ref) => {
  const state = window.__GRIDATLAS_NEON_LINKS__;
  const popup = document.querySelector('.maplibregl-popup-content');
  return {
    url: location.href,
    deep_linked: state?.deep_linked,
    first_coordinate_answer_ms: state?.first_coordinate_answer_ms,
    first_coordinate_origin: state?.first_coordinate_origin,
    origin_source: state?.origin_source,
    identity_verification: state?.identity_verification || null,
    arrival_reconciliation: state?.arrival_reconciliation || null,
    last_selection: state?.last_selection || null,
    links_drawn: state?.links_drawn,
    status_message: state?.status_message,
    popup_text: popup?.innerText?.replace(/\s+/gu, ' ').trim() || null,
    ref_visible: document.body.innerText.includes(ref),
    viewport: { width: innerWidth, height: innerHeight },
  };
}, repdRef);
if (!atlasState.ref_visible || !atlasState.popup_text?.includes('Markinch Biomass CHP Plant')) {
  throw new Error('Grid receiver did not keep the Markinch identity visible');
}
if (!Number.isFinite(atlasState.links_drawn) || atlasState.links_drawn <= 0
    || atlasState.last_selection?.count !== atlasState.links_drawn
    || !/\bkm straight\b/iu.test(atlasState.popup_text || '')) {
  throw new Error('Grid receiver did not publish Markinch measured links');
}
const toleratedFailures = atlasFailures.filter((failure) =>
  /tile|basemap|sprite|glyph/iu.test(failure.url));
const unexpectedFailures = atlasFailures.filter((failure) => !toleratedFailures.includes(failure));
const toleratedErrors = atlasErrors.filter((message) =>
  /Failed to fetch|MapLibre|tile|sprite|glyph/iu.test(message));
const unexpectedErrors = atlasErrors.filter((message) => !toleratedErrors.includes(message));
if (unexpectedErrors.length || unexpectedFailures.length) {
  throw new Error(`Grid browser errors: ${JSON.stringify({ unexpectedErrors, unexpectedFailures })}`);
}

const proof = {
  schema: 'pipelinenews.pages-promotion-wrapper-readback.v1',
  classification: 'VERIFIED_PIPELINENEWS_MAP_TO_GRID_PRODUCTION_RECEIVER',
  wrapper_release_id: manifest.pipeline_release_id,
  source_release_id: manifest.source_pipeline_release_id,
  receiver_commit: receiver.commit,
  receiver_version: receiver.version,
  public_receiver: {
    current_url: publicCurrentUrl.href,
    current_sha256: sha256(publicCurrentBytes),
    generation: publicCurrent.generation,
    cartridges: publicReceiverFiles,
  },
  candidate_url: candidateBase.href,
  pipeline_probe_url: probe.href,
  atlas_url: atlasUrl.href,
  viewport: { width: 393, height: 852 },
  network_profile: networkProfile,
  golden_repd_ref: repdRef,
  pipeline,
  atlas: atlasState,
  tolerated_receiver_errors: toleratedErrors,
  tolerated_receiver_failures: toleratedFailures,
  unexpected_receiver_errors: unexpectedErrors,
  unexpected_receiver_failures: unexpectedFailures,
  route_interceptions: 0,
  synthetic_receiver: false,
  privacy: 'NO_PERSONAL_DATA',
};
await fs.mkdir(output.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await fs.writeFile(output, JSON.stringify(proof, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(proof));
await browser.close();
