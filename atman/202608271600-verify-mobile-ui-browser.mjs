import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import sharp from "sharp";

import CONTRACT, { GENERATION } from "./202608271600-mobile-ui-invariants.mjs";

const require = createRequire(import.meta.url);
const PLAYWRIGHT_VERSION = require("playwright/package.json").version;
const SHARP_VERSION = require("sharp/package.json").version;
const EXPECTED_SHARP_VERSION = "0.34.3";
const MODE = process.env.MOBILE_UI_MODE === "repair" ? "repair" : "audit";
const SOURCE_COMMIT = process.env.MOBILE_UI_SOURCE_COMMIT || process.env.GITHUB_SHA || "";
const cliOutIndex = process.argv.indexOf("--out-root");
const RAW_DIR = path.resolve(
  cliOutIndex >= 0 && process.argv[cliOutIndex + 1]
    ? process.argv[cliOutIndex + 1]
    : process.env.MOBILE_UI_RAW_DIR || "audit-results/mobile-ui",
);
const FULL_SCREENSHOT_LIMIT_PX = 16_384;
const SCREENSHOT_LIMIT_BYTES = 400 * 1024;
const CELL_RECORD_LIMIT_BYTES = 256 * 1024;
const SCREENSHOT_DIR = path.join(RAW_DIR, "screenshots");

if (CONTRACT.schema !== "pipelinenews.mobile-ui-invariants.v1") {
  throw new Error(`Unsupported mobile UI contract: ${CONTRACT.schema}`);
}
if (CONTRACT.generation !== GENERATION) {
  throw new Error("Mobile UI contract generation mismatch");
}
if (PLAYWRIGHT_VERSION !== CONTRACT.browser.playwright_version) {
  throw new Error(`Playwright ${PLAYWRIGHT_VERSION} does not match pinned ${CONTRACT.browser.playwright_version}`);
}
if (SHARP_VERSION !== EXPECTED_SHARP_VERSION) {
  throw new Error(`Sharp ${SHARP_VERSION} does not match pinned ${EXPECTED_SHARP_VERSION}`);
}
if (!/^[0-9a-f]{40}$/u.test(SOURCE_COMMIT)) {
  throw new Error("MOBILE_UI_SOURCE_COMMIT or GITHUB_SHA must be an exact lowercase 40-hex source commit");
}

await mkdir(RAW_DIR, { recursive: true });
await mkdir(SCREENSHOT_DIR, { recursive: true });

const targetUrlOverrides = Object.freeze({
  candidate: process.env.MOBILE_UI_CANDIDATE_URL || process.env.MOBILE_CANDIDATE_URL,
  baseline: process.env.MOBILE_UI_BASELINE_URL,
  original: process.env.MOBILE_UI_ORIGINAL_URL,
});
const allTargets = CONTRACT.targets.map((target) => ({
  ...target,
  url: targetUrlOverrides[target.id] || target.url,
}));
function selectedIds(environmentName, allowed) {
  const raw = process.env[environmentName];
  if (raw === undefined) return [...allowed];
  if (!raw.trim() || raw.trim().toLowerCase() === "none") return [];
  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (new Set(values).size !== values.length) throw new Error(`${environmentName} repeats an id`);
  for (const value of values) {
    if (!allowed.includes(value)) throw new Error(`${environmentName} contains unknown id ${value}`);
  }
  return values;
}
const selectedTargetIds = selectedIds("MOBILE_UI_TARGET_IDS", allTargets.map(({ id }) => id));
const selectedCellIds = selectedIds("MOBILE_UI_CELL_IDS", CONTRACT.cells.map(({ id }) => id));
const includeRotate = process.env.MOBILE_UI_INCLUDE_ROTATE === undefined
  ? true
  : process.env.MOBILE_UI_INCLUDE_ROTATE === "true";
const shardId = process.env.MOBILE_UI_SHARD_ID || "complete";
const targets = allTargets.filter(({ id }) => selectedTargetIds.includes(id));
const staticCells = CONTRACT.cells.filter(({ id }) => selectedCellIds.includes(id));
if (targets.length === 0) throw new Error("MOBILE_UI_TARGET_IDS selected no targets");
if (staticCells.length === 0 && !includeRotate) throw new Error("shard selected neither static nor rotation cells");
const candidateGeneration = process.env.MOBILE_UI_CANDIDATE_GENERATION || "202608271524";
const startedAt = new Date().toISOString();
const recordFiles = [];
const requiredFailures = [];
let optionalOriginalFailure = null;

function slug(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/gu, "-");
}

function serialiseError(error) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack || null }
    : { name: "Error", message: String(error), stack: null };
}

function relativeEvidencePath(filePath) {
  return path.relative(RAW_DIR, filePath).split(path.sep).join("/");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function invariantResult(id, applicable, pass, measurement) {
  const descriptor = CONTRACT.invariants.find((invariant) => invariant.id === id);
  if (!descriptor) throw new Error(`Invariant ${id} is absent from the frozen contract`);
  const mode = descriptor[MODE];
  let status = "N/A";
  if (applicable) {
    if (mode === "report-only") status = pass ? "REPORT-ONLY-PASS" : "REPORT-ONLY-FAIL";
    else status = pass ? "PASS" : "FAIL";
  }
  return {
    id,
    name: descriptor.name,
    applicable,
    pass: applicable ? Boolean(pass) : null,
    status,
    mode,
    measurement,
  };
}

function emptyInvariantResults(reason, rotate = false) {
  return CONTRACT.invariants
    .filter(({ id }) => id !== "I12")
    .map((descriptor) => invariantResult(
      descriptor.id,
      false,
      null,
      { reason, expected_scope: rotate ? "rotate" : "static" },
    ));
}

async function applySafeArea(cdp, cellId, orientation) {
  const requested = CONTRACT.safe_area_insets_by_cell[cellId]
    || Object.values(CONTRACT.safe_area_insets_by_cell).find((value) => (
      orientation === "landscape" ? value.left > 0 : value.top > 0
    ))
    || { top: 0, right: 0, bottom: 0, left: 0 };
  const insets = {
    ...requested,
    topMax: requested.top,
    rightMax: requested.right,
    bottomMax: requested.bottom,
    leftMax: requested.left,
  };
  try {
    await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
    return { supported: true, requested, error: null };
  } catch (error) {
    return { supported: false, requested, error: serialiseError(error) };
  }
}

function attachDiagnostics(page) {
  const diagnostics = {
    console_errors: [],
    page_errors: [],
    failed_requests: [],
    http_errors: [],
  };
  const favicon = (url) => {
    try {
      return new URL(url).pathname.endsWith("/favicon.ico");
    } catch {
      return false;
    }
  };
  const retain = (list, value) => {
    if (list.length < 20) list.push(value);
  };
  page.on("console", (message) => {
    if (message.type() === "error") retain(diagnostics.console_errors, message.text().slice(0, 500));
  });
  page.on("pageerror", (error) => retain(diagnostics.page_errors, String(error).slice(0, 500)));
  page.on("requestfailed", (request) => {
    if (!favicon(request.url())) {
      retain(diagnostics.failed_requests, {
        url: request.url().slice(0, 500),
        error: (request.failure()?.errorText || "request failed").slice(0, 500),
      });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !favicon(response.url())) {
      retain(diagnostics.http_errors, { url: response.url().slice(0, 500), status: response.status() });
    }
  });
  return diagnostics;
}

async function waitUntilReady(page, target) {
  const timeout = target.required
    ? CONTRACT.browser.ready_timeout_ms
    : Math.min(CONTRACT.browser.ready_timeout_ms, 30_000);

  if (target.ready === "fast-1524") {
    await page.waitForFunction(() => (
      document.body.dataset.fastReady === "true"
      || document.body.dataset.fastFailed === "true"
    ), null, { timeout });
    const boot = await page.evaluate(() => ({
      ready: document.body.dataset.fastReady || null,
      failed: document.body.dataset.fastFailed || null,
      generation: document.body.dataset.fastGeneration || null,
    }));
    if (boot.failed === "true" || boot.ready !== "true" || boot.generation !== candidateGeneration) {
      throw new Error(`Fast candidate failed closed: ${JSON.stringify(boot)}`);
    }
    await page.waitForFunction(() => (
      document.querySelectorAll("#tbody > tr").length > 0
      && document.querySelectorAll("#stories .story").length > 0
    ), null, { timeout });
  } else if (target.ready === "trusted-v9-6-2") {
    await page.waitForFunction(() => (
      document.querySelectorAll("#tbody > tr").length === 7_680
      && document.querySelectorAll("#stories .story").length === 133
    ), null, { timeout });
  } else {
    await page.waitForFunction(() => {
      if (document.readyState === "loading") return false;
      const rows = document.querySelectorAll("tbody tr, [role='row']").length;
      return rows >= 3 || Boolean(document.querySelector(".tablewrap, table, canvas, [role='grid']"));
    }, null, { timeout });
  }

  return page.evaluate(() => ({
    title: document.title,
    ready_state: document.readyState,
    fast_ready: document.body.dataset.fastReady || null,
    fast_failed: document.body.dataset.fastFailed || null,
    fast_generation: document.body.dataset.fastGeneration || null,
    project_rows: document.querySelectorAll("#tbody > tr").length,
    story_rows: document.querySelectorAll("#stories .story").length,
    dom_elements: document.getElementsByTagName("*").length,
  }));
}

async function navigate(page, target) {
  const timeout = target.required
    ? CONTRACT.browser.navigation_timeout_ms
    : Math.min(CONTRACT.browser.navigation_timeout_ms, 30_000);
  const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout });
  if (!response) throw new Error("Navigation returned no main-resource response");
  if (!response.ok()) throw new Error(`Navigation returned HTTP ${response.status()}`);
  return waitUntilReady(page, target);
}

