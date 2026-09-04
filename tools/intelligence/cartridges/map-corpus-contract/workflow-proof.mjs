#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
const workflow = await readFile(resolve(
  repo, ".github/workflows/202609040044-map-corpus-contract.yml"
), "utf8");
const required = [
  "permissions:\n  contents: read",
  "ref: b73247803377233069acfeff415ecad4e8391cb2",
  "persist-credentials: false",
  "python3 tools/intelligence/release_builder.py --check 202609040044-pipelinenews",
  "node tools/intelligence/cartridges/map-corpus-contract/proof.mjs",
  "--gridatlas .receiver/gridatlas",
];
const forbidden = [
  "schedule:", "pages: write", "contents: write", "id-token: write",
  "git push", "pull_request_target:", "actions/create-github-app-token",
];
const failures = [
  ...required.filter((token) => !workflow.includes(token)).map((token) => `missing ${token}`),
  ...forbidden.filter((token) => workflow.includes(token)).map((token) => `forbidden ${token}`),
];
if ((workflow.match(/persist-credentials: false/gu) || []).length !== 2) {
  failures.push("both checkouts must suppress persisted credentials");
}
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL  ${failure}`));
  process.exit(1);
}
console.log("PASS  bounded read-only MAP corpus workflow");
