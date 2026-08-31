#!/usr/bin/env node

/** Verify that the shipped UI exposes only the retained, truthful surfaces. */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const releaseId = process.argv[2];
if (!releaseId) {
  console.error("usage: node surface_truth_proof.mjs <release-id>");
  process.exit(2);
}

const root = resolve("releases", releaseId);
const [index, app, sector, proximity] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "assets/202608291447-app.mjs"), "utf8"),
  readFile(resolve(root, "assets/202608312109-sector-intelligence.mjs"), "utf8"),
  readFile(resolve(root, "assets/202608311610-grid-proximity.mjs"), "utf8"),
]);

const checks = [
  ["masthead reports 132 shown and four withheld",
    /132 SHOWN/.test(index) && /4 WITHHELD/.test(index)],
  ["stale 136-headline copy is absent",
    !/136 HEADLINES|136-headline/.test(index + sector)],
  ["Relationship Evidence launcher is absent",
    !/federatedRelationshipOpen|RELATIONSHIP EVIDENCE/.test(index)],
  ["Project Intelligence launcher is absent",
    !/projectIntelOpen|PROJECT INTELLIGENCE/.test(index)],
  ["withdrawn panels are not bound during boot",
    !/^\s*bindFederatedRelationships\(\);\s*$/mu.test(app)
      && !/^\s*bindProjectIntelligence\(\);\s*$/mu.test(app)],
  ["Sector launcher reports one evidenced topic",
    /WAIT · one evidenced topic/.test(app)],
  ["release meta names evidenced sector intelligence",
    /Live News \+ evidenced sector intelligence \+ Atlas V9/.test(app)],
  ["connection-quality verdict is absent",
    !/best-connected|target acquired/i.test(proximity)
      && !/data-band=/i.test(index + app + proximity)],
];

let failures = 0;
for (const [label, pass] of checks) {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}`);
}
console.log(`\n  ${checks.length} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
