# W11 kuiper-tools-as-law
HEADS: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 (not shallow: `git -C /home/user/estate/kuiper-belt rev-parse --is-shallow-repository` -> false; 234 commits by `git rev-list --count HEAD`)
READ:
/home/user/pipelinenews/kuiper-edition/202610311905/BRIEF.md
/home/user/pipelinenews/kuiper-edition/202610311905/NOTICE.md
README.md
LAWS.md
SPEC.md
SPEC-INFINITE.md
CHAINS.md
DRIFT.md
MEASURED.md
EVIDENCE.md
PALETTE.md
.gitattributes
.github/workflows/check.yml
.github/workflows/engine.yml
index.html (lines 75-130, 143-147, 250 only)
proof/*.json (20 files; digests only, recomputed)
data/ (sha256 of twins-*, register-*, */estate-network.json, authored.tsv, blob-lines.tsv, counts.json)
tools/estate.py
tools/wafer_keys.py
tools/key.py
tools/cadence.py
tools/count_lines.py
tools/check_proof.py
tools/ci_check.py
tools/permanence.py
tools/publish_proof.py
tools/swarm.py
tools/iterate.py
tools/harvest.py
tools/wafer_topup.py
tools/entangle_hosts.mjs
tools/twin_register.mjs
ABOUT.md: NOT READ, per brief rule 5.

