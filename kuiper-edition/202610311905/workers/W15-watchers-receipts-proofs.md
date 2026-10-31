# W15 watchers-receipts-proofs
HEADS: time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 star-maker@f65c2f381d91eeb1eba75a97ae6765c24e32197d cvaa@877bf380202b6a922932afc0bdcfd7f42a183086 galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 elements@f7a92fb085c38dcbbd5cb469a66cd5ca61fb95bf code-generator@857ea81244848b1da8fe21fffaed74cab568a3b4 kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6
Written 2026-10-31T19:13:25Z by W15 (Opus). Read only; the one thing executed was `node inoculate.mjs . --no-write` on a copy of cvaa in /tmp/w15/cvaa, never in the clone.
READ:
time-stone/tools/watch.py
time-stone/README.md
time-stone/NOW.md
time-stone/ledger.tsv (head, tail, column stats)
time-stone/site.tsv
time-stone/.github/workflows/watch.yml
kuiper-belt/tools/check_proof.py (lines 1-140; the guard time-stone imports)
kuiper-belt/tools/estate.py (lines 1-40)
kuiper-belt/README.md (lines 96-116), kuiper-belt/SPEC.md (35-42), kuiper-belt/MEASURED.md (60-72), kuiper-belt/estate-network.json (line 1)
stars/README.md, stars/tools/README.md, stars/reports/source.json, stars/reports/CHEMISTRY.md (head), stars/reports/CLASSIFICATION.md (head), stars/reports/RANDOM.md (head)
stars/.github/workflows/refresh.yml, stars/.github/workflows/modular-star.yml
stars/modular-star/check-permanent.mjs
stars/library/standalone.mjs (8070-8080)
star-maker/README.md, star-maker/SKY.md (head), star-maker/machinery/bench/starmaker.mjs (1-12, 84-115, 186-215), star-maker/stars/*.json (verdict counts only)
cvaa/README.md, cvaa/inoculate.mjs, cvaa/vaccines.lock, cvaa/vaccines/202608301810-no-time-based-gates.md, cvaa/vaccines/202609261425-observed-before-asserted.md, cvaa/.github/workflows/202608301447-selftest.yml (grep)
galaxies-wafers/README.md, galaxies-wafers/wafer.mjs, galaxies-wafers/build/build_layers.py (grep, 105-120), galaxies-wafers/proof/checks.mjs (136-146), galaxies-wafers/proof/wafer.check.mjs, galaxies-wafers/layers/pipeline-news.json (first 700 bytes)
elements/README.md, elements/CATALOGUE.md (head), elements/catalogue/provenance.json (counts), elements/tests/check_catalogue.py (160-246)
code-generator/README.md, code-generator/generate.mjs (grep), code-generator/tools/check-assembly.mjs (grep)

## Findings (keyed)

### F1 The ledger is opened for append, never for write; 1,078 lines added, 0 deleted in all history
KEY: time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf tools/watch.py:127-131
QUOTE:
```python
    for path, head, add in ((lp, '# seen_unix\trepository\tpushed_at\n', add_l), (sp, '# seen_unix\tstatus\turl\n', add_s)):
        if not os.path.exists(path):
            io.open(path, 'w', encoding='utf-8', newline='\n').write(head)
        if add:
            io.open(path, 'a', encoding='utf-8', newline='\n').write(add)
```
WHY: Append-only is enforced by the file mode, not by a promise: the only `'w'` on a ledger is when it does not yet exist, and it writes only the header. The docstring states the law (`tools/watch.py:9-11`: "ledger.tsv   APPEND ONLY. ... Old rows are never rewritten, so this is a record of the future arriving, in the order it arrived."). Git agrees: `git -C time-stone log --numstat --format= -- ledger.tsv | awk '{a+=$1;d+=$2} END{print a,d}'` gives `1078 0`. `wc -l ledger.tsv` = 1078 (1 header + 1,077 rows, 92 distinct repositories, 206 distinct `seen_unix` batches); `site.tsv` = 7 lines (1 header + 6 rows).
PATTERN: append-only ledger (mode-enforced)

### F2 The digest guard: the watcher refuses to write if any token hashes to a name that is not public
KEY: time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf tools/watch.py:33-34,117-119
QUOTE:
```python
sys.path.insert(0, os.environ.get('KB_TOOLS', os.path.join(ROOT, 'kb', 'tools')))
from check_proof import leaks                       # the guard lives in kuiper-belt; one copy, not two
...
    if leaks(add_l + md):
        print('REFUSED (L6): a name that is not public is in the result; nothing written')
        return 2
```
WHY: The guard runs over everything about to be written (new ledger rows plus the whole NOW.md) before a single byte is written, and imports the one canonical guard rather than copying it ("one copy, not two"). The workflow sparse-checks kuiper-belt/tools into `kb/` to make the import resolve (`.github/workflows/watch.yml:23-27`).
PATTERN: pre-write privacy gate, single-source guard

### F3 The guard does not spell what it guards: names held as truncated SHA-256 digests; returns how many, never which
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/check_proof.py:47-55
QUOTE:
```python
def leaks(text):
    """Every run of name characters is hashed, whole and with its leading path stripped, and
    compared with the digests. Returns how many tokens matched, never which."""
    n = 0
    for tok in set(re.findall(r'[A-Za-z0-9_][A-Za-z0-9_.-]*', text)):
        for t in {tok, tok.rstrip('.'), tok.split('/')[-1]}:
            if hashlib.sha256(t.lower().encode()).hexdigest()[:24] in NOT_PUBLIC:
                n += 1
    return n
```
WHY: The reason is written at `tools/check_proof.py:23-25`: "THE GUARD DOES NOT SPELL WHAT IT GUARDS. An earlier guard listed the private repository names in plain text inside a public repository, which is the leak it existed to prevent." A plaintext deny-list in a public repo is itself the leak; a digest list (`NOT_PUBLIC`, line 42, six 24-hex digests) can be published. Returning a count, not the match, keeps the failure message from leaking too.
PATTERN: digest deny-list (guard by hash, report by count)

### F4 No answer is not the same as no change
KEY: time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf tools/watch.py:92-96
QUOTE:
```python
    try:
        repos = public_repos()
    except Exception as e:
        print('FAIL: GitHub did not answer (%s); nothing written' % type(e).__name__)
        return 1
```
WHY: A watcher that treated an outage as "nothing changed" would silently append nothing and look healthy; worse, one that treated it as an empty repository list would rebuild NOW.md empty. Exit 1 makes the Actions run red and the "Commit only what changed" step never runs. The docstring states it at line 20: "If GitHub cannot be reached nothing is written, exit 1: no answer is not the same as no change." This is the estate's law 4 ("a check that examined nothing refuses") in 5 lines.
PATTERN: fail closed on silence

### F5 The mirror: a watcher that watches itself never rests
KEY: time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf tools/watch.py:15-16
QUOTE:
```python
THE MIRROR. This repository does not watch itself. Its own commits would change its own push time,
which it would then record, which would be a commit: a watcher that watches itself never rests.
```
WHY: Names and closes a feedback loop that every self-recording bot can fall into. Enforced in code at `tools/watch.py:64` (`... and r['name'] != SELF]`), with `SELF = 'time-stone'` at line 32. See History: the stars repo shows what the loop looks like when only half-closed (F17).
PATTERN: self-exclusion of the observer

### F6 cvaa: every vaccine must match its sha256 in vaccines.lock, or the whole registry refuses; at HEAD it does refuse
KEY: cvaa@877bf380202b6a922932afc0bdcfd7f42a183086 inoculate.mjs:60,71
QUOTE:
```javascript
  if (lock) { const h = sha256(text); if (lock[f] !== h) registryErrors.push(`${f}: sha256 ${h.slice(0, 12)} not in vaccines.lock (run: node inoculate.mjs --lock)`); }
if (registryErrors.length) { console.error('REGISTRY INVALID (fail closed)\n' + registryErrors.map(e => '  - ' + e).join('\n')); process.exit(1); }
```
WHY: A receipt-by-hash for code that judges other code: an antibody that was edited without re-locking is refused, not run. Verified live: on a /tmp copy of the clone at this HEAD, `node inoculate.mjs . --no-write` printed `REGISTRY INVALID (fail closed)`, `202609261425-observed-before-asserted.md: dose must be one of every-loop|every-deploy|every-commit` and `... sha256 cf471d0c0ef8 not in vaccines.lock`, exit 1. `ls vaccines | wc -l` = 41; `grep -c '\.md"' vaccines.lock` = 40. The README's step 2 (`README.md:7`: "Run `node inoculate.mjs .` here. The registry must report immune against itself.") does not hold at HEAD. The guard worked exactly as designed: it refused itself.
PATTERN: hash-locked registry, fail closed on the registry before any verdict

### F7 Refusing to emit findings from a runner that never ran
KEY: cvaa@877bf380202b6a922932afc0bdcfd7f42a183086 inoculate.mjs:283-287,299-302
QUOTE:
```javascript
      // A non-zero exit with empty stdout is the runner failing to start, not the antibody
      // reporting. Different diseases; say which one, and never dress the first as a finding.
      if (!out.trim()) return resolve({ ok: false, fatal: code !== 0, e: code !== 0
        ? `antibody runner exited ${code} before running: ${err.trim().slice(0, 160) || 'no stderr'}`
        : 'antibody produced no result' });
...
  if (res.fatal) { console.error(`fatal: ${res.e}`); console.error('       every vaccine would report this. Refusing to emit findings from a runner that never ran.'); process.exit(2); }
  /* An antibody that cannot evaluate its question must not answer it. Before this,
     any non-array return was coerced to [] by the runner and printed as `immune`,
     so a rule that never ran reported the same word as a rule that passed. */
