import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const statePath = "state/repd-source.json";
const candidatePath = "data/repd-source/candidate.json";
const contentUrl = "https://www.gov.uk/api/content/government/publications/renewable-energy-planning-database-quarterly-extract";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

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

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift().map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim());
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const metadataResponse = await fetch(contentUrl, { signal: AbortSignal.timeout(10_000) });
if (!metadataResponse.ok) throw new Error(`GOV.UK Content API ${metadataResponse.status}`);
const metadata = await metadataResponse.json();
const attachment = (metadata.details?.attachments || []).find((item) => item.content_type === "text/csv" || /\.csv$/i.test(item.filename || item.url || ""));
if (!attachment?.url) throw new Error("current REPD CSV attachment not found");
const csvResponse = await fetch(attachment.url, { signal: AbortSignal.timeout(25_000) });
if (!csvResponse.ok) throw new Error(`REPD CSV ${csvResponse.status}`);
const csvBytes = Buffer.from(await csvResponse.arrayBuffer());
const rows = parseCsv(csvBytes.toString("utf8"));
if (rows.length < 1000 || !Object.hasOwn(rows[0] || {}, "Ref ID")) throw new Error("REPD source failed schema/row-count validation");
const ids = rows.map((row) => String(row["Ref ID"]).trim());
if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error("REPD source contains blank or duplicate Ref IDs");

const admittedProjects = [];
for (let part = 1; part <= 16; part += 1) {
  const payload = await readJson(`newsv7/data/v9.1/projects/part-${String(part).padStart(3, "0")}.json`);
  admittedProjects.push(...(Array.isArray(payload) ? payload : payload.projects || payload.items || []));
}
if (admittedProjects.length !== 7680) throw new Error(`admitted spine drift: ${admittedProjects.length}`);
const admittedIds = new Set(admittedProjects.map((project) => String(project.repd_ref ?? project.ref_id ?? project["Ref ID"] ?? "").trim()));
const previous = await optionalJson(statePath, { source_sha256: null, row_hashes: {} });
const rowHashes = Object.fromEntries(rows.map((row) => [String(row["Ref ID"]).trim(), sha256(JSON.stringify(row))]));
const sourceHash = sha256(csvBytes);
const newRows = rows.filter((row) => !admittedIds.has(String(row["Ref ID"]).trim()));
const sourceIds = new Set(ids);
const missingIds = [...admittedIds].filter((id) => id && !sourceIds.has(id)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
const changedIds = previous.source_sha256 && previous.source_sha256 !== sourceHash
  ? ids.filter((id) => previous.row_hashes[id] && previous.row_hashes[id] !== rowHashes[id])
  : [];
const checkedAt = new Date().toISOString();

await atomicJson(candidatePath, {
  schema: "pipelinenews.repd-source-candidate.v1",
  checked_at: checkedAt,
  changed_source: previous.source_sha256 !== null && previous.source_sha256 !== sourceHash,
  first_baseline: previous.source_sha256 === null,
  source: { title: attachment.title, url: attachment.url, govuk_updated_at: metadata.public_updated_at, sha256: sourceHash, bytes: csvBytes.length, rows: rows.length },
  admitted_spine: { rows: admittedProjects.length },
  delta: { new_ref_ids: newRows.map((row) => String(row["Ref ID"]).trim()), missing_ref_ids: missingIds, changed_ref_ids: changedIds },
  new_projects: newRows,
  admission: "CANDIDATE_ONLY_REQUIRES_FAIL_CLOSED_QUARTERLY_RELEASE",
});
await atomicJson(statePath, { schema: "pipelinenews.repd-source-state.v1", checked_at: checkedAt, source_url: attachment.url, source_sha256: sourceHash, source_rows: rows.length, row_hashes: rowHashes });
console.log(`REPD source ${attachment.title}: ${rows.length} rows; ${newRows.length} new; ${changedIds.length} changed; ${missingIds.length} missing`);
