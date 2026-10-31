# W08 data-centres-gb-producer

Written 2026-10-31T19:40:00Z by worker W08 (Opus). I only read the clones and changed nothing in them.

HEADS: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1

READ:
/home/user/pipelinenews/kuiper-edition/202610311905/BRIEF.md
data-centres-gb: git log (all 13 commits, `git rev-list --count HEAD` = 13), git show --shortstat for every commit, git show 6ca6914, git show 9263635:app.py
data-centres-gb/README.md
data-centres-gb/docs/data-sources.md
data-centres-gb/app.py
data-centres-gb/index.html
data-centres-gb/requirements.txt
data-centres-gb/.gitattributes
data-centres-gb/build/python/202608281053-osm-data-centres.py
data-centres-gb/build/python/202608281626-osm-overpass-retry.py
data-centres-gb/build/python/202608281702-osm-overpass-indexed.py
data-centres-gb/build/python/202608271727-build-data-centres-intelligence.py (skimmed: header, gates)
data-centres-gb/build/python/202608271727-verify-data-centres-intelligence.py (UNVERIFIED: listed only, not read line by line)
data-centres-gb/contracts/202608281053-osm-data-centres.json
data-centres-gb/contracts/202608281626-osm-overpass-retry-privacy.json (grep)
data-centres-gb/contracts/202608281702-osm-overpass-indexed.json
data-centres-gb/contracts/202608281944-data-centre-company-federation-v1.json
data-centres-gb/contracts/202608271727-data-centres-intelligence.json (UNVERIFIED: not opened)
data-centres-gb/manifests/202608281053-osm-data-centres-source.json
data-centres-gb/manifests/202608271727-data-centres-intelligence-source.json (UNVERIFIED: not opened)
data-centres-gb/queries/202608281053-gb-data-centres.overpassql
data-centres-gb/queries/202608281702-gb-data-centres-indexed.overpassql
data-centres-gb/tests/test_202608281053_osm_data_centres.py
data-centres-gb/tests/test_202608281626_osm_overpass_retry.py
data-centres-gb/tests/test_202608281702_osm_overpass_indexed.py
data-centres-gb/tests/test_202608271727_data_centres_intelligence.py (UNVERIFIED: not opened)
data-centres-gb/evidence/202608281053-bbc-data-centres-news-link.json
data-centres-gb/data/source-fixtures/202608281053-overpass-fixture.json (first 40 lines)
data-centres-gb/data/source-fixtures/202608271727-repository-context.json (first 30 lines)
data-centres-gb/.github/workflows/202608281702-osm-data-centres-candidate.yml
data-centres-gb/.github/workflows/ci.yml
data-grid-gb/datacentres/README.md, NOTICE, sources.json, lanes/lanes.json, fetchers/osm_datacentres.py
data-grid-gb/datacentres/lanes/dc-a4-osm-wikidata/dc_a4.py, out/counts.json
data-grid-gb/datacentres/lanes/dc-a7-merge/dcmerge.py (selected functions), out/uk_datacentre_pipeline.geojson (counted only)
data-grid-gb/docs/METHODS.md (lines 1-5, 104-140)

Note on the repository: the producer has no committed data outputs on `main`. The Parquet, GeoJSON
and audit files are pushed by the workflow to `candidate/202608281053-osm-data-centres`, a branch
that is not in the local clone. Their sizes and hashes below come from the frozen federation contract
(F5), not from bytes I read.

## Findings (keyed)

### F1 One fail-closed gate rejects a partial, remarked, empty, unbounded or unprovenanced Overpass payload
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:316-325
QUOTE:
```python
    payload = envelope.get("payload")
    if not isinstance(payload, dict) or payload.get("remark"):
        raise RuntimeError("Overpass payload is partial, invalid or contains a remark")
    elements = payload.get("elements")
    if not isinstance(elements, list) or not elements or len(elements) > 100000:
        raise RuntimeError("Overpass element set must be non-empty and bounded")
    osm3s = payload.get("osm3s")
    if not isinstance(osm3s, dict):
        raise RuntimeError("Overpass osm3s provenance is missing")
    osm_base = parse_utc(osm3s.get("timestamp_osm_base"), "timestamp_osm_base")
```
WHY: Overpass returns HTTP 200 even when a query times out. It then signals the failure only through a
`remark` field and a truncated element list. Here a remark is a hard failure, so the producer refuses
an incomplete answer and cannot ship a shrunken one. It also requires a non-empty element set with a
100,000-element ceiling, and it requires the OSM base timestamp, so every row knows how old the map
data was. `tests/test_202608281053_osm_data_centres.py:84-105` feeds in each of these hostile cases:
empty, `"runtime error: query timed out"`, a wrong endpoint (`https://www.datacentermap.com/api`) and
a duplicate.
PATTERN: Treat a 200 with a remark as a failure (fail closed on a soft error)

