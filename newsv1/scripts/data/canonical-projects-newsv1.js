const CONTRACT_URL = "contracts/release.v9.1.json";
const MANIFEST_URL = "data/v9.1/build_manifest.json";
const ALLOWED_TECHNOLOGIES = new Set(["solar", "bess", "wind_onshore", "wind_offshore"]);
const FETCH_CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 15000;
let canonicalLoadPromise = null;

function invariant(condition, message) {
  if (!condition) throw new Error(`V9.1 canonical projects: ${message}`);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function fetchJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(path, { cache: "default", signal: controller.signal });
    invariant(response.ok, `${path} returned HTTP ${response.status}`);
    invariant(new URL(response.url).origin === window.location.origin, `${path} redirected cross-origin`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(items, task) {
  const output = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      output[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, items.length) }, worker));
  return output;
}

function validatePartition(partition, part) {
  invariant(part.schema === "globalgrid2050.v9.project-partition.v9.1", `${partition.path} schema mismatch`);
  invariant(part.record_count === partition.record_count && part.projects.length === partition.record_count, `${partition.path} count mismatch`);
  return part.projects;
}

async function fetchPartition(partition) {
  return validatePartition(partition, await fetchJson(partition.path));
}

function validateProjects(sourceProjects) {
  const refs = new Set();
  const projectIds = new Set();
  let capacity = 0;
  let largest = 0;
  const counts = { solar: 0, bess: 0, wind_onshore: 0, wind_offshore: 0 };
  const projects = sourceProjects.map((project) => {
    invariant(typeof project.repd_ref === "string" && project.repd_ref, "missing REPD Ref");
    invariant(project.gg_project_id === `GG2050-REPD-${project.repd_ref}`, `invalid ID for ${project.repd_ref}`);
    invariant(project.identity_status === "REPD_BOUND" && project.identity_confidence === "authoritative", `unbound identity for ${project.repd_ref}`);
    invariant(ALLOWED_TECHNOLOGIES.has(project.technology), `out-of-scope technology for ${project.repd_ref}`);
    invariant(Number.isFinite(project.capacity_mw) && project.capacity_mw >= 1, `capacity below 1 MW for ${project.repd_ref}`);
    invariant(!refs.has(project.repd_ref), `duplicate REPD Ref ${project.repd_ref}`);
    invariant(!projectIds.has(project.gg_project_id), `duplicate project ID ${project.gg_project_id}`);
    refs.add(project.repd_ref);
    projectIds.add(project.gg_project_id);
    counts[project.technology] += 1;
    capacity += project.capacity_mw;
    largest = Math.max(largest, project.capacity_mw);
    return Object.freeze({ ...project });
  });
  return { projects, capacity, largest, counts };
}

async function loadCanonicalProjects(onFirstPartition) {
  const [contract, payload] = await Promise.all([fetchJson(CONTRACT_URL), fetchJson(MANIFEST_URL)]);
  invariant(contract.release === "9.1", "release contract mismatch");
  invariant(payload.schema === "globalgrid2050.v9.project-spine-build.v9.1", "project manifest schema mismatch");
  invariant(payload.release === "9.1", "project release mismatch");
  invariant(Array.isArray(payload.project_partitions) && payload.project_partitions.length > 0, "project partitions missing");
  invariant(payload.source_identity_sha256 === contract.source.identity_fixture_sha256, "identity hash mismatch");
  invariant(payload.source_coordinate_fixture_sha256 === contract.source.coordinate_fixture_sha256, "coordinate hash mismatch");
  invariant(payload.source_workbook_sha256 === contract.source.workbook_sha256, "workbook hash mismatch");

  const [firstDescriptor, ...remainingDescriptors] = payload.project_partitions;
  const firstProjects = await fetchPartition(firstDescriptor);
  const preview = validateProjects(firstProjects).projects;
  if (typeof onFirstPartition === "function") {
    onFirstPartition(Object.freeze({
      projects: Object.freeze(preview),
      loaded_count: preview.length,
      total_count: payload.project_count,
    }));
  }
  const remainingPartitions = await mapWithConcurrency(remainingDescriptors, fetchPartition);
  const partitions = [firstProjects, ...remainingPartitions];
  const sourceProjects = partitions.flat();
  invariant(sourceProjects.length === payload.project_count, "partition total mismatch");

  const { projects, capacity, largest, counts } = validateProjects(sourceProjects);

  const actual = {
    project_count: projects.length,
    capacity_mw: round2(capacity),
    largest_mw: largest,
    solar_count: counts.solar,
    bess_count: counts.bess,
    wind_onshore_count: counts.wind_onshore,
    wind_offshore_count: counts.wind_offshore,
  };
  Object.entries(contract.expected).forEach(([key, value]) => invariant(actual[key] === value, `${key} is ${actual[key]}, expected ${value}`));
  return Object.freeze({
    contract: Object.freeze(contract),
    metadata: Object.freeze({ ...payload, projects: undefined }),
    projects: Object.freeze(projects),
  });
}

export function loadCanonicalProjectsNewsV1({ onFirstPartition } = {}) {
  if (!canonicalLoadPromise) {
    canonicalLoadPromise = loadCanonicalProjects(onFirstPartition).catch((error) => {
      canonicalLoadPromise = null;
      throw error;
    });
  }
  return canonicalLoadPromise;
}