async function captureScreenshots(page, targetId, cellId, suffix = "") {
  const stem = `${slug(targetId)}--${slug(cellId)}${suffix ? `--${slug(suffix)}` : ""}`;
  const viewportPath = path.join(SCREENSHOT_DIR, `${stem}--viewport.jpeg`);
  const fullPath = path.join(SCREENSHOT_DIR, `${stem}--full.jpeg`);
  const dimensions = await page.evaluate(() => ({
    document_width: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
    ),
    document_height: Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
    ),
    viewport_width: innerWidth,
    viewport_height: innerHeight,
  }));

  const boundedJpeg = async (filePath, fullPage) => {
    const raster = await page.screenshot({
      type: "png",
      fullPage,
      scale: "css",
      animations: "disabled",
    });
    let buffer;
    let quality;
    for (const attempt of [70, 55, 40, 28, 18, 10, 5]) {
      quality = attempt;
      buffer = await sharp(raster, { limitInputPixels: false })
        .jpeg({ quality, chromaSubsampling: "4:2:0", mozjpeg: false })
        .toBuffer();
      if (buffer.byteLength <= SCREENSHOT_LIMIT_BYTES) break;
    }
    if (buffer.byteLength > SCREENSHOT_LIMIT_BYTES) {
      throw new Error(`Screenshot ${path.basename(filePath)} exceeds 400 KiB at minimum JPEG quality`);
    }
    await writeFile(filePath, buffer);
    return {
      path: relativeEvidencePath(filePath),
      captured: true,
      bytes: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      quality,
      source_raster_bytes: raster.byteLength,
      encoder: `sharp-${SHARP_VERSION}`,
      browser_rasterizations: 1,
      css_pixel_scale: true,
      screenshot_budget_bytes: SCREENSHOT_LIMIT_BYTES,
      within_400_kib_budget: buffer.byteLength <= SCREENSHOT_LIMIT_BYTES,
    };
  };

  const viewport = await boundedJpeg(viewportPath, false);
  let capturedFullPage = false;
  let fullCaptureReason = null;
  let full;
  if (
    dimensions.document_height <= FULL_SCREENSHOT_LIMIT_PX
    && dimensions.document_width <= FULL_SCREENSHOT_LIMIT_PX
  ) {
    full = await boundedJpeg(fullPath, true);
    capturedFullPage = true;
  } else {
    full = await boundedJpeg(fullPath, false);
    fullCaptureReason = `bounded fallback: document exceeds ${FULL_SCREENSHOT_LIMIT_PX}px raster limit`;
  }
  return {
    viewport,
    full: {
      ...full,
      complete_document: capturedFullPage,
      note: fullCaptureReason,
    },
    dimensions,
  };
}

