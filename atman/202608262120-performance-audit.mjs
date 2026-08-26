import { chromium } from "playwright";
import fs from "node:fs/promises";

const targets = [
  { id: "pipelinenews-modular", url: "https://ventusltd.github.io/pipelinenews/releases/202608261927-index.html" },
  { id: "globalgrid-v9.6.1", url: "https://globalgrid2050.com/uk_renewables_pipeline/v9.6.1/?technology=solar&sort=updated_desc" },
  { id: "globalgrid-v5", url: "https://globalgrid2050.com/uk_renewables_pipeline/dashboard_v5_live.html" },
  { id: "globalgrid-original", url: "https://globalgrid2050.com/uk_renewables_pipeline/dashboard.html" },
];

const profiles = [
  { id: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

const rounds = Number(process.env.AUDIT_ROUNDS || 3);
const browser = await chromium.launch({ headless: true });
const results = [];

function delta(after, before, key) {
  return Number(((after[key] || 0) - (before[key] || 0)).toFixed(3));
}

async function metrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
}

async function snapshot(page, cdp) {
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const rows = [...document.querySelectorAll("tbody tr")];
    const visibleRows = rows.filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
    });
    return {
      title: document.title,
      readyState: document.readyState,
      textLength: document.body?.innerText.length || 0,
      domElements: document.getElementsByTagName("*").length,
      tableRows: rows.length,
      visibleRows: visibleRows.length,
      bodyHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      navigation: nav ? {
        ttfb: nav.responseStart,
        domContentLoaded: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd,
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
      } : null,
      resources: {
        count: resources.length,
        transferSize: resources.reduce((n, r) => n + (r.transferSize || 0), 0),
        encodedBodySize: resources.reduce((n, r) => n + (r.encodedBodySize || 0), 0),
        decodedBodySize: resources.reduce((n, r) => n + (r.decodedBodySize || 0), 0),
        json: resources.filter((r) => /\.json(?:\?|$)/i.test(r.name)).length,
        scripts: resources.filter((r) => r.initiatorType === "script").length,
      },
      longTasks: globalThis.__auditLongTasks || [],
    };
  });
  return { ...perf, engine: await metrics(cdp) };
}

async function sortByRepd(page) {
  return page.evaluate(async () => {
    const started = performance.now();
    const selects = [...document.querySelectorAll("select")];
    for (const select of selects) {
      const option = [...select.options].find((o) =>
        /repd.*(updated|date)|updated.*(newest|desc)|newest/i.test(o.textContent || "")
      );
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return { found: true, method: "select", label: option.textContent.trim(), duration: performance.now() - started };
      }
    }
    const clickable = [...document.querySelectorAll("button,[role=button],th,a")].find((el) =>
      /repd.*(updated|date)|updated.*(newest|desc)|newest/i.test(el.textContent || "")
    );
    if (clickable) {
      clickable.click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { found: true, method: "click", label: clickable.textContent.trim(), duration: performance.now() - started };
    }
    return { found: false, duration: performance.now() - started };
  });
}

async function stressScroll(page) {
  return page.evaluate(async () => {
    const started = performance.now();
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const samples = [];
    for (let i = 0; i <= 20; i++) {
      scrollTo(0, max * (i / 20));
      await new Promise((r) => requestAnimationFrame(r));
      samples.push({ y: scrollY, height: document.documentElement.scrollHeight });
    }
    for (let i = 20; i >= 0; i--) {
      scrollTo(0, max * (i / 20));
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { duration: performance.now() - started, max, samples };
  });
}

for (const profile of profiles) {
  const context = await browser.newContext(profile);
  for (const target of targets) {
    for (let round = 1; round <= rounds; round++) {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      await page.addInitScript(() => {
        globalThis.__auditLongTasks = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            globalThis.__auditLongTasks.push({ start: e.startTime, duration: e.duration });
          }
        }).observe({ type: "longtask", buffered: true });
      });
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
      page.on("pageerror", (e) => pageErrors.push(String(e)));
      page.on("requestfailed", (r) => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));

      const wallStart = Date.now();
      let navigationError = null;
      try {
        await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(5000);
      } catch (e) {
        navigationError = String(e);
      }
      const settledMs = Date.now() - wallStart;
      const before = await snapshot(page, cdp);
      const engineBefore = before.engine;
      const sort = await sortByRepd(page);
      await page.waitForTimeout(1500);
      const afterSort = await snapshot(page, cdp);
      const scroll = await stressScroll(page);
      await page.waitForTimeout(500);
      const afterScroll = await snapshot(page, cdp);

      if (round === 1) {
        await page.screenshot({ path: `audit-results/${target.id}-${profile.id}.png`, fullPage: true });
      }
      results.push({
        target: target.id,
        url: target.url,
        profile: profile.id,
        round,
        settledMs,
        navigationError,
        before,
        sort,
        afterSort,
        scroll,
        afterScroll,
        cost: {
          sortTaskMs: delta(afterSort.engine, engineBefore, "TaskDuration") * 1000,
          sortScriptMs: delta(afterSort.engine, engineBefore, "ScriptDuration") * 1000,
          sortLayoutCount: delta(afterSort.engine, engineBefore, "LayoutCount"),
          sortRecalcStyleCount: delta(afterSort.engine, engineBefore, "RecalcStyleCount"),
          scrollTaskMs: delta(afterScroll.engine, afterSort.engine, "TaskDuration") * 1000,
          scrollScriptMs: delta(afterScroll.engine, afterSort.engine, "ScriptDuration") * 1000,
          scrollLayoutCount: delta(afterScroll.engine, afterSort.engine, "LayoutCount"),
          scrollRecalcStyleCount: delta(afterScroll.engine, afterSort.engine, "RecalcStyleCount"),
          heapAfterLoadMB: Number(((before.engine.JSHeapUsedSize || 0) / 1048576).toFixed(2)),
          heapAfterScrollMB: Number(((afterScroll.engine.JSHeapUsedSize || 0) / 1048576).toFixed(2)),
          nodesAfterLoad: before.engine.Nodes || null,
          nodesAfterScroll: afterScroll.engine.Nodes || null,
        },
        consoleErrors,
        pageErrors,
        failedRequests,
      });
      await page.close();
    }
  }
  await context.close();
}
await browser.close();