```
WHY: The sharpest statement in the slice of "a check that examines nothing refuses": a dead runner is distinguished from a failing antibody, and a rule that never ran may not say `immune`. The comment records the bug it cured. The README confirms the history (`README.md:44`: "it has previously reported findings while dead").
PATTERN: distinguish "did not run" from "ran and passed"

### F8 "Immunity is not established": skipped rules downgrade the verdict, but not the exit code
KEY: cvaa@877bf380202b6a922932afc0bdcfd7f42a183086 inoculate.mjs:400-405
QUOTE:
```javascript
/* Immunity is a claim about rules that ran. Saying `immune to all vaccines on file`
   while some were never evaluated is the false pass this repository exists to stop. */
console.log(findings ? (baseline.written ? '\nbaseline written; rerun cvaa to prove the dated warnings' : `\n${findings} finding(s); repo is not immune`)
  : (skipCount ? `\nno findings, but ${skipCount} rule(s) were not evaluated; immunity is not established`
               : '\nrepo is immune to all vaccines on file'));
process.exit(baseline.written ? 0 : findings ? 1 : 0);
```
WHY: The words refuse the false pass, and CI pins the words (`.github/workflows/202608301447-selftest.yml:46` tests the last line equals `no findings, but 1 rule(s) were not evaluated; immunity is not established`). But line 405 exits 0 when `skipCount > 0`, so a gate that reads only the exit code would treat "not established" as green. An honest edge worth naming in the edition: the refusal lives in the text, not yet in the exit code.
PATTERN: verdict vocabulary with three states (immune / not immune / not established)

### F9 A check proves nothing until it fails: 33 deliberately broken copies must each be caught first
KEY: elements@f7a92fb085c38dcbbd5cb469a66cd5ca61fb95bf tests/check_catalogue.py:230-240
QUOTE:
```python
    for name, mutate in mutations:
        broken = copy.deepcopy(cat)
        mutate(broken)
        if not problems(broken, prov, exp, keyset):
            sys.exit(f"a broken copy passed ({name}); the check proves nothing until it fails")
    for name, mutate in prov_mutations:
        broken_prov = copy.deepcopy(prov)
        mutate(broken_prov)
        if not problems(cat, broken_prov, exp, keyset):
            sys.exit(f"a broken provenance passed ({name}); the check proves nothing until it fails")
    print(f"{len(mutations) + len(prov_mutations)} broken copies each fail as required")