### F2 Duplicate, untagged and off-law elements each abort the whole build
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:389-398
QUOTE:
```python
        key = (osm_type, osm_id)
        if key in seen:
            raise RuntimeError(f"Duplicate OSM element in response: {key!r}")
        seen.add(key)
        tags = raw.get("tags")
        if not isinstance(tags, dict) or not tags:
            raise RuntimeError("Matched OSM element has no tags")
        matches = matching_rules(tags)
        if not matches:
            raise RuntimeError(f"Element {key!r} does not satisfy the declared query law")
```
WHY: Every returned element is checked again in Python against the same tag law as the query, using
`DATA_CENTRE_VALUE = re.compile(r"^data_cent(?:er|re)$")` at line 50. An element that the query did
not ask for cannot slip in. It is a refusal, not a filter: one bad element stops the generation, so it
is never quietly dropped. The key is type-scoped (`node`/`way`/`relation` plus id), so the identity
law matches the record ID `DCGB-OSM-<TYPE>-<ID>` at line 411.
PATTERN: Re-check the query law on the response (the query and the validator share one law)

### F3 Compile twice from one retained response, then demand byte identity
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 .github/workflows/202608281702-osm-data-centres-candidate.yml:150-160
QUOTE:
```yaml
          set -euo pipefail
          python build/python/202608281702-osm-overpass-indexed.py build \
            --root . \
            --input "${RUNNER_TEMP}/overpass-fetch.json" \
            --output-root "${RUNNER_TEMP}/candidate-a" \
            --source-commit "${GITHUB_SHA}"
          python build/python/202608281702-osm-overpass-indexed.py build \
            --root . \
            --input "${RUNNER_TEMP}/overpass-fetch.json" \
            --output-root "${RUNNER_TEMP}/candidate-b" \
            --source-commit "${GITHUB_SHA}"
```
WHY: Two separate builds, A and B, start from the same retained bytes. The `compare` step (lines
176-178) then refuses unless all four outputs are byte-identical. This proves the build is a pure
function of the input bytes and the source commit, so it is not just "probably reproducible".
PATTERN: Double-compile parity

### F4 The byte-parity comparator plus the DuckDB settings that make it pass
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:763-772
QUOTE:
```python
def compare(left: Path, right: Path) -> dict[str, Any]:
    receipts = []
    for rel in OUTPUTS:
        left_path, right_path = left / rel, right / rel
        if not left_path.is_file() or not right_path.is_file():
            raise RuntimeError(f"Comparison output missing: {rel}")
        if left_path.read_bytes() != right_path.read_bytes():
            raise RuntimeError(f"Independent builds differ: {rel}")
        receipts.append({"path": rel.as_posix(), "sha256": sha256_file(left_path)})
    return {"status": "PASS", "generation": GENERATION, "byte_identical": receipts}
```
Supporting lines in the same file. Line 580 has `connection.execute("SET threads = 1")`. Lines 500-503
have `COPY (SELECT * FROM "{table}" ORDER BY {order_by}) TO '...' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 122880)`.
Lines 147-150 refuse any DuckDB other than `1.3.2` (`"DuckDB version drift: expected ..."`). Lines
685-692 refuse any Parquet compression codec other than `{"ZSTD"}`.
WHY: Single-threaded writes, an explicit ORDER BY, a fixed row-group size, a pinned engine version and
a codec check together are the recipe for deterministic Parquet. The comparator is plain and total:
it compares raw bytes, not a hash of a re-read. The test suite runs the same proof offline
(`tests/test_202608281053_osm_data_centres.py:63-74`).
PATTERN: Deterministic columnar build (pin engine, one thread, ordered COPY, codec gate)

