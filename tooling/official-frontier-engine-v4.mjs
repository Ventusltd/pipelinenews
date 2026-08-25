import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const PINNED_AUTHORITY_SAFE_ENGINE = Object.freeze({
  role: "authority_safe_frontier_engine",
  path: "objects/js/sha256/60ebe5b31cdb881e61c7275fd3f696b33a4f134c5c0a6e6cd8f1474545156acc.mjs",
  sha256: "60ebe5b31cdb881e61c7275fd3f696b33a4f134c5c0a6e6cd8f1474545156acc",
});

export function resolveOfficialFrontierEngine(manifest) {
  const moduleDescriptors = Array.isArray(manifest.objects?.modules) ? manifest.objects.modules : [];
  return moduleDescriptors.find((item) =>
    item.role === "official_frontier_engine" || item.role === "authority_safe_frontier_engine"
  ) ?? PINNED_AUTHORITY_SAFE_ENGINE;
}

export async function loadOfficialFrontierEngine(manifest, repositoryRoot) {
  const descriptor = resolveOfficialFrontierEngine(manifest);
  const bytes = await readFile(new URL(descriptor.path, repositoryRoot));
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== descriptor.sha256) {
    throw new Error("official_frontier_engine content hash mismatch");
  }
  return {
    descriptor,
    module: await import(new URL(descriptor.path, repositoryRoot)),
  };
}

