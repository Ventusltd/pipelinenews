import { open, readFile, rename } from "node:fs/promises";
import { buildDiscoveryLedger } from "../modules/discovery-ledger.mjs";

const root = new URL("../../", import.meta.url);
const input = JSON.parse(await readFile(new URL("discoveryv1/fixtures/east-pye-discovery.v1.json", root)));
const output = `${JSON.stringify(buildDiscoveryLedger(input), null, 2)}\n`;
const target = new URL("discoveryv1/data/discovery_mentions.json", root);
const temporary = new URL("discoveryv1/data/.discovery_mentions.json.tmp", root);
const handle = await open(temporary, "w");
try {
  await handle.writeFile(output);
  await handle.sync();
} finally {
  await handle.close();
}
JSON.parse(await readFile(temporary, "utf8"));
await rename(temporary, target);