### F5 Every company relationship is an ABSTAIN slot, never an assertion
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:464-475
QUOTE:
```python
                    raw_name,
                    role,
                    "UNRESOLVED",
                    None,
                    "NOT_SCORED",
                    "ABSTAIN",
                    "OSM_SOURCE_STRING_ONLY" if raw_name else "NO_SOURCE_PARTY",
                    "COMPANY_NUMBER_NOT_VERIFIED" if raw_name else "SOURCE_PARTY_MISSING",
                    source_url,
                    ATTRIBUTION,
                    LICENCE,
                    False,
```
Frozen result:
data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 contracts/202608281944-data-centre-company-federation-v1.json:110-121
```json
    "adjudication_decision": {
      "ABSTAIN": 612
    },
    "evidence_status": {
      "SOURCE_PARTY_WITHHELD_PRIVACY": 612
    },
    "abstention_reason": {
      "VERIFIED_COMPANY_NUMBER_REQUIRED": 612
    },
    "eligible_for_join": {
      "false": 612
    }
```
WHY: Each OSM element gets two slots, OPERATOR and OWNER. Each slot has `company_number`,
`data_centre_id` and `match_score` null, `score_method=NOT_SCORED`, `ABSTAIN`, and the last field,
`eligible_for_join`, set to `False`. The federation contract freezes the green run: 306 element rows
and 612 relationship rows (lines 26-27), all abstaining. It also writes down
`"llm_may_establish_binding": false` and `"absence_rule": "Absence of a source element or relationship slot is not evidence that a facility or relationship does not exist."`
(lines 130-131). This is the estate's clearest refusal to turn a name string into an ownership fact.
PATTERN: Abstention ledger (the slot is not a claim; joins need a verified external key)

### F6 The API returns 404 rather than fetching a source from a request handler
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 app.py:62-67
QUOTE:
```python
    if generation is None:
        if not exports:
            raise HTTPException(
                status_code=404,
                detail="No OSM data-centre export is installed; this API never fetches a source on demand",
            )
```
WHY: The 2026-07-29 version of this file (see History, commit 9263635) scraped Data Center Map live
from the request handler. The current version only reads exports that were deliberately installed.
It rejects symlinks (line 53: `if GENERATION.fullmatch(generation) and path.is_file() and not path.is_symlink():`) and checks each
export's licence and attribution envelope before serving it (lines 78-86). It publishes
`"request_handler_fetches": 0` for every source (lines 23, 28, 34) and
`{"sources": SOURCE_POLICY, "network_requests_from_api": 0}` (line 109). A request cannot cause a
network call, so no request can scrape, hammer or launder a source.
PATTERN: Serve only what has landed (no fetch on read)

### F7 Data Center Map is excluded on licence grounds, and the exclusion is checked by code
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 docs/data-sources.md:26
QUOTE:
```markdown
Data Center Map is excluded from ingestion. Its [Terms of Use](https://www.datacentermap.com/legal/terms/) prohibit scraping, crawling, caching, programmatic retrieval and copying records into an external database. Its licensed exports are not open redistribution rights. It may be opened by a person as a market reference, but contributes zero rows, coordinates, names, addresses, IDs or validation facts to this dataset unless explicit open redistribution permission is obtained.
```
Enforced in code:
data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:225-226
```python
        or manifest.get("excluded_sources", {}).get("datacentermap", {}).get("network_requests") != 0
        or manifest.get("visual_validation", {}).get("openinframap", {}).get("network_requests") != 0
```
WHY: The opening law at docs/data-sources.md:3 reads "Open code does not make third-party content open
data." The exclusion is not only prose. The manifest
(`manifests/202608281053-osm-data-centres-source.json:53-61`) carries `"network_requests": 0` and
`"rows_copied": 0`. `doctor()` refuses if either drifts. The audit writes
`"datacentermap_ingestion": "PROHIBITED"` (build line 627), and `verify()` re-checks
`datacentermap_requests != 0` (line 707). OpenInfraMap is excluded for a different reason: it is an
OSM renderer, so it would be the same evidence counted twice (docs line 22).
PATTERN: Rights gate as a manifest invariant (count of zero, checked by doctor and verify)

