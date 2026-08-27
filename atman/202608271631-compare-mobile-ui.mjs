import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import CONTRACT, { GENERATION } from "./202608271631-mobile-ui-invariants.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODE = process.env.MOBILE_UI_MODE || "audit";
const RAW_DIR = path.resolve(
  ROOT,
  process.env.MOBILE_UI_RAW_DIR || `work/${GENERATION}-mobile-ui-comparator/${MODE}/raw`,
);
const REPORT_DIR = path.resolve(
  ROOT,
  process.env.REPORT_DIR || `atman/reports/${GENERATION}`,
);
const CELL_SCHEMA = "pipelinenews.mobile-ui-cell-evidence.v1";
const OUTPUT_SCHEMA = "pipelinenews.mobile-ui-comparison.v1";
const ARTIFACT_SCHEMA = "pipelinenews.mobile-ui-comparator-artifacts.v1";
const MAX_SCREENSHOT_BYTES = 750 * 1024;
const MAX_RAW_BYTES = 25 * 1024 * 1024;
const MAX_REPORT_BYTES = 256 * 1024;
const MAX_METRICS_BYTES = 1024 * 1024;
const MAX_COMPACT_BYTES = 1_500 * 1024;
const STATES = new Set(["PASS", "FAIL", "N/A", "REPORT-ONLY"]);
const RAW_STATES = new Set([
  "PASS",
  "FAIL",
  "N/A",
  "REPORT-ONLY",
  "REPORT-ONLY-PASS",
  "REPORT-ONLY-FAIL",
]);

function fail(kind, message) {
  throw new Error(`${kind}: ${message}`);
}

function requireSchema(condition, message) {
  if (!condition) fail("schema error", message);
}

function validateProjectPosture(value, label) {
  requireSchema(value && typeof value === "object", `${label} project posture is missing`);
  requireSchema(value.owner === "Ventus Ltd", `${label} project owner must be Ventus Ltd`);
  requireSchema(value.application === "non-commercial-open-source",
    `${label} must identify the application as non-commercial open source`);
  requireSchema(value.publisher_redistribution_rights === "source-specific-not-inferred",
    `${label} must not infer publisher redistribution rights from the application posture`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sourceCommit() {
  const commit = (
    process.env.MOBILE_UI_SOURCE_COMMIT
    || process.env.GITHUB_SHA
    || execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" })
  ).trim();
  requireSchema(/^[0-9a-f]{40}$/u.test(commit), `invalid source commit ${commit}`);
  return commit;
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function posix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function walkFiles(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    fail("missing mandatory records", `cannot read raw evidence directory ${posix(path.relative(ROOT, root))}: ${error.message}`);
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(root, absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    } else {
      fail("hash error", `raw artifact is not a regular file: ${posix(path.relative(root, absolute))}`);
    }
  }
  return files;
}

async function hashRawArtifacts() {
  const files = await walkFiles(RAW_DIR);
  requireSchema(files.length > 0, "raw evidence directory is empty");
  const bytesByPath = new Map();
  const artifacts = [];
  for (const absolute of files) {
    let bytes;
    try {
      bytes = await readFile(absolute);
    } catch (error) {
      fail("hash error", `cannot read ${posix(path.relative(RAW_DIR, absolute))}: ${error.message}`);
    }
    const relative = posix(path.relative(RAW_DIR, absolute));
    if (/\.(?:jpe?g|png)$/iu.test(relative) && bytes.length > MAX_SCREENSHOT_BYTES) {
      fail("hash error", `screenshot exceeds ${MAX_SCREENSHOT_BYTES} bytes: ${relative}`);
    }
    bytesByPath.set(relative, bytes);
    artifacts.push({
      path: relative,
      sha256: sha256(bytes),
      bytes: bytes.length,
    });
  }
  artifacts.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const totalBytes = artifacts.reduce((total, artifact) => total + artifact.bytes, 0);
  if (totalBytes > MAX_RAW_BYTES) fail("hash error", `raw evidence exceeds ${MAX_RAW_BYTES} bytes`);
  return { artifacts, bytesByPath };
}

function parseJson(bytes, relative) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("schema error", `invalid JSON in ${relative}: ${error.message}`);
  }
}

function targetId(record) {
  return typeof record.target === "string" ? record.target : record.target?.id;
}

function cellId(record) {
  return typeof record.cell === "string" ? record.cell : record.cell?.id;
}

function rawObservation(result) {
  if (result.status === "REPORT-ONLY-PASS") return "PASS";
  if (result.status === "REPORT-ONLY-FAIL") return "FAIL";
  if (result.status === "REPORT-ONLY") {
    if (result.pass === true) return "PASS";
    if (result.pass === false) return "FAIL";
    return "N/A";
  }
  return result.status;
}

function matrixState(result, invariant) {
  if (!result || result.applicable === false || result.status === "N/A") return "N/A";
  if (invariant[MODE] === "report-only" || result.mode === "report-only" || result.status.startsWith("REPORT-ONLY")) {
    return "REPORT-ONLY";
  }
  return result.status;
}

