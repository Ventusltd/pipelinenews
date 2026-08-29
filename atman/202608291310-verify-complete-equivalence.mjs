#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch (error) {
    if (!process.env.PLAYWRIGHT_MODULE) throw error;
    return (await import(process.env.PLAYWRIGHT_MODULE)).chromium;
  }
}

const args = Object.fromEntries(process.argv.slice(2).reduce(
  (pairs, value, index, values) => value.startsWith("--")
    ? [...pairs, [value.slice(2), values[index + 1]]]
    : pairs,
  [],
));
if (!args.candidate || !args.baseline || !args.report) {
  throw new Error("--candidate, --baseline and --report are required");
}

const GENERATION = "202608291310";
const CANDIDATE_GENERATION = "202608291310";
const TECHNOLOGIES = ["all", "solar", "bess", "wind_onshore", "wind_offshore"];
const STATUSES = ["All", "Operational", "Under Construction", "Awaiting Construction", "Application Submitted"];
const NEWS_MODES = ["ALL", "UK", "INTERNATIONAL", "US", "EUROPE", "SOLAR", "BESS", "CONSENT", "CONSTRUCTION", "OPERATIONAL", "FINANCE"];
const checks = [];
const sessions = [];
const gate = (id, pass, evidence) => checks.push({ id, pass: Boolean(pass), evidence });

function firstNumber(text) {
  const match = String(text).replaceAll(",", "").match(/\d+(?:\.\d+)?/u);
  return match ? Number(match[0]) : Number.NaN;
}

function rangeTotal(text) {
  const match = String(text).replaceAll(",", "").match(/\bof\s+(\d+)\b/u);
  return match ? Number(match[1]) : Number.NaN;
}

async function clearProjects(page) {
  await page.locator("#clearFilters").click();
  await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "7680");
}

async function projectMatrix(page, label, width, exhaustive) {
  const result = { technologies: {}, statuses: {}, counties: {}, county_options: [] };
  const technologies = exhaustive ? TECHNOLOGIES : ["solar", "bess"];
  for (const value of technologies) {
    await page.locator(`#tech [data-technology="${value}"]`).click();
    const observation = await page.evaluate((selected) => ({
      count: Number(document.querySelector("#resultsMeta")?.dataset.filteredCount),
      pressed: document.querySelector(`#tech [data-technology="${selected}"]`)?.getAttribute("aria-pressed"),
      rows: document.querySelectorAll("#tbody>tr").length,
    }), value);
    result.technologies[value] = observation.count;
    gate(`${label}-${width}-technology-${value}`, observation.count > 0 && observation.pressed === "true" && observation.rows > 0, observation);
  }
  await clearProjects(page);

  const statuses = exhaustive ? STATUSES : ["Operational", "Application Submitted"];
  for (const value of statuses) {
    await page.locator(`#status [data-official-status="${value}"]`).click();
    const observation = await page.evaluate((selected) => ({
      count: Number(document.querySelector("#resultsMeta")?.dataset.filteredCount),
      pressed: document.querySelector(`#status [data-official-status="${selected}"]`)?.getAttribute("aria-pressed"),
      rows: document.querySelectorAll("#tbody>tr").length,
    }), value);
    result.statuses[value] = observation.count;
    gate(`${label}-${width}-status-${value.replaceAll(" ", "-")}`, observation.count > 0 && observation.pressed === "true" && observation.rows > 0, observation);
  }
  await clearProjects(page);

  result.county_options = await page.locator("#county option").evaluateAll((options) => options.map((option) => option.value));
  const counties = exhaustive ? result.county_options.filter((value) => value !== "All") : result.county_options.slice(1, 3);
  for (const value of counties) {
    await page.locator("#county").selectOption(value);
    const observation = await page.evaluate((selected) => ({
      count: Number(document.querySelector("#resultsMeta")?.dataset.filteredCount),
      selected: document.querySelector("#county")?.value,
      rows: document.querySelectorAll("#tbody>tr").length,
    }), value);
    result.counties[value] = observation.count;
    gate(`${label}-${width}-county-${value}`, observation.count > 0 && observation.selected === value && observation.rows > 0, observation);
  }
  await clearProjects(page);
  gate(`${label}-${width}-county-options`, result.county_options.length > 1 && new Set(result.county_options).size === result.county_options.length, result.county_options.length);
  return result;
}

