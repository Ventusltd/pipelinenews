import { createHash } from "node:crypto";

const tracking = /^(utm_.+|fbclid|gclid|mc_.+)$/iu;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function canonicalUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("mention URL must use HTTP(S)");
  if (url.username || url.password) throw new Error("URL credentials are forbidden");
  url.protocol = "https:";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (tracking.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/amp\/?$/iu, "/").replace(/\/{2,}/gu, "/");
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/u, "");
  return url.toString();
}

export function mentionId({ canonical_url, gg_project_id = null, title = "", snippet = "" }) {
  const identity = gg_project_id ?? `ABSTAIN:${sha256(`${title}\n${snippet}`).slice(0, 16)}`;
  return `PN-MENTION-${sha256(`${canonical_url}\n${identity}`).slice(0, 20).toUpperCase()}`;
}

function shingles(value, width = 3) {
  const words = String(value ?? "").normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length <= width) return new Set([words.join(" ")].filter(Boolean));
  return new Set(Array.from({ length: words.length - width + 1 }, (_, index) => words.slice(index, index + width).join(" ")));
}

function hash32(value, seed) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function minHashSignature(value, components = 64) {
  const parts = [...shingles(value)];
  if (!parts.length) return Array(components).fill(0);
  return Array.from({ length: components }, (_, seed) => Math.min(...parts.map((part) => hash32(part, seed + 1))));
}

export function minHashSimilarity(left, right) {
  if (!Array.isArray(left) || left.length !== right.length || !left.length) throw new Error("signatures must have equal non-zero length");
  return left.filter((value, index) => value === right[index]).length / left.length;
}

export function clusterMentions(mentions, threshold = 0.85) {
  if (!Array.isArray(mentions)) throw new Error("mentions must be an array");
  const clusters = [];
  return mentions.map((mention) => {
    const signature = minHashSignature(`${mention.title} ${mention.snippet}`);
    const existing = clusters.find((cluster) => minHashSimilarity(signature, cluster.signature) >= threshold);
    if (existing) return { ...mention, cluster_id: existing.cluster_id };
    const clusterId = `PN-CLUSTER-${sha256(`${mention.title}\n${mention.snippet}`).slice(0, 20).toUpperCase()}`;
    clusters.push({ cluster_id: clusterId, signature });
    return { ...mention, cluster_id: clusterId };
  });
}