```
WHY: Mutation-testing the checker before it may pass the real data. A check that cannot see a deliberate fault examines nothing, so it refuses to run. The README gives the count (`README.md:25`: "Before the real catalogue may pass, 33 deliberately broken copies must each fail."). Same idea as cvaa's selftest ("every antibody must fire on its diseased fixture", `cvaa/README.md:8`).
PATTERN: mutation-first checker (the check must fail broken copies before it may pass)

### F10 Permanent numbers: refuse to save a database in which any earlier number changed meaning or vanished
KEY: stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 modular-star/check-permanent.mjs:7-13
QUOTE:
```javascript
let bad = 0;
for (const [table, key] of [['line', 'sha'], ['tablet', 'git_blob'], ['family', 'sha'], ['element', 'sha']]) {
  const r = db.prepare(`SELECT count(*) c, (SELECT count(*) FROM old.${table}) total FROM old.${table} o LEFT JOIN main.${table} m ON m.n = o.n AND m.${key} = o.${key} WHERE m.n IS NULL`).get();
  console.log(`${table}: ${r.total} earlier numbers, ${r.c} changed or missing`);
  bad += Number(r.c);
}
if (bad) { console.error('Permanent numbers were broken; refusing to save this database.'); process.exit(1); }
```
WHY: The append-only law applied to a SQLite database: an anti-join of old against new on (number, content hash) for four tables. It runs in `modular-star.yml:84-86` before the "Save the database and catalogue" step (line 93), so a broken numbering never reaches the release. The restore step makes sure there is something to compare against (`modular-star.yml:41`: "# The release exists, so the database must come back; never start again from zero."). These permanent line keys are the ones the wafer places (F13).
PATTERN: append-only by anti-join (old rows must survive with the same hash)

### F11 Seeded by hash: a star's id is sha1(generation + choice), so a pass is idempotent and any star can be regenerated
KEY: star-maker@f65c2f381d91eeb1eba75a97ae6765c24e32197d machinery/bench/starmaker.mjs:86-91
QUOTE:
```javascript
const starId = (gen, choice, query = '') => createHash('sha1').update(gen + JSON.stringify(choice) + query).digest('hex').slice(0, 12);

