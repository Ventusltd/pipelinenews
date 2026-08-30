import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const value = flag => {
  const index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) throw new Error(`${flag} is required`);
  return args[index + 1];
};

const candidate = value('--candidate');
const output = value('--output');
const repdRef = '13599';
const expectedAtlas = `https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/?repd_ref=${repdRef}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
const pipelineErrors = [];
const pipelineFailures = [];
page.on('pageerror', error => pipelineErrors.push(String(error?.message || error)));
page.on('console', message => { if (message.type() === 'error') pipelineErrors.push(message.text()); });
page.on('requestfailed', request => pipelineFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));

const probe = new URL(candidate);
probe.searchParams.set('repd_ref', repdRef);
await page.goto(probe.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => document.body?.dataset?.fastReady === 'true', null, { timeout: 90000 });
await page.waitForSelector(`#repd-${repdRef}`, { timeout: 30000 });
await page.waitForFunction(({ rowId, expected }) => {
  const anchor = document.getElementById(rowId)?.querySelector('a.atlaslink[href]');
  return anchor?.href === expected;
}, { rowId: `repd-${repdRef}`, expected: expectedAtlas }, { timeout: 30000 });

const pipeline = await page.evaluate(({ rowId, expected }) => {
  const row = document.getElementById(rowId);
  const links = [...document.querySelectorAll('a[href*="repd_ref="]')].map(anchor => anchor.href);
  return {
    url: location.href,
    release_id: document.body.dataset.releaseId,
    fast_ready: document.body.dataset.fastReady,
    search_value: document.querySelector('#search')?.value || null,
    filtered_count: document.querySelector('#resultsMeta')?.dataset?.filteredCount || null,
    row_text: row?.textContent?.replace(/\s+/gu, ' ').trim() || null,
    atlas_href: row?.querySelector('a.atlaslink[href]')?.href || null,
    generated_links: links,
    runtime: globalThis.__PIPELINENEWS_FAST__ ? JSON.parse(JSON.stringify(globalThis.__PIPELINENEWS_FAST__)) : null,
    expected
  };
}, { rowId: `repd-${repdRef}`, expected: expectedAtlas });

if (pipeline.atlas_href !== expectedAtlas) throw new Error(`Atlas href mismatch: ${pipeline.atlas_href}`);
if (pipeline.generated_links.length !== 1) throw new Error(`expected one Atlas link, found ${pipeline.generated_links.length}`);
if (pipeline.search_value !== repdRef || pipeline.filtered_count !== '1') throw new Error('exact REPD filter did not resolve one row');
if (pipeline.runtime?.searchRequests !== 0 || pipeline.runtime?.searchReady !== false) throw new Error('exact REPD route touched broad search');
if (pipelineErrors.length || pipelineFailures.length) throw new Error(`Pipeline browser errors: ${JSON.stringify({ pipelineErrors, pipelineFailures })}`);

const receiver = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
const receiverErrors = [];
const receiverFailures = [];
receiver.on('pageerror', error => receiverErrors.push(String(error?.message || error)));
receiver.on('console', message => { if (message.type() === 'error') receiverErrors.push(message.text()); });
receiver.on('requestfailed', request => receiverFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));
await receiver.goto(expectedAtlas, { waitUntil: 'domcontentloaded', timeout: 90000 });
await receiver.waitForSelector('.dashboard', { timeout: 90000 });
await receiver.waitForSelector('#map canvas', { timeout: 90000 });
await receiver.waitForFunction(ref => window.__GRIDATLAS_PLACE_SEARCH__?.deep_link?.status === 'RESOLVED'
  && window.__GRIDATLAS_PLACE_SEARCH__?.deep_link?.repd_ref === ref
  && window.__GRIDATLAS_PLACE_SEARCH__?.deep_link?.mapped === true, repdRef, { timeout: 150000 });

const atlas = await receiver.evaluate(ref => ({
  url: location.href,
  body_text: document.body.innerText,
  deep_link: JSON.parse(JSON.stringify(window.__GRIDATLAS_PLACE_SEARCH__?.deep_link || null)),
  last_selection: JSON.parse(JSON.stringify(window.__GRIDATLAS_PLACE_SEARCH__?.last_selection || null)),
  popup_text: document.querySelector('.maplibregl-popup')?.innerText || '',
  body_dataset: { ...document.body.dataset },
  ref_visible: document.body.innerText.includes(ref)
}), repdRef);

const known = receiverErrors.filter(message => message.includes('[V9 DEEP LINK FAILED] Error: canonical project technology is invalid') && message.includes('ventus-corev8engine.js'));
const unexpected = receiverErrors.filter(message => !known.includes(message));
if (atlas.url !== expectedAtlas) throw new Error(`Atlas URL changed: ${atlas.url}`);
if (!atlas.ref_visible || !atlas.body_text.includes('Beacon Fen Energy Park')) throw new Error('Atlas did not render Beacon Fen identity');
if (atlas.deep_link?.repd_ref !== repdRef || atlas.deep_link?.mapped !== true) throw new Error('Atlas exact receiver did not map Beacon Fen');
if (known.length > 1 || unexpected.length || receiverFailures.length) throw new Error(`Atlas browser errors: ${JSON.stringify({ known, unexpected, receiverFailures })}`);

const proof = {
  schema: 'pipelinenews.pages-exact-atlas-readback.v1',
  classification: 'VERIFIED_PIPELINENEWS_PAGES_EXACT_ATLAS_READBACK',
  candidate_url: candidate,
  pipeline_probe_url: probe.href,
  atlas_url: expectedAtlas,
  golden_repd_ref: repdRef,
  pipeline,
  atlas,
  known_receiver_errors: known,
  unexpected_receiver_errors: unexpected,
  route_interceptions: 0,
  synthetic_receiver: false,
  privacy: 'NO_PERSONAL_DATA'
};
await fs.mkdir(output.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await fs.writeFile(output, JSON.stringify(proof, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(proof));
await browser.close();
