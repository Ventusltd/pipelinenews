import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const pointerPath = process.argv[2] || "releases/current.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function repoUrl(path) {
  if (typeof path !== "string" || path.startsWith("/") || path.split("/").includes("..")) {
    throw new Error(`unsafe repository path: ${path}`);
  }
  return new URL(path, repositoryRoot);
}

async function json(path) {
  return JSON.parse(await readFile(repoUrl(path), "utf8"));
}

async function verifyObject(object) {
  const bytes = await readFile(repoUrl(object.path));
  if (sha256(bytes) !== object.sha256) throw new Error(`SHA-256 mismatch: ${object.path}`);
  if (bytes.byteLength !== object.bytes) throw new Error(`byte-length mismatch: ${object.path}`);
  return bytes;
}

async function writeImmutable(path, bytes) {
  const target = repoUrl(path);
  try {
    const existing = await readFile(target);
    if (!existing.equals(bytes)) throw new Error(`refusing to overwrite immutable object: ${path}`);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await mkdir(new URL("./", target), { recursive: true });
  const temporary = new URL(`${target.pathname}.tmp-${process.pid}`, target);
  let handle;
  try {
    handle = await open(temporary, "wx");
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, target);
  } catch (error) {
    if (handle) await handle.close();
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

const pointer = await json(pointerPath);
if (pointer.schema !== "pipelinenews.release-pointer.v1") throw new Error("unexpected release pointer schema");
const manifest = await json(pointer.manifest);
if (pointer.release_id !== manifest.release_id) throw new Error("release pointer mismatch");
if (manifest.status !== "CANDIDATE") throw new Error("this builder admits candidate releases only");

const [inputBytes] = await Promise.all([
  verifyObject(manifest.objects.inputs[0]),
  ...manifest.objects.modules.map(verifyObject),
  ...manifest.objects.css.map(verifyObject),
  ...manifest.objects.parquet.map(verifyObject),
  ...manifest.objects.geojson.map(verifyObject),
  ...manifest.app.shell_files.map(verifyObject),
  verifyObject(manifest.build.architecture),
]);

const input = JSON.parse(inputBytes);
const moduleUrl = repoUrl(manifest.objects.modules[0].path);
const { buildDiscoveryLedger } = await import(moduleUrl.href);
const product = buildDiscoveryLedger(input);
const productBytes = Buffer.from(`${JSON.stringify(product, null, 2)}\n`);
const artifact = manifest.objects.artifacts[0];

if (sha256(productBytes) !== artifact.sha256) throw new Error("generated artifact SHA-256 mismatch");
if (productBytes.byteLength !== artifact.bytes) throw new Error("generated artifact byte-length mismatch");
await writeImmutable(artifact.path, productBytes);

console.log(`Built ${manifest.release_id}: ${product.counts.source_candidates} URL candidate; ${product.counts.promoted_articles} promoted articles`);
