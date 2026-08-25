# PipelineNews release architecture

PipelineNews app releases use immutable UTC inception identifiers, not sequential version numbers.

## Release identity

- Canonical form: `YYYYMMDDHHmm-PipelineNews`.
- The 12 digits are the UTC year, month, day, hour and minute at inception.
- `PipelineNews` is the fixed machine-safe product title and never changes.
- The visible product title remains `Pipeline News`.
- There can be at most one app release per UTC minute. A second release waits for its own inception minute; counters and semantic-version suffixes are not appended.
- Corrections create a new release and declare the preceding release as their parent. Earlier manifests and objects are never overwritten.

The first release under this convention is `202608251528-PipelineNews`, incepted at `2026-08-25T15:28:00Z`.

Legacy `newsv1` through `newsv7` paths remain frozen and retain their historical names. They are not renamed or copied into the new convention.

## Lightweight timestamped app folders, shared assets

Every creation has a visible root folder named exactly for its release ID, for example `202608251528-PipelineNews/`. That folder is a lightweight app shell: `index.html`, `release.json` and a short README. It must not contain copied CSS, JavaScript, data, Parquet or GeoJSON directories.

The browser entry point `/PipelineNews/` may later resolve `releases/current.json` to the selected timestamped folder. Historical app URLs remain directly addressable by their folder name without cloning substantial assets.

Release manifests live at `releases/<release-id>.json`. They pin every admitted object by SHA-256, byte length and role. The release timestamp belongs to the app-shell folder and manifest, not to duplicated CSS, JavaScript, data or GeoJSON folders.

Published objects are shared and content-addressed:

```text
objects/
  css/sha256/<digest>.css
  js/sha256/<digest>.mjs
  data/sha256/<digest>.json
  parquet/sha256/<digest>.parquet
  geojson/sha256/<digest>.geojson
```

An unchanged object is reused by every later app folder and manifest. A changed object receives a new digest path; the prior object remains addressable. `releases/current.json` is the only moving release pointer. Git commit history remains the source-control record underneath this release layer.

## Separate identity domains

- App release IDs use the UTC inception convention above.
- Source-discovery IDs are deterministic hashes of canonical source URLs.
- Article IDs are minted only after an admissible adapter creates a verified article record; they remain content-derived and non-sequential.
- REPD project IDs, data-centre evidence IDs and event-assertion IDs stay in their existing independent namespaces.

High-recall discovery may admit a URL candidate. It may not, by itself, create an article, claim, project binding, capacity assertion or data-centre identity.

## Publication transition

`202608251528-PipelineNews/` is a thin candidate app shell that proves the timestamped-folder, manifest and shared-object model. It presents the governed discovery record but does not replace or copy the current public NewsV7 interface. A later timestamped release may switch the stable `/PipelineNews/` loader after peer review and browser validation; no frozen release is mutated to do so.
