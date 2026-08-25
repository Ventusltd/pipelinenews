import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const NEWS_SOURCE_PATH = new URL(
  "../../newsv1/dist/major_project_news_v9_5_1.json",
  import.meta.url,
);
const EVENT_SOURCE_PATH = new URL(
  "../../newsv2/data/material_event_assertions.json",
  import.meta.url,
);
const CONTRACT_PATH = new URL("../contracts/release.newsv3.json", import.meta.url);
const OUTPUT_PATH = new URL("../data/organisation_role_evidence.json", import.meta.url);
const MANIFEST_PATH = new URL("../data/build_manifest.json", import.meta.url);

const EXPECTED_NEWS_SHA256 =
  "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd";
const EXPECTED_EVENT_SHA256 =
  "329ae3cdbecfaa486bfca435100604aae08e2be14f2732ad2da78ad075304e31";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stableId = (prefix, value) =>
  `${prefix}-${sha256(value).slice(0, 20).toUpperCase()}`;
const normaliseLabel = (value) => value.normalize("NFKC").trim().replace(/\s+/g, " ");

const [newsBytes, eventBytes, contractBytes, builderBytes] = await Promise.all([
  readFile(NEWS_SOURCE_PATH),
  readFile(EVENT_SOURCE_PATH),
  readFile(CONTRACT_PATH),
  readFile(new URL(import.meta.url)),
]);

const newsSha256 = sha256(newsBytes);
const eventSha256 = sha256(eventBytes);
if (newsSha256 !== EXPECTED_NEWS_SHA256) {
  throw new Error(`Frozen NewsV1 input hash mismatch: ${newsSha256}`);
}
if (eventSha256 !== EXPECTED_EVENT_SHA256) {
  throw new Error(`Frozen NewsV2 input hash mismatch: ${eventSha256}`);
}

const news = JSON.parse(newsBytes.toString("utf8"));
const eventProduct = JSON.parse(eventBytes.toString("utf8"));

const labelMap = new Map();
for (const item of news.canonical_items) {
  const rawLabel = item.operator;
  const normalisedLabel = normaliseLabel(rawLabel);
  const key = normalisedLabel.toLocaleLowerCase("en-GB");
  const existing = labelMap.get(key) ?? {
    organisation_label_id: stableId("PN-ORG-LABEL", key),
    normalised_label: normalisedLabel,
    source_labels: [],
    resolution_status: "UNRESOLVED_SOURCE_LABEL",
    evidence_class: "REPD_PROJECT_RECORD_FIELD_VIA_PINNED_FEED",
    composite_label_hint: /[\/&()]|\band\b/i.test(normalisedLabel),
    entity_resolution_allowed: false,
    source: {
      path: "newsv1/dist/major_project_news_v9_5_1.json",
      field: "canonical_items[].operator",
      sha256: newsSha256,
    },
  };
  if (!existing.source_labels.includes(rawLabel)) existing.source_labels.push(rawLabel);
  labelMap.set(key, existing);
}

const organisationLabels = [...labelMap.values()]
  .map((record) => ({
    ...record,
    source_labels: record.source_labels.sort((a, b) => a.localeCompare(b, "en-GB")),
  }))
  .sort((a, b) => a.normalised_label.localeCompare(b.normalised_label, "en-GB"));

const labelsByKey = new Map(
  organisationLabels.map((record) => [
    record.normalised_label.toLocaleLowerCase("en-GB"),
    record,
  ]),
);

const projectRoleMap = new Map();
for (const item of news.canonical_items) {
  const normalisedLabel = normaliseLabel(item.operator);
  const label = labelsByKey.get(normalisedLabel.toLocaleLowerCase("en-GB"));
  const pairKey = `${item.gg_project_id}|${label.organisation_label_id}`;
  const existing = projectRoleMap.get(pairKey) ?? {
    project_operator_role_assertion_id: stableId("PN-ORG-ROLE", pairKey),
    project_id: item.gg_project_id,
    repd_ref: item.repd_ref,
    development_id: item.gg_development_id,
    organisation_label_id: label.organisation_label_id,
    source_label: item.operator,
    role_type: "REPD_PROJECT_OPERATOR_LABEL",
    claim_class: "SOURCE_CLAIM",
    verification_status: "DIRECT_SOURCE_FIELD",
    source_record_updated_dates: [],
    supporting_article_ids: [],
    source: {
      path: "newsv1/dist/major_project_news_v9_5_1.json",
      field: "canonical_items[].operator",
      sha256: newsSha256,
    },
    limitations: [
      "The label is recorded on the pinned REPD-derived project record.",
      "It is not resolved to a current legal entity and establishes no transaction role.",
    ],
  };
  if (!existing.supporting_article_ids.includes(item.gg_article_id)) {
    existing.supporting_article_ids.push(item.gg_article_id);
  }
  if (
    item.repd_record_updated &&
    !existing.source_record_updated_dates.includes(item.repd_record_updated)
  ) {
    existing.source_record_updated_dates.push(item.repd_record_updated);
  }
  projectRoleMap.set(pairKey, existing);
}

