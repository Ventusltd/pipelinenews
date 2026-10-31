# W20 cross-estate-patterns-denominator
Written by worker W20 (Opus), between 2026-10-31T19:05:00Z and 2026-10-31T19:23:05Z. Read only: nothing in any clone was changed. Scratch scripts are in /tmp/w20 (denom.py, dups2.py, distinct.py, idioms.py, idioms_pn.py), outside every clone.

HEADS: code-generator@857ea81244848b1da8fe21fffaed74cab568a3b4 cvaa@877bf380202b6a922932afc0bdcfd7f42a183086 data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445 elements@f7a92fb085c38dcbbd5cb469a66cd5ca61fb95bf energy-transition-simulator@a6b5ae63cc0eeb4d619f154c7e116616c997af77 galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 kuiper-drawing-engine@ee69a07a7ebf71f2f20c052f392991f115fdbee0 kuiper-ship@668ff0897022d5c14635198939673de3d9a66ce9 maths@b898a5ee39aa81a45197c5f17ba1195727aa538e particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 star-maker@f65c2f381d91eeb1eba75a97ae6765c24e32197d stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 substations@7d3f8233d3f01ee5f069727f21e387d90a280c26 testcode@d09c185c8dacbc5c73afb2b0d0d8dad40745a544 time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf trillion-loop@35fdea2f2744df338cfa7e28200e18008b307e73 ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4

Note on pipelinenews: its HEAD moved during this run (the harness committed the edition workspace: de3e68e42e01d3f37e26fb08b9bc76d36e299b61 at 2026-10-31T19:11:10+00:00, then 6a4c0244... and 9b256fdb... at 19:14). Every pipelinenews key below is pinned to 67aa2eb05993c630887b41c3b720ba42a86669a4 (the HEAD in proof/inventory.tsv). `git diff --stat 67aa2eb05993c630887b41c3b720ba42a86669a4 HEAD -- . ':!kuiper-edition'` printed nothing, so every quoted line is the same at the moving HEAD. A controller doing `rev-parse HEAD == sha` on pipelinenews will see a mismatch; check with `git show 67aa2eb05993c630887b41c3b720ba42a86669a4:<path> | sed -n '<line>p'` instead. All other HEADs equal proof/inventory.tsv (column inv_head_match = True in proof/denominator.tsv).

READ:
/home/user/pipelinenews/kuiper-edition/202610311905/BRIEF.md
/home/user/pipelinenews/kuiper-edition/202610311905/proof/inventory.tsv
every clone: git ls-files --eol, git ls-tree -r HEAD, git grep -I -c (counts only), git shortlog -sn, git log --format
kuiper-belt: kuiper-network.json (key "counts" only), tools/estate.py:1-230, tools/count_lines.py:1-60, README.md:28-40, EVIDENCE.md:94-97, CHAINS.md:70, learn-the-kuiper/README.md:42-46, learn-the-kuiper/202610050144/NOTICE.md:6-11
gridatlas: AGENTS.md:1-30, atlas/current.json:1-48, docs/RELEASE.md:36-42, tools/release/acceptance.mjs:8-30, tools/lightning/build.mjs:55-62, tools/ci/lightning/overlay-engine.test.mjs:1629-1632
data-centres-gb: README.md:8-20, build/python/202608271727-build-data-centres-intelligence.py:175-220
data-grid-gb: datacentres/NOTICE:55-79, LICENSE:1-4, git ls-files datacentres
pipelinenews@67aa2eb: atman/202608262014-build-pages.py:38,150-154, .github/workflows/bbc-rss-discovery.yml:38-43
globalgrid2050: .github/workflows/000_freeze_all_workflows_to_manual.yml:188-191 (no data file was printed; only ls-files, ls-tree and grep -c)
testcode: ls-files / ls-tree / grep -c only
elements: .gitattributes:1-2

## The denominator (task 1)

Command (printed exactly as run; the script is a read-only walk of `git ls-files --eol -z` per clone):

```
python3 -I /tmp/w20/denom.py > /tmp/w20/denom.tsv
```

Rules: tracked paths only; paths with a `node_modules/` or `vendor/` segment, and `kuiper-edition/`, excluded (121 paths in all); binary = git's own `i/-text` flag; text lines = newline count of the file (wc -l semantics); classes by extension: code = js mjs py html css ts sh sql; docs = md txt; data = json tsv csv geojson parquet; other_text = every other text file. Full table with all columns and the inventory comparison: proof/denominator.tsv.

