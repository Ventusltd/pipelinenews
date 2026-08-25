import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { loadOfficialFrontierEngine } from "./official-frontier-engine-v4.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const pointer = await readJson("releases/current.json");
const manifest = await readJson(pointer.manifest);
const { module: frontierEngine } = await loadOfficialFrontierEngine(manifest, root);
const { buildReferenceGroups, normalisePlanningReference, resolvePlanningBinding, selectFrontier, sourceHealth } = frontierEngine;

const statePath = "state/official-source-cursor.json";
const snapshotPath = "data/official-source/latest.json";
const now = new Date().toISOString();
const deadline = Date.now() + 165_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const optionalJson = async (path, fallback) => { try { return await readJson(path); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; } };
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
  projects.push(...(Array.isArray(payload) ? payload : payload.projects || payload.items || []));
}
if (projects.length !== 7680) throw new Error(`REPD spine must contain 7680 projects, got ${projects.length}`);
const groups = buildReferenceGroups(projects);
const state = await optionalJson(statePath, { schema: "pipelinenews.official-source-cursor.v1", next_index: 0, last_good_at: null });
const previous = await optionalJson(snapshotPath, { planit_by_reference: {}, govuk_items: [] });
const frontier = selectFrontier(groups, state, Number(process.env.PLANIT_BUDGET || 48));

const groupByReference = new Map(groups.map((group) => [group.normalised_reference, group]));
const planitByReference = Object.fromEntries(Object.entries(previous.planit_by_reference || {}).map(([reference, entry]) => {
  const group = groupByReference.get(reference);
  const records = (entry.records || []).map((record) => {
    const binding = group
      ? resolvePlanningBinding(record, group)
      : { role: "ABSTAIN", reason: "NO_REPD_REFERENCE_GROUP" };
    if (JSON.stringify(binding) === JSON.stringify(record.binding)) return record;
    return { ...record, previous_binding: record.previous_binding || record.binding, binding };
  });
  return [reference, { ...entry, records }];
}));
let attempted = 0;
let completed = 0;
let lastStatus = null;
let healthMessage = null;
for (const group of frontier.selected) {
  if (Date.now() >= deadline) { healthMessage = "run deadline reached; unfinished work retained"; break; }
  attempted += 1;
  const url = new URL("https://www.planit.org.uk/api/applics/json");
  url.searchParams.set("id_match", group.query_reference);
  url.searchParams.set("pg_sz", "10");
  url.searchParams.set("compress", "on");
  try {
    const response = await fetch(url, { headers: { "User-Agent": "PipelineNews/1.0 (+https://github.com/Ventusltd/pipelinenews)" }, signal: AbortSignal.timeout(10_000) });
    lastStatus = response.status;
    if (response.status === 429) {
      const retrySeconds = Math.min(15, Math.max(0, Number(response.headers.get("retry-after") || 0)));
      healthMessage = `rate limited; unfinished work retained${retrySeconds ? `; retry-after ${retrySeconds}s observed` : ""}`;
      if (retrySeconds && Date.now() + retrySeconds * 1000 < deadline) await sleep(retrySeconds * 1000);
      break;
    }
    if (!response.ok) { healthMessage = `PlanIt HTTP ${response.status}; unfinished work retained`; break; }
    const payload = await response.json();
    const records = Array.isArray(payload.records) ? payload.records : [];
    planitByReference[group.normalised_reference] = {
      checked_at: now,
      query_reference: group.query_reference,
      records: records.map((record) => ({
        uid: record.uid ?? null, reference: record.reference ?? null, altid: record.altid ?? null, name: record.name ?? null,
        area_name: record.area_name ?? null, description: record.description ?? null,
        app_state: record.app_state ?? null, start_date: record.start_date ?? null,
        decided_date: record.decided_date ?? null, last_changed: record.last_changed ?? null,
        url: record.url ?? record.link ?? null, binding: resolvePlanningBinding(record, group),
      })),
    };
    completed += 1;
  } catch (error) { healthMessage = `${error.name || "fetch error"}; unfinished work retained`; break; }
  await sleep(2_000);
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
      return { title: item.title, description: item.description, url: new URL(item.link, "https://www.gov.uk").toString(), public_timestamp: item.public_timestamp, bindings: matches.map((group) => resolvePlanningBinding({ reference: group.query_reference, name: item.title, description: item.description }, group)) };
    });
  }
} catch { /* health below records failure and preserves prior good items */ }

const priorPlanitGoodAt = state.planit_last_good_at || state.last_good_at || null;
const priorGovukGoodAt = state.govuk_last_good_at || state.last_good_at || null;
const planitHealth = sourceHealth({ attempted, succeeded: completed, statusCode: lastStatus, priorGoodAt: priorPlanitGoodAt, message: healthMessage });
const govukHealth = sourceHealth({ attempted: govukAttempted, succeeded: govukSucceeded, statusCode: lastGovukStatus, priorGoodAt: priorGovukGoodAt });
if (completed === 0 && govukSucceeded === 0) throw new Error("all official adapters unavailable; refusing an empty-success snapshot");
const nextIndex = groups.length ? (Number(state.next_index || 0) + completed) % groups.length : 0;
await atomicJson(snapshotPath, { schema: "pipelinenews.official-source-snapshot.v3", generated_at: now, spine: { projects: projects.length, reference_groups: groups.length }, source_health: { planit: planitHealth, govuk: govukHealth }, planit_by_reference: planitByReference, govuk_items: govukItems, google_news: { enabled: true, credibility_score: 30, role: "noisy discovery only" } });
await atomicJson(statePath, {
  schema: "pipelinenews.official-source-cursor.v3",
  next_index: nextIndex,
  total_groups: groups.length,
  last_run_at: now,
  planit_last_good_at: completed > 0 ? now : priorPlanitGoodAt,
  govuk_last_good_at: govukSucceeded > 0 ? now : priorGovukGoodAt,
});
console.log(`official-source v3 poll: ${projects.length} projects; PlanIt ${completed}/${attempted}; GOV.UK ${govukSucceeded}/${govukAttempted}; next=${nextIndex}`);