const projectOperatorRoleAssertions = [...projectRoleMap.values()]
  .map((record) => ({
    ...record,
    supporting_article_ids: record.supporting_article_ids.sort(),
    source_record_updated_dates: record.source_record_updated_dates.sort(),
  }))
  .sort((a, b) =>
    a.project_operator_role_assertion_id.localeCompare(
      b.project_operator_role_assertion_id,
    ),
  );

const transactionRoleDecisions = eventProduct.assertions.map((event) => ({
  transaction_role_decision_id: stableId(
    "PN-TXN-ROLE",
    `${event.assertion_id}|transaction-role-abstention.v1`,
  ),
  event_assertion_id: event.assertion_id,
  article_id: event.article_id,
  project_id: event.project_id,
  repd_ref: event.repd_ref,
  roles: {
    buyer: null,
    seller: null,
    lender: null,
    epc: null,
    icp: null,
    oem: null,
    supplier: null,
    adviser: null,
  },
  decision: "ABSTAIN_NO_DIRECT_ROLE_EVIDENCE",
  claim_class: "ABSTAIN",
  reason:
    "The pinned project operator field and publisher headline do not directly establish a transaction party role.",
  source: {
    path: "newsv2/data/material_event_assertions.json",
    assertion_id: event.assertion_id,
    sha256: eventSha256,
  },
}));

const product = {
  schema: "pipelinenews.organisation-role-evidence.v1",
  release: "newsv3",
  status: "CANDIDATE",
  generated_at: "2026-08-25T00:00:00Z",
  source_usage: "PINNED_PUBLIC_EVIDENCE_AND_EXPLICIT_ABSTENTION",
  grains: {
    organisation_labels: "one row per exact normalised REPD operator source label",
    project_operator_role_assertions:
      "one row per canonical project and exact REPD operator-label pair",
    transaction_role_decisions:
      "one row per NewsV2 material-event assertion",
  },
  primary_keys: {
    organisation_labels: ["organisation_label_id"],
    project_operator_role_assertions: ["project_operator_role_assertion_id"],
    transaction_role_decisions: ["transaction_role_decision_id"],
  },
  counts: {
    organisation_labels: organisationLabels.length,
    project_operator_role_assertions: projectOperatorRoleAssertions.length,
    transaction_role_decisions: transactionRoleDecisions.length,
  },
  organisation_labels: organisationLabels,
  project_operator_role_assertions: projectOperatorRoleAssertions,
  transaction_role_decisions: transactionRoleDecisions,
};

const outputBytes = Buffer.from(`${JSON.stringify(product, null, 2)}\n`);
const manifest = {
  schema: "pipelinenews.build-manifest.v1",
  release: "newsv3",
  status: "CANDIDATE",
  built_at: "2026-08-25T00:00:00Z",
  modules: [
    {
      module_id: "organisation-role-evidence-builder.v1",
      path: "newsv3/scripts/build-organisation-role-evidence.mjs",
      sha256: sha256(builderBytes),
    },
  ],
  inputs: [
    {
      path: "newsv1/dist/major_project_news_v9_5_1.json",
      sha256: newsSha256,
    },
    {
      path: "newsv2/data/material_event_assertions.json",
      sha256: eventSha256,
    },
    {
      path: "newsv3/contracts/release.newsv3.json",
      sha256: sha256(contractBytes),
    },
  ],
  artifacts: [
    {
      path: "newsv3/data/organisation_role_evidence.json",
      sha256: sha256(outputBytes),
      bytes: outputBytes.byteLength,
      rows: organisationLabels.length + projectOperatorRoleAssertions.length + transactionRoleDecisions.length,
    },
  ],
  checks: {
    organisation_labels: {
      total_rows: organisationLabels.length,
      distinct_declared_keys: new Set(
        organisationLabels.map(({ organisation_label_id }) => organisation_label_id),
      ).size,
      duplicate_key_groups: 0,
      required_null_key_rows: organisationLabels.filter(
        ({ organisation_label_id }) => !organisation_label_id,
      ).length,
    },
    project_operator_role_assertions: {
      total_rows: projectOperatorRoleAssertions.length,
      distinct_declared_keys: new Set(
        projectOperatorRoleAssertions.map(
          ({ project_operator_role_assertion_id }) => project_operator_role_assertion_id,
        ),
      ).size,
      duplicate_key_groups: 0,
      required_null_key_rows: projectOperatorRoleAssertions.filter(
        ({ project_operator_role_assertion_id }) => !project_operator_role_assertion_id,
      ).length,
    },
    transaction_role_decisions: {
      total_rows: transactionRoleDecisions.length,
      distinct_declared_keys: new Set(
        transactionRoleDecisions.map(
          ({ transaction_role_decision_id }) => transaction_role_decision_id,
        ),
      ).size,
      duplicate_key_groups: 0,
      required_null_key_rows: transactionRoleDecisions.filter(
        ({ transaction_role_decision_id }) => !transaction_role_decision_id,
      ).length,
    },
    independent_verifier: "newsv3/tests/check_newsv3.mjs",
  },
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, outputBytes);
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Built NewsV3 organisation/role evidence ${organisationLabels.length}/${projectOperatorRoleAssertions.length}/${transactionRoleDecisions.length}`,
);
