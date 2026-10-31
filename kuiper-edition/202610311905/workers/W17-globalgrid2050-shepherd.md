# W17 globalgrid2050-shepherd
HEADS: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e
READ:
.gitattributes
AGENTS.md
catalogue/homepage-owner.json (812 bytes, whole)
catalogue/homepage-catalogue.json (head -c 800 only)
homepage-shell/data/homepage.json (lines 50-80, 570-640; parsed with python for structure)
scripts/import_homepage_owner.py
scripts/check_public_language.py (lines 1-60)
scripts/fetch_datacentres.py
datacentres.geojson (parsed with python: counts only)
docs/REPO-HYGIENE.md (lines 1-30)
.github/workflows/deploy-pages.yml (lines 1-200)
.github/workflows/count-lines.yml (lines 1-12, 76-107)
.github/workflows/public-language-gate.yml (lines 1-105)
.github/workflows/000_freeze_all_workflows_to_manual.yml (head -40)
.github/workflows/202608300232-sync-promoted-gridatlas-v9.yml (head -30)
.github/workflows/update-grid-data.yml (grep only)
.github/large-files-allowlist.txt (head -20)
202608300453-atlas-v9/index.html
kuiper-grid/i0097/current.json (head -c 1200; hashes recomputed with python)
kuiper-grid/i0097/cartridges/009700000000-kuiper-programs.js (lines 820-865, 1008-1020, 3946-4001)
kuiper/current.json (head -c 400)
testcode/wafer-development-environment/202609180245-real-systems/pilot.mjs (lines 236-270, grep)
testcode/wafer-development-environment/202609180245-real-systems/pilot-rules.js
testcode/wafer-development-environment/202609180245-real-systems/lib.mjs (lines 1-40)
testcode/wafer-development-environment/202609180245-real-systems/QUANTUM-STAR-PROTOCOL.md (head -40)
testcode/wafer-development-environment/202609190330-cable-cross-sections/kuiper-weigh.mjs (lines 1-12)
testcode/wafer-development-environment/versions.json (head -c 1500)
homepage_versions/homepage_v126.html (grep line 264 only)
kuiper-belt: NEXT.md (52-60), SPEC-INFINITE.md (130-140), MEASURED.md (36-46)
gridatlas: docs/RELEASE.md (lines 43-72)
git history of globalgrid2050: log, show --stat, show of f69ff823 c002bc32 bdfc217e d1023fe4 7002e9cd 4a6213fa 331db25f a3f2a8f6 57640569 f34fe629 1da4dafd 05bdbea3 7a0b5d7b d12ef822 11f7e2ed

All counts below were taken 2026-10-31 (UTC) on the clone at HEAD c66759f0d7ac3489df9158da6eaa1330a37c069f. The clone is shallow: one
shallow root, `acd2f242667dd60868476490209c5b9ce4aeb8f9` (2026-09-16T04:31:08+01:00), `cat .git/shallow`.

## Map (keyed by HEAD; commands cited)

- Size: `du -sh --exclude=.git .` = 5.3G; `du -sh .git` = 275M. `git ls-files | wc -l` = 47,277;
  `git rev-list --count HEAD` = 304. 82 top-level tracked directories plus root files.
- Top-level directories, tracked files (`git ls-files | awk -F/ '{print $1}' | sort | uniq -c`) and disk (`du -sh`):

| dir | files | du | bytes (tracked paths) | kind |
|---|---:|---:|---:|---|
| data/ | 240 | 1.3G | 1,340,445,896 | republished data (Elexon monthly CSV archives, bot-maintained) |
| solar-design-studio/ | 26,567 | 978M | 957,143,534 | dated release folders + terrain tile binaries (.ghz/.gsc/.ght/.gst/.gfl/.gcn/.gvs, 768 each) |
| testcode/ | 9,630 | 906M | 921,123,746 | authored code in 134 timestamped folders, each carrying copied fixtures |
| uk_renewables_pipeline/ | 3,326 | 780M | 807,603,511 | snapshot copies; the 20.7 MB project_identity_v6.json fixture appears 18 times |
| pipelinenews_intelligence/ | 1,953 | 662M | 688,462,083 | snapshot copies (8 MB grid-proximity fixture appears 45 times) |
| (root files) | 135 | - | 268,924,460 | geojson layers (roads 80/68/55 MB), REPD CSVs, homepage |
| kuiper-grid/ | 1,556 | 210M | 215,649,133 | authored: 16 immutable generations i0073..i0097 (each a full copy) |
| energy-transition-simulator/ | 1,475 | 90M | 89,691,332 | dated release folders |
| uk_energy_tracking_v6, v6_2 | 136, 49 | 47M, 34M | - | generation history data |
| repd_grid_atlasv6/7/8 | 100/107/104 | 38M each | - | old atlas copies (v7, v8 add only ~0.1-0.2 MB of new blobs) |
| dist/ | 16 | 29M | 29,645,011 | published JSON products |
| homepage_versions/ | 230 | 6.0M | - | numbered pre-edit restore points v1..v134 + metrics |
| data_science_protocol/ | 351 | 6.0M | - | audit reports |
| kuiper/ | 75 | 3.3M | 3,251,100 | authored: the k-series Kuiper shell + cartridges |
| scripts/ | 322 | 3.4M | 2,767,270 | authored Python/JS |
| .github/ | 263 | 1.2M | - | 260 workflows (5 with `schedule:`, `grep -l '^\s*schedule:'`) |
| catalogue/ | 3 | - | 291,686 | the sparse pin target (see F1, F15) |

- **Republished data vs authored code** (distinct blobs at HEAD, classified by extension,
  `git ls-tree -r -l HEAD | awk '!s[$3]++'`): data/binary 13,396 blobs = 1,997,979,527 bytes (92.9 % of distinct
  bytes); code (js/mjs/py/html/css/yml/ps1/sh) 2,804 blobs = 72,118,468 bytes (3.4 %); prose (md/txt) 835 blobs =
  80,735,768 bytes. The 100 largest distinct blobs hold 1,598,447,260 bytes (74 %).
