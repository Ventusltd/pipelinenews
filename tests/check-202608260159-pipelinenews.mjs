import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const id = "202608260159-pipelinenews";
const base = new URL(`../${id}/`, import.meta.url);
const read = (path) => readFile(new URL(path, base));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = await json("data/v9.1/build_manifest.json");
const news = await json("dist/major_project_news_v9_5_1.json");
const html = (await read("index.html")).toString("utf8");
const releaseManifest = JSON.parse(await readFile(new URL(`../releases/${id}.json`, import.meta.url), "utf8"));

assert.equal(manifest.project_count, 7680);
assert.equal(manifest.capacity_mw, 356474.09);
assert.equal(manifest.solar_count, 3563);
assert.equal(manifest.bess_count, 1609);
for (const entry of [...manifest.project_partitions, ...manifest.atlas_partitions]) {
  const bytes = await read(entry.path.replace(/^data\/v9\.1\//u, "data/v9.1/"));
  assert.equal(sha256(bytes), entry.sha256, entry.path);
}
const parts = await Promise.all(manifest.project_partitions.map((entry) => json(entry.path.replace(/^data\/v9\.1\//u, "data/v9.1/"))));
const projects = parts.flatMap((part) => part.projects);
assert.equal(projects.length, 7680);
assert.equal(Math.round(projects.reduce((sum, row) => sum + row.capacity_mw, 0) * 100) / 100, 356474.09);
const technology = (key) => {
  const rows = projects.filter((row) => row.technology === key);
  return [rows.length, Math.round(rows.reduce((sum, row) => sum + row.capacity_mw, 0) * 100) / 100];
};
assert.deepEqual(technology("solar"), [3563, 67013.29]);
assert.deepEqual(technology("bess"), [1609, 147681.94]);
assert.ok(projects.some((row) => String(row.repd_ref) === "13599"));
assert.ok(projects.some((row) => row.gg_project_id === "GG2050-REPD-17494"));
assert.ok(projects.every((row) => row.gg_project_id === `GG2050-REPD-${row.repd_ref}`));
assert.equal(news.all_items.length, 133);
assert.equal(news.canonical_items.length, 45);
assert.ok(news.all_items.every((row) => row.operator === "" && /^https:\/\/[^/]+\/$/u.test(row.url)));
assert.ok(news.all_items.every((row) => /^(?:UK|US|EUROPE|INTERNATIONAL|DISCOVERY) · (?:SOLAR|BESS|SOLAR \+ BESS) · /u.test(row.headline)));
assert.equal((html.match(/<th(?:\s|>)/gu) || []).length, 11);
assert.match(html, /vendor\/chart\.umd\.min\.js/);
assert.doesNotMatch(html, /cdn\.jsdelivr|raw\.githubusercontent/);
assert.match(html, /202608260159/);
for (const source of html.matchAll(/(?:src|href)="([^"]+)"/gu)) {
  const value = source[1];
  if (/^(?:https?:|#)/u.test(value)) continue;
  const local = value.split(/[?#]/u)[0];
  await read(local);
}
assert.equal(releaseManifest.timeline.incepted_at, "2026-08-26T01:59:35+01:00");
assert.equal(releaseManifest.publication.live, false);
assert.equal(releaseManifest.frozen_preservation.predecessor_release_bytes_written, false);
for (const [category, rows] of Object.entries(releaseManifest.byte_inventory)) {
  let bytes = 0;
  for (const item of rows) {
    const content = await readFile(new URL(`../${item.path}`, import.meta.url));
    assert.equal(content.length, item.bytes, item.path);
    assert.equal(sha256(content), item.sha256, item.path);
    bytes += content.length;
  }
  assert.deepEqual(releaseManifest.byte_accounting[category], { files: rows.length, bytes });
}
const proof = JSON.parse(await readFile(new URL(`../reports/${id}-proof.json`, import.meta.url), "utf8"));
assert.deepEqual(proof.byte_accounting, releaseManifest.byte_accounting);
console.log("CHECK 202608260159: PASS · 7,680 projects · 356,474.09 MW · 133 typed headlines · local closure");
