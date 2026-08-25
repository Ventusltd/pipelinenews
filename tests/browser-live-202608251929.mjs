import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.PIPELINENEWS_BASE_URL;
if (!base) throw new Error("LIVE_QA_BASE_URL_REQUIRED");
const deploymentSha = process.env.PIPELINENEWS_DEPLOY_SHA || "UNSPECIFIED";
let chromium;
try { ({ chromium } = await import("playwright")); } catch { throw new Error("LIVE_QA_PLAYWRIGHT_REQUIRED"); }
const output = process.env.QA_SCREENSHOT_DIR || "reports/browser-202608251929";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const releaseUrl = `${base.replace(/\/$/u, "")}/202608251929-pipelinenews/`;
async function openExactRelease(page, mode) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await page.goto(`${releaseUrl}?deployment=${deploymentSha}&qa=${mode}&attempt=${attempt}`, { waitUntil: "domcontentloaded" });
    lastStatus = response?.status() || 0;
    if (response?.ok() && await page.locator("body").getByText("202608251929-pipelinenews", { exact: false }).count()) return;
    await page.waitForTimeout(5000);
  }
  throw new Error(`LIVE_QA_EXACT_RELEASE_UNAVAILABLE_${lastStatus}`);
}
for (const [label, viewport] of [["desktop", { width: 1365, height: 900 }], ["mobile-390", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = []; const failures = []; const pageErrors = []; const dataOrigins = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push("CONSOLE_ERROR"); });
  page.on("requestfailed", () => failures.push("NETWORK_FAILURE"));
  page.on("pageerror", () => pageErrors.push("PAGE_ERROR"));
  page.on("request", (request) => { if (["fetch", "xhr", "script", "stylesheet"].includes(request.resourceType())) dataOrigins.push(new URL(request.url()).origin); });
  await openExactRelease(page, label); await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.querySelectorAll("#projectRows tr").length === 100 && document.querySelectorAll("#stories .story").length === 133);
  assert.equal(await page.locator("thead th").count(), 11); assert.equal(await page.locator("#intelligenceCards article").count(), 5);
  assert.match(await page.locator("#solarGauge").textContent(), /^3,563 \/ 67,013\.29$/u); assert.match(await page.locator("#bessGauge").textContent(), /^1,609 \/ 147,681\.94$/u);
  assert.equal(await page.locator("#stories .provenance").count(), 133); assert.ok(await page.locator("#stories .provenance code").evaluateAll((nodes) => nodes.every((node) => /^URL SHA-256 [a-f0-9]{64}$/u.test(node.textContent))));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${output}/${label}-newspaper.png` });
  assert.equal(await page.locator(".story a").count(), 130); assert.equal(await page.locator(".story .disabled").count(), 3);
  assert.ok(await page.locator(".story a").evaluateAll((links) => links.every((link) => new URL(link.href).pathname === "/" && !new URL(link.href).search && !new URL(link.href).hash)));
  await page.getByRole("button", { name: "UK", exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll("#stories .story").length === 45); assert.equal(await page.locator("#stories .story").count(), 45); await page.locator("#newsSearch").fill("GG2050-REPD-13599"); assert.ok(await page.locator("#stories .story").count() >= 1); await page.locator("#newsSearch").fill(""); await page.getByRole("button", { name: "ALL", exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll("#stories .story").length === 133);
  await page.locator('[data-technology="solar"]').click(); assert.equal((await page.locator("#filteredProjects").textContent()).replaceAll(",", ""), "3563");
  await page.locator("#clearFilters").click(); await page.locator("#statusFilter").selectOption("Operational"); assert.ok(Number((await page.locator("#filteredProjects").textContent()).replaceAll(",", "")) > 0);
  await page.locator("#clearFilters").click(); const firstRegion = await page.locator("#regionFilter option").nth(1).getAttribute("value"); await page.locator("#regionFilter").selectOption(firstRegion); assert.ok(Number((await page.locator("#filteredProjects").textContent()).replaceAll(",", "")) > 0);
  await page.locator("#clearFilters").click(); await page.locator("#projectSearch").fill("GG2050-REPD-13599"); await page.waitForFunction(() => document.querySelector("#filteredProjects")?.textContent === "1"); assert.equal(await page.locator("#projectRows tr").count(), 1); assert.match(await page.locator("#projectRows tr td").nth(9).textContent(), /NEWS\/ORGANISATION EVIDENCE/);
  await page.locator("#projectSearch").fill("GG2050-REPD-17494"); await page.waitForFunction(() => document.querySelector("#filteredProjects")?.textContent === "1"); assert.match(await page.locator("#projectRows tr td").nth(9).textContent(), /TIMING:\s*UNKNOWN/); assert.match(await page.locator("#projectRows tr td").nth(9).textContent(), /METHOD:\s*UNKNOWN/); assert.match(await page.locator("#projectRows tr td").nth(9).textContent(), /DISCOVERY BINDING:\s*ABSTAIN/);
  await page.locator("#clearFilters").click(); await page.locator("#minCapacity").fill("400"); await page.locator("#maxCapacity").fill("400"); assert.equal((await page.locator("#filteredProjects").textContent()).replaceAll(",", ""), "37");
  await page.locator("#clearFilters").click(); const high = await page.locator("#projectRows tr").first().getAttribute("data-project-id"); await page.locator("#projectSort").selectOption("capacity_asc"); const low = await page.locator("#projectRows tr").first().getAttribute("data-project-id"); assert.notEqual(high, low); await page.locator("#projectSort").selectOption("capacity_desc");
  await page.locator("#projectSort").selectOption("updated_desc"); const newest = await page.locator("#projectRows tr").first().getAttribute("data-project-id"); await page.locator("#projectSort").selectOption("updated_asc"); const oldest = await page.locator("#projectRows tr").first().getAttribute("data-project-id"); assert.notEqual(newest, oldest); await page.locator("#projectSort").selectOption("capacity_desc");
  await page.locator("#nextPage").click(); assert.match(await page.locator("#pageStatus").textContent(), /PAGE 2 OF/); await page.locator("#previousPage").click(); assert.match(await page.locator("#pageStatus").textContent(), /PAGE 1 OF/);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#exportCsv").click()]); const stream = await download.createReadStream(); let csv = ""; for await (const chunk of stream) csv += chunk; assert.match(csv, /^\uFEFF?"Site label","Region","Operator"/u); assert.match(csv, /OPERATOR LABEL WITHHELD/); assert.doesNotMatch(csv, /undefined|null/u);
  const atlas = await page.locator("#projectRows a").filter({ hasText: "ATLAS" }).first().getAttribute("href"); assert.ok(new URL(atlas).searchParams.has("repd_ref"));
  await page.getByRole("button", { name: "INTERNATIONAL", exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll("#stories .story").length === 19); assert.equal(await page.locator("#stories .story").count(), 19); assert.equal(await page.locator("#stories .disabled").count(), 1);
  if (label === "mobile-390") { assert.ok(await page.locator(".tablewrap").evaluate((node) => node.scrollWidth > node.clientWidth)); assert.equal(await page.locator("#projectRows tr").first().locator("td").count(), 11); assert.ok(await page.locator("#stories .story").first().isVisible()); const boxes = await Promise.all([page.locator("#minCapacity").boundingBox(), page.locator("#maxCapacity").boundingBox()]); assert.ok(boxes.every(Boolean) && boxes[0].y === boxes[1].y && boxes[0].x + boxes[0].width <= boxes[1].x); }
  const expectedOrigin = new URL(base).origin; assert.ok(dataOrigins.every((origin) => origin === expectedOrigin)); assert.deepEqual(consoleErrors, []); assert.deepEqual(failures, []); assert.deepEqual(pageErrors, []);
  await page.locator(".tablewrap").scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${label}-project-table.png` }); await page.close();
}
const failClosed = await browser.newPage({ viewport: { width: 390, height: 844 } });
await failClosed.route("**/objects/data/sha256/*.json", (route) => route.abort());
await openExactRelease(failClosed, "fail-closed"); await failClosed.waitForLoadState("networkidle");
await failClosed.waitForFunction(() => document.querySelectorAll("#projectRows tr").length === 100 && document.querySelectorAll("#stories .story").length === 133);
assert.match(await failClosed.locator("#intelligenceStatus").textContent(), /OPTIONAL INTELLIGENCE UNAVAILABLE/);
await failClosed.locator("#intelligenceStatus").scrollIntoViewIfNeeded(); await failClosed.screenshot({ path: `${output}/mobile-390-fail-closed.png` });
await browser.close(); process.stdout.write("LIVE BROWSER QA 202608251929: PASS\n");
