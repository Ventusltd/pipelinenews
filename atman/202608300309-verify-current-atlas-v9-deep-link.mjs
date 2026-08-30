import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const pipelineUrl = process.env.PIPELINE_URL;
const atlasUrl = process.env.ATLAS_URL;
const goldenRepdRef = process.env.GOLDEN_REPD_REF || '16135';
const mode = process.env.MODE || 'local';
const output = process.env.OUTPUT || `work/202608300309-${mode}-atlas-deep-link-proof.json`;

if (!pipelineUrl || !atlasUrl) throw new Error('PIPELINE_URL and ATLAS_URL are required');
if (!/^\d+$/u.test(goldenRepdRef)) throw new Error('GOLDEN_REPD_REF is invalid');

const expected = `${atlasUrl}?repd_ref=${goldenRepdRef}`;
const pipelineProbe = new URL(pipelineUrl);
pipelineProbe.searchParams.set('repd_ref', goldenRepdRef);
const goldenRowId = `repd-${goldenRepdRef}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: mode === 'public' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  serviceWorkers: 'block'
});
const errors = [];
page.on('pageerror', error => errors.push(`pageerror:${String(error?.message || error)}`));
page.on('console', message => {
  if (message.type() === 'error') errors.push(`console:${message.text()}`);
});

try {
  await page.goto(pipelineProbe.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#search', { timeout: 90000 });
  await page.waitForSelector(`#${goldenRowId}`, { timeout: 90000 });
  await page.waitForFunction(
    ({ expectedUrl, rowId }) => {
      const row = document.getElementById(rowId);
      const anchor = row?.querySelector('a.atlaslink[href]');
      return anchor?.href === expectedUrl;
    },
    { expectedUrl: expected, rowId: goldenRowId },
    { timeout: 90000 }
  );

  const evidence = await page.evaluate(({ expectedUrl, rowId }) => {
    const anchors = [...document.querySelectorAll('a[href*="repd_ref="]')];
    const row = document.getElementById(rowId);
    const golden = row?.querySelector('a.atlaslink[href]') || null;
    return {
      probe_url: location.href,
      generated_links: anchors.map(anchor => anchor.href),
      golden_href: golden?.href || null,
      golden_text: golden?.textContent?.trim() || null,
      row_text: row?.textContent?.replace(/\s+/gu, ' ').trim() || null,
      release_id: document.body?.dataset?.releaseId || null,
      generation: document.body?.dataset?.fastGeneration || null,
      search_value: document.querySelector('#search')?.value || null,
      filtered_count: document.querySelector('#resultsMeta')?.dataset?.filteredCount || null,
      expected_url: expectedUrl,
    };
  }, { expectedUrl: expected, rowId: goldenRowId });

  if (evidence.golden_href !== expected) throw new Error(`golden link mismatch: ${evidence.golden_href}`);
  if (!evidence.generated_links.length) throw new Error('no PipelineNews Atlas links were rendered');
  if (evidence.generated_links.some(link => !link.startsWith(atlasUrl))) {
    throw new Error('a rendered project link points to a stale Atlas receiver');
  }
  if (!evidence.row_text?.includes(goldenRepdRef)) {
    throw new Error('golden project row does not preserve its REPD identity');
  }
  if (evidence.search_value !== goldenRepdRef || evidence.filtered_count !== '1') {
    throw new Error(`exact REPD filter did not resolve one row: ${JSON.stringify(evidence)}`);
  }
  if (errors.length) throw new Error(`PipelineNews browser errors: ${JSON.stringify(errors)}`);

  const receiver = await browser.newPage({
    viewport: mode === 'public' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    serviceWorkers: 'block'
  });
  const receiverErrors = [];
  receiver.on('pageerror', error => receiverErrors.push(`pageerror:${String(error?.message || error)}`));
  await receiver.goto(expected, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await receiver.waitForSelector('.dashboard', { timeout: 90000 });
  await receiver.waitForSelector('#map canvas', { timeout: 90000 });
  const receiverEvidence = await receiver.evaluate(() => ({
    url: location.href,
    dashboard: !!document.querySelector('.dashboard'),
    map_canvas: !!document.querySelector('#map canvas'),
    fatal_banner_visible: (() => {
      const element = document.querySelector('#fatal-banner');
      return !!element && getComputedStyle(element).display !== 'none';
    })(),
  }));
  if (receiverEvidence.url !== expected) throw new Error(`receiver URL changed: ${receiverEvidence.url}`);
  if (!receiverEvidence.dashboard || !receiverEvidence.map_canvas) throw new Error('Atlas receiver surface is absent');
  if (receiverEvidence.fatal_banner_visible) throw new Error('Atlas receiver fatal banner is visible');
  if (receiverErrors.length) throw new Error(`Atlas receiver errors: ${JSON.stringify(receiverErrors)}`);

  const proof = {
    schema: 'pipelinenews.current-atlas-v9-browser-proof.v2',
    classification: mode === 'public'
      ? 'VERIFIED_PUBLIC_PIPELINENEWS_ATLAS_V9_DEEP_LINK'
      : 'VERIFIED_LOCAL_PIPELINENEWS_ATLAS_V9_DEEP_LINK',
    mode,
    pipeline_url: pipelineUrl,
    pipeline_probe_url: pipelineProbe.href,
    atlas_base_url: atlasUrl,
    golden_repd_ref: goldenRepdRef,
    expected_url: expected,
    pipeline: evidence,
    receiver: receiverEvidence,
    errors: [],
    route_interceptions: 0,
    synthetic_receiver: false,
  };
  await fs.mkdir(output.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  await fs.writeFile(output, JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify({ classification: proof.classification, expected, generated_links: evidence.generated_links.length }));
} finally {
  await browser.close();
}