### F8 Exactly one declared, hashed query, posted with bounded attempts and no rotation
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:255-266
QUOTE:
```python
    for delay in (0, 30, 60):
        if delay:
            time.sleep(delay)
        attempts += 1
        try:
            candidate = requests.post(
                ENDPOINT,
                data={"data": query},
                headers=headers,
                timeout=(20, 150),
            )
            if candidate.status_code in {406, 429} or 500 <= candidate.status_code < 600:
```
Manifest declaration: `manifests/202608281053-osm-data-centres-source.json:27-30`:
`"scheduled_successful_requests": 1,` `"parallel_requests": 0,` `"endpoint_rotation": false,` `"bounded_attempts": 3,`.
WHY: The query is a committed file. Its SHA-256 is pinned in the manifest (`"query_sha256": "b36fbfe1..."`,
line 25), re-hashed by `doctor()` (line 224), and stamped into every element row (`query_sha256`
column). There is one endpoint, one POST body, at most three attempts and exactly one success. Each
row can be traced back to one byte-exact question. Note that README.md:11 says "posts one declared UK
query". In code that means one *successful* POST of one declared query after up to three attempts,
not literally one network call.
PATTERN: Pinned query (hash-stamped rows, bounded retry, no fan-out)

### F9 The successor query law: regex scans banned, 42 exact indexed selectors required
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281702-osm-overpass-indexed.py:83-92
QUOTE:
```python
    if (
        '["telecom"~' in query
        or '["building"~' in query
        or '["industrial"~' in query
        or '[~"' in query
        or "out meta geom" in query
        or query.count("nwr(area.gb)") != 42
        or "out meta center qt;" not in query
    ):
        raise RuntimeError("Indexed Overpass query law drifted")
```
WHY: The first query (`queries/202608281053-gb-data-centres.overpassql:4-9`) used regex value matches
and regex *key* matches (`[~"^(proposed|...):telecom$"~...]`), which Overpass cannot answer from its
index. It timed out in production. The successor writes out all 42 combinations (7 prefixes x 3 keys
x 2 spellings; `grep -c 'nwr(area.gb)'` on the query = 42). `out meta center` replaces `out meta geom`.
Then `doctor()` refuses the build if anyone reintroduces a regex. The test at
`tests/test_202608281702_osm_overpass_indexed.py:30-36` rebuilds the expected 42-line set from
`LIFECYCLES x FEATURE_KEYS x values` and asserts set equality.
PATTERN: Query-shape law (forbid the slow form by string gate; derive the expected set from constants)

### F10 Contributor username, UID and changeset are never read, banned from the schema, and tested with a sentinel
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:749-752
QUOTE:
```python
    banned = {"user", "uid", "changeset"}
    element_names = {name for name, _type_name, _required in ELEMENT_SCHEMA}
    if banned & element_names:
        raise RuntimeError("Contributor identifiers leaked into element schema")
```
Hostile test: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 tests/test_202608281626_osm_overpass_retry.py:169-173
```python
        sentinel = "PRIVATE-SENTINEL private@example.invalid"
        for element in envelope["payload"]["elements"]:
            element["user"] = sentinel
            element["uid"] = 999999
            element["changeset"] = 888888
```
WHY: `out meta` makes Overpass return `user`, `uid` and `changeset`, and the fixture has them on
purpose (fixture lines 23-25). `normalise()` builds each row from a fixed list of fields (lines
418-454) and never reads them, so they are dropped at the first touch. Contributor identity also
cannot enter through `tags_json`, because the test at
`tests/test_202608281053_osm_data_centres.py:54-61` checks both the schema and the tags. The 1626
successor tightens this further: it nulls all seven `*_raw` name/operator/owner/ref/wikidata/UPRN
columns and allows only data-centre tag keys in `tags_json`
(`build/python/202608281626-osm-overpass-retry.py:111-122`). The sentinel test then reads the Parquet
back through DuckDB and checks that the string is absent from every output (lines 229-247).
PATTERN: Allow-list projection plus a sentinel test (privacy proven on read-back, not assumed)

