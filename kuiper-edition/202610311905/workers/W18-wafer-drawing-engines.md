# W18 wafer-drawing-engines

Written 2026-10-31 by worker W18 (Opus). Read only; nothing in any clone was changed.

HEADS:
- particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 (300 commits in clone, shallow)
- testcode@d09c185c8dacbc5c73afb2b0d0d8dad40745a544 (189 commits, full)
- galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 (161 commits)
- globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f (304 commits, shallow): this repo holds `testcode/wafer-development-environment/` and `testcode/202609151413/`
- kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 (read only for the contract and its producer)
- stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 (read only for LINES.md)

All six HEADs match `proof/inventory.tsv`.

**Where the brief's locations are wrong (UNVERIFIED as given).** The `testcode` clone does **not** contain
`wafer-development-environment` or any `202609151413` page. `git -C testcode log --all --name-only | grep -i 'wafer-development\|202609151413'`
returns nothing. Both live in **globalgrid2050** under `testcode/`, because globalgrid2050 is what is served at
globalgrid2050.com/testcode. The particle README cites `202609151413/?law=wafer` (README.md:11), not `?law=field`.
`field` is one of the ten laws on that page (physics.mjs:197). The galaxies-wafers README cites
`testcode/202609151339`, not 202609151413 (galaxies-wafers README.md:5).

