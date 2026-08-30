export const ATLAS_V8_DEEP_LINK_CONTRACT = Object.freeze({
  schema: "pipelinenews.atlas-v8-deep-link-cartridge.v1",
  generation: "202608271329",
  parent_generation: "202608270844",
  trusted_reference: Object.freeze({
    application: "GlobalGrid2050 UK Renewables Pipeline V9.6.2",
    function: "atlasUrlV9_5_1",
    source_sha256: "f0c63602d85a5726aa38106157e8d3d6924d0ab1a684194ffe2de93df1c6d823",
  }),
  target: Object.freeze({
    protocol: "https:",
    hostname: "globalgrid2050.com",
    pathname: "/repd_grid_atlasv8/",
    base_url: "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/",
  }),
  eligibility: Object.freeze({
    field: "geometry_status",
    equals: "valid",
    ineligible_result: "",
    presentation: "NO MAP",
  }),
  identity_anchor: "repd_ref",
  query_parameter_order: Object.freeze([
    "repd_ref",
    "project",
    "technology",
    "capacity_mw",
    "latitude",
    "longitude",
    "zoom",
  ]),
  project_field_by_parameter: Object.freeze({
    repd_ref: "repd_ref",
    project: "name",
    technology: "technology",
    capacity_mw: "capacity_mw",
    latitude: "latitude",
    longitude: "longitude",
  }),
  fixed_parameters: Object.freeze({ zoom: "12" }),
  receiver_contract: Object.freeze({
    canonical_identity: Object.freeze(["repd_ref", "technology"]),
    display_context: Object.freeze(["project", "capacity_mw"]),
    coordinate_fallback: Object.freeze(["longitude", "latitude", "zoom"]),
    query_context_never_establishes_identity: true,
  }),
  sentinels: Object.freeze({
    east_pye: Object.freeze({
      repd_ref: "17494",
      expected_url: "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/?repd_ref=17494&project=East+Pye+Solar+Farm&technology=solar&capacity_mw=500&latitude=52.4733298&longitude=1.2432764&zoom=12",
    }),
    beacon_fen: Object.freeze({
      repd_ref: "13599",
      expected_url: "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/?repd_ref=13599&project=Beacon+Fen+Energy+Park&technology=solar&capacity_mw=400&latitude=52.9989987&longitude=-0.4092339&zoom=12",
    }),
    invalid_geometry: Object.freeze({
      repd_ref: "12780",
      expected_url: "",
      presentation: "NO MAP",
    }),
  }),
  lifecycle: "write-once; behavioural changes require a later timestamped cartridge",
  deployment: "not-authorised",
});

export function buildAtlasV8DeepLink(project) {
  if (project?.[ATLAS_V8_DEEP_LINK_CONTRACT.eligibility.field]
      !== ATLAS_V8_DEEP_LINK_CONTRACT.eligibility.equals) {
    return ATLAS_V8_DEEP_LINK_CONTRACT.eligibility.ineligible_result;
  }

  const url = new URL(ATLAS_V8_DEEP_LINK_CONTRACT.target.base_url);
  for (const parameter of ATLAS_V8_DEEP_LINK_CONTRACT.query_parameter_order) {
    const fixed = ATLAS_V8_DEEP_LINK_CONTRACT.fixed_parameters[parameter];
    const field = ATLAS_V8_DEEP_LINK_CONTRACT.project_field_by_parameter[parameter];
    url.searchParams.set(parameter, fixed ?? project[field]);
  }
  return url.href;
}