function expectedApplicable(invariant, cell) {
  if (invariant.applies_to === "static") return cell.id !== CONTRACT.rotate_cell.id;
  if (invariant.applies_to === "landscape") return cell.orientation === "landscape";
  if (invariant.applies_to === "rotate") return cell.id === CONTRACT.rotate_cell.id;
  if (invariant.applies_to === "comparison") return true;
  return false;
}

function resultMap(record, relative) {
  requireSchema(Array.isArray(record.invariants), `${relative} invariants must be an array`);
  const results = new Map();
  for (const result of record.invariants) {
    requireSchema(result && typeof result === "object", `${relative} contains a non-object invariant result`);
    requireSchema(typeof result.id === "string", `${relative} contains an invariant without an id`);
    requireSchema(CONTRACT.invariants.some(({ id }) => id === result.id), `${relative} contains unknown invariant ${result.id}`);
    requireSchema(result.id !== "I12", `${relative} must leave comparison invariant I12 to the comparator`);
    requireSchema(!results.has(result.id), `${relative} repeats invariant ${result.id}`);
    requireSchema(RAW_STATES.has(result.status), `${relative} ${result.id} has invalid status ${String(result.status)}`);
    requireSchema(typeof result.applicable === "boolean", `${relative} ${result.id} must declare applicability`);
    const invariant = CONTRACT.invariants.find(({ id }) => id === result.id);
    requireSchema(result.mode === invariant[MODE], `${relative} ${result.id} mode must be ${invariant[MODE]}`);
    requireSchema(
      result.applicable ? result.status !== "N/A" : result.status === "N/A",
      `${relative} ${result.id} applicability and status disagree`,
    );
    if (result.status === "PASS" || result.status === "REPORT-ONLY-PASS") {
      requireSchema(result.pass === true, `${relative} ${result.id} PASS must carry pass:true`);
    } else if (result.status === "FAIL" || result.status === "REPORT-ONLY-FAIL") {
      requireSchema(result.pass === false, `${relative} ${result.id} FAIL must carry pass:false`);
    } else if (result.status === "N/A") {
      requireSchema(result.pass === null, `${relative} ${result.id} N/A must carry pass:null`);
    }
    results.set(result.id, result);
  }
  for (const invariant of CONTRACT.invariants.filter(({ id }) => id !== "I12")) {
    requireSchema(results.has(invariant.id), `${relative} is missing invariant ${invariant.id}`);
  }
  return results;
}

function screenshotReferences(record) {
  const references = [];
  if (!record.screenshots || typeof record.screenshots !== "object") return references;
  const visit = (value, trail) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.path === "string") {
      requireSchema(value.path.length > 0, `screenshot ${trail} has an empty path`);
      references.push({ kind: trail, ...value });
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, trail ? `${trail}.${key}` : key);
  };
  visit(record.screenshots, "screenshots");
  return references;
}

function resolveRawReference(referencePath) {
  const absolute = path.isAbsolute(referencePath)
    ? path.resolve(referencePath)
    : path.resolve(RAW_DIR, referencePath);
  if (!inside(RAW_DIR, absolute)) fail("hash error", `artifact reference escapes raw evidence: ${referencePath}`);
  return posix(path.relative(RAW_DIR, absolute));
}

function recordKey(target, cell) {
  return `${target}::${cell}`;
}

function parseRawEvidence(bytesByPath, artifacts) {
  const records = new Map();
  let run = null;
  for (const artifact of artifacts.filter(({ path: name }) => name.endsWith(".json"))) {
    const payload = parseJson(bytesByPath.get(artifact.path), artifact.path);
    if (payload?.schema === CELL_SCHEMA) {
      addRecord(records, payload, artifact.path, artifacts);
      continue;
    }
    if (Array.isArray(payload?.records) && payload.records.some((item) => item && typeof item === "object")) {
      for (const [index, record] of payload.records.entries()) {
        if (record && typeof record === "object" && (record.schema === CELL_SCHEMA || record.target)) {
          addRecord(records, record, `${artifact.path}#records[${index}]`, artifacts);
        }
      }
    }
    if (path.posix.basename(artifact.path) === "run.json") {
      requireSchema(payload && typeof payload === "object" && !Array.isArray(payload), "run.json must be an object");
      run = payload;
    } else if (/^[^/]+--[^/]+\.json$/u.test(path.posix.basename(artifact.path))) {
      requireSchema(payload?.schema === CELL_SCHEMA, `${artifact.path} is not ${CELL_SCHEMA}`);
    }
  }
  return { records, run };
}