### F11 The landing guard: the working tree may differ from the commit in exactly four paths
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 .github/workflows/202608281702-osm-data-centres-candidate.yml:198-206
QUOTE:
```yaml
          expected=(
            "data/facilities/generation=202608281053/source=OPENSTREETMAP/osm-data-centre-elements-v1.parquet"
            "data/relationships/generation=202608281053/data-centre-company-relationships-v1.parquet"
            "exports/202608281053-osm-data-centres.geojson"
            "reports/202608281053-osm-data-centres-audit.json"
          )
          mapfile -t expected_sorted < <(printf '%s\n' "${expected[@]}" | sort)
          mapfile -t actual < <(git status --porcelain=v1 --untracked-files=all | cut -c4- | sort)
          diff -u <(printf '%s\n' "${expected_sorted[@]}") <(printf '%s\n' "${actual[@]}")
```
WHY: This step caught real contamination. Run 33188465561 passed fetch, double-compile and parity,
then failed here because Python `__pycache__` appeared in the tree. The workflow itself records this:
the expected-failed step at lines 90-94 is `"Assert immutable output-only boundary"`. The fix was
`PYTHONDONTWRITEBYTECODE: "1"` (line 24), not a weaker guard. Lines 228-231 also pin
`GIT_AUTHOR_DATE="2026-08-28T09:53:00Z"` and push only to `candidate/...`, never `main`.
PATTERN: Exact output closure (diff of git status against a declared list)

### F12 Each repair proves which failed run it repairs, via the GitHub API, before it runs
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 .github/workflows/202608281702-osm-data-centres-candidate.yml:85-94
QUOTE:
```python
          assert run["id"] == int(os.environ["FAILED_RUN_ID"])
          assert run["head_sha"] == os.environ["PARENT_COMMIT"]
          assert run["conclusion"] == "failure"
          assert job["id"] == int(os.environ["FAILED_JOB_ID"])
          assert job["conclusion"] == "failure"
          failed = [
              step for step in job["steps"]
              if step["name"] == "Assert immutable output-only boundary"
          ]
          assert len(failed) == 1 and failed[0]["conclusion"] == "failure"
```
WHY: A successor must name the failed run and job it repairs, and that run must sit on the direct
parent commit (lines 57-59: `test "${#ancestry[@]}" -eq 2`, `test "${ancestry[1]}" = "${PARENT_COMMIT}"`).
The diff from the parent must be exactly the declared set (lines 60-63). Base files are pinned by git
blob SHA (lines 66-73). The repair contracts carry the same chain:
`contracts/202608281626-osm-overpass-retry-privacy.json:5-7` (`"failed_run_id": 33161947627`,
`"failed_step": "Fetch OpenStreetMap once through Overpass"`) and
`contracts/202608281702-osm-overpass-indexed.json:4-7` (run 33186567222, artifact digest
`sha256:3fc0117f...`). Failures become keyed, linked evidence.
PATTERN: Repair-of-record (successor binds to the failed run, parent commit and blob pins)

### F13 Successors wrap the pinned base by import and do not edit it
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281626-osm-overpass-retry.py:26-37
QUOTE:
```python
def load_base():
    spec = importlib.util.spec_from_file_location("osm_data_centres_202608281053", BASE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load pinned base producer: {BASE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE = load_base()
ORIGINAL_DOCTOR = BASE.doctor
ORIGINAL_NORMALISE = BASE.normalise
```
WHY: The 202608281053 producer is never edited after its commit. Fixes are new timestamped files that
load it and replace single functions (`main()` at lines 439-445 rebinds `BASE.fetch`,
`BASE.normalise` and others). `doctor()` pins the base files by blob SHA in the repair contract
(lines 78-85, e.g. `"producer": "ef33bd6e8ce1563f51dcef5df4c56bf520aab02c"`). The 1702 indexed
successor stacks on the 1626 retry in the same way. History grows by appending; a past generation
is never rewritten.
PATTERN: Append-only successor (timestamped wrapper with base pinned by blob)

### F14 The browser GeoJSON must be the exact DuckDB read-back of the Parquet
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:735-740
QUOTE:
```python
        columns, rows = read_rows(connection, root / ELEMENTS_REL)
        expected_geojson = geojson_from_rows(columns, rows)
    finally:
        connection.close()
    if load_json(root / GEOJSON_REL) != expected_geojson:
        raise RuntimeError("GeoJSON is not the exact DuckDB readback projection")
```
WHY: The map export cannot drift from the table. It is regenerated from what DuckDB reads back out of
the landed Parquet, never from Python memory, and compared. Lines 731-734 also re-normalise the raw
input on their own and require the Parquet rows to match exactly
(`"Elements Parquet differs from independently normalised input"`). The GeoJSON's own name says what
it is: `"OSM data-centre source elements — not deduplicated facilities"` (line 548).
PATTERN: Derived view from read-back (one source of truth, compared on verify)