async function makeStar(gen, seed, replayOf = null) {
  const id = replayOf || starId(gen, seed.choice, seed.query || '');
  const file = path.join(SKY, 'stars', `${id}.json`);
  if (!replayOf && await exists(file)) return null;
```
WHY: Content-addressed test identity. The same GridAtlas generation plus the same composition always gives the same file name, so a restarted pass skips what is done ("A pass is idempotent: restarting loses nothing", `README.md:83-84`). The README states it (`README.md:13-16`: "the seed is `sha1(source generation + choice)`, so the same composition always has the same star id, a pass is idempotent, and anyone can regenerate any star by driving its seed again."). Counted: `ls stars | wc -l` = 4228; `grep -h '"verdict"' stars/*.json | sort | uniq -c` = 3269 GREEN, 959 RED; `git ls-files shots | wc -l` = 959, matching the law "Screenshots only for non-green stars".
PATTERN: seeded-by-hash reproducibility (content-addressed test runs)

### F12 Same seed, same star; a disagreement is a finding, recorded as an appended replay
KEY: star-maker@f65c2f381d91eeb1eba75a97ae6765c24e32197d README.md:115-116
QUOTE:
```markdown
- Stars are evidence, never edited. A wrong star is superseded by a new generation, not rewritten.
- Same seed, same star. If two runs of one seed disagree, that is a finding, not a tie — record both.
```
WHY: Implemented at `machinery/bench/starmaker.mjs:96-101`: a replay compares verdict and exception texts, appends `{ at, host, verdict, same, ... }` to `prev.replays`, and returns `SAME` or `DIFF` (and line 192: "A DIFF is a finding (flakiness, network, time)."). The original star's fields are kept; only the `replays` array grows. Counted: `grep -l '"replays"' stars/*.json | wc -l` = 0, so no replay has yet been committed to the sky at this HEAD. The mechanism exists; the evidence of it running does not.
PATTERN: replay-as-append (reproducibility measured, disagreements kept)

### F13 The frozen substrate: a point's place is a pure function of its permanent number
KEY: galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 wafer.mjs:38-47
QUOTE:
```javascript
 * TO CHANGE THIS FILE is to invalidate every layer, link and record that has
 * ever pointed at the galaxy. If a different arrangement is wanted, it is a new
 * substrate with a new name beside this one, never an edit to this one.
 */

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const SUBSTRATE = Object.freeze({
  id: 'wafer.v1',
  law: 'r = sqrt(key); theta = key * goldenAngle',
  frozen_utc: '2026-09-15T15:00:00Z',
```
WHY: Append-only for geometry: versioning by new name, never by edit. `git -C galaxies-wafers log --format=%h -- wafer.mjs` returns one commit (0a7e2a9), so the freeze has held. Lines 16-18 give the reproducibility claim ("A point's place is a pure function of its own permanent number and of nothing else. Not of what else exists, ... not of a random seed."). The proof is honest about its reach (`proof/checks.mjs:139-141`: "That is determinism of the function, not a measurement of every device ... the claim beyond this process is an argument rather than a test").
PATTERN: frozen substrate, new versions beside, never over

### F14 A layer may not invent a key; every source it read is hashed into the layer
KEY: galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 build/build_layers.py:105-117
QUOTE:
```python
def write_layer(layer: dict, features: list, stats: dict, sources: list) -> Path:
    for f in features:
        g = f["geometry"]
        keys = [g["key"]] if g["type"] == "Point" else g["keys"]
        for k in keys:
            if k not in ESTATE["keyset"]:
                raise SystemExit(f"layer {layer['id']} names key {k}, which the numbered database does not "
                                 "contain. A layer may not invent a key.")
    doc = {
        "type": "CodeFeatureCollection",
        "substrate": SUBSTRATE,
        "layer": layer,
        "provenance": {"built_utc": NOW, "sources": sources},
```
WHY: The layer format carries keys, never coordinates (`README.md:11`), so this is how pipelinenews or gridatlas lines become dust on the wafer: a function in pipelinenews is found in the numbered database and drawn at `place(key)`. `layers/pipeline-news.json` opens with a Point at key 36521 for `hydrateFiltersFromUrl`, with `"commit":"c23329c1..."`, `"first":371,"last":389`, `"runtime_replayed":false`: a receipt that says what was and was not replayed. Each source in `provenance.sources` carries a `sha256` (lines 63-64, 91).
PATTERN: closed key space + source receipts by hash

### F15 A refusal is read; a default is obeyed
KEY: stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 library/standalone.mjs:8073-8079
QUOTE:
```javascript
  /* THE GUARD. Written the way the sibling string program writes one: a value
     the engine cannot hold is refused in words, never defaulted.
     DEFAULTING IS WORSE THAN REFUSING, and not as a matter of taste. A typed
     word where a number belongs becomes NaN, and every verdict below was
     written `v > limit`. NaN > 1500 is false, so the garbage came back as
     "inside the 1500 V rating by NaN V" - a PASS, in the voice of an answer.
     A refusal is read; a default is obeyed. */
```
WHY: The best one-line statement in the slice of why refusal beats defaulting, with the concrete failure (NaN comparisons are always false, so a `v > limit` check passes garbage). It sits in the compiled library of functions that appear in two or more places, so it is a pattern already copied, and the same block appears again at lines 8345-8350 (`grep -n "A refusal is read" library/standalone.mjs` gives two hits).
PATTERN: refuse, never default (NaN-safe gates)

### F16 The wafer contract {stations, edges}, and "no edges, because an unmeasured edge would be a claim without a key"
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 estate-network.json:1
QUOTE:
```json
"law":"one body per distinct blob SHA; r = a_min + (a_max - a_min) * sqrt((k + 0.5) / n) with k the body ordinal among sorted keys; theta = k * 2.399963229728653; class is a property and never a position; no edges, because an unmeasured edge would be a claim without a key"
```
WHY: The translator contract is `{ "stations": [ { "id", "x", "y", "m", "class", "open" } ], "edges": [ { "from", "to", "w" } ] }` (`README.md:113-114`), and `tools/estate.py:11-14` promises "a byte identical estate-network.json on any machine". The published file carries `"edges":[]` on purpose. The key law (no claim without a key) is applied to the graph itself: an empty edge list is the honest answer. (kuiper-belt is outside this slice; read only for the contract the galaxies-wafers translator eats.)
PATTERN: empty is honest (unmeasured relationships are not drawn)

### F17 "Save only when there are new test results", undone by a timestamp: 198 commits over one unchanged source
KEY: stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 .github/workflows/refresh.yml:76-84
QUOTE:
```yaml
      - name: Save if anything changed
        run: |
          printf '{\n  "source_repository": "Ventusltd/star-maker",\n  "source_commit": "%s",\n  "test_results_read": %s\n}\n' "$SOURCE_SHA" "$STAR_COUNT" > reports/source.json
          python3 spider/register.py
          git add reports spider
          if git diff --cached --quiet -- reports/source.json spider; then
            echo "No new test results since the last refresh." >> "$GITHUB_STEP_SUMMARY"
            exit 0
          fi
```
WHY: The receipt (`reports/source.json` = `{"source_commit": "f65c2f3", "test_results_read": 4228}`, which matches star-maker HEAD f65c2f3 and its 4228 star files) is the right idea. But the diff also watches `spider`, whose `features.yml` carries `graph_generated_utc`, so every run is a "change". `git -C stars log --format=%s | grep '^Reports' | sort | uniq -c` = `198 Reports from star-maker f65c2f3 (4228 test results)`, every one over the same input. The HEAD commit cbca125 changes only timestamps (`graph_generated_utc: "2026-10-31T18:39:26.066Z"` to `"2026-10-31T18:47:05.530Z"`). The README promise (`README.md:26`: "It saves a new version of the reports only when there are new test results.") is not what happens. Contrast: time-stone's NOW.md deliberately carries no run time, so its "commit only what changed" (F18) holds.
PATTERN: anti-pattern: timestamp churn defeats change-only commits

### F18 Commit only what changed, on GitHub's machine, with the watcher failing closed first
KEY: time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf .github/workflows/watch.yml:28-38
QUOTE:
```yaml
      - name: Watch, and fail closed
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: python3 tools/watch.py
      - name: Commit only what changed
        run: |
          git config user.name "time-stone"
          git config user.email "actions@users.noreply.github.com"
          git add ledger.tsv site.tsv NOW.md
          git diff --cached --quiet && exit 0
          git commit -q -m "watch: what changed"
```
WHY: A 40-line workflow with `timeout-minutes: 5`, `concurrency: watch`, no assistant, no paid credit. The bot can only stage the three output files, and history confirms it touched nothing else: over its 206 commits, `git show --numstat` gives NOW.md 206, ledger.tsv 206, site.tsv 3, and no code file. The watcher's code (tools/watch.py) has never been changed since its first commit c565af1.
PATTERN: least-surface bot (writes only its outputs)

### F19 Inputs pinned by sha256: "served bytes changed since the build" stops the check
KEY: elements@f7a92fb085c38dcbbd5cb469a66cd5ca61fb95bf tests/check_catalogue.py:166-175
QUOTE:
```python
    prov = load("catalogue/provenance.json")
    reg_bytes = (ROOT / prov["register"]["copy"]).read_bytes()
    if hashlib.sha256(reg_bytes).hexdigest() != prov["register"]["sha256"]:
        sys.exit("register copy does not match its recorded sha256")
    register = json.loads(reg_bytes)
    pack = {}
    for src in prov["numbered_database"]:
        b = urllib.request.urlopen(src["url"], timeout=120).read()
        if hashlib.sha256(b).hexdigest() != src["sha256"]:
            sys.exit(f"served bytes changed since the build: {src['url']}")
```
WHY: A receipt applies only to the inputs it consumed (the cvaa README's own wording at `cvaa/README.md:44`: "a verdict must not outlive the inputs it consumed"). What elements indexes: 244 elements, 7 apps, 97 surfaces, 5,720 of 10,985 function families, over 250,174 numbered lines, highest key 342,795 (`catalogue/provenance.json:44-52`). Those two numbers agree across three repos: kuiper-belt `MEASURED.md:68` ("wafer dust | 250,174") and galaxies-wafers `wafer.mjs:28` ("The estate's line numbers run to 342,795 today").
PATTERN: hash-pinned inputs (receipts expire when inputs change)

## Patterns (keyed; each cites at least one F above)

1. **Append-only, enforced by mechanism, not by promise.** Enforced by file mode (F1), by an anti-join on (number, hash) before saving (F10), by a frozen file versioned only by new name (F13), and by appending replays rather than rewriting a star (F12). The test for each: can you show 0 deletions? time-stone can (1078 added, 0 deleted).
2. **Guard by digest, report by count.** F2 and F3: the deny-list is published as truncated SHA-256 and the result reveals how many matched, never which. This is the only way a public repo can carry a privacy guard without becoming the leak.
3. **Silence is not success.** The estate's law 4, in five forms: F4 (no answer, nothing written, exit 1), F7 (a runner that never ran may not report), F8 (skipped rules mean "not established"), F9 (a checker must fail 33 broken copies before it may pass), F16 (an unmeasured edge is not drawn).
4. **Receipts with hashes.** F6 (vaccines.lock), F14 (layer provenance sha256), F17 (reports/source.json names the source commit and count), F19 (provenance pins and "served bytes changed"). A receipt is valid only for the exact bytes it names.
5. **Seeded-by-hash reproducibility.** F11 (star id = sha1(generation + choice)), F13 (place(key) a pure function), F16 (byte-identical estate-network.json). Identity comes from content, so idempotence and regeneration are free.
6. **Refuse, never default.** F15 states it; F2, F6, F10 and F14 do it ("REFUSED (L6)", "REGISTRY INVALID (fail closed)", "refusing to save this database", "A layer may not invent a key").
7. **The observer must not observe itself, and must not create its own noise.** F5 closes the loop by self-exclusion; F17 shows the half-closed version, where a timestamp in the output makes every run a "change". (stars is the most-seen row in time-stone's ledger: 206 of 206 batches.)

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

- **time-stone, 210 commits, full history** (initial commit present). `git -C time-stone log --format=%an | sort | uniq -c`: **206 time-stone (the bot), 3 Claude, 1 Ventusltd**. Humans and agents wrote it in four commits on one afternoon: 02e1adfca8cb2cb1fbb9b73c9673ab69db09c41f Ventusltd 2026-09-19T15:12:04+01:00 "Initial commit"; c565af10e83f3cf52fb8aa3a53368f1cfdcd696c Claude 2026-09-19T15:13:41+01:00 "time stone: an hourly watcher on GitHub Actions that records only what changed" (204 insertions, all four code files); d5b60546ec857df828b0b5f3662bd73e2e043b5a and 73beda796a86626e30e3372f7e654337fe53b8d0 Claude (licence MIT then Apache 2.0, 2026-09-19T17:52:32+01:00 and 19:09:42+01:00). Since then only the bot: first bot commit d84683cdeacc1fdd09b81aacc514582e969cb0df 2026-09-19T14:13:59+00:00, HEAD a1703b1bb0170ed0f0c162126315049fa157d3bf 2026-10-31T17:49:28+00:00.
- **Cadence of the hourly watcher is about 5 hours.** The cron is `'23 * * * *'` (watch.yml:7), but over 206 bot commits the gaps average 4.93 h, max 10.57 h (`git log --format=%ct --author=time-stone | awk` over consecutive differences). Every bot commit added ledger rows (206 distinct `seen_unix` = 206 bot commits), and `stars` appears in all 206 batches, so a successful run almost always had something to commit. The gaps therefore measure runs that fired, not quiet hours. Daily commit counts run 3 to 8, every day from 2026-09-19 to 2026-10-31 without a missing day.
- **One storm in site.tsv:** ead8e080c888f9e40645c0943b624111a818dc9d 2026-09-27T14:08:47+00:00 recorded `503 https://ventusltd.github.io/faraday/` (site.tsv:6, seen_unix 1790518126 = 2026-09-27T14:08:46Z); df50809b4f26b4524d6f9dcc001be1405adccdee 2026-09-27T18:30:50+00:00 recorded it back at 200 (site.tsv:7). About 4 h 22 m down, on record only because the watcher writes changes of answer.
- **stars, 300 commits in clone (depth 300), all github-actions[bot]**, from 0f6ed8f284fa753b341c857b1513a708c3a28ad1 2026-10-12T09:27:56+00:00 to cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 2026-10-31T18:47:06+00:00. Split: 198 "Reports from star-maker f65c2f3 (4228 test results)", 102 "Modular star ...". 12 to 21 commits a day. The 198 are the timestamp-churn storm of F17.
- **star-maker, 81 commits, full history, all Ventusltd**, 54 on 2026-09-13 and 27 on 2026-09-14 (first 2c4c0a7f1718e84f0130756b1a92bd34ac92a097 2026-09-13T22:54:32+01:00). The sky stopped growing there: stars/ was last touched by a374236a93bde52ef99c725948183ad81d1f6a9d 2026-09-14T02:34:30+01:00. SKY.md was last regenerated by 63f521332437c862ff77dc0304f8568ca619c7e8 2026-09-14T00:11:46+01:00 and says "3638 stars" (SKY.md:1), while stars/ holds 4228. That contradicts `README.md:22` ("Regenerated on every push"). stars/reports (CHEMISTRY.md, "4228 compounds from 4228 stars") is the current count.
- **cvaa, 61 commits, full history:** Ventusltd 48, Claude 9, github-actions[bot] 1, cvaa-full-history-repair 1, cvaa-fleet-adopter 1, MSI Claude (lab) 1. 26 commits on 2026-08-30 (the founding day), then a long tail of single days to 2026-10-05. **Turning point:** ade46889126c0e1ebd3bda9dba5fa4f4af049adf Ventusltd 2026-09-26T14:32:24+01:00 "Add observed-before-asserted live mutation vaccine" added one file (48 lines) without updating vaccines.lock and with dose `every-live-mutation`, which the registry does not accept. The next commit to the registry, d766f2e450145a60b1c406bcac7e93f1e77d20e1 2026-09-27T23:08:06+01:00, locked a different vaccine (site-tile-stream) and not this one. From that commit on, the registry refuses itself (F6). Fittingly, the vaccine that broke it is the one against claiming "live" without a runtime receipt.
- **galaxies-wafers, 161 commits, all Ventusltd, all on 2026-09-15**: a one-day build storm. wafer.mjs was written once, in 0a7e2a9872d33306a4d27751b7af633ae570590a 2026-09-15T17:20:14+01:00 "Wafer substrate, frozen, with layers in Grid Atlas's grammar", and never touched again.
- **elements** 7 commits (Ventusltd); **code-generator** 12 (Ventusltd 7, github-actions[bot] 5).

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- **time-stone is the independent clock on the gridatlas release.** `grep -c -P '\tgridatlas\t' ledger.tsv` = 21 rows; 12 of them are from 2026-10-26 to 2026-10-29. Same-batch pairs record data-grid-gb and gridatlas moving together: ledger.tsv:1033-1034 (`1793308473 data-grid-gb 2026-10-29T20:47:29Z`, `1793308473 gridatlas 2026-10-29T20:48:49Z`) and ledger.tsv:1036,1040 (`data-grid-gb 2026-10-29T22:11:07Z`, `gridatlas 2026-10-29T23:53:54Z`). That bracket matches the data-centre Grid Engine release (generation 202610292044, per BRIEF). data-grid-gb has 4 ledger rows in total; data-centres-gb has 1 (ledger.tsv:16, pushed 2026-08-31T23:25:44Z, unchanged since). The ledger is a third-party, append-only witness that the datacentre producer (data-grid-gb) pushed before the map (gridatlas) on release day.
- **star-maker drives GridAtlas compositions.** Every star is a GridAtlas generation plus a choice of cartridges (README:30-38: live 1, unplug 15, version ~131, constellation ~4,150). The DC engine (`06b-dc-engine.js`) is not yet a seed: star-maker's sky stopped on 2026-09-14 at source generation 202609080850. A star pass on generation 202610292044 would be the reproducible regression test for the data-centre release.
- **cvaa's `observed-before-asserted` vaccine** is exactly the rule the gridatlas release needs ("fixed", "live" claims require a runtime receipt tied to the deployed identity). It is the vaccine that is currently unlocked (F6).
- **galaxies-wafers already has a `pipeline-news` layer** (F14) whose features carry pipelinenews source spans by commit and line. A `dc-engine` layer built the same way would put the data-centre engine's functions on the wafer under the same key law.

## Candidates (unkeyed; clearly marked)

- CANDIDATE: the ~5 h effective cadence of time-stone is most likely GitHub's scheduled-workflow throttling on a low-activity repo. Run history is not visible from a clone (GitHub API not available to workers), so failed runs cannot be told apart from runs that did not fire.
- CANDIDATE: galaxies-wafers `proof/wafer.check.mjs:9` reads data from `../../202609142202/data/`, a path that exists in globalgrid2050/testcode and not in this repo. Run from the clone it would throw rather than pass, which is fail-closed, but it means the wafer proof cannot be run from galaxies-wafers alone. Not executed (UNVERIFIED by run; the directory is absent: `test -d ../202609142202` false).
- CANDIDATE: the stars refresh fix is one line: exclude `graph_generated_utc` from the diff, or drop `spider` from the `git diff --cached --quiet -- ...` path list, so that `reports/source.json` alone decides.
- CANDIDATE: cvaa's exit code for "not established" (F8) should probably be non-zero (for example 3) so that gates which read only the exit status refuse too.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. **time-stone tools/watch.py:20** ("no answer is not the same as no change"): the cleanest statement of fail-closed in the estate, in 13 words, with F4's code behind it.
2. **kuiper-belt tools/check_proof.py:23-25** ("THE GUARD DOES NOT SPELL WHAT IT GUARDS"), with F3: a privacy guard that can be published.
3. **cvaa inoculate.mjs:299** ("Refusing to emit findings from a runner that never ran."): law 4 as code, plus the historical bug in the comment below it.
4. **elements tests/check_catalogue.py:234** ("the check proves nothing until it fails"): the mutation-first checker.
5. **stars library/standalone.mjs:8079** ("A refusal is read; a default is obeyed."), with the NaN > 1500 story.
6. **star-maker machinery/bench/starmaker.mjs:86** (star id = sha1(gen + choice)) and README:116 ("Same seed, same star ... that is a finding, not a tie").
7. **stars modular-star/check-permanent.mjs:13** ("Permanent numbers were broken; refusing to save this database.") and **time-stone tools/watch.py:131** (append mode) together: append-only, in a database and in a TSV.
8. **galaxies-wafers wafer.mjs:38-40** ("a new substrate with a new name beside this one, never an edit to this one").
9. As an honest counter-example: **cvaa inoculate.mjs:60/71** refusing its own registry at HEAD (F6), and **stars refresh.yml:81** with its 198 identical-source commits (F17). The edition should show the laws catching their own makers.

## One next command (exactly one, runnable from a clone)

```bash
cd /home/user/estate/cvaa && git log --format='%H %ad %an %s' --date=iso-strict ade46889126c0e1ebd3bda9dba5fa4f4af049adf..HEAD -- vaccines vaccines.lock inoculate.mjs
```
