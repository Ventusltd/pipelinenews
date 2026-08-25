import { loadCanonicalProjectsNewsV1 } from "./canonical-projects-newsv1.js";

const RELEASE_URL = "contracts/release.newsv1.json";

function invariant(condition, message) {
  if (!condition) throw new Error(`News V1 canonical projects: ${message}`);
}

async function fetchRelease() {
  const response = await fetch(RELEASE_URL, { cache: "default" });
  invariant(response.ok, `${RELEASE_URL} returned HTTP ${response.status}`);
  invariant(new URL(response.url).origin === window.location.origin, `${RELEASE_URL} redirected cross-origin`);
  return response.json();
}

export async function loadCanonicalProjectsNewsV1Release({ onFirstPartition } = {}) {
  const release = await fetchRelease();
  invariant(release.release === "newsv1", "release contract mismatch");
  invariant(release.frozen_source?.release === "9.7", "frozen-source release mismatch");
  invariant(release.data_parent?.release === "9.1", "data-parent release mismatch");
  const model = await loadCanonicalProjectsNewsV1({ onFirstPartition });
  invariant(model.contract.release === "9.1", "canonical data contract mismatch");
  invariant(model.projects.length === release.expected.project_count, "project count mismatch");
  invariant(model.metadata.capacity_mw === release.expected.capacity_mw, "capacity mismatch");
  invariant(model.metadata.largest_mw === release.expected.largest_mw, "largest project mismatch");
  invariant(model.metadata.geometry_count === release.expected.valid_geometry_count, "valid geometry count mismatch");
  invariant(model.metadata.missing_geometry_count === release.expected.missing_geometry_count, "missing geometry count mismatch");
  return Object.freeze({
    release: Object.freeze(release),
    dataContract: model.contract,
    metadata: Object.freeze({ ...model.metadata, ui_release: "newsv1" }),
    projects: model.projects,
  });
}