async function exerciseReleaseMenu(page) {
  const menuSelector = CONTRACT.selectors.release_menu;
  const openerSelector = CONTRACT.selectors.release_menu_opener;
  const base = await page.evaluate(({ menuSelector: menuQuery, openerSelector: openerQuery }) => {
    const menu = document.querySelector(menuQuery);
    const opener = document.querySelector(openerQuery);
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return {
      menu_present: Boolean(menu),
      menu_initially_visible: visible(menu),
      opener_present: Boolean(opener),
      opener_visible: visible(opener),
    };
  }, { menuSelector, openerSelector });
  if (!base.opener_present || !base.opener_visible) return { ...base, exercised: false };

  const originalScroll = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    const main = document.querySelector(".main");
    return {
      root: { x: root.scrollLeft, y: root.scrollTop },
      main: main ? { x: main.scrollLeft, y: main.scrollTop } : null,
    };
  });
  const restoreOriginalScroll = () => page.evaluate((positions) => {
    const root = document.scrollingElement || document.documentElement;
    const main = document.querySelector(".main");
    root.scrollTo(positions.root.x, positions.root.y);
    if (main && positions.main) main.scrollTo(positions.main.x, positions.main.y);
  }, originalScroll);

  try {
    await page.locator(openerSelector).first().click();
    await page.waitForFunction((selector) => {
      const menu = document.querySelector(selector);
      if (!menu) return false;
      const rect = menu.getBoundingClientRect();
      const style = getComputedStyle(menu);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }, menuSelector, { timeout: 5_000 });

    const opened = await page.evaluate((selector) => {
      const menu = document.querySelector(selector);
      const rect = menu.getBoundingClientRect();
      const style = getComputedStyle(menu);
      const isPopover = menu.matches(":popover-open");
      const isDialog = menu instanceof HTMLDialogElement && menu.open;
      const htmlOverflow = getComputedStyle(document.documentElement).overflowY;
      const bodyOverflow = getComputedStyle(document.body).overflowY;
      const main = document.querySelector(".main");
      const mainOverflow = main ? getComputedStyle(main).overflowY : null;
      const fitsViewport = rect.top >= -0.5 && rect.left >= -0.5
        && rect.bottom <= innerHeight + 0.5 && rect.right <= innerWidth + 0.5;
      const internallyScrollable = /(auto|scroll)/u.test(style.overflowY)
        && menu.scrollHeight > menu.clientHeight + 1
        && rect.height <= innerHeight + 0.5;
      return {
        rect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        viewport: { width: innerWidth, height: innerHeight },
        overlay_open: isPopover || isDialog || menu.getAttribute("aria-modal") === "true",
        popover_open: isPopover,
        dialog_open: isDialog,
        fits_viewport: fitsViewport,
        internally_scrollable: internallyScrollable,
        scroll_height: menu.scrollHeight,
        client_height: menu.clientHeight,
        overflow_y: style.overflowY,
        lock_styles: { html: htmlOverflow, body: bodyOverflow, main: mainOverflow },
        underlying_scroll_locked: [htmlOverflow, bodyOverflow, mainOverflow].some((value) => value === "hidden"),
      };
    }, menuSelector);

    const candidates = [
      { x: 1, y: 1 },
      { x: opened.viewport.width - 2, y: 1 },
      { x: 1, y: opened.viewport.height - 2 },
      { x: opened.viewport.width - 2, y: opened.viewport.height - 2 },
    ];
    const outside = candidates.find(({ x, y }) => (
      x < opened.rect.left || x > opened.rect.right || y < opened.rect.top || y > opened.rect.bottom
    ));
    let outsideDismiss = false;
    let scrollProbe = {
      attempted: false,
      locked: false,
      before: null,
      after: null,
      deltas: null,
    };
    if (outside) {
      const beforeScroll = await page.evaluate(() => {
        const root = document.scrollingElement || document.documentElement;
        const main = document.querySelector(".main");
        return {
          root: { x: root.scrollLeft, y: root.scrollTop },
          main: main ? { x: main.scrollLeft, y: main.scrollTop } : null,
        };
      });
      await page.mouse.move(outside.x, outside.y);
      await page.mouse.wheel(0, 160);
      await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      const afterScroll = await page.evaluate(() => {
        const root = document.scrollingElement || document.documentElement;
        const main = document.querySelector(".main");
        return {
          root: { x: root.scrollLeft, y: root.scrollTop },
          main: main ? { x: main.scrollLeft, y: main.scrollTop } : null,
        };
      });
      const deltas = {
        root_x: afterScroll.root.x - beforeScroll.root.x,
        root_y: afterScroll.root.y - beforeScroll.root.y,
        main_x: afterScroll.main && beforeScroll.main ? afterScroll.main.x - beforeScroll.main.x : 0,
        main_y: afterScroll.main && beforeScroll.main ? afterScroll.main.y - beforeScroll.main.y : 0,
      };
      scrollProbe = {
        attempted: true,
        locked: Object.values(deltas).every((value) => Math.abs(value) < 1),
        before: beforeScroll,
        after: afterScroll,
        deltas,
      };
      await page.evaluate((positions) => {
        const root = document.scrollingElement || document.documentElement;
        const main = document.querySelector(".main");
        root.scrollTo(positions.root.x, positions.root.y);
        if (main && positions.main) main.scrollTo(positions.main.x, positions.main.y);
      }, beforeScroll);
      await page.mouse.click(outside.x, outside.y);
      outsideDismiss = await page.waitForFunction((selector) => {
        const menu = document.querySelector(selector);
        if (!menu) return true;
        const rect = menu.getBoundingClientRect();
        const style = getComputedStyle(menu);
        return style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0;
      }, menuSelector, { timeout: 2_000 }).then(() => true, () => false);
    }
    if (!outsideDismiss) await page.keyboard.press("Escape").catch(() => {});
    const result = {
      ...base,
      ...opened,
      exercised: true,
      open_error: null,
      outside_point: outside || null,
      outside_dismiss: outsideDismiss,
      underlying_scroll_probe: scrollProbe,
      underlying_scroll_locked: scrollProbe.locked,
    };
    await restoreOriginalScroll();
    return result;
  } catch (error) {
    await page.keyboard.press("Escape").catch(() => {});
    await restoreOriginalScroll().catch(() => {});
    return { ...base, exercised: true, open_error: serialiseError(error), outside_dismiss: false };
  }
}