const groups = new Map();
for (const r of results) {
  const key = `${r.target}|${r.profile}`;
  const rows = groups.get(key) || [];
  rows.push(r);
  groups.set(key, rows);
}
const median = (values) => {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : null;
};
const summary = [...groups].map(([key, rows]) => {
  const [target, profile] = key.split("|");
  return {
    target, profile,
    settledMs: median(rows.map((r) => r.settledMs)),
    domElements: median(rows.map((r) => r.before.domElements)),
    tableRows: median(rows.map((r) => r.before.tableRows)),
    bodyHeight: median(rows.map((r) => r.before.bodyHeight)),
    resourceTransferKB: median(rows.map((r) => r.before.resources.transferSize / 1024)),
    decodedResourceMB: median(rows.map((r) => r.before.resources.decodedBodySize / 1048576)),
    longTaskCount: median(rows.map((r) => r.before.longTasks.length)),
    longTaskTotalMs: median(rows.map((r) => r.before.longTasks.reduce((n, x) => n + x.duration, 0))),
    loadTaskMs: median(rows.map((r) => (r.before.engine.TaskDuration || 0) * 1000)),
    loadScriptMs: median(rows.map((r) => (r.before.engine.ScriptDuration || 0) * 1000)),
    heapMB: median(rows.map((r) => r.cost.heapAfterLoadMB)),
    nodes: median(rows.map((r) => r.cost.nodesAfterLoad)),
    sortTaskMs: median(rows.map((r) => r.cost.sortTaskMs)),
    sortLayoutCount: median(rows.map((r) => r.cost.sortLayoutCount)),
    scrollWallMs: median(rows.map((r) => r.scroll.duration)),
    scrollTaskMs: median(rows.map((r) => r.cost.scrollTaskMs)),
    scrollLayoutCount: median(rows.map((r) => r.cost.scrollLayoutCount)),
    errors: rows.reduce((n, r) => n + r.consoleErrors.length + r.pageErrors.length + r.failedRequests.length, 0),
  };
});

await fs.writeFile("audit-results/performance-audit.json", JSON.stringify({ generatedAt: new Date().toISOString(), rounds, summary, results }, null, 2));
const cols = ["target","profile","settledMs","resourceTransferKB","decodedResourceMB","domElements","tableRows","longTaskCount","longTaskTotalMs","loadTaskMs","heapMB","nodes","sortTaskMs","sortLayoutCount","scrollWallMs","scrollTaskMs","scrollLayoutCount","errors"];
const md = [
  "# PipelineNews performance audit",
  "",
  "Measured in GitHub Actions Chromium. Medians are reported; raw runs and screenshots are in the artifact.",
  "",
  "| " + cols.join(" | ") + " |",
  "|" + cols.map(() => "---").join("|") + "|",
  ...summary.map((r) => "| " + cols.map((c) => r[c] == null ? "" : typeof r[c] === "number" ? Number(r[c].toFixed(2)) : r[c]).join(" | ") + " |"),
  "",
  "Interpretation must use the raw evidence. This audit performs no deployment and changes no release.",
].join("\n");
await fs.writeFile("audit-results/performance-audit.md", md);
console.log(md);
