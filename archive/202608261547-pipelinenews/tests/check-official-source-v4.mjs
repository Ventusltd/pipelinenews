import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  loadOfficialFrontierEngine,
  PINNED_AUTHORITY_SAFE_ENGINE,
  resolveOfficialFrontierEngine,
} from "../tooling/official-frontier-engine-v4.mjs";

const root = new URL("../", import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const pointer = await json("releases/current.json");
const manifest = await json(pointer.manifest);

assert.equal(pointer.release_id, "202608251929-pipelinenews");
assert.equal(pointer.channel, "current");
assert.equal(Array.isArray(manifest.objects?.modules), false);
assert.deepEqual(resolveOfficialFrontierEngine(manifest), PINNED_AUTHORITY_SAFE_ENGINE);

const loaded = await loadOfficialFrontierEngine(manifest, root);
assert.deepEqual(loaded.descriptor, PINNED_AUTHORITY_SAFE_ENGINE);
assert.equal(loaded.module.POLICY_ID, "PN-OFFICIAL-FRONTIER-V3-AUTHORITY-SAFE");
for (const key of [
  "buildReferenceGroups",
  "normalisePlanningReference",
  "resolvePlanningBinding",
  "selectFrontier",
  "sourceHealth",
]) {
  assert.equal(typeof loaded.module[key], "function", key);
}

const legacyDescriptor = {
  ...PINNED_AUTHORITY_SAFE_ENGINE,
  role: "official_frontier_engine",
};
const legacyManifest = { objects: { modules: [legacyDescriptor] } };
assert.deepEqual(resolveOfficialFrontierEngine(legacyManifest), legacyDescriptor);

await assert.rejects(
  loadOfficialFrontierEngine({
    objects: {
      modules: [{ ...legacyDescriptor, sha256: "0".repeat(64) }],
    },
  }, root),
  /official_frontier_engine content hash mismatch/u,
);

console.log("PASS official-source v4: current and legacy manifest engine contracts resolve through verified bytes");