READ:
- particle-physics-drawing-engine: README.md, FORMULA.md, tools/particles.py, tools/networks.py, tools/geometry.py, tools/fault.py, tools/spiral_vs_stack.py, tools/scope_check.py, .github/workflows/particles.yml, .github/workflows/nightly.yml, measurements/exactness-result.txt, measurements/packing-result.txt, measurements/shader-law-result.json, measurements/coax-field-test.mjs, measurements/coax-field-result.json, results/SCOPE-STATUS.md, results/20261031T1245Z/*.json, results/msi/20261004T1740Z/*.json, stones/STONE-20260918T024634Z-msi-one-galaxy-every-system.md
- globalgrid2050: testcode/wafer-development-environment/202609190330-cable-cross-sections/{pilot.mjs, app.mjs, read.mjs, kuiper-weigh.mjs, proof/kuiper-pulse.check.mjs, QUANTUM-STAR-PROTOCOL.md, kuiper-network.json, estate-network.json, cable-network.json, cable132-network.json, fault-network.json, line-index.json}, testcode/202609151413/{physics.mjs, app.mjs}, testcode/202609142202/data/all-lines.meta.json
- kuiper-belt: README.md:95-140, SPEC.md (grep), NEXT.md:20-40, tools/estate.py:1-16,145-184
- stars: LINES.md:1-8
- testcode: README.md, engines.json (head), sandbox/2026091518*-galaxy-bond/{README.md, wafer.mjs, bond_validator.py (grep)}, sandbox/202609151852-galaxy-visibility/wafer.mjs, .github/workflows/galaxy-bond-verify.yml
- galaxies-wafers: README.md, wafer.mjs, build/build_layers.py:100-114, iterations/36-elements-assembly/wafer.mjs (diff)

Counts (commands cited):
- 60 dated wafer versions: `ls -d globalgrid2050/testcode/wafer-development-environment/2026* | wc -l`
- 14 network cartridges on the cable-cross-sections wafer: `ls .../202609190330-cable-cross-sections/*-network.json | wc -l`. They are cable, cable132, estate, fault, grid, grid132, grid400, kuiper, shotwick, substations, trench, uk, underground, world.
- 13 `draw` systems in the NETWORKS registry: `sed -n '283p' pilot.mjs | grep -o -E "[a-z0-9]+: '"`. `estate` is **not** among them.
- 9 particle-engine tools: `git -C particle-physics-drawing-engine ls-files 'tools/*.py' | wc -l`. 2 workflows. 183 results dirs. 3,987 of 4,024 tracked files are under `results/`.
- 72 commits touch wafer-development-environment: `git -C globalgrid2050 log --format=%h -- testcode/wafer-development-environment | wc -l`
- 6 byte-identical copies of the frozen `wafer.mjs` across testcode (3) and galaxies-wafers (3): `sha256sum ... | sort | uniq -c` gives `3f7a5734…` ×6
- 24 `wafer.mjs` files in globalgrid2050, all with distinct hashes
- 42 galaxies-wafers iterations; 228 layer JSON files
- 8 testcode galaxy pages: `ls -d testcode/sandbox/*galaxy*`

## Findings (keyed)

### F1 The pulse law: light made only by dust share, with the total conserved every frame
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/pilot.mjs:400-410
QUOTE:
```js
    const u = (d[q] - R) / PULSE.SIGMA;
    const f = u * u > 36 ? 0 : Math.exp(-u * u);
    const v = 1 + PULSE.GAIN * f * Math.exp(-d[q] / PULSE.LAMBDA) * w[q];
    s[q] = v; tot += v;
  }
  if (!pulseBuf || pulseBuf.length !== m * 2) pulseBuf = new Float32Array(m * 2);
  const t = pulseBuf;
  let cum = 0, j = 0;
  for (let q = 0; q < n; q++) {
    cum += s[q];
    const end = q === n - 1 ? m : Math.min(m, Math.floor(m * cum / tot));
```
Also KEY: same file :373 `const PULSE = { T: 9, SIGMA: 0.035, LAMBDA: 0.9, GAIN: 14, CLUSTER: 0.0016, FPS: 24 };`, and :357-358 `a wide bright bloom and a body with a small share is a point of base dust. The total dust is` / `// conserved in every frame: the light moves, it is never created.`
WHY: This is `s = 1 + 14·f·g·copies` written in code: Gaussian wavefront f, decay g = exp(−d/0.9), and the
measured copy count w. Particles are handed out by exact cumulative share. The last body is forced to `m`, so
the count can never drift. The engine allows no per-point colour or size, so a quantity can only be shown by
moving a fixed amount of dust around. The `1 +` keeps every body visible as base dust behind the front.
PATTERN: conserved-budget rendering (light by redistribution, never creation)

### F2 A check that cuts the law out of the shipped source, and refuses to call an unexamined join a pass
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/proof/kuiper-pulse.check.mjs:3-7
QUOTE:
```js
// It re-implements nothing. It cuts the placement laws out of the shipped pilot.mjs by name and runs
// that source text, so what is checked is what is served. Run it from anywhere:
//     node proof/kuiper-pulse.check.mjs [<path to estate-bodies.json>]
// The second argument is optional: without it the join back to the estate run is reported as NOT
// EXAMINED rather than as a pass, because a check that examines nothing refuses.
```
Also KEY: same file :65 `if (!BODIES) no('the join back to estate-bodies.json: NOT EXAMINED — pass its path to check it');` and :86 ``ok(good, `every frame is exactly ${M.toLocaleString('en-GB')} finite points: the dust is conserved, the light only moves`);``
WHY: The check runs the served text (`new Function` over slices of pilot.mjs). It does not run a copy that
could drift from it. It asserts conservation over 13 frames and asserts the dot shares sum to exactly M. It
reports a missing input as `REFUSE … NOT EXAMINED` and counts that separately from PASS. This is Kuiper law 4
("a check that examined nothing refuses") in a drawing engine.
PATTERN: test-the-served-bytes; three-state verdict (PASS / FAIL / NOT EXAMINED)

### F3 The contract as written is not the contract as consumed: the producer split it in two
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:166-170
QUOTE:
```python
        # The renderer's contract, taken from tools/networks.py in the drawing engine and not
        # inferred: stations are [x, y, name], edges are [i, j] index pairs. The name is the key.
        stations.append([x, y, sha])
        bodies.append({'k': i, 'id': sha, 'x': x, 'y': y, 'm': b['size'],
                       'copies': b['copies'], 'class': cls, 'home': home, 'open': False})
```
Contract text it implements: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 README.md:113-114
```json
{ "stations": [ { "id": "<key>", "x": 0.0, "y": 0.0, "m": 0, "class": "resonant", "open": true } ],
  "edges":    [ { "from": "<key>", "to": "<key>", "w": 0.0 } ] }
```
WHY: The object form `{id,x,y,m,class,open}` is consumed by **no renderer**. The wafer reads positional
arrays `[x, y, sha(, copies)]`. `networkTargets` destructures `st[q][0]`, `st[q][1]` and edges `[a, b, w]`
(pilot.mjs:285-288). So estate.py writes the object form into `bodies` (estate-bodies.json) and a 3-tuple
into `stations`. The only reader of the object form found is kuiper-weigh.mjs, which joins `copies` onto the
3-tuple by SHA (F5). `{from,to,w}` edges have no consumer anywhere in these clones. Every belt file ships
`edges: []` (kuiper-network.json and estate-network.json: 19,257 stations, 0 edges).
PATTERN: measured contract over prose contract

### F4 "Inferred from prose rather than measured, and was wrong": the unit-square clause
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:159-163
QUOTE:
```python
        # Centred on zero, matching every existing system. Measured from the live files:
        # underground x [-0.893, 0.900], grid400 x [-0.537, 0.537], uk y [-0.900, 0.900].
        # The renderer multiplies straight through with no centring, so a unit-square dataset
        # would draw in the +x/+y quadrant at half scale. SPEC.md said "unit square"; SPEC.md
        # was inferred from prose rather than measured, and was wrong.
```
WHY: This is a turning point recorded in code. The README contract still says `` `x`, `y` in the unit square ``
(kuiper-belt README.md:117). The same file's docstring still says `x and y in the unit square` (estate.py:14).
The renderer it feeds centres on [−0.9, 0.9] (particle tools/networks.py:45). The fix landed in globalgrid2050
commit f3f29b20db834ce82bd4c719a20b2382683cea28 (2026-09-19T01:17:05+01:00), whose message says `The staged
dataset used the unit square, taken from a specification that was inferred from prose rather than measured`.
Two keyed statements in kuiper-belt still contradict the measured one.
PATTERN: measure-the-consumer before writing the producer

### F5 Joined on the key, never on order; no intensity invented
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/kuiper-weigh.mjs:3-7
QUOTE:
```js
// Law, printed with the run: one body per distinct blob SHA. The station's third element is that
// blob SHA and it is the key; the fourth element is `copies`, the number of tracked paths in the
// estate whose bytes hash to that SHA. `copies` is read from the estate run's own estate-bodies.json
// and joined on the blob SHA, never on position and never on order. A station whose SHA is not in
// the run gets no fourth element at all and stays base dust: no intensity is invented for it.
```
Also KEY: same file :33 `if (c == null) { unmeasured++; return [x, y, id]; }           // base dust: nothing invented`
WHY: This is the working form of "edges are drawn between keys, never between positions" applied to
attributes. The partner check proves the 4th element cannot move a dot. kuiper-pulse.check.mjs:47-52 asserts
`draw kuiper places every line at byte-identical coordinates with and without the fourth element`.
Measured result in the shipped file: 19,257 bodies, 19,257 measured, 2,152 duplicated, 41,658 tracked paths,
66 repositories, max copies 162 (kuiper-network.json `counts`).
PATTERN: key-join enrichment; absent measurement = neutral, never imputed

### F6 Edges between keys: the origin of the rule, two days before the Kuiper README
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/QUANTUM-STAR-PROTOCOL.md:38-39
QUOTE:
```markdown
A link is never drawn between positions. It is drawn between keys, and each key is a star: an entangled pair
whose code end is real. So a link is a statement about code, not about a picture:
```
Also KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 README.md:118 `- Edges are drawn between keys, never between positions. This is the protocol and it does not bend.`
WHY: `git log -S'A link is never drawn between positions'` in globalgrid2050 first finds 3b577a08
(2026-09-16T23:16:08+01:00, "testcode/202609162200: Quantum Twin - primary key to actual code flights").
`git log -S'Edges are drawn between keys'` in kuiper-belt first finds 4ffcced5b853a107dd96bd745a30846b5b22abf6
(2026-09-18T20:06:28+01:00, "Kuiper-belt seeded…"). The whole object contract and the `draw estate obeys
release` line arrive in that same commit (`git log -S'"class": "resonant"'` and `-S'obeys `release`'` both
return only 4ffcced5). The protocol file is copied 37 times in globalgrid2050
(`git ls-files | grep -c QUANTUM-STAR-PROTOCOL.md`).
PATTERN: identity-addressed links (edges are computed from keys, like positions)

### F7 Two keyed sources must agree before a neighbour line is shown
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/app.mjs:615-621
QUOTE:
```js
  const exact = atLine === got.text;
  const loose = !exact && atLine.trim() === got.text.trim();
  if (!exact && !loose) {
    say('refuse', `Context was not available: line ${fmt(twin.line)} of that file does not carry this line's text, `
      + `so the file has moved under the index and its neighbours would not be this line's neighbours. `
      + `Nothing around it is shown, and the link points at the position the index records.`);
    return;
```
Also KEY: same file :561-562 `line agrees with the row LINES.md gave for this key. Two keyed sources have` / `to say the same thing before a neighbour is shown. If the file cannot be`. Rule as specified: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 NEXT.md:30 `**only if that file's line N matches the LINES.md row for the key**. Two keyed sources must agree.`
WHY: The card compares two sources: the numbered database row (stars LINES.md via HTTP Range) and the real
file at the recorded commit (raw.githubusercontent). It shows ±10 lines (`const CONTEXT = 10`, app.mjs:549)
only when line N of that file equals the row. Otherwise it refuses in words. This is "two keyed sources
must agree" running in the browser. Pickaxe: `git log -S'Two keyed sources have'` first finds d8dfadb5
(2026-09-19T02:11:18+01:00, "kuiper: the card carries the code…"). The NEXT.md spec followed at 31980d82
(2026-09-19T02:14:48+01:00).
PATTERN: cross-source agreement gate

### F8 A read that verifies itself, so a stale index costs speed and never correctness
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/read.mjs:26-31
QUOTE:
```js
 * The check was also unnecessary, because a read can verify itself. The block
 * is fetched, and either it contains a row beginning `key<TAB>` or it does not.
 * If it does, the offsets were right about this key and the answer is proven.
 * If it does not, the document has moved and the row is found by searching.
 * Nothing is ever shown that was not read from a row carrying the key asked
 * for, so a stale index costs speed and can never produce another line's code.
```
WHY: LINES.md keeps growing under the wafer. The index the wafer ships was built 2026-09-16T00:54:43Z with
283,231 rows and max key 385,223 (line-index.json). Today stars LINES.md says `405,737 unique lines, numbered
1 to 699,862. Generated 2026-10-31T18:45:48.670Z` (stars LINES.md:3). The header comment above it (read.mjs:16-24)
records a failed approach and its cause. The ETag check failed because ETag is not CORS-safelisted. The
Content-Length check failed because it reports the compressed size (`6,788,562 against the 25,238,570`).
PATTERN: self-verifying read (content-addressed fallback)

### F9 The 250,174 claim: a dated snapshot that the README states in the present tense
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/202609142202/data/all-lines.meta.json:9-10
QUOTE:
```json
 "built_utc": "2026-09-14T22:44:05.716Z",
 "lines": 250174,
```
Also KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 README.md:24 `Six views of the same 250,174 permanently numbered lines of code, drawn by different laws.` and globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f …/202609190330-cable-cross-sections/proof/kuiper-pulse.check.mjs:36 `const M = 245170;                    // 250,174 numbered lines less the 2 % rim: the scope draw() gets`
WHY: 250,174 is true of one build, the all-lines pack of 2026-09-14T22:44Z (distinct 250,174, max 342,795).
The wafer, the particle README, the measurements (`packing-result.txt`: `particles in each: 250174`) and the
pulse check's hard-coded `M` all freeze it. The file that numbers lines (stars LINES.md) has since grown to
405,737 unique lines (F8). The README sentence is accurate only as of its date. The constant 245,170 in
the check will go stale whenever the wafer's data pack is rebuilt.
PATTERN: snapshot constant (should carry its build stamp)

### F10 The DNA test: a generated layer stores nothing but recipe + seed, and three machines must agree
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 tools/particles.py:120-127
QUOTE:
```python
def cmd_compare(a):
    ms = [json.load(open(p)) for p in a.manifests]
    keys = ("recipe", "seed", "slots", "sha256_of_line_hashes", "chars_total")
    same = all(m[k] == ms[0][k] for m in ms for k in keys)
    for p, m in zip(a.manifests, ms):
        print(f"{m['platform']}: {m['sha256_of_line_hashes'][:16]}... chars {m['chars_total']}  ({p})")
    print(f"compare: {len(ms)} manifests examined; {'IDENTICAL' if same else 'DIFFER'}")
    sys.exit(0 if same else 1)
```
WHY: This is what GitHub Actions measures. `.github/workflows/particles.yml` generates layer 1 (262,144 lines,
recipe `grid-feeder`, seed `2026-09-18`) on `ubuntu-latest` and `windows-latest`. The `dna-across-machines`
job then runs `compare` and fails if the hashes differ. The house rule at particles.py:14-15 is `no random
module; every number printed is measured; exit non-zero on failure; positions are computed, never stored.`
The latest recorded T4 line is `DNA: regenerated 262144 of 262144 slots … MATCH 7e8e65dc0ae61eec…`
(results/SCOPE-STATUS.md).
PATTERN: cross-platform reproducibility gate (DNA test)

### F11 The whole-number golden angle, and the measured cost of not using it
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 tools/particles.py:20,48-50
QUOTE:
```python
C32 = 2654435769                      # floor(2^32 / phi)
def theta_int(slot):
    frac = ((slot * C32) & 0xFFFFFFFF) / 4294967296.0
    return 2 * math.pi * (1 - frac)
```
Also KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 measurements/exactness-result.txt:3 `prose constant 2.39996 - GOLDEN = -3.2297e-6 rad per key; at key 250174: -0.8080 rad`
WHY: The float law loses accuracy at scale. In f32 it is 26 px off at key 250,174 on a 1,000-px rim and
1,361 px off at 2^24 (README.md:72). The integer law is checked on all 262,143 slots of a layer and stays
under 0.19 px (`cmd_exactness`, limit 0.25 px, exit 1 otherwise; particles.py:146-155). The striking line is
:3. Writing the golden angle to five decimals ("2.39996") puts key 250,174 0.81 rad off, almost a sixth of a
turn. This is the same `2654435769` the brief gives as the maths repo's placement constant.
PATTERN: integer-exact placement; precision budget per layer

### F12 The translator's fixed rules: nothing invented, islands kept, vertices shared by coordinate
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 tools/networks.py:22-24,64-66
QUOTE:
```python
    if points[0] == points[-1]:                       # a closed ring (an island): split it, or it collapses to a line
        h = len(points) // 2
        return dp(points[:h + 1], tol)[:-1] + dp(points[h:], tol)
                k = (round(p[0], 5), round(p[1], 5))
                if k not in idx:
                    idx[k] = len(nodes); nodes.append([p[0], p[1], label if len(nodes) == 0 or label else ""])
```
WHY: This is the deterministic GridAtlas→wafer translator (README.md:119-126). It takes GeoJSON lines, splits
closed rings before Douglas–Peucker so an island does not collapse to a line, and makes vertices shared to
1e-5° into one node. Its output is the array form `stations [[x,y,name]], edges [[i,j]]`, with edges between
**indices**. The Kuiper contract (F3) later raised this to edges between **keys**. The GridAtlas data enters
here: grid_400kv, grid_132kv and grid_substations GeoJSON (networks.py:95-101). (Line 86 of this file holds
a workstation default path and is deliberately not quoted.)
PATTERN: fixed-rule projection (rules printed with every run)

### F13 Physics as edge weight: the fault study drives particle density
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 tools/fault.py:55-56
QUOTE:
```python
        w = float(line_ik[l]) / peak
        edges.append([idx[int(net.line.at[l, "from_bus"])], idx[int(net.line.at[l, "to_bus"])], round(max(w, 0.02), 4)])
```
Also KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f …/202609190330-cable-cross-sections/pilot.mjs:288 (`const lens = E.map(([a, b, w]) => Math.hypot(st[b][0] - st[a][0], st[b][1] - st[a][1]) * (w == null ? 1 : w));` …)
WHY: This is the only producer of the `w` field in the estate's network language. pandapower IEC 60909 I"k
per line, normalised to peak, becomes the third element of each edge. The wafer's `networkTargets` multiplies
edge length by `w`, so fault-current paths get proportionally more dust. The README calls this
"illumination by density, no new colour, no new size". The shipped fault-network.json has 179 stations and
181 weighted edges (`[[143, 68, 1.0], …]`).
PATTERN: quantity-as-density (weight multiplies length share)

### F14 `release` and the one-law-at-a-time guard
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/pilot.mjs:488-496
QUOTE:
```js
// release stops the pulse first, then does exactly what it always did: every line back to its own place.
{ const _release = cmds.release;
  cmds.release = async function(){ pulseStop(); scopeName = 'all'; return _release.call(cmds); }; }

// Two laws must never share the position buffer. Every command that moves the dust stops the pulse
// first, so the wafer is never left half under one law and half under another.
for (const name of ['draw', 'clock', 'logo', 'scope', 'gravity']) {
  const f = cmds[name];
  cmds[name] = function(...a){ pulseStop(); if (scopeName === 'pulse') scopeName = 'kuiper'; return f.apply(cmds, a); };
```
Also KEY: same folder app.mjs:448-451 (`/* Release: every point back to the wafer law exactly; everything in scope. */` … `blendTo(U.home, …)`)
WHY: This is how "draw estate obeys release" is honoured in practice, under the name `draw kuiper`. `draw
estate` was staged at e24604dcf0013490c0d9212fd04e868936b0ee54 (2026-09-19T01:10:53+01:00). The commit body
says `No physics, colour, dust or release behaviour was altered`. 26 minutes later it was renamed to `kuiper`
at 2f54badd (2026-09-19T01:36:58+01:00). **There is no `draw estate` command at HEAD.** NETWORKS has 13 keys
and no `estate` (pilot.mjs:283). `estate-network.json` still ships in the folder with 0 references
(`grep -c estate-network pilot.mjs app.mjs` → 0, 0). The contract line in kuiper-belt README.md:121 therefore
names a command that does not exist. The rule itself holds.
PATTERN: wrapper interlock (one owner of the position buffer)

### F15 The frozen substrate: a file that forbids its own editing, and is byte-identical in six places
KEY: galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 wafer.mjs:38-40
QUOTE:
```js
 * TO CHANGE THIS FILE is to invalidate every layer, link and record that has
 * ever pointed at the galaxy. If a different arrangement is wanted, it is a new
 * substrate with a new name beside this one, never an edit to this one.
