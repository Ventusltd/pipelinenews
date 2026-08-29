#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GENERATION = "202608291310";
const RELEASE_ID = `${GENERATION}-pipelinenews`;
const ATLAS_BASE = "https://ventusltd.github.io/gridatlas/202608291239-atlas-v9/";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.match(argv[index] || "", /^--[a-z-]+$/u);
    assert.ok(argv[index + 1], `missing value for ${argv[index]}`);
    result[argv[index].slice(2)] = argv[index + 1];
  }
  for (const key of ["candidate", "output"]) assert.ok(result[key], `missing --${key}`);
  return result;
}

async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch (error) {
    if (!process.env.PLAYWRIGHT_MODULE) throw error;
    return (await import(process.env.PLAYWRIGHT_MODULE)).chromium;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidate = new URL(args.candidate);
  assert.ok(["http:", "https:"].includes(candidate.protocol));
  assert.match(candidate.pathname, new RegExp(`/releases/${RELEASE_ID}/(?:index\\.html)?$`, "u"));
  const chromium = await loadChromium();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const candidateErrors = [];
  const requests = new Set();
  let browserVersion = "unknown";
  try {
    browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-GB", reducedMotion: "reduce" });
    context.on("request", (request) => requests.add(request.url()));
    context.on("requestfailed", (request) => candidateErrors.push(`request: ${request.url()} :: ${request.failure()?.errorText}`));
    const attachPageErrors = (target) => {
      target.on("console", (message) => { if (message.type() === "error") candidateErrors.push(`console: ${message.text()}`); });
      target.on("pageerror", (error) => candidateErrors.push(`page: ${error.message}`));
    };
    context.on("page", attachPageErrors);
    const page = await context.newPage();
    page.setDefaultTimeout(120_000);

    await page.goto(candidate.href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.fastReady === "true");
    assert.equal(await page.locator("#tbody>tr").count(), 100, "unfiltered 100-row window changed");
    const initialMapLinks = await page.locator("#tbody a.atlaslink").count();
    const initialNoMap = await page.locator("#tbody .action-disabled", { hasText: "NO MAP" }).count();
    assert.equal(initialMapLinks + initialNoMap, 100, "first project window map disposition changed");
    await page.locator("#federatedRelationshipOpen").click();
    await page.waitForFunction(() => document.querySelector("#federatedRelationshipHost")?.dataset.federatedRelationshipState === "ready");
    assert.equal(await page.locator("#federatedRelationshipHost tbody tr").count(), 3);
    assert.equal(await page.locator("#federatedRelationshipHost td", { hasText: "ABSTAIN" }).count(), 3);
    await page.locator("#sectorIntelOpen").click();
    await page.waitForFunction(() => document.querySelector("#sectorIntelHost")?.dataset.sectorIntelligenceState === "ready");

    const inbound = new URL(candidate);
    inbound.search = "";
    inbound.searchParams.set("repd_ref", "17494");
    await page.goto(inbound.href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.fastReady === "true");
    await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "1");
    assert.equal(new URL(page.url()).searchParams.get("repd_ref"), "17494");
    assert.equal(new URL(page.url()).searchParams.has("q"), false);
    const row = page.locator("#repd-17494");
    assert.equal(await row.count(), 1);
    assert.equal(await page.locator("#tbody>tr").count(), 1);
    const link = row.locator("a.atlaslink");
    assert.equal(await link.count(), 1);
    const href = await link.getAttribute("href");
    assert.equal(href, `${ATLAS_BASE}?repd_ref=17494`);
    const hrefUrl = new URL(href);
    assert.deepEqual([...hrefUrl.searchParams.keys()], ["repd_ref"]);

    const [receiver] = await Promise.all([context.waitForEvent("page"), link.click()]);
    receiver.setDefaultTimeout(120_000);
    await receiver.waitForLoadState("domcontentloaded");
    await receiver.waitForFunction(() => document.querySelector("[data-atlas-live]")?.textContent.includes("REPD 17494 selected"));
    const receiverText = (await receiver.locator("[data-atlas-live]").innerText()).trim();
    const receiverUrl = new URL(receiver.url());
    assert.equal(receiverUrl.origin, "https://ventusltd.github.io");
    assert.equal(receiverUrl.pathname, "/gridatlas/202608291239-atlas-v9/");
    assert.deepEqual([...receiverUrl.searchParams.keys()], ["repd_ref"]);
    assert.equal(receiverUrl.searchParams.get("repd_ref"), "17494");
    assert.match(receiverText, /REPD 17494 selected/u);
    await receiver.close();

    const beacon = new URL(candidate);
    beacon.search = "";
    beacon.searchParams.set("repd_ref", "13599");
    await page.goto(beacon.href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.fastReady === "true");
    await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "1");
    const beaconRow = page.locator("#repd-13599");
    assert.equal(await beaconRow.count(), 1);
    const beaconLink = beaconRow.locator("a.atlaslink");
    assert.equal(await beaconLink.count(), 1);
    const beaconHref = await beaconLink.getAttribute("href");
    assert.equal(beaconHref, `${ATLAS_BASE}?repd_ref=13599`);
    const [beaconReceiver] = await Promise.all([context.waitForEvent("page"), beaconLink.click()]);
    beaconReceiver.setDefaultTimeout(120_000);
    await beaconReceiver.waitForLoadState("domcontentloaded");
    await beaconReceiver.waitForFunction(() => document.querySelector("[data-atlas-live]")?.textContent.includes("REPD 13599 selected"));
    const beaconReceiverText = (await beaconReceiver.locator("[data-atlas-live]").innerText()).trim();
    const beaconReceiverUrl = new URL(beaconReceiver.url());
    assert.equal(beaconReceiverUrl.href, `${ATLAS_BASE}?repd_ref=13599`);
    assert.match(beaconReceiverText, /REPD 13599 selected/u);
    await beaconReceiver.close();

    const noMap = new URL(candidate);
    noMap.search = "";
    noMap.searchParams.set("repd_ref", "12780");
    await page.goto(noMap.href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.fastReady === "true");
    await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "1");
    assert.equal(await page.locator("#repd-12780 a.atlaslink").count(), 0);
    assert.equal((await page.locator("#repd-12780 .action-disabled").innerText()).trim(), "NO MAP");
    assert.deepEqual(candidateErrors, [], candidateErrors.join("\n"));

    const result = {
      schema: "pipelinenews.real-atlas-v9-receiver-browser-proof.v1",
      classification: "VERIFIED_REAL_ATLAS_V9_RECEIVER",
      generation: GENERATION,
      release_id: RELEASE_ID,
      playwright_version: process.env.PLAYWRIGHT_VERSION || "runtime-resolved",
      browser_version: browserVersion,
      candidate_url: candidate.href,
      inbound_repd_ref: "17494",
      filtered_projects: 1,
      project_row_id: "repd-17494",
      inbound: {
        url: inbound.href,
        repd_ref: "17494",
        q_present: false,
        filtered_projects: 1,
        project_row_id: "repd-17494",
      },
      outbound_href: href,
      outbound_query_parameters: [...hrefUrl.searchParams.keys()],
      atlas_repd_ref: "17494",
      receiver_url: receiverUrl.href,
      receiver_text: receiverText,
      beacon_fen: {
        inbound_url: beacon.href,
        repd_ref: "13599",
        filtered_projects: 1,
        project_row_id: "repd-13599",
        outbound_href: beaconHref,
        receiver_url: beaconReceiverUrl.href,
        receiver_text: beaconReceiverText,
      },
      external_atlas_network_used: [...requests].some((url) => url.startsWith(ATLAS_BASE)),
      synthetic_receiver: false,
      route_interceptions: 0,
      no_map: { repd_ref: "12780", presentation: "NO MAP" },
      inherited_runtime: { rows_per_page: 100, initial_map_links: initialMapLinks, initial_no_map: initialNoMap, relationship_rows: 3, relationship_project_bindings: 0, sector_cartridge_opened: true },
      errors: candidateErrors,
      status: "PASS",
    };
    assert.equal(result.external_atlas_network_used, true);
    await mkdir(path.dirname(path.resolve(args.output)), { recursive: true });
    await writeFile(path.resolve(args.output), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ classification: result.classification, receiver: result.receiver_url, inbound: result.inbound.url })}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
