import { readFile, mkdir, rename, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const pointer = await readJson("releases/current.json");
const manifest = await readJson(pointer.manifest);
const engineObject = manifest.objects.modules.find((item) => item.role === "official_frontier_engine");
if (!engineObject) throw new Error("current release does not expose official_frontier_engine");
const { buildReferenceGroups, normalisePlanningReference, resolvePlanningBinding, selectFrontier, sourceHealth } = await import(new URL(engineObject.path, root));

const statePath = "state/official-source-cursor.json";
const snapshotPath = "data/official-source/latest.json";
const now = new Date().toISOString();
const deadline = Date.now() + 165_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function optionalJson(path, fallback) {
  try { return await readJson(path); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function atomicJson(path, value) {
  const target = new URL(path, root);
  await mkdir(new URL("./", target), { recursive: true });
  const temporary = new URL(`${target.pathname}.tmp-${process.pid}`, target);
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  await rename(temporary, target);
}

const projects = [];
for (let part = 1; part <= 16; part += 1) {
  const payload = await readJson(`newsv7/data/v9.1/projects/part-${String(part).padStart(3, "0")}.json`);
  const rows = Array.isArray(payload) ? payload : payload.projects || payload.items || [];
  projects.push(...rows);
}
if (projects.length !== 7680) throw new Error(`REPD spine must contain 7680 projects, got ${projects.length}`);
const groups = buildReferenceGroups(projects);
const state = await optionalJson(statePath, { schema: "pipelinenews.official-source-cursor.v1", next_index: 0, last_good_at: null });
const previous = await optionalJson(snapshotPath, { planit_by_reference: {}, govuk_items: [] });
const frontier = selectFrontier(groups, state, Number(process.env.PLANIT_BUDGET || 48));

const planitByReference = { ...previous.planit_by_reference };
let planitAttempted = 0;
let planitSucceeded = 0;
let lastPlanitStatus = null;
let stopForRateLimit = false;
for (let offset = 0; offset < frontier.selected.length && Date.now() < deadline && !stopForRateLimit; offset += 2) {
  const pair = frontier.selected.slice(offset, offset + 2);
  await Promise.all(pair.map(async (group) => {
    planitAttempted += 1;
    const url = new URL("https://www.planit.org.uk/api/applics/json");
    url.searchParams.set("id_match", group.query_reference);
    url.searchParams.set("pg_sz", "10");
    url.searchParams.set("compress", "on");
    try {
      const response = await fetch(url, { headers: { "User-Agent": "PipelineNews/1.0 (+https://github.com/Ventusltd/pipelinenews)" }, signal: AbortSignal.timeout(10_000) });
      lastPlanitStatus = response.status;
      if (response.status === 429) { stopForRateLimit = true; return; }
      if (!response.ok) return;
      const payload = await response.json();
      const records = Array.isArray(payload.records) ? payload.records : [];
      planitSucceeded += 1;
      planitByReference[group.normalised_reference] = {
        checked_at: now,
        query_reference: group.query_reference,
        records: records.map((record) => ({
          uid: record.uid ?? null,
          reference: record.reference ?? null,
          name: record.name ?? null,
          area_name: record.area_name ?? null,
          description: record.description ?? null,
          app_state: record.app_state ?? null,
          start_date: record.start_date ?? null,
          decided_date: record.decided_date ?? null,
          last_changed: record.last_changed ?? null,
          url: record.url ?? record.link ?? null,
          binding: resolvePlanningBinding(record, group),
        })),
      };
    } catch { /* health below records the failure; prior good data is retained */ }
  }));
  if (!stopForRateLimit) await sleep(250);
}

let govukAttempted = 0;
let govukSucceeded = 0;
let lastGovukStatus = null;
let govukItems = previous.govuk_items || [];
try {
  govukAttempted = 1;
  const url = new URL("https://www.gov.uk/api/search.json");
  url.searchParams.set("q", "renewable energy planning");
  url.searchParams.set("filter_organisations", "department-for-energy-security-and-net-zero");
  url.searchParams.set("count", "100");
  url.searchParams.set("order", "-public_timestamp");
  url.searchParams.set("fields", "title,description,link,public_timestamp");
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  lastGovukStatus = response.status;
  if (response.ok) {
    const payload = await response.json();
    govukSucceeded = 1;
    govukItems = (payload.results || []).map((item) => {
      const haystack = normalisePlanningReference(`${item.title || ""} ${item.description || ""}`);
      const matches = groups.filter((group) => group.normalised_reference.length >= 6 && haystack.includes(group.normalised_reference));
      const bindings = matches.map((group) => resolvePlanningBinding({ reference: group.query_reference, name: item.title, description: item.description }, group));
      return { title: item.title, description: item.description, url: new URL(item.link, "https://www.gov.uk").toString(), public_timestamp: item.public_timestamp, bindings };
    });
  }
} catch { /* health below records the failure; prior good data is retained */ }

const planitHealth = sourceHealth({ attempted: planitAttempted, succeeded: planitSucceeded, statusCode: lastPlanitStatus, priorGoodAt: state.last_good_at, message: stopForRateLimit ? "rate limited; cursor retained for unfinished work" : null });
const govukHealth = sourceHealth({ attempted: govukAttempted, succeeded: govukSucceeded, statusCode: lastGovukStatus, priorGoodAt: state.last_good_at });
if (planitSucceeded === 0 && govukSucceeded === 0) throw new Error("all official adapters unavailable; refusing an empty-success snapshot");

const completedGroups = planitSucceeded;
const nextIndex = groups.length ? (Number(state.next_index || 0) + completedGroups) % groups.length : 0;
await atomicJson(snapshotPath, {
  schema: "pipelinenews.official-source-snapshot.v1",
  generated_at: now,
  spine: { projects: projects.length, reference_groups: groups.length },
  source_health: { planit: planitHealth, govuk: govukHealth },
  planit_by_reference: planitByReference,
  govuk_items: govukItems,
  google_news: { enabled: true, credibility_score: 30, role: "noisy discovery only" },
});
await atomicJson(statePath, { schema: "pipelinenews.official-source-cursor.v1", next_index: nextIndex, total_groups: groups.length, last_run_at: now, last_good_at: now });
console.log(`official-source poll: ${projects.length} projects; PlanIt ${planitSucceeded}/${planitAttempted}; GOV.UK ${govukSucceeded}/${govukAttempted}; next=${nextIndex}`);