async function newsMatrix(page, label, width, exhaustive) {
  const modes = exhaustive ? NEWS_MODES : ["ALL", "UK", "INTERNATIONAL", "SOLAR", "BESS"];
  const result = {};
  for (const mode of modes) {
    await page.locator(`#newsTools [data-news="${mode}"]`).click();
    const observation = await page.evaluate((selected) => {
      const range = document.querySelector("#newsWindowRange")?.textContent || "";
      const stories = document.querySelectorAll("#stories .story").length;
      const empty = document.querySelectorAll("#stories .news-empty").length;
      return {
        active: document.querySelector(`#newsTools [data-news="${selected}"]`)?.classList.contains("active"),
        range,
        stories,
        empty,
      };
    }, mode);
    const total = observation.range ? rangeTotal(observation.range) : observation.stories;
    result[mode] = total;
    gate(`${label}-${width}-news-filter-${mode}`, observation.active && Number.isFinite(total) && ((total > 0 && observation.stories > 0) || (total === 0 && observation.empty === 1)), { ...observation, total });
  }
  await page.locator('#newsTools [data-news="ALL"]').click();
  return result;
}

async function observe(browser, label, url, viewport) {
  const width = viewport.width;
  const mobile = width === 390;
  const exhaustive = width === 1440;
  const page = await browser.newPage({ viewport, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile });
  const requests = [];
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const started = Date.now();
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (label === "candidate") {
    await page.waitForFunction(() => document.body.dataset.fastReady === "true", null, { timeout: 120_000 });
  } else {
    await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.totalCount === "7680", null, { timeout: 120_000 });
  }
  const readyMs = Date.now() - started;
  const expectedNews = label === "candidate" ? "136" : "133";
  await page.waitForFunction((value) => document.querySelector("#newsMeta")?.textContent.includes(value), expectedNews, { timeout: 120_000 });

  const core = await page.evaluate(() => ({
    total: Number(document.querySelector("#resultsMeta")?.dataset.totalCount),
    filtered: Number(document.querySelector("#resultsMeta")?.dataset.filteredCount),
    capacity: document.querySelector("#v1")?.textContent.trim(),
    largest: document.querySelector("#v3")?.textContent.trim(),
    columns: document.querySelectorAll(".tablewrap thead th").length,
    rows: document.querySelectorAll("#tbody>tr").length,
    rootOverflow: document.scrollingElement.scrollWidth - document.documentElement.clientWidth,
    tableClient: document.querySelector(".tablewrap")?.clientWidth,
    tableScroll: document.querySelector(".tablewrap")?.scrollWidth,
    tableOverflow: getComputedStyle(document.querySelector(".tablewrap")).overflowX,
    news: document.querySelector("#newsMeta")?.textContent.trim(),
  }));
  const observedCapacity = firstNumber(core.capacity);
  const expectedCapacity = label === "candidate" ? 356474.09 : 356474;
  gate(`${label}-${width}-canonical`, core.total === 7680 && core.filtered === 7680 && Math.abs(observedCapacity - expectedCapacity) < 0.001 && core.largest.includes("4,100"), { ...core, observedCapacity, expectedCapacity });
  gate(`${label}-${width}-columns`, core.columns === 11, core.columns);
  gate(`${label}-${width}-news-count`, core.news.includes(expectedNews), core.news);
  if (label === "candidate") {
    gate(`${label}-${width}-100-rows`, core.rows === 100, core.rows);
    gate(`${label}-${width}-first-paint`, readyMs <= 5000, { ready_ms: readyMs, maximum_ms: 5000 });
    const startupRelationship = requests.filter((path) => path.includes(`202608282200-federated-relationships`) || path.includes(`202608282200-relationship-governance-status`));
    gate(`${label}-${width}-relationship-zero-startup`, startupRelationship.length === 0, startupRelationship);
  }
  if (mobile) {
    gate(`${label}-390-contained-root`, core.rootOverflow <= 1, core.rootOverflow);
    gate(`${label}-390-table-scroll`, core.tableScroll > core.tableClient && ["auto", "scroll"].includes(core.tableOverflow), core);
  }

  await page.locator("#search").fill("East Pye");
  await page.waitForFunction(() => document.querySelector("#resultsMeta")?.dataset.filteredCount === "1");
  gate(`${label}-${width}-search-east-pye`, (await page.locator("#repd-17494").count()) === 1, await page.locator("#resultsMeta").textContent());
  await clearProjects(page);

  const projects = await projectMatrix(page, label, width, exhaustive);
  await page.locator("#sortProjects").selectOption("updated_desc");
  gate(`${label}-${width}-sort-desc`, (await page.locator("#repdUpdatedHeader").getAttribute("aria-sort")) === "descending", "descending");
  await page.locator("#sortProjects").selectOption("updated_asc");
  gate(`${label}-${width}-sort-asc`, (await page.locator("#repdUpdatedHeader").getAttribute("aria-sort")) === "ascending", "ascending");
  await clearProjects(page);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportInline").click();
  const download = await downloadPromise;
  gate(`${label}-${width}-csv-export`, download.suggestedFilename().endsWith(".csv"), download.suggestedFilename());
  gate(`${label}-${width}-atlas-links`, (await page.locator("a.atlaslink").count()) > 0, await page.locator("a.atlaslink").count());

  const news = await newsMatrix(page, label, width, exhaustive);
  await page.locator("#newsSearch").fill("Beacon Fen");
  const beaconStories = await page.locator("#stories .story").count();
  gate(`${label}-${width}-news-search-beacon-fen`, beaconStories > 0, beaconStories);
  await page.locator("#newsSearch").fill("");

  if (label === "candidate") {
    const firstProjectId = await page.locator("#tbody>tr").first().getAttribute("id");
    const firstProjectRange = await page.locator("#projectWindowControls [data-window-range]").textContent();
    await page.locator('#projectWindowControls [data-window="next"]').click();
    const nextProjectId = await page.locator("#tbody>tr").first().getAttribute("id");
    const nextProjectRange = await page.locator("#projectWindowControls [data-window-range]").textContent();
    await page.locator('#projectWindowControls [data-window="previous"]').click();
    const restoredProjectId = await page.locator("#tbody>tr").first().getAttribute("id");
    const restoredProjectRange = await page.locator("#projectWindowControls [data-window-range]").textContent();
    gate(`${label}-${width}-project-pagination`, firstProjectRange.includes("1–100") && nextProjectRange.includes("101–200") && restoredProjectRange.includes("1–100") && firstProjectId !== nextProjectId && firstProjectId === restoredProjectId && (await page.locator("#tbody>tr").count()) === 100, { firstProjectRange, nextProjectRange, restoredProjectRange, firstProjectId, nextProjectId, restoredProjectId });

    await page.locator('#newsTools [data-news="ALL"]').click();
    const firstArticleId = await page.locator("#stories .story").first().getAttribute("data-article-id");
    const firstNewsRange = await page.locator("#newsWindowRange").textContent();
    await page.locator("#newsMore").click();
    const nextArticleId = await page.locator("#stories .story").first().getAttribute("data-article-id");
    const nextNewsRange = await page.locator("#newsWindowRange").textContent();
    await page.locator("#newsPrevious").click();
    const restoredArticleId = await page.locator("#stories .story").first().getAttribute("data-article-id");
    const restoredNewsRange = await page.locator("#newsWindowRange").textContent();
    gate(`${label}-${width}-news-pagination`, firstNewsRange.includes("1–30") && nextNewsRange.includes("31–60") && restoredNewsRange.includes("1–30") && firstArticleId !== nextArticleId && firstArticleId === restoredArticleId, { firstNewsRange, nextNewsRange, restoredNewsRange, firstArticleId, nextArticleId, restoredArticleId });

    await page.locator("#federatedRelationshipOpen").click();
    await page.waitForFunction(() => document.querySelector("#federatedRelationshipHost")?.dataset.federatedRelationshipState === "ready", null, { timeout: 30000 });
    await page.locator("#federatedRelationshipOpen").click();
    const lazy = {
      module: requests.filter((path) => path.endsWith(`/202608282200-federated-relationships.mjs`)).length,
      payload: requests.filter((path) => path.endsWith(`/202608282200-relationship-governance-status.json`)).length,
      rows: await page.locator("#federatedRelationshipHost tbody tr").count(),
      abstain: await page.locator("#federatedRelationshipHost td", { hasText: "ABSTAIN" }).count(),
    };
    gate(`${label}-${width}-relationship-lazy-once`, lazy.module === 1 && lazy.payload === 1, lazy);
    gate(`${label}-${width}-relationship-abstention`, lazy.rows === 3 && lazy.abstain === 3, lazy);
  }

  gate(`${label}-${width}-console-cors`, consoleErrors.length === 0 && pageErrors.length === 0 && failedRequests.length === 0, { consoleErrors, pageErrors, failedRequests });
  const session = { label, viewport, ready_ms: readyMs, core, projects, news, request_count: requests.length, console_errors: consoleErrors.length, page_errors: pageErrors.length, failed_requests: failedRequests.length };
  sessions.push(session);
  await page.close();
  return session;
}

