import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/tmp/pn-playwright/package.json")("playwright")); }
const baseUrl = process.env.PIPELINENEWS_BASE_URL
  ? `${process.env.PIPELINENEWS_BASE_URL.replace(/\/$/u, "")}/202608260159-pipelinenews/`
  : "http://127.0.0.1:8765/202608260159-pipelinenews/";
const output = process.env.QA_SCREENSHOT_DIR || "/tmp/qa-202608260159";
await mkdir(output, { recursive: true });

async function open(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("requestfailed", (request) => errors.push(`network:${request.url()}`));
  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.ok(response?.ok());
  await page.waitForFunction(() => document.querySelectorAll("#tbody tr").length === 7680 && document.querySelectorAll("#stories .story").length === 133);
  return { page, errors };
}

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await open(browser, { width: 1440, height: 1000 });
  const page = desktop.page;
  assert.equal(await page.locator("#tbody tr").count(), 7680);
  assert.equal(await page.locator("#v1").innerText(), "356,474");
  assert.equal(await page.locator("#v2").innerText(), "7,680");
  assert.equal(await page.locator("#stories .story").count(), 133);
  assert.equal(await page.locator("thead th").count(), 11);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${output}/desktop.png` });
  await page.locator('[data-news="UK"]').click();
  assert.equal(await page.locator("#stories .story").count(), 45);
  assert.match(await page.locator("#stories").innerText(), /GG2050-REPD-13599/);
  await page.locator('[data-news="INTERNATIONAL"]').click();
  assert.equal(await page.locator("#stories .story").count(), 19);
  await page.locator('[data-news="US"]').click(); assert.equal(await page.locator("#stories .story").count(), 4);
  await page.locator('[data-news="EUROPE"]').click(); assert.equal(await page.locator("#stories .story").count(), 9);
  await page.locator('[data-technology="solar"]').click();
  assert.match(await page.locator("#resultsMeta").innerText(), /3,563/);
  await page.locator("#clearFilters").click();
  await page.locator("#search").fill("GG2050-REPD-17494");
  assert.match(await page.locator("#resultsMeta").innerText(), /^1 /);
  assert.equal(await page.locator("#tbody tr").count(), 1);
  await page.locator("#clearFilters").click();
  const first = await page.locator("#tbody tr").first().locator("td").nth(7).innerText();
  await page.locator("#sortProjects").selectOption("updated_asc");
  const sorted = await page.locator("#tbody tr").first().locator("td").nth(7).innerText();
  assert.notEqual(first, sorted);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#exportInline").click()]);
  const stream = await download.createReadStream(); let csv = ""; for await (const chunk of stream) csv += chunk;
  assert.match(csv, /OPERATOR LABEL WITHHELD/);
  assert.ok(await page.locator("a.atlaslink").first().getAttribute("href"));
  assert.deepEqual(desktop.errors, []);
  await page.close();

  const mobile = await open(browser, { width: 390, height: 844 });
  const layout = await mobile.page.locator(".tablewrap").evaluate((wrap) => ({ client: wrap.clientWidth, scroll: wrap.scrollWidth, overflow: getComputedStyle(wrap).overflowX, columns: wrap.querySelectorAll("thead th").length, visible: [...wrap.querySelectorAll("thead th")].every((cell) => getComputedStyle(cell).display === "table-cell") }));
  assert.equal(layout.overflow, "auto"); assert.ok(layout.scroll > layout.client); assert.equal(layout.columns, 11); assert.equal(layout.visible, true);
  assert.ok(await mobile.page.locator("#stories .story").first().isVisible());
  await mobile.page.screenshot({ path: `${output}/mobile-390.png` });
  assert.deepEqual(mobile.errors, []);
  await mobile.page.close();

  const failContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const failClosed = await failContext.newPage();
  await failClosed.route("**/dist/major_project_news_v9_5_1.json*", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await failClosed.goto(baseUrl, { waitUntil: "networkidle" });
  await failClosed.waitForFunction(() => document.querySelectorAll("#tbody tr").length === 7680);
  assert.equal(await failClosed.locator("#tbody tr").count(), 7680);
  assert.match(await failClosed.locator("#stories").innerText(), /unavailable|No governed|No headlines match/i);
  await failClosed.screenshot({ path: `${output}/mobile-390-fail-closed.png` });
  await failContext.close();
} finally { await browser.close(); }
console.log("BROWSER 202608260159: PASS · desktop · mobile 390 · interactions · fail-closed");