```tsv
repo	tracked_files	code_lines	docs_lines	data_lines	other_text_lines	all_text_lines	binary_files	binary_bytes	inv_text_lines	delta
code-generator	59	40671	457	1973	96	43197	0	0	43197	0
cvaa	77	1004	3868	3381	592	8845	0	0	8423	422
data-centres-gb	33	3430	120	760	976	5286	0	0	5135	151
data-grid-gb	102	8963	1120	353739	741	364563	0	0	348482	16081
data-gridatlas	133	4530	215	16086	3309	24140	65	98111983	24053	87
elements	25	503	6224	123201	2	129930	0	0	129928	2
energy-transition-simulator	156	13731	176	11536	2086	27529	38	2244432	25501	2028
galaxies-wafers	735	48774	388	65492	59	114713	0	0	114707	6
globalgrid2050	47277	4171691	1528688	31509846	23372	37233597	7347	924977590	18385284	18848313
grid-distance-maths	15	1822	297	0	306	2425	1	22343	2119	306
gridatlas	1189	1239356	6505	257736	8409	1512006	2	1878309	1510335	1671
gridmachine1	50	561	3022	788	0	4371	0	0	4371	0
kuiper-belt	441	66714	3385	58396	292	128787	11	4564039	128574	213
kuiper-drawing-engine	38	677	220	0	100	997	0	0	949	48
kuiper-ship	2	0	2	0	2	4	0	0	2	2
maths	17	0	1572	0	2	1574	0	0	1572	2
particle-physics-drawing-engine	4024	1107	454	43874	360	45795	1432	10974661	45583	212
star-maker	5371	1569	3255	551562	52	556438	959	57218931	556386	52
stars	358	14172	1902	87804	655	104533	1	40462794	510273	-405740
substations	2	0	2	0	2	4	0	0	2	2
testcode	7671	1196100	1499242	1229533	2974	3927849	14	1211939	3920007	7842
time-stone	8	137	163	1085	244	1629	0	0	1425	204
trillion-loop	8	0	2385	0	0	2385	0	0	2385	0
ventus-grid-engine	123	12937	1950	2789	572	18248	1	12461	18325	-77
worlds-	665	9901	1058	400505	91	411555	0	0	410986	569
pipelinenews	3896	338979	16226	2177303	24099	2556607	198	1559658	2556046	561
TOTAL	72475	7177329	3082896	36897389	69393	47227007	10069	1143239140	28754050	18472957
```

Comparison with proof/inventory.tsv:
- tracked_files: equal for all 26 clones (72,475 in total). HEADs: equal for all 26.
- text lines: equal for code-generator, gridmachine1, trillion-loop. The small positive deltas are explained, with a key, for two clones: inventory counts only an extension allowlist. cvaa delta 422 = jsonl 308 + lock 42 + .gitattributes 72 (per-extension `git ls-files -z '*.<ext>' | xargs -0 cat | wc -l`); data-centres-gb delta 151 = .gitattributes 72 + overpassql 58 + LICENSE 21. In data-centres-gb, inventory's 5,135 = py 3,327 + yml 825 + json 760 + md 115 + html 103 + txt 5 exactly, so yml is on the allowlist.
- stars, delta -405,740: inventory counts the binary-flagged `LINES.md` (`git ls-files --eol` prints `i/-text w/-text attr/ LINES.md`); `git ls-files -z | xargs -0 wc -l` gives 510,276. This edition excludes binary files from line totals, as kuiper-belt tools/count_lines.py does (F12).
- globalgrid2050, delta +18,848,313: UNVERIFIED. Inventory's 18,385,284 could not be rebuilt from any allowlist I tried. Per extension (python3 -I /tmp/w20/perext.py /home/user/estate/globalgrid2050): json 17,146,113; csv 13,190,292; js 2,924,662; .ght 2,183,288; .gfl 2,032,356; txt 1,421,545; mjs 921,640; tsv 640,305; geojson 552,576. One possibility is that inventory dropped csv or applied a size cap. That is unproven.
- Distinct-blob denominator, comparable to kuiper-belt tools/count_lines.py "head" (NUL in the first 8,000 bytes = binary; +1 when there is no final newline): `python3 -I /tmp/w20/distinct.py` printed `paths 72475 distinct_blobs 30895 text_blobs 28322 binary_blobs 2573 distinct_text_lines 25071989`. The Kuiper's own figure, measured 2026-09-19, is 25,335,587 (F12). The two are within 1.0 %, from different estate compositions six weeks apart.

## Duplicate bodies (task 2)

Command: `python3 -I /tmp/w20/dups2.py` (per clone `git -C <clone> ls-tree -r -z HEAD`; pipelinenews at 67aa2eb; submodules skipped; node_modules and vendor kept, because the Kuiper counts every tracked blob). Shell cross-check, the brief's own form: `for r in estate/*/ pipelinenews/; do git -C $r ls-files -s | awk -v n=$(basename $r) '$1!="160000"{print $2"\t"n}'; done | sort -u | cut -f1 | uniq -d | wc -l` printed 1842. Table: proof/duplicates.tsv.

| measure | this run (26 clones) | kuiper-network.json counts |
|---|---|---|
| tracked paths | 72,475 | n/a |
| distinct blobs (bodies) | 30,895 | 19,441 |
| blobs in more than one repository | **1,842** (6.0 %) | "duplicated" 2,154 (11.1 %) |
| blobs at more than one path, any repo | 4,219 (13.7 %) | n/a |
| blobs in exactly one repository | 29,053 | "unique" 17,287 |

Repo multiplicity of the 1,842: in 2 repos 1,784; in 3 repos 53; in 4, 5, 6, 7 and 9 repos, 1 each. Most-shared repo pairs: globalgrid2050+testcode 979, globalgrid2050+pipelinenews 465, galaxies-wafers+testcode 261, energy-transition-simulator+globalgrid2050 126, pipelinenews+testcode 45, code-generator+gridatlas 15, globalgrid2050+kuiper-belt 14.

