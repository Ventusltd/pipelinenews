import assert from "node:assert/strict";
import { chromium } from "playwright";

const GENERATION = "202608271329";
const TARGET_PATH = "/repd_grid_atlasv8/";
const SITE_URL = process.env.FAST_SITE_URL
  || `http://127.0.0.1:4173/releases/${GENERATION}-v8-fast-candidate.html`;
const PARAMETERS = [
  "repd_ref",
  "project",
  "technology",
  "capacity_mw",
  "latitude",
  "longitude",
  "zoom",
];
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
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Atlas V8 synthetic receiver</title></head>
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
output.textContent = selected
  ? "SELECTED REPD " + repdRef + " (" + technology + ")"
  : "ABSTAIN — NO CANONICAL PROJECT";
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

async function searchProject(page, repdRef) {
  await page.locator("#search").fill(repdRef);
  await page.waitForFunction((ref) => {
    const row = document.getElementById(`repd-${ref}`);
    return globalThis.__PIPELINENEWS_FAST__?.searchReady === true && row && !row.hidden;
  }, repdRef, { timeout: 30_000 });
  return page.locator(`#repd-${repdRef}`);
}

async function clickAndVerifyAtlas(context, page, repdRef) {
  const row = await searchProject(page, repdRef);
  const link = row.locator("a.atlaslink");
  assert.equal(await link.count(), 1, `REPD ${repdRef} MAP link count changed`);
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
  const popupText = await selection.textContent();
  assert.match(popupText, new RegExp(`SELECTED REPD ${repdRef}`));
  await atlasPage.close();
  return { repd_ref: repdRef, href, popup: popupText };
}

async function verifyNoMap(page) {
  const row = await searchProject(page, "12780");
  assert.equal(await row.locator("a.atlaslink").count(), 0);
  const disabled = row.locator(".action-disabled");
  assert.equal(await disabled.count(), 1);
  assert.equal((await disabled.textContent()).trim(), "NO MAP");
  return { repd_ref: "12780", presentation: "NO MAP" };
}

async function verifyContextCannotManufactureIdentity(context) {
  const url = new URL("https://globalgrid2050.com/repd_grid_atlasv8/");
  url.searchParams.set("repd_ref", "999999");
  url.searchParams.set("project", "Beacon Fen Energy Park");
  url.searchParams.set("technology", "solar");
  url.searchParams.set("capacity_mw", "400");
  url.searchParams.set("latitude", "52.9989987");
  url.searchParams.set("longitude", "-0.4092339");
  url.searchParams.set("zoom", "12");
  const page = await context.newPage();
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  const selection = page.locator("#atlas-selection");
  await selection.waitFor({ state: "visible" });
  assert.equal(await selection.getAttribute("data-selected"), "false");
  assert.match(await selection.textContent(), /ABSTAIN/);
  await page.close();
  return { repd_ref: "999999", selected: false };
}

async function exerciseProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport });
  await context.route("https://globalgrid2050.com/repd_grid_atlasv8/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: syntheticReceiverHtml(),
    });
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
    rows: document.querySelectorAll("#tbody tr").length,
    domElements: document.querySelectorAll("*").length,
    heading: document.querySelector("h1")?.textContent || "",
  }));
  assert.equal(boot.generation, GENERATION);
  assert.equal(boot.failed, null);
  assert.ok(boot.rows > 0 && boot.rows <= 50);
  assert.ok(boot.domElements <= 5_000);
  assert.match(boot.heading, /ATLAS V8 DEEP-LINK/);

  const atlas = await clickAndVerifyAtlas(context, page, profile.repdRef);
  const noMap = await verifyNoMap(page);
  const tampered = await verifyContextCannotManufactureIdentity(context);
  assert.deepEqual(errors, [], errors.join("\n"));
  await context.close();
  return {
    profile: profile.id,
    viewport: profile.viewport,
    boot,
    atlas,
    no_map: noMap,
    tampered_context: tampered,
    errors,
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  results.push(await exerciseProfile(browser, {
    id: "desktop",
    viewport: { width: 1440, height: 1000 },
    repdRef: "17494",
  }));
  results.push(await exerciseProfile(browser, {
    id: "mobile",
    viewport: { width: 390, height: 844 },
    repdRef: "13599",
  }));
  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.atlas-deep-link-browser-proof.v1",
    generation: GENERATION,
    target_path: TARGET_PATH,
    query_parameters: PARAMETERS,
    profiles: results,
    synthetic_receiver: true,
    external_atlas_network_used: false,
    deployment: "not-authorised",
    status: "PASS",
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
