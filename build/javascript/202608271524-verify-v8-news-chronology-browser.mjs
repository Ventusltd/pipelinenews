import assert from "node:assert/strict";
import { chromium } from "playwright";

const GENERATION = "202608271524";
const SITE_URL = process.env.FAST_SITE_URL
  || `http://127.0.0.1:4173/releases/${GENERATION}-v8-fast-candidate.html`;
const TARGET_PATH = "/repd_grid_atlasv8/";
const BBC_IDS = Object.freeze([
  "GG2050-NEWS-0E813A86D54E39FC",
  "GG2050-NEWS-B4B91FD3DA8F596C",
  "GG2050-NEWS-C3D0A5910F32E821",
]);
const PARAMETERS = Object.freeze([
  "repd_ref",
  "project",
  "technology",
  "capacity_mw",
  "latitude",
  "longitude",
  "zoom",
]);
const SENTINELS = Object.freeze({
  "17494": Object.freeze({
    project: "East Pye Solar Farm",
    technology: "solar",
    capacity_mw: "500",
    latitude: "52.4733298",
    longitude: "1.2432764",
  }),
  "13599": Object.freeze({
    project: "Beacon Fen Energy Park",
    technology: "solar",
    capacity_mw: "400",
    latitude: "52.9989987",
    longitude: "-0.4092339",
  }),
});

function syntheticReceiverHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Atlas V8 receiver</title></head>
<body><main id="atlas-selection"></main><script>
const canonical = Object.freeze({ "17494": "solar", "13599": "solar" });
const query = new URLSearchParams(location.search);
const repdRef = query.get("repd_ref") || "";
const technology = query.get("technology") || "";
const selected = canonical[repdRef] === technology;
const output = document.getElementById("atlas-selection");
output.dataset.selected = String(selected);
output.dataset.repdRef = repdRef;
output.dataset.technology = technology;
output.dataset.project = query.get("project") || "";
output.dataset.capacityMw = query.get("capacity_mw") || "";
output.dataset.latitude = query.get("latitude") || "";
output.dataset.longitude = query.get("longitude") || "";
output.dataset.zoom = query.get("zoom") || "";
output.textContent = selected ? "SELECTED REPD " + repdRef : "ABSTAIN — NO CANONICAL PROJECT";
</script></body></html>`;
}

function assertAtlasUrl(href, repdRef) {
  const expected = SENTINELS[repdRef];
  const url = new URL(href);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "globalgrid2050.com");
  assert.equal(url.pathname, TARGET_PATH);
  assert.deepEqual([...url.searchParams.keys()], PARAMETERS);
  assert.equal(url.searchParams.get("repd_ref"), repdRef);
  assert.equal(url.searchParams.get("project"), expected.project);
  assert.equal(url.searchParams.get("technology"), expected.technology);
  assert.equal(url.searchParams.get("capacity_mw"), expected.capacity_mw);
  assert.equal(url.searchParams.get("latitude"), expected.latitude);
  assert.equal(url.searchParams.get("longitude"), expected.longitude);
  assert.equal(url.searchParams.get("zoom"), "12");
  return url;
}

async function verifyFrontWindow(page) {
  await page.waitForFunction(() => globalThis.__PIPELINENEWS_FAST__?.newsReady === true, null, { timeout: 60_000 });
  const visibleIds = await page.locator("#stories .story").evaluateAll((stories) => (
    stories.map((story) => story.dataset.articleId)
  ));
  assert.equal(visibleIds.length, 30);
  assert.deepEqual(visibleIds.slice(0, 3), BBC_IDS);
  assert.ok(BBC_IDS.every((id) => visibleIds.includes(id)));
  assert.equal((await page.locator("#newsWindowRange").textContent()).trim(), "1–30 of 136");
  assert.equal(await page.locator("#newsPrevious").isDisabled(), true);
  assert.equal(await page.locator("#newsMore").isDisabled(), false);

  const headlines = await page.locator("#stories .story").evaluateAll((stories) => (
    stories.slice(0, 3).map((story) => story.querySelector("h3")?.textContent?.trim())
  ));
  assert.deepEqual(headlines, [
    "Lincolnshire farmer says turning to solar is only way to survive",
    "Huge Norfolk solar farm near Long Stratton set to cost £1bn",
    "Heckington solar farm approval may face legal challenge",
  ]);
  return { visible_count: visibleIds.length, first_ids: visibleIds.slice(0, 3), headlines };
}

async function verifyRelatedContextSearch(page) {
  const search = page.locator("#newsSearch");
  await search.fill("Beacon Fen");
  const windsock = page.locator(`#stories .story[data-article-id="${BBC_IDS[0]}"]`);
  const beacon = page.locator(`#stories .story[data-article-id="${BBC_IDS[2]}"]`);
  await windsock.waitFor({ state: "visible" });
  await beacon.waitFor({ state: "visible" });
  const windsockText = (await windsock.textContent()).replace(/\s+/gu, " ").trim();
  const beaconText = (await beacon.textContent()).replace(/\s+/gu, " ").trim();
  assert.match(windsockText, /RELATED CONTEXT ONLY — NOT A PROJECT BINDING/u);
  assert.match(windsockText, /related REPD 13599/u);
  assert.match(windsockText, /no project signal/u);
  assert.ok(!windsockText.includes("PRIMARY_MATCH"));
  assert.match(beaconText, /PRIMARY_MATCH · REPD 13599/u);
  assert.match(beaconText, /POTENTIAL LEGAL CHALLENGE TO CONSENT/u);

  await search.fill("East Pye");
  const eastPye = page.locator(`#stories .story[data-article-id="${BBC_IDS[1]}"]`);
  await eastPye.waitFor({ state: "visible" });
  const eastText = (await eastPye.textContent()).replace(/\s+/gu, " ").trim();
  assert.match(eastText, /PRIMARY_MATCH · REPD 17494/u);
  assert.match(eastText, /RELATED DEVELOPMENT · REPD 20670 · BESS · official capacity unknown · no project signal/u);
  await search.fill("");
  return { windsock_related_context: true, beacon_primary: true, east_pye_primary: true };
}

