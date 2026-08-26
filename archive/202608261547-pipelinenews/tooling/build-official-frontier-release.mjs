import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const [inputPath, enginePath, outputPath] = process.argv.slice(2);
if (!inputPath || !enginePath || !outputPath) throw new Error("usage: node tooling/build-official-frontier-release.mjs <input> <engine> <output>");
const input = JSON.parse(await readFile(inputPath, "utf8"));
const { buildFrontierContract } = await import(new URL(`../${enginePath}`, import.meta.url));
const bytes = Buffer.from(`${JSON.stringify(buildFrontierContract(input), null, 2)}\n`);
const digest = createHash("sha256").update(bytes).digest("hex");
if (!outputPath.includes(digest)) throw new Error(`output path must contain generated SHA-256 ${digest}`);
const target = new URL(`../${outputPath}`, import.meta.url);
try {
  const existing = await readFile(target);
  if (!existing.equals(bytes)) throw new Error(`refusing to overwrite immutable object: ${outputPath}`);
  console.log(`Verified ${input.release_id}: ${digest}`);
  process.exit(0);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(new URL("./", target), { recursive: true });
const temporary = new URL(`${target.pathname}.tmp-${process.pid}`, target);
await writeFile(temporary, bytes, { flag: "wx" });
await rename(temporary, target);
console.log(`Built ${input.release_id}: ${digest}`);