async function collectStaticMeasurements(page, cell, safeArea, menuExercise) {
  return page.evaluate(async ({ contract, cellSpec, safeAreaState, menuExerciseState }) => {
    const { selectors, thresholds } = contract;
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const rectData = (rect) => ({
      x: Number(rect.x.toFixed(2)),
      y: Number(rect.y.toFixed(2)),
      top: Number(rect.top.toFixed(2)),
      right: Number(rect.right.toFixed(2)),
      bottom: Number(rect.bottom.toFixed(2)),
      left: Number(rect.left.toFixed(2)),
      width: Number(rect.width.toFixed(2)),
      height: Number(rect.height.toFixed(2)),
    });
    const elementLabel = (element) => {
      if (!element) return null;
      if (element.id) return `#${element.id}`;
      const classes = [...element.classList].slice(0, 3).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
    };
    const cssVisible = (element) => {
      if (!(element instanceof Element)) return false;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      if (typeof element.checkVisibility === "function") {
        return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      }
      return Boolean(element.getClientRects().length);
    };
    const rendered = (element) => {
      if (!cssVisible(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const inViewport = (rect) => (
      rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
    );
    const intersectRect = (rect, clip) => {
      const left = Math.max(rect.left, clip.left);
      const top = Math.max(rect.top, clip.top);
      const right = Math.min(rect.right, clip.right);
      const bottom = Math.min(rect.bottom, clip.bottom);
      if (right <= left || bottom <= top) return null;
      return {
        x: left,
        y: top,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
      };
    };
    const visibleHitRect = (element) => {
      let visible = intersectRect(element.getBoundingClientRect(), {
        left: 0,
        top: 0,
        right: innerWidth,
        bottom: innerHeight,
      });
      if (!visible) return null;
      for (let ancestor = element.parentElement; ancestor && visible; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const clipX = /^(?:auto|clip|hidden|scroll)$/u.test(style.overflowX);
        const clipY = /^(?:auto|clip|hidden|scroll)$/u.test(style.overflowY);
        if (!clipX && !clipY) continue;
        const ancestorRect = ancestor.getBoundingClientRect();
        visible = intersectRect(visible, {
          left: clipX ? ancestorRect.left : -Infinity,
          top: clipY ? ancestorRect.top : -Infinity,
          right: clipX ? ancestorRect.right : Infinity,
          bottom: clipY ? ancestorRect.bottom : Infinity,
        });
      }
      return visible;
    };
    const elementOwnsHitAt = (element, x, y) => {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit && (hit === element || element.contains(hit)));
    };
    const visibleHitWithin = (element, rect) => {
      if (!rect) return false;
      const epsilon = 0.25;
      const xs = [
        rect.left + rect.width / 2,
        Math.min(rect.right - epsilon, rect.left + epsilon),
        Math.max(rect.left + epsilon, rect.right - epsilon),
      ];
      const ys = [
        rect.top + rect.height / 2,
        Math.min(rect.bottom - epsilon, rect.top + epsilon),
        Math.max(rect.top + epsilon, rect.bottom - epsilon),
      ];
      return xs.some((x) => ys.some((y) => elementOwnsHitAt(element, x, y)));
    };
    const hitTestable = (element) => {
      const rect = element.getBoundingClientRect();
      if (!inViewport(rect)) return false;
      const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit && (element === hit || element.contains(hit) || hit.contains(element)));
    };

    const root = document.scrollingElement || document.documentElement;
    const overflowOffenders = [];
    for (const element of document.querySelectorAll("body *")) {
      if (overflowOffenders.length >= 20 || !rendered(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.right <= innerWidth + thresholds.root_overflow_tolerance_px && rect.left >= -thresholds.root_overflow_tolerance_px) continue;
      const whitelisted = selectors.internal_x_scroll_whitelist.some((selector) => {
        const owner = element.closest(selector);
        if (!owner) return false;
        const ownerRect = owner.getBoundingClientRect();
        return ownerRect.left >= -thresholds.root_overflow_tolerance_px
          && ownerRect.right <= innerWidth + thresholds.root_overflow_tolerance_px;
      });
      if (!whitelisted) overflowOffenders.push({ element: elementLabel(element), rect: rectData(rect) });
    }
    const i1 = {
      viewport_width: innerWidth,
      root_scroll_width: root.scrollWidth,
      body_scroll_width: document.body?.scrollWidth || 0,
      tolerance_px: thresholds.root_overflow_tolerance_px,
      whitelist: selectors.internal_x_scroll_whitelist,
      unwhitelisted_offenders: overflowOffenders,
    };
    i1.pass = root.scrollWidth <= innerWidth + thresholds.root_overflow_tolerance_px
      && overflowOffenders.length === 0;

    const originalRootScroll = { left: root.scrollLeft, top: root.scrollTop };
    const bodyScrollHeight = document.body?.scrollHeight || 0;
    const rootScrollHeight = root.scrollHeight;
    const scrollDemand = Math.max(bodyScrollHeight, rootScrollHeight);
    const maximumRootScroll = Math.max(0, rootScrollHeight - innerHeight);
    const probeDistance = Math.min(thresholds.body_scroll_probe_px, maximumRootScroll);
    let probedScrollY = scrollY;
    if (scrollDemand > innerHeight + 1 && probeDistance > 0) {
      root.scrollTop = Math.min(maximumRootScroll, originalRootScroll.top + probeDistance);
      await nextFrame();
      await nextFrame();
      probedScrollY = scrollY;
      root.scrollTo(originalRootScroll.left, originalRootScroll.top);
      await nextFrame();
    }
    const i2 = {
      viewport_height: innerHeight,
      body_scroll_height: bodyScrollHeight,
      root_scroll_height: rootScrollHeight,
      maximum_root_scroll: maximumRootScroll,
      probe_px: probeDistance,
      initial_scroll_y: originalRootScroll.top,
      probed_scroll_y: probedScrollY,
      overflow_y: getComputedStyle(document.body).overflowY,
    };
    i2.pass = scrollDemand <= innerHeight + 1
      || (probeDistance > 0 && Math.abs(probedScrollY - originalRootScroll.top) >= 1);

    const panelLimit = innerHeight * thresholds.panel_viewport_height_ratio;
    const panels = [];
    for (const selector of selectors.panels) {
      const elements = [...document.querySelectorAll(selector)];
      elements.forEach((element, index) => {
        if (!rendered(element)) return;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const typedStyle = typeof element.computedStyleMap === "function"
          ? element.computedStyleMap()
          : null;
        const typedHeight = typedStyle?.get("height")?.toString() || null;
        const typedMinimumHeight = typedStyle?.get("min-height")?.toString() || null;
        const minimumHeight = Number.parseFloat(style.minHeight);
        const usedHeight = Number.parseFloat(style.height);
        const declaredHeightIsAuto = typedHeight === "auto";
        const declaredMinimumIsAutoOrZero = typedMinimumHeight === "auto"
          || typedMinimumHeight === "0px"
          || typedMinimumHeight === "0";
        const fixedHeightExceeds = typedHeight !== null
          && !declaredHeightIsAuto
          && rect.height > panelLimit + 0.5;
        const minimumHeightExceeds = typedMinimumHeight !== null
          && !declaredMinimumIsAutoOrZero
          && Number.isFinite(minimumHeight)
          && minimumHeight > panelLimit + 0.5;
        panels.push({
          selector,
          index,
          element: elementLabel(element),
          rect: rectData(rect),
          used_height_px: Number.isFinite(usedHeight) ? usedHeight : null,
          minimum_height_px: Number.isFinite(minimumHeight) ? minimumHeight : null,
          declared_height: typedHeight,
          declared_minimum_height: typedMinimumHeight,
          declared_height_is_auto: declaredHeightIsAuto,
          declared_minimum_is_auto_or_zero: declaredMinimumIsAutoOrZero,
          overflow_y: style.overflowY,
          exceeds: fixedHeightExceeds || minimumHeightExceeds,
        });
      });
    }
    const i3 = {
      viewport_height: innerHeight,
      maximum_panel_height: Number(panelLimit.toFixed(2)),
      panels,
      pass: panels.every((panel) => !panel.exceeds),
    };

    const stickySnapshot = (label) => {
      const stickyBands = [];
      for (const element of document.querySelectorAll("body *")) {
        if (!rendered(element)) continue;
        const rect = element.getBoundingClientRect();
        if (!inViewport(rect)) continue;
        const position = getComputedStyle(element).position;
        if (position !== "sticky" && position !== "fixed") continue;
        stickyBands.push({
          top: Math.max(0, rect.top),
          bottom: Math.min(innerHeight, rect.bottom),
          position,
          element: elementLabel(element),
        });
      }
      stickyBands.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
      const mergedBands = [];
      for (const band of stickyBands) {
        if (band.bottom <= band.top) continue;
        const previous = mergedBands.at(-1);
        if (!previous || band.top > previous.bottom) {
          mergedBands.push({ top: band.top, bottom: band.bottom });
        } else {
          previous.bottom = Math.max(previous.bottom, band.bottom);
        }
      }
      const occupiedPixels = mergedBands.reduce((sum, band) => sum + band.bottom - band.top, 0);
      return {
        label,
        occupied_pixels: Number(occupiedPixels.toFixed(2)),
        occupied_ratio: Number((occupiedPixels / innerHeight).toFixed(4)),
        union_bands: mergedBands.map((band) => ({
          top: Number(band.top.toFixed(2)),
          bottom: Number(band.bottom.toFixed(2)),
        })),
        contributors: stickyBands.slice(0, 20).map((band) => ({
          ...band,
          top: Number(band.top.toFixed(2)),
          bottom: Number(band.bottom.toFixed(2)),
        })),
        contributor_count: stickyBands.length,
      };
    };
    const stickyScrollState = [];
    const stickyScrollElements = new Set([root]);
    for (const selector of [
      ...Object.values(selectors.controls),
      selectors.table_wrap,
      ".main",
      ".paper",
    ]) {
      const element = document.querySelector(selector);
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (current === root || (/(auto|scroll)/u.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1)) {
          stickyScrollElements.add(current);
        }
      }
    }
    for (const element of stickyScrollElements) {
      stickyScrollState.push({ element, top: element.scrollTop, left: element.scrollLeft });
    }
    const stickySamples = [stickySnapshot("initial")];
    const controlsAnchor = document.querySelector(selectors.controls.search);
    if (controlsAnchor) {
      controlsAnchor.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      await nextFrame();
      await nextFrame();
      stickySamples.push(stickySnapshot("controls"));
    }
    for (const state of stickyScrollState) state.element.scrollTo(state.left, state.top);
    await nextFrame();
    const tableAnchor = document.querySelector(selectors.table_wrap);
    if (tableAnchor) {
      tableAnchor.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
      await nextFrame();
      await nextFrame();
      stickySamples.push(stickySnapshot("table"));
    }
    for (const state of stickyScrollState) state.element.scrollTo(state.left, state.top);
    await nextFrame();
    const worstStickySample = stickySamples.reduce((worst, sample) => (
      sample.occupied_pixels > worst.occupied_pixels ? sample : worst
    ));
    const stickyLimit = innerHeight * thresholds.sticky_viewport_height_ratio;
    const i4 = {
      viewport_height: innerHeight,
      maximum_sticky_pixels: Number(stickyLimit.toFixed(2)),
      occupied_pixels: worstStickySample.occupied_pixels,
      occupied_ratio: worstStickySample.occupied_ratio,
      worst_sample: worstStickySample.label,
      union_bands: worstStickySample.union_bands,
      contributors: worstStickySample.contributors,
      samples: stickySamples,
      pass: worstStickySample.occupied_pixels <= stickyLimit + 0.5,
    };

    const controls = {};
    for (const [name, selector] of Object.entries(selectors.controls)) {
      const element = document.querySelector(selector);
      if (!element) {
        controls[name] = { selector, present: false, pass: false };
        continue;
      }
      const scrollChain = [];
      const seenScrollers = new Set();
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (/(auto|scroll)/u.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1) {
          scrollChain.push({ element: ancestor, top: ancestor.scrollTop, left: ancestor.scrollLeft });
          seenScrollers.add(ancestor);
        }
      }
      if (!seenScrollers.has(root)) scrollChain.push({ element: root, top: root.scrollTop, left: root.scrollLeft });
      const beforeRect = element.getBoundingClientRect();
      const initiallyHitTestable = hitTestable(element);
      let deliberateScrollAction = false;
      if (!initiallyHitTestable) {
        element.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        deliberateScrollAction = true;
        await nextFrame();
        await nextFrame();
      }
      const rect = element.getBoundingClientRect();
      const scrollDeltas = scrollChain.map((entry) => ({
        owner: entry.element === root ? "document" : elementLabel(entry.element),
        delta_x: Number((entry.element.scrollLeft - entry.left).toFixed(2)),
        delta_y: Number((entry.element.scrollTop - entry.top).toFixed(2)),
      })).filter(({ delta_x: x, delta_y: y }) => x !== 0 || y !== 0);
      const disabled = Boolean(element.disabled) || element.getAttribute("aria-disabled") === "true";
      const finalHitTestable = hitTestable(element);
      const pass = rendered(element) && !disabled && finalHitTestable;
      controls[name] = {
        selector,
        present: true,
        rendered: rendered(element),
        disabled,
        initially_hit_testable: initiallyHitTestable,
        deliberate_scroll_into_view: deliberateScrollAction,
        scroll_actions: deliberateScrollAction ? 1 : 0,
        scroll_chain_deltas: scrollDeltas,
        hit_testable: finalHitTestable,
        before_rect: rectData(beforeRect),
        rect: rectData(rect),
        pass,
      };
      for (const entry of scrollChain.reverse()) entry.element.scrollTo(entry.left, entry.top);
      await nextFrame();
    }
    const i5 = { controls, pass: Object.values(controls).every((control) => control.pass) };

    const tapFailures = [];
    let tapFailureCount = 0;
    let interactiveCount = 0;
    let exceptionCount = 0;
    for (const element of document.querySelectorAll(selectors.interactives)) {
      if (!rendered(element)) continue;
      if (Boolean(element.disabled) || element.getAttribute("aria-disabled") === "true") continue;
      interactiveCount += 1;
      const rect = element.getBoundingClientRect();
      const exception = contract.tap_target_exceptions.find((selector) => {
        try { return element.matches(selector); } catch { return false; }
      }) || null;
      if (exception) exceptionCount += 1;
      const minimum = exception
        ? thresholds.exception_tap_target_px
        : thresholds.primary_tap_target_px;
      if (rect.width + 0.5 < minimum || rect.height + 0.5 < minimum) {
        tapFailureCount += 1;
        if (tapFailures.length < 30) {
          tapFailures.push({
            element: elementLabel(element),
            text: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 80),
            rect: rectData(rect),
            exception,
            required_px: minimum,
          });
        }
      }
    }
    const i6 = {
      interactive_count: interactiveCount,
      explicit_exception_count: exceptionCount,
      failure_count: tapFailureCount,
      failures_truncated: tapFailureCount > tapFailures.length,
      failures: tapFailures,
      pass: tapFailureCount === 0,
    };

    const viewportMeta = document.querySelector("meta[name='viewport']")?.getAttribute("content") || "";
    const viewportFitCover = /(?:^|,)\s*viewport-fit\s*=\s*cover\s*(?:,|$)/iu.test(viewportMeta);
    const insets = safeAreaState.requested;
    const safeAreaProbe = document.createElement("div");
    safeAreaProbe.setAttribute("data-mobile-ui-safe-area-probe", "");
    safeAreaProbe.style.cssText = [
      "position:fixed",
      "visibility:hidden",
      "pointer-events:none",
      "padding-top:env(safe-area-inset-top)",
      "padding-right:env(safe-area-inset-right)",
      "padding-bottom:env(safe-area-inset-bottom)",
      "padding-left:env(safe-area-inset-left)",
    ].join(";");
    document.body.appendChild(safeAreaProbe);
    const probeStyle = getComputedStyle(safeAreaProbe);
    const computedInsets = {
      top: Number.parseFloat(probeStyle.paddingTop) || 0,
      right: Number.parseFloat(probeStyle.paddingRight) || 0,
      bottom: Number.parseFloat(probeStyle.paddingBottom) || 0,
      left: Number.parseFloat(probeStyle.paddingLeft) || 0,
    };
    safeAreaProbe.remove();
    const envValuesMatch = Object.entries(insets)
      .every(([edge, value]) => Math.abs(computedInsets[edge] - value) <= 0.5);
    const safeAreaSnapshot = (label) => {
      const intersections = [];
      let count = 0;
      for (const element of document.querySelectorAll(selectors.interactives)) {
        if (!rendered(element)) continue;
        if (Boolean(element.disabled) || element.getAttribute("aria-disabled") === "true") continue;
        const rawRect = element.getBoundingClientRect();
        const rect = visibleHitRect(element);
        if (!rect || !visibleHitWithin(element, rect)) continue;
        const edges = [];
        const edgeClips = [];
        const considerEdge = (edge, clip) => {
          const overlap = intersectRect(rect, clip);
          if (!overlap || !visibleHitWithin(element, overlap)) return;
          edges.push(edge);
          edgeClips.push({ edge, overlap: rectData(overlap) });
        };
        if (insets.top > 0) considerEdge("top", {
          left: 0, top: 0, right: innerWidth, bottom: insets.top,
        });
        if (insets.right > 0) considerEdge("right", {
          left: innerWidth - insets.right, top: 0, right: innerWidth, bottom: innerHeight,
        });
        if (insets.bottom > 0) considerEdge("bottom", {
          left: 0, top: innerHeight - insets.bottom, right: innerWidth, bottom: innerHeight,
        });
        if (insets.left > 0) considerEdge("left", {
          left: 0, top: 0, right: insets.left, bottom: innerHeight,
        });
        if (!edges.length) continue;
        count += 1;
        if (intersections.length < 20) {
          intersections.push({
            element: elementLabel(element),
            edges,
            raw_rect: rectData(rawRect),
            visible_hit_rect: rectData(rect),
            safe_area_overlaps: edgeClips,
          });
        }
      }
      return { label, count, intersections, truncated: count > intersections.length };
    };
    const safeAreaSamples = [safeAreaSnapshot("initial")];
    if (controlsAnchor) {
      controlsAnchor.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      await nextFrame();
      await nextFrame();
      safeAreaSamples.push(safeAreaSnapshot("controls"));
    }
    for (const state of stickyScrollState) state.element.scrollTo(state.left, state.top);
    await nextFrame();
    if (tableAnchor) {
      tableAnchor.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
      await nextFrame();
      await nextFrame();
      safeAreaSamples.push(safeAreaSnapshot("table"));
    }
    for (const state of stickyScrollState) state.element.scrollTo(state.left, state.top);
    await nextFrame();
    const safeAreaIntersectionCount = safeAreaSamples.reduce((sum, sample) => sum + sample.count, 0);
    const safeAreaIntersections = safeAreaSamples.flatMap((sample) => sample.intersections).slice(0, 30);
    const i7 = {
      cdp_override_supported: safeAreaState.supported,
      cdp_override_error: safeAreaState.error,
      requested_insets: insets,
      computed_env_insets: computedInsets,
      computed_env_matches_request: envValuesMatch,
      computed_env_matches_requested: envValuesMatch,
      env_match: envValuesMatch,
      viewport_meta: viewportMeta,
      viewport_fit_cover: viewportFitCover,
      intersection_count: safeAreaIntersectionCount,
      intersections_truncated: safeAreaIntersectionCount > safeAreaIntersections.length,
      intersections: safeAreaIntersections,
      samples: safeAreaSamples,
      pass: safeAreaState.supported
        && envValuesMatch
        && viewportFitCover
        && safeAreaIntersectionCount === 0,
    };

    const menu = document.querySelector(selectors.release_menu);
    let i8;
    if (menuExerciseState.opener_visible) {
      i8 = {
        applicable: true,
        selector: selectors.release_menu,
        branch: "overlay-menu",
        ...menuExerciseState,
      };
      i8.pass = Boolean(
        menuExerciseState.exercised
        && !menuExerciseState.open_error
        && menuExerciseState.overlay_open
        && (menuExerciseState.fits_viewport || menuExerciseState.internally_scrollable)
        && menuExerciseState.outside_dismiss
        && menuExerciseState.underlying_scroll_locked
      );
    } else if (!menu || !rendered(menu)) {
      i8 = {
        applicable: true,
        selector: selectors.release_menu,
        branch: "hidden-without-opener",
        reason: menu ? "release menu is hidden and has no visible opener" : "release menu absent",
        ...menuExerciseState,
        pass: false,
      };
    } else {
      const rect = menu.getBoundingClientRect();
      const style = getComputedStyle(menu);
      const fitsViewport = rect.top >= -0.5 && rect.bottom <= innerHeight + 0.5;
      const internallyScrollable = /(auto|scroll)/u.test(style.overflowY)
        && menu.scrollHeight > menu.clientHeight + 1
        && rect.height <= innerHeight + 0.5;
      const overlayOpen = menu.matches(":popover-open")
        || (menu instanceof HTMLDialogElement && menu.open)
        || menu.getAttribute("aria-modal") === "true";
      const opener = document.querySelector(selectors.release_menu_opener);
      i8 = {
        applicable: true,
        selector: selectors.release_menu,
        branch: "persistent-navigation",
        opener_present: Boolean(opener),
        overlay_open: overlayOpen,
        rect: rectData(rect),
        viewport_height: innerHeight,
        scroll_height: menu.scrollHeight,
        client_height: menu.clientHeight,
        overflow_y: style.overflowY,
        fits_viewport: fitsViewport,
        internally_scrollable: internallyScrollable,
        outside_dismiss: overlayOpen ? false : null,
        underlying_scroll_locked: overlayOpen ? getComputedStyle(document.body).overflowY === "hidden" : null,
      };
      i8.pass = !overlayOpen && (fitsViewport || internallyScrollable);
    }

    let i10 = { applicable: cellSpec.orientation === "landscape", pass: null };
    if (i10.applicable) {
      const wrap = document.querySelector(selectors.table_wrap);
      const table = document.querySelector(selectors.table);
      const rows = [...document.querySelectorAll(selectors.table_rows)];
      if (!wrap || !table || rows.length === 0) {
        i10 = { applicable: true, present: false, pass: false };
      } else {
        const scrollOwners = [];
        for (let ancestor = wrap.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (/(auto|scroll)/u.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1) {
            scrollOwners.push({ element: ancestor, top: ancestor.scrollTop, left: ancestor.scrollLeft });
          }
        }
        scrollOwners.push({ element: root, top: root.scrollTop, left: root.scrollLeft });
        wrap.scrollIntoView({ block: "start", inline: "nearest" });
        await nextFrame();
        await nextFrame();
        const wrapRect = wrap.getBoundingClientRect();
        const paneTop = Math.max(0, wrapRect.top);
        const paneBottom = Math.min(innerHeight, wrapRect.bottom);
        const visibleRows = rows.filter((row) => {
          const rect = row.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(rect.bottom, paneBottom) - Math.max(rect.top, paneTop));
          return rect.height > 0 && visibleHeight >= rect.height * 0.5;
        });
        const originalLeft = wrap.scrollLeft;
        const maximumLeft = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
        wrap.scrollLeft = maximumLeft;
        await nextFrame();
        await nextFrame();
        const reachedFinalPosition = Math.abs(wrap.scrollLeft - maximumLeft) <= 1;
        const finalCells = visibleRows.map((row) => row.lastElementChild).filter(Boolean);
        const finalColumnVisible = finalCells.some((cellElement) => {
          const rect = cellElement.getBoundingClientRect();
          const currentWrap = wrap.getBoundingClientRect();
          return rect.left >= currentWrap.left - 1 && rect.right <= currentWrap.right + 1;
        });
        i10 = {
          applicable: true,
          present: true,
          wrap_rect: rectData(wrapRect),
          pane_top: Number(paneTop.toFixed(2)),
          pane_bottom: Number(paneBottom.toFixed(2)),
          visible_row_count: visibleRows.length,
          minimum_visible_rows: thresholds.minimum_visible_table_rows,
          client_width: wrap.clientWidth,
          scroll_width: wrap.scrollWidth,
          maximum_scroll_left: maximumLeft,
          reached_scroll_left: wrap.scrollLeft,
          reached_final_position: reachedFinalPosition,
          final_column_visible: finalColumnVisible,
          pass: visibleRows.length >= thresholds.minimum_visible_table_rows
            && maximumLeft > 0
            && reachedFinalPosition
            && finalColumnVisible,
        };
        wrap.scrollLeft = originalLeft;
        for (const owner of scrollOwners) owner.element.scrollTo(owner.left, owner.top);
        await nextFrame();
      }
    }

    const bodyCopies = [...document.querySelectorAll(selectors.body_copy)].filter((element) => cssVisible(element));
    const allCopyFonts = bodyCopies.map((element) => ({
      element: elementLabel(element),
      font_size_px: Number.parseFloat(getComputedStyle(element).fontSize),
    }));
    const clippedText = [];
    for (const element of document.querySelectorAll("body *")) {
      const directText = [...element.childNodes]
        .some((node) => node.nodeType === Node.TEXT_NODE && /\S/u.test(node.textContent || ""));
      if (!directText) continue;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      if (typeof element.checkVisibility === "function"
        && !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const rect = element.getBoundingClientRect();
      if ((rect.height <= 0 || element.getClientRects().length === 0) && clippedText.length < 20) {
        clippedText.push({
          element: elementLabel(element),
          text: (element.textContent || "").trim().slice(0, 80),
          rect: rectData(rect),
        });
      }
    }
    const htmlStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const textSizeAdjust = htmlStyle.webkitTextSizeAdjust || bodyStyle.webkitTextSizeAdjust || "";
    const numericTextAdjust = Number.parseFloat(textSizeAdjust);
    const explicitTextAdjust = textSizeAdjust !== "auto"
      && textSizeAdjust !== "none"
      && Number.isFinite(numericTextAdjust)
      && numericTextAdjust >= 100;
    const minimumCopyFont = allCopyFonts.length
      ? Math.min(...allCopyFonts.map(({ font_size_px: size }) => size))
      : null;
    const copyFonts = allCopyFonts
      .map((record, index) => ({ ...record, index }))
      .sort((left, right) => left.font_size_px - right.font_size_px || left.index - right.index)
      .slice(0, 50);
    const i11 = {
      body_copy_selector: selectors.body_copy,
      copy_font_count: allCopyFonts.length,
      copy_fonts: copyFonts,
      copy_fonts_truncated: allCopyFonts.length > copyFonts.length,
      minimum_copy_font_px: minimumCopyFont,
      required_minimum_px: thresholds.minimum_body_copy_px,
      webkit_text_size_adjust: textSizeAdjust,
      text_size_adjust_explicit: explicitTextAdjust,
      clipped_text_count: clippedText.length,
      clipped_text: clippedText,
      pass: minimumCopyFont !== null
        && minimumCopyFont >= thresholds.minimum_body_copy_px
        && explicitTextAdjust
        && clippedText.length === 0,
    };

    return { I1: i1, I2: i2, I3: i3, I4: i4, I5: i5, I6: i6, I7: i7, I8: i8, I10: i10, I11: i11 };
  }, {
    contract: CONTRACT,
    cellSpec: cell,
    safeAreaState: safeArea,
    menuExerciseState: menuExercise,
  });
}

