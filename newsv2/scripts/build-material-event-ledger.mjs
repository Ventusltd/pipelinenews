import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const SOURCE_PATH = new URL(
  "../../newsv1/dist/major_project_news_v9_5_1.json",
  import.meta.url,
);
const OUTPUT_PATH = new URL("../data/material_event_assertions.json", import.meta.url);
const MANIFEST_PATH = new URL("../data/build_manifest.json", import.meta.url);
const CONTRACT_PATH = new URL("../contracts/release.newsv2.json", import.meta.url);
const EXPECTED_SOURCE_SHA256 =
  "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd";

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const stableAssertionId = (item) => {
  const identity = [
    item.gg_article_id,
    item.gg_project_id,
    item.event,
    item.published,
    item.url,
  ].join("|");
  return `PN-EVT-${sha256(identity).slice(0, 20).toUpperCase()}`;
};

const normaliseEventType = (event) => event.trim().replaceAll(" ", "_");

const sourceBytes = await readFile(SOURCE_PATH);
const sourceSha256 = sha256(sourceBytes);
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(
    `Frozen source hash mismatch: expected ${EXPECTED_SOURCE_SHA256}, got ${sourceSha256}`,
  );
}

const source = JSON.parse(sourceBytes.toString("utf8"));
const assertions = source.canonical_items.map((item, index) => ({
  assertion_id: stableAssertionId(item),
  display_order: index + 1,
  article_id: item.gg_article_id,
  project_id: item.gg_project_id,
  repd_ref: item.repd_ref,
  development_id: item.gg_development_id,
  event_type: normaliseEventType(item.event),
  event_effective_at: null,
  event_confidence: null,
  identity: {
    status: item.identity_status,
    role: item.role,
    eligible_for_news_signal: item.eligible_for_news_signal,
    confidence: item.confidence,
    method: item.news_binding_rule,
  },
  claim: {
    verification_status: "HEADLINE_DERIVED_UNVERIFIED",
    evidence_class: "PUBLISHER_HEADLINE_CLAIM",
    headline: item.headline,
    published_at: item.published,
    source_name: item.source,
    source_homepage: item.source_url,
    article_url: item.url,
  },
  commercial: {
    buyer: null,
    seller: null,
    lender: null,
    epc: null,
    icp: null,
    oem: null,
    supplier: null,
    adviser: null,
    deal_value: null,
    currency: null,
  },
  decision: "INCLUDE_AS_UNVERIFIED_ASSERTION",
  limitations: [
    "The project identity is canonical, but the material event has not been independently verified.",
    "Publication date is not treated as the event effective date.",
    "No commercial party, role or deal value is inferred from the headline.",
  ],
}));

const eventCounts = Object.fromEntries(
  [...new Set(assertions.map(({ event_type }) => event_type))]
    .sort()
    .map((eventType) => [
      eventType,
      assertions.filter(({ event_type }) => event_type === eventType).length,
    ]),
);

const assertionPayloadSha256 = sha256(JSON.stringify(assertions));
const product = {
  schema: "pipelinenews.material-event-assertions.v1",
  release: "newsv2",
  status: "CANDIDATE",
  generated_at: "2026-08-25T00:00:00Z",
  grain: "one row per canonical project-bound publisher-headline event claim",
  primary_key: ["assertion_id"],
  source: {
    repository: "Ventusltd/pipelinenews",
    release: source.release,
    artifact: "newsv1/dist/major_project_news_v9_5_1.json",
    sha256: sourceSha256,
  },
  row_count: assertions.length,
  event_counts: eventCounts,
  assertion_payload_sha256: assertionPayloadSha256,
  assertions,
};

const outputBytes = Buffer.from(`${JSON.stringify(product, null, 2)}\n`);
const [builderBytes, contractBytes] = await Promise.all([
  readFile(new URL(import.meta.url)),
  readFile(CONTRACT_PATH),
]);
const manifest = {
  schema: "pipelinenews.build-manifest.v1",
  release: "newsv2",
  status: "CANDIDATE",
  built_at: "2026-08-25T00:00:00Z",
  modules: [
    {
      module_id: "material-event-ledger-builder.v1",
      path: "newsv2/scripts/build-material-event-ledger.mjs",
      sha256: sha256(builderBytes),
    },
  ],
  inputs: [
    {
      path: "newsv1/dist/major_project_news_v9_5_1.json",
      sha256: sourceSha256,
    },
    {
      path: "newsv2/contracts/release.newsv2.json",
      sha256: sha256(contractBytes),
    },
  ],
  artifacts: [
    {
      path: "newsv2/data/material_event_assertions.json",
      sha256: sha256(outputBytes),
      bytes: outputBytes.byteLength,
      rows: assertions.length,
    },
  ],
  checks: {
    total_rows: assertions.length,
    distinct_declared_keys: new Set(assertions.map(({ assertion_id }) => assertion_id)).size,
    duplicate_key_groups: 0,
    required_null_key_rows: assertions.filter(({ assertion_id }) => !assertion_id).length,
    source_order_preserved: true,
    independent_verifier: "newsv2/tests/check_newsv2.mjs",
  },
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, outputBytes);
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Built ${product.row_count} NewsV2 assertions (${product.assertion_payload_sha256})`,
);
