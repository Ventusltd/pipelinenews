/** Render and integrity proof for the GB electricity context cartridge. */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
const gen = process.argv[3];
if (!root || !gen) {
  console.error("usage: node proof.mjs <release-directory> <generation>");
  process.exit(2);
}

const releaseRoot = resolve(root);
const payloadPath = join(releaseRoot, "data", `${gen}-price-decade-rollup.json`);
const payloadBytes = await readFile(payloadPath);
const payload = JSON.parse(payloadBytes.toString("utf8"));
const payloadSha = crypto.createHash("sha256").update(payloadBytes).digest("hex");

const created = [];
globalThis.document = {
  createElement(tagName) {
    const element = {
      tagName: String(tagName).toUpperCase(),
      className: "",
      innerHTML: "",
      textContent: "",
      dataset: {},
    };
    created.push(element);
    return element;
  },
};
globalThis.location = new URL("https://globalgrid2050.com/pipelinenews_intelligence/test/");
assert.ok(globalThis.crypto?.subtle || crypto.webcrypto?.subtle,
  "Node must provide Web Crypto for the browser digest parity check");

let fetchCalls = 0;
let responseBytes = payloadBytes;
globalThis.fetch = async () => {
  fetchCalls += 1;
  const body = responseBytes;
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  };
};

const moduleUrl = pathToFileURL(
  join(releaseRoot, "assets", `${gen}-gb-electricity-context.mjs`),
).href;
const cartridge = await import(moduleUrl);
assert.equal(fetchCalls, 0, "import must not request the payload");
assert.equal(cartridge.GB_ELECTRICITY_CONTEXT_CONTRACT.generation, gen);
assert.equal(cartridge.GB_ELECTRICITY_CONTEXT_CONTRACT.project_bindings, 0);

function makeHost() {
  return {
    children: [],
    dataset: {},
    replaceChildren(...children) { this.children = [...children]; },
    appendChild(child) { this.children.push(child); return child; },
  };
}

const host = makeHost();
const result = await cartridge.mountGbElectricityContext({
  host,
  payloadAsset: {
    url: `data/${gen}-price-decade-rollup.json`,
    bytes: payloadBytes.byteLength,
    sha256: payloadSha,
  },
});

assert.equal(fetchCalls, 1, "explicit mount must fetch exactly one snapshot");
assert.equal(result.projectBindings, 0);
assert.equal(result.years, payload.price.by_year.length);
assert.equal(host.children.length, 2, "render must stay inside its supplied host");
const [style, panel] = host.children;
const markup = panel.innerHTML;
assert.equal((markup.match(/<tr>/g) || []).length - 1, payload.price.by_year.length);
assert.match(markup, new RegExp(String(payload.price.days_with_a_negative_settlement_period)));
assert.match(markup, /containing at least one negative settlement period/i);
assert.match(markup, /historic context only/i);
assert.match(markup, /not a forecast/i);
assert.match(markup, /not joined to a project/i);
assert.match(markup, /solar is not in this product/i);
assert.match(markup, /class="gbe-table"/, "table must have its own horizontal overflow wrapper");
const selectors = [...style.textContent.matchAll(/([^{}]+)\{/g)]
  .map(match => match[1].trim())
  .filter(selector => !selector.startsWith("@"));
assert.ok(selectors.every(selector => selector.split(",").every(part =>
  part.trim().startsWith("#gbElectricityHost"))),
  "cartridge CSS selectors must stay under its host");

const completeDays = payload.price.by_year.reduce((sum, row) => sum + row.days, 0);
const negativeDays = payload.price.by_year.reduce((sum, row) =>
  sum + row.days_with_a_negative_settlement_period, 0);
assert.equal(completeDays, payload.derived_from.complete_days);
assert.equal(negativeDays, payload.price.days_with_a_negative_settlement_period);
assert.equal(payload.solar.present, false);

// The byte pin must be substantive rather than decorative.
responseBytes = Buffer.from(payloadBytes);
responseBytes[responseBytes.length - 2] ^= 1;
const diseasedHost = makeHost();
await assert.rejects(() => cartridge.mountGbElectricityContext({
  host: diseasedHost,
  payloadAsset: {
    url: `data/${gen}-price-decade-rollup.json`,
    bytes: responseBytes.byteLength,
    sha256: payloadSha,
  },
}), /digest drift/);

console.log(JSON.stringify({
  schema: "pipelinenews.gb-electricity-context-proof.v1",
  generation: gen,
  checks: "PASS",
  years: result.years,
  complete_days: result.completeDays,
  payload_requests: 1,
  project_bindings: 0,
  tampered_payload: "REJECTED",
}, null, 2));