### F15 Bytes on disk are the bytes that ship
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 .gitattributes:5-10
QUOTE:
```text
# Every digest in this repository is taken over git blob content, which is LF,
# and GitHub Pages serves those same bytes. On a Windows checkout with
# core.autocrlf=true git writes CRLF into the working copy instead, so the file
# on disk is not the file that ships — and anything that reads the disk to
# answer a question about what ships gets a different answer depending on whose
# machine it runs on.
```
Rule: `.gitattributes:32` is `* text=auto eol=lf`, and `*.parquet binary` appears later in the same file.
WHY: This is the last commit (f9f4728, 2026-09-01T00:25:42+01:00). It is an estate-wide fix that
records four separate CRLF defects, "FOUR times in one evening", in other repos. A hash proof is only
as good as its agreement on which bytes it hashes.
PATTERN: Canonical bytes (LF pinned at the attribute layer, binaries untouched)

### F16 A contradiction still live: the landing page links Data Center Map as a "source"
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 index.html:76-80
QUOTE:
```html
    <a class="card" href="https://www.datacentermap.com/united-kingdom/london/">
      <small>Source · separate</small>
      <strong>Data Center Map · London</strong>
      <span>Public directory source retained separately rather than silently merged into a single untraceable dataset.</span>
    </a>
```
WHY: `index.html` was last touched in 0939e3c (2026-07-29), before the data-source law. It still calls
Data Center Map a "Source" and the API an adapter with "caching and conservative parsing" (line 74).
That contradicts F6 and F7. It is a link, not ingestion, so no rows flow from it. A controller should
treat this as a doc drift the law did not catch: `doctor()`'s `SOURCE_BOUNDARY` does not include
`index.html` (lines 34-48).
PATTERN: (anti-pattern) A surface outside the gated boundary

## Patterns (keyed; each cites at least one F above)

- **Fail closed on soft errors** (F1, F2): a 200-with-remark, an empty set, a duplicate or an untagged
  element each stops the build. Nothing is dropped quietly.
- **Double-compile parity** (F3, F4): two builds from one retained input must be byte-equal. This
  works because the engine is pinned, there is one thread, the COPY is ordered and the codec is gated.
- **Abstention ledger** (F5): relationship rows are adjudication slots with `ABSTAIN` and
  `eligible_for_join=false` until a verified Companies House number exists.
- **No fetch on read** (F6): a request handler serves landed bytes or returns 404.
- **Rights as a counted invariant** (F7, F8): excluded sources carry `network_requests: 0` /
  `rows_copied: 0`, which doctor and verify assert.
- **Query-shape law** (F8, F9): the query is a hashed file; its slow forms are banned by string
  gates and its expected selectors are derived from constants.
- **Allow-list projection plus a sentinel read-back** (F10): privacy is proven on the landed Parquet
  and GeoJSON, not on intent.
- **Exact output closure / repair-of-record / append-only successor** (F11, F12, F13): each run may
  change only declared paths, each repair binds to its failed run, and the base is never edited.
- **Derived view from read-back** (F14) and **canonical bytes** (F15).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

All 13 commits are by the single owner account `Ventusltd`. Commit messages from 7e98a64 onwards are
prefixed with a 12-digit Europe/London stamp (e.g. `202608281053` for 10:53 BST, committed
11:04:26+01:00). The repo has no merges and no reverts (`git log` linear, 13 commits).

- **2026-07-29T12:41:30+01:00 to 13:01:45+01:00. The scraper era (6 commits in 20 min).**
  c7ccf2f README, 9263635 API, c15a8bc deps, cf22d7b MIT, 2071c62 CI, 0939e3c landing page.
  9263635 `app.py` (266 lines) defined `fetch_datacentermap_london()`, which did
  `requests.get(source_url, ...)` then `BeautifulSoup(response.text, "html.parser")` inside the
  request path (`git show 9263635:app.py` lines 119-135). This is the "before" picture for F6/F7.