function staticInvariantResults(measurements, cell) {
  return CONTRACT.invariants
    .filter(({ id }) => id !== "I12")
    .map((descriptor) => {
      if (descriptor.id === "I9") {
        return invariantResult("I9", false, null, { reason: "rotation-only invariant" });
      }
      const measurement = measurements[descriptor.id];
      if (!measurement) throw new Error(`Verifier omitted ${descriptor.id}`);
      const landscapeOnly = descriptor.id === "I10";
      const applicable = descriptor.id === "I8"
        ? measurement.applicable
        : (!landscapeOnly || cell.orientation === "landscape");
      return invariantResult(descriptor.id, applicable, measurement.pass, measurement);
    });
}

async function detachedDomSnapshot(cdp) {
  try {
    const result = await cdp.send("DOM.getDetachedDomNodes");
    const retainedIds = result.detachedNodes.flatMap((entry) => entry.retainedNodeIds || []);
    return {
      supported: true,
      detached_tree_count: result.detachedNodes.length,
      retained_node_count: retainedIds.length,
      detached_total: result.detachedNodes.length + retainedIds.length,
      retained_node_ids: retainedIds.slice(0, 50),
      retained_ids_truncated: retainedIds.length > 50,
      tree_backend_node_ids: result.detachedNodes
        .map((entry) => entry.treeNode?.backendNodeId)
        .filter(Number.isFinite)
        .slice(0, 50),
      error: null,
    };
  } catch (error) {
    return {
      supported: false,
      detached_tree_count: null,
      retained_node_count: null,
      detached_total: null,
      retained_node_ids: [],
      retained_ids_truncated: false,
      tree_backend_node_ids: [],
      error: serialiseError(error),
    };
  }
}