async function verifyAtlasHandoff(context, page, repdRef) {
  await page.locator("#search").fill(repdRef);
  await page.waitForFunction((ref) => {
    const row = document.getElementById(`repd-${ref}`);
    return globalThis.__PIPELINENEWS_FAST__?.searchReady === true && row && !row.hidden;
  }, repdRef, { timeout: 30_000 });
  const row = page.locator(`#repd-${repdRef}`);
  const link = row.locator("a.atlaslink");
  assert.equal(await link.count(), 1);
  assert.equal(await link.getAttribute("target"), "_blank");
  assert.match(await link.getAttribute("rel"), /noopener/u);
  const href = await link.getAttribute("href");
  assert.ok(href);
  const expectedUrl = assertAtlasUrl(href, repdRef);

  const [atlasPage] = await Promise.all([
    context.waitForEvent("page"),
    link.click(),
  ]);
  await atlasPage.waitForLoadState("domcontentloaded");
  const selection = atlasPage.locator("#atlas-selection");
  await selection.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await selection.getAttribute("data-selected"), "true");
  assert.equal(await selection.getAttribute("data-repd-ref"), repdRef);
  assert.equal(await selection.getAttribute("data-technology"), SENTINELS[repdRef].technology);
  assert.equal(await selection.getAttribute("data-project"), SENTINELS[repdRef].project);
  assert.equal(await selection.getAttribute("data-capacity-mw"), SENTINELS[repdRef].capacity_mw);
  assert.equal(await selection.getAttribute("data-latitude"), SENTINELS[repdRef].latitude);
  assert.equal(await selection.getAttribute("data-longitude"), SENTINELS[repdRef].longitude);
  assert.equal(await selection.getAttribute("data-zoom"), "12");
  assert.equal(new URL(atlasPage.url()).href, expectedUrl.href);
  await atlasPage.close();
  return { repd_ref: repdRef, href, selected: true };
}

async function exerciseProfile(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
  });
  await context.route("https://globalgrid2050.com/repd_grid_atlasv8/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: syntheticReceiverHtml() });
  });
  const errors = [];
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`request: ${request.url()} :: ${request.failure()?.errorText}`));

  await page.goto(SITE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => document.body.dataset.fastReady === "true", null, { timeout: 60_000 });
  const boot = await page.evaluate(() => ({
    generation: document.body.dataset.fastGeneration,
    failed: document.body.dataset.fastFailed || null,
    project_rows: document.querySelectorAll("#tbody tr").length,
    dom_elements: document.querySelectorAll("*").length,
    heading: document.querySelector("h1")?.textContent || "",
    runtime: { ...globalThis.__PIPELINENEWS_FAST__ },
  }));
  assert.equal(boot.generation, GENERATION);
  assert.equal(boot.failed, null);
  assert.ok(boot.project_rows > 0 && boot.project_rows <= 50);
  assert.ok(boot.dom_elements <= 5_000);
  assert.match(boot.heading, /CHRONOLOGY/u);

  const frontWindow = await verifyFrontWindow(page);
  const searches = await verifyRelatedContextSearch(page);
  const atlas = await verifyAtlasHandoff(context, page, profile.repdRef);
  const runtime = await page.evaluate(() => ({ ...globalThis.__PIPELINENEWS_FAST__ }));
  assert.equal(runtime.newsRequests, 1);
  assert.ok(runtime.maximumDetailConcurrency <= 4);
  assert.deepEqual(errors, [], errors.join("\n"));
  await context.close();
  return { profile: profile.id, viewport: profile.viewport, boot, front_window: frontWindow, searches, atlas, runtime, errors };
}

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [];
  profiles.push(await exerciseProfile(browser, {
    id: "desktop",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    mobile: false,
    repdRef: "17494",
  }));
  profiles.push(await exerciseProfile(browser, {
    id: "mobile-portrait",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    mobile: true,
    repdRef: "13599",
  }));
  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.news-chronology-browser-proof.v1",
    generation: GENERATION,
    first_window_bbc_article_ids: BBC_IDS,
    atlas_cartridge_generation: "202608271329",
    atlas_target_path: TARGET_PATH,
    atlas_query_parameters: PARAMETERS,
    profiles,
    synthetic_atlas_receiver: true,
    external_atlas_network_used: false,
    deployment: "not-authorised",
    status: "PASS",
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
