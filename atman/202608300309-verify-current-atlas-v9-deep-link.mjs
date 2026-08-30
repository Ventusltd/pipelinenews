// Activated for verified GridAtlas generation 202608300453.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const pipelineUrl = process.env.PIPELINE_URL;
const atlasUrl = process.env.ATLAS_URL;
const goldenRepdRef = process.env.GOLDEN_REPD_REF || '9873';
const mode = process.env.MODE || 'local';
const output = process.env.OUTPUT || `work/202608300309-${mode}-atlas-deep-link-proof.json`;
const diagnosticOutput = output.replace(/\.json$/u, '-diagnostic.json');
const failureScreenshot = output.replace(/\.json$/u, '-failure.png');

if (!pipelineUrl || !atlasUrl) throw new Error('PIPELINE_URL and ATLAS_URL are required');
if (!/^\d+$/u.test(goldenRepdRef)) throw new Error('GOLDEN_REPD_REF is invalid');

const expected = `${atlasUrl}?repd_ref=${goldenRepdRef}`;
const pipelineProbe = new URL(pipelineUrl);
pipelineProbe.searchParams.set('repd_ref', goldenRepdRef);
const goldenRowId = `repd-${goldenRepdRef}`;
const pipelineOrigin = pipelineProbe.origin;
const atlasOrigin = new URL(atlasUrl).origin;
const viewport = mode === 'public' ? { width: 390, height: 844 } : { width: 1440, height: 900 };

async function writeJson(path, value) {
  await fs.mkdir(path.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  await fs.writeFile(path, JSON.stringify(value, null, 2) + '\n');
}

async function pageDiagnostics(page) {
  try {
    return await page.evaluate(() => ({
      url: location.href,
      body_dataset: { ...document.body?.dataset },
      release_meta: document.querySelector('#releaseMeta')?.textContent?.trim() || null,
      results_meta: document.querySelector('#resultsMeta')?.textContent?.trim() || null,
      filtered_count: document.querySelector('#resultsMeta')?.dataset?.filteredCount || null,
      total_count: document.querySelector('#resultsMeta')?.dataset?.totalCount || null,
      search_value: document.querySelector('#search')?.value || null,
      tbody_rows: document.querySelectorAll('#tbody tr').length,
      row_ids: [...document.querySelectorAll('#tbody tr[id]')].slice(0, 12).map(row => row.id),
      tbody_text: document.querySelector('#tbody')?.textContent?.replace(/\s+/gu, ' ').trim().slice(0, 1200) || null,
      runtime: globalThis.__PIPELINENEWS_FAST__
        ? JSON.parse(JSON.stringify(globalThis.__PIPELINENEWS_FAST__))
        : null,
    }));
  } catch (error) {
    return { diagnostic_error: String(error?.message || error) };
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport, serviceWorkers: 'block' });
const consoleErrors = [];
const requestFailures = [];
const httpErrors = [];
let dataBoundary = null;
let moduleBoundary = null;

page.on('pageerror', error => consoleErrors.push(`pageerror:${String(error?.message || error)}`));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(`console:${message.text()}`);
});
page.on('requestfailed', request => {
  const url = new URL(request.url());
  if (url.origin !== pipelineOrigin) return;
  requestFailures.push({
    url: request.url(),
    method: request.method(),
    failure: request.failure()?.errorText || 'unknown',
  });
});
page.on('response', response => {
  const url = new URL(response.url());
  if (url.origin === pipelineOrigin && response.status() >= 400 && !url.pathname.endsWith('/favicon.ico')) {
    httpErrors.push({ url: response.url(), status: response.status() });
  }
});