Top 20 by number of repositories (table A in proof/duplicates.tsv; ties broken by copies):

| # | blob | repos | copies | bytes | example path |
|---|---|---|---|---|---|
| 1 | dfe0770424b2 | 9 | 9 | 66 | elements:.gitattributes (GitHub's default "* text=auto") |
| 2 | d645695673349e | 7 | 8 | 11358 | data-grid-gb:LICENSE (Apache License 2.0 text) |
| 3 | e69de29bb2d1 | 6 | 9 | 0 | code-generator:.nojekyll (the empty blob) |
| 4 | 0048802883266c | 5 | 5 | 2648 | cvaa:.gitattributes |
| 5 | 2a2d7013c4c4 | 4 | 5 | 34731 | code-generator:apps/substation-finder/Ps/202609041945-place-global-search-v9-5.js |
| 6-9 | 159b7ae4.., ace94d28.., ad3284c0.., c2ec95aa.. | 3 | 95 | 203-6245 | globalgrid2050:testcode/202609051152/pipeline/{scripts/core/plugin-host.js, styles/mobile.css, styles/v7.css, scripts/core/utils.js} |
| 10 | 60e4b28f039f | 3 | 94 | 979338 | data-gridatlas:202608291410-repd-routing/projects.json |
| 11-20 | 9054ec9b.. to 914fc4b7.. | 3 | 89-91 | 402-15322 | globalgrid2050:testcode/202609051152/pipeline/... (plugins, contracts/project-spine.v7.2.json, data/canonical-projects.js) |

Top by copies (table B): 7e0e56505e87 has 202 paths in particle-physics-drawing-engine (results/msi/<stamp>/<stamp>-exactness.log, 1,080 bytes); 21d53685ceb1 has 162 paths in star-maker (shots/*.jpg, 42,874 bytes); 18 repd-identities/<n>.json blobs have 117 paths each across globalgrid2050 and testcode.

Reading: the Kuiper's 2,154 is not this run's 1,842 and not 4,219. kuiper-belt's tree has no writer for kuiper-network.json: `git grep -n -I duplicated -- tools` and a repo-wide grep excluding vendor and json found none. Its definition of "duplicated" is therefore UNVERIFIED. tools/estate.py tracks both `copies` and `repos` per blob (F11), so either definition could have produced the number over the 2026-09-19 estate.

## Findings (keyed)

### F1 Owner acceptance cannot be forged by an agent: the ACCEPT line
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/acceptance.mjs:15-27
QUOTE:
```js
 * WHAT COUNTS (tools/release/flow-lib.mjs decideAcceptance)
 *   - the author is an owner login (GRIDATLAS_OWNER_LOGINS, default Ventusltd);
 *   - it was not posted through a GitHub App (Codex and other connectors post
 *     as the owner with an app marker) and carries no agent signature
 *     (Claude-Session:, "Generated with [Claude Code]", ...);
 *   - it was made after G was cut (the manifest's cut_at_utc);
 *   - the latest qualifying verdict wins.
 *
 * Agents work with the owner's token, so GitHub cannot tell an agent's comment
 * from the owner's by login alone. The rule is therefore procedural as well:
 * no agent and no script posts an ACCEPT line or the label. --record refuses
 * to run under Claude Code, Codex or CI, and needs --i-am-the-owner.
```
WHY: This is the estate's only answer to a problem every agent repo has: an agent holds the owner's token. The gate rejects verdicts that carry agent signatures or app markers, and the recording tool refuses to run inside an agent. `ACCEPT ` occurs in only 7 files estate-wide, 6 of them in gridatlas (grep count, task 3). It is step 3 of the eight-step release that shipped v9.187.
PATTERN: human-in-the-loop gate that refuses to run inside an agent

### F2 The same gate as a release step, with its pre-conditions
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e docs/RELEASE.md:40
QUOTE:
```md
| 3 | owner acceptance | the owner comments `ACCEPT G` (first line) on the preview PR, or adds the label `accepted:G`; `acceptance.mjs --generation G` reads it | by an owner login, not through a GitHub App, no agent signature, after G's `cut_at_utc`; a later `REJECT G` or removing the label withdraws it | `acceptance.mjs` exits 0 |
```
WHY: One table row holds the step, its command, the checked pre-conditions and the exit criterion. Acceptance can be withdrawn, and only a verdict made after the generation was cut counts.
PATTERN: release step = command + checked pre-conditions + exit code

### F3 Fail closed, then reproduce twice, then write only an immutable candidate
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 README.md:8-14
QUOTE:
```md
The `202608281053` candidate producer:

1. posts one declared UK query to Overpass;
2. immediately ignores contributor username, UID and changeset;
3. fails closed on empty, partial, remarked, duplicated or untagged results;
4. compiles the same retained response twice with DuckDB 1.3.2;
5. proves byte-identical ZSTD Parquet and exact DuckDB readback;
6. writes only an immutable candidate branch—never `main` or Pages.
```
WHY: Six lines combine five estate idioms: a 12-digit generation stamp, privacy (drop OSM user fields), fail closed, a byte-identical twice-build, and immutable candidate output. Estate counts: "fail(s) closed" in 1,637 files across 16 repos; "immutable" in 3,144 files across 17 repos; "candidate(s)" in 4,567 files across 22 repos.
PATTERN: fail closed + build twice + byte-identical + candidate, never main

### F4 Hash receipts checked file by file; drift is a crash, not a warning
KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608271727-build-data-centres-intelligence.py:208-217
QUOTE:
```python
    for receipt in hashed_source_files:
        if not isinstance(receipt, dict) or set(receipt) != {"path", "sha256"}:
            raise RuntimeError("Malformed source-file receipt")
        path = root / str(receipt["path"])
        if path.is_symlink() or not path.is_file() or sha256_file(path) != receipt["sha256"]:
            raise RuntimeError(f"Source-file receipt failed for {receipt.get('path')!r}")
    for receipt in fixture.get("repository_evidence", []):
        path = root / str(receipt.get("path", "__missing__"))
        if not path.is_file() or sha256_file(path) != receipt.get("sha256"):
            raise RuntimeError(f"Pinned repository evidence drifted: {receipt!r}")
```
WHY: This is the clearest single example of the estate's "receipt" idiom: a receipt is exactly {path, sha256}, and the check also refuses symlinks. A drifted pin raises an error. "receipt(s)" appears in 1,904 files across 18 repos; `hashlib.sha256` in 380 files across 16 repos; `createHash('sha256')` in 628 files across 12 repos; "sha256"/"sha-256" in 11,451 files across 21 repos.
PATTERN: receipt = {path, sha256}; drift raises

### F5 Test fixtures pinned by SHA-256; "never skip silently"
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/lightning/overlay-engine.test.mjs:1629-1631
QUOTE:
```js
const REPD_RAW = gunzipSync(readFileSync(REPD_FILE)); // required in CI: never skip silently
// the export of the pinned repd_master_v8_oracle.parquet (sha256 a737d00d…) used by M-build, MR and M2-build
assert.equal(createHash('sha256').update(REPD_RAW).digest('hex'), '15cc89a79450711970b0d5be08c3c82542be2103f6e9165c56a92c7fac70f61c', 'REPD fixture bytes changed');
```
WHY: The JS form of F4, in the live atlas's CI. A missing fixture fails instead of skipping (law 4 of the brief, "a check that examined nothing refuses"). The REPD fixture is the same renewables register whose 979,338-byte projects.json is the 10th most-shared blob in the estate (task 2).
PATTERN: pinned fixture hash; missing fixture is a failure

### F6 The live pointer pins every cartridge by SHA-256 and states the shell is untouched
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/current.json:30-31
QUOTE:
```json
   "path": "./cartridges/202609241251-streaming-parquet-bridge-v9-5.js",
   "sha256": "60be8215ba873ac2886786bf6e3fd51e5764e7c5e26684fde71ebe9974a329a2",
```
WHY: The pattern behind "immutable shell plus hashed cartridges": a generation-stamped file name plus its hash in the pointer. The same entry declares `"immutable_shell_modified": false,` at current.json:41, and the field appears again at :226.
PATTERN: stamped path + sha256 in an atomic pointer

### F7 Immutability as a one-line repository invariant
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e AGENTS.md:12-13
QUOTE:
```md
- `atlas/releases/` is immutable.
- Application changes are cartridges plus manifests and an atomic `atlas/current.json` update, never another full application copy.
```
WHY: The contract every agent reads first. Line 13 also explains part of the duplicate count: the older practice of full application copies (testcode/<stamp>/pipeline/..., 89-95 copies of each file across globalgrid2050, pipelinenews and testcode, task 2 rows 6-20) is exactly what this line forbids.
PATTERN: immutable releases; change = cartridge + manifest + atomic pointer

### F8 The 12-digit generation stamp, enforced by regex
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/build.mjs:59
QUOTE:
```js
  if (!/^\d{12}$/.test(gen)) throw new Error(`--gen must be YYYYMMDDHHMM, got ${gen}`);
```
WHY: The estate's naming convention as an executable rule. Count: 7,532 tracked files have a basename matching `^[0-9]{12}-` (node_modules/vendor excluded; globalgrid2050 3,814, pipelinenews 2,657, gridatlas 737, testcode 169, cvaa 59, data-gridatlas 42, code-generator 24, data-centres-gb 21, gridmachine1 7, ventus-grid-engine 2). 45,485 tracked paths have a 12-digit segment anywhere in the path. Command: `git -C <clone> ls-tree -r --name-only <rev> | awk -F/ '$NF ~ /^[0-9]{12}-/'`, cross-checked for pipelinenews with `sed 's#.*/##' | grep -c -E '^[0-9]{12}-'` = 2,660 (3 more because vendor/ is not excluded there).
PATTERN: UTC minute stamp as identity

### F9 The same stamp law in pipelinenews, two weeks earlier
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 atman/202608262014-build-pages.py:153
QUOTE:
```python
        require(bool(GENERATION_RE.fullmatch(requested)), "generation must be latest or YYYYMMDDHHMM")
```
WHY: `GENERATION_RE = re.compile(r"^\d{12}$")` (line 38 of the same file). The file's own name carries a stamp (202608262014), which makes it the oldest of the three stamp enforcers quoted here (F8, F9, gridatlas bootstrap). The convention started in pipelinenews and spread.
PATTERN: UTC minute stamp as identity

### F10 Fact versus candidate, the estate's epistemic rule
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 README.md:33-39
QUOTE:
```md
- A statement **with** a key is a fact: anyone can recompute it on any machine and must get the
  same answer. If they get a different answer, the run is wrong, not the key.
- A statement **without** a key is a candidate. Write it as a candidate or do not write it.
- A model's text, including yours, including this repository's, is a candidate until a key
  confirms it.
- Every time carries its offset: `2026-09-18T05:33:14+01:00`, never a bare clock.
- A check that examines nothing refuses. It does not pass.
```
WHY: The source of the brief's laws. Counts: "candidate(s)" as a whole word in 4,567 files across 22 repos (479,743 lines, mostly data fields such as planning candidates); "fact(s)" in 2,670 files across 20 repos. The rule is applied to figures in EVIDENCE.md:96 ("a candidate rather than a fact").
PATTERN: fact = keyed and recomputable; everything else is a candidate

### F11 "A check that examines nothing refuses", as code
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:98-100
QUOTE:
```python
    if not blobs:
        print('FAIL: zero bodies. A check that examines nothing refuses.')
        return 1
```
WHY: The law in F10 in executable form. The same guard for repositories is at estate.py:63-65. The tool defines a Kuiper body as a distinct blob SHA. It keeps `copies` and `repos` per blob (`b = blobs.setdefault(sha, {'size': size, 'copies': 0, 'repos': set(), 'name': path})`, estate.py:82), which is why the "duplicated" figure in task 2 can be compared at all. "refus*" appears in 9,834 files across 20 repos.
PATTERN: empty input is a failure

### F12 The Kuiper's own line counter: three numbers, never conflated
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/count_lines.py:8-16
QUOTE:
```python
Three different numbers, never conflated:

  head      lines of text in distinct blobs at HEAD          measured 2026-09-19: 25,335,587
  history   lines of text in EVERY blob ever stored          8.75 GB of content, never counted
  authored  lines added by commits, from git log --numstat   the one change detection keys on

A blob with a NUL byte in its first 8,000 is binary: counted as a blob, excluded from line totals.
Distinct blobs only, so identical content in many places counts once, exactly as the Kuiper belt
counts bodies.
```
WHY: The prior denominator. This run's distinct-blob text-line count under the same rule is 25,071,989, within 1.0 % of 25,335,587. Per-path text lines (proof/denominator.tsv) total 47,227,007, so duplication accounts for about 22 million lines. inventory.tsv's 28,754,050 is neither of these numbers, and the edition should say which one it uses.
PATTERN: name the denominator; distinct blobs count once

### F13 UNVERIFIED as a licence state that fails CI
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/NOTICE:58-59
QUOTE:
```text
  https://www.neso.energy/data-portal/neso-open-licence . Marked UNVERIFIED until the
  owner confirms the amendments keep it fully open; its outputs fail ci/verify.py until then.
```
WHY: In the data-centre pipeline, UNVERIFIED is a state with a consequence (its outputs fail CI). NOTICE:77-78 does the same for the whole DNO lane: "The lane is UNVERIFIED as a whole, so / its outputs fail ci/verify.py until each DNO's licence is quoted." `\bUNVERIFIED\b` (case-sensitive) appears in only 177 files across 9 repos; kuiper-belt, which states the law, has 0 outside vendor.
PATTERN: unverified licence = failing build

### F14 Licence trio stated per folder, with inherited share-alike
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050144/NOTICE.md:6-7
QUOTE:
```md
Code in this folder is Apache-2.0, as the kuiper-belt repository (see its `LICENSE`); documentation and generated data
are CC BY 4.0. Two parts are adapted from the globalgrid2050 repository and keep its licence, CERN-OHL-S v2:
```
WHY: The estate's licence model in two lines: Apache-2.0 for code, CC BY 4.0 for docs and data, and CERN-OHL-S v2 kept for adapted globalgrid2050 parts. ODbL covers OSM-derived data. Counts (files/lines): Apache-2.0 84/199 across 11 repos; CC BY 4.0 54/101 across 7; CERN-OHL-S 25/156 across 2 (kuiper-belt 17, globalgrid2050 8); ODbL 18,272/20,300 across 11 (17,967 in globalgrid2050, mostly per-record attribution in data). The Apache License 2.0 text is one blob (d645695673349e3947e8e5ae42332d0ac3164cd7, 11,358 bytes) shared by 7 repositories (task 2, row 2). LICENSE files: 28 and NOTICE files: 20 across the estate (per repo below).
PATTERN: per-folder NOTICE; share-alike inherited by adapted parts

### F15 "Illustrative only" and "without warranty": the disclaimer idiom
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 CHAINS.md:70
QUOTE:
```md
Nothing in this file is a design. Provided as is, without warranty of any kind.
```
WHY: The exact phrase "Illustrative only: not a design" occurs once in the estate (kuiper-belt learn-the-kuiper/README.md:46, "Illustrative only: not a design study."). "without warranty" occurs in 1,320 files across 8 repos, 1,232 of them in globalgrid2050. kuiper-belt also prints it in index.html:71 ("a chart, not a design"). The disclaimer separates an illustration from engineering advice.
PATTERN: "not a design" disclaimer

### F16 [skip ci] and the end of a notification storm
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/000_freeze_all_workflows_to_manual.yml:190
QUOTE:
```yaml
            git commit -m "chore: freeze workflows to manual dispatch only [skip ci]"
```
WHY: `[skip ci]` appears in only 3 tracked files (this workflow, gridatlas .github/workflows/202608310050-gridatlas-next-version-builders.yml, pipelinenews .github/workflows/bbc-rss-discovery.yml:42). In commit messages it appears 42 times, all in pipelinenews (39 by github-actions[bot] "Refresh BBC RSS metadata and source health [skip ci]", 3 by Ventusltd). The turning point is pipelinenews@83d9c430b283f8beaa8c0a05e42b14d4a4784623 (2026-08-30T12:45:12+01:00) "202608301244: retire duplicate workflows and stop notification storm [skip ci]".
PATTERN: bot commits must not trigger CI; freeze to manual dispatch

### F17 The most shared file in the estate is a line-ending rule
KEY: elements@f7a92fb085c38dcbbd5cb469a66cd5ca61fb95bf .gitattributes:1-2
QUOTE:
```text
# Auto detect text files and perform LF normalization
* text=auto
```
WHY: blob dfe0770424b2a19faf507a501ebfc23be8f54e7b is in 9 of the 26 repositories, more than any other body. It is GitHub's repository-creation default, not authored work. Next come the Apache-2.0 LICENSE (7 repos) and the empty blob (.nojekyll, 6 repos). The estate's cross-repo sharing is mostly scaffolding and snapshot copies, not reused libraries: only 1,842 of 30,895 bodies (6.0 %) are in more than one repo.
PATTERN: scaffolding dominates cross-repo duplication

## Patterns (keyed; each cites at least one F above)

| pattern | files / lines (estate, git grep -I -c, node_modules and vendor excluded) | repos | top repos (files) | best example |
|---|---|---|---|---|
| 12-digit stamp file names `^[0-9]{12}-` | 7,532 files | 10 | globalgrid2050 3814, pipelinenews 2657, gridatlas 737 | F8, F9 |
| immutable (-i) | 3,144 / 12,676 | 17 | globalgrid2050 1319, testcode 625, pipelinenews 560, gridatlas 547 | F7, F3 |
| fail(s/ed) closed (-i) | 1,637 / 2,801 | 16 | globalgrid2050 709, testcode 394, gridatlas 274, pipelinenews 224 | F3 |
| refus(e/es/ed/al/ing) (-i) | 9,834 / 392,166 | 20 | globalgrid2050 5765, testcode 1875, pipelinenews 1327 | F1, F11 |
| sha256 / sha-256 (-i) | 11,451 / 122,977 | 21 | globalgrid2050 5552, testcode 2306, pipelinenews 1184, particle-physics 990, gridatlas 744 | F4, F6 |
| hashlib.sha256 | 380 / 891 | 16 | globalgrid2050 188, pipelinenews 60 | F4 |
| createHash('sha256') | 628 / 973 | 12 | globalgrid2050 241, pipelinenews 147, testcode 132, gridatlas 82 | F5 |
| candidate(s) (-i -w) | 4,567 / 479,743 | 22 | globalgrid2050 2507, testcode 801, pipelinenews 670 | F10, F3 |
| fact(s) (-i -w) | 2,670 / 46,907 | 20 | globalgrid2050 1402, testcode 452, gridatlas 377 | F10 |
| UNVERIFIED (-w, case-sensitive) | 177 / 716 | 9 | globalgrid2050 87, testcode 66, pipelinenews 13 | F13 |
| receipt(s) (-i) | 1,904 / 7,475 | 18 | globalgrid2050 810, pipelinenews 437, testcode 381 | F4 |
| [skip ci] (files) | 3 / 3 | 3 | one each | F16 |
| [skip ci] (commit messages) | 42 commits | 1 | pipelinenews | F16 |
| "ACCEPT " | 7 / 47 | 2 | gridatlas 6, stars 1 (stars LINES.md mirrors gridatlas lines) | F1, F2 |
| Illustrative only: not a design | 1 / 1 | 1 | kuiper-belt | F15 |
| without warranty (-i) | 1,320 / 1,723 | 8 | globalgrid2050 1232, testcode 72, kuiper-belt 10 | F15 |
| Apache-2.0 | 84 / 199 | 11 | globalgrid2050 55, kuiper-belt 12 | F14 |
| CC BY 4.0 (CC[ -]BY[ -]4\.0) | 54 / 101 | 7 | gridatlas 19, data-grid-gb 11, globalgrid2050 10 | F14 |
| CERN-OHL-S | 25 / 156 | 2 | kuiper-belt 17, globalgrid2050 8 | F14 |
| ODbL | 18,272 / 20,300 | 11 | globalgrid2050 17967, pipelinenews 165 | F14 |

Commands: `python3 -I /tmp/w20/idioms.py` (one `git -C <clone> grep -I -c <flags> <pattern> -- . ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/vendor/**'` per idiom per clone; the file count is the number of output rows and the line count is the sum). pipelinenews was rerun with `':(exclude)kuiper-edition'` (/tmp/w20/idioms_pn.py), because the first pass counted the edition's own BRIEF (for example, UNVERIFIED 17 files became 13). Caveat: refuse (392,166 lines) and candidate (479,743 lines) are inflated by data fields in JSON and CSV. File counts are the fairer measure for those two.

LICENSE / NOTICE files per repo (basename `LICEN[CS]E*|COPYING*` and `NOTICE*`, node_modules/vendor excluded): code-generator 0/0, cvaa 0/0, data-centres-gb 1/0, data-grid-gb 1/3, data-gridatlas 0/0, elements 0/0, energy-transition-simulator 0/0, galaxies-wafers 2/0, globalgrid2050 10/2, grid-distance-maths 1/1, gridatlas 2/1, gridmachine1 0/0, kuiper-belt 4/9, kuiper-drawing-engine 1/0, kuiper-ship 0/0, maths 0/0, particle-physics-drawing-engine 1/1, star-maker 0/0, stars 0/0, substations 0/0, testcode 2/1, time-stone 1/0, trillion-loop 0/0, ventus-grid-engine 1/1, worlds- 0/0, pipelinenews 1/1. Total 28 LICENSE and 20 NOTICE files. 13 of 26 repos have no LICENSE file at HEAD, and maths, which states the placement law, is one of them.

Pattern families:
- **Hash everything that moves** (F4, F5, F6): receipts are {path, sha256}; pointers pin cartridges; CI pins fixtures. This is the most widespread idiom: 21 of 26 repos.
- **Refuse, do not pass** (F1, F3, F11, F13): an empty input, a drifted hash, an unverified licence or an agent-posted acceptance each produce a failure.
- **Stamp is identity, release is immutable** (F7, F8, F9): 7,532 stamped files. This convention also drives most duplicate bodies, because each stamped snapshot copy re-tracks unchanged blobs (task 2, rows 6-20: 89-95 copies).
- **Fact or candidate** (F10, F13): it started in kuiper-belt's law and has spread to data-grid-gb's NOTICE. It is rare as the literal UNVERIFIED (9 repos).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Authors (`git -C <clone> shortlog -sn HEAD` for every clone, pipelinenews at 67aa2eb; names only; clone depth is 300 for most repos, so these are counts within each clone's window):

| name | commits | repos |
|---|---|---|
| Ventusltd | 2,060 | 25 |
| github-actions[bot] | 621 | 7 (code-generator, cvaa, data-grid-gb, data-gridatlas, pipelinenews, stars, ventus-grid-engine) |
| time-stone | 206 | 1 |
| particles-nightly | 155 | 1 |
| kuiper-engine | 146 | 1 |
| Claude | 86 | 6 (cvaa, globalgrid2050, gridatlas, kuiper-belt, pipelinenews, time-stone) |
| PipelineNews Bot | 17 | 1 |
| Vikram Kumar | 14 | 5 |
| MSI Claude (lab) | 7 | 2 |
| pipelinenews-atlas-link-bot | 2 | 1 |
| one commit each | 10 | cvaa-fleet-adopter, cvaa-full-history-repair, data-gridatlas-consumer-watchdog-repair-bot, data-gridatlas-stage-bot, Ventus Board, pipelinenews-atlas-link-release-bot, pipelinenews-ledger-count-repair-bot, pipelinenews-pages-gate-repair-bot, pipelinenews-pointer-release-boundary-bot, pipelinenews-runtime-receiver-gate-bot |
| **total** | **3,324** | 26 |

Bot share: identities with "bot" or "[bot]" in the name account for 647 commits (19.5 %). Adding named automation identities (time-stone, particles-nightly, kuiper-engine, cvaa-fleet-adopter, cvaa-full-history-repair) gives 1,156 commits (34.8 %). Claude-named identities have 93 (2.8 %). Fully automated clones: stars 300/300 (github-actions[bot]), time-stone 206/210, ventus-grid-engine 252/288 (87.5 %). kuiper-belt is 62.4 % kuiper-engine. The focus repos are almost entirely human or agent-under-owner: gridatlas 0 bot commits of 311 (41 "Claude"), data-grid-gb 3 of 15, data-centres-gb 0 of 13. Per-repo table: /tmp/w20/botshare.tsv (scratch, not published).

Cadence windows (first to last commit in each clone, %cI): pipelinenews 2026-08-24T11:39:30+01:00 to 2026-09-26T14:27:23+01:00 at 67aa2eb (521 commits, full history); gridatlas 2026-09-01T14:43:56+01:00 to 2026-10-29T23:53:53+00:00 (311 in clone); data-grid-gb 2026-09-01T17:35:14+01:00 to 2026-10-29T21:53:51+00:00 (15); data-centres-gb 2026-07-29T12:41:30+01:00 to 2026-09-01T00:25:42+01:00 (13). data-centres-gb is the oldest first commit in the estate. Bursts: galaxies-wafers 161 commits in one day (2026-09-15T17:13:57+01:00 to 23:24:46+01:00); energy-transition-simulator 113 in about 26 h; star-maker 81 overnight.

Turning points:
- pipelinenews@83d9c430b283f8beaa8c0a05e42b14d4a4784623 2026-08-30T12:45:12+01:00 "202608301244: retire duplicate workflows and stop notification storm [skip ci]" (F16).
- gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 2026-10-29T23:53:53+00:00 "202610292044-gridatlas-v9.187: release accepted data-centre Grid Engine preview": the HEAD, a release that passed the ACCEPT gate (F1).
- kuiper-belt@e08cb8719d38e2bb5611da8b778d8de6a720fb4f 2026-09-19T10:45:29+01:00 "the belt obeys the night sky: outward is backward in time": the last commit to touch kuiper-network.json, so the Kuiper's 19,441/2,154/17,287 describes the estate as of that date.
- pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 2026-09-26T14:27:23+01:00 "Restore PipelineNews to pre-priority-source changes": a revert, and the last human commit before the edition.

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- gridatlas has 1.51 M text lines, of which 1.24 M are code: the second-largest code mass after globalgrid2050 (4.17 M) and testcode (1.20 M). It has only 2 binary files (1.88 MB). It is the estate's densest user of the release idioms: 274 fail-closed files, 547 immutable, 744 sha256, 6 of the 7 ACCEPT files, and 737 stamped files.
- The data-centre lineage carries the idioms forward. data-centres-gb (F3, F4: fail closed, byte-identical twice, receipts) leads to data-grid-gb datacentres/ (F13: UNVERIFIED licence lanes fail CI), which feeds gridatlas tools/offtakers (v9.187). data-grid-gb has 0 stamped file names: its lanes are named dc-a1..dc-a7, a break from the estate convention. Its 353,739 data lines are 97 % of its text.
- Duplication touching the focus: code-generator+gridatlas share 15 blobs and globalgrid2050+gridatlas share 6; gridatlas is otherwise nearly self-contained. The 979,338-byte REPD projects.json (60e4b28f039f) is copied 94 times across data-gridatlas, globalgrid2050 and pipelinenews: the renewables register the atlas is pinned against (F5).

## Candidates (unkeyed; clearly marked)

- CANDIDATE: inventory.tsv's text_lines uses an extension allowlist (md mjs json yml txt py html ...) and counts binary-flagged text. This is proven for cvaa, data-centres-gb and stars, but not reproduced for globalgrid2050 (UNVERIFIED, delta 18.8 M).
- CANDIDATE: kuiper-network.json's "duplicated" means "blob at more than one path" (copies > 1) over the 2026-09-19 estate. Its 11.1 % ratio sits between this run's 6.0 % (repos > 1) and 13.7 % (copies > 1). No writer is in the tree to confirm.
- CANDIDATE: many "Ventusltd" commits are agent-made under the owner's token. acceptance.mjs (F1) says as much in general terms, but no per-commit signal was measured here.
- CANDIDATE: the testcode/<stamp>/pipeline snapshot copies (89-95 copies) and the repd-identities copies (117) are the main reason per-path lines (47.2 M) are nearly double distinct-blob lines (25.1 M).

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. F1 gridatlas tools/release/acceptance.mjs:15-27: the estate's answer to "the agent holds the owner's token".
2. F3 data-centres-gb README.md:8-14: five idioms in six lines; the data-centre lineage's origin.
3. F4 data-centres-gb intelligence builder :208-217: the receipt idiom in its purest form.
4. F10 kuiper-belt README.md:33-39: fact versus candidate, the source of every law in the brief.
5. F12 kuiper-belt tools/count_lines.py:8-16 together with this run's 25,071,989: the denominator, recomputed within 1 %.
6. F8 gridatlas tools/lightning/build.mjs:59: the 7,532-file stamp convention in one regex.
7. F13 data-grid-gb datacentres/NOTICE:58-59: UNVERIFIED as a build-breaking state, in the data-centre pipeline.
8. Tables: proof/denominator.tsv (the denominator the edition should cite: 72,475 tracked paths, 30,895 bodies, 47,227,007 per-path text lines, 25,071,989 distinct-blob text lines, 1.14 GB binary) and proof/duplicates.tsv (1,842 cross-repo bodies).

## One next command (exactly one, runnable from a clone)

```
mkdir -p /tmp/w20-cl && cd /tmp/w20-cl && python3 -I /home/user/estate/kuiper-belt/tools/count_lines.py --roots /home/user/estate --depth head --out /tmp/w20-cl/data
```
(This reruns the Kuiper's own counter against today's estate so that 25,071,989 can be compared with its own method. It is run from /tmp/w20-cl because count_lines.py writes `proof/<run>-counts.json` relative to the current directory (tools/count_lines.py:210, :265). Run from inside the clone, it would write into kuiper-belt. pipelinenews sits outside /home/user/estate and would need adding as a root.)
