# PipelineNews deployment policy

Public staging, GitHub Pages deployment and live verification must run through `.github/workflows/pages.yml` on `main`. It is the only workflow allowed to assemble a public Pages tree, upload a Pages artifact or call the Pages deployment action.

Dedicated GitHub Actions workflows may compile, validate and browser-test immutable candidates without deploying them. Those workflows must mark their candidate manifest `deployment: not-authorised`, keep browser evidence as a normal workflow artifact, and must not stage a public Pages tree, upload a Pages artifact, deploy Pages or change `releases/current.json` (or any other public release pointer).

The Pages staging gate must fail closed on candidate manifests and exclude every release output declared by `build/*-v8-fast-site-manifest.json` while its deployment state is `not-authorised`. Candidate authorization does not itself deploy anything: public staging, deployment and live verification still require an owner-triggered run of `.github/workflows/pages.yml`.

Direct publication, manual copying into a Pages branch, local deployment and bypassing failed gates are prohibited.

ChatGPT may design and commit source modules, compilers, tests and non-deploying candidate workflows. It must not perform deployment work outside `.github/workflows/pages.yml`.

Deployment remains owner-triggered through `workflow_dispatch` until the owner explicitly authorises a different trigger.

Every deployment must:

1. check the immutable compiler and recorded hashes;
2. reconstruct and validate the complete public closure;
3. browser-test the staged modular release;
4. upload and deploy the Pages artifact;
5. compare the live HTML bytes with the committed release;
6. browser-test the live release;
7. preserve existing public release URLs.