- **2026-08-27T17:51:02+01:00. 7e98a64 `202608271727: draft DATA_CENTRES intelligence producer`**
  (7 files, +1,664). A quarantined PipelineNews context-card closure built from repository-transcribed
  BBC figures. It has `FIXED_GENERATED_AT = "2026-08-27T16:27:00Z"`, a self-excluding source manifest
  (`build/python/202608271727-build-data-centres-intelligence.py:194-201`, "Manifest self-exclusion
  rule is absent or dishonest") and a ZSTD/DuckDB 1.3.2 gate. This is where the producer discipline
  starts.
- **2026-08-28T11:04:26+01:00. 0f4e8ac `202608281053: add OSM data-centre fetch and guarded relationships`**
  (13 files, +1,631/-356). **The turning point.** The Data Center Map scraper is deleted, OSM via one
  Overpass query becomes the sole source, and the ABSTAIN relationship ledger, data-source law and
  BBC link-only evidence are introduced.
- **2026-08-28T16:43:42+01:00. fc09676 `202608281626: retry Overpass and quarantine private strings`.**
  The first live run (33161947627) failed at "Fetch OpenStreetMap once through Overpass". The repair
  adds classified attempts, sanitised failure evidence (body hashed, not kept) and the privacy
  nulling of all `*_raw` strings (F10, F12).
- **2026-08-28T17:07:26+01:00. 76cd675 `202608281702: replace broad Overpass regex scans`.**
  Run 33186567222 failed again at fetch. Its failure artifact is pinned by digest. The repair is the
  42-selector indexed query (F9).
- **2026-08-28T18:03:57+01:00. 6ca6914 `202608281801: prevent Python bytecode contaminating candidate`**
  (1 file, +19/-18). Run 33188465561 passed fetch, compile-twice and parity, but failed the output
  closure because of `__pycache__` (F11). The fix adds `PYTHONDONTWRITEBYTECODE: "1"`.
- **2026-08-28T19:45:43+01:00. c5dfdee `202608281944: freeze data-centre company federation contract`.**
  It records green run 33192937058 on source commit 6ca6914 and candidate commit
  `b2be24b3673a2532b3deab87f90861ca59e730fd`: 306 elements, 612 ABSTAIN slots, closure 292,578 bytes
  (`contracts/202608281944-data-centre-company-federation-v1.json:7-27`).
- **2026-09-01T00:25:42+01:00. f9f4728 `202608312345: pin text to LF`** (F15).

**Storm of 2026-08-28:** 5 commits in 8 h 41 m, from 11:04 to 19:45 (+01:00). There were three failed
production runs, and each was answered by a timestamped successor that cites the failed run, so no
history was rewritten. Four workflow files remain side by side
(`.github/workflows/2026082*-candidate.yml`), one per generation.

## Comparison with data-grid-gb/datacentres (kept, changed)

data-grid-gb's `datacentres/` was added on 2026-10-29 in three commits under GridAtlas #73 (3c6c72e,
69b566d, b57c94d; `git log -- datacentres | wc -l` = 3), about two months after data-centres-gb
froze. I found no textual cross-reference: `grep -rni "data-centres-gb\|datacentermap"` over
data-grid-gb returns nothing outside data files. "Kept" below means the same idea reappears, not
that code was copied.

**Kept**
- OSM via Overpass, ODbL attribution and share-alike awareness.
  data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/NOTICE:10-16
  (`Attribution: © OpenStreetMap contributors. SHARE-ALIKE: a database that republishes`).
- Licence-gated ingestion, now generalised into a registry rule.
  data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 docs/METHODS.md:129-130:
  `- **Fully open** means OGL v3, CC BY, CC0, public domain, or ODbL with attribution.` /
  `Non-commercial, approval-based and paid sources are \`no\`.` Data-centres-gb's single named
  exclusion (F7) becomes a class rule with `"open": "no" | "unverified"` per source. Two sources are
  `no` (`local-planning-portals`, `company-disclosures`: "never scraped into the dataset",
  sources.json:111).
- Byte-identical rebuilds. data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 docs/METHODS.md:110-111
  (`reproduce.py check\` rebuilds every fully open lane offline in a scratch copy and` /
  `requires byte-identical outputs.`). This keeps F3/F4 in a different form: rebuild against pins
  instead of compiling A and B in CI.
- Fail closed on wrong identity joins, carried from company binding to site merging.
  data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a4-osm-wikidata/dc_a4.py:235-240
  (`"""Fail closed: a site containing distinct known operators is invalid, not a conflict to hide."""`
  ... `raise ValueError("cross-operator data-centre merge: " + repr(ops))`).