Written 2026-10-31T19:40:00Z. Every KEY below is `kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6` unless a
different commit is named. Lines that carry a local Windows user path (tools/key.py:31,
tools/entangle_hosts.mjs:19, tools/twin_register.mjs:27, proof/*-estate.json "command") are deliberately not
quoted (brief rule 7).

## Line counts per tool

Command: `cd /home/user/estate/kuiper-belt && wc -l tools/*.py tools/*.mjs`

| tool | lines |
|---|---|
| tools/count_lines.py | 281 |
| tools/wafer_topup.py | 247 |
| tools/estate.py | 236 |
| tools/iterate.py | 195 |
| tools/key.py | 189 |
| tools/check_proof.py | 177 |
| tools/swarm.py | 164 |
| tools/cadence.py | 147 |
| tools/harvest.py | 128 |
| tools/entangle_hosts.mjs | 127 |
| tools/twin_register.mjs | 106 |
| tools/publish_proof.py | 104 |
| tools/ci_check.py | 102 |
| tools/permanence.py | 96 |
| tools/wafer_keys.py | 88 |
| **total** | **2,387** |

Also tracked: three compiled files `tools/__pycache__/{check_proof,key,wafer_keys}.cpython-312.pyc` (`git ls-files tools`).

## The ten laws against the tools (summary table)

Status words: IMPLEMENTED (a line in tools/ computes what the law states), PARTIAL (a line exists but omits
part of the law, cited), CONTRADICTED (a line in tools/ does something else, cited), UNVERIFIED (no line in
tools/ implements it; the grep that found nothing is named).

| law | law text KEY | tool KEY | status |
|---|---|---|---|
| L1 shepherd | LAWS.md:15 | tools/estate.py:103-107 | PARTIAL / CONTRADICTED (second term is tracked paths, not inbound refs; only the summed score is printed) — F5 |
| L2 semi-major axis | LAWS.md:32 | tools/estate.py:157 | CONTRADICTED: radius is the ordinal law `sqrt((k+0.5)/n)`, no `hops` anywhere (`grep -n hops tools/*` -> 0 lines) — F1 |
| L3 eccentricity | LAWS.md:45 | tools/estate.py:22, 88-90 | PARTIAL: clamp 0.95 and the 3-commit floor implemented; `e` never written to any output; `e_undefined` never emitted (`grep -n e_undefined tools/*` -> 0) — F6 |
| L4 inclination | LAWS.md:60-61 | none | UNVERIFIED: `grep -n -i inclin tools/*` -> 0 lines; no refs extraction in any tool |
| L5 mass | LAWS.md:74-76 | tools/estate.py:169 | PARTIAL: `m` recorded as blob bytes; `radius ∝ log(1 + m)` is not in tools/ (`grep -n "math.log\|log1p" tools/*` -> 0) |
| L6 resonance | LAWS.md:88 | tools/estate.py:118-123 | PARTIAL: tolerance 0.05 and p,q ≤ 8 implemented; neither `p:q` nor its residual is recorded, which is the law's own falsifier — F8 |
| L7 epoch | LAWS.md:104-105 | tools/estate.py:40, 47, 86 | CONTRADICTED for the belt (`--asof` is printed but never filters `git log`); the wafer's append-only key law is the nearest implementation (tools/wafer_keys.py:33-34, tools/wafer_topup.py:22) — F11 |
| L8 openness | LAWS.md:117-118 | tools/estate.py:206, 222, 232; tools/check_proof.py:58-64, 76-77 | PARTIAL, honestly: no probe in estate.py, every body dim and score hard set to 1.0 and said so; check_proof.py probes proofs for 200 — F15 |
| L9 reproducibility | LAWS.md:130-133 | tools/estate.py:144, 184; tools/count_lines.py:201-205; .gitattributes:1-3 | IMPLEMENTED for `estate-network.json`; `--seed` printed but never used — F16 |
| L10 reconciliation | LAWS.md:150-157 | tools/entangle_hosts.mjs:80-84 | PARTIAL: three of four verdicts issued; `DISCLOSED` never (`grep -n DISCLOSED tools/*` -> 0 lines) — F9 |

README laws outside L1..L10:

| law | KEY | tool KEY | status |
|---|---|---|---|
| "A check that examines nothing refuses." | README.md:40 | tools/estate.py:64, 99; tools/count_lines.py:196; tools/entangle_hosts.mjs:42; tools/swarm.py:92, 150 | IMPLEMENTED, with one counter-example tools/swarm.py:134 — F4 |
| proof digest per run | README.md:122-123 | tools/estate.py:217-225; tools/count_lines.py:260-267; tools/entangle_hosts.mjs:97-101; tools/twin_register.mjs:86-90 | IMPLEMENTED; 17 of 22 committed digests no longer match their files at HEAD — F3 |
| copied-sentence score | README.md:136-138 | none | UNVERIFIED: `grep -n -i "copied\|exemplar" -r tools/` hits only tools/entangle_hosts.mjs:66 and tools/iterate.py:16, neither is a score |
| captains | README.md:125-127 | tools/iterate.py:8; tools/swarm.py:6-12, 152; tools/cadence.py:80-87 | Captains appear once in tools/ (iterate.py:8); swarm.py has phases named L1/L2/L3, a collision with LAWS.md L1..L3 — F14 |

## Findings (keyed)

### F1 The placement law, as executable code: ordinal radius, golden angle, and what L2 says instead
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:20-21, 156-158
QUOTE:
```python
A_MIN, A_MAX = 0.16, 0.92        # the drawable annulus, in unit square radii
GOLDEN = 2.399963229728653       # the angle the estate's own law already uses
```
```python
        k = i
        r = A_MIN + (A_MAX - A_MIN) * math.sqrt((k + 0.5) / n_bodies)
        theta = (k * GOLDEN) % (2 * math.pi)
```
LAW SIDE, KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 LAWS.md:31-36
```
a = a_min + (a_max - a_min) * (1 - 1 / (1 + hops))
```

Bodies at `hops = 1` sit close in; unreachable bodies (`hops = ∞`) are placed at `a_max` and marked
`detached`. Bodies are never placed at a radius chosen for looks.
WHY: This is Vogel's sunflower (README.md:168-169) bound to an annulus: equal area per body, because
`sqrt((k+0.5)/n)` makes the count inside radius r proportional to r². 2.399963229728653 is 2π(1 − 1/φ),
recomputed with `python3 -I -c "print(2*math.pi*(1-1/((1+5**.5)/2)))"` -> 2.3999632297286535, i.e. 137.5078°.
The rule travels inside the output: tools/estate.py:177-180 writes `'one body per distinct blob SHA; r = a_min
+ (a_max - a_min) * sqrt((k + 0.5) / n) '` into the `law` field. **Disagreement:** LAWS.md L2 says radius is
reference distance (`hops`) to the shepherd; estate.py never computes hops (`grep -n hops tools/*` -> 0 lines)
and its radius is an age ordinal. Under L2's own falsifier ("two bodies with equal `hops` drawn at different
radii") every run of estate.py falsifies L2, because all bodies share undefined hops and are drawn at 19,000+
different radii. The switch was deliberate and logged: commit 47ce64003f8c9b0c0c9c30243e8adb2bf7efef66
"estate.py: the estate's own placement law, not one I invented" (2026-09-19T00:41:43+01:00). LAWS.md was not
updated to match.
PATTERN: invertible placement law printed inside its own output.

### F2 The other placement law: Fibonacci hashing (2654435769), opposite handedness and opposite direction of time
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_keys.py:80
QUOTE:
```python
            'law': 'r = sqrt(key), theta = 2 pi frac(key x 2654435769 / 2^32)'}
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_topup.py:49
```python
LAW = 'r = sqrt(key), theta = 2 pi frac(key x 2654435769 / 2^32)'
```
KEY (the renderer that executes it): kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 index.html:250
```javascript
function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);
```
WHY: Knuth's multiplier (README.md:170-171): `python3 -I -c "print(2**32/((1+5**.5)/2))"` -> 2654435769.497, so
2654435769 is floor(2^32/φ). Integer `Math.imul` then `>>> 0` is exact mod 2^32 arithmetic, so the angle is
bit-identical on every machine (L9). **Three disagreements, both sides keyed:**
1. *Handedness, 137.5° vs 222.49°.* estate.py steps +2.399963229728653 rad = **137.5078°** per body
   (tools/estate.py:21, :158; SPEC-INFINITE.md:46 states the same `theta = k * 2.399963229728653`). The wafer
   steps 2π·frac(2654435769/2^32) = **222.4922°** per key (tools/wafer_keys.py:80, index.html:250). Computed:
   `python3 -I -c "import math;print(math.degrees(2.399963229728653), 360*2654435769/2**32)"` -> 137.50776,
   222.49224. 222.49224 = 360 − 137.50776, so both are the golden angle in magnitude but they wind in opposite
   directions: the two spirals are mirror images. LAWS.md states no angle at all (`grep -n "137\|2654435769\|
   2.3999" LAWS.md` -> 0 lines), so neither side is the law; each is a law-by-code.
2. *Integer vs continuous.* floor(2^32/φ)/2^32 differs from 1/φ by 1.1577e-10 turn per step; at the wafer's
   37,929,255,811 issued keys (tools/wafer_topup.py:6) that is 4.39 turns of accumulated difference
   (`python3` computation in the History section command list). So `theta = k * 2.399963229728653`
   (SPEC-INFINITE.md:46) and the wafer's integer law are not the same placement for large k, although each is
   individually reproducible.
3. *Direction of time.* The wafer puts key 0, the oldest line, at the pupil: tools/key.py:19 "Keys run oldest
   first: the oldest repository's oldest commit holds key 0." with `r = Math.sqrt(k + 0.5)` (index.html:250).
   estate.py puts the newest at the pupil: tools/estate.py:144
   `order = sorted(blobs, key=lambda s: (-repo_info[home_of(s)]['first'], s))`, and SPEC-INFINITE.md:10-11
   says "newest at the pupil where the observer stands, oldest at the rim". The wafer renderer contradicts the
   SPEC-INFINITE sentence that describes it.
PATTERN: Fibonacci hashing as an exact integer angle.

### F3 Proof digests are written every run, and a privacy redaction broke 17 of 22 of them; the parent commit still proves them all
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:217-225
QUOTE:
```python
    os.makedirs('proof', exist_ok=True)
    digest = hashlib.sha256(net_json.encode()).hexdigest()
    proof = {'run': run_id, 'asof': asof, 'digest': digest,
             'bodies': len(stations), 'tracked_paths': total_paths,
             'repositories': len(repos), 'shepherd': shepherd, 'by_class': by_class,
             'dim': len(stations), 'score_dim_over_all': 1.0,
             'command': 'python tools/estate.py ' + ' '.join(sys.argv[1:])}
    with open(os.path.join('proof', f'{run_id}-estate.json'), 'w', newline='\n') as f:
        json.dump(proof, f, indent=1, sort_keys=True)
```
Sibling writers: tools/entangle_hosts.mjs:90 `// Record, then hash the record. The digest is the key the claim carries.`;
tools/count_lines.py:260-267; tools/twin_register.mjs:86-90.
LAW SIDE, KEY: README.md:122-123 "Generated data lands in `data/`. The digest of every run lands in `proof/`. A belt that cannot be
reproduced from `proof/` did not happen."
WHY: I recomputed every committed digest (read only, `sha256sum` and `git show <rev>:<path> | sha256sum`):
- 19 run digests in proof/*.json (twins, register, estate): **4 of 19 match the file at HEAD**; **19 of 19 match the
  file at 84e44834231571e7440eb4578ec39bdfe438fc13^** (= 9dcf8f8d6fd8065d86b3eae7804a477061d82427).
- 3 file digests in proof/20260919T030003Z-counts.json: 1 of 3 match at HEAD (blob-lines.tsv), 3 of 3 at
  84e4483^. MEASURED.md:57 still quotes authored.tsv as `95bb5320...` which is the pre-redaction digest; at HEAD
  data/authored.tsv hashes to `e73434f4...`.
- Root estate-network.json hashes to `53eaed276b68df50370f087b1c00051774cb5d89e3c3a02a740352f8541c815e`,
  exactly the digest in commit message e08cb8719d38e2bb5611da8b778d8de6a720fb4f.
Commit 84e44834231571e7440eb4578ec39bdfe438fc13 (2026-09-19T14:27:43+01:00) "redact names of repositories that
are not public from every tracked file" edited 8 twins files, 6 register files and
data/20260918T231829Z/estate-network.json (its `--stat`). Privacy (grid law L6, tools/check_proof.py:9; brief rule 7) and
reproducibility (README.md:122-123) collided, and privacy correctly won; but no tool re-wrote or annotated
the proofs, and nothing in ci_check.py (K1-K4) checks proof/ against data/. The law survives only because
"the commit is the receipt" (README.md:153-154): the parent commit reproduces every digest.
PATTERN: digest-per-run proof file; verify against history when the tree has been redacted.

### F4 "A check that examines nothing refuses": the law in four tools, and one place it is broken
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:63-65, 98-100
QUOTE:
```python
    if not repos:
        print('FAIL: zero repositories. A check that examines nothing refuses.')
        return 1
```
```python
    if not blobs:
        print('FAIL: zero bodies. A check that examines nothing refuses.')
        return 1
```
Same sentence: tools/count_lines.py:196, tools/entangle_hosts.mjs:42. Structural form, without the sentence:
tools/swarm.py:92 `r['checks']['facts_file_has_facts'] = len(r['facts']) > 0` and tools/swarm.py:150
`out[k]['healthy'] = bool(out[k].get('checks')) and all(out[k]['checks'].values())` (an empty `all()` would be
True; the `bool(...)` guard makes an empty phase unhealthy). Count: `grep -n "examines nothing" tools/*` -> 5
lines in 4 files.
LAW SIDE, KEY: README.md:40 "- A check that examines nothing refuses. It does not pass."; SPEC.md:68-69.
COUNTER-EXAMPLE, KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/swarm.py:133-134
```python
    except Exception as e:
        return {'sound': True, 'last': {'note': 'earth could not be read (%s); not treated as a fault' % type(e).__name__}}
```
WHY: The guard against vacuous truth (`all([]) == True`) is the single most reusable line in the toolset. The
EARTH check in swarm.py does the opposite: when `gh run list` cannot be read, earth is `sound: True`, and
`release_ready` (tools/swarm.py:152) can be granted with the earth unexamined. That is a check that examined
nothing and passed, contrary to README.md:40. Also tools/ci_check.py:44-45 (`except Exception: pass`) lets an
unreadable tracked file pass K1 silently.
PATTERN: refuse on empty denominator.

### F5 L1, the shepherd formula: computed, but not the formula LAWS.md states, and capped at 400 commits
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:102-107
QUOTE:
```python
    # ---- the shepherd is computed, never declared (L1) ----
    max_c = max(r['commits'] for r in repo_info.values()) or 1
    max_p = max(r['paths'] for r in repo_info.values()) or 1
    scores = sorted(((r['commits'] / max_c + r['paths'] / max_p, n) for n, r in repo_info.items()),
                    reverse=True)
    shepherd = scores[0][1]
```
LAW SIDE, KEY: LAWS.md:15 `shepherd = argmax_b ( |C(b)| / max_b |C(b)|  +  |inbound_refs(b)| / max_b |inbound_refs(b)| )`
and LAWS.md:21-22 "**Falsified by:** a run that names a shepherd without printing both normalised terms for the top
three candidates."
WHY: The two-term normalised sum is faithful in shape, so neither volume nor size alone crowns a body. Three
deviations, keyed: (1) the second term is tracked path count (`r['paths']`), not inbound references; no tool
extracts references (`grep -n "inbound\|refs(" tools/*` -> 0 lines). (2) `commits` comes from
tools/estate.py:86 `log = git(d, ['log', '--date=unix', '--format=%cd', '-n', '400'])`, so the commit term
saturates: any repository with 400 or more commits scores 1.0 on volume. (3) tools/estate.py:204 prints
`'shepherd_top_three ' + '; '.join(f'{n} {s:.4f}' for s, n in scores[:3])`, the summed score only, so by L1's own
falsifier every estate.py run falsifies L1. The last estate proof names `"shepherd": "globalgrid2050"`
(proof/20260919T001154Z-estate.json:18), which README.md:65-66 itself calls "a claim to re-check".
PATTERN: normalised two-term argmax (with a hidden cap).

### F6 L3, the e clamp at 0.95, and the three-commit floor
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:22, 87-90
QUOTE:
```python
E_CLAMP = 0.95                   # L3
```
```python
        stamps = sorted(int(x) for x in log.split() if x.isdigit())
        gaps = [b - a for a, b in zip(stamps, stamps[1:])] if len(stamps) > 2 else []
        med = statistics.median(gaps) if gaps else 0
        ecc = min(E_CLAMP, statistics.pstdev(gaps) / med) if med else None
```
LAW SIDE, KEY: LAWS.md:45 `e = clamp( stdev(gaps(b)) / median(gaps(b)) , 0, 0.95 )` and LAWS.md:50-51 "Bodies with fewer
than 3 commits have undefined `e` and are drawn circular with the flag `e_undefined`, never with a guessed value."
WHY: The refusal is real: fewer than 3 stamps gives no gaps, median 0, `ecc = None`, never an invented number;
a zero median also refuses rather than dividing. Deviations: `pstdev` (population) where the law says `stdev`;
`ecc` is stored in `repo_info` and printed nowhere: the body record at tools/estate.py:169-170 has no `e`, and
`e_undefined` appears in no tool (`grep -n e_undefined tools/*` -> 0). `E_CLAMP` is printed to rules.txt
(tools/estate.py:199), satisfying SPEC.md:55-56.
PATTERN: clamp plus explicit undefined, never a guess.

### F7 SCATTER_RATIO = 4.0: a defect recorded at birth and still standing; the class ladder
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:24-25, 110-117, 124-128
QUOTE:
```python
COLD_DAYS, HOT_DAYS, DETACHED_DAYS = 14, 7, 60
SCATTER_RATIO = 4.0
```
```python
    def classify(name):
        r = repo_info[name]
        if name == shepherd:
            return 'shepherd'
        if r['age_days'] > DETACHED_DAYS:
            return 'detached'
        if r['max_gap_ratio'] > SCATTER_RATIO:
            return 'scattered'
```
```python
        if r['age_days'] <= HOT_DAYS:
            return 'classical-hot'
        if r['age_days'] >= COLD_DAYS:
            return 'classical-cold'
        return 'classical-hot'
```
WHY: The commit that created the tool, fc08c098d62d300d4913c4e5fa19f4c5bf751254 (2026-09-19T00:18:59+01:00),
says in its body: "KNOWN DEFECT, recorded rather than hidden: the class thresholds are wrong. 14,518 of 19,202
bodies fall into scattered ... The scatter ratio of 4.0 is far too loose". `git show fc08c09:tools/estate.py |
grep SCATTER_RATIO` -> line 25 `SCATTER_RATIO = 4.0`; HEAD line 25 is identical. The last committed run,
proof/20260919T001154Z-estate.json:9, records `"scattered": 14529` of `"bodies": 19257` = 75.4 per cent; the two
classical bands total 16 (lines 5-6). Disagreements with README.md's class table (README.md:73-80): "detached"
requires "zero shared references and no commit in 60 days" but the code tests age only; "classical, cold" requires
"`e ≈ 0`" but the code tests age only; "classical, hot" is "commits in the last 7 days" but the fallback at
:128 labels a body last committed 7 to 14 days ago `classical-hot`. Also `shepherd` is a class of 4,527 bodies
(proof line 10) because blobs inherit their home repository's class.
PATTERN: known defect recorded in the commit body, not hidden.

### F8 L6 resonance: tolerance and ceiling as written, but no p:q and no residual are kept
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:23, 118-123
QUOTE:
```python
RES_MAX_PQ, RES_TOL = 8, 0.05    # L6
```
```python
        if shep['median_gap'] and r['median_gap']:
            ratio = r['median_gap'] / shep['median_gap']
            for q in range(1, RES_MAX_PQ + 1):
                for p in range(1, RES_MAX_PQ + 1):
                    if abs(ratio - p / q) / (p / q) <= RES_TOL:
                        return 'resonant'
```
LAW SIDE, KEY: LAWS.md:88 `| r - p/q | / (p/q) <= 0.05` and LAWS.md:96 "**Falsified by:** a `p:q` recorded without its
residual `| r - p/q | / (p/q)`."
WHY: The inequality is the law byte for byte, and "no resonance" is the default return, never the nearest ratio
(LAWS.md:91-92). But only the word `resonant` survives; `p`, `q` and the residual are thrown away. Strictly the
falsifier is not triggered (no `p:q` is recorded at all), which is the bond-grants-only-its-words reading of
L10; in substance the run cannot show which lock it found. The 73 resonant bodies in
proof/20260919T001154Z-estate.json:8 carry no ratio.
PATTERN: tolerance test with refusal default.

### F9 L10: three of four verdicts, and a template-literal regex that never matches, leaving README's drift block stale
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/entangle_hosts.mjs:80-84
QUOTE:
```javascript
  // L10. The verdict is settled by pinned evidence, never by recency or plausibility.
  let verdict, detail;
  if (!a || !bb) { verdict = 'NOT EVALUATED'; detail = !a ? 'no observation from github' : 'no observation from gitlab'; }
  else if (a.commit === bb.commit) { verdict = 'HONOURED'; detail = `both hosts at ${a.commit}`; }
  else { verdict = 'OVERREACHED'; detail = `github ${a.commit} against gitlab ${bb.commit}; first deviation is the ref itself`; }
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/entangle_hosts.mjs:119
```javascript
  const next = cur.includes(START) ? cur.replace(new RegExp(`${START}[\s\S]*?${END}`), one) : cur.trimEnd() + '\n\n' + one + '\n';
```
LAW SIDE, KEY: LAWS.md:150-157 (four verdicts) and LAWS.md:156 "`NOT EVALUATED` | listed, never merely counted".
WHY: The comparison is commit equality, a Merkle root, the strongest pinned evidence git offers. NOT
EVALUATED is listed per body (tools/entangle_hosts.mjs:109), obeying LAWS.md:156. `DISCLOSED` is never issued
(`grep -n DISCLOSED tools/*` -> 0 lines). **Bug, verified:** inside a JS template literal `\s` and `\S` are
not regex escapes, they collapse to `s` and `S`. `node -e` with the same START/END constants prints regex
source `<!-- DRIFT:START -->[sS]*?<!-- DRIFT:END -->` and `matches real block: false`. So once a README holds
a drift block it is never updated. Evidence in this very clone: README.md:182 still reads
`### Host entanglement, 2026-09-18T22:24:08.578Z` and README.md:184 `**NOT EVALUATED.** no observation from
gitlab`, while DRIFT.md:2 is `2026-09-19T12:50:01.970Z` and DRIFT.md:14 lists `**OVERREACHED** \`Kuiper-belt\``.
Two records of the same repository disagree, which L10 rule 2 (LAWS.md:162-163) warns about. Also: the comment at
tools/entangle_hosts.mjs:5-6 says "Without --push it observes and reconciles only", but :59-60 add or re-point a
`gitlab` remote and :113-121 rewrite every repository's README.md on every run.
PATTERN: verdict by Merkle-root equality.

### F10 The twin register: one commit certifies every key inside it; the 95 per cent gate fires after the proof is written
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/twin_register.mjs:47-52
QUOTE:
```javascript
  // A key is only as entangled as the tree that carries it.
  let state;
  if (!k) state = 'NO KEYS';
  else if (b.verdict === 'HONOURED') { state = 'CERTIFIED'; certified += keys; }
  else if (b.verdict === 'OVERREACHED') { state = 'SUSPECT'; suspect += keys; }   // pink, per the protocol
  else { state = 'UNCERTIFIED'; uncertified += keys; }
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/twin_register.mjs:102-106
```javascript
// Below 95 per cent the protocol refuses to write a claim of entanglement.
if (total && certified / total < 0.95) {
  console.log('\nBELOW THRESHOLD: under 95 per cent certified. This is a report, not a claim of entanglement.');
  process.exit(1);
}
```
WHY: Merkle inheritance (tools/twin_register.mjs:8-11; SPEC.md:115-117: "128,369 keys are settled by 65
comparisons rather than 128,369"). Ordering hazard: data/register-<run>.json and proof/<run>-register.json are
written at :83-90, before the threshold test at :103. proof/20260918T225001Z-register.json:5-6 records
`"keys_in_index": 128369`, `"certified": 95956`: 74.75 per cent (`python3 -I -c "print(95956/128369)"`), below
the gate, yet the proof file carries no below-threshold flag. SPEC.md:121-122 ("Below 95 per cent ... It does not
write a claim of entanglement") is honoured only if a register file is read as "a report"; the proof file
itself does not say so.
PATTERN: certification by containing tree (Merkle inheritance).

### F11 The frozen silence constant, imported rather than copied: append-only addresses (the nearest thing to L7)
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_keys.py:33-34, 66
QUOTE:
```python
GAP_KEYS_PER_SECOND = 600         # declared, frozen. About three tenths of the wafer is silence.
CAP_SECONDS = 14 * 86400          # no silence counts for more than a fortnight
```
```python
        gap = 0 if prev is None else GAP_KEYS_PER_SECOND * min(max(unix - prev, 0), CAP_SECONDS)
```
Imports, so the constant cannot fork: tools/permanence.py:29 `from wafer_keys import GAP_KEYS_PER_SECOND, CAP_SECONDS   # the same frozen constants, imported`;
tools/wafer_topup.py:47 `from wafer_keys import GAP_KEYS_PER_SECOND, CAP_SECONDS, rows`.
LAW SIDE, KEY: LAWS.md:104-105 "Positions at time `t` are computed from the commits at or before `t` only. No
interpolation from the present backwards."
WHY: wafer_keys.py:13-14 states why the constant is frozen ("a constant that moved whenever a commit arrived would
move every key after it"). permanence.py turns L7's spirit into a falsifiable test: rebuild old keys and exit 1 if
any shared commit `MOVED` (tools/permanence.py:77, :92). wafer_topup.py:22 "APPEND ONLY. Nothing already issued
moves" and :23-24 name the price (a late-pushed old commit stays outside). **Disagreement for the belt:**
estate.py accepts `--asof` (tools/estate.py:40) and prints it (:47, :197) but every `git` call reads HEAD
(:70 `ls-tree -r -l HEAD`, :86 `log ... -n 400`) and `age_days` uses wall-clock `now` (:48, :92). The estate
belt is not computable at an earlier `t`; L7 is implemented only by the wafer.
PATTERN: frozen declared constant, imported by every consumer.

### F12 key.py: a key followed to its line, and one wrong key stops the run
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/key.py:117-122
QUOTE:
```python
        if m < seen + n_lines:
            body = subprocess.run(['git', 'cat-file', 'blob', f[2].decode()], cwd=d,
                                  capture_output=True).stdout
            if lines_of(body) != n_lines:
                return (head + '\n  REFUSED: the cache says %d lines for blob %s and git says %d'
                        % (n_lines, f[2].decode()[:12], lines_of(body))), 2
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/key.py:134-135
```python
    SAFEGUARDS: a hard stop at the stated UTC time; a hard stop at the first REFUSED, because one
    wrong key is worth more than a thousand right ones; one process, a pause between keys so the
```
WHY: This is the first law executed end to end: key -> repository -> commit -> file:line -> text, by git alone
(tools/key.py:8-11), with the cache never trusted blind (:49-50) and a whole-commit walk that refuses if the
shard's line count is not reached (:128-129). It also distinguishes silence from fault: an unissued key returns
"was never issued: it is silence between commits" with exit 0 (:94-95). check_proof.py C5 reuses it on the
published data (tools/check_proof.py:104-115). Count: `grep -c REFUSED tools/key.py` -> 5.
PATTERN: resolve-and-compare, halt at first refusal.

### F13 The guard does not spell what it guards: one hashing function, imported by six tools
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
WHY: A deny-list held as truncated SHA-256 so the public repository never contains the names it protects
(tools/check_proof.py:23-25), returning a count, never the match. `grep -n "from check_proof import leaks"
tools/*` -> 6 importers: ci_check.py:26, harvest.py:36, iterate.py:43, publish_proof.py:30, swarm.py:38,
wafer_topup.py:46. Every writer that publishes (harvest.py:112-114, wafer_topup.py:227-229,
publish_proof.py:74-77) refuses with exit 2 on one hit. Commit 9dcf8f8d6fd8065d86b3eae7804a477061d82427 records
that the earlier guard leaked the names it guarded and that they remain in history at two named commits (not
repeated here).
PATTERN: hashed deny-list; the guard does not spell what it guards.

### F14 swarm.py's "captains": three phases named L1, L2, L3, a neutral that never blocks, an earth that trips
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/swarm.py:6-12
QUOTE:
```python
THREE PHASES, a third of the checks each, run side by side. All three must be healthy to release.
  L1  SCOPE AND SAFETY   nothing private, no banned word, the disclaimer on every page, and every conductor
                         page passes its own layout tests at PHONE width (390 x 844).
  L2  TRUTH              every keyed fact in E:\kuiper-iterations\FACTS.tsv that applies to a page is present in
                         that page exactly as keyed. L2 owns that file and adds a fact whenever it settles one.
  L3  FUNCTION           the builder's own verdict is full marks, was made after the last edit, and every
                         script parses.
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/swarm.py:152
```python
    out['release_ready'] = all(out[k]['healthy'] for k in ('L1', 'L2', 'L3')) and out['E']['sound']
```
WHY: The word "captain" occurs in tools/ exactly once: tools/iterate.py:8 "published by a person or a captain
through tools/publish_proof.py" (`grep -n -i captain -r tools/` -> 1 line). swarm.py has no captains; it has an
electrical metaphor: three phases (L1 safety, L2 truth, L3 function), a NEUTRAL local model that "ADVISES. It
never blocks." (:13-14, :122 `'blocks': False`), and an EARTH (GitHub Actions) that trips the release on a failed
run (:15-16, :132). The "review by L1 or L2" (tools/swarm.py:19; tools/cadence.py:80-87, first line must start
`PASS`) treats L1/L2 as reviewers, which is the README captain discipline (README.md:125-139) moved into a gate.
**Disagreement:** swarm.py's L1/L2/L3 share names with LAWS.md L1 (shepherd), L2 (semi-major axis), L3
(eccentricity) and mean something unrelated; a reader of cadence.py:77 `bad = [k for k in ('L1', 'L2', 'L3') ...`
cannot tell which L1 is meant. Second internal disagreement: tools/iterate.py:8-9 says publish_proof.py has
"its own ten minute rule"; tools/publish_proof.py:45 enforces `< 1200` seconds, twenty minutes, as does
tools/cadence.py:33 `GAP = 1200`.
PATTERN: three-phase release gate with advisory neutral and tripping earth.

### F15 L8: the score is stated, not faked. Every body dim, 1.0, said aloud
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:206, 222, 232
QUOTE:
```python
        'open_probe none, every body recorded dim',
```
```python
             'dim': len(stations), 'score_dim_over_all': 1.0,
```
```python
    print(f'dim {len(stations)} of {len(stations)}: no destination probe ran, so nothing is open')
```
LAW SIDE, KEY: LAWS.md:117-122 `score = count(dim) / count(all)` "... It is expected to start high. A run that does not print
it is not a run."
WHY: SPEC.md:65-67 "Destination unfetchable -> `dim`, not `open`." estate.py has no probe, so it does the honest
thing: every body `'open': False` (:170), score 1.0, and the reason printed. The only fetching probe in tools/ is
check_proof.py C1, which requires three URLs to answer 200 (tools/check_proof.py:76-77
`res['C1_live'] = all(c == 200 for c in codes.values())`) and returns "come back later" rather than a verdict if
not (:79-80). The instrument's own score at the last run: 19,257 dim of 19,257
(proof/20260919T001154Z-estate.json:3, :14, :17).
PATTERN: publish your own uselessness score.

### F16 L9 in three places: sorted serialisation, content-addressed sharding, and line endings pinned by .gitattributes
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:184
QUOTE:
```python
    net_json = json.dumps(net, sort_keys=True, separators=(',', ':'))
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/count_lines.py:201-205
```python
    # Sharding is deterministic and by CONTENT, not by repository: a blob belongs to the shard
    # given by its own SHA. Every shard therefore sees a disjoint slice, no blob is counted twice,
    # and the shards sum exactly to the whole. Re-running any shard reproduces the same slice.
    global MINE
    MINE = (lambda sha: int(sha[:8], 16) % a.of == a.shard) if a.of > 1 else (lambda sha: True)
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 .gitattributes:1-3
```
# Text is stored and checked out with LF, so the file on disk is the file that ships,
# and a digest taken on one machine matches a digest taken on another. See LAWS.md, L9.
* text=auto eol=lf
```
WHY: LAWS.md:130-133 demands identical coordinates on any two machines, with the seed derived from the body's own
key where randomness is needed. estate.py needs no randomness: ties break by SHA (:144), the station name is the
key (:168), and output is sort-keyed. The root estate-network.json reproduces the digest its commit message
claims (F3). Gaps: `--seed` is accepted and printed (:39, :52, :197) but used for nothing; and tools/count_lines.py
lines 1-2 (`MINE = lambda sha: True`, `SUF = ''`) sit above the shebang at line 3, so the shebang and the module
docstring are inert (`git log -L1,2:tools/count_lines.py` -> introduced at 5421c4f0b472d3430fe8a3c63fc8670dd6a07ad5).
PATTERN: content-addressed sharding; LF pinned for digest stability.

### F17 ci_check.py and engine.yml: check first, measure, check again, grow, check again, fail closed
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/ci_check.py:13, 55
QUOTE:
```python
Exit 0 only if all pass. Nothing here can be satisfied by editing a number in a document.
```
```python
    ok2 = issued == meta['issued_keys'] == repo_sum and silent == meta['unissued_keys'] and len(w) == meta['commits']
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 .github/workflows/engine.yml:30-31, 36-37, 43-44
```yaml
      - name: Check first, and fail closed
        run: python tools/ci_check.py
      - name: Check again with the new data in place
        run: python tools/ci_check.py
      - name: Check the grown wafer
        run: python tools/ci_check.py
```
WHY: K2 is a three-way equality chain across independent representations (rows, meta, per-repo totals), which is
LAWS.md:162-163 rule 2 ("A layer's own summary is not independent proof of that summary") as code. K4
(tools/ci_check.py:82-93) closes the address space: the sum of every gap and every line must equal
`address_space`. wafer_topup.py repeats K2 before it writes (:221-224). This loop has produced 146 of the
repository's 234 commits (`git log --format=%s | grep -c "^engine: lines standing"` -> 146), HEAD included
(2026-10-31T12:43:52+00:00, author kuiper-engine).
PATTERN: sandwich every mutation between fail-closed checks.

## Patterns (keyed; each cites at least one F above)

- **Refuse on empty denominator** (F4): tools/estate.py:64, :99; tools/count_lines.py:196;
  tools/entangle_hosts.mjs:42; tools/swarm.py:150. Breach at tools/swarm.py:134.
- **Rule travels inside the output** (F1, F2): tools/estate.py:177-183 `law` field; tools/wafer_keys.py:80;
  tools/wafer_topup.py:49; rules.txt at tools/estate.py:196-209.
- **Digest per run, receipt in git** (F3): tools/estate.py:217-225; tools/entangle_hosts.mjs:97-101;
  tools/twin_register.mjs:86-90; tools/count_lines.py:260-267. Fragile under redaction; verifiable at the parent.
- **Frozen constant, imported, never copied** (F11): tools/wafer_keys.py:33-34 -> tools/permanence.py:29,
  tools/wafer_topup.py:47.
- **Hashed deny-list** (F13): tools/check_proof.py:47-55, imported six times.
- **Merkle inheritance** (F9, F10): commit equality certifies the whole tree; tools/entangle_hosts.mjs:83,
  tools/twin_register.mjs:50.
- **Refusal default, never nearest guess** (F6, F8): `ecc = None` (tools/estate.py:90); resonance loop returns
  only within tolerance (:122-123); `REFUSED` appears 21 times across 8 tools (`grep -c REFUSED tools/*.py
  tools/*.mjs`: estate 1, harvest 1, iterate 1, key 5, permanence 1, publish_proof 4, wafer_keys 3, wafer_topup 5).
- **Advisory model, never a verdict** (F14): tools/swarm.py:122 `'blocks': False`; tools/check_proof.py:125
  "C6 local model (advisory, a candidate, never a verdict)".

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Commands: `git log --format='%h %aI %an %s' --reverse -- tools/`; `git log --format='%an' -- tools/ | sort | uniq -c`.
32 commits touch tools/: 21 by Ventusltd, 11 by Claude. Whole repository: 234 commits, 146 kuiper-engine,
75 Ventusltd, 13 Claude.

- 4ffcced5b853a107dd96bd745a30846b5b22abf6 2026-09-18T20:06:28+01:00 "Kuiper-belt seeded: the framework the
  captains read, the laws, the cartridge contract". README.md:177 still says "`tools/estate.py` is **not yet
  written**" and :178-179 "There is nothing in `data/` or `proof/` yet", both false at HEAD (236-line
  estate.py; 20 files in proof/ by `ls proof | wc -l`). README.md was last touched at
  a287b4cbe517e03628d2e43783c826820eedcbbd (2026-10-05T15:02:15+01:00) without correcting the State section.
- b4f9e75a7cd152753f28621ddd1e4c8d52ebe3aa 2026-09-18T23:01:42+01:00 entangle_hosts.mjs first; then
  dc21ae82977d76c7dd4f9a09c36cb9c4d601c8a6 23:35 twin_register; 8c2950ba80ed7067962758d402524bff8f90cff7 23:49
  "mirror the estate, not the desk" (the tool had created the divergence it then reported).
- **The estate.py storm, four placement laws in 31 minutes, then a fifth:**
  fc08c098d62d300d4913c4e5fa19f4c5bf751254 00:18:59 (first run, defect recorded) ->
  47ce64003f8c9b0c0c9c30243e8adb2bf7efef66 00:41:43 (ordinal + golden angle) ->
  51ca8f132eab41bda964b141429cfb5d88fb9549 00:44:41 (stations as `[x, y, name]`, "read from the producer rather
  than inferred") -> 8b4f20f97b0eb7c822b8f98ad95edb6859ba7c67 00:49:22 (radius is age, oldest at pupil) ->
  e08cb8719d38e2bb5611da8b778d8de6a720fb4f 10:45:29 (reversed: newest at pupil). The reversal left a stale comment:
  tools/estate.py:135 "Oldest work sits at the pupil, tonight's at the rim." contradicts :140-144 and the code.
- c90ece1fabf056c0be8f921be9c6431bb75ab033 04:01 count_lines.py, 5421c4f0b472d3430fe8a3c63fc8670dd6a07ad5 04:12
  content sharding.
- 0755869facbe055f663ab9fbffb32f2eefc8c737 13:56 "the Kuiper belt as one wafer" (wafer_keys/key law);
  4ef5264fd82e2a626182567c628b112e318484d3 14:05 permanence + publisher.
- **Turning point:** 9dcf8f8d6fd8065d86b3eae7804a477061d82427 14:25 the hashed guard, then
  84e44834231571e7440eb4578ec39bdfe438fc13 14:27 the redaction that invalidated 17 of 22 proof digests (F3).
- Claude-authored afternoon, 2026-09-19: 024d127e3f632ade1b105d8d5bd8684180bbc397 15:01 engine on Actions;
  cfd9590cfc1f4caf4ffac4045e3f001afc946f04 16:25 cadence; b7b9b249bad32918ae96f380c1e695816808591e 16:51
  release gate (swarm.py).
- 485851fcbf5cd825a574bc8ed0e8996f77d3c6b2 2026-09-26T23:00:23+01:00 wafer_topup: the last change to tools/.
  Since then only the engine commits (HEAD b243e38d4964557458fcaf636fd8d49c799f91a6, 2026-10-31T12:43:52+00:00).
- No reverts in tools/ history (`git log --format=%s -- tools/ | grep -ci revert` -> 0; the 32
  subjects are listed above).

Arithmetic used above, reproducible: `python3 -I -c "phi=(1+5**.5)/2; e=(2**32/phi-2654435769)/2**32; print(e, e*37929255811)"`
-> 1.1577e-10, 4.391.

## Gridatlas and datacentre relevance

- SPEC-INFINITE.md:75-79 names GridAtlas as the proven pattern the belt copies: "DRAW EVERYTHING, FETCH ONE ...
  the map shows the whole country, and it pulls a satellite scene and a project record only for the site you
  flew to." CHAINS.md:38 lists `graph` law as "NOT BUILT. GridAtlas is this" and CHAINS.md:67 makes GridAtlas a
  future cartridge. The tools in this slice are the law GridAtlas would inherit as a cartridge.
- PALETTE.md:7-14 is the shared colour law for GridAtlas, the wafer and Pipeline News (green energised, amber
  attention, magenta selected); estate.py honours "class is a property and never a position" (tools/estate.py:152-155)
  which is the same discipline.
- Directly reusable for the data-centre pipeline (227 sites, 225 mappable per BRIEF): F4 (refuse on zero sites),
  F17 (three-way sum equality before any write, as K2), F13 (hashed deny-list for non-public names), F3
  (digest every output into proof/, and re-verify against the parent commit after any redaction), and F10's
  threshold gate (but write the proof only after the gate, not before).
- The placement law (F1) is a candidate layout for an unordered set of sites in a legend or index view; the
  handedness and time-direction disagreements (F2) must be fixed before two views are compared.

## Candidates (unkeyed; clearly marked)

- CANDIDATE: the 222.49° vs 137.5° handedness is probably accidental rather than chosen; no commit message I read
  discusses direction of winding.
- CANDIDATE: the `-n 400` cap in estate.py likely let the shepherd be decided mostly by the path term once
  several repositories exceeded 400 commits; not recomputed here because the original roots are not available.
- CANDIDATE: the entangle_hosts.mjs regex bug probably also froze drift blocks in every other estate
  repository's README.md since their first entanglement run (2026-09-18); checking needs those clones.
- CANDIDATE: SCATTER_RATIO 4.0 is too loose for any repository with one long holiday gap; a ratio over gaps
  measured as percentiles would be more stable. A proposal, not a finding.

## Proposed lines for the Kuiper edition

1. tools/estate.py:157-158 (F1): the placement law in two lines; with LAWS.md:32 beside it as the open disagreement.
2. index.html:250 (F2): Knuth's 2654435769 as exact integer angle; pair it with the 137.5°/222.49° note.
3. tools/estate.py:64 and tools/swarm.py:150 (F4): the refusal law as a sentence and as a structure; swarm.py:134 as the breach.
4. tools/estate.py:217-225 plus the 5-of-22 / 22-of-22 recomputation (F3): the strongest demonstration in the
   repo that "the commit is the receipt".
5. tools/check_proof.py:47-55 (F13): the guard that does not spell what it guards.
6. tools/key.py:120-122 (F12): a key followed to text, refusing on one mismatch.
7. tools/wafer_keys.py:33-34 (F11): the frozen silence constant, imported by two other tools.
8. tools/entangle_hosts.mjs:119 (F9): a one-character-class bug that left two records disagreeing, as a lesson in L10.

## One next command (exactly one, runnable from a clone)

```
cd /home/user/estate/kuiper-belt && for p in proof/2026091*Z.json; do b=$(basename $p .json); d=$(grep -o '"digest": "[0-9a-f]*"' $p | cut -d'"' -f4); echo "$b head=$(sha256sum data/twins-$b.json | cut -c1-64 | grep -c $d) parent=$(git show 84e4483^:data/twins-$b.json | sha256sum | cut -c1-64 | grep -c $d)"; done
```