- **Where the Kuiper wafer translator lives:** `testcode/wafer-development-environment/202609180245-real-systems/` (pilot.mjs,
  pilot-rules.js, lib.mjs, 13 *-network.json cartridges). The homepage heading "The Translator of Systems" links its
  promoted copy `testcode/wafer-development-environment/202609192215-proof-s0004/` (homepage_v126.html:264). The folder
  `202609190230-kuiper-belt` named in the task **no longer exists at HEAD** (`git ls-files | grep -c 202609190230` = 0):
  it was deleted by f69ff823 (see History). `grep -rln 'stations'` over the wafer environment returns 20 files; the
  translator's `networkTargets` is in real-systems/pilot.mjs:245-256.
- **Homepage catalogue and releases registry that gridatlas docs/RELEASE.md pins:** globalgrid2050 holds only the
  pin, `catalogue/homepage-owner.json` (owner repo + 40-hex commit + seven sha256). The registry
  (`data/homepage.json`) and `scripts/releases.py promote` live in **Ventusltd/globalgrid2050-homepage**, which is
  not in the estate clones. `git log --oneline -- scripts/releases.py` is empty here. **UNVERIFIED:
  scripts/releases.py** (the file is not in this clone; only AGENTS.md:17 describes it).
  `git grep -l homepage.json -- '*.py' '*.mjs' '*.json'` = 3 files: catalogue/homepage-owner.json,
  homepage_versions/homepage_v133-metrics.json, scripts/import_homepage_owner.py.

## Findings (keyed)

### F1 The homepage is imported only as a hash-pinned, size-budgeted bundle, verified before any byte is written
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f scripts/import_homepage_owner.py:18-26
QUOTE:
```python
    for name, digest in pin['files'].items():
        url = f'https://raw.githubusercontent.com/{pin["repository"]}/{pin["commit"]}/{name}'
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read(1000001)
        if len(data) > 1000000 or hashlib.sha256(data).hexdigest() != digest:
            raise ValueError(f'Homepage size/hash mismatch: {name}')
        bundle[name] = data
    if sum(map(len, bundle.values())) >= 1000000:
        raise ValueError('Homepage bundle exceeds 1 MB')
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f scripts/import_homepage_owner.py:42-47
QUOTE:
```python
    # All remote inputs are verified before any output changes. Site promotion is
    # performed by Pages after the complete build, not while these files write.
    for name, data in bundle.items():
        target = ROOT/'homepage-shell'/name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
```
WHY: This is step 6 of gridatlas docs/RELEASE.md as it actually runs. deploy-pages.yml:165-166 runs it on every
Pages build, so the public GridAtlas row on globalgrid2050.com can only be bytes whose sha256 the domain repo
committed. It fails closed four ways (wrong owner, unpinned commit, unexpected file set, hash or 1 MB budget) and
writes nothing until every input has passed. Born with 4 files in 4a6213fa (2026-09-25T01:30:46+01:00), now 7
(line 9), the "7 bundle files" RELEASE.md step 6 re-reads.
PATTERN: pin-then-assemble (owner commit + per-file sha256 + byte budget; verify-all-then-write)

### F2 The verdict predicate is flipped so NaN cannot pass, and the claim was counted, not argued
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f kuiper-grid/i0097/cartridges/009700000000-kuiper-programs.js:3991-4001
QUOTE:
```js
    /* `!(x <= limit)` NOT `x > limit`. On every finite number the two agree -
       8,000,132 checks on the card, 0 disagreements - so nothing a real design
       does changes. They part on NaN: `>` says false and passes it, `!(<=)`
       says true and names it. The guard above should make that unreachable;
       this is the second lock on the same door, for the day someone edits
       the guard. */
    var over_volts  = !(v <= V_CEIL);                               /* equipment rating */
    var over_string = !(imp_e <= STRING_INPUT_A);                   /* string input, working current */
    var over_mppt   = !(isc_e * STRINGS_PER_MPPT <= MPPT_INPUT_A);  /* the machine's input */
    var design_a    = SIZING * isc_e;                               /* what cable and OCPD are sized to */
    var over_fuse   = !(design_a <= b.fuse);                        /* the sheet's max series fuse */
```
WHY: In bdfc217e (2026-09-21T12:27:20+01:00) the site program had answered "inside the 1500 V rating by NaN V". In
JS, `NaN > limit` is false, so it passes. `!(x <= limit)` agrees with it on every finite double and differs only on
NaN. The commit enumerated 8,000,132 checks, 0 disagreements on finite values and 1,001,580 where the old form
"passes what it cannot justify". It is a second lock behind the input guard (F10). This is the best single line of
engineering-safety code in the slice.
PATTERN: NaN-safe comparison (`!(x <= limit)`), with defence in depth

### F3 "A check that examines nothing refuses": the origin line of the brief's law 4
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/count-lines.yml:78
QUOTE:
```powershell
          if ($files.Count -eq 0) { throw 'no shard results: a check that examines nothing refuses' }
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/count-lines.yml:106-107
QUOTE:
```powershell
          if ($missing.Count -gt 0) {
            throw "INCOMPLETE: shards missing: $($missing -join ',') - the total is not the whole estate"
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/count-lines.yml:6-8
QUOTE:
```yaml
# Sharding is deterministic and by CONTENT: a blob belongs to the shard given by its own SHA.
# Every shard sees a disjoint slice, no blob is counted twice, and the shards sum exactly to the
# whole. Re-running any single shard reproduces that slice byte for byte.
```
WHY: Twelve self-hosted shards are split by blob SHA, so the shards are disjoint and reproducible, and the total
refuses in two ways: it fails on zero results and on any missing shard. Introduced in c002bc32
(2026-09-19T04:12:02+01:00). The wording is the Kuiper law verbatim ("A check that examined nothing refuses"). This
workflow produced the 124,905,502-line / 9,396,220,285-byte estate count in commit message 7a0b5d7b.
PATTERN: content-addressed sharding + completeness refusal

### F4 "THIS LIST IS THE BUG": an allow-list that has failed five times, with each time counted
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/deploy-pages.yml:41-48
QUOTE:
```yaml
      # THIS LIST IS THE BUG. An allow-list of published folders has now been
      # wrong five times, and it will be wrong again the next time a folder is
      # added, because nothing anywhere checks that the two agree. It should be
      # inverted to paths-ignore, so a new published folder deploys by default
      # and only what is deliberately excluded does not. Left as a list for now
      # because inverting it changes how often this deploys, and that is a
      # decision about the runners, not a typo fix.
      - 'kuiper-grid/**'