async function nodeSnapshot(page, cdp, phase) {
  await cdp.send("HeapProfiler.collectGarbage");
  const counters = await cdp.send("Memory.getDOMCounters");
  const detached = await detachedDomSnapshot(cdp);
  const pageState = await page.evaluate(() => ({
    connected_elements: document.getElementsByTagName("*").length,
    inner_width: innerWidth,
    inner_height: innerHeight,
    screen_width: screen.width,
    screen_height: screen.height,
    portrait: matchMedia("(orientation: portrait)").matches,
    landscape: matchMedia("(orientation: landscape)").matches,
    screen_orientation_type: screen.orientation?.type || null,
    screen_orientation_angle: screen.orientation?.angle ?? null,
  }));
  return {
    phase,
    ...pageState,
    cdp_documents: counters.documents,
    cdp_nodes: counters.nodes,
    cdp_js_event_listeners: counters.jsEventListeners,
    detached,
  };
}

async function applyRotationViewport(page, cdp, viewport, dpr) {
  const landscape = viewport.orientation === "landscape";
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: dpr,
    mobile: true,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    positionX: 0,
    positionY: 0,
    screenOrientation: {
      type: landscape ? "landscapePrimary" : "portraitPrimary",
      angle: landscape ? 90 : 0,
    },
  });
  await page.waitForFunction(({ width, height, orientation }) => {
    const expectedType = orientation === "landscape" ? "landscape-primary" : "portrait-primary";
    const expectedAngle = orientation === "landscape" ? 90 : 0;
    return (
    innerWidth === width
    && innerHeight === height
    && matchMedia(`(orientation: ${orientation})`).matches
    && screen.width === width
    && screen.height === height
    && screen.orientation?.type === expectedType
    && screen.orientation?.angle === expectedAngle
    );
  }, viewport, { timeout: 5_000 });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

