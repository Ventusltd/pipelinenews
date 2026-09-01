/**
 * Pipeline News -> immutable Codex GridAtlas laboratory generation.
 *
 * This is deliberately not the shared /gridatlas/atlas/ route. A Codex lab
 * release and Claude's active composition must be comparable without either
 * agent silently moving the other's receiver.
 */
const GENERATION = "202609020010";
const BASE_URL = `https://ventusltd.github.io/gridatlas/atlas/codex/${GENERATION}/`;
const DEFAULT_ZOOM = 12;

function invariant(condition, message) {
  if (!condition) throw new Error(`Codex Atlas lab contract: ${message}`);
}

const receiver = new URL(BASE_URL);
invariant(receiver.protocol === "https:", "receiver must use HTTPS");
invariant(receiver.hostname === "ventusltd.github.io", "receiver host changed");
invariant(receiver.pathname === `/gridatlas/atlas/codex/${GENERATION}/`,
  "receiver is not the immutable Codex laboratory route");
invariant(!receiver.pathname.endsWith("/atlas/"), "shared Atlas route is forbidden");
invariant(!BASE_URL.includes("current.json"), "shared Atlas pointer is forbidden");

export const ATLAS_DEEP_LINK_CONTRACT = Object.freeze({
  schema: "pipelinenews.codex-atlas-lab-deep-link.v1",
  generation: GENERATION,
  deployment: "not-authorised",
  active_target: "codex",
  receiver: Object.freeze({
    base_url: BASE_URL,
    pathname: receiver.pathname,
    immutable_generation: GENERATION,
  }),
  identity_anchor: "repd_ref",
  inbound_match_semantics: "EXACT_PROJECT_REPD_REF",
  context_parameters_are_advisory: true,
  shared_pointer_consumed: false,
});

function finiteInRange(value, limit) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export function buildAtlasV9DeepLink(project) {
  if (project?.geometry_status !== "valid") return "";
  const repdRef = String(project?.repd_ref ?? "").trim();
  if (!/^\d+$/u.test(repdRef)) return "";

  const url = new URL(BASE_URL);
  url.searchParams.set("repd_ref", repdRef);

  const name = String(project?.name ?? "").trim();
  if (name) url.searchParams.set("project", name);
  const technology = String(project?.technology ?? "").trim();
  if (technology) url.searchParams.set("technology", technology);
  const capacity = Number(project?.capacity_mw);
  if (Number.isFinite(capacity) && capacity > 0) {
    url.searchParams.set("capacity_mw", String(capacity));
  }

  const latitude = finiteInRange(project?.latitude, 90);
  const longitude = finiteInRange(project?.longitude, 180);
  if (latitude !== null && longitude !== null) {
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("zoom", String(DEFAULT_ZOOM));
  }
  return url.href;
}

export function selfTest() {
  const project = {
    repd_ref: "10916",
    name: "West Burton Solar Project",
    technology: "solar",
    capacity_mw: 480,
    latitude: 53.2926216,
    longitude: -0.6774547,
    geometry_status: "valid",
  };
  const url = new URL(buildAtlasV9DeepLink(project));
  const checks = [
    ["immutable Codex path", url.pathname === `/gridatlas/atlas/codex/${GENERATION}/`],
    ["exact REPD identity", url.searchParams.get("repd_ref") === "10916"],
    ["project context", url.searchParams.get("project") === project.name],
    ["technology context", url.searchParams.get("technology") === "solar"],
    ["capacity context", url.searchParams.get("capacity_mw") === "480"],
    ["coordinate pair", url.searchParams.has("latitude") && url.searchParams.has("longitude")],
    ["mobile zoom", url.searchParams.get("zoom") === "12"],
    ["not shared Atlas", url.pathname !== "/gridatlas/atlas/"],
    ["no shared pointer", !url.href.includes("current.json")],
  ].map(([name, ok]) => ({ name, ok }));
  return { ok: checks.every((item) => item.ok), checks, url: url.href };
}