const chromium = await loadChromium();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const baseline = await observe(browser, "baseline", args.baseline, viewport);
    const candidate = await observe(browser, "candidate", args.candidate, viewport);
    gate(`equivalence-${viewport.width}-technology-counts`, JSON.stringify(candidate.projects.technologies) === JSON.stringify(baseline.projects.technologies), { baseline: baseline.projects.technologies, candidate: candidate.projects.technologies });
    gate(`equivalence-${viewport.width}-status-counts`, JSON.stringify(candidate.projects.statuses) === JSON.stringify(baseline.projects.statuses), { baseline: baseline.projects.statuses, candidate: candidate.projects.statuses });
    gate(`equivalence-${viewport.width}-county-options`, JSON.stringify(candidate.projects.county_options) === JSON.stringify(baseline.projects.county_options), { baseline: baseline.projects.county_options.length, candidate: candidate.projects.county_options.length });
    gate(`equivalence-${viewport.width}-county-counts`, JSON.stringify(candidate.projects.counties) === JSON.stringify(baseline.projects.counties), { baseline: baseline.projects.counties, candidate: candidate.projects.counties });
    const newsNoLoss = Object.entries(baseline.news).every(([mode, count]) => candidate.news[mode] >= count);
    gate(`equivalence-${viewport.width}-news-no-loss`, newsNoLoss, { baseline: baseline.news, candidate: candidate.news });
  }
} catch (error) {
  gate("browser-completion", false, error.stack || error.message);
} finally {
  await browser.close();
}

