import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const generation = process.env.PIPELINENEWS_GENERATION || "202608261927";
const pageUrl = process.env.PIPELINENEWS_PAGE_URL
  || `http://127.0.0.1:4173/releases/${generation}-index.html`;
const evidenceDir = process.env.PIPELINENEWS_EVIDENCE_DIR || "/tmp/pipelinenews-browser-proof";
const deployment = process.env.PIPELINENEWS_DEPLOY_SHA || "local-preview";
await mkdir(evidenceDir, { recursive: true });

function cacheBustedUrl() {
  const target = new URL(pageUrl);
  target.searchParams.set("deployment", deployment);
  return target.href;
}

async function pageAt(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 800 ? 1000 : 1100 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  const isFavicon = (url) => new URL(url).pathname.endsWith("/favicon.ico");
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (!isFavicon(request.url())) errors.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !isFavicon(response.url())) errors.push(`response: ${response.status()} ${response.url()}`);
  });
  const response = await page.goto(cacheBustedUrl(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  assert.ok(response?.ok(), `page returned HTTP ${response?.status()}`);
  await page.waitForFunction(
    () => document.querySelectorAll("#tbody tr").length === 7680
      && document.querySelectorAll("#stories .story").length === 133,
    null,
    { timeout: 120_000 },
  );
  return { context, page, errors };
}

async function clickNewsCount(page, mode) {
  await page.locator(`button[data-news="${mode}"]`).click();
  await page.waitForFunction(() => !document.querySelector("#stories .news-empty"));
  return page.locator("#stories .story").count();
}

async function clickTechnologyCount(page, technology, expected) {
  await page.locator(`button[data-technology="${technology}"]`).click();
  await page.waitForFunction(
    (count) => document.querySelectorAll("#tbody tr").length === count,
    expected,
  );
  assert.equal(await page.locator("#tbody tr").count(), expected);
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await pageAt(browser, 1440);
  const page = desktop.page;
  assert.equal(await page.locator("#tbody tr").count(), 7680);
  assert.equal(await page.locator("#v1").innerText(), "356,474");
  assert.equal(await page.locator("#v2").innerText(), "7,680");
  assert.equal(await page.locator("#v3").innerText(), "4,100");
  assert.equal(await page.locator("#stories .story").count(), 133);
  assert.equal(await page.locator("thead th").count(), 11);
  assert.match(await page.locator("#newsMeta").innerText(), /45 UK · 19 international \(4 US · 9 Europe · 6 other\) · 133 headlines/i);

  assert.equal(await clickNewsCount(page, "UK"), 45);
  const uk = await page.locator("#stories").innerText();
  assert.match(uk, /Beacon Fen Energy Park development consent decision announced/);
  assert.doesNotMatch(uk, /New Jersey/);

  assert.equal(await clickNewsCount(page, "INTERNATIONAL"), 19);
  const international = await page.locator("#stories").innerText();
  assert.match(international, /New Jersey/);
  assert.match(international, /County Kerry, Ireland/);
  assert.match(international, /Australia/);
  assert.doesNotMatch(international, /Kintore/);

  assert.equal(await clickNewsCount(page, "US"), 4);
  assert.match(await page.locator("#stories").innerText(), /New Jersey/);
  assert.equal(await clickNewsCount(page, "EUROPE"), 9);
  assert.match(await page.locator("#stories").innerText(), /County Kerry, Ireland/);

  await clickTechnologyCount(page, "solar", 3563);
  await clickTechnologyCount(page, "bess", 1609);
  await clickTechnologyCount(page, "wind_onshore", 2399);
  await clickTechnologyCount(page, "wind_offshore", 109);
  await page.locator("#clearFilters").click();
  await page.waitForFunction(() => document.querySelectorAll("#tbody tr").length === 7680);

  await page.locator("#search").fill("GG2050-REPD-17494");
  await page.waitForFunction(() => document.querySelectorAll("#tbody tr").length === 1);
  assert.equal(await page.locator("#tbody tr").count(), 1);
  await page.locator("#clearFilters").click();
  await page.waitForFunction(() => document.querySelectorAll("#tbody tr").length === 7680);
  await page.locator("#sortProjects").selectOption("updated_asc");
  const sortedDates = await page.locator("#tbody tr").evaluateAll((rows) => rows
    .map((row) => row.dataset.repdUpdated)
    .filter(Boolean));
  assert.ok(sortedDates.length > 1);
  assert.ok(sortedDates.every((value, index) => index === 0 || sortedDates[index - 1] <= value));
  assert.equal(await page.locator("#repdUpdatedHeader").getAttribute("aria-sort"), "ascending");
  const [year, month, day] = sortedDates[0].split("-");
  assert.equal(await page.locator("#tbody tr").first().locator("td").nth(8).innerText(), `${day}/${month}/${year}`);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#exportInline").click(),
  ]);
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk;
  assert.match(csv, /"Site Name","REPD Ref","GlobalGrid Project ID"/);
  assert.match(csv, /GG2050-REPD-17494/);
  assert.ok(await page.locator("a.atlaslink").first().getAttribute("href"));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/desktop.png` });
  assert.deepEqual(desktop.errors, []);
  await desktop.context.close();

  for (const width of [390, 430, 440, 768]) {
    const mobile = await pageAt(browser, width);
    const layout = await mobile.page.evaluate(() => {
      const wrap = document.querySelector(".tablewrap");
      const table = wrap.querySelector("table");
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        wrapClientWidth: wrap.clientWidth,
        wrapScrollWidth: wrap.scrollWidth,
        overflowX: getComputedStyle(wrap).overflowX,
        tableDisplay: getComputedStyle(table).display,
        columns: table.tHead.rows[0].cells.length,
        displays: [...table.tHead.rows[0].cells].map((cell) => getComputedStyle(cell).display),
      };
    });
    assert.ok(layout.scrollWidth <= layout.clientWidth, `${width}px document overflow`);
    assert.equal(layout.overflowX, "auto");
    assert.ok(layout.wrapScrollWidth > layout.wrapClientWidth, `${width}px table is not horizontally scrollable`);
    assert.equal(layout.tableDisplay, "table");
    assert.equal(layout.columns, 11);
    assert.ok(layout.displays.every((display) => display === "table-cell"));
    assert.equal(await clickNewsCount(mobile.page, "INTERNATIONAL"), 19);
    assert.deepEqual(mobile.errors, []);
    if (width === 390) {
      await mobile.page.screenshot({ path: `${evidenceDir}/mobile-390.png` });
    }
    await mobile.context.close();
  }

  const failContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const failClosed = await failContext.newPage();
  await failClosed.route(`**/data/news/${generation}-major-project-news-v9-5-1.json*`, (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: "{}",
  }));
  await failClosed.goto(cacheBustedUrl(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  await failClosed.waitForFunction(() => document.querySelectorAll("#tbody tr").length === 7680, null, { timeout: 120_000 });
  assert.equal(await failClosed.locator("#tbody tr").count(), 7680);
  assert.match(await failClosed.locator("#stories").innerText(), /unavailable|No location-verified|No headlines match/i);
  await failClosed.screenshot({ path: `${evidenceDir}/mobile-390-fail-closed.png` });
  await failContext.close();

  await writeFile(`${evidenceDir}/browser-proof.json`, `${JSON.stringify({
    schema: "pipelinenews.browser-proof.v1",
    status: "PASS",
    generation,
    page_url: pageUrl,
    deployment,
    projects: 7680,
    headlines: 133,
    uk_headlines: 45,
    international_headlines: 19,
    widths: [1440, 390, 430, 440, 768],
    fail_closed_news: true,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}

console.log("PIPELINENEWS V9.6.2 BROWSER PROOF: PASS · desktop · 390/430/440/768 · interactions · fail-closed");
