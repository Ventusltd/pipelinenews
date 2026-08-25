import { createHash } from "node:crypto";

export const userAgent = "GlobalGrid2050Bot/1.0 (+https://globalgrid2050.com/crawler; open-source; contact@ventusltd.com)";

const endpoints = Object.freeze({
  brave: "https://api.search.brave.com/res/v1/web/search",
  google_cse: "https://customsearch.googleapis.com/customsearch/v1",
  serper: "https://google.serper.dev/search",
});

const restrictedApexDigests = new Set([
  "68c1e55b7e7549913f34030a5f0d49a94613b05469ac21f5eea1e6cb32cd5eb7"
]);

const digest = (value) => createHash("sha256").update(value).digest("hex");
const apex = (hostname) => hostname.toLowerCase().replace(/^www\./u, "").split(".").slice(-2).join(".");

export function isRestrictedHost(hostname) {
  return restrictedApexDigests.has(digest(apex(String(hostname ?? ""))));
}

export function assertAllowedFetchTarget(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("search API requests require HTTPS");
  if (isRestrictedHost(url.hostname)) throw new Error("direct retrieval from restricted source is forbidden");
  const allowed = Object.values(endpoints).map((value) => new URL(value));
  if (!allowed.some((item) => item.hostname === url.hostname && url.pathname.startsWith(item.pathname))) {
    throw new Error("target is not a configured search API endpoint");
  }
  return url;
}

export function buildSearchRequest({ provider, query, credentials = {}, count = 10 }) {
  if (!Object.hasOwn(endpoints, provider)) throw new Error(`unsupported search provider: ${provider}`);
  if (!String(query ?? "").trim()) throw new Error("query is required");
  const limit = Math.max(1, Math.min(Number(count) || 10, 20));
  const url = new URL(endpoints[provider]);
  const headers = { Accept: "application/json", "User-Agent": userAgent };
  let method = "GET";
  let body;

  if (provider === "brave") {
    if (!credentials.apiKey) throw new Error("brave credentials unavailable");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));
    headers["X-Subscription-Token"] = credentials.apiKey;
  } else if (provider === "google_cse") {
    if (!credentials.apiKey || !credentials.engineId) throw new Error("google_cse credentials unavailable");
    url.searchParams.set("key", credentials.apiKey);
    url.searchParams.set("cx", credentials.engineId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(Math.min(limit, 10)));
  } else {
    if (!credentials.apiKey) throw new Error("serper credentials unavailable");
    method = "POST";
    headers["X-API-KEY"] = credentials.apiKey;
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ q: query, num: limit });
  }

  assertAllowedFetchTarget(url);
  return { provider, url: url.toString(), method, headers, body, redirect: "error" };
}

function normaliseResults(provider, payload) {
  const rows = provider === "brave" ? payload?.web?.results : provider === "google_cse" ? payload?.items : payload?.organic;
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    title: String(row.title ?? "").trim(),
    url: String(row.url ?? row.link ?? "").trim(),
    snippet: String(row.description ?? row.snippet ?? "").trim().slice(0, 300),
    published_at: row.page_age ?? row.date ?? null,
  })).filter((row) => row.title && /^https?:\/\//u.test(row.url));
}

export async function executeSearch({ fetchImpl = fetch, provider, query, credentials, count = 10 }) {
  const request = buildSearchRequest({ provider, query, credentials, count });
  const response = await fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: request.redirect,
  });
  if (!response.ok) throw new Error(`${provider} search unavailable: HTTP ${response.status}`);
  return normaliseResults(provider, await response.json());
}

export { endpoints };