if (checks.length !== 420) {
  throw new Error(`complete interaction matrix cardinality changed: ${checks.length} != 420`);
}
const failures = checks.filter((check) => !check.pass);
const result = {
  schema: "pipelinenews.atlas-v9-folder-complete-equivalence-report.v1",
  generation: GENERATION,
  candidate_generation: CANDIDATE_GENERATION,
  source_commit: process.env.GITHUB_SHA,
  workflow_run_id: process.env.GITHUB_RUN_ID,
  playwright_version: "1.55.0",
  predecessor_audit: { generation: "202608290020", run_id: 33220426609, checks: 420, failed: 0, disposition: "GREEN_COMPLETE_EQUIVALENCE_PARENT_EVIDENCE" },
  complete_matrix: { technologies: TECHNOLOGIES, statuses: STATUSES, counties: "EVERY_RENDERED_OPTION_AT_1440_AND_EQUIVALENT_OPTIONS_AT_390", news_modes: NEWS_MODES, project_pagination: true, news_pagination: true },
  sessions,
  checks,
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  promotion_eligible: failures.length === 0,
  evidence_scope: {
    phase: args.phase || "unspecified",
    candidate: "IMMUTABLE_TIMESTAMPED_RELEASE",
    browser_matrix_only: true,
    pointer_mutation_performed: false,
    pages_mutation_performed: false,
    catalogue_mutation_performed: false,
  },
};
await writeFile(args.report, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result.summary)}\n`);
if (failures.length) process.exitCode = 1;
