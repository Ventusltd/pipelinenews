const GRIDATLAS_RECEIVER = Object.freeze({"schema":"pipelinenews.gridatlas-pointer-receipt.v2","classification":"VERIFIED_GRIDATLAS_LIVE_POINTER","repository":"Ventusltd/gridatlas","resolved_ref":"refs/heads/main","resolved_commit":"f882d427662838b255693ddcf89c67f90e420f9c","pointer":{"path":"releases/current-v3.json","bytes":3024,"sha256":"3b281938c96173d83437805895cab38461c7e8f24e2dfe76cd36a4ecbd6b0a1e"},"mirror":{"path":"state/live-set.json","bytes":3024,"sha256":"3b281938c96173d83437805895cab38461c7e8f24e2dfe76cd36a4ecbd6b0a1e"},"release_manifest":{"path":"202608291430-atlas-v9/release-manifest.json","bytes":6037,"sha256":"d0b26eb4d773108bcf39417130ebf0441da78881dbf0f9bfe3e8bd0809552026"},"authentication":{"identity_rule":"EXACT_REPD_REF_ONLY","contractual_probe_source":"PIPELINENEWS_SOURCE_CONTRACT","receiver_ui_parity":"NOT_ASSERTED"},"receiver":{"generation":"202608291430","release_id":"202608291430-atlas-v9","base_url":"https://ventusltd.github.io/gridatlas/202608291430-atlas-v9/","route":"/gridatlas/202608291430-atlas-v9/","query_parameter":"repd_ref","identity_rule":"EXACT_REPD_REF_ONLY","golden_repd_ref":"16135","browser_sentinels":["17494","13599","12453","2484","12780","2535","13429"],"source_commit":"5c97f34eef0d426de5c3534676317d0fa51f4ccc","publication_commit":"2524e3d81cc084e2e6cd1aed62ed9516dd8d4b28"},"fallback":{"classification":"LAST_KNOWN_GREEN_V8_PUBLIC_CANDIDATE","generation":"202608271524","route":"/pipelinenews/releases/202608271524-v8-fast-candidate.html","public_url":"https://ventusltd.github.io/pipelinenews/releases/202608271524-v8-fast-candidate.html","pages_run_id":33085685060,"manifest_path":"build/202608271524-v8-fast-site-manifest.json","manifest_sha256":"fef485accb1509297dbc64c5e30806c60d977bedb06591e8b324e7bbab06e818","retention_rule":"PRESERVE_ON_ANY_GRIDATLAS_POINTER_OR_RECEIVER_FAILURE"}});

function invariant(condition, message) {
  if (!condition) throw new Error(`Atlas receiver contract: ${message}`);
}

invariant(GRIDATLAS_RECEIVER.schema === "pipelinenews.gridatlas-pointer-receipt.v2", "wrong pointer receipt schema");
invariant(GRIDATLAS_RECEIVER.classification === "VERIFIED_GRIDATLAS_LIVE_POINTER", "pointer is not verified live");
invariant(GRIDATLAS_RECEIVER.receiver?.query_parameter === "repd_ref", "identity parameter changed");
invariant(GRIDATLAS_RECEIVER.receiver?.identity_rule === "EXACT_REPD_REF_ONLY", "receiver identity rule changed");
invariant(GRIDATLAS_RECEIVER.authentication?.receiver_ui_parity === "NOT_ASSERTED", "receiver UI parity scope changed");
const receiverUrl = new URL(GRIDATLAS_RECEIVER.receiver.base_url);
invariant(receiverUrl.protocol === "https:", "receiver is not HTTPS");
invariant(receiverUrl.hostname === "ventusltd.github.io", "receiver hostname changed");
invariant(receiverUrl.pathname === GRIDATLAS_RECEIVER.receiver.route, "receiver route mismatch");
invariant(receiverUrl.search === "" && receiverUrl.hash === "", "receiver base must not contain query or fragment");

export const ATLAS_V9_DEEP_LINK_CONTRACT = Object.freeze({
  schema: "pipelinenews.atlas-pointer-deep-link-cartridge.v1",
  generation: "202608291447",
  parent_generation: "202608291504",
  receiver_pointer: Object.freeze({
    repository: GRIDATLAS_RECEIVER.repository,
    resolved_commit: GRIDATLAS_RECEIVER.resolved_commit,
    path: GRIDATLAS_RECEIVER.pointer.path,
    bytes: GRIDATLAS_RECEIVER.pointer.bytes,
    sha256: GRIDATLAS_RECEIVER.pointer.sha256,
  }),
  receiver_release: Object.freeze({
    generation: GRIDATLAS_RECEIVER.receiver.generation,
    release_id: GRIDATLAS_RECEIVER.receiver.release_id,
    source_commit: GRIDATLAS_RECEIVER.receiver.source_commit,
    publication_commit: GRIDATLAS_RECEIVER.receiver.publication_commit,
  }),
  target: Object.freeze({
    protocol: receiverUrl.protocol,
    hostname: receiverUrl.hostname,
    pathname: receiverUrl.pathname,
    base_url: receiverUrl.href,
  }),
  eligibility: Object.freeze({
    field: "geometry_status",
    equals: "valid",
    ineligible_result: "",
    presentation: "NO MAP",
  }),
  identity_anchor: "repd_ref",
  query_parameter_order: Object.freeze(["repd_ref"]),
  inbound_match_semantics: "EXACT_PROJECT_REPD_REF",
  general_search_parameter: "q",
  relationship_context_allowed_for_q: true,
  relationship_context_allowed_for_repd_ref: false,
  receiver_contract: Object.freeze({
    canonical_identity: Object.freeze(["repd_ref"]),
    contractual_golden_repd_ref: GRIDATLAS_RECEIVER.receiver.golden_repd_ref,
    selection_evidence: Object.freeze(["receiver URL", "selected source", "receiver card"]),
    query_context_never_establishes_identity: true,
  }),
  sentinels: Object.freeze({
    contractual_golden: Object.freeze({
      repd_ref: GRIDATLAS_RECEIVER.receiver.golden_repd_ref,
      expected_url: `${receiverUrl.href}?repd_ref=${GRIDATLAS_RECEIVER.receiver.golden_repd_ref}`,
    }),
    east_pye_when_present: Object.freeze({
      repd_ref: "17494",
      expected_url: `${receiverUrl.href}?repd_ref=17494`,
    }),
    beacon_fen_when_present: Object.freeze({
      repd_ref: "13599",
      expected_url: `${receiverUrl.href}?repd_ref=13599`,
    }),
    invalid_geometry: Object.freeze({
      repd_ref: "12780",
      expected_url: "",
      presentation: "NO MAP",
    }),
  }),
  fallback: Object.freeze({
    ...GRIDATLAS_RECEIVER.fallback,
    activation: "EXTERNAL_POINTER_ROLLBACK_ONLY",
    rule: "Any failed V9 gate preserves the last-known-green V8 public candidate; it never rewrites this immutable release.",
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