```
Also KEY: same file :52-54 `export function place(key) {` / `const r = Math.sqrt(key), t = key * GOLDEN_ANGLE;` / `return [r * Math.cos(t), r * Math.sin(t)];`, and testcode@d09c185c8dacbc5c73afb2b0d0d8dad40745a544 sandbox/202609151815-galaxy-bond/wafer.mjs:38-40 (identical text)
WHY: The basemap is versioned by name, never by edit, the way Grid Atlas treats its Carto basemap. Hashes
confirm it is kept. sha256 `3f7a57344a804fbc…` is identical in testcode sandbox 202609151802-galaxy-bond,
202609151815-galaxy-bond and 202609151852-galaxy-visibility, and in galaxies-wafers root, iterations/11 and
iterations/12. The only differing `wafer.mjs` (iterations/36-elements-assembly) renames itself `level 1's
dark wafer` on line 1. It does not edit the frozen one.
PATTERN: immutable substrate (new law = new name)

### F16 A layer may not invent a key
KEY: galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 build/build_layers.py:105-112
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
```
WHY: Geometry carries keys, never coordinates (`CodeFeatureCollection`). The build fails closed on any key
the numbered database lacks, so a layer cannot disagree with the ground. Sources are hashed
(`sha256_file`, :63-64, :91). This is the galaxy-side twin of F5. Kuiper L1 "no claim without a key" is
enforced at write time.
PATTERN: fail-closed key validation

### F17 Ten laws, one rule: position is a pure function of the key
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/202609151413/physics.mjs:14-19
QUOTE:
```js
 * THE RULE EVERY LAW OBEYS. A position is a pure function of the entity's own
 * permanent key and of published facts about it. No randomness, no simulation
 * state, no iteration to convergence, no memory between frames. Give the same
 * key to the same law and you get the same point, on every device, for ever.
 * That is what makes any of these surfaces shareable by a link and unbounded
 * rather than merely large: a key that does not exist yet already has a place.
```
WHY: This is the page the particle README links as `?law=wafer` (README.md:11). It has ten laws in
`export const LAWS = [wafer, orbit, shells, collapse, accretion, spectrum, lattice, field, condensation, beam];`
(physics.mjs:259). `?law=field` selects law 8 (physics.mjs:197-217), where fanout is read as charge. Its note
says `the two pictures disagree about the same estate` (collapse vs field). The URL carries the law
(`history.replaceState(null, '', '?law=' + lawId)`, app.mjs:285).
PATTERN: stateless placement law; law-in-URL

### F18 What the GPU path measured, honestly: zero position bytes, but not bit-identical
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 measurements/shader-law-result.json:31-35
QUOTE:
```json
   "TF": {
    "compared": 262144,
    "worst_distance_units": 0.0002687569667779131,
    "worst_key": 258800,
    "bit_identical_to_js_fround": 1369
```
WHY: Path B places points in the vertex shader from the integer key (`B_position_bytes: 0`). Transform-feedback
readback shows only 1,369 of 262,144 positions bit-identical to JS `fround`, with a worst error of 2.7e-4
units. This is why T3 ("cross-device positions within a pixel") remains `NOT YET BUILT` (results/SCOPE-STATUS.md).
The live wafer still uploads CPU positions: `in vec2 a_pos;` (…/202609190330-cable-cross-sections/app.mjs:126).
The 4,194,304-point, 1.8 ms/frame claim (README.md:73) is labelled `desktop Chrome on the MSI RTX, NOT a
phone` in the same JSON (:3).
PATTERN: measured-not-assumed (pixels counted, divergence reported)

### F19 The scope drives the loop: "Ran 4 of 9 tests; 0 failed"
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 results/SCOPE-STATUS.md:3
QUOTE:
```markdown
Ran 4 of 9 tests; 0 failed. Tests marked NOT YET BUILT have no script yet (T1 needs a person with the phone).
```
Also KEY: tools/scope_check.py:54 `sys.exit(3 if ran == 0 else (1 if failed else 0))`
WHY: The nightly workflow rewrites this file. It reports its own denominator: 4 of 9 tests have scripts.
T1, T3, T5, T6 and T7 are listed as NOT YET BUILT, not as passing. The run exits 3 if it examined nothing.
PATTERN: honest denominator

### F20 A real-physics test that kept its failure
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 measurements/coax-field-test.mjs:145
QUOTE:
```js
/* v2 judges the wafer-law method only. Grid A keeps its staircase surface as a labelled reference; it FAILED in v1 and is not re-judged here. */
```
WHY: The test solves a coaxial field on wafer-law particles by meshless finite differences. The README reports
a worst error of 0.0036 % at 209,154 particles (README.md:74). The failed first attempt (3.8 %) is kept and
labelled, not deleted. Exit codes are `0 pass, 1 fail, 3 examined nothing` (:15).
PATTERN: keep-the-failure

## Patterns (keyed; each cites at least one F above)

1. **Conserved-budget rendering** (F1, F13). A fixed dust count M is redistributed by a measured weight. Nothing
   per point changes size or colour, and the total is asserted every frame (F2).
2. **Identity-addressed links and joins** (F3, F5, F6, F16). Keys (blob SHA, line number) carry identity.
   Positions are computed. Joins happen on keys, never on order. An unmeasured edge is not drawn: `no edges,
   because an unmeasured edge would be a claim without a key` (kuiper-belt tools/estate.py law string; also
   kuiper-network.json:1).
3. **Three-state checks** (F2, F19, F20). PASS / FAIL / NOT EXAMINED (exit 3), with the denominator printed.
4. **Cross-source agreement** (F7, F8). Two keyed sources must say the same thing before derived content is
   shown. A stale index costs speed, never correctness.
5. **Immutable substrate, versioned by name** (F15, F17). A new law is a new name. The frozen file is
   hash-identical wherever it is copied.
6. **Measured contract beats prose contract** (F3, F4). The producer adopted the consumer's measured shape and
   wrote down that the spec was wrong.
7. **Reproducibility across machines** (F10, F11). Integer arithmetic for placement, and SHA chains compared
   on Ubuntu and Windows (with the MSI as an optional third ledger).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

### particle-physics-drawing-engine (clone is shallow: all 300 commits are results commits)
`git rev-parse --is-shallow-repository` → true. Window 2026-09-20T14:40:51+01:00 to 2026-10-31T12:45:08Z.
Authors: 145 `Ventusltd` (all "msi results …") and 155 `particles-nightly` (`git log --format=%an | sort | uniq -c`).
`git log --format='%h %s' | grep -v -E 'msi results|results 2026'` returns nothing. **No authored code commit is
in the window.** The README, tools and measurements all predate it. Their earliest visible commit is the window's
first commit.
1. 10aaf539c1ccb98e7130b333b4af1e86f10332d2 (2026-09-20T14:40:51+01:00): window start. The first MSI results
   commit, already carrying README, tools/*, the STONE file and the measurements.
2. d837f56e3d8f3f2ee74aa8f18308c3670f9114d2 (2026-09-20T16:14:06Z): the first `particles-nightly` commit
   (B1, B2, T2, T4 on ubuntu-latest).
3. 2026-09-21, 09-25, 09-27, 09-28: MSI storm days of 22–23 hourly commits each (per-day counts from
   `git log --author=Ventusltd --format=%ad --date=short | sort | uniq -c`).
4. 595432199692be52b34a39dcac1220f03a1438f0 (2026-09-29T14:41:03+01:00): the MSI stops for five days.
5. c3da993d4769a8a8a05a02ef3ba4c93022117e36 (2026-10-04T13:35:28+01:00): the MSI resumes for one afternoon.
6. fd39e7ace69445595e0fa7c9c27fe0db17ac1176 (2026-10-04T18:41:10+01:00): **the last MSI commit**. Since then
   only GitHub-hosted runs; the workstation sweep (1/16/64/256 layers, up to 67,108,864 particles) has gone quiet.
7. Nightly cadence: the cron is `17 */3 * * *` (8 a day). The record shows 2–5 a day from 2026-09-20 to
   2026-10-31 (see Candidates).
8. eb52ad7ebab151d49fb7cfde56523f5962129530 (2026-10-31T12:45:08Z): HEAD. B1, B2, T2 and T4 all PASS. The
   Underground is still 341 stations and 314 edges (results/20261031T1245Z/underground.json).

### testcode (full history, 189 commits; 183 Ventusltd, 6 `MSI Claude (lab)`)
Per day: 121 commits on 2026-09-05, 40 on 09-06, 2 on 09-07, 14 on 09-14, 11 on 09-15, 1 on 10-27.
1. 70c5d7d12781e92822acedb34f77911b097edf1f (2026-09-05T04:12:47+01:00): initial commit.
2. 73f916c7559f076321ba18c199f17a1e03dea0d9 (2026-09-05T04:23:49+01:00): "the test code engine - the line that
   runs through everything". The offline → network → publish ordering rule (README).
3. 5bcd74676625100caca4c8e518769865de9c350a (2026-09-05T04:45:56+01:00): "all 7,680 REPD rows, audited offline".
   The pipeline's REPD set is first measured here.
4. Storm on 2026-09-05/06: 161 commits in about 26 hours, mostly immutable Atlas candidates and polygon tools.
5. f5d6ab1362d60c751595dcbf0e04341d5476ba36 (2026-09-07T15:31:11+01:00): Grid Machine paired build runner. A
   seven-day silence follows.
6. a653c5a879d1c09103b671fc6fdf51c502aa2db1 (2026-09-14T14:54:50+01:00): Spider universe proven in a real browser.
   507a1038c98acc02201f44a7d9bef240a6ef978b (2026-09-14T15:20:21+01:00) is the first `MSI Claude (lab)` commit.
7. d515c4b4a0f101d7ae72a55b7ec0b14a0f694db9 (2026-09-14T15:00:20+01:00): the only "reverted" in the log
   ("fan-scroll reverted").
8. 70503ac4e29945fcf502efede6e9c6d7817038f9 (2026-09-14T16:43:07+01:00): "Codex's complete numbered universe
   viewer". The numbered universe arrives in testcode.
9. a4a028dd578ec77ef6daaf4490ced786dbc05d1d (2026-09-15T19:12:20+01:00) → 4a521ef2638429268aa2533105645b3f9189333a
   (19:28:04): galaxy Bond inspector, then its portable CI. The CI refuses an empty selection:
   `raise SystemExit('No supported Bond bundles selected; no verification inferred.')`
   (testcode@d09c185c8dacbc5c73afb2b0d0d8dad40745a544 .github/workflows/galaxy-bond-verify.yml:49).
10. d09c185c8dacbc5c73afb2b0d0d8dad40745a544 (2026-10-27T00:35:29Z): HEAD after a 41-day gap ("Build E
    Lightning preservation and regression tests").

### galaxies-wafers (161 commits, all on 2026-09-15, 17:13 to 23:24 +01:00; 50 merges; one author)
1. be00f1eeb38866f65eaeaac0ac68fefb485339ed (17:13:57): initial.
2. 0a7e2a9872d33306a4d27751b7af633ae570590a (17:20:14): "Wafer substrate, frozen, with layers in Grid Atlas's
   grammar". The only commit ever to touch root `wafer.mjs` (`git log -- wafer.mjs`).
3. fd851b9e8ab223c1d232b67c8b5cce205b2d59f8 (17:29:17): "spider (0 features, with the reason)". Empty is
   stated, not hidden.
4. a80a5b66b3fb7d06687f564bcaa8170d28eeb376 (17:53:21): deep-link receiver reads its URL only through the
   engine's `parseDeepLink`.
5. 0ac07784b462b590864ee426cd4fc413b8d6f2a9 (17:54:16): ground bridge. 5,800 substations, 7,680 projects and
   187 module routes on the wafer.
6. 52003ef24015ddf6626310005f4d88c420773dc9 (18:08:19): manifest proven against file for all 201 layers.
7. deff7ad232feb9bd219f005f3f693fd687d054b1 (19:31:30): "CI no longer passes a page whose layers never load".
8. 94511ae6c2699f6e10d5441125ac2254e73ed04a (20:45:21): iteration 36b moves the run line to the GPU. "WebKit
   frame 707 ms to 1 ms".
9. 65e0afacfc393306d229022ea28ee6bd1ed82227 (21:21:13): "every layers/*.json is listed in the manifest or owned
   with a stated reason".
10. fff6fc6ad4f93a15fe8f6456942a1b44e5547105 (23:24:46): HEAD. Iteration 32b reads the spider after its fix.

### globalgrid2050 wafer-development-environment (72 commits; shallow clone)
1. 92e69248 (2026-09-17T01:37:26+01:00): Wafer Development Environment nest. "ten timestamped versions, forty
   live checks".
2. 633139cc (2026-09-18T02:41:55+01:00): `draw underground`, the first network drawn on the wafer's own dust
   (`git log -S'function networkTargets'` first hit).
3. f8bd6c6f (2026-09-18T03:19:11+01:00): seven real systems from typed commands. 55fd025a (03:44:46) adds
   `draw fault` (pandapower IEC 60909).
4. e24604dcf0013490c0d9212fd04e868936b0ee54 (2026-09-19T01:10:53+01:00): `draw estate` staged. The body flags
   the unit-square risk as `Candidate, not a fact`.
5. f3f29b20db834ce82bd4c719a20b2382683cea28 (2026-09-19T01:17:05+01:00): centred coordinates. The spec is
   called wrong (F4).
6. 2f54badd (01:36:58): `estate` becomes `kuiper` in the command registry.
7. **Mislabelled commit.** 242bcdf4 (01:48:06), "homepage: the Kuiper nest links the belt only", actually adds
   166 lines to pilot.mjs, including the whole pulse law (`git log -S'GAIN: 14'` first hit) and kuiper-weigh.mjs
   (`git show --stat 242bcdf4`). d7ff5ae3 (01:54:31), "kuiper: the pulse, and the check…", adds only the check.
8. d8dfadb5 (02:11:18): the card carries the code. "Two keyed sources" lands (F7).
9. aa78a9a4ec1d7ed2a11f35fd234d59cd87b5b23b (2026-09-19T03:16:20+01:00): cable cross-sections get their own wafer
   version. This is the folder all F1/F2/F5/F7/F8/F14 keys point at.
10. f69ff823 (2026-09-19T18:54:29+01:00, authored `Claude`): "retire the early Kuiper page". It retires the
    202609190230-kuiper-belt folder because it `shipped without the command modules, so its preset commands
    did not run`.

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- **GridAtlas is the translator's input language.** tools/networks.py reads grid_400kv, grid_132kv and
  grid_substations GeoJSON from globalgrid2050 (networks.py:95-101). It turns them into the wafer's
  `{stations, edges}`: `draw grid` is 26,428 nodes and 17,965 edges (STONE file :13). A data-centre layer from
  gridatlas (the 30/30/30 DC engine output, 225 mappable sites) could become `draw datacentres` through the same
  `from_lines`/points path (substations are already drawn as "one node per substation, no edges",
  networks.py:101). Untested here: see Candidates.
- **The `w` edge weight is the hook for a DC grid-capacity overlay.** F13 shows a computed per-line quantity
  becoming particle density. A DC offtake headroom or distance-to-substation figure from
  `tools/offtakers/src/06b-dc-engine.js` could be carried the same way, keyed on connection-point IDs rather
  than positions (F3/F6).
- **The loading discipline is borrowed from gridatlas.** The particle README credits gridatlas with "nothing
  loads until asked, zoom gates, a queue of three" (README.md:94). The galaxies-wafers layer states
  WAIT/LOAD/OK/EMPTY/FAIL copy Grid Atlas (galaxies-wafers README.md:7).
- **The card rule (F7) is the pattern a DC site card needs.** Show a figure only when two keyed sources agree
  (for example a NESO connection point and the planning record), and otherwise refuse in words.

## Candidates (unkeyed; clearly marked)

- The particle repo's authored history (tools, README, measurements) sits before the 300-commit shallow window.
  Its true first commit and authorship cannot be dated from this clone (UNVERIFIED).
- The nightly cron (8 a day) yields 2–5 commits a day. This looks like GitHub scheduled-run dropping or
  `git push` races (`git pull --rebase origin main || true` swallows failures). Not proven.
- The base wafer's vertex shader varies point size by line length (`float base = 1.0 + min(a_len, 120.0) * 0.012;`,
  globalgrid2050 …/202609190330-cable-cross-sections/app.mjs:133). That sits in tension with README concept 2,
  "Particles are all the same size" (particle README.md:62), and with pilot.mjs:353 "nothing per point may
  change — not size". The pilot rule may be meant for commands only. Worth a controller look.
- The `{from,to,w}` key-edge form has no consumer in any clone read. A future `draw` of key-to-key edges would
  need `networkTargets` to resolve keys to station indices first.
- The SCOPE-STATUS B1 last-line excerpt shows `particles_per_layer: 65536` while the nightly B1 JSON shows
  262,144. scope_check may invoke B1 with a smaller size. Not resolved.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. pilot.mjs:357-358, "The total dust is conserved in every frame: the light moves, it is never created." (F1).
   The engine's physics in one sentence.
2. pilot.mjs:402, `const v = 1 + PULSE.GAIN * f * Math.exp(-d[q] / PULSE.LAMBDA) * w[q];` (F1). The formula
   behind `s = 1 + 14·f·g·copies`, in code.
3. kuiper-belt tools/estate.py:162-163, "SPEC.md was inferred from prose rather than measured, and was wrong."
   (F4). The Kuiper's own law (measure, don't reason from prose) applied to the Kuiper's own spec.
4. app.mjs:561-562, "Two keyed sources have to say the same thing before a neighbour is shown." (F7).
5. read.mjs:31, "a stale index costs speed and can never produce another line's code." (F8).
6. kuiper-weigh.mjs:6, "joined on the blob SHA, never on position and never on order." (F5).
7. kuiper-pulse.check.mjs:7, "because a check that examines nothing refuses." (F2). The law, quoted by code
   in a drawing engine.
8. galaxies-wafers wafer.mjs:38-40, "a new substrate with a new name beside this one, never an edit to this
   one." (F15).
9. galaxies-wafers build_layers.py:112, "A layer may not invent a key." (F16).
10. particle measurements/exactness-result.txt:3. The five-decimal golden angle is 0.81 rad off at key 250,174
    (F11). A one-line case for integer laws.

## One next command (exactly one, runnable from a clone)

```
cd /home/user/estate/globalgrid2050/testcode/wafer-development-environment/202609190330-cable-cross-sections && node proof/kuiper-pulse.check.mjs
```
(Re-runs the pulse law from the shipped pilot.mjs. It writes nothing. W18 ran it at 2026-10-31T19:22:16Z and it
printed 26 PASS lines and exactly one `REFUSE the join back to estate-bodies.json: NOT EXAMINED`, then `all checks
passed, 1 NOT EXAMINED`. That includes `in the front band a duplicated body averages 453.2 dots against 43.5 for a
unique one`, which matches kuiper-belt NEXT.md:26. With the join examined (`node proof/kuiper-pulse.check.mjs /home/user/estate/kuiper-belt/data/20260919T001154Z/estate-bodies.json`,
run at 2026-10-31T19:22:31Z against kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6), it printed `every station's fourth
element equals estate-bodies.json copies for that blob SHA (19257 of 19257)` and `all checks passed`. The SHA join in F5 is
therefore verified end to end.)