```
WHY: The comments in this file record seven silent non-deploys ("FIFTH TIME", "SIXTH TIME", "SEVENTH TIME", lines
34-57). The line 36-39 lesson, "The commit said PUBLISHED and the page said otherwise", is the failure that
gridatlas's step 7 (`check-served.mjs`, served bytes) exists to catch. As measured at this HEAD: 42 push paths, three
of them duplicates ('uk_renewables_pipeline/**', 'pipelinenews_intelligence/**', the workflow file itself);
'systems/**' is listed but `git ls-files systems | wc -l` = 0; 61 of the 82 tracked top-level folders match no
push path (including conductor_resistances/ and ac_cables_knowledge/, which the Kuiper selftests open).
PATTERN: failure ledger kept in the config file; prefer deny-lists (paths-ignore) for publication

### F5 A check that cannot run must not look like a content failure, and the sparse workspace is cleared at all three layers
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/public-language-gate.yml:60-66
QUOTE:
```powershell
            # THREE THINGS MAKE A TREE SPARSE AND CLEARING ONE IS NOT ENOUGH.
            # The config says whether to apply it; a file in .git/info holds the
            # pattern and can re-arm it; and the INDEX carries a skip-worktree
            # bit per path, which is what actually stops a file appearing.
            # Clearing only the config left the bits set and the tree still
            # partial, which is how this looked fixed when it was not.
            & git -C $w sparse-checkout disable 2>$null | Out-Null
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/public-language-gate.yml:86-90
QUOTE:
```powershell
        run: |
          if (-not (Test-Path "scripts/check_public_language.py")) {
            Write-Host "FAIL: the gate script is not in this workspace."
            Write-Host "This is NOT a language failure. Nothing was checked."
            Write-Host "A check that cannot run is not a pass."
```
WHY: Twelve persistent self-hosted workspaces were left with `core.sparseCheckout=true`, so the gate checked no
language at all while showing up as a red wording failure (d1023fe4, 2026-09-21T11:36:16+01:00; acf2bfb1 two
minutes later found that clearing the config alone was "not enough"). This bears directly on gridatlas RELEASE.md,
which **requires** a sparse checkout of this repo for the pin (`--no-cone /catalogue/`) and keeps it in a separate
`--no-checkout` worktree, never in a shared workspace.
PATTERN: environment self-repair before checkout; precondition gates that say "nothing was checked"

### F6 The translator: a whole system drawn from a typed command, where position is computed and identity never moves
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609180245-real-systems/pilot.mjs:252-253
QUOTE:
```js
  for (let s = 0; j < m; s++, j++) { const q = s % st.length, c = Math.floor(s / st.length), th = c * GA, r = 0.004 * S * Math.sqrt(c);
    t[2 * j] = S * st[q][0] + r * Math.cos(th); t[2 * j + 1] = S * st[q][1] + r * Math.sin(th); }
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609180245-real-systems/pilot.mjs:241
QUOTE:
```js
// its stations by the same blend gravity and the logo use. Positions are computed, never stored; identity never moves.
```
WHY: `networkTargets` spreads the in-scope lines along a network's edges in proportion to their length. The
remainder sit at each station on a golden-angle sunflower: `th = c * GA`, `r ∝ sqrt(c)`, GA = 2.399963229728653.
That is the Kuiper placement law (maths: r = sqrt(k), theta = k·φ) applied locally. The same dust draws the grid,
the 400 kV and 132 kV networks, substations, the Underground, Shotwick, the UK, the world, a trench and a pandapower
fault study (NETWORKS, line 243). It first shipped in f8bd6c6f (2026-09-18T03:19:11+01:00, 23 files, 2,189
insertions).
PATTERN: arrangement as a pure function key → (x, y); data cartridges (*-network.json) behind one renderer

### F7 The placement law in its plainest form: every key has a place, even one never issued
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609180245-real-systems/lib.mjs:11-21
QUOTE:
```js
export const GOLDEN = Math.PI * (3 - Math.sqrt(5));   /* the golden angle, 2.39996… rad */
export const SPACING = 1.0;

/* The addressing scheme. A number's place on the surface is a pure function of
   the number, so the same key is the same point on every device. A number that
   was never issued still has a place: that is what makes the surface unbounded
   rather than merely large. */
export function place(key) {
  const r = SPACING * Math.sqrt(key), t = key * GOLDEN;
  return [r * Math.cos(t), r * Math.sin(t)];
}
```
WHY: This is `r = sqrt(k), theta = k·golden angle` written as code, and lib.mjs:1-8 explains why it is a separate file:
"the checks were proving a copy, not the page". `grep -rn 'GOLDEN = Math.PI \* (3 - Math.sqrt(5))'` finds it in
every timestamped wafer version, the same law in each.
PATTERN: single source for claims (page and proofs import the same module)

### F8 Plain words become commands with no model, and a missing number is a refusal that names it
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609180245-real-systems/pilot-rules.js:1-2
QUOTE:
```js
// Pilot by typing anything, with no model: plain words are matched to commands by rules the page can show you.
// plan(sentence, ctx) → { commands: [...], because: '...' }   ctx = { appNames: [...], dies: [...] }
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609180245-real-systems/pilot-rules.js:22-23
QUOTE:
```js
    const missing = [A == null && 'current in A', L == null && 'length in m', R == null && 'resistance in ohm/km', pf == null && 'power factor'].filter(Boolean);
    if (missing.length) return { commands: [], because: `voltage drop needs: ${missing.join(', ')} (say e.g. 120 A, 250 m, 0.32 ohm/km, pf 0.95)` };
```
WHY: This is the "translator" half that turns sentences into commands. It uses rules the page can show, so a
voltage-drop request with no power factor returns `commands: []` and the list of missing inputs instead of a
guessed answer. pilot-rules.js is byte-identical in the retired 202609190230-kuiper-belt and the live
cable-cross-sections page (blob 7eddead5).
PATTERN: deterministic intent parser; refusal by naming the missing input

