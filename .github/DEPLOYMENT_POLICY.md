# PipelineNews deployment policy

All compilation, validation, staging, browser testing, GitHub Pages deployment and live verification must run through `.github/workflows/pages.yml` on `main`.

Direct publication, manual copying into a Pages branch, local deployment and bypassing failed gates are prohibited.

ChatGPT may design and commit source modules, compilers, tests and workflow changes. It must not perform deployment work outside GitHub Actions.

Deployment remains owner-triggered through `workflow_dispatch` until the owner explicitly authorises a different trigger.

Every deployment must:

1. check the immutable compiler and recorded hashes;
2. reconstruct and validate the complete public closure;
3. browser-test the staged modular release;
4. upload and deploy the Pages artifact;
5. compare the live HTML bytes with the committed release;
6. browser-test the live release;
7. preserve existing public release URLs.
