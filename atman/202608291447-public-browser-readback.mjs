#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GENERATION = "202608291447";
const RELEASE_ID = `${GENERATION}-pipelinenews`;

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

async function loadReceiverContract(candidate) {
  const manifestUrl = new URL("release-manifest.json", candidate);
  const response = await fetch(manifestUrl);
  assert.equal(response.ok, true, `candidate release manifest HTTP ${response.status}`);
  const manifest = await response.json();
  assert.equal(manifest.schema, "pipelinenews.timestamp-folder-successor.v1");
  assert.equal(manifest.release_id, RELEASE_ID);
  const receiver = manifest.atlas_v9_deep_link;
  assert.equal(receiver.query_parameter_order?.join(","), "repd_ref");
  assert.match(String(receiver.golden_repd_ref || ""), /^\d+$/u);
  assert.equal(receiver.pointer?.path, "releases/current-v3.json");
  assert.match(String(receiver.pointer?.sha256 || ""), /^[0-9a-f]{64}$/u);
  assert.match(String(receiver.pointer_commit || ""), /^[0-9a-f]{40}$/u);
  const base = new URL(receiver.base_url);
  assert.equal(base.protocol, "https:");
  assert.equal(base.hostname, "ventusltd.github.io");
  assert.equal(base.search, "");
  assert.equal(base.hash, "");
  return { manifest, receiver, base };
}

async function proveReceiverSelection(receiverPage, base, repdRef) {
  receiverPage.setDefaultTimeout(60_000);
  await receiverPage.waitForLoadState("domcontentloaded");
  await receiverPage.waitForFunction(({ route, ref }) => {
    const url = new URL(location.href);
    return url.pathname === route
      && url.searchParams.get("repd_ref") === ref
      && /official viable REPD projects ready/u.test(document.querySelector("[data-registry-status]")?.textContent || "");
  }, { route: base.pathname, ref: repdRef });

  // Prove the authenticated registry contains the selected identity through a
  // durable receiver card. Do not race on the transient aria-live status text.
  await receiverPage.locator("[data-atlas-query]").fill(repdRef);
  await receiverPage.locator("[data-atlas-search]").click();
  const card = receiverPage.locator('[data-atlas-results] [data-result-class="DIRECT_PROJECT_MATCH"]', { hasText: `REPD ${repdRef}` }).first();
  await card.waitFor({ state: "visible" });
  const evidence = await receiverPage.evaluate(() => ({
    registry: document.querySelector("[data-registry-status]")?.textContent?.trim() || "",
    cards: [...document.querySelectorAll('.maplibregl-popup, [data-atlas-results] [data-result-class="DIRECT_PROJECT_MATCH"]')]
      .map((node) => node.textContent?.trim() || "")
      .filter(Boolean),
  }));
  const url = new URL(receiverPage.url());
  assert.equal(url.origin, base.origin);
  assert.equal(url.pathname, base.pathname);
  assert.deepEqual([...url.searchParams.keys()], ["repd_ref"]);
  assert.equal(url.searchParams.get("repd_ref"), repdRef);
  assert.ok(evidence.cards.some((text) => text.includes(`REPD ${repdRef}`)), `receiver card missing REPD ${repdRef}`);
  return { url: url.href, evidence };
}

async function proveProject(page, context, candidate, base, repdRef, required) {
  const inbound = new URL(candidate);
  inbound.search = "";
  inbound.searchParams.set("repd_ref", repdRef);
  await page.goto(inbound.href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.dataset.fastReady === "true");
  await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount !== undefined);
  const row = page.locator(`#repd-${repdRef}`);
  const present = await row.count() === 1;
  const snapshot = async () => ({
    pipeline_filtered_count: Number(await page.locator("#resultsMeta").getAttribute("data-filtered-count")),
    pipeline_visible_repd_refs: await page.locator("#tbody>tr").evaluateAll((rows) => rows.map((item) => item.id.replace(/^repd-/u, ""))),
  });
  if (!present) {
    assert.equal(required, false, `required PipelineNews REPD ${repdRef} is absent`);
    const evidence = await snapshot();
    assert.equal(evidence.pipeline_filtered_count, 0, `absent repd_ref=${repdRef} left filtered rows`);
    assert.deepEqual(evidence.pipeline_visible_repd_refs, [], `absent repd_ref=${repdRef} left visible identities`);
    return { repd_ref: repdRef, present: false, tested: false, ...evidence };
  }
  await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "1");
  assert.equal(await page.locator("#tbody>tr").count(), 1, `repd_ref=${repdRef} did not select exactly one canonical project`);
  const evidence = await snapshot();
  assert.equal(evidence.pipeline_filtered_count, 1);
  assert.deepEqual(evidence.pipeline_visible_repd_refs, [repdRef]);
  if (repdRef === "13599") assert.equal(await page.locator("#repd-13600").count(), 0, "related REPD 13600 leaked into exact identity selection");
  assert.equal(new URL(page.url()).searchParams.get("repd_ref"), repdRef);
  assert.equal(new URL(page.url()).searchParams.has("q"), false);
  const link = row.locator("a.atlaslink");
  assert.equal(await link.count(), 1);
  const href = await link.getAttribute("href");
  const expected = new URL(base);
  expected.searchParams.set("repd_ref", repdRef);
  assert.equal(href, expected.href);
  assert.deepEqual([...new URL(href).searchParams.keys()], ["repd_ref"]);
  const [receiverPage] = await Promise.all([context.waitForEvent("page"), link.click()]);
  let receiverProof;
  try {
    receiverProof = await proveReceiverSelection(receiverPage, base, repdRef);
  } catch (error) {
    const diagnostics = await receiverPage.evaluate(() => ({
      href: location.href,
      title: document.title,
      live: document.querySelector("[data-atlas-live]")?.textContent || "",
      registry: document.querySelector("[data-registry-status]")?.textContent || "",
      map: document.querySelector("[data-map-status]")?.textContent || "",
      cards: [...document.querySelectorAll(".maplibregl-popup, [data-atlas-results]")].map((node) => node.textContent || ""),
    })).catch(() => ({ href: receiverPage.url(), unreadable: true }));
    throw new Error(`receiver selection proof failed for REPD ${repdRef}: ${error.message}; ${JSON.stringify(diagnostics)}`);
  } finally {
    await receiverPage.close();
  }
  return {
    repd_ref: repdRef,
    present: true,
    tested: true,
    inbound_url: inbound.href,
    outbound_href: href,
    receiver_url: receiverProof.url,
    receiver_evidence: receiverProof.evidence,
    related_repd_13600_excluded: repdRef === "13599" ? true : undefined,
    ...evidence,
  };
}