function addRecord(records, record, relative, artifacts) {
  requireSchema(record.schema === CELL_SCHEMA, `${relative} has wrong cell schema`);
  requireSchema(record.generation === GENERATION, `${relative} generation must be ${GENERATION}`);
  validateProjectPosture(record.project_posture, relative);
  requireSchema(record.mode === MODE, `${relative} mode must be ${MODE}`);
  const target = targetId(record);
  const cell = cellId(record);
  requireSchema(CONTRACT.targets.some(({ id }) => id === target), `${relative} has unknown target ${String(target)}`);
  const knownCells = [...CONTRACT.cells.map(({ id }) => id), CONTRACT.rotate_cell.id];
  requireSchema(knownCells.includes(cell), `${relative} has unknown cell ${String(cell)}`);
  requireSchema(!(target === "original" && cell === CONTRACT.rotate_cell.id), `${relative} must not measure original in R1`);
  requireSchema(["MEASURED", "UNAVAILABLE"].includes(record.availability), `${relative} has invalid availability`);
  const key = recordKey(target, cell);
  requireSchema(!records.has(key), `duplicate record ${target}/${cell}`);
  const results = resultMap(record, relative);
  const artifactByPath = new Map(artifacts.map((item) => [item.path, item]));
  for (const screenshot of screenshotReferences(record)) {
    const screenshotPath = resolveRawReference(screenshot.path);
    const artifact = artifactByPath.get(screenshotPath);
    if (!artifact) fail("hash error", `${relative} references missing screenshot ${screenshotPath}`);
    if (screenshot.sha256 !== undefined && screenshot.sha256 !== artifact.sha256) {
      fail("hash error", `${relative} screenshot hash differs for ${screenshotPath}`);
    }
    if (screenshot.bytes !== undefined && screenshot.bytes !== artifact.bytes) {
      fail("hash error", `${relative} screenshot byte count differs for ${screenshotPath}`);
    }
  }
  records.set(key, { record, relative, results });
}

function requiredRecordKeys() {
  const keys = [];
  for (const target of CONTRACT.targets.filter(({ required }) => required)) {
    for (const cell of CONTRACT.cells) keys.push(recordKey(target.id, cell.id));
    if (CONTRACT.rotate_cell.targets.includes(target.id)) {
      keys.push(recordKey(target.id, CONTRACT.rotate_cell.id));
    }
  }
  return keys;
}

function validateMandatoryRecords(records) {
  for (const key of requiredRecordKeys()) {
    const evidence = records.get(key);
    if (!evidence) fail("missing mandatory records", key.replace("::", "/"));
    if (evidence.record.availability !== "MEASURED") {
      fail("missing mandatory records", `${key.replace("::", "/")} is unavailable`);
    }
  }
}

function validateRun(run, records, source) {
  requireSchema(run && typeof run === "object", "run.json is missing");
  requireSchema(run.schema === "pipelinenews.mobile-ui-browser-run.v1", "run.json has wrong schema");
  requireSchema(run.generation === GENERATION, `run.json generation must be ${GENERATION}`);
  validateProjectPosture(run.project_posture, "run.json");
  requireSchema(run.source_commit === source, "run.json source commit differs from the comparator source");
  requireSchema(/^\d{12}$/u.test(run.candidate_generation), "run.json candidate generation is invalid");
  requireSchema(run.contract_schema === CONTRACT.schema, "run.json contract schema changed");
  requireSchema(run.mode === MODE, `run.json mode must be ${MODE}`);
  requireSchema(run.deployment === CONTRACT.deployment, "run.json deployment state changed");
  requireSchema(run.status === "CAPTURED", "browser evidence producer did not complete");
  requireSchema(run.browser && typeof run.browser === "object", "run.json browser metadata is missing");
  requireSchema(run.browser.engine === CONTRACT.browser.engine, "run.json browser engine changed");
  requireSchema(
    run.browser.playwright_version === CONTRACT.browser.playwright_version,
    "run.json Playwright version differs from the contract",
  );
  requireSchema(typeof run.browser.chromium_version === "string" && run.browser.chromium_version.length > 0,
    "run.json Chromium version is missing");
  requireSchema(/^[0-9a-f]{64}$/u.test(run.browser.executable_sha256),
    "run.json Chromium executable SHA-256 is invalid");
  requireSchema(Array.isArray(run.records), "run.json records must be an array");
  requireSchema(run.records.length === records.size, "run.json record list differs from discovered records");
  requireSchema(run.expected_record_count === records.size, "run.json expected record count differs from discovered records");
  requireSchema(Array.isArray(run.required_failures) && run.required_failures.length === 0,
    "run.json contains required target failures");
}

function validateRecordSourceBindings(records, source, candidateGeneration) {
  for (const { record, relative } of records.values()) {
    requireSchema(record.source_commit === source, `${relative} source commit differs from the comparator source`);
    requireSchema(
      record.candidate_generation === candidateGeneration,
      `${relative} candidate generation differs from run.json`,
    );
  }
}

