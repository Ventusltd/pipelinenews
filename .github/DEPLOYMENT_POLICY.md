# PipelineNews deployment policy

Public staging, GitHub Pages deployment and live verification must run through `.github/workflows/pages.yml` on `main`. It is the only workflow allowed to assemble a public Pages tree, upload a Pages artifact or call the Pages deployment action.

Dedicated GitHub Actions workflows may compile, validate and browser-test immutable candidates without deploying them. Those workflows must mark their candidate manifest `deployment: not-authorised`, keep browser evidence as a normal workflow artifact, and must not stage a public Pages tree, upload a Pages artifact, deploy Pages or change `releases/current.json` (or any other public release pointer).

The Pages staging gate must fail closed on candidate manifests and exclude every release output declared by `build/*-v8-fast-site-manifest.json` unless a separate, valid owner-authorisation record exists at `build/authorisations/<generation>-v8-fast-pages-authorisation.json`. The immutable candidate manifest must remain byte-for-byte unchanged with `deployment: not-authorised`; changing that field is not an authorisation and must fail the gate.

An authorisation record uses schema `pipelinenews.v8.fast-pages-authorisation.v1` and binds the candidate manifest hash, source commit, build run, cache identity and exact output closure to one owner-triggered GitHub Actions run. It authorises only the scope `github-pages-immutable-candidate`. It must explicitly confirm that neither the stable route nor the GlobalGrid catalogue is changed. Candidate authorisation does not itself deploy anything: public staging, deployment and live verification still require an owner-triggered run of `.github/workflows/pages.yml`.

`.github/workflows/authorise-v8-fast-pages.yml` is the bounded owner-authorisation path for generation `202608271524`. It removes the superseded `202608271329` authorisation at the source boundary, then may add only the new immutable authorisation record in a one-parent commit after every candidate and browser gate passes. It may request the separate Pages `workflow_dispatch` run with that exact authorisation commit as the required `expected_sha`; it may not assemble, upload or deploy a Pages artifact itself. Pages must fail if the dispatch commit, the `expected_sha`, the authorisation commit or remote `main` differ.

The `202608271524` release is progressive. Its owner-authorisation permits the production gate to publish the complete hash-bound predecessor chain `202608270055` → `202608270844` → `202608271329` → `202608271524`. A predecessor may enter that chain only when a newer candidate input record exactly matches one of its immutable output records. The gate must reject forward, circular or hash-divergent dependencies. This publishes working timestamp routes without promoting the stable pointer.

For this promotion, `releases/`, `data/` and `archive/` are frozen at the green `202608271524` candidate-output commit. Live verification must hash all nineteen outputs across the four-generation progressive chain, the five declared runtime assets, all sixteen pinned detail partitions and the unchanged stable pointer before browser-proofing the direct candidate route. Duplicate inherited assets must agree byte-for-byte. `releases/current.json` remains unchanged.

Direct publication, manual copying into a Pages branch, local deployment and bypassing failed gates are prohibited.

ChatGPT may design and commit source modules, compilers, tests and non-deploying candidate workflows. It must not perform deployment work outside `.github/workflows/pages.yml`.

Deployment remains owner-triggered through `workflow_dispatch` until the owner explicitly authorises a different trigger.

Every deployment must:

1. pin the exact authorised commit and check the immutable compiler and recorded hashes;
2. reconstruct and validate the complete public closure;
3. browser-test the staged modular release and any authorised direct candidate;
4. upload and deploy the Pages artifact;
5. compare every governed live byte with its committed SHA-256, including candidate runtime dependencies;
6. browser-test the live release and authorised direct candidate;
7. prove the stable pointer is unchanged and preserve existing public release URLs.
