#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  cleanText,
  collectSectorIntelligence,
  failureCode,
  fetchBounded,
  scanFeedEntries,
  validateContract,
} from "../../discovery/javascript/202608272130-sector-intelligence-runner.mjs";

const GENERATION = "202608272130";
const DATASETS = ["sector_items", "sector_item_topics", "sector_project_bindings"];
const EXPECTED_COUNTS = Object.freeze({ projects: 7680, capacity_mw: 356474.09, headlines: 136, uk: 47, international: 19 });

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function argumentsMap(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.ok(argv[index]?.startsWith("--") && argv[index + 1] !== undefined, `invalid argument near ${argv[index]}`);
    result[argv[index].slice(2)] = argv[index + 1];
  }
  return result;
}

async function jsonFile(file) {
  return JSON.parse(await readFile(file));
}

async function listFiles(root, prefix = "") {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix.split(path.sep).join(path.posix.sep), entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`candidate closure contains a non-regular entry: ${relative}`);
  }
  return files.sort();
}

function decodedRows(payload) {
  return payload.rows.map((row) => Object.fromEntries(payload.fields.map((field, index) => [field, row[index]])));
}

async function verifySource(options) {
  for (const required of ["contract", "fixture", "generic-news", "ledger-a", "ledger-b"]) assert.ok(options[required], `--${required} is required`);
  const contract = validateContract(await jsonFile(options.contract));
  const fixture = await jsonFile(options.fixture);
  const hostileContracts = [
    (value) => { value.sources[0].source_url = "https://example.com/owner-export.json"; },
    (value) => { value.sources[2].source_terms_url = "https://www.nationalarchives.gov.uk:444/doc/open-government-licence/version/3/"; },
    (value) => { value.limits.request_timeout_ms += 1; },
    (value) => { value.limits.maximum_concurrency += 1; },
    (value) => { value.limits.maximum_response_bytes += 1; },
    (value) => { value.time_provenance.live_collection_anchor_basis = "UNVERIFIED_CLOCK"; },
  ];
  for (const mutate of hostileContracts) {
    const changed = structuredClone(contract);
    mutate(changed);
    assert.throws(() => validateContract(changed));
  }
  const ledgerABytes = await readFile(options["ledger-a"]);
  const ledgerBBytes = await readFile(options["ledger-b"]);
  assert.deepEqual(ledgerBBytes, ledgerABytes, "two synthetic collector passes are not byte-identical");
  const ledger = JSON.parse(ledgerABytes);
  assert.equal(ledger.schema, "pipelinenews.sector-intelligence-ledger.v3");
  assert.equal(ledger.collection_anchor_at, fixture.collection_anchor_at);
  assert.equal(ledger.collection_anchor_basis, fixture.collection_anchor_basis);
  assert.equal(ledger.usage_context, "NON_COMMERCIAL_OPEN_SOURCE");
  assert.equal(ledger.usage_context_establishes_upstream_rights, false);
  assert.equal(ledger.datasets.sector_items.rows.length, 19);
  assert.equal(ledger.datasets.sector_item_topics.rows.length, 19);
  assert.equal(ledger.datasets.sector_project_bindings.rows.length, 0);
  assert.equal(ledger.policy_evidence.generic_news_rows_preserved, 136);
  assert.equal(ledger.policy_evidence.generic_data_centre_rows_sanitised, 6);
  assert.equal(ledger.policy_evidence.query_context_used_for_project_identity, false);
  assert.equal(ledger.policy_evidence.owner_parquet_copied, false);
  assert.equal(ledger.policy_evidence.upstream_data_centre_requests, 0);
  assert.equal(ledger.policy_evidence.pinned_data_centre_owner_export_requests, 1);
  assert.equal(ledger.policy_evidence.retained_raw_html_bytes, 0);
  assert.equal(ledger.policy_evidence.retained_article_body_bytes, 0);
  assert.equal(ledger.policy_evidence.retained_search_snippet_characters, 0);
  const itemFields = ledger.datasets.sector_items.fields;
  for (const forbidden of contract.identity_policy.forbidden_sector_item_fields) assert.equal(itemFields.includes(forbidden), false);
  assert.ok(ledger.datasets.sector_items.rows.every(({ eligible_for_news_signal }) => eligible_for_news_signal === false));
  const generic = ledger.datasets.sector_items.rows.filter(({ generic_article_id }) => generic_article_id);
  assert.equal(generic.length, 6);
  assert.ok(generic.every((row) => !Object.keys(row).some((field) => contract.identity_policy.forbidden_sector_item_fields.includes(field))));
  const eia = ledger.source_statuses.find(({ source_id }) => source_id === "EIA_SOLAR_RSS");
  assert.equal(eia.result, "OK");
  assert.equal(eia.content_type, "text/xml", "synthetic coverage no longer proves the measured EIA media type");
  const owner = ledger.source_statuses.find(({ source_id }) => source_id === "DATA_CENTRES_OWNER_EXPORT");
  assert.equal(owner.result, "OK");
  assert.equal(owner.content_type, "text/plain", "synthetic coverage no longer proves GitHub raw JSON media handling");
  const cartridge = await readFile(new URL(`../../ui/cartridges/${GENERATION}-sector-intelligence.mjs`, import.meta.url), "utf8");
  assert.equal((cartridge.match(/payloadRequests \+= 1/gu) || []).length, 1);
  assert.equal((cartridge.match(/payloadRequests = 0/gu) || []).length, 1,
    "a failed request can reset the absolute one-request budget");
  assert.equal((cartridge.match(/payloadPromise = null/gu) || []).length, 1,
    "a failed request can bypass the one-request payload cache");
  const serialised = ledgerABytes.toString("utf8");
  for (const forbiddenText of [
    "DESCRIPTION MUST NOT BE RETAINED", "QUERY CONTEXT MUST NOT SURVIVE", "<html",
  ]) assert.equal(serialised.includes(forbiddenText), false, `forbidden retained content entered ledger: ${forbiddenText}`);
  assert.doesNotMatch(serialised, /api[_-]?key|authorization|bearer\s|credential/iu);

  const failedFixture = structuredClone(fixture);
  failedFixture.responses.FCC_EDOCS_NEWS_RSS.status = 504;
  const failedLedger = await collectSectorIntelligence({
    contract,
    genericNewsPath: options["generic-news"],
    fixture: failedFixture,
    collectionAnchorAt: fixture.collection_anchor_at,
    collectionAnchorBasis: fixture.collection_anchor_basis,
  });
  const fccFailure = failedLedger.source_statuses.find(({ source_id }) => source_id === "FCC_EDOCS_NEWS_RSS");
  assert.equal(fccFailure.result, "FAILED_SOFT");
  assert.equal(fccFailure.error_code, "HTTP_STATUS");
  assert.ok(failedLedger.datasets.sector_items.rows.length < ledger.datasets.sector_items.rows.length);

  const undatedFixture = structuredClone(fixture);
  delete undatedFixture.responses.GOVUK_INVERTER_SECURITY.body.results[0].public_timestamp;
  undatedFixture.responses.OFGEM_GRID_RSS.body =
    undatedFixture.responses.OFGEM_GRID_RSS.body.replace(/<pubDate>[^<]*<\/pubDate>/u, "");
  const undatedLedger = await collectSectorIntelligence({
    contract,
    genericNewsPath: options["generic-news"],
    fixture: undatedFixture,
    collectionAnchorAt: fixture.collection_anchor_at,
    collectionAnchorBasis: fixture.collection_anchor_basis,
  });
  for (const sourceId of ["GOVUK_INVERTER_SECURITY", "OFGEM_GRID_RSS"]) {
    const item = undatedLedger.datasets.sector_items.rows.find(({ source_id }) => source_id === sourceId);
    assert.ok(item, `undated ${sourceId} fixture was not retained`);
    assert.equal(item.source_published_at, null, `${sourceId} fabricated publisher time from collection time`);
    assert.equal(item.observed_at, fixture.collection_anchor_at);
  }

  const oversizedSource = contract.sources.find(({ id }) => id === "GOVUK_INVERTER_SECURITY");
  const oversizedFetch = async () => {
    let chunks = 0;
    return new Response(new ReadableStream({
      pull(controller) {
        if (chunks === 5) return controller.close();
        controller.enqueue(new Uint8Array(256 * 1024));
        chunks += 1;
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  let boundedError = null;
  try {
    await fetchBounded(oversizedSource, oversizedFetch, contract.limits);
  } catch (error) {
    boundedError = error;
  }
  assert.ok(boundedError, "chunked 1.25 MiB no-Content-Length response was accepted");
  assert.equal(boundedError.code, "RESPONSE_LIMIT");
  assert.equal(failureCode(boundedError), "RESPONSE_LIMIT");
  assert.equal(failureCode(Object.assign(new Error("http"), { code: "HTTP_STATUS" })), "HTTP_STATUS");

  const feedPrefix = "<rss><channel>";
  const feedSuffix = "</channel></rss>";
  const repeatedOpenings = Math.floor(
    (contract.limits.maximum_response_bytes - feedPrefix.length - feedSuffix.length) / "<item>".length,
  );
  const hostileFeed = `${feedPrefix}${"<item>".repeat(repeatedOpenings)}${feedSuffix}`;
  const hostileBytes = Buffer.byteLength(hostileFeed);
  assert.ok(hostileBytes >= contract.limits.maximum_response_bytes - 16);
  assert.ok(hostileBytes <= contract.limits.maximum_response_bytes);
  const hostileStarted = performance.now();
  const hostileScan = scanFeedEntries(hostileFeed, contract.limits);
  const hostileElapsedMs = performance.now() - hostileStarted;
  assert.equal(hostileScan.entries.length, 0);
  assert.equal(hostileScan.entries_scanned, 1);
  assert.equal(hostileScan.terminal_reason, "MALFORMED_UNCLOSED_ENTRY");
  assert.ok(hostileScan.scan_operations <= contract.limits.maximum_feed_scan_operations);
  const hostileFixture = structuredClone(fixture);
  hostileFixture.responses.OFGEM_GRID_RSS.body = hostileFeed;
  const hostileLedger = await collectSectorIntelligence({
    contract,
    genericNewsPath: options["generic-news"],
    fixture: hostileFixture,
    collectionAnchorAt: fixture.collection_anchor_at,
    collectionAnchorBasis: fixture.collection_anchor_basis,
  });
  const hostileStatus = hostileLedger.source_statuses.find(({ source_id }) => source_id === "OFGEM_GRID_RSS");
  assert.equal(hostileStatus.result, "FAILED_SOFT");
  assert.equal(hostileStatus.error_code, "FEED_FORMAT");
  assert.equal(hostileStatus.retained_items, 0);
  const cappedEntry = "<item><title>grid</title><link>https://www.ofgem.gov.uk/grid</link></item>";
  const entryLimitScan = scanFeedEntries(`<rss>${cappedEntry.repeat(contract.limits.maximum_feed_entries_scanned + 1)}</rss>`, contract.limits);
  assert.equal(entryLimitScan.terminal_reason, "ENTRY_LIMIT");
  assert.equal(entryLimitScan.entries_scanned, contract.limits.maximum_feed_entries_scanned);
  assert.ok(entryLimitScan.scan_operations <= contract.limits.maximum_feed_scan_operations);
  const operationLimitScan = scanFeedEntries(`<rss>${"<x>".repeat(contract.limits.maximum_feed_scan_operations + 1)}</rss>`, contract.limits);
  assert.equal(operationLimitScan.terminal_reason, "OPERATION_LIMIT");
  assert.ok(operationLimitScan.scan_operations <= contract.limits.maximum_feed_scan_operations);

  const hostileGovTitle = "<".repeat(contract.limits.maximum_response_bytes - 1024);
  assert.throws(() => cleanText(hostileGovTitle, contract.limits.maximum_title_characters), /raw pre-parse bound/u);
  const repeatedAmpersands = "&".repeat(contract.limits.maximum_raw_text_characters);
  assert.equal(cleanText(repeatedAmpersands, contract.limits.maximum_raw_text_characters), repeatedAmpersands);
  const hostileGovFixture = structuredClone(fixture);
  hostileGovFixture.responses.GOVUK_INVERTER_SECURITY.body = {
    results: [{
      title: hostileGovTitle,
      link: "/government/publications/hostile-title-must-be-rejected",
      public_timestamp: "2026-08-27T18:00:00Z",
      content_id: "hostile-title-must-be-rejected",
    }],
  };
  assert.ok(Buffer.byteLength(JSON.stringify(hostileGovFixture.responses.GOVUK_INVERTER_SECURITY.body))
    <= contract.limits.maximum_response_bytes);
  const hostileGovLedger = await collectSectorIntelligence({
    contract,
    genericNewsPath: options["generic-news"],
    fixture: hostileGovFixture,
    collectionAnchorAt: fixture.collection_anchor_at,
    collectionAnchorBasis: fixture.collection_anchor_basis,
  });
  const hostileGovStatus = hostileGovLedger.source_statuses.find(({ source_id }) => source_id === "GOVUK_INVERTER_SECURITY");
  assert.equal(hostileGovStatus.result, "OK");
  assert.equal(hostileGovStatus.retained_items, 0);

  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    mode: "source",
    generation: GENERATION,
    fixture_items: ledger.datasets.sector_items.rows.length,
    fixture_topics: ledger.datasets.sector_item_topics.rows.length,
    fixture_bindings: 0,
    sanitised_generic_data_centre_rows: 6,
    fcc_504: "FAILED_SOFT",
    chunked_oversize: "RESPONSE_LIMIT",
    hostile_rss_bytes: hostileBytes,
    hostile_rss_entries_scanned: hostileScan.entries_scanned,
    hostile_rss_scan_operations: hostileScan.scan_operations,
    hostile_rss_elapsed_ms_informative: Number(hostileElapsedMs.toFixed(3)),
    hostile_rss_result: "FAILED_SOFT_FEED_FORMAT",
    entry_limit: "SCAN_LIMIT",
    operation_limit: "SCAN_LIMIT",
    hostile_gov_title: "RAW_BOUND_REJECTED",
    undated_publisher_metadata: "NULL_PUBLISHED_AT_ANCHORED_OBSERVATION",
    hostile_contract_mutations_rejected: hostileContracts.length,
    deployment: "not-authorised",
  })}\n`);
}

const INDEPENDENT_DUCKDB_AUDIT = String.raw`
import json, pathlib, sys
import duckdb
contract=json.loads(pathlib.Path(sys.argv[1]).read_text())
root=pathlib.Path(sys.argv[2])
ledger=json.loads(pathlib.Path(sys.argv[3]).read_text())
out=[]
directories={"sector_items":"sector-items","sector_item_topics":"sector-item-topics","sector_project_bindings":"sector-project-bindings"}
for definition in contract["datasets"]:
    name=definition["name"]
    target=root / "releases" / "data" / "intelligence" / "202608272130" / directories[name] / "202608272130-part-000.parquet"
    escaped=str(target.resolve()).replace("'", "''")
    scan=f"read_parquet('{escaped}', hive_partitioning=false)"
    con=duckdb.connect(":memory:")
    con.execute("SET threads=1")
    schema=[(row[0],row[1]) for row in con.execute(f"DESCRIBE SELECT * FROM {scan}").fetchall()]
    expected=[(col["name"],col["duckdb_type"]) for col in definition["columns"]]
    keys=definition["key"]
    quoted=", ".join('"'+key+'"' for key in keys)
    rows=con.execute(f"SELECT count(*) FROM {scan}").fetchone()[0]
    distinct=con.execute(f"SELECT count(*) FROM (SELECT {quoted} FROM {scan} GROUP BY {quoted})").fetchone()[0]
    null_pred=" OR ".join('"'+key+'" IS NULL' for key in keys)
    nulls=con.execute(f"SELECT count(*) FROM {scan} WHERE {null_pred}").fetchone()[0]
    blank_pred=" OR ".join("trim(CAST(\""+key+"\" AS VARCHAR)) = ''" for key in keys)
    blanks=con.execute(f"SELECT count(*) FROM {scan} WHERE {blank_pred}").fetchone()[0]
    dups=con.execute(f"SELECT count(*) FROM (SELECT {quoted},count(*) n FROM {scan} GROUP BY {quoted} HAVING n>1)").fetchone()[0]
    compression=sorted({row[0] for row in con.execute(f"SELECT DISTINCT compression FROM parquet_metadata('{escaped}')").fetchall()})
    definitions=", ".join('"'+col["name"]+'" '+col["duckdb_type"] for col in definition["columns"])
    con.execute(f"CREATE TABLE expected_rows ({definitions})")
    expected_rows=ledger["datasets"][name]["rows"]
    if expected_rows:
        placeholders=", ".join("?" for _ in definition["columns"])
        con.executemany(f"INSERT INTO expected_rows VALUES ({placeholders})", [
            [row[col["name"]] for col in definition["columns"]] for row in expected_rows
        ])
    columns=", ".join('"'+col["name"]+'"' for col in definition["columns"])
    expected_minus=con.execute(
        f"SELECT count(*) FROM ((SELECT {columns} FROM expected_rows) EXCEPT ALL (SELECT {columns} FROM {scan}))"
    ).fetchone()[0]
    landed_minus=con.execute(
        f"SELECT count(*) FROM ((SELECT {columns} FROM {scan}) EXCEPT ALL (SELECT {columns} FROM expected_rows))"
    ).fetchone()[0]
    out.append({"dataset":name,"rows":rows,"distinct":distinct,"nulls":nulls,"blanks":blanks,"dups":dups,"schema":schema,"schema_exact":schema==expected,"compression":compression,"expected_minus_landed":expected_minus,"landed_minus_expected":landed_minus})
    con.close()
print(json.dumps({"duckdb_version":duckdb.__version__,"datasets":out},separators=(",",":")))
`;

async function verifyCandidate(options) {
  for (const required of ["contract", "generic-news", "ledger", "candidate-a", "candidate-b"]) assert.ok(options[required], `--${required} is required`);
  const contract = validateContract(await jsonFile(options.contract));
  const filesA = await listFiles(options["candidate-a"]);
  const filesB = await listFiles(options["candidate-b"]);
  assert.deepEqual(filesB, filesA, "candidate pass file closures differ");
  for (const relative of filesA) {
    assert.deepEqual(await readFile(path.join(options["candidate-b"], relative)), await readFile(path.join(options["candidate-a"], relative)),
      `independent candidate bytes differ: ${relative}`);
  }
  const manifestPath = path.join(options["candidate-a"], "build", `${GENERATION}-v8-fast-site-manifest.json`);
  const manifest = await jsonFile(manifestPath);
  assert.equal(manifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(manifest.generation, GENERATION);
  assert.equal(manifest.deployment, "not-authorised");
  assert.equal(manifest.project_posture.application, "NON_COMMERCIAL_OPEN_SOURCE");
  assert.equal(manifest.project_posture.application_usage_establishes_upstream_rights, false);
  assert.equal(manifest.time_provenance.live_collection_anchor_basis,
    "ACTIONS_LIVE_COLLECTION_STARTED_AT");
  assert.equal(manifest.time_provenance.collection_anchor_claims_wall_clock_fetch_time, true);
  assert.equal(manifest.parity.project_count, EXPECTED_COUNTS.projects);
  assert.equal(manifest.parity.capacity_mw, EXPECTED_COUNTS.capacity_mw);
  assert.equal(manifest.parity.headlines, EXPECTED_COUNTS.headlines);
  assert.equal(manifest.parity.canonical_headlines, EXPECTED_COUNTS.uk);
  assert.equal(manifest.parity.international_headlines, EXPECTED_COUNTS.international);
  assert.equal(manifest.performance_contract.sector_module_requests_at_startup, 0);
  assert.equal(manifest.performance_contract.sector_payload_requests_at_startup, 0);
  assert.equal(manifest.performance_contract.sector_payload_requests_at_mount, 0);
  assert.ok(manifest.performance_contract.initial_decoded_bytes < 2_000_000);
  const repositoryRoot = path.resolve(path.dirname(options.contract), "../..");
  const immediateHtml = await readFile(path.join(options["candidate-a"], "releases", `${GENERATION}-v8-fast-candidate.html`));
  const immediateRuntime = await readFile(path.join(options["candidate-a"], "releases", "javascript", `${GENERATION}-v8-fast-runtime.js`));
  const immediateRegistry = await readFile(path.join(options["candidate-a"], "releases", "data", `${GENERATION}-v8-fast-registry.json`));
  const registry = JSON.parse(immediateRegistry);
  const inheritedImmediate = [
    { ...registry.assets.projects, path: `releases/${registry.assets.projects.path}` },
    { ...registry.assets.style, path: `releases/${registry.assets.style.path}` },
    { ...registry.cartridges.mobile_orientation, path: `releases/${registry.cartridges.mobile_orientation.path}` },
    { ...registry.cartridges.atlas_v8_deep_link, path: `releases/${registry.cartridges.atlas_v8_deep_link.path}` },
  ];
  let recomputedInitialDecodedBytes = immediateHtml.length + immediateRuntime.length + immediateRegistry.length;
  for (const record of inheritedImmediate) {
    const bytes = await readFile(path.join(repositoryRoot, record.path));
    assert.equal(bytes.length, record.bytes, `startup asset byte count changed: ${record.path}`);
    assert.equal(sha256(bytes), record.sha256, `startup asset digest changed: ${record.path}`);
    assert.ok(manifest.inputs.some((input) => input.path === record.path
      && input.bytes === record.bytes && input.sha256 === record.sha256),
    `startup asset is absent from compiler inputs: ${record.path}`);
    recomputedInitialDecodedBytes += bytes.length;
  }
  assert.equal(manifest.performance_contract.initial_decoded_bytes, recomputedInitialDecodedBytes);
  assert.equal(manifest.discipline.generic_news_rows_changed, false);
  assert.equal(manifest.discipline.committed_sanitized_source_ledger_receipt, true);
  assert.equal(manifest.evidence,
    "workflow-artifacts-plus-committed-sanitized-source-ledger-receipt");
  assert.equal(manifest.discipline.query_context_used_for_project_identity, false);
  assert.equal(manifest.discipline.data_centre_generic_rows_sanitised_in_sector_view, 6);
  assert.equal(manifest.discipline.data_centres_owner_parquet_copied, false);
  assert.equal(manifest.discipline.companies_house_acquisition_in_pipelinenews, false);
  assert.equal(manifest.discipline.atman_runtime_dependency, false);
  assert.equal(manifest.discipline.project_bindings, 0);
  assert.equal(manifest.discipline.stable_route_changed, false);
  assert.equal(manifest.discipline.current_pointer_changed, false);
  assert.equal(manifest.discipline.globalgrid_catalogue_changed, false);
  assert.equal(manifest.discipline.pages_deployment_authorised, false);
  const outputPaths = manifest.outputs.map(({ path: relative }) => relative);
  const expectedClosure = [`build/${GENERATION}-v8-fast-site-manifest.json`, ...outputPaths].sort();
  assert.deepEqual(filesA, expectedClosure, "candidate contains undeclared or missing files");
  assert.equal(expectedClosure.length, 11);
  assert.equal(outputPaths.filter((relative) => relative.endsWith(`${GENERATION}-part-000.parquet`)).length, 3);
  assert.ok(outputPaths.every((relative) => relative.startsWith("releases/")
    && path.basename(relative).startsWith(GENERATION)));
  for (const record of manifest.outputs) {
    const bytes = await readFile(path.join(options["candidate-a"], record.path));
    assert.equal(bytes.length, record.bytes, `manifest output byte count changed: ${record.path}`);
    assert.equal(sha256(bytes), record.sha256, `manifest output digest changed: ${record.path}`);
  }
  const genericBytes = await readFile(options["generic-news"]);
  assert.equal(sha256(genericBytes), contract.frozen_generic_news.sha256);
  const generic = JSON.parse(genericBytes);
  assert.equal(generic.rows.length, 136);
  assert.equal(manifest.outputs.some(({ path: relative }) => relative === contract.frozen_generic_news.path), false);
  const payload = await jsonFile(path.join(options["candidate-a"], contract.browser_projection.path));
  const rows = decodedRows(payload);
  assert.equal(rows.filter(({ generic_article_id }) => generic_article_id).length, 6);
  assert.ok(rows.every(({ project_binding_count, eligible_for_news_signal }) => project_binding_count === 0 && eligible_for_news_signal === false));
  assert.ok(rows.every((row) => contract.identity_policy.forbidden_sector_item_fields.every((field) => !Object.hasOwn(row, field))));
  assert.ok(rows.filter(({ generic_article_id }) => generic_article_id).every(({ binding_label }) =>
    binding_label === "SECTOR CONTEXT ONLY — QUERY PROJECT IDENTITY REMOVED"));
  assert.equal(rows.filter(({ item_kind }) => item_kind === "CONTEXT_METRIC").length, 3);
  const audit = await jsonFile(path.join(options["candidate-a"], "releases", "data", "intelligence", GENERATION,
    `${GENERATION}-parquet-audit.json`));
  assert.equal(audit.status, "PASS");
  const ledgerBytes = await readFile(options.ledger);
  const sourceLedger = JSON.parse(ledgerBytes);
  assert.equal(audit.source_ledger.schema, "pipelinenews.sector-intelligence-ledger.v3");
  assert.equal(audit.source_ledger.bytes, ledgerBytes.length);
  assert.equal(audit.source_ledger.sha256, sha256(ledgerBytes));
  assert.equal(audit.source_ledger.collection_anchor_at, sourceLedger.collection_anchor_at);
  assert.equal(audit.source_ledger.collection_anchor_basis, sourceLedger.collection_anchor_basis);
  assert.equal(audit.source_ledger.collection_anchor_basis,
    contract.time_provenance.live_collection_anchor_basis);
  assert.equal(manifest.discipline.collection_anchor_at, sourceLedger.collection_anchor_at);
  assert.equal(manifest.discipline.collection_anchor_basis, sourceLedger.collection_anchor_basis);
  assert.equal(audit.source_ledger.source_statuses.length, contract.sources.length);
  assert.equal(audit.source_ledger.policy_evidence.network_requests, contract.limits.maximum_network_requests);
  const receiptPath = path.join(options["candidate-a"], "releases", "data", "intelligence", GENERATION,
    `${GENERATION}-source-ledger-receipt.json`);
  const receiptBytes = await readFile(receiptPath);
  const receipt = JSON.parse(receiptBytes);
  assert.deepEqual(audit.source_ledger.sanitized_receipt, {
    path: `releases/data/intelligence/${GENERATION}/${GENERATION}-source-ledger-receipt.json`,
    bytes: receiptBytes.length,
    sha256: sha256(receiptBytes),
  });
  assert.equal(receipt.schema, "pipelinenews.sector-intelligence-source-ledger-receipt.v3");
  assert.deepEqual(receipt.source_ledger, {
    schema: audit.source_ledger.schema,
    bytes: audit.source_ledger.bytes,
    sha256: audit.source_ledger.sha256,
    collection_anchor_at: audit.source_ledger.collection_anchor_at,
    collection_anchor_basis: audit.source_ledger.collection_anchor_basis,
    source_statuses: audit.source_ledger.source_statuses,
    policy_evidence: audit.source_ledger.policy_evidence,
  });
  assert.equal(receipt.retained_raw_html_bytes, 0);
  assert.equal(receipt.retained_article_body_bytes, 0);
  assert.equal(receipt.retained_search_snippet_characters, 0);
  const html = await readFile(path.join(options["candidate-a"], "releases", `${GENERATION}-v8-fast-candidate.html`), "utf8");
  assert.ok(html.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(html.includes("OPEN SECTOR INTELLIGENCE"));
  assert.ok(html.includes("NOT DEPLOYED"));
  assert.equal((html.match(/id="sectorIntelOpen"/gu) || []).length, 1);
  assert.equal((html.match(/id="sectorIntelHost"/gu) || []).length, 1);
  const runtime = await readFile(path.join(options["candidate-a"], "releases", "javascript", `${GENERATION}-v8-fast-runtime.js`), "utf8");
  assert.equal((runtime.match(/sectorIntelligenceImports \+= 1/gu) || []).length, 1);
  assert.ok(runtime.includes("sectorPayloadRequestsAtMount === 0"));
  assert.ok(!runtime.includes("atman/"));
  const independent = spawnSync("python3", ["-c", INDEPENDENT_DUCKDB_AUDIT, options.contract, options["candidate-a"], options.ledger], {
    encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(independent.status, 0, independent.stderr);
  const physical = JSON.parse(independent.stdout);
  assert.equal(physical.duckdb_version, "1.3.2");
  assert.deepEqual(physical.datasets.map(({ dataset }) => dataset), DATASETS);
  for (const dataset of physical.datasets) {
    assert.equal(dataset.rows, dataset.distinct);
    assert.equal(dataset.nulls, 0);
    assert.equal(dataset.blanks, 0);
    assert.equal(dataset.dups, 0);
    assert.equal(dataset.expected_minus_landed, 0);
    assert.equal(dataset.landed_minus_expected, 0);
    assert.equal(dataset.schema_exact, true);
    if (dataset.rows) assert.deepEqual(dataset.compression, ["ZSTD"]);
    else assert.deepEqual(dataset.compression, []);
  }
  assert.deepEqual(physical.datasets.map(({ rows }) => rows), [rows.length, rows.length, 0]);
  process.stdout.write(`${JSON.stringify({
    status: "PASS", mode: "candidate", generation: GENERATION,
    projects: EXPECTED_COUNTS.projects, headlines: EXPECTED_COUNTS.headlines,
    sector_items: rows.length, sector_topics: rows.length, sector_bindings: 0,
    duckdb: physical.duckdb_version, deterministic_files: filesA.length,
    deployment: "not-authorised",
  })}\n`);
}

async function verifyBrowser(options) {
  assert.ok(options.url, "--url is required");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  const failedRequests = [];
  const requests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()}:${request.failure()?.errorText}`));
  await page.goto(options.url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.dataset.fastReady === "true");
  assert.equal(requests.some((url) => url.endsWith(`/${GENERATION}-sector-intelligence.js`)), false);
  assert.equal(requests.some((url) => url.endsWith(`/${GENERATION}-sector-intelligence.json`)), false);
  assert.equal(await page.locator("#tbody tr").count(), 50);
  await page.waitForFunction(() => document.querySelector("#newsMeta")?.textContent.includes("136 headlines"));
  assert.match(await page.locator("#newsMeta").textContent(), /136 headlines/u);
  await page.locator("#sectorIntelOpen").click();
  await page.waitForFunction(() => document.querySelector("#sectorIntelHost")?.dataset.sectorIntelligenceState === "ready");
  assert.equal(requests.filter((url) => url.endsWith(`/${GENERATION}-sector-intelligence.js`)).length, 1);
  assert.equal(requests.filter((url) => url.endsWith(`/${GENERATION}-sector-intelligence.json`)).length, 0);
  await page.locator('[data-sector-topic="DATA_CENTRES"]').click();
  await page.waitForFunction(() => document.querySelector("[data-sector-status]")?.dataset.sectorStatus === "OK");
  assert.equal(requests.filter((url) => url.endsWith(`/${GENERATION}-sector-intelligence.json`)).length, 1);
  assert.equal(await page.locator(".sector-card").count(), 9);
  assert.equal(await page.locator(".sector-binding", { hasText: "QUERY PROJECT IDENTITY REMOVED" }).count(), 6);
  await page.locator('[data-sector-topic="WORLDWIDE_PV"]').click();
  await page.waitForFunction(() => ["OK", "EMPTY"].includes(document.querySelector("[data-sector-status]")?.dataset.sectorStatus));
  assert.equal(requests.filter((url) => url.endsWith(`/${GENERATION}-sector-intelligence.json`)).length, 1);
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedRequests, []);
  const failurePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  let failedPayloadAttempts = 0;
  await failurePage.route((url) => new URL(url).pathname.endsWith(`/${GENERATION}-sector-intelligence.json`), async (route) => {
    failedPayloadAttempts += 1;
    await route.abort("failed");
  });
  await failurePage.goto(options.url, { waitUntil: "domcontentloaded" });
  await failurePage.waitForFunction(() => document.body.dataset.fastReady === "true");
  assert.equal(failedPayloadAttempts, 0);
  await failurePage.locator("#sectorIntelOpen").click();
  await failurePage.waitForFunction(() => document.querySelector("#sectorIntelHost")?.dataset.sectorIntelligenceState === "ready");
  await failurePage.locator('[data-sector-topic="DATA_CENTRES"]').click();
  await failurePage.waitForFunction(() => document.querySelector("[data-sector-status]")?.dataset.sectorStatus === "FAIL");
  await failurePage.locator('[data-sector-topic="WORLDWIDE_PV"]').click();
  await failurePage.waitForFunction(() => document.querySelector("[data-sector-status]")?.dataset.sectorStatus === "FAIL");
  assert.equal(failedPayloadAttempts, 1, "a failed sector payload was retried");
  await failurePage.close();
  await browser.close();
  process.stdout.write(`${JSON.stringify({
    status: "PASS", mode: "browser", generation: GENERATION,
    startup_sector_requests: 0, module_requests_after_open: 1, payload_requests_after_selection: 1,
    data_centre_cards: 9, stripped_query_identity_cards: 6,
    failed_payload_clicks: 2, failed_payload_requests: failedPayloadAttempts,
    console_errors: 0, network_errors: 0, deployment: "not-authorised",
  })}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const options = argv.length === 0
    ? { mode: "browser", url: process.env.FAST_SITE_URL }
    : argumentsMap(argv);
  if (argv.length === 0) assert.ok(options.url, "FAST_SITE_URL is required for the Pages browser verifier");
  const mode = options.mode;
  if (mode === "source") await verifySource(options);
  else if (mode === "candidate") await verifyCandidate(options);
  else if (mode === "browser") await verifyBrowser(options);
  else throw new Error("--mode must be source, candidate or browser");
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