function isStrictlyMonotonicGrowth(values) {
  return values.length > 1 && values.slice(1).every((value, index) => value > values[index]);
}

function rotationMeasurement(snapshots) {
  const initial = snapshots[0];
  const final = snapshots.at(-1);
  const ratio = CONTRACT.thresholds.rotation_node_delta_ratio;
  const floor = CONTRACT.thresholds.rotation_node_delta_floor;
  const connectedTolerance = Math.max(floor, Math.ceil(initial.connected_elements * ratio));
  const cdpTolerance = Math.max(floor, Math.ceil(initial.cdp_nodes * ratio));
  const documentTolerance = Math.max(floor, Math.ceil(initial.cdp_documents * ratio));
  const listenerTolerance = Math.max(floor, Math.ceil(initial.cdp_js_event_listeners * ratio));
  const connectedDelta = final.connected_elements - initial.connected_elements;
  const cdpDelta = final.cdp_nodes - initial.cdp_nodes;
  const documentDelta = final.cdp_documents - initial.cdp_documents;
  const listenerDelta = final.cdp_js_event_listeners - initial.cdp_js_event_listeners;
  const connectedSeries = snapshots.map((snapshot) => snapshot.connected_elements);
  const cdpSeries = snapshots.map((snapshot) => snapshot.cdp_nodes);
  const detachedSupported = snapshots.every((snapshot) => snapshot.detached.supported);
  const detachedSeries = detachedSupported
    ? snapshots.map((snapshot) => snapshot.detached.detached_total)
    : [];
  const detachedInitial = detachedSeries[0] ?? null;
  const detachedFinal = detachedSeries.at(-1) ?? null;
  const detachedTolerance = detachedSupported ? 0 : null;
  const connectedStable = Math.abs(connectedDelta) <= connectedTolerance;
  const cdpStable = Math.abs(cdpDelta) <= cdpTolerance;
  const documentsStable = Math.abs(documentDelta) <= documentTolerance;
  const listenersStable = Math.abs(listenerDelta) <= listenerTolerance;
  const detachedStable = detachedSupported && detachedFinal <= detachedInitial;
  const monotonicGrowth = isStrictlyMonotonicGrowth(connectedSeries)
    || isStrictlyMonotonicGrowth(cdpSeries)
    || (detachedSupported && isStrictlyMonotonicGrowth(detachedSeries));
  return {
    snapshots,
    connected_delta: connectedDelta,
    connected_tolerance: connectedTolerance,
    cdp_node_delta: cdpDelta,
    cdp_node_tolerance: cdpTolerance,
    cdp_document_delta: documentDelta,
    cdp_document_tolerance: documentTolerance,
    cdp_listener_delta: listenerDelta,
    cdp_listener_tolerance: listenerTolerance,
    detached_supported: detachedSupported,
    detached_total_initial: detachedInitial,
    detached_total_final: detachedFinal,
    detached_total_delta: detachedSupported ? detachedFinal - detachedInitial : null,
    detached_tolerance: detachedTolerance,
    connected_stable: connectedStable,
    cdp_nodes_stable: cdpStable,
    cdp_documents_stable: documentsStable,
    cdp_listeners_stable: listenersStable,
    detached_stable: detachedStable,
    monotonic_growth: monotonicGrowth,
    pass: connectedStable
      && cdpStable
      && documentsStable
      && listenersStable
      && detachedSupported
      && detachedStable,
  };
}

