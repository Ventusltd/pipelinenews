import assert from "node:assert/strict";
import { chromium } from "playwright";

const GENERATION = "202608270844";
const EXPECTED_PROJECTS = 7680;
const MAX_PROJECT_ROWS = 50;
const MAX_NEWS_ROWS = 30;
const MAX_DOM_ELEMENTS = 5000;
const MAX_INITIAL_DECODED_BYTES = 2_000_000;
const MAX_LONG_TASK_MS = 200;
const MAX_NODE_GROWTH = 1.10;
const MAX_DETAIL_CONCURRENCY = 4;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function percentile(values, fraction) {
  assert.ok(values.length, "cannot calculate a percentile for an empty sample");
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)];
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

function isDetailUrl(url) {
  return /\/data\/projects\/202608261927-project-partition-v9-1-\d{2}\.json(?:[?#]|$)/.test(url);
}

function isOptionalUrl(url) {
  return isDetailUrl(url)
    || /-v8-fast-(?:search|news)\.json(?:[?#]|$)/.test(url)
    || /\/vendor\/202608261927-chart-umd\.min\.js(?:[?#]|$)/.test(url);
}

function observeNetwork(page) {
  const state = {
    errors: [],
    detailActive: new Set(),
    detailMaximum: 0,
    detailUrls: new Set(),
  };

  page.on("console", (message) => {
    if (message.type() === "error") state.errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => state.errors.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) state.errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on("request", (request) => {
    if (!isDetailUrl(request.url())) return;
    state.detailActive.add(request);
    state.detailUrls.add(request.url());
    state.detailMaximum = Math.max(state.detailMaximum, state.detailActive.size);
  });
  const finish = (request) => state.detailActive.delete(request);
  page.on("requestfinished", finish);
  page.on("requestfailed", (request) => {
    finish(request);
    state.errors.push(`request: ${request.url()} (${request.failure()?.errorText || "failed"})`);
  });
  return state;
}

async function installPerformanceObservers(context) {
  await context.addInitScript(() => {
    const state = {
      ready: null,
      longTasks: [],
      ordinaryStart: null,
      ordinaryEnd: null,
    };
    globalThis.__FAST_BROWSER_VERIFY__ = state;
    if (typeof PerformanceObserver === "function"
      && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    }
    globalThis.addEventListener("pipelinenews-fast-ready", () => {
      const entryRecord = (entry) => ({
        name: entry.name,
        entryType: entry.entryType,
        initiatorType: entry.initiatorType || "navigation",
        decodedBodySize: Number(entry.decodedBodySize || 0),
        encodedBodySize: Number(entry.encodedBodySize || 0),
        transferSize: Number(entry.transferSize || 0),
        startTime: Number(entry.startTime || 0),
      });
      state.ready = {
        at: performance.now(),
        entries: [
          ...performance.getEntriesByType("navigation").map(entryRecord),
          ...performance.getEntriesByType("resource").map(entryRecord),
        ],
      };
    }, { once: true });
  });
}

async function retainedNodeCount(page, client) {
  try {
    await client.send("HeapProfiler.collectGarbage");
    const { metrics } = await client.send("Performance.getMetrics");
    const nodes = metrics.find((metric) => metric.name === "Nodes")?.value;
    if (Number.isFinite(nodes) && nodes > 0) return { count: nodes, source: "cdp-performance-nodes" };
  } catch {
    // A live DOM count is a conservative fallback when the CDP metric is unavailable.
  }
  return { count: await page.locator("*").count(), source: "live-dom-elements" };
}

async function clearProjectFilters(page) {
  await page.evaluate(() => document.getElementById("clearFilters").click());
  await page.waitForFunction((expected) => (
    document.getElementById("resultsMeta")?.dataset.filteredCount === String(expected)
  ), EXPECTED_PROJECTS);
}

async function exerciseSearch(page) {
  const before = await page.evaluate(() => ({ ...globalThis.__PIPELINENEWS_FAST__ }));
  assert.equal(before.searchReady, false, "search cartridge loaded before first non-empty search");
  assert.equal(before.searchRequests, 0, "search cartridge was requested before activation");

  await page.locator("#search").fill("EN010151");
  await page.waitForFunction(() => (
    globalThis.__PIPELINENEWS_FAST__?.searchReady === true
      && document.getElementById("resultsMeta")?.dataset.filteredCount !== undefined
      && document.getElementById("resultsMeta")?.textContent !== "loading complete planning/reference search index…"
  ), null, { timeout: 30_000 });
  const result = await page.evaluate(() => ({
    count: Number(document.getElementById("resultsMeta").dataset.filteredCount),
    rowIds: [...document.querySelectorAll("#tbody > tr")].map((row) => row.id),
    text: document.getElementById("tbody").textContent,
    evidence: { ...globalThis.__PIPELINENEWS_FAST__ },
  }));
  assert.ok(result.count >= 1, "Beacon Fen planning-reference search returned no projects");
  assert.ok(result.rowIds.includes("repd-13599"), "Beacon Fen REPD 13599 was not reachable by planning reference EN010151");
  assert.match(result.text, /Beacon Fen/i, "Beacon Fen project name is absent from the search result");
  assert.equal(result.evidence.searchRequests, 1, "search cartridge must be promise-deduplicated");
  await clearProjectFilters(page);
  return { query: "EN010151", result_count: result.count, repd_ref: "13599" };
}

async function exerciseNewsAndCharts(page) {
  await page.waitForFunction(() => (
    globalThis.__PIPELINENEWS_FAST__?.newsReady === true
      && globalThis.__PIPELINENEWS_FAST__?.chartsReady === true
  ), null, { timeout: 30_000 });
  const initial = await page.evaluate(() => ({
    storyCount: document.querySelectorAll("#stories > .story").length,
    meta: document.getElementById("newsMeta").textContent,
    more: document.getElementById("newsMore")?.textContent || "",
    evidence: { ...globalThis.__PIPELINENEWS_FAST__ },
    chartApi: typeof globalThis.Chart,
    chartCount: ["g1", "g2", "g3"].filter((id) => globalThis.Chart?.getChart?.(id)).length,
  }));
  assert.equal(initial.storyCount, MAX_NEWS_ROWS, "initial newspaper window must contain exactly 30 headlines");
  assert.match(initial.meta, /47 UK.*19 international.*136 headlines/i, "news metadata parity changed");
  assert.match(initial.more, /136 MATCHES/i, "all 136 headlines are not reachable through progressive news loading");
  assert.equal(initial.evidence.newsRequests, 1, "news cartridge must be requested once");
  assert.equal(initial.chartApi, "function", "pinned Chart.js did not become available lazily");
  assert.equal(initial.chartCount, 3, "all three lazy gauges were not initialised");

  const articleIds = new Set();
  let newsPages = 0;
  for (; newsPages < 10; newsPages += 1) {
    const pageState = await page.evaluate(() => ({
      ids: [...document.querySelectorAll("#stories > .story")].map((story) => story.dataset.articleId),
      nextDisabled: document.getElementById("newsMore")?.disabled,
    }));
    assert.ok(pageState.ids.length > 0 && pageState.ids.length <= MAX_NEWS_ROWS, `news page ${newsPages + 1} exceeds the 30-card window`);
    assert.ok(pageState.ids.every(Boolean), `news page ${newsPages + 1} has a missing article ID`);
    for (const articleId of pageState.ids) articleIds.add(articleId);
    if (pageState.nextDisabled) break;
    assert.notEqual(pageState.nextDisabled, undefined, "news NEXT control is missing");
    await page.locator("#newsMore").click();
  }
  assert.ok(newsPages < 10, "news pagination failed to terminate");
  assert.equal(articleIds.size, 136, "not every compact headline is reachable through bounded news pagination");
  for (const articleId of [
    "GG2050-NEWS-B4B91FD3DA8F596C",
    "GG2050-NEWS-C3D0A5910F32E821",
    "GG2050-NEWS-0E813A86D54E39FC",
  ]) assert.ok(articleIds.has(articleId), `approved BBC article is not reachable: ${articleId}`);
  while (!await page.locator("#newsPrevious").isDisabled()) await page.locator("#newsPrevious").click();

  await page.locator("#newsSearch").fill("Beacon Fen");
  const beacon = await page.evaluate(() => ({
    storyCount: document.querySelectorAll("#stories > .story").length,
    text: document.getElementById("stories").textContent,
  }));
  assert.ok(beacon.storyCount >= 1 && beacon.storyCount <= MAX_NEWS_ROWS, "Beacon Fen headline search did not respect the news window");
  assert.match(beacon.text, /Beacon Fen/i, "Beacon Fen is absent from the compact newspaper search");
  assert.match(beacon.text, /Windsock Solar Farm/i, "Beacon Fen search did not surface the Windsock editorial-context article");
  assert.match(beacon.text, /RELATED CONTEXT ONLY — NOT A PROJECT BINDING/u, "Windsock context was not clearly labelled as non-binding");

  await page.locator("#newsSearch").fill("East Pye");
  const eastPye = await page.evaluate(() => ({
    storyCount: document.querySelectorAll("#stories > .story").length,
    text: document.getElementById("stories").textContent,
  }));
  assert.ok(eastPye.storyCount >= 1 && eastPye.storyCount <= MAX_NEWS_ROWS, "East Pye headline search did not respect the news window");
  assert.match(eastPye.text, /Huge Norfolk solar farm near Long Stratton set to cost £1bn/u, "East Pye BBC headline is absent");
  assert.match(eastPye.text, /REPD 20670.*official capacity unknown.*no project signal/is, "East Pye related BESS safeguards are absent");
  await page.locator("#newsSearch").fill("");
  assert.equal(await page.locator("#stories > .story").count(), MAX_NEWS_ROWS);

  return {
    headline_count: 136,
    reachable_headlines: articleIds.size,
    pages: newsPages + 1,
    initial_physical_rows: initial.storyCount,
    beacon_fen_matches: beacon.storyCount,
    east_pye_matches: eastPye.storyCount,
    news_requests: initial.evidence.newsRequests,
    chart_count: initial.chartCount,
  };
}

async function measureInteractions(page, gateMs) {
  await clearProjectFilters(page);
  const measuredSelect = (value) => page.evaluate((nextValue) => {
    const select = document.getElementById("sortProjects");
    select.value = nextValue;
    const started = performance.now();
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return performance.now() - started;
  }, value);
  const measuredTechnology = (value) => page.evaluate((nextValue) => {
    const button = document.querySelector(`#tech [data-technology="${nextValue}"]`);
    const started = performance.now();
    button.click();
    return performance.now() - started;
  }, value);

  await measuredSelect("updated_desc");
  await measuredSelect("capacity_desc");
  await measuredTechnology("solar");
  await measuredTechnology("all");

  const sortSamples = [];
  const filterSamples = [];
  for (let index = 0; index < 6; index += 1) {
    sortSamples.push(await measuredSelect(index % 2 ? "updated_desc" : "updated_asc"));
  }
  await measuredSelect("capacity_desc");
  for (let index = 0; index < 6; index += 1) {
    filterSamples.push(await measuredTechnology(index % 2 ? "all" : "solar"));
  }
  await measuredTechnology("all");

  const sortP75 = percentile(sortSamples, 0.75);
  const filterP75 = percentile(filterSamples, 0.75);
  assert.ok(sortP75 <= gateMs, `sort p75 ${rounded(sortP75)}ms exceeds ${gateMs}ms interaction gate`);
  assert.ok(filterP75 <= gateMs, `filter p75 ${rounded(filterP75)}ms exceeds ${gateMs}ms interaction gate`);
  return {
    gate_ms: gateMs,
    percentile: "p75-of-6-after-warmup",
    sort_ms: sortSamples.map(rounded),
    sort_p75_ms: rounded(sortP75),
    filter_ms: filterSamples.map(rounded),
    filter_p75_ms: rounded(filterP75),
  };
}

async function exerciseReachability(page) {
  await clearProjectFilters(page);
  const ids = new Set();
  let pages = 0;
  let maximumRows = 0;
  let maximumDomElements = 0;
  for (; pages < 200; pages += 1) {
    const state = await page.evaluate(() => {
      const projectRows = [...document.querySelectorAll("#tbody > tr")];
      const next = document.querySelector('[data-window="next"]');
      return {
        ids: projectRows.map((row) => row.id),
        rowCount: projectRows.length,
        domElements: document.querySelectorAll("*").length,
        nextDisabled: next?.disabled,
      };
    });
    assert.ok(state.rowCount > 0 && state.rowCount <= MAX_PROJECT_ROWS, `page ${pages + 1} has ${state.rowCount} physical rows`);
    maximumRows = Math.max(maximumRows, state.rowCount);
    maximumDomElements = Math.max(maximumDomElements, state.domElements);
    for (const id of state.ids) ids.add(id);
    if (state.nextDisabled) break;
    assert.notEqual(state.nextDisabled, undefined, "NEXT 50 control is missing");
    await page.evaluate(() => document.querySelector('[data-window="next"]').click());
  }
  assert.ok(pages < 200, "project pagination failed to terminate");
  assert.equal(ids.size, EXPECTED_PROJECTS, "not every canonical project is reachable through bounded pagination");
  assert.ok(maximumDomElements <= MAX_DOM_ELEMENTS, `pagination DOM reached ${maximumDomElements} elements`);
  return {
    unique_projects: ids.size,
    pages: pages + 1,
    maximum_physical_rows: maximumRows,
    maximum_dom_elements: maximumDomElements,
  };
}

async function exerciseDetailAndExport(page, network, exportAll) {
  await clearProjectFilters(page);
  const before = await page.evaluate(() => ({ ...globalThis.__PIPELINENEWS_FAST__ }));
  assert.equal(before.detailRequests, 0, "detail partitions loaded before a detail/export activation");
  await page.locator("#tbody details.project-record summary").first().click();
  await page.waitForFunction(() => document.querySelector("#tbody details.project-record")?.dataset.loaded === "true", null, { timeout: 30_000 });
  const detail = await page.evaluate(() => ({
    text: document.querySelector("#tbody details.project-record .record-grid").textContent,
    evidence: { ...globalThis.__PIPELINENEWS_FAST__ },
  }));
  assert.match(detail.text, /PLANNING AUTHORITY.*PLANNING REF.*DEVELOPMENT ID/s, "lazy official project details are incomplete");
  assert.equal(detail.evidence.detailRequests, 1, "opening one record should load exactly one detail partition");

  let downloadName = null;
  if (exportAll) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 90_000 }),
      page.locator("#exportInline").click(),
    ]);
    downloadName = download.suggestedFilename();
    await download.path();
    await page.waitForFunction(() => /7,680 filtered records exported/.test(document.getElementById("exportMeta")?.textContent || ""), null, { timeout: 30_000 });
    assert.match(downloadName, /^globalgrid2050_uk_renewables_pipeline_v8_fast_\d{4}-\d{2}-\d{2}\.csv$/);
  }

  const after = await page.evaluate(() => ({ ...globalThis.__PIPELINENEWS_FAST__ }));
  assert.ok(after.maximumDetailConcurrency <= MAX_DETAIL_CONCURRENCY, `runtime detail concurrency reached ${after.maximumDetailConcurrency}`);
  assert.ok(network.detailMaximum <= MAX_DETAIL_CONCURRENCY, `network detail concurrency reached ${network.detailMaximum}`);
  assert.equal(after.detailRequests, exportAll ? 16 : 1, "detail partition activation count changed");
  assert.equal(network.detailUrls.size, exportAll ? 16 : 1, "unexpected detail partition request cardinality");
  return {
    partitions_requested: after.detailRequests,
    runtime_maximum_concurrency: after.maximumDetailConcurrency,
    observed_network_maximum_concurrency: network.detailMaximum,
    csv_download: downloadName,
  };
}

async function verifyProfile(browser, profile, fastSiteUrl) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  await installPerformanceObservers(context);
  const page = await context.newPage();
  const network = observeNetwork(page);
  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");

  try {
    await page.goto(fastSiteUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => (
      document.body?.dataset.fastReady === "true" || document.body?.dataset.fastFailed === "true"
    ), null, { timeout: 30_000 });
    const boot = await page.evaluate(() => ({
      ready: document.body.dataset.fastReady,
      failed: document.body.dataset.fastFailed || null,
      generation: document.body.dataset.fastGeneration,
      totalCount: Number(document.getElementById("resultsMeta")?.dataset.totalCount),
      filteredCount: Number(document.getElementById("resultsMeta")?.dataset.filteredCount),
      projectRows: document.querySelectorAll("#tbody > tr").length,
      columns: document.querySelectorAll(".tablewrap thead th").length,
      rowColumns: document.querySelector("#tbody > tr")?.children.length || 0,
      domElements: document.querySelectorAll("*").length,
      initial: globalThis.__FAST_BROWSER_VERIFY__.ready,
      evidence: { ...globalThis.__PIPELINENEWS_FAST__ },
    }));
    assert.equal(boot.ready, "true", "fast candidate did not reach its fail-closed ready state");
    assert.equal(boot.failed, null, "fast candidate set data-fast-failed");
    assert.equal(boot.generation, GENERATION, "browser loaded the wrong fast-site generation");
    assert.equal(boot.totalCount, EXPECTED_PROJECTS);
    assert.equal(boot.filteredCount, EXPECTED_PROJECTS);
    assert.ok(boot.projectRows > 0 && boot.projectRows <= MAX_PROJECT_ROWS);
    assert.equal(boot.columns, 11, "all 11 project columns must remain present");
    assert.equal(boot.rowColumns, 11, "rendered project rows must retain all 11 cells");
    assert.ok(boot.domElements <= MAX_DOM_ELEMENTS, `initial DOM contains ${boot.domElements} elements`);
    assert.ok(boot.initial, "ready-time performance snapshot was not captured");

    const decodedBytes = boot.initial.entries.reduce((sum, entry) => sum + entry.decodedBodySize, 0);
    const initialUrls = boot.initial.entries.map((entry) => entry.name);
    const optionalBeforeReady = initialUrls.filter(isOptionalUrl);
    assert.ok(decodedBytes > 0, "browser did not expose decoded resource sizes");
    assert.ok(decodedBytes <= MAX_INITIAL_DECODED_BYTES, `initial decoded closure is ${decodedBytes} bytes`);
    assert.deepEqual(optionalBeforeReady, [], `optional cartridges loaded before core ready: ${optionalBeforeReady.join(", ")}`);
    assert.ok(initialUrls.some((url) => /-v8-fast-projects\.json(?:[?#]|$)/.test(url)), "compact project index is absent from the initial closure");
    assert.ok(initialUrls.some((url) => new URL(url).pathname.endsWith(`/${GENERATION}-v8-fast-registry.json`)), "fast registry is absent from the initial closure");

    let mobileLayout = null;
    if (profile.mobile) {
      mobileLayout = await page.evaluate(() => {
        const wrap = document.querySelector(".tablewrap");
        const headers = [...wrap.querySelectorAll("thead th")];
        return {
          page_scroll_width: document.documentElement.scrollWidth,
          page_client_width: document.documentElement.clientWidth,
          body_scroll_width: document.body.scrollWidth,
          table_scroll_width: wrap.scrollWidth,
          table_client_width: wrap.clientWidth,
          overflow_x: getComputedStyle(wrap).overflowX,
          visible_headers: headers.filter((header) => getComputedStyle(header).display !== "none").length,
        };
      });
      assert.ok(mobileLayout.page_scroll_width <= mobileLayout.page_client_width + 2, "mobile page leaks horizontal overflow");
      assert.ok(mobileLayout.body_scroll_width <= mobileLayout.page_client_width + 2, "mobile body leaks horizontal overflow");
      assert.ok(mobileLayout.table_scroll_width > mobileLayout.table_client_width, "mobile project table is not internally scrollable");
      assert.ok(["auto", "scroll"].includes(mobileLayout.overflow_x), `mobile table overflow-x is ${mobileLayout.overflow_x}`);
      assert.equal(mobileLayout.visible_headers, 11, "mobile layout hides one or more project columns");
    }

    const search = await exerciseSearch(page);
    const news = await exerciseNewsAndCharts(page);
    const nodeBaseline = await retainedNodeCount(page, client);
    await page.evaluate(() => { globalThis.__FAST_BROWSER_VERIFY__.ordinaryStart = performance.now(); });
    const interactions = await measureInteractions(page, profile.interactionGateMs);
    for (let index = 0; index < 20; index += 1) {
      await page.evaluate((value) => {
        const select = document.getElementById("sortProjects");
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }, index % 2 ? "updated_desc" : "updated_asc");
    }
    const reachability = await exerciseReachability(page);
    await page.evaluate(() => { globalThis.__FAST_BROWSER_VERIFY__.ordinaryEnd = performance.now(); });
    await page.waitForTimeout(50);
    const ordinaryLongTasks = await page.evaluate(() => {
      const state = globalThis.__FAST_BROWSER_VERIFY__;
      return state.longTasks.filter((entry) => (
        entry.startTime >= state.ordinaryStart && entry.startTime <= state.ordinaryEnd
      ));
    });
    const maximumLongTask = ordinaryLongTasks.reduce((maximum, entry) => Math.max(maximum, entry.duration), 0);
    assert.ok(maximumLongTask <= MAX_LONG_TASK_MS, `ordinary interaction long task reached ${rounded(maximumLongTask)}ms`);

    const nodeAfter = await retainedNodeCount(page, client);
    assert.equal(nodeAfter.source, nodeBaseline.source, "retained-node metric source changed during verification");
    const nodeGrowthRatio = nodeAfter.count / nodeBaseline.count;
    assert.ok(nodeGrowthRatio <= MAX_NODE_GROWTH, `retained nodes grew ${(nodeGrowthRatio * 100 - 100).toFixed(2)}%`);

    const detail = await exerciseDetailAndExport(page, network, profile.exportAll);
    await page.waitForTimeout(50);
    const postReadyAssets = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
    assert.ok(postReadyAssets.some((url) => /-v8-fast-search\.json(?:[?#]|$)/.test(url)), "search cartridge did not load after activation");
    assert.ok(postReadyAssets.some((url) => /-v8-fast-news\.json(?:[?#]|$)/.test(url)), "news cartridge did not load after core ready");
    assert.ok(postReadyAssets.some((url) => /\/vendor\/202608261927-chart-umd\.min\.js(?:[?#]|$)/.test(url)), "Chart.js did not load after core ready");
    assert.equal(network.detailActive.size, 0, "detail requests remain in flight at verifier completion");
    assert.deepEqual(network.errors, [], network.errors.join("\n"));

    return {
      viewport: profile.viewport,
      initial: {
        decoded_bytes: decodedBytes,
        resource_count: boot.initial.entries.length,
        optional_requests_before_ready: optionalBeforeReady,
        project_rows: boot.projectRows,
        dom_elements: boot.domElements,
        columns: boot.columns,
      },
      mobile_layout: mobileLayout,
      search,
      news,
      interactions,
      long_tasks: {
        gate_ms: MAX_LONG_TASK_MS,
        count: ordinaryLongTasks.length,
        maximum_ms: rounded(maximumLongTask),
      },
      retained_nodes: {
        source: nodeBaseline.source,
        before: nodeBaseline.count,
        after: nodeAfter.count,
        growth_percent: rounded((nodeGrowthRatio - 1) * 100),
        maximum_growth_percent: 10,
      },
      reachability,
      detail,
      errors: network.errors,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const requestedUrl = process.env.FAST_SITE_URL || argument("--url");
  assert.ok(requestedUrl, "FAST_SITE_URL or --url is required");
  const fastSiteUrl = new URL(requestedUrl).href;
  assert.ok(["http:", "https:"].includes(new URL(fastSiteUrl).protocol), "fast-site URL must be HTTP(S)");

  const browser = await chromium.launch({ headless: true });
  try {
    const profiles = {};
    for (const profile of [
      { name: "desktop", viewport: { width: 1440, height: 900 }, mobile: false, interactionGateMs: 100, exportAll: true },
      { name: "mobile", viewport: { width: 390, height: 844 }, mobile: true, interactionGateMs: 200, exportAll: false },
    ]) {
      profiles[profile.name] = await verifyProfile(browser, profile, fastSiteUrl);
    }
    process.stdout.write(`${JSON.stringify({
      schema: "pipelinenews.v8.live-news-browser-proof.v1",
      generation: GENERATION,
      url: fastSiteUrl,
      project_count: EXPECTED_PROJECTS,
      status: "PASS",
      profiles,
    }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
