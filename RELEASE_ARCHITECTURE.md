# PipelineNews release architecture

PipelineNews app releases use immutable Europe/London operator-inception identifiers, not sequential version numbers.

## Release identity

- Canonical form: `YYYYMMDDHHmm-pipelinenews`.
- The 12 digits are the Europe/London year, month, day, hour and minute at operator inception. The manifest stores the full ISO-8601 timestamp and UTC offset so daylight-saving time is explicit.
- `pipelinenews` is the fixed lowercase machine-safe path slug and never changes.
- The visible product title remains `Pipeline News`.
- There can be at most one app release per Europe/London inception minute. A second release waits for its own inception minute; counters and semantic-version suffixes are not appended.
- Corrections create a new release and declare the preceding release as their parent. Earlier manifests and objects are never overwritten.

The first release under the corrected lowercase convention is `202608251700-pipelinenews`, incepted at `2026-08-25T17:00:00+01:00`.

Legacy `newsv1` through `newsv7` paths and the historical uppercase timestamp paths remain frozen and retain their original names. They are not renamed or copied into the corrected convention. Known pre-correction manifest amendments are disclosed in [`CHANGELOG.md`](CHANGELOG.md); they are history, not precedent.

New release-controlled paths and filenames are lowercase. Conventional repository governance files that pre-date or govern releases, including `README.md`, `CHANGELOG.md` and `RELEASE_ARCHITECTURE.md`, retain their established uppercase names.

## Lightweight timestamped app folders, shared assets

Every creation has a visible root folder named exactly for its release ID, for example `202608251750-pipelinenews/`. That folder is a lightweight app shell: `index.html`, `release.json` and `readme.md`. It must not contain copied CSS, JavaScript, data, Parquet or GeoJSON directories.

The browser entry point `/pipelinenews/` may later resolve `releases/current.json` to the selected timestamped folder. Historical app URLs remain directly addressable by their folder name without cloning substantial assets.

Release manifests live at `releases/<release-id>.json`. They pin every admitted object by SHA-256, byte length and role. The release timestamp belongs to the app-shell folder and manifest, not to duplicated CSS, JavaScript, data or GeoJSON folders.

Published objects are shared and content-addressed:

```text
objects/
  css/sha256/<digest>.css
  js/sha256/<digest>.mjs
  data/sha256/<digest>.json
  text/sha256/<digest>.md
  parquet/sha256/<digest>.parquet
  geojson/sha256/<digest>.geojson
```

An unchanged object is reused by every later app folder and manifest. A changed object receives a new digest path; the prior object remains addressable. `releases/current.json` is the only moving release pointer. Git commit history remains the source-control record underneath this release layer.

## Mandatory mission and byte contract

Every timestamp release must extend the uppercase [`CHANGELOG.md`](CHANGELOG.md) and pin a content-addressed snapshot of that exact changelog state. The release manifest must then answer four questions from admitted evidence:

1. How does this capability improve market intelligence for the fastest possible path to net zero?
2. How are the admitted REPD Solar and BESS projects progressing?
3. When are they connecting?
4. How are they connecting?

An absent grid-connection date, voltage, substation, route, bay, queue position or energisation method is `UNKNOWN_NOT_IN_PINNED_EVIDENCE`; planning references, capacity, proximity and headlines cannot fill the gap.

Every manifest also publishes byte counts for the lightweight shell, new content-addressed objects, reused pinned objects, executable proof, its audit report, the manifest itself and the minimum added Pages footprint. Byte accounting is an acceptance gate, not an estimate hidden in commentary.

## Separate identity domains

- App release IDs use the Europe/London inception convention above.
- Source-discovery IDs are deterministic hashes of canonical source URLs.
- Article IDs are minted only after an admissible adapter creates a verified article record; they remain content-derived and non-sequential.
- REPD project IDs, data-centre evidence IDs and event-assertion IDs stay in their existing independent namespaces.

High-recall discovery may admit a URL candidate. It may not, by itself, create an article, claim, project binding, capacity assertion or data-centre identity.

## Publication transition

Timestamped folders are candidate app shells unless their manifests expressly record `publication.live: true`. They do not replace or copy the current public NewsV7 interface. A later timestamped release may switch the stable `/pipelinenews/` loader only after deterministic tests, independent review and browser validation; no frozen release is mutated to do so.
