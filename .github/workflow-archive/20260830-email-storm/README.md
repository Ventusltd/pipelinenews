# Retired PipelineNews workflows — 30 August 2026

These timestamped, one-use repair, authorisation and Atlas-successor workflows were archived after they generated duplicate push/schedule runs and misleading failure-email bursts.

They are retained byte-for-byte for audit but are no longer executable by GitHub Actions because they are outside `.github/workflows/`.

The governed Pages route remains:

- `.github/workflows/pages.yml`
- `.github/workflows/202608301214-pages-v2.yml`

Automatic Pages deployment now listens only for immutable release and pointer-output changes. Workflow-source changes require an explicit manual dispatch.
