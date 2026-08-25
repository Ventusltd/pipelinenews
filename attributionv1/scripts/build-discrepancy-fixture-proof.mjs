import { open, readFile, rename } from "node:fs/promises";
import { buildDiscrepancyFixtureProof } from "../modules/discrepancy-view.mjs";

const root = new URL("../../", import.meta.url);
const input = JSON.parse(await readFile(new URL("attributionv1/fixtures/discrepancy.v1.json", root)));
const output = `${JSON.stringify(buildDiscrepancyFixtureProof(input), null, 2)}\n`;
const target = new URL("attributionv1/data/discrepancy-fixture-proof.json", root);
const temporary = new URL("attributionv1/data/.discrepancy-fixture-proof.json.tmp", root);
const handle = await open(temporary, "w");
try {
  await handle.writeFile(output);
  await handle.sync();
} finally {
  await handle.close();
}
JSON.parse(await readFile(temporary, "utf8"));
await rename(temporary, target);
