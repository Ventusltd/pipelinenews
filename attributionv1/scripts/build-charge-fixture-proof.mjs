import { open, readFile, rename } from "node:fs/promises";
import { buildChargeFixtureProof } from "../modules/attribution-ledger.mjs";

const root = new URL("../../", import.meta.url);
const input = JSON.parse(await readFile(new URL("attributionv1/fixtures/charges.v1.json", root)));
const output = `${JSON.stringify(buildChargeFixtureProof(input), null, 2)}\n`;
const target = new URL("attributionv1/data/charge-fixture-proof.json", root);
const temporary = new URL("attributionv1/data/.charge-fixture-proof.json.tmp", root);
const handle = await open(temporary, "w");
try {
  await handle.writeFile(output);
  await handle.sync();
} finally {
  await handle.close();
}
JSON.parse(await readFile(temporary, "utf8"));
await rename(temporary, target);