try {
  await page.goto(pipelineProbe.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#search', { timeout: 90000 });

  dataBoundary = await page.evaluate(async (repdRef) => {
    const registryUrl = new URL('data/202608291447-registry.json', document.baseURI);
    const registryResponse = await fetch(registryUrl, { cache: 'no-store' });
    if (!registryResponse.ok) throw new Error(`registry HTTP ${registryResponse.status}`);
    const registry = await registryResponse.json();

    const projectsUrl = new URL(registry.assets.projects.path, document.baseURI);
    const projectsResponse = await fetch(projectsUrl, { cache: 'no-store' });
    if (!projectsResponse.ok) throw new Error(`projects HTTP ${projectsResponse.status}`);
    const projects = await projectsResponse.json();

    const rowIndex = projects.rows.findIndex(row => String(row[0]) === repdRef);
    const row = rowIndex >= 0 ? projects.rows[rowIndex] : null;
    const dictionary = (name, index) => projects.dictionaries?.[name]?.[index] ?? '';
    const record = row ? {
      repd_ref: row[0],
      gg_project_id: row[1],
      name: row[2],
      technology: dictionary('technology', row[3]),
      status: dictionary('status', row[4]),
      capacity_mw: Number(row[5]),
      county: dictionary('county', row[6]),
      region: dictionary('region', row[7]),
      operator: dictionary('operator', row[8]),
      repd_record_updated: row[9],
      geometry_status: dictionary('geometry_status', row[10]),
      latitude: row[11],
      longitude: row[12],
    } : null;

    return {
      registry_url: registryUrl.href,
      projects_url: projectsUrl.href,
      registry_schema: registry.schema,
      projects_schema: projects.schema,
      project_count: projects.rows.length,
      row_index: rowIndex,
      record,
    };
  }, goldenRepdRef);

  if (dataBoundary.row_index < 0 || !dataBoundary.record) {
    throw new Error(`REPD ${goldenRepdRef} is absent from the compact project index`);
  }
  if (dataBoundary.record.geometry_status !== 'valid') {
    throw new Error(`REPD ${goldenRepdRef} geometry is not eligible: ${dataBoundary.record.geometry_status}`);
  }

  moduleBoundary = await page.evaluate(async ({ repdRef, expectedUrl, record }) => {
    const moduleUrl = new URL('assets/202608291447-atlas-pointer-deep-link.mjs', document.baseURI);
    const cartridge = await import(`${moduleUrl.href}?proof=${Date.now()}`);
    const actual = cartridge.buildAtlasV9DeepLink(record);
    return {
      module_url: moduleUrl.href,
      repd_ref: repdRef,
      expected_url: expectedUrl,
      actual_url: actual,
      contract_schema: cartridge.ATLAS_V9_DEEP_LINK_CONTRACT?.schema || null,
      identity_anchor: cartridge.ATLAS_V9_DEEP_LINK_CONTRACT?.identity_anchor || null,
      receiver_release_id: cartridge.ATLAS_V9_DEEP_LINK_CONTRACT?.receiver?.release_id || null,
    };
  }, { repdRef: goldenRepdRef, expectedUrl: expected, record: dataBoundary.record });

  if (moduleBoundary.actual_url !== expected) {
    throw new Error(`deep-link cartridge mismatch: ${moduleBoundary.actual_url}`);
  }
  if (moduleBoundary.identity_anchor !== 'repd_ref') {
    throw new Error(`deep-link identity anchor changed: ${moduleBoundary.identity_anchor}`);
  }

  await page.waitForFunction(
    () => document.body?.dataset?.fastReady === 'true' || document.body?.dataset?.fastFailed === 'true',
    null,
    { timeout: 90000 }
  );

  const readiness = await pageDiagnostics(page);
  if (readiness.body_dataset?.fastFailed === 'true') {
    throw new Error(`PipelineNews failed closed: ${JSON.stringify(readiness)}`);
  }
  if (readiness.body_dataset?.fastReady !== 'true') {
    throw new Error(`PipelineNews did not reach fast-ready: ${JSON.stringify(readiness)}`);
  }

  await page.waitForSelector(`#${goldenRowId}`, { state: 'attached', timeout: 30000 });
  await page.waitForFunction(
    ({ expectedUrl, rowId }) => {
      const row = document.getElementById(rowId);
      const anchor = row?.querySelector('a.atlaslink[href]');
      return anchor?.href === expectedUrl;
    },
    { expectedUrl: expected, rowId: goldenRowId },
    { timeout: 30000 }
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
      runtime: globalThis.__PIPELINENEWS_FAST__
        ? JSON.parse(JSON.stringify(globalThis.__PIPELINENEWS_FAST__))
        : null,
    };
  }, { expectedUrl: expected, rowId: goldenRowId });

  if (evidence.golden_href !== expected) throw new Error(`golden link mismatch: ${evidence.golden_href}`);
  if (evidence.generated_links.length !== 1) {
    throw new Error(`exact REPD route rendered ${evidence.generated_links.length} Atlas links`);
  }
  if (evidence.generated_links.some(link => !link.startsWith(atlasUrl))) {
    throw new Error('a rendered project link points to a stale Atlas receiver');
  }
  if (!evidence.row_text?.includes(goldenRepdRef)) {
    throw new Error('golden project row does not preserve its REPD identity');
  }
  if (evidence.search_value !== goldenRepdRef || evidence.filtered_count !== '1') {
    throw new Error(`exact REPD filter did not resolve one row: ${JSON.stringify(evidence)}`);
  }
  if (evidence.runtime?.searchRequests !== 0 || evidence.runtime?.searchReady !== false) {
    throw new Error(`exact REPD route touched the broad search supplement: ${JSON.stringify(evidence.runtime)}`);
  }
  if (consoleErrors.length || requestFailures.length || httpErrors.length) {
    throw new Error(`PipelineNews browser errors: ${JSON.stringify({ consoleErrors, requestFailures, httpErrors })}`);
  }

  const receiver = await browser.newPage({ viewport, serviceWorkers: 'block' });
  const receiverErrors = [];
  const receiverFailures = [];
  receiver.on('pageerror', error => receiverErrors.push(`pageerror:${String(error?.message || error)}`));
  receiver.on('console', message => {
    if (message.type() === 'error') receiverErrors.push(`console:${message.text()}`);
  });
  receiver.on('requestfailed', request => {
    const url = new URL(request.url());
    if (url.origin !== atlasOrigin) return;
    receiverFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown',
    });
  });

  await receiver.goto(expected, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await receiver.waitForSelector('.dashboard', { timeout: 90000 });
  await receiver.waitForSelector('#map canvas', { timeout: 90000 });
  await receiver.waitForFunction(
    repdRef => document.body?.innerText?.includes(repdRef),
    goldenRepdRef,
    { timeout: 90000 }
  );

  const receiverEvidence = await receiver.evaluate(repdRef => ({
    url: location.href,
    dashboard: !!document.querySelector('.dashboard'),
    map_canvas: !!document.querySelector('#map canvas'),
    repd_identity_visible: document.body?.innerText?.includes(repdRef) || false,
    matching_text: [...document.querySelectorAll('body *')]
      .filter(element => element.children.length === 0 && element.textContent?.includes(repdRef))
      .slice(0, 8)
      .map(element => element.textContent.trim()),
    fatal_banner_visible: (() => {
      const element = document.querySelector('#fatal-banner');
      return !!element && getComputedStyle(element).display !== 'none';
    })(),
  }), goldenRepdRef);

  if (receiverEvidence.url !== expected) throw new Error(`receiver URL changed: ${receiverEvidence.url}`);
  if (!receiverEvidence.dashboard || !receiverEvidence.map_canvas) throw new Error('Atlas receiver surface is absent');
  if (!receiverEvidence.repd_identity_visible) throw new Error('Atlas receiver did not expose the requested REPD identity');
  if (receiverEvidence.fatal_banner_visible) throw new Error('Atlas receiver fatal banner is visible');
  if (receiverErrors.length || receiverFailures.length) {
    throw new Error(`Atlas receiver errors: ${JSON.stringify({ receiverErrors, receiverFailures })}`);
  }

  const proof = {
    schema: 'pipelinenews.current-atlas-v9-browser-proof.v3',
    classification: mode === 'public'
      ? 'VERIFIED_PUBLIC_PIPELINENEWS_ATLAS_V9_DEEP_LINK'
      : 'VERIFIED_LOCAL_PIPELINENEWS_ATLAS_V9_DEEP_LINK',
    mode,
    pipeline_url: pipelineUrl,
    pipeline_probe_url: pipelineProbe.href,
    atlas_base_url: atlasUrl,
    golden_repd_ref: goldenRepdRef,
    expected_url: expected,
    data_boundary: dataBoundary,
    module_boundary: moduleBoundary,
    pipeline: evidence,
    receiver: receiverEvidence,
    errors: [],
    route_interceptions: 0,
    synthetic_receiver: false,
    broad_search_supplement_requests: 0,
  };
  await writeJson(output, proof);
  console.log(JSON.stringify({
    classification: proof.classification,
    expected,
    project_row_index: dataBoundary.row_index,
    generated_links: evidence.generated_links.length,
    broad_search_supplement_requests: 0,
  }));
} catch (error) {
  const diagnostic = {
    schema: 'pipelinenews.current-atlas-v9-browser-diagnostic.v1',
    classification: 'PIPELINENEWS_ATLAS_V9_DEEP_LINK_FAILURE',
    mode,
    error: String(error?.stack || error?.message || error),
    pipeline_url: pipelineUrl,
    pipeline_probe_url: pipelineProbe.href,
    expected_url: expected,
    data_boundary: dataBoundary,
    module_boundary: moduleBoundary,
    ui: await pageDiagnostics(page),
    console_errors: consoleErrors,
    request_failures: requestFailures,
    http_errors: httpErrors,
  };
  await writeJson(diagnosticOutput, diagnostic);
  try {
    await page.screenshot({ path: failureScreenshot, fullPage: true });
  } catch {}
  console.error(JSON.stringify(diagnostic));
  throw error;
} finally {
  await browser.close();
}