async function runStaticCell(browser, target, cell) {
  const context = await browser.newContext({
    viewport: { width: cell.width, height: cell.height },
    screen: { width: cell.width, height: cell.height },
    deviceScaleFactor: cell.dpr,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const cdp = await context.newCDPSession(page);
  const safeArea = await applySafeArea(cdp, cell.id, cell.orientation);
  const capturedAt = new Date().toISOString();
  try {
    const ready = await navigate(page, target);
    const screenshots = await captureScreenshots(page, target.id, cell.id);
    const menuExercise = await exerciseReleaseMenu(page);
    const measurements = await collectStaticMeasurements(page, cell, safeArea, menuExercise);
    return {
      schema: "pipelinenews.mobile-ui-cell-evidence.v1",
      generation: GENERATION,
      source_commit: SOURCE_COMMIT,
      candidate_generation: candidateGeneration,
      mode: MODE,
      target,
      cell,
      availability: "MEASURED",
      captured_at: capturedAt,
      ready,
      diagnostics,
      safe_area_emulation: safeArea,
      screenshots,
      invariants: staticInvariantResults(measurements, cell),
    };
  } finally {
    await context.close();
  }
}

async function runRotateCell(browser, target) {
  const rotate = CONTRACT.rotate_cell;
  const initialViewport = rotate.sequence[0];
  const context = await browser.newContext({
    viewport: { width: initialViewport.width, height: initialViewport.height },
    screen: { width: initialViewport.width, height: initialViewport.height },
    deviceScaleFactor: rotate.dpr,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("Memory.enable").catch(() => {});
  await cdp.send("HeapProfiler.enable");
  const capturedAt = new Date().toISOString();
  try {
    await applyRotationViewport(page, cdp, initialViewport, rotate.dpr);
    const initialSafeArea = await applySafeArea(cdp, "P1", initialViewport.orientation);
    const ready = await navigate(page, target);
    const screenshots = {
      initial: await captureScreenshots(page, target.id, rotate.id, "initial"),
      landscape: null,
      final: null,
    };
    const snapshots = [await nodeSnapshot(page, cdp, "initial-P1")];
    for (let cycle = 1; cycle <= rotate.cycles; cycle += 1) {
      const landscape = rotate.sequence[1];
      await applyRotationViewport(page, cdp, landscape, rotate.dpr);
      await applySafeArea(cdp, "L1", landscape.orientation);
      await page.waitForTimeout(rotate.settle_ms);
      if (cycle === 1) {
        screenshots.landscape = await captureScreenshots(page, target.id, rotate.id, "landscape");
      }
      snapshots.push(await nodeSnapshot(page, cdp, `cycle-${cycle}-L1`));

      const portrait = rotate.sequence[2];
      await applyRotationViewport(page, cdp, portrait, rotate.dpr);
      await applySafeArea(cdp, "P1", portrait.orientation);
      await page.waitForTimeout(rotate.settle_ms);
      snapshots.push(await nodeSnapshot(page, cdp, `cycle-${cycle}-P1`));
    }
    screenshots.final = await captureScreenshots(page, target.id, rotate.id, "final");
    const measurement = rotationMeasurement(snapshots);
    const invariants = CONTRACT.invariants
      .filter(({ id }) => id !== "I12")
      .map((descriptor) => descriptor.id === "I9"
        ? invariantResult("I9", true, measurement.pass, measurement)
        : invariantResult(descriptor.id, false, null, { reason: "not evaluated in rotation cell" }));
    return {
      schema: "pipelinenews.mobile-ui-cell-evidence.v1",
      generation: GENERATION,
      source_commit: SOURCE_COMMIT,
      candidate_generation: candidateGeneration,
      mode: MODE,
      target,
      cell: rotate,
      availability: "MEASURED",
      captured_at: capturedAt,
      ready,
      diagnostics,
      safe_area_emulation: initialSafeArea,
      screenshots,
      invariants,
    };
  } finally {
    await context.close();
  }
}

function unavailableRecord(target, cell, error, rotate = false) {
  return {
    schema: "pipelinenews.mobile-ui-cell-evidence.v1",
    generation: GENERATION,
    source_commit: SOURCE_COMMIT,
    candidate_generation: candidateGeneration,
    mode: MODE,
    target,
    cell,
    availability: "UNAVAILABLE",
    captured_at: new Date().toISOString(),
    ready: null,
    diagnostics: {
      console_errors: [],
      page_errors: [],
      failed_requests: [],
      http_errors: [],
      navigation_error: serialiseError(error),
    },
    safe_area_emulation: null,
    screenshots: null,
    invariants: emptyInvariantResults("target unavailable", rotate),
  };
}

async function saveRecord(record) {
  const filename = `${slug(record.target.id)}--${slug(record.cell.id)}.json`;
  const bytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`, "utf8");
  if (bytes.length > CELL_RECORD_LIMIT_BYTES) {
    throw new Error(`${filename} exceeds the ${CELL_RECORD_LIMIT_BYTES}-byte bounded record budget`);
  }
  await writeFile(path.join(RAW_DIR, filename), bytes);
  recordFiles.push(filename);
}

const browser = await chromium.launch({ headless: true });
let chromiumVersion;
try {
  chromiumVersion = browser.version();
  for (const target of targets) {
    for (const cell of staticCells) {
      if (target.id === "original" && optionalOriginalFailure) {
        await saveRecord(unavailableRecord(target, cell, optionalOriginalFailure));
        continue;
      }
      try {
        await saveRecord(await runStaticCell(browser, target, cell));
      } catch (error) {
        await saveRecord(unavailableRecord(target, cell, error));
        if (target.required) requiredFailures.push({ target: target.id, cell: cell.id, error: serialiseError(error) });
        else optionalOriginalFailure = error;
      }
    }
  }

  if (includeRotate) {
    for (const targetId of CONTRACT.rotate_cell.targets.filter((id) => selectedTargetIds.includes(id))) {
      const target = targets.find(({ id }) => id === targetId);
      if (!target) throw new Error(`Rotation target ${targetId} is absent`);
      try {
        await saveRecord(await runRotateCell(browser, target));
      } catch (error) {
        await saveRecord(unavailableRecord(target, CONTRACT.rotate_cell, error, true));
        if (target.required) requiredFailures.push({ target: target.id, cell: "R1", error: serialiseError(error) });
      }
    }
  }
} finally {
  await browser.close();
}

const executablePath = chromium.executablePath();
const executableSha256 = await sha256File(executablePath);
const run = {
  schema: "pipelinenews.mobile-ui-browser-run.v1",
  generation: GENERATION,
  source_commit: SOURCE_COMMIT,
  candidate_generation: candidateGeneration,
  contract_schema: CONTRACT.schema,
  mode: MODE,
  deployment: "not-authorised",
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  browser: {
    engine: "chromium",
    playwright_version: PLAYWRIGHT_VERSION,
    screenshot_encoder: `sharp-${SHARP_VERSION}`,
    chromium_version: chromiumVersion,
    executable_filename: path.basename(executablePath),
    executable_sha256: executableSha256,
  },
  records: recordFiles,
  expected_record_count: staticCells.length * targets.length
    + (includeRotate ? CONTRACT.rotate_cell.targets.filter((id) => selectedTargetIds.includes(id)).length : 0),
  shard: {
    id: shardId,
    target_ids: selectedTargetIds,
    static_cell_ids: selectedCellIds,
    include_rotate: includeRotate,
  },
  required_failures: requiredFailures,
  optional_original_unavailable: Boolean(optionalOriginalFailure),
  status: requiredFailures.length ? "ERROR" : "CAPTURED",
};
await writeJson(path.join(RAW_DIR, "run.json"), run);

if (run.records.length !== run.expected_record_count) {
  throw new Error(`Evidence record count ${run.records.length} != ${run.expected_record_count}`);
}
if (requiredFailures.length) {
  throw new AggregateError(
    requiredFailures.map(({ target, cell, error }) => new Error(`${target}/${cell}: ${error.message}`)),
    "Required mobile UI targets failed navigation, readiness, or instrument execution",
  );
}

process.stdout.write(`${JSON.stringify({
  schema: run.schema,
  generation: GENERATION,
  mode: MODE,
  records: run.records.length,
  browser: run.browser,
  optional_original_unavailable: run.optional_original_unavailable,
  status: run.status,
}, null, 2)}\n`);
