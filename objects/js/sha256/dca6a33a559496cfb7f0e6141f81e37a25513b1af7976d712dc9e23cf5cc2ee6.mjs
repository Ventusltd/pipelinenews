const byId = (id) => document.getElementById(id);
const fetchJson = async (url) => { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status}: ${url}`); return response.json(); };

async function start() {
  const folderUrl = new URL("release.json", document.baseURI);
  const folder = await fetchJson(folderUrl);
  const manifestUrl = new URL(folder.manifest, folderUrl);
  const manifest = await fetchJson(manifestUrl);
  const root = new URL(folder.repository_root, folderUrl);
  const descriptor = manifest.objects.artifacts.find((row) => row.role === "evidence_credibility_ledger");
  const ledgerUrl = new URL(descriptor.path, root);
  const ledger = await fetchJson(ledgerUrl);
  const event = ledger.event;

  document.title = `${manifest.display_title} — ${manifest.release_id}`;
  byId("releaseId").textContent = manifest.release_id;
  byId("officialCount").textContent = ledger.counts.official_observations;
  byId("newsCount").textContent = ledger.counts.publisher_observations + ledger.counts.discovery_observations;
  byId("matchCount").textContent = ledger.counts.primary_matches;
  byId("headline").textContent = event.headline;
  byId("project").textContent = `${event.binding.project_name} · ${event.binding.gg_project_id} · ${event.binding.official_capacity_mw} MW`;
  byId("status").textContent = event.official_status;
  byId("claim").textContent = `${event.publisher_reported_claim} — publisher-reported, credibility ${event.publisher_claim_credibility_score}/100`;
  const source = byId("source"); source.href = event.direct_outbound_url; source.textContent = `Read at ${event.publisher_label}`;

  const evidenceList = byId("evidence");
  for (const item of ledger.evidence) {
    const li = document.createElement("li");
    const link = document.createElement("a"); link.href = item.canonical_url; link.textContent = item.publisher_label;
    li.append(document.createTextNode(`${item.credibility_score}/100 ${item.credibility_label} · `), link, document.createTextNode(` · ${item.source_ref}`));
    evidenceList.append(li);
  }
  byId("manifest").href = manifestUrl;
  byId("ledger").href = ledgerUrl;
  byId("loadState").textContent = "Evidence ordered by deterministic credibility policy.";
}

start().catch((error) => { byId("loadState").textContent = `Release failed closed: ${error.message}`; byId("loadState").classList.add("error"); });
