import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inputPath = process.argv[2];
const enginePath = process.argv[3];
if (!inputPath || !enginePath) throw new Error("usage: node staging/build-release.mjs INPUT ENGINE");
const input = JSON.parse(await readFile(inputPath, "utf8"));
const { buildEvidenceLedger } = await import(new URL(`../${enginePath}`, import.meta.url));
const bytes = Buffer.from(`${JSON.stringify(buildEvidenceLedger(input), null, 2)}\n`);
const digest = sha256(bytes);
const path = `objects/data/sha256/${digest}.json`;
await mkdir("objects/data/sha256", { recursive: true });
try {
  await writeFile(path, bytes, { flag: "wx" });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  const existing = await readFile(path);
  if (!existing.equals(bytes)) throw new Error(`refusing to overwrite immutable artifact: ${path}`);
}
console.log(JSON.stringify({ path, sha256: digest, bytes: bytes.byteLength }));