async function proveContractualReceiver(context, base, repdRef) {
  const receiverUrl = new URL(base);
  receiverUrl.searchParams.set("repd_ref", repdRef);
  const receiverPage = await context.newPage();
  try {
    await receiverPage.goto(receiverUrl.href, { waitUntil: "domcontentloaded" });
    const proof = await proveReceiverSelection(receiverPage, base, repdRef);
    return {
      repd_ref: repdRef,
      receiver_present: true,
      tested: true,
      receiver_url: proof.url,
      receiver_evidence: proof.evidence,
    };
  } finally {
    await receiverPage.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidate = new URL(args.candidate);
  assert.ok(["http:", "https:"].includes(candidate.protocol));
  assert.match(candidate.pathname, new RegExp(`/releases/${RELEASE_ID}/(?:index\\.html)?$`, "u"));
  const { receiver, base } = await loadReceiverContract(candidate);
  const chromium = await loadChromium();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const errors = [];
  const requests = new Set();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-GB", reducedMotion: "reduce" });
    context.on("request", (request) => requests.add(request.url()));
    context.on("requestfailed", (request) => {
      const url = new URL(request.url());
      if (url.origin === candidate.origin || url.origin === base.origin) errors.push(`request: ${request.url()} :: ${request.failure()?.errorText}`);
    });
    const attachErrors = (target) => {
      target.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
      target.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    };
    context.on("page", attachErrors);
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
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

    // The GridAtlas contractual golden is authoritative even when the inherited
    // PipelineNews snapshot does not contain that identity. When it is present,
    // prove the complete PipelineNews-to-receiver route as additional evidence.
    const pipelineGolden = await proveProject(page, context, candidate, base, receiver.golden_repd_ref, false);
    const contractualGolden = {
      ...await proveContractualReceiver(context, base, receiver.golden_repd_ref),
      pipeline_present: pipelineGolden.present,
      pipeline_evidence: pipelineGolden,
    };
    const optional = [];
    for (const repdRef of ["17494", "13599"]) {
      optional.push(await proveProject(page, context, candidate, base, repdRef, false));
    }

    const noMap = new URL(candidate);
    noMap.search = "";
    noMap.searchParams.set("repd_ref", "12780");
    await page.goto(noMap.href, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.dataset.fastReady === "true");
    await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "1");
    assert.equal(await page.locator("#repd-12780 a.atlaslink").count(), 0);
    assert.equal((await page.locator("#repd-12780 .action-disabled").innerText()).trim(), "NO MAP");
    assert.deepEqual(errors, [], errors.join("\n"));

    const result = {
      schema: "pipelinenews.gridatlas-pointer-receiver-browser-proof.v1",
      classification: "VERIFIED_REAL_ATLAS_V9_RECEIVER",
      generation: GENERATION,
      release_id: RELEASE_ID,
      playwright_version: process.env.PLAYWRIGHT_VERSION || "runtime-resolved",
      browser_version: browser.version(),
      candidate_url: candidate.href,
      pointer: receiver.pointer,
      pointer_commit: receiver.pointer_commit,
      atlas_base_url: base.href,
      contractual_golden: contractualGolden,
      optional_sentinels: optional,
      atlas_repd_ref: contractualGolden.repd_ref,
      receiver_url: contractualGolden.receiver_url,
      receiver_evidence: contractualGolden.receiver_evidence,
      external_atlas_network_used: [...requests].some((url) => url.startsWith(base.href)),
      synthetic_receiver: false,
      route_interceptions: 0,
      no_map: { repd_ref: "12780", presentation: "NO MAP" },
      inherited_runtime: { rows_per_page: 100, initial_map_links: initialMapLinks, initial_no_map: initialNoMap, relationship_rows: 3, relationship_project_bindings: 0, sector_cartridge_opened: true },
      errors,
      status: "PASS",
    };
    assert.equal(result.external_atlas_network_used, true);
    await mkdir(path.dirname(path.resolve(args.output)), { recursive: true });
    await writeFile(path.resolve(args.output), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ classification: result.classification, receiver: result.receiver_url, golden: result.contractual_golden.repd_ref })}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
