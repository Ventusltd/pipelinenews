export const ATLAS_V9_DEEP_LINK_CONTRACT = Object.freeze({
  schema: "pipelinenews.atlas-v9-deep-link-cartridge.v1",
  generation: "202608291310",
  parent_generation: "202608282200",
  receiver_release: Object.freeze({
    repository: "Ventusltd/gridatlas",
    generation: "202608291239",
    release_id: "202608291239-atlas-v9",
    source_commit: "ac00b9f326187a1e3bfabb5b45397210850c6052",
    publication_commit: "1898184ccbf52ca836cf1482362fc5933baf3e8d",
    pointer_commit: "936a31f703d31bd975af22d7349708d68a143d56",
    public_browser_claim_sha256: "a398b9e39174d5b8efd1fea9eb906b53aaf84642917fea6126d8d797f1e7eea8",
  }),
  target: Object.freeze({
    protocol: "https:",
    hostname: "ventusltd.github.io",
    pathname: "/gridatlas/202608291239-atlas-v9/",
    base_url: "https://ventusltd.github.io/gridatlas/202608291239-atlas-v9/",
  }),
  eligibility: Object.freeze({
    field: "geometry_status",
    equals: "valid",
    ineligible_result: "",
    presentation: "NO MAP",
  }),
  identity_anchor: "repd_ref",
  query_parameter_order: Object.freeze(["repd_ref"]),
  receiver_contract: Object.freeze({
    canonical_identity: Object.freeze(["repd_ref"]),
    selected_text_pattern: "REPD <repd_ref> selected",
    map_failure_must_preserve_selection: true,
    query_context_never_establishes_identity: true,
  }),
  sentinels: Object.freeze({
    east_pye: Object.freeze({
      repd_ref: "17494",
      expected_url: "https://ventusltd.github.io/gridatlas/202608291239-atlas-v9/?repd_ref=17494",
      expected_selection: "REPD 17494 selected",
    }),
    beacon_fen: Object.freeze({
      repd_ref: "13599",
      expected_url: "https://ventusltd.github.io/gridatlas/202608291239-atlas-v9/?repd_ref=13599",
      expected_selection: "REPD 13599 selected",
    }),
    invalid_geometry: Object.freeze({
      repd_ref: "12780",
      expected_url: "",
      presentation: "NO MAP",
    }),
  }),
  lifecycle: "write-once; behavioural changes require a later timestamped cartridge",
  classification: "IMMUTABLE_TIMESTAMPED_RELEASE",
  publication_control: "POINTER_AND_ATTESTATION_EXTERNAL",
});

export function buildAtlasV9DeepLink(project) {
  if (project?.[ATLAS_V9_DEEP_LINK_CONTRACT.eligibility.field]
      !== ATLAS_V9_DEEP_LINK_CONTRACT.eligibility.equals) {
    return ATLAS_V9_DEEP_LINK_CONTRACT.eligibility.ineligible_result;
  }
  const repdRef = String(project?.repd_ref ?? "").trim();
  if (!/^\d+$/u.test(repdRef)) return "";
  const url = new URL(ATLAS_V9_DEEP_LINK_CONTRACT.target.base_url);
  url.searchParams.set(ATLAS_V9_DEEP_LINK_CONTRACT.identity_anchor, repdRef);
  return url.href;
}