function buildMatrix(records) {
  const cells = [...CONTRACT.cells, { ...CONTRACT.rotate_cell, orientation: "rotate" }];
  const targetIds = CONTRACT.targets.map(({ id }) => id);
  const matrix = {};
  const observed = {};
  for (const invariant of CONTRACT.invariants) {
    matrix[invariant.id] = {};
    observed[invariant.id] = {};
    for (const cell of cells) {
      matrix[invariant.id][cell.id] = Object.fromEntries(targetIds.map((target) => [target, "N/A"]));
      observed[invariant.id][cell.id] = Object.fromEntries(targetIds.map((target) => [target, "N/A"]));
      if (invariant.id === "I12") continue;
      for (const target of targetIds) {
        const evidence = records.get(recordKey(target, cell.id));
        if (!evidence || evidence.record.availability !== "MEASURED") continue;
        const result = evidence.results.get(invariant.id);
        requireSchema(
          result.applicable === expectedApplicable(invariant, cell),
          `${evidence.relative} ${invariant.id} applicability contradicts the contract`,
        );
        matrix[invariant.id][cell.id][target] = matrixState(result, invariant);
        observed[invariant.id][cell.id][target] = rawObservation(result);
      }
    }
  }

  for (const cell of cells) {
    const baseline = records.get(recordKey("baseline", cell.id));
    const baselineComplete = Boolean(
      baseline
      && baseline.record.availability === "MEASURED"
      && [...baseline.results.values()].every((result) => (
        result.applicable === expectedApplicable(
          CONTRACT.invariants.find(({ id }) => id === result.id),
          cell,
        )
      )),
    );
    for (const target of ["candidate", "baseline"]) {
      const evidence = records.get(recordKey(target, cell.id));
      if (!evidence) continue;
      const state = baselineComplete && evidence.record.availability === "MEASURED" ? "PASS" : "FAIL";
      matrix.I12[cell.id][target] = state;
      observed.I12[cell.id][target] = state;
    }
  }

  for (const invariant of CONTRACT.invariants) {
    for (const cell of cells) {
      for (const target of targetIds) {
        requireSchema(STATES.has(matrix[invariant.id][cell.id][target]), `invalid folded state ${invariant.id}/${cell.id}/${target}`);
      }
    }
  }
  return { cells, matrix, observed };
}

function buildVerdict(matrix, observed, cells, records) {
  const candidateChecks = [];
  for (const invariant of CONTRACT.invariants) {
    if (invariant.id === "I12") continue;
    if (invariant[MODE] !== "gated") continue;
    for (const cell of cells) {
      if (!expectedApplicable(invariant, cell)) continue;
      const state = matrix[invariant.id][cell.id].candidate;
      candidateChecks.push({ invariant: invariant.id, cell: cell.id, status: state });
    }
  }
  const candidateFailures = candidateChecks.filter(({ status }) => status !== "PASS");
  const baselineFailures = [];
  for (const invariant of CONTRACT.invariants) {
    for (const cell of cells) {
      if (!expectedApplicable(invariant, cell)) continue;
      if (matrix[invariant.id][cell.id].baseline === "FAIL") {
        baselineFailures.push({ invariant: invariant.id, cell: cell.id });
      }
    }
  }
  const originalExpected = CONTRACT.cells.length;
  const originalMeasured = CONTRACT.cells.filter(({ id }) => records.get(recordKey("original", id))?.record.availability === "MEASURED").length;
  return {
    producer_status: "PASS",
    audit_producer_status: "PASS",
    candidate_gate: {
      status: candidateFailures.length === 0 ? "PASS" : "FAIL",
      checks: candidateChecks.length,
      failures: candidateFailures,
      excluded_report_only: CONTRACT.invariants
        .filter((invariant) => invariant[MODE] === "report-only")
        .map(({ id }) => id),
    },
    baseline_characterisation: {
      status: "RECORDED",
      failures: baselineFailures,
    },
    original_context: {
      status: originalMeasured === 0 ? "UNAVAILABLE" : originalMeasured === originalExpected ? "RECORDED" : "PARTIAL",
      measured_cells: originalMeasured,
      expected_cells: originalExpected,
      gated: false,
    },
  };
}

function buildPrediction(observed) {
  if (MODE !== "audit") {
    return {
      status: "N/A",
      checks: [],
      contradictions: [],
      gates_workflow: false,
      note: "The generation-A landscape-failure hypothesis applies only in audit mode.",
    };
  }
  const checks = [];
  for (const target of CONTRACT.expected_audit.characterised_targets) {
    for (const cell of CONTRACT.expected_audit.cells) {
      for (const invariant of CONTRACT.expected_audit.expected_failures) {
        const actual = observed[invariant]?.[cell]?.[target] || "N/A";
        checks.push({ target, cell, invariant, expected: "FAIL", actual, matches: actual === "FAIL" });
      }
    }
  }
  return {
    status: checks.every(({ matches }) => matches) ? "CONFIRMED" : "CONTRADICTED",
    checks,
    contradictions: checks.filter(({ matches }) => !matches),
    gates_workflow: false,
    note: CONTRACT.expected_audit.note,
  };
}