**Changed**
- **OSM-only became six lanes.** data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/lanes.json
  holds 6 lane ids (`grep -c '"id": "dc-a'` = 6): dc-a1-neso, dc-a2-planning, dc-a3-gov,
  dc-a4-osm-wikidata, dc-a5-dno and dc-a7-merge. There is no dc-a6 in the file. OSM is now one lane
  (DC-A4, with Wikidata CC0). The merged output has 227 features, 225 with geometry (counted from
  `datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson`).
- **Grain changed from "one OSM element, never merged" to "one site, merged".**
  data-centres-gb refuses to merge (README.md:27, "Buildings and campuses are not silently merged").
  data-grid-gb groups within `SITE_RADIUS_M = 250` (dc_a4.py:74), and `counts.json` reports
  `"duplicates_merged": 28`. Separation is enforced by `cannot_link` (dcmerge.py:262-266, "Hard
  separation regardless of other links (prevents transitive chaining).").
- **The query law loosened.** data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 dc_a4.py:26-34
  uses regex value selectors again (`nwr["building"~"^data_cent(er|re)$"](area.uk);`) with
  `[timeout:300]`. That is the form data-centres-gb banned after a production timeout (F9). It drops
  lifecycle prefixes, adds `building:use`, and uses `out center tags`, which carries no `meta` and so
  never receives contributor identity. On contributor identity that is stricter by omission.
- **Fallback became softer.** dc_a4.py:388-390 falls back to a legacy globalgrid2050 snapshot and only
  prints `"WARNING: legacy file hash differs from pinned"` on a hash mismatch. The committed
  `counts.json` shows `"mode": "legacy globalgrid2050 snapshot (Overpass and Wikidata unreachable from this session)"`.
  data-centres-gb would refuse here: no fresh envelope means no build.
- **Operator strings are retained and used for matching** (dc_a4.py:211-217 `op_compatible`).
  data-centres-gb nulls them and abstains (F5, F10). There is no Parquet and no ABSTAIN ledger in
  data-grid-gb. The output is GeoJSON with `operator`, `conflicts` and `match` properties.

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- data-centres-gb is the strictest data-centre producer in the estate and the origin of its "abstain,
  don't bind" law. The Grid Atlas data-centre layer comes from data-grid-gb's 227-site pipeline, which
  merges sites and keeps operator strings. The F5 ABSTAIN ledger is the guard to keep in mind for any
  claim that a mapped data centre is "owned by X". In data-centres-gb no row is eligible for such a
  join (612/612 `eligible_for_join=false`).
- F6 is directly relevant to an immutable-shell map: a live surface must never fetch on read.
- F9 is a cautionary record for any future Overpass lane. Regex key and value scans over the GB area
  timed out in production on 2026-08-28. data-grid-gb's DC-A4 reintroduces regex values; its committed
  baseline used the legacy snapshot, not a live Overpass run.

## Candidates (unkeyed; clearly marked)

- The candidate branch `candidate/202608281053-osm-data-centres` (commit b2be24b...) holds the real
  306-row Parquet. It is not in this clone, so its bytes are UNVERIFIED by W08. Only the contract's
  recorded hashes are cited.
- I believe the data-grid-gb DC-A4 lane was written without reference to data-centres-gb, given the
  absence of any cross-reference. This is inference, not shown by a key.
- `build/python/202608271727-verify-data-centres-intelligence.py`, the 1727 contract and manifest, and
  the 1727 test were not read line by line: UNVERIFIED.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. F5: `build/python/202608281053-osm-data-centres.py:464-475` with the federation tally
   `ABSTAIN: 612`. This is the estate's canonical abstention.
2. F1: `build/python/202608281053-osm-data-centres.py:317-318`, where a remark is a failure. It is
   the shortest statement of fail-closed acquisition.
3. F4: `build/python/202608281053-osm-data-centres.py:769-770`, `"Independent builds differ"`.
   Reproducibility in two lines.
4. F6: `app.py:66`, `"this API never fetches a source on demand"`.
5. F7: `docs/data-sources.md:3`, "Open code does not make third-party content open data."
6. F9: `build/python/202608281702-osm-overpass-indexed.py:89`, `query.count("nwr(area.gb)") != 42`.
   A query law written as an arithmetic check.
7. F12: the workflow's `assert run["conclusion"] == "failure"` (line 87). A repair must prove that
   the failure it repairs actually happened.

## One next command (exactly one, runnable from a clone)

```bash
git -C /home/user/estate/data-centres-gb show 0f4e8ac --stat --format='%H %aI %s'
```
