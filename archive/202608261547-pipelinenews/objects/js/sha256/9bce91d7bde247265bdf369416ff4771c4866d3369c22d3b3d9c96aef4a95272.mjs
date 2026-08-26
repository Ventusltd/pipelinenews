const byId = (id) => document.getElementById(id);
const getJson = async (url) => { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status}: ${url}`); return response.json(); };

async function start() {
  const folderUrl = new URL("release.json", document.baseURI);
  const folder = await getJson(folderUrl);
  const manifestUrl = new URL(folder.manifest, folderUrl);
  const manifest = await getJson(manifestUrl);
  const root = new URL(folder.repository_root, folderUrl);
  const contractObject = manifest.objects.artifacts.find((item) => item.role === "official_frontier_contract");
  const contractUrl = new URL(contractObject.path, root);
  const contract = await getJson(contractUrl);

  document.title = `${manifest.display_title} — ${manifest.release_id}`;
  byId("releaseId").textContent = manifest.release_id;
  byId("projects").textContent = contract.spine.total_projects.toLocaleString("en-GB");
  byId("references").textContent = contract.spine.with_planning_reference.toLocaleString("en-GB");
  byId("fallback").textContent = contract.spine.without_planning_reference.toLocaleString("en-GB");
  byId("batch").textContent = contract.scheduler.reference_budget_per_run;
  byId("match").textContent = `${contract.fixture_proof.east_pye_binding.project_name} · ${contract.fixture_proof.east_pye_binding.gg_project_id}`;
  byId("abstention").textContent = `${contract.fixture_proof.duplicate_reference_decision.reason}: ${contract.fixture_proof.duplicate_reference_decision.candidate_repd_refs.join(", ")}`;

  const ladder = byId("ladder");
  for (const source of contract.source_order) {
    const li = document.createElement("li");
    li.textContent = `${source.score}/100 · ${source.source_class}`;
    ladder.append(li);
  }
  byId("manifest").href = manifestUrl;
  byId("contract").href = contractUrl;
  byId("state").textContent = "Full-spine scheduler verified; official adapters bounded and fail-closed; Google discovery retained.";
}

start().catch((error) => {
  byId("state").textContent = `Release failed closed: ${error.message}`;
  byId("state").classList.add("error");
});