function recordSummary(records) {
  return [...records.values()]
    .map(({ record, relative }) => ({
      target: targetId(record),
      target_label: typeof record.target === "object" ? record.target.label : null,
      target_url: typeof record.target === "object" ? record.target.url : null,
      cell: cellId(record),
      availability: record.availability,
      evidence: relative,
      ready: record.ready?.status ?? record.ready?.ready ?? null,
      diagnostics: {
        console_errors: record.diagnostics?.console_errors?.length || 0,
        page_errors: record.diagnostics?.page_errors?.length || 0,
        failed_requests: record.diagnostics?.failed_requests?.length || 0,
        http_errors: record.diagnostics?.http_errors?.length || 0,
      },
    }))
    .sort((a, b) => {
      const left = `${a.target}/${a.cell}`;
      const right = `${b.target}/${b.cell}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
}

function measurementExcerpt(result) {
  const measurement = result.measurement && typeof result.measurement === "object"
    ? result.measurement
    : {};
  const base = { applicable: result.applicable, pass: result.pass };
  if (!result.applicable) return { ...base, reason: measurement.reason || null };
  switch (result.id) {
    case "I1":
      return {
        ...base,
        viewport_width: measurement.viewport_width ?? null,
        root_scroll_width: measurement.root_scroll_width ?? null,
        body_scroll_width: measurement.body_scroll_width ?? null,
        offender_count: measurement.unwhitelisted_offenders?.length ?? null,
      };
    case "I2":
      return {
        ...base,
        viewport_height: measurement.viewport_height ?? null,
        body_scroll_height: measurement.body_scroll_height ?? null,
        root_scroll_height: measurement.root_scroll_height ?? null,
        maximum_root_scroll: measurement.maximum_root_scroll ?? null,
        probe_px: measurement.probe_px ?? null,
        probe_delta_px: Number.isFinite(measurement.probed_scroll_y)
          && Number.isFinite(measurement.initial_scroll_y)
          ? Number((measurement.probed_scroll_y - measurement.initial_scroll_y).toFixed(2))
          : null,
        overflow_y: measurement.overflow_y ?? null,
      };
    case "I3": {
      const panels = Array.isArray(measurement.panels) ? measurement.panels : [];
      const rectHeights = panels.map((panel) => panel.rect?.height).filter(Number.isFinite);
      const constrainedHeights = panels.flatMap((panel) => {
        const values = [];
        if (panel.declared_height !== null && panel.declared_height_is_auto === false) {
          if (Number.isFinite(panel.used_height_px)) values.push(panel.used_height_px);
        }
        if (panel.declared_minimum_height !== null && panel.declared_minimum_is_auto_or_zero === false) {
          if (Number.isFinite(panel.minimum_height_px)) values.push(panel.minimum_height_px);
        }
        return values;
      });
      return {
        ...base,
        maximum_panel_height: measurement.maximum_panel_height ?? null,
        maximum_rect_height: rectHeights.length ? Math.max(...rectHeights) : null,
        maximum_constrained_height: constrainedHeights.length ? Math.max(...constrainedHeights) : null,
        panel_count: panels.length,
        exceed_count: panels.filter(({ exceeds }) => exceeds).length,
      };
    }
    case "I4":
      return {
        ...base,
        maximum_sticky_pixels: measurement.maximum_sticky_pixels ?? null,
        occupied_pixels: measurement.occupied_pixels ?? null,
        occupied_ratio: measurement.occupied_ratio ?? null,
        union_band_count: measurement.union_bands?.length ?? null,
        contributor_count: measurement.contributors?.length ?? null,
        contributor_sample: (measurement.contributors || []).slice(0, 3).map((item) => ({
          element: item.element ?? null,
          position: item.position ?? null,
          top: item.top ?? null,
          bottom: item.bottom ?? null,
        })),
      };
    case "I5":
      return {
        ...base,
        controls: Object.fromEntries(Object.entries(measurement.controls || {}).map(([name, control]) => [name, {
          present: control.present ?? null,
          rendered: control.rendered ?? null,
          hit_testable: control.hit_testable ?? null,
          scroll_actions: control.scroll_actions ?? null,
          pass: control.pass ?? null,
        }])),
      };
    case "I6":
      return {
        ...base,
        interactive_count: measurement.interactive_count ?? null,
        explicit_exception_count: measurement.explicit_exception_count ?? null,
        failure_count: measurement.failure_count ?? null,
        top_failure_labels: (measurement.failures || []).slice(0, 5).map((item) => ({
          element: item.element ?? null,
          text: typeof item.text === "string" ? item.text.slice(0, 80) : null,
          required_px: item.required_px ?? null,
        })),
      };
    case "I7":
      return {
        ...base,
        cdp_override_supported: measurement.cdp_override_supported ?? null,
        viewport_fit_cover: measurement.viewport_fit_cover ?? null,
        env_match: measurement.env_match
          ?? measurement.environment_insets_match
          ?? measurement.computed_env_matches_requested
          ?? null,
        intersection_count: measurement.intersection_count ?? null,
      };
    case "I8":
      return {
        ...base,
        menu_applicable: measurement.applicable ?? result.applicable,
        fits_viewport: measurement.fits_viewport ?? null,
        internally_scrollable: measurement.internally_scrollable ?? null,
        outside_dismiss: measurement.outside_dismiss ?? null,
        underlying_scroll_locked: measurement.underlying_scroll_locked ?? null,
      };
    case "I9": {
      const snapshots = Array.isArray(measurement.snapshots) ? measurement.snapshots : [];
      const initial = snapshots[0] || {};
      const final = snapshots.at(-1) || {};
      const delta = (key) => Number.isFinite(initial[key]) && Number.isFinite(final[key])
        ? final[key] - initial[key]
        : null;
      const tolerance = (key) => Number.isFinite(initial[key])
        ? Math.max(
          CONTRACT.thresholds.rotation_node_delta_floor,
          Math.ceil(initial[key] * CONTRACT.thresholds.rotation_node_delta_ratio),
        )
        : null;
      return {
        ...base,
        connected_delta: measurement.connected_delta ?? delta("connected_elements"),
        connected_tolerance: measurement.connected_tolerance ?? null,
        document_delta: measurement.cdp_document_delta
          ?? measurement.document_delta
          ?? delta("cdp_documents"),
        document_tolerance: measurement.cdp_document_tolerance
          ?? measurement.document_tolerance
          ?? tolerance("cdp_documents"),
        node_delta: measurement.cdp_node_delta ?? delta("cdp_nodes"),
        node_tolerance: measurement.cdp_node_tolerance ?? null,
        listener_delta: measurement.cdp_listener_delta
          ?? measurement.listener_delta
          ?? delta("cdp_js_event_listeners"),
        listener_tolerance: measurement.cdp_listener_tolerance
          ?? measurement.listener_tolerance
          ?? tolerance("cdp_js_event_listeners"),
        detached_supported: measurement.detached_supported ?? null,
        detached_delta: measurement.detached_total_delta
          ?? measurement.detached_retained_delta
          ?? null,
        detached_tolerance: measurement.detached_tolerance ?? null,
        detached_stable: measurement.detached_stable ?? null,
        documents_stable: measurement.cdp_documents_stable ?? null,
        listeners_stable: measurement.cdp_listeners_stable ?? null,
        monotonic_growth: measurement.monotonic_growth ?? null,
      };
    }
    case "I10":
      return {
        ...base,
        present: measurement.present ?? null,
        visible_row_count: measurement.visible_row_count ?? null,
        minimum_visible_rows: measurement.minimum_visible_rows ?? null,
        client_width: measurement.client_width ?? null,
        scroll_width: measurement.scroll_width ?? null,
        maximum_scroll_left: measurement.maximum_scroll_left ?? null,
        reached_final_position: measurement.reached_final_position ?? null,
        final_column_visible: measurement.final_column_visible ?? null,
      };
    case "I11":
      return {
        ...base,
        minimum_copy_font_px: measurement.minimum_copy_font_px ?? null,
        required_minimum_px: measurement.required_minimum_px ?? null,
        webkit_text_size_adjust: measurement.webkit_text_size_adjust ?? null,
        text_size_adjust_explicit: measurement.text_size_adjust_explicit ?? null,
        clipped_text_count: measurement.clipped_text_count ?? null,
      };
    default:
      return base;
  }
}

function measurementExcerpts(records) {
  return [...records.values()]
    .map(({ record, results }) => ({
      target: targetId(record),
      cell: cellId(record),
      availability: record.availability,
      invariants: Object.fromEntries([...results]
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([id, result]) => [id, measurementExcerpt(result)])),
    }))
    .sort((a, b) => {
      const left = `${a.target}/${a.cell}`;
      const right = `${b.target}/${b.cell}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
}

function artifactIdentity() {
  const runId = process.env.GITHUB_RUN_ID || null;
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT || null;
  if (process.env.GITHUB_ACTIONS === "true") {
    requireSchema(/^\d+$/u.test(runId || ""), "GITHUB_RUN_ID is invalid");
    requireSchema(/^\d+$/u.test(runAttempt || ""), "GITHUB_RUN_ATTEMPT is invalid");
  }
  const suffix = runId && runAttempt ? `${runId}-${runAttempt}` : null;
  const defaultFull = suffix
    ? `pipelinenews-mobile-ui-${MODE}-${GENERATION}-${suffix}`
    : null;
  const defaultCompact = suffix
    ? `pipelinenews-mobile-ui-${MODE === "audit" ? "compact" : `${MODE}-compact`}-${GENERATION}-${suffix}`
    : null;
  return {
    github_run_id: runId,
    github_run_attempt: runAttempt,
    full_artifact_name: process.env.MOBILE_UI_FULL_ARTIFACT_NAME || defaultFull,
    compact_artifact_name: process.env.MOBILE_UI_COMPACT_ARTIFACT_NAME || defaultCompact,
    retention_days: 30,
    raw_artifact_expiry: "30 days",
  };
}

function browserSummary(run) {
  const browser = run?.browser && typeof run.browser === "object" ? run.browser : {};
  return {
    engine: browser.engine || CONTRACT.browser.engine,
    playwright_version: browser.playwright_version || CONTRACT.browser.playwright_version,
    chromium_version: browser.chromium_version || browser.version || null,
    executable_sha256: browser.executable_sha256 || browser.browser_sha256 || null,
  };
}

function statusForReport(matrix, observed, invariant, cell, target) {
  const state = matrix[invariant][cell][target];
  if (state !== "REPORT-ONLY") return state;
  return `REPORT-ONLY (${observed[invariant][cell][target]})`;
}

function markdownTableForTarget(target, matrix, observed, cellIds) {
  const lines = [
    `### ${CONTRACT.targets.find(({ id }) => id === target)?.label || target}`,
    "",
    `| Invariant | ${cellIds.join(" | ")} |`,
    `| --- | ${cellIds.map(() => "---").join(" | ")} |`,
  ];
  for (const invariant of CONTRACT.invariants) {
    const values = cellIds.map((cell) => statusForReport(matrix, observed, invariant.id, cell, target));
    lines.push(`| ${invariant.id} ${invariant.name} | ${values.join(" | ")} |`);
  }
  return lines;
}

function makeReport(metrics, rawArtifactCount, rawArtifactBytes) {
  const { verdict, prediction, matrix, observed } = metrics;
  const cellIds = metrics.cells.map(({ id }) => id);
  const browserHash = metrics.browser.executable_sha256 || "not reported";
  const lines = [
    "# PipelineNews mobile UI comparator",
    "",
    `Generation: \`${GENERATION}\`  `,
    `Candidate generation: \`${metrics.candidate_generation || "not reported"}\`  `,
    `Source commit: \`${metrics.source_commit}\`  `,
    `Mode: \`${MODE}\`  `,
    `Deployment: \`${CONTRACT.deployment}\``,
    "",
    "Project posture: **Ventus Ltd — non-commercial open source**. Publisher redistribution rights remain source-specific and are not inferred by this audit.",
    "",
    `The evidence producer completed: **${verdict.producer_status}**. The measured candidate gate is **${verdict.candidate_gate.status}**. Measured UI failures do not change the comparator process status.`,
    "",
    `Baseline characterisation: **${verdict.baseline_characterisation.status}**. Original context: **${verdict.original_context.status}** and never gated.`,
    "",
    `Expected L1-L4 I2/I3/I4 audit hypothesis: **${prediction.status}**. Contradictions are retained as evidence and never invalidate the run.`,
    "",
    "## Pinned browser",
    "",
    `Playwright \`${metrics.browser.playwright_version}\`; Chromium \`${metrics.browser.chromium_version || "not reported"}\`; executable SHA-256 \`${browserHash}\`.`,
    "",
    "## Candidate gate failures",
    "",
  ];
  if (verdict.candidate_gate.failures.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Invariant | Cell |", "| --- | --- |");
    for (const failure of verdict.candidate_gate.failures) lines.push(`| ${failure.invariant} | ${failure.cell} |`);
  }
  if (verdict.candidate_gate.excluded_report_only.length > 0) {
    lines.push(
      "",
      `${verdict.candidate_gate.excluded_report_only.join(", ")} is report-only in ${MODE} mode and excluded from the candidate gate.`,
      "",
    );
  }
  lines.push("## Invariant matrix", "");
  for (const target of CONTRACT.targets.map(({ id }) => id)) {
    lines.push(...markdownTableForTarget(target, matrix, observed, cellIds), "");
  }
  lines.push("## Prediction check", "", "| Target | Cell | Invariant | Expected | Actual |", "| --- | --- | --- | --- | --- |");
  for (const check of prediction.checks) {
    lines.push(`| ${check.target} | ${check.cell} | ${check.invariant} | ${check.expected} | ${check.actual} |`);
  }
  lines.push(
    "",
    "## Evidence closure",
    "",
    `${rawArtifactCount} raw artifacts (${rawArtifactBytes} bytes), including screenshots, are SHA-256 indexed in \`artifact-manifest.json\`. Only this compact report, folded metrics and the hash manifest belong in the quarantine-proof commit.`,
    "",
    metrics.artifact_identity.full_artifact_name
      ? `Full evidence artifact: \`${metrics.artifact_identity.full_artifact_name}\` (retention: ${metrics.artifact_identity.retention_days} days).`
      : "Full evidence artifact identity is assigned by GitHub Actions.",
    "",
    "No release, stable pointer, catalogue or Pages deployment is changed by this comparator.",
    "",
  );
  return lines.join("\n");
}

async function main() {
  requireSchema(Object.hasOwn(CONTRACT.modes, MODE), `unsupported comparator mode ${MODE}`);
  requireSchema(CONTRACT.schema === "pipelinenews.mobile-ui-invariants.v1", "unexpected contract schema");
  requireSchema(CONTRACT.generation === GENERATION, "contract generation differs from module generation");
  validateProjectPosture(CONTRACT.project_posture, "contract");
  const contractPath = path.join(ROOT, "atman", `${GENERATION}-mobile-ui-invariants.mjs`);
  const contractBytes = await readFile(contractPath);
  const source = sourceCommit();
  const { artifacts, bytesByPath } = await hashRawArtifacts();
  const { records, run } = parseRawEvidence(bytesByPath, artifacts);
  validateMandatoryRecords(records);
  validateRun(run, records, source);
  validateRecordSourceBindings(records, source, run.candidate_generation);
  const { cells, matrix, observed } = buildMatrix(records);
  const verdict = buildVerdict(matrix, observed, cells, records);
  const prediction = buildPrediction(observed);
  const rawBytes = artifacts.reduce((total, artifact) => total + artifact.bytes, 0);
  const rawClosureSha256 = sha256(Buffer.from(
    artifacts.map((artifact) => `${artifact.path}\0${artifact.sha256}\0${artifact.bytes}\n`).join(""),
    "utf8",
  ));
  const identity = artifactIdentity();
  const metrics = {
    schema: OUTPUT_SCHEMA,
    generation: GENERATION,
    source_commit: source,
    candidate_generation: run?.candidate_generation || null,
    mode: MODE,
    deployment: CONTRACT.deployment,
    project_posture: CONTRACT.project_posture,
    contract: {
      path: `atman/${GENERATION}-mobile-ui-invariants.mjs`,
      sha256: sha256(contractBytes),
    },
    browser: browserSummary(run),
    targets: CONTRACT.targets.map(({ id, label, required, gated }) => ({ id, label, required, gated })),
    cells: cells.map(({ id, width, height, dpr, orientation, represents }) => ({ id, width, height, dpr, orientation, represents })),
    invariants: CONTRACT.invariants.map(({ id, name, applies_to }) => ({
      id,
      name,
      applies_to,
      mode: CONTRACT.invariants.find((item) => item.id === id)[MODE],
    })),
    matrix,
    observed,
    verdict,
    prediction,
    records: recordSummary(records),
    measurement_excerpts: measurementExcerpts(records),
    artifact_identity: identity,
    raw_artifacts: {
      count: artifacts.length,
      bytes: rawBytes,
      closure_sha256: rawClosureSha256,
    },
  };
  const metricsBytes = jsonBytes(metrics);
  const reportBytes = Buffer.from(makeReport(metrics, artifacts.length, rawBytes), "utf8");
  if (reportBytes.length > MAX_REPORT_BYTES) fail("schema error", `report exceeds ${MAX_REPORT_BYTES} bytes`);
  if (metricsBytes.length > MAX_METRICS_BYTES) fail("schema error", `metrics exceed ${MAX_METRICS_BYTES} bytes`);
  const compactFiles = [
    { path: "report.md", sha256: sha256(reportBytes), bytes: reportBytes.length },
    { path: "metrics.json", sha256: sha256(metricsBytes), bytes: metricsBytes.length },
  ];
  const artifactManifest = {
    schema: ARTIFACT_SCHEMA,
    generation: GENERATION,
    source_commit: source,
    candidate_generation: metrics.candidate_generation,
    mode: MODE,
    project_posture: CONTRACT.project_posture,
    raw_root: "raw",
    raw_closure_sha256: rawClosureSha256,
    full_artifacts: artifacts,
    compact_files: compactFiles,
    artifact_identity: identity,
    self_hash_excluded: true,
  };
  const artifactManifestBytes = jsonBytes(artifactManifest);
  if (reportBytes.length + metricsBytes.length + artifactManifestBytes.length > MAX_COMPACT_BYTES) {
    fail("schema error", `compact evidence exceeds ${MAX_COMPACT_BYTES} bytes`);
  }
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, "report.md"), reportBytes);
  await writeFile(path.join(REPORT_DIR, "metrics.json"), metricsBytes);
  await writeFile(path.join(REPORT_DIR, "artifact-manifest.json"), artifactManifestBytes);
  process.stdout.write(`${JSON.stringify({
    schema: OUTPUT_SCHEMA,
    generation: GENERATION,
    source_commit: source,
    mode: MODE,
    producer_status: verdict.producer_status,
    candidate_gate: verdict.candidate_gate.status,
    baseline_characterisation: verdict.baseline_characterisation.status,
    original_context: verdict.original_context.status,
    prediction: prediction.status,
    raw_artifacts: artifacts.length,
    compact_files: compactFiles.map(({ path: name }) => name).concat("artifact-manifest.json"),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