### F9 One body per distinct blob SHA: copies are measured and joined on the hash, never on position
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/kuiper-weigh.mjs:3-7
QUOTE:
```js
// Law, printed with the run: one body per distinct blob SHA. The station's third element is that
// blob SHA and it is the key; the fourth element is `copies`, the number of tracked paths in the
// estate whose bytes hash to that SHA. `copies` is read from the estate run's own estate-bodies.json
// and joined on the blob SHA, never on position and never on order. A station whose SHA is not in
// the run gets no fourth element at all and stays base dust: no intensity is invented for it.
```
WHY: This is the right denominator for the "17,300 blobs" claim (see Measurement below): distinct blobs and
`copies` per blob are different numbers, and this file keeps them apart. It was born in the 202609190230-kuiper-belt
folder; f69ff823 says the retired engine is "byte for byte" the one live here. Verified: app.mjs, kuiper-weigh.mjs,
lib.mjs, pick.mjs, read.mjs and pilot-rules.js have identical blob ids at f69ff823^ and HEAD; only pilot.mjs differs.
PATTERN: join on content hash; absent stays absent ("no intensity is invented")

### F10 NOTHING IS DRAWN: inputs are refused in words before any coordinate exists, and no size is silently substituted
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f kuiper-grid/i0097/cartridges/009700000000-kuiper-programs.js:824-826
QUOTE:
```js
    // NO SILENT SUBSTITUTE: a size the table has no number for is refused in words, never costed as another size's copper.
    const sizeWords = Object.keys(R20).map(Number).sort((a, b) => a - b).join(', ') + ' mm2';
    const needSize = (what, mm2, give) => { if (R20[mm2] === undefined) throw new Error(what + ' ' + mm2 + ' mm2 has no resistance in the table: the sizes with a number are ' + sizeWords + ', or give "' + give + '" yourself'); };
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f kuiper-grid/i0097/cartridges/009700000000-kuiper-programs.js:1010-1016
QUOTE:
```js
    const stopped = guardTyped(inp);
    if (stopped.length) {
      const words = stopped.join('; ') + '. Nothing is drawn until that is a number the engine can hold.';
      return { refused: true, string: null, connections: [],
               checks: [{ rule: 'inputs_are_numbers', name: 'inputs_are_numbers', ok: false, words: words }],
               numbers: { drawn: 'nothing', rules_broken: stopped.length, rule: 'inputs_are_numbers' },
               said: 'NOTHING IS DRAWN. ' + words,
```
WHY: This is the first lock on the door F2 locks a second time. A cable size with no table value is refused rather
than costed as another size's copper, and a non-numeric input returns `refused: true` with no geometry. Line 861:
"the words it refuses in ARE the answer. Nothing wrong is ever drawn."
PATTERN: refuse-in-words; no silent substitute

### F11 Immutable shell plus hashed cartridges, the same architecture as gridatlas atlas/current.json, verified 6 of 6
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f kuiper-grid/i0097/current.json:2-7
QUOTE:
```json
 "schema": "globalgrid.current.v1",
 "generation": "009700000000",
 "previous_generation": "009600000000",
 "architecture": "IMMUTABLE_SHELL_PLUS_HASHED_CARTRIDGES",
 "live_route": "/kuiper/",
 "release_id": "003100000000-kuiper-shell",
```
WHY: The architecture string gridatlas uses for the live map is also used for the Kuiper grid builds here. I
recomputed the sha256 of the shell index and all five cartridges named in this pointer with python hashlib: **6 of 6
match**. bdfc217e: "Nothing published is edited: new numbered cartridge, new sha256, pointer bumped". The cost is
that kuiper-grid/ carries 16 full generations (1,556 files, 215,649,133 bytes of tracked paths, only about 18.5 MB
of them first-seen distinct blobs).
PATTERN: immutable shell + content-hashed cartridges + one pointer

### F12 Releases registry entries carry a reason (as seen in the committed copy, which is stale by design)
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f homepage-shell/data/homepage.json:629-636
QUOTE:
```json
      "reason": "Site world on real EA LiDAR terrain; 32 browser checks passed on the release folder",
      "promoted_at": "2026-09-26T20:42:27Z"
    },
    {
      "entity_id": "solar-design-studio",
      "from_release_id": "v7",
      "to_release_id": "world-202609262041",
      "reason": "Vikram, 26 Sept 2026: Site World is the main event of Solar Design Studio; the GIS SLD Financial Sandbox (V7) stays as an earlier release",
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f homepage-shell/data/homepage.json:57-60
QUOTE:
```json
      "operative_release_id": "202609241334",
      "releases": [
        {
          "id": "202609241334",
```
WHY: Each promotion records from, to, a human-readable reason and a UTC time (14 promotions in this copy). That is
the record `releases.py promote ... --reason` writes in the owner repo (UNVERIFIED there, see Map). **Drift:**
the committed copy's sha256 is `49364588…`, not the pinned `1fd7ad98…` (catalogue/homepage-owner.json:8). It
still names GridAtlas V9.156 (202609241334), while the pin commit 331db25f promotes V9.186. The copy was last
written 2026-10-04 (6779aa92). 331db25f says "no generated output in the commit", so the importer rebuilds it at
deploy time, and anyone who reads this clone instead of the served site gets the wrong release.
PATTERN: promotion log with reason; generated copies must not be read as the source

### F13 The retired GridAtlas mirror forwards query and hash, so old deep links keep working
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f 202608300453-atlas-v9/index.html:11-15
QUOTE:
```js
    (() => {
      const target = new URL('https://ventusltd.github.io/gridatlas/');
      target.search = window.location.search;
      target.hash = window.location.hash;
      window.location.replace(target.href);
```
WHY: globalgrid2050 stopped mirroring GridAtlas, and its nine 2026-08-30 sync and repair workflows are now stubs
("Retired — GridAtlas mirror publisher", 202608300232-sync-promoted-gridatlas-v9.yml:1). The redirect carries
`search` and `hash`, so pipelinenews atlas deep links that point at the old mirror still land on the right view in
the canonical app.
PATTERN: retire with forwarding; preserve URL state

### F14 Text is LF everywhere, because every digest is taken over blob bytes
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .gitattributes:12-17
QUOTE:
```
# That defect appeared FOUR times in one evening, in four separate places:
#
#   the pipelinenews release verifier   hashed the working copy
#   tools/scope/verify-compose.mjs      failed on a tree nobody had touched
#   tools/scope/advance.mjs             RECORDED digests from the working copy,
#                                       so it would have attested bytes GitHub
```
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .gitattributes:32
QUOTE:
```
* text=auto eol=lf
```
WHY: Any hash-pinned release (F1, F11, gridatlas live-bytes) depends on the working copy being the bytes that
ship. The same defect appeared four times in one evening, and this fixes the cause rather than normalising at each
comparison. 3256cd9c (2026-09-26T21:50:58+01:00), "manifest carries the hash of tiles.json as served (LF line
endings)", is the same failure seen in a release.
PATTERN: canonical bytes at the source (`* text=auto eol=lf`)

### F15 The ownership split: this repository publishes, another repository decides
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f AGENTS.md:15-24
QUOTE:
```
The dedicated owner is https://github.com/Ventusltd/globalgrid2050-homepage .
Edit data/homepage.json THERE for product labels, releases, development entries
and selected nests. Its scripts/releases.py validates and promotes explicit
operative pointers while retaining historical records. Preserve retro styles.

This repository retains the custom domain, historical tools and publication.
Its catalogue/homepage-owner.json pins the accepted owner commit and seven file
hashes. scripts/import_homepage_owner.py verifies and assembles only that bundle
into homepage-shell/ and the root index.html during Pages publication. Do not
edit those generated copies or maintain a second active navigation config here.
```
WHY: This is the contract behind gridatlas RELEASE.md step 6: label and promotion happen in the owner repo, and the
domain only pins and assembles. It explains why catalogue/ is the only directory a pin needs. The
`--no-cone /catalogue/` sparse set is 3 files and 291,686 bytes, against 268,924,460 bytes of root files, which is
256.47 MiB and matches RELEASE.md's "about 257 MB".
PATTERN: owner repo vs publisher repo; pin the owner by commit and hash

### F16 The language gate rediscovered the allow-list defect (sixth time) on its own surface list
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f scripts/check_public_language.py:36-47
QUOTE:
```python
    # A NEW PUBLISHED FOLDER MUST BE ADDED HERE OR IT IS NEVER READ. This
    # list has the same defect the deploy workflow has learned five times:
    # it is an allow-list, and a page nobody adds to it is published
    # unchecked while the gate still prints PASS. plant/ is added with the
    # page, not after it.
    "plant/*.html",
    # SIXTH TIME THE ALLOW-LIST DEFECT ABOVE BIT. On 21 September 2026 the
    # composer shell at kuiper/ and all sixteen build shells under
    # kuiper-grid/i0*/ were given visible prose - navigation, a scope note
    # and the unsourced-limit warning - and NONE of them were on this list,
    # so the gate read eight files, printed PASS, and had not looked at any
    # of the seventeen pages the text had just been added to.
```
WHY: This is the same structural defect as F4, in a second file: "the gate read eight files, printed PASS, and had
not looked at any of the seventeen pages". A gate that passes on an empty surface is the vacuous green that
f34fe629's "level 0 honesty()" refuses elsewhere.
PATTERN: vacuity check (a PASS must say how much it read)

### F17 The early data-centre fetcher: the before picture that data-centres-gb replaced
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f scripts/fetch_datacentres.py:31-42
QUOTE:
```python
                break
            elif response.status_code == 429:
                print("  ⚠️ Server busy, sleeping 60s...")
                time.sleep(60)
            else:
                print(f"  ❌ Error: {response.status_code}")
                return
        except Exception as e:
            print(f"  ❌ Connection Error: {e}")
            return

    osm_data = response.json()
```
WHY: This is the contrast case for the datacentre focus. After three 429 responses the loop exits without
`break` and parses the 429 body. It records no OSM id, timestamp or provenance, invents "Unknown Data Centre" or
"Unknown Operator", and drops lat/lon that are 0. Its output at HEAD is `datacentres.geojson`: 240 features
(python json count), 51 named "Unknown Data Centre" and 67 "Unknown Operator", with properties limited to name and
operator. data-centres-gb (fail-closed, provenance-first) and the data-grid-gb dc-a1..a7 lanes (227 sites) fix
exactly these faults. It is wired only to `workflow_dispatch` (update-grid-data.yml:3-4).
PATTERN: anti-pattern, a retry loop that falls through to parse

## Measurement: the kuiper-belt "17,300 blobs, 5.7 GB, mean 329 kB" claim

The claim, keyed: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 NEXT.md:54-57
```
6. **Count the estate honestly.** Sum `git log --numstat` additions across all 66 repositories, with
   data paths reported separately, so every coverage claim finally has a denominator. One repository
   alone holds 17,300 blobs and 5.7 GB at a mean of 329 kB — history is dominated by republished data,
   not authorship.
```
and SPEC-INFINITE.md:134-135 ("17,300 blobs and 5,697,731,454 bytes at a mean of 329 kB").

Measured on globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f:
- `git count-objects -vH`: count 0, in-pack 20,337, packs 1, size-pack 267.82 MiB, garbage 0.
- `git ls-files -z | xargs -0 du -cb | tail -1` **is wrong as written**: xargs splits into 28 batches and
  `tail -1` returns only the last batch (248,493,416). Summing all 28 "total" lines
  (`… | grep -P '\ttotal$' | awk '{s+=$1}'`) gives **5,551,614,239 bytes** across 47,277 tracked paths. Cross-checked
  exactly with `git ls-tree -r -l HEAD | awk '{s+=$4}'` = 5,551,614,239; mean **117,427 B per path**.
- Distinct blobs at HEAD: `git ls-tree -r -l HEAD | awk '!seen[$3]++{s+=$4;n++}'` = **17,103 blobs, 2,151,644,971
  bytes, mean 125,805 B**.
- Verdict: **partly verified, partly refuted.** The blob count (17,103 now against 17,300 claimed) and the byte total
  (5.55 GB now against 5.70 GB) both have the right order of magnitude, and both differ from today's HEAD, so they
  were probably taken at an earlier HEAD. **The mean of 329 kB is not a valid statistic**: it divides bytes counted
  over every tracked path (duplicates included) by the number of distinct blobs (5,697,731,454 / 17,300 = 329,349).
  On consistent denominators the mean is about 117 kB per path or about 126 kB per distinct blob. The conclusion,
  "dominated by republished data", **holds**: 92.9 % of distinct bytes are data or binary, and 61 % of tracked bytes
  are duplicate copies (5.55 GB of paths over 2.15 GB of distinct content).
- Shallow boundary: the root commit acd2f242 shows "33,126,918 insertions, 16,015 files" in `--shortstat`. That is
  the full tree at the clone boundary (`git ls-tree -r acd2f242 | wc -l` = 16,015; 4,163,426,240 bytes), **not** a
  real commit. `git diff --shortstat acd2f242 HEAD` = 31,409 files changed, 4,313,243 insertions, 5,044 deletions.

## Patterns (keyed; each cites at least one F above)

1. **Pin, verify all, then write** (F1, F11, F14). Owner commit, per-file sha256, a byte budget, and nothing written
   until everything passes. This is the same law as gridatlas live-bytes, applied to the homepage.
2. **A check that examined nothing refuses** (F3, F5, F16). Zero shards, a missing gate script, a sparse workspace
   and an empty surface list are each named as "nothing was checked", never shown as pass or as a content failure.
3. **NaN-safe verdicts and refuse-in-words** (F2, F8, F10). Invalid input returns words and no geometry; predicates
   are written so the non-number case fails.
4. **The allow-list is the bug** (F4, F16). Two independent allow-lists failed seven and six times. The fix the code
   itself names, inverting to a deny-list, has not been made.
5. **Position is computed, identity is stored** (F6, F7, F9). Golden-angle and sqrt placement, joined on content
   hash, with absent values left absent.
6. **Immutable generation plus pointer** (F11, F12, F13). Publish new, bump a pointer, keep the old addressable,
   forward retired URLs.

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Clone window: 304 commits, from 2026-09-16T04:31:08+01:00 (acd2f242, shallow root) to 2026-10-29T11:30:11+00:00
(c66759f0, HEAD).

`git log --format='%H %ad %an %s' --date=iso-strict | head` (first 8 of 40 shown, subjects truncated):
```
c66759f0d7ac3489df9158da6eaa1330a37c069f 2026-10-29T11:30:11+00:00 Ventusltd Merge PR #47: promote owner bundle with GridAtlas v9.186 (lightning + Potential off
331db25f3c2b3af1ba7063dcdfe9536d2c8dab3c 2026-10-29T11:29:12+00:00 Claude homepage: promote owner bundle with GridAtlas v9.186 (lightning M6 + Potential offtake
da169420e232ae3719631f240791ded11dbb99d4 2026-10-29T02:43:51+00:00 Ventusltd Merge PR #46: promote owner bundle with the footer Privacy section
4f061580678c636bd1bf7aa1c52700cdf9a0baa7 2026-10-29T02:42:32+00:00 Claude homepage: promote owner bundle with the footer Privacy section
4f0f3a9bf9fcd9560adf6ce2058adab4936fbe9f 2026-10-29T02:40:24+00:00 Ventusltd Privacy: Pipeline News V9.11 pins Chart.js with SRI; simulator saved postcodes expi
b8973334303709067ef1408b6ff971d323a876ef 2026-10-29T00:58:59+00:00 Ventusltd Merge PR #44: promote owner bundle with GridAtlas v9.172 (UK lightning overlay)
d3c8b1d27c25cd346fc319951cc96a0bbe0d36a0 2026-10-29T00:48:01+00:00 Claude homepage: promote owner bundle with GridAtlas v9.172 (UK lightning overlay)
da7d8f6e6a7806ad5039701f5c86637d84be0704 2026-10-13T18:50:26+01:00 Ventusltd Fix heading markup for William Fraser section
```
`… | tail -5`:
```
abd5a989cef0b8aaddfe7ad3dd0d7233c3ea4134 2026-09-16T05:12:23+01:00 Ventusltd testcode/202609160224: unenforced is a backlog, not a category — the chair was wr
b90b4537c9ae910e473b7217c53c97fb1c61993e 2026-09-16T05:08:21+01:00 Ventusltd testcode/202609160224: two rules leave prose — a gate that refuses
b0905c5bf954e2b9e47156d03688307369eb2dd7 2026-09-16T04:55:03+01:00 Ventusltd testcode/202609160224: the charter, and the check that checks the checks
32e9d54dea1fddbeeb6442ba966dfa73dd92d648 2026-09-16T04:38:43+01:00 Ventusltd testcode/202609160224: where to begin — and the door that was an empty line
acd2f242667dd60868476490209c5b9ce4aeb8f9 2026-09-16T04:31:08+01:00 Ventusltd testcode: the way back — the strip lives at the published addresses
```

- **Per month** (`git log --format=%ad --date=format:%Y-%m | uniq -c`): 2026-09: 281, 2026-10: 23. Per day, the
  peaks are 2026-09-19 with 75 and 2026-09-18 with 49. After 2026-09-29 activity collapses to 2 to 8 commits on
  each of 5 days.
- **Hour of day** (author local, mostly +01:00): 147 of 304 commits (48 %) fall between 00:00 and 04:59. The heavy
  work was done overnight.
- **Authorship**: author name Ventusltd 295, Claude 7, Vikram Kumar 1, Ventus Board 1. Committer GitHub 7 (the
  merges and web edits). **186 of 304 (61.2 %) carry a `Co-Authored-By: Claude …` trailer**: Opus 5 (1M) 70,
  "Claude" 31, Opus 5.5 (1M) 29, Fable 5.1 26, Opus 5.5 22, Opus 5 9. **Automation-bot commits in the window: 0**
  (`grep -ci 'automated\|\[bot\]\|github-actions'` = 0). The scheduled data bots that maintain data/ did not commit
  inside these 304. There are 4 merges (`git rev-list --merges --count HEAD`).
- **Commit families** (`git log --format=%s | grep -c`): 38 hourly "testcode/particles NN" iterations at :41 past
  each hour (an unattended runner), 40 "PROOF/RELEASE k00NN" Kuiper iterations, 25 homepage pins or promotions, 23
  Solar Design Studio and Energy Transition Simulator dated releases.

### Turning points
1. **f8bd6c6ffdd2177afd5e55fbb27b7e33471d65a1** 2026-09-18T03:19:11+01:00. The translator is born: "seven real
   systems drawn from typed commands on the wafer's own dust" (23 files, +2,189). Followed by cd5d8ac0 "draw trench,
   the translator's first geometry" and 55fd025a "draw fault, a pandapower IEC 60909 study". See F6.
2. **c002bc326346e12e3c6b92ffb4ae386addb5f17c** 2026-09-19T04:12:02+01:00. The estate is counted by 12
   content-sharded runners, and the total refuses an incomplete set (F3). Hunk:
```
+          $ErrorActionPreference = 'Stop'
+          $files = Get-ChildItem "$env:RUNNER_TEMP\shards" -Recurse -Filter 'shard.json'
+          if ($files.Count -eq 0) { throw 'no shard results: a check that examines nothing refuses' }
+          $sum = @{}
+          $seen = @()
+          foreach ($f in $files) {
+            $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
+            $seen += $j.shard
+            foreach ($k in 'head_lines','head_blobs','head_text_blobs','head_binary_blobs',
+                           'history_lines','history_blobs','history_text_blobs','history_binary_blobs',
+                           'authored_added','authored_deleted','commits','tracked_paths') {
+              if ($null -ne $j.$k) { $sum[$k] = [int64]$sum[$k] + [int64]$j.$k }
```
3. **f69ff82307c126e9684cef7272a98110150ad2f7** 2026-09-19T18:54:29+01:00. "retire the early Kuiper page". It
   deletes `202609190230-kuiper-belt/` (app.mjs 980 lines, pilot.mjs 499, proof/checks.mjs 188 …) because "it
   shipped without the command modules, so its preset commands did not run". Its engine is byte-identical to the
   cable-cross-sections page (verified in F9). Hunk (the deleted kuiper-weigh.mjs header):
```
@@ -1,73 +0,0 @@
-// kuiper-weigh.mjs — join the measured copy count onto every station of kuiper-network.json.
-//
-// Law, printed with the run: one body per distinct blob SHA. The station's third element is that
-// blob SHA and it is the key; the fourth element is `copies`, the number of tracked paths in the
-// estate whose bytes hash to that SHA. `copies` is read from the estate run's own estate-bodies.json
-// and joined on the blob SHA, never on position and never on order. A station whose SHA is not in
-// the run gets no fourth element at all and stays base dust: no intensity is invented for it.
-//
-// Usage: node kuiper-weigh.mjs [<path to estate-bodies.json>] [<path to bodies.json>]
-// Nothing outside this folder is written.
-
```
4. **a3f2a8f670ef32178271a4ccafe2d42e04f275c1** 2026-09-20T00:11:29+01:00. RELEASE k0032, "a change released and
   then taken back, on purpose", proves that a release is one part plus a pointer and that rollback is byte-exact
   (24 of 24 unattended checks). This is the rehearsal for gridatlas route-C rollback.
5. **576405696a642f009394c0a10506e7627ea6fb54** 2026-09-20T21:58:43+01:00. "Withdraw internal working records from
   the public repository: The trail is private; the work produced is public." 10 files, −4,466. This is the
   privacy turning point that the brief's law 7 inherits.
6. **05bdbea30bd52e03f47cece3090781f7b4f26c9a** 2026-09-20T20:48:37+01:00. **Storm**: "Kuiper: the grid as a map, ten
   development builds", 923 files, +1,252,788 (whole-generation copies into kuiper-grid/). The next six commits,
   i0092 to i0097 (c6af38f4 … 0dd4754c), each add 98 to 104 files and 149k to 161k lines. Every generation is a
   full copy.
7. **bdfc217ee2ff51b3cbfc86717050744ad6259eef** 2026-09-21T12:27:20+01:00. i0093, "a verdict may not pass what it
   cannot justify": the NaN predicate flip (F2), proved with 8,000,132 enumerated checks.
8. **d1023fe42032f35d80cac55d8d2e568ef02ab903** 2026-09-21T11:36:16+01:00, and **7002e9cdb9b8d4924ad38eb87cae49ffa7f30a86**
   at 11:39:43. Within three minutes, the sparse-workspace gate fix (F5) and the fifth deploy-allow-list fix (F4). Hunk of 7002e9cd:
```
+      # PUBLISHED and the page said otherwise, which is the worst shape a
+      # failure can take.
+      #
+      # THIS LIST IS THE BUG. An allow-list of published folders has now been
+      # wrong five times, and it will be wrong again the next time a folder is
+      # added, because nothing anywhere checks that the two agree. It should be
+      # inverted to paths-ignore, so a new published folder deploys by default
+      # and only what is deliberately excluded does not. Left as a list for now
+      # because inverting it changes how often this deploys, and that is a
+      # decision about the runners, not a typo fix.
+      - 'kuiper-grid/**'
       # A new PipelineNews release is a directory under uk_renewables_pipeline.
```
9. **4a6213fa84b755ddd51d83db00b6e87ae30dbc64** 2026-09-25T01:30:46+01:00. The homepage moves to an owner repo. The
   domain gets `catalogue/homepage-owner.json` plus the hash-pinned importer (F1), with 4 bundle files at birth.
   Hunk:
```
+def main():
+    pin = json.loads((ROOT/'catalogue/homepage-owner.json').read_text(encoding='utf-8'))
+    if pin['repository'] != 'Ventusltd/globalgrid2050-homepage' or not re.fullmatch('[0-9a-f]{40}', pin['commit']):
+        raise ValueError('Unexpected homepage owner or unpinned commit')
+    if set(pin['files']) != FILES:
+        raise ValueError('Unexpected homepage bundle files')
+    bundle = {}
+    for name, digest in pin['files'].items():
+        url = f'https://raw.githubusercontent.com/{pin["repository"]}/{pin["commit"]}/{name}'
+        with urllib.request.urlopen(url, timeout=30) as response:
+            data = response.read(1000001)
+        if len(data) > 1000000 or hashlib.sha256(data).hexdigest() != digest:
```
10. **11f7e2ed** 2026-09-26T13:11 then **d12ef822** 2026-09-26T14:27 (+01:00). **Storm and revert**: a Pipeline
    News source-priority release (+624,552 lines, 230 files) is reverted 76 minutes later by "Restore GlobalGrid2050
    to pre-Pipeline News changes" (234 files, −624,705). This matches REPO-HYGIENE.md:24-26, "A 20 MB fixture was
    also committed and reverted within 76 minutes".
11. **1da4dafd9e7a7c55273f5b9ccb1f560733c4bda7** 2026-09-29T08:31:22+01:00 (the only commit authored as Vikram
    Kumar). It adds the PR file-size guard (5 MB), an allow-list of the 147 files already over 5 MB (148 at HEAD,
    `awk '$4>5242880'`), REPO-HYGIENE.md and the LF `.gitattributes` (F14).
12. **331db25f3c2b3af1ba7063dcdfe9536d2c8dab3c** 2026-10-29T11:29:12+00:00 (merged as c66759f0, PR #47, HEAD). The
    latest promotion pins owner 448f238f, "GridAtlas shows V9.186 (generation 202610291044)". Hunk:
```
@@ -1,11 +1,11 @@
 {
   "repository": "Ventusltd/globalgrid2050-homepage",
-  "commit": "bbf1dbd223cba53182efb5034ce0d6719728d4ee",
+  "commit": "448f238fd85b400aad6d6a0512775249749ab45f",
   "files": {
-    "index.html": "9426ff72c0c6d44fc74455a13c4115c953870aaeb27945f5f31802399ce80d8c",
+    "index.html": "86c99ac848c92dcd9752f5906f6fa7987ae04fec3c0a5c06859037b187063b2d",
     "assets/versioned-homepage.css": "0c405224efa71f262011db49c5c7a559a265801ec98609c8c9b16a5d83df35d2",
     "assets/versioned-homepage.js": "691df697ba930eab95ba67251ca3bee673ebb8c4174e010d8f6bb73ab24ea0f1",
-    "data/homepage.json": "36c8ef0ba28f199a7769cfef6957bf9720b57fcfb3eee800a04ab9c13c061261",
+    "data/homepage.json": "1fd7ad980719029dd73c57d2a511e626c8ed3f8c188da7fecbc468d945004b90",
```

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- **GridAtlas release step 6 and 8 run through this repo.** catalogue/homepage-owner.json is the pin. Every Pages
  build runs import_homepage_owner.py (F1). The commit chain d3c8b1d2 (V9.172, 2026-10-29T00:48:01Z), 4f061580
  (Privacy) and 331db25f (V9.186, 2026-10-29T11:29:12Z) is the homepage trail of the lightning and Potential
  offtakers releases. **Lag (candidate):** the brief says gridatlas live is generation 202610292044 (v9.187), while
  this clone's latest pin says V9.186 (202610291044). The domain clone is one generation behind as of HEAD c66759f0.
- **The sparse rule matters.** gridatlas RELEASE.md mandates a `--no-cone /catalogue/` worktree. F5 shows what
  a sparse flag left in a shared workspace did here: a gate that checked nothing for every run until fixed. Keep
  the pin worktree separate, as RELEASE.md says.
- **Architecture match.** kuiper-grid and kuiper use `IMMUTABLE_SHELL_PLUS_HASHED_CARTRIDGES` behind current.json,
  the same pattern as gridatlas atlas/current.json (F11). Hashes verify 6 of 6.
- **Datacentres.** The only datacentre producer here is the early OSM fetcher (F17): 240 points, no provenance, 51
  unnamed. It is the baseline the data-centres-gb and data-grid-gb dc-a1..a7 lanes improved on. Root
  `datacentres.geojson` was last touched at or before the shallow root (acd2f242), so it is effectively frozen. It
  is not the source for GridAtlas's 227-site pipeline.
- **Retired mirror.** 202608300453-atlas-v9 forwards to the canonical gridatlas with query and hash (F13).

## Candidates (unkeyed; clearly marked)

- CANDIDATE: `scripts/releases.py promote` validates and appends a promotion record with `--reason` in
  Ventusltd/globalgrid2050-homepage. UNVERIFIED: that repo is not in /home/user/estate.
- CANDIDATE: inverting deploy-pages.yml to `paths-ignore` would have prevented all seven recorded non-deploys. The
  file's own comment proposes it, but whether it changes runner cost is untested.
- CANDIDATE: the tracked `homepage-shell/` copies, frozen since 2026-10-04, could be removed from tracking or
  stamped "generated, not source", to stop clone readers seeing V9.156.
- CANDIDATE: the kuiper-belt figures (17,300 and 5,697,731,454) were probably measured at an earlier
  globalgrid2050 HEAD. The exact HEAD cannot be determined from this clone.
- CANDIDATE: of the 260 workflows, 5 are scheduled. 000_freeze_all_workflows_to_manual.yml rewrote the rest to
  manual dispatch. Its last run is not visible without the GitHub API.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. **F2** `var over_volts = !(v <= V_CEIL);` with its comment block. It is the clearest single example of a law
   (fail closed on what cannot be justified), it was proved by enumeration, and it guards a legal limit.
2. **F3** `throw 'no shard results: a check that examines nothing refuses'`. This is where the Kuiper's law 4 came
   from, in executable form.
3. **F1** `if len(data) > 1000000 or hashlib.sha256(data).hexdigest() != digest:`. This is GridAtlas release step 6
   reduced to one line.
4. **F4** `# THIS LIST IS THE BUG.`. The estate's most honest comment: a failure ledger that names its own root cause.
5. **F6 and F7** `const r = SPACING * Math.sqrt(key), t = key * GOLDEN;` and `th = c * GA, r = 0.004 * S * Math.sqrt(c)`.
   The placement law in the shepherd body, where the translator uses it to draw real networks.
6. **F9** "one body per distinct blob SHA … no intensity is invented for it". It supplies the honest denominator for
   the estate-size claims.

## One next command (exactly one, runnable from a clone)

```bash
git -C /home/user/estate/globalgrid2050 log acd2f242..HEAD --numstat --format='C %H' | awk '/^C /{next} NF==3 && $1!="-" {ext=$3; sub(/.*\./,"",ext); if (ext ~ /^(js|mjs|py|html|css|yml|ps1|sh)$/) code+=$1; else other+=$1} END {print "authored code lines added:", code, " data/prose lines added:", other}'
```
