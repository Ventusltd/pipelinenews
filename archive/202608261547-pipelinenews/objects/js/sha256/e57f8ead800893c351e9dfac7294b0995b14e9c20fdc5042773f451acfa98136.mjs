const byId = (id) => document.getElementById(id);

async function fetchJson(url) {
  const response = await fetch(url, { cache: "default" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function setLink(element, href, label) {
  element.href = href;
  element.textContent = label;
}

async function start() {
  const folderPointerUrl = new URL("release.json", document.baseURI);
  const folder = await fetchJson(folderPointerUrl);
  const manifestUrl = new URL(folder.manifest, folderPointerUrl);
  const manifest = await fetchJson(manifestUrl);
  if (folder.release_id !== manifest.release_id) throw new Error("Folder and manifest release IDs differ");

  const repositoryRoot = new URL(folder.repository_root, folderPointerUrl);
  const artifactDescriptor = manifest.objects.artifacts.find((row) => row.role === "source_discovery_ledger");
  const artifactUrl = new URL(artifactDescriptor.path, repositoryRoot);
  const ledger = await fetchJson(artifactUrl);
  const candidate = ledger.candidates[0];

  document.title = `${manifest.display_title} — ${manifest.release_id}`;
  byId("appTitle").textContent = manifest.display_title;
  byId("releaseId").textContent = manifest.release_id;
  byId("releaseStatus").textContent = `${manifest.status} · ${manifest.feature}`;
  byId("candidateCount").textContent = ledger.counts.source_candidates;
  byId("articleCount").textContent = ledger.counts.promoted_articles;
  byId("bindingCount").textContent = ledger.counts.project_bindings + ledger.counts.data_centre_bindings;
  byId("discoveryId").textContent = candidate.discovery_id;
  byId("sourceStatus").textContent = `${candidate.discovery_status}; direct-source metadata ${candidate.direct_source_metadata_status.toLowerCase()}`;
  setLink(byId("sourceLink"), candidate.canonical_url, `${candidate.publisher_label}: ${candidate.canonical_url}`);
  setLink(byId("manifestLink"), manifestUrl, "Immutable release manifest");
  setLink(byId("artifactLink"), artifactUrl, "Hash-addressed discovery ledger");
  setLink(byId("fullAppLink"), new URL(folder.ui_parent, folderPointerUrl), "Open the unchanged NewsV7 interface");

  const observations = byId("metadataObservations");
  for (const observation of candidate.metadata_observations) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    setLink(link, observation.observation_url, observation.observed_title);
    item.append(link, document.createTextNode(` — ${observation.evidence_class}; discovery metadata only`));
    observations.append(item);
  }
}

start().catch((error) => {
  byId("loadState").textContent = `Release could not be resolved: ${error.message}`;
  byId("loadState").classList.add("error");
});
