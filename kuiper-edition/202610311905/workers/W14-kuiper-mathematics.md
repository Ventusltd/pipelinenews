# W14 kuiper-mathematics
Written 2026-10-31T19:19:11Z (worker W14, Opus; brief 2026-10-31T19:05:00Z). Read only. No clone was changed: `git status --short` was empty after every run.

HEADS:
- maths@b898a5ee39aa81a45197c5f17ba1195727aa538e (8 commits)
- worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 (58 commits)
- trillion-loop@35fdea2f2744df338cfa7e28200e18008b307e73 (2 commits)
- kuiper-drawing-engine@ee69a07a7ebf71f2f20c052f392991f115fdbee0 (24 commits)
- grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a (7 commits)
- kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 (234 commits in clone)
- particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530
- galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105
- stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9
- testcode@d09c185c8dacbc5c73afb2b0d0d8dad40745a544
- globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f (grep -l only)
- gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e, data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1, data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4, data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445 (grep only)
- pipelinenews@de3e68e42e01d3f37e26fb08b9bc76d36e299b61

READ:
maths/README.md
maths/00..09 (grep for constants), maths/07a-powers-of-two-and-the-32-bit-odometer.md, maths/08a-which-way-the-golden-turn-goes.md, maths/10-kuiper-placement-law.md, maths/11-deterministic-square-root.md, maths git log + `git show 9e236d48`
worlds-/README.md, worlds-/src/placement.py, worlds-/src/worlds.py, worlds-/src/to_kuiper.py (head), worlds-/src/watch_ulp.py (head), worlds-/src/layout_gate.py (head + kernel), worlds-/worlds.html (parsed), worlds-/atlas-lattice.json, worlds-/gb-study.json (head), worlds- git log
trillion-loop/README.md, trillion-loop/docs/01..07 (headings), docs/02 (maths + plain English), docs/07 (maths + "differ" section)
kuiper-drawing-engine/README.md, web/geometry.mjs, web/site.mjs, tests/geometry.test.mjs, tests/site.test.mjs (run), tools/* (grep), git log
grid-distance-maths/src/placement.py, src/placement.mjs, test/verify_placement.mjs (run), git log
kuiper-belt/index.html (lines 68-92, 140-150, 244-252), tools/wafer_keys.py, tools/wafer_topup.py:49, tools/estate.py (lines 15-25, 125-200), conductor.html:75-85, SPEC-INFINITE.md:40-62, README.md:165-175, cosmos/wafer-meta.json, learn-the-kuiper/202610050609/kuiper-law.js, 13 copies of kuiper-law.js (sha256), astra-codex logic.js:41, build-your-own-kuiper/README.md:2, modules/grid.js:17
particle-physics-drawing-engine/tools/particles.py (1-50), measurements/exactness.mjs (all), measurements/exactness-result.txt, measurements/packing-result.txt (head), tools/underground.py:80-95
galaxies-wafers/wafer.mjs (1-80), stars/library/standalone.mjs:4850-4860
pipelinenews/kuiper-edition/202610311905/BRIEF.md, tools/edition_belt.py (grep)

Reproductions run (outside clones, scratch in /tmp/w14; Python with -I):
- `PYTHONDONTWRITEBYTECODE=1 node test/verify_placement.mjs` in grid-distance-maths: `worst difference 1.421e-14 (row 1675)`, PASS, 4096 rows x 11 columns.
- `node --test tests/geometry.test.mjs tests/site.test.mjs` in kuiper-drawing-engine: 11 pass, 0 fail.
- Independent Python recomputation: worlds- verdict counts {0:684, 1:204, 2:1853, 3:1849}; 2^32/phi = 2654435769.49723; 0x9e3779b9 = 2654435769; step = 222.49223590828478 deg, mirror 137.50776409171522 deg; float golden 137.50776405003785 deg; 2^53 // 2654435769 = 3393263; key 43486619138 -> 305752434 by both the exact and the split formula; continued fraction of 2654435769/2^32 = 34 terms [0, 1 x22, 2, 4, 1, 1, 25, 3, 1, 1, 1, 1, 12]; 45461911314 / 2^32 = 10.585.

## Findings (keyed)

### F1 The production law in one line: 32-bit odometer, mirror turn, half-key radius
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 index.html:250-251
QUOTE:
```js
function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);
  return [r*Math.cos(th), r*Math.sin(th)]; }
```
WHY: This is the live Kuiper wafer. Three decisions in one line. (a) The angle is an exact unsigned 32-bit integer product (`Math.imul ... >>> 0`) with G32 = 2654435769 = floor(2^32/phi) (index.html:92 `const G32 = 2654435769, TW = 4096;`), so the angle numerator is bit-identical on every engine. (b) theta = 2*pi*m/2^32 turns +0.6180339887 of a turn = +222.492236 deg per key. That is the golden angle turned the *other* way. (c) r = sqrt(k + 0.5) with keys from 0, not sqrt(k). Every other implementation in the table below is measured against this line.
PATTERN: integer-exact angle, float-only-at-the-end (Fibonacci hashing as a placement law)

### F2 The deterministic square root: Heron's recipe in the notes, and in BigInt code
KEY: maths@b898a5ee39aa81a45197c5f17ba1195727aa538e 11-deterministic-square-root.md:73-77
QUOTE:
```md
The classical Babylonian / Heron iteration for $\sqrt{S}$ is:

$$
g_{n+1}=\frac12\left(g_n+\frac{S}{g_n}\right)
$$
```
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 measurements/exactness.mjs:5-6
QUOTE:
```js
const isqrt = v => { let x = 1n << 300n; for (;;) { const y = (x + v / x) >> 1n; if (y >= x) return x; x = y; } };
const SQRT5 = isqrt(5n * ONE * ONE);                               /* sqrt(5) * 2^256 */
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/one.js:27-34
QUOTE:
```js
  // FLOOR(SQRT(n)) in whole numbers: a first guess from the machine root, then corrected until n x n <= key < (n + 1) x (n + 1)
  function isqrt(n) {
    if (n < 2n) return n;
    var x = BigInt(Math.floor(Math.sqrt(Number(n))));
    while (x * x > n) x -= 1n;
    while ((x + 1n) * (x + 1n) <= n) x += 1n;
    return x;
  }
```
WHY: Note 11 teaches the square root as a recipe that is repeated, not a fact the machine knows: "The same input and the same algorithm produce the same sequence of operations." (11:65). exactness.mjs is that recipe in integers. It starts above the root (2^300), takes `(x + v/x) >> 1`, and stops the first time the guess does not fall (`y >= x`). That stopping rule returns floor(sqrt(v)) exactly, with no float involved. It computes sqrt(5) to 256 fractional bits, and from that 1/phi^2 and the "true" golden angle, the ground truth that every float and int32 law in the estate is scored against. The teaching game's one.js gets the same exact floor by a second route: a float seed, then corrected by the defining inequality n^2 <= key < (n+1)^2. Its correctness is checked by the definition, not trusted from the float. A third, galaxies-wafers@fff6fc6ad4f93a15fe8f6456942a1b44e5547105 build/tile_layer.py:47 `return math.isqrt(key) // S`, uses the integer root to cut the r = sqrt(key) disc into exact key bands [(bS)^2, ((b+1)S)^2) "with no floating point" (tile_layer.py:5-7). `grep -rEl 'isqrt|math\.isqrt'` (excluding globalgrid2050) finds 10 files: exactness.mjs, 3 copies of one.js, and 6 galaxies-wafers tiling files. Every other `sqrt` in the law's implementations is IEEE-754 `Math.sqrt`/`math.sqrt`/GLSL `sqrt`.
PATTERN: exact ground truth by integer Newton/Heron iteration; monotone-descent termination

### F3 The odometer stops being golden: continued fraction break near 6.5e7 keys, and exact repetition every 2^32 keys
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 measurements/exactness-result.txt:18-19
QUOTE:
```text
continued fraction of C32/2^32: 34 terms: [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,4,1,1,25,3,1,1,1,1,12]
first term that is not 1 is term 23; the last all-golden convergent has denominator 28657. Neighbours in the spiral are about 2*sqrt(pi*k) keys apart, so the lattice stops being golden near k = 6.54e+7
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 cosmos/wafer-meta.json:2
QUOTE:
```json
 "issued_keys": 45461911314,
```
WHY: This is the most important mathematical caveat on the production law, and no note in `maths` states it. The continued fraction of 2654435769/2^32 is all 1s (Fibonacci convergents 1, 2, 3, 5 ... 28657) only up to term 23. Then it reads 2, 4, 1, 1, 25. I reproduced it independently: 34 terms, same digits, 28657^2/(4*pi) = 6.535e7. Past about 65 million keys the int32 lattice is no longer the golden lattice. The same file measures that: the nearest-neighbour minimum in a far sector falls from 1.6501 (int32) against 1.6763 (f64) at K = 2^24, to 1.1334 (int32) against 1.6863 (f64) at K = 2^31 (exactness-result.txt:26-34). Beyond that, `k % 4294967296` (F1) makes the angle exactly periodic: m(k + 2^32) = m(k). The wafer has 45,461,911,314 issued keys, which is 10.585 x 2^32. So every angle is reused about ten times, on the same ray, at radii sqrt(k), sqrt(k + 2^32) and so on. The maths notes (10:122, 07a:60) present the 32-bit law as golden without this bound. Nuance: term 23 is a 2, which still yields a Fibonacci denominator (75025) but skips 46368. The first non-Fibonacci denominator is 328757. The script's 6.54e7 is therefore the conservative reading.
PATTERN: measure the law against exact truth at the scale it is deployed, not at key 1

### F4 The page refuses to exist unless card and processor draw the same world: worst difference 0.000e+00
KEY: worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 src/worlds.py:234-240
QUOTE:
```python
    worst = max(float(np.abs(h[i].astype(np.float64)
                             - r[i].astype(np.float64)).max()) for i in range(5))
    print("verified against the processor, all %s worlds: worst difference "
          "%.3e" % ("{:,}".format(SIZE), worst))
    if worst > 0:
        print("FAIL: the card and the processor drew different worlds")
        return 1
```
WHY: The gate's tolerance is zero, not epsilon. All five output columns (verdict code, two golden-spiral coordinates, two Hilbert coordinates) for all 4,590 designs must match bit for bit after float32 cast, or `page()` is never called and worlds.html is not written. The README records that the gate caught two real defects that "looked right" in the picture (README.md:62-69): a `%.6f` constant baked into kernel source (3.052e-05), and argument reduction at about 11,000 rad. Both fixes are in the kernel comments (F5). The script also refuses to run without a GPU: "Without a card it says so and stops, rather than quietly drawing something unverified." (README.md:91-92; worlds.py:33-37).
PATTERN: zero-tolerance twin-implementation gate that blocks the artefact, not just the log

### F5 Reduce before the trig, and print constants at .17g: two precision laws learned from a failed gate
KEY: worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 src/worlds.py:74-81
QUOTE:
```c
double rad = %(SPACING).17g * sqrt((double)idx);
/* REDUCE BEFORE THE TRIG. By index 4,589 the accumulated angle is ~11,012
   rad, and CUDA and the host reduce arguments that large by different
   routes - a difference that sqrt(idx) then multiplies. fmod is exact on
   doubles, so both sides must do this identically or they disagree. */
double th  = fmod((double)idx * %(GOLDEN).17f, 6.283185307179586477);
gx = (float)(rad * cos(th));
gy = (float)(rad * sin(th));
```
KEY: worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 src/worlds.py:95-98
QUOTE:
```c
/* .17g, not .6f: a constant baked into kernel source at six
   decimals differs from the host's double by ~5e-7 relative,
   which an offset of up to 64 turns into 3e-5 absolute. That is
   how the first run failed its own 0-differ check. */
```
WHY: These are the float form of the law (+137.5 deg per key, r = sqrt(idx)) made portable across two math libraries. `fmod` is exact in IEEE-754, so reducing first removes the one step where CUDA and libm legitimately differ. The host reference mirrors it exactly (worlds.py:137 `th = np.fmod(i * GOLDEN, 2.0 * np.pi)`). Small discrepancy: 4589 x 2.399963229728653 = 11,013.43 rad, not "~11,012" (worlds.py:76, README.md:67). The point stands. The canonical `golden()` in grid-distance-maths does not reduce (see F10).
PATTERN: argument reduction as a determinism contract; constants serialised round-trip-exact (%.17g)

### F6 The mirror: two Kuiper spirals that are reflections of each other, and the line that reconciles them
KEY: maths@b898a5ee39aa81a45197c5f17ba1195727aa538e 08a-which-way-the-golden-turn-goes.md:17-26
QUOTE:
````md
```
222.492236° + 137.507764° = 360°
```

## So the spirals are mirror images

| drawing | step per key | winds |
|---|---|---|
| teaching sheet, Kuiper belt (`tools/estate.py`) | +137.507764° | one way |
| Kuiper wafer (`tools/wafer_keys.py`, `index.html`) | +222.492236° = -137.507764° | the other way |
````
KEY: particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 tools/particles.py:49-50
QUOTE:
```python
    frac = ((slot * C32) & 0xFFFFFFFF) / 4294967296.0
    return 2 * math.pi * (1 - frac)
```
WHY: The estate has two "golden" spirals, and they do not overlay. Note 08a names that and proves it. Commit 9e236d48 (2026-10-04T21:02:39+01:00, "Correct the Kuiper facts: mirror turn, exact area, live +0.5, Excel limit") is when the notes stopped saying the wafer turns +137.5. Concrete evidence in the artefacts: worlds.html point 1 is `[3,-0.7374,0.6755,...]` (+137.5 deg, y up). The wafer's key 1 in maths 10:154-155 is (-0.737369, -0.675490), with y flipped. particles.py is the only implementation that keeps the exact integer odometer *and* turns +137.5. `2*pi*(1 - frac)` is the mirror taken inside the law. exactness.mjs's "mirror test (2pi*frac + true)" column confirms 2*pi*frac = -true angle to 7.274e-10 rad at key 1 (exactness-result.txt:9).
PATTERN: name the chirality; reconcile by 1 - frac, never by a second constant

### F7 Excel's 2^53 cliff and the split-multiplier formula
KEY: maths@b898a5ee39aa81a45197c5f17ba1195727aa538e 10-kuiper-placement-law.md:159-165
QUOTE:
````md
**Excel's limit.** Excel holds whole numbers exactly only up to $2^{53}$ = 9,007,199,254,740,992. `A2*2654435769` goes past that above key 3,393,263, and C2 quietly goes wrong. The real wafer has 43,486,619,138 issued keys, so for big keys use the split formula, which never goes past $2^{53}$:

```
=MOD(MOD(MOD(A2,4294967296)*40503,65536)*65536+MOD(A2,4294967296)*31161,4294967296)
```

It works because 2654435769 = 40503 × 65536 + 31161. For key 43486619138 it gives **305752434**; the plain formula gives a wrong number.
````
WHY: This is the spreadsheet twin of `Math.imul`. It splits the multiplier into 16-bit limbs so that no intermediate passes 2^53 (largest term < 1.75e14). I verified every number: 40503 x 65536 + 31161 = 2654435769; floor(2^53/2654435769) = 3,393,263; split and exact both give 305,752,434. The same limb idea appears in exactness.mjs:53-57 (`mulhi32`, 16-bit limbs for the 64-bit constant C64), measured against BigInt on 1,000,000 slots with 0 disagreements (exactness-result.txt:17). Stale datum: "43,486,619,138 issued keys" is now 45,461,911,314 (F3 key). The arithmetic example is unaffected.
PATTERN: limb-split multiplication to stay inside a host's exact-integer range

### F8 A verbatim lift of the law, a float32 replica of the shader, and a teaching variant that labels itself NOT THE REAL KUIPER
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/kuiper-law.js:38-40
QUOTE:
```js
  // index.html:250-251, VERBATIM. This is the electron. Do not edit it; edit the live page and re-lift.
  function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);
    return [r*Math.cos(th), r*Math.sin(th)]; }
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/kuiper-law.js:103-105
QUOTE:
```js
      const k = +key, deg = (k * 137.507764) % 360, th = deg * Math.PI / 180, r = Math.sqrt(k);
      return { key: k, deg: deg, turns: deg / 360, theta: th, r: r, x: r*Math.cos(th), y: r*Math.sin(th),
               label: 'NOT THE REAL KUIPER: Excel spiral, 137.507764 deg per key anticlockwise, r = sqrt(key)' };
```
WHY: The teaching layer does not re-derive the law. It lifts it, and I checked that the lift still matches HEAD: `diff` of index.html:250-251 against kuiper-law.js:39-40 differs only in leading whitespace. It then reproduces the vertex shader op by op in float32 (`const f = Math.fround;` line 63; line 70 is the rationalised radius; line 74 the split angle), so the GPU's own error can be shown and not hidden. The wrong-but-familiar spiral is kept, labelled in its own return value. There are 13 byte-identical copies (sha256 prefix 2c7512ea1bfd) across learn-the-kuiper/* and see-through/*. Each pins `SPACE = 59637070538` "as of this commit". The current address_space is 63,012,657,714 (cosmos/wafer-meta.json:4), so the snapshots are honest about being snapshots.
PATTERN: lift-don't-rewrite; label the wrong model inside its own data

### F9 The rationalised radius and the split angle: placing keys past 2^32 on a 32-bit GPU
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 index.html:144-147
QUOTE:
```glsl
  float r = u_R0 + (d + 0.5) / (u_R0 + sqrt(u_R0*u_R0 + d + 0.5) + 1e-9);      // sqrt(k0+d+.5), kept precise
  uint m = (u_k0lo + uint(gl_VertexID)) * ${G32}u;
  float A = 6.283185307179586 * float(m >> 16) / 65536.0, B = 6.283185307179586 * float(m & 0xFFFFu) / 4294967296.0;
  vec2 cs = vec2(cos(A)*cos(B) - sin(A)*sin(B), sin(A)*cos(B) + cos(A)*sin(B));
```
WHY: GLSL ES has no 64-bit integer, and the wafer's keys run to 6.3e10. Line 144 is sqrt(R0^2 + x) = R0 + x/(R0 + sqrt(R0^2 + x)), the cancellation-free difference identity. The shader therefore needs only R0 = sqrt(k0) per batch and the vertex offset d, never the full key. Line 145 is the odometer in native uint32 wrap (the low 32 bits of k0 are passed in, index.html:334). Line 146 splits the 32-bit angle into high and low 16-bit halves, and line 147 recombines them with the angle-addition formula, so float32's 24-bit mantissa does not truncate m. My own float32 emulation at k of about 4.5e10: radius worst error 0.0058 units (no better than an ideal float conversion; the gain is that the key never has to fit). Angle position worst error 0.094 units split against 0.126 units naive float(m). Both are far below the 1-unit key spacing. The comment "kept precise" therefore means "kept representable", and the split angle buys about 26% in my emulation.
PATTERN: algebraic rewrite to keep big integers out of float32; angle-addition limb split

### F10 One canonical placement, twin languages, a parity check that fails on an empty set, and a vendored copy that a caller does not use
KEY: grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a test/verify_placement.mjs:52-62
QUOTE:
```js
} catch (err) {
  console.error("FAIL: the Python half did not run, so nothing was compared.");
  console.error("A check that reached nothing is not a pass.");
  console.error(String(err.message).slice(0, 400));
  process.exit(1);
}

if (js.length === 0 || py.length === 0) {
  console.error("FAIL: one side produced no rows (js %d, py %d).", js.length, py.length);
  process.exit(1);
}
```
KEY: grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a src/placement.py:38-47
QUOTE:
```python
GOLDEN = math.pi * (3.0 - math.sqrt(5.0))


def golden(key, spacing=1.0):
    """Archive placement. Point `key` of an unbounded, append-only sequence."""
    if key < 0:
        raise ValueError("key must be >= 0")
    r = spacing * math.sqrt(key)
    t = key * GOLDEN
    return (r * math.cos(t), r * math.sin(t))
```
WHY: This is the Kuiper law's L4 ("a check that examined nothing refuses") written into the test. I ran it and got 4096 rows x 11 columns, `worst difference 1.421e-14 (row 1675)`, PASS. That matches worlds- README.md:80 ("worst difference 1.4e-14"). worlds-/src/placement.py is byte-identical to the canonical file (sha256 04c6c0e44babb306...). The canonical commit 8e91b07 (2026-09-21T01:41:08+01:00) landed 3 min 22 s before worlds- 17cb850 (01:44:30). Disagreement: canonical `golden()` does *no* reduction mod 2*pi, while worlds.py imports `GOLDEN, hilbert, hilbert_order, lattice, morph` (worlds.py:31) but **not** `golden`, and re-implements it with `fmod` (worlds.py:137-138). The worlds.py docstring "using the canonical placement" (line 122) is true for the Hilbert half only. The vendored docstring also cites `test/verify_placement.mjs`, which does not exist in worlds-.
PATTERN: canonical-plus-vendored with "the canonical one wins"; empty-set-is-failure parity

### F11 The Kuiper belt of repositories: scaled Vogel, +137.5, and "class is a property, never a position"
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:152-158
QUOTE:
```python
        # The estate's own placement law, unchanged: r from the body's ordinal among sorted
        # keys, theta by the golden angle. Position encodes identity, neighbours are related,
        # and density is uniform. Class is a property of a body, never a position: moving a
        # body because of its class would be colouring without a function.
        k = i
        r = A_MIN + (A_MAX - A_MIN) * math.sqrt((k + 0.5) / n_bodies)
        theta = (k * GOLDEN) % (2 * math.pi)
```
WHY: This is the third form of the law: float golden angle `GOLDEN = 2.399963229728653` (estate.py:21; it equals pi*(3 - sqrt 5) to the last digit), +137.5 deg, radius sqrt((k + 0.5)/n) mapped onto an annulus [A_MIN, A_MAX]. The comment says "unchanged", but the law differs from the wafer in direction (+137.5 against +222.49) and in scaling. Maths 10:143 and 08a:25 record this honestly. The edition generator pipelinenews kuiper-edition/202610311905/tools/edition_belt.py:82-83 copies this form (without the `% (2*pi)`). The comment's rule, that position is identity and colour is class, is the reusable design law.
PATTERN: annulus-scaled Vogel spiral; identity-is-position, class-is-colour

### F12 Documentation that disagrees with the live law
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 SPEC-INFINITE.md:45-47
QUOTE:
```md
**The placement law is invertible, and this is the whole trick.** The wafer places by
`r = sqrt(k)`, `theta = k * 2.399963229728653`. Given a screen position you can invert it and recover
`k` directly. No spatial index. No lookup table. No stored coordinates for tens of millions of
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 index.html:79
QUOTE:
```js
//     key k  ->  r = sqrt(k),  theta = 2 pi frac(k G / 2^32),  G = 2654435769
```
WHY: Three statements of "the wafer law" in kuiper-belt disagree with the code at index.html:250. SPEC-INFINITE (commit a98ff90, 2026-09-19T03:52:01+01:00) says float golden angle and sqrt(k). That is wrong in direction, arithmetic and radius. It was written about 10 hours before the wafer adopted the odometer in 0755869 (2026-09-19T13:56:08+01:00) and never updated. index.html:79 (the file's own header) says sqrt(k), while lines 144 and 250 use k + 0.5. The on-screen caption at index.html:70 (`r = &radic;key, &theta; = key &times; golden angle`) gives neither the offset nor the chirality. tools/wafer_keys.py:80 and tools/wafer_topup.py:49 write `'r = sqrt(key), ...'` into cosmos/wafer-meta.json. That is the *data* law, which maths 10:126-134 distinguishes from the *drawn* law. Inversion still works: k = r^2 - 0.5 on the live view. The spec's claim is right in spirit and wrong in formula.
PATTERN: (anti-pattern) spec written before the implementation choice, never re-lifted

### F13 The same law packs copper: Vogel strands inside a conductor, and its copy in the star library
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 conductor.html:81
QUOTE:
```js
    for (let i = 0; i < c.n; i++) { const r = (o.D/2 - o.d/2)*Math.sqrt((i+0.5)/c.n), a = i*2.399963229728653; o.wires.push([r*Math.cos(a), r*Math.sin(a)]); }
```
KEY: stars@cbca125bb5eeb7d0ffb02f4546d60eb5d47dadc9 library/standalone.mjs:4852-4856
QUOTE:
```js
// Family #135184 · element #135184 · 67 places in 1 repositories · https://github.com/Ventusltd/globalgrid2050/blob/c66759f0d7ac3489df9158da6eaa1330a37c069f/kuiper-grid/i0073/releases/003100000000-kuiper-shell/conductor-round.html#L78-L97
export const f135184_settle = function settle(n, d, D, iters) {
  const R = D/2 - d/2, m = Math.min(n, Math.floor(Math.PI / Math.asin(d / (2*R)))), w = [];
  for (let j = 0; j < m; j++) { const a = 2*Math.PI*j/m; w.push([R*Math.cos(a), R*Math.sin(a)]); }
  const Ri = Math.max(0, R - d), k = n - m, N = iters === undefined ? 9000 : iters, soft = N*0.7;
```
WHY: The placement law leaves the archive and becomes engineering geometry. Strand centres of a stranded cable cross-section are seeded by r proportional to sqrt((i + 0.5)/n) at +137.5 deg (equal area per strand, the same pi-per-key property as maths 10:97), then relaxed (`settle`). The stars library carries it with full provenance to a pinned globalgrid2050 commit and line range ("67 places in 1 repositories"). This is the only place in the estate where the Kuiper law touches an electrical asset.
PATTERN: equal-area seeding then relaxation; provenance-stamped code families

### F14 Three layers, always in the same order: mathematics, code, plain English
KEY: trillion-loop@35fdea2f2744df338cfa7e28200e18008b307e73 README.md:7-17
QUOTE:
```md
Every algorithm here is documented in three layers, always in the same order:

1. **The mathematics.** Set-builder and standard notation. The space, the
   predicates, the survival rule, the fixed point. No code and no prose.
2. **The code.** The Python that implements exactly that mathematics, directly
   below it, short enough that each symbol above has one name below.
3. **Plain English.** No symbols and no numbers. Readable by someone who cannot
   read either layer above it, and still true.

Layer three is the one that matters. It is written last and carries the most
care, because a result nobody outside the room can check is not a result.
```
WHY: The rule is kept: `grep -c -E '^## (1\. The mathematics|2\. The code|3\. Plain English)$'` gives 3 in each of the 7 docs. Each doc also has a "Where the code and the mathematics differ" section (6 of 7; docs/02 has "...agree, and how that is shown" instead). docs/07:226-245 admits that its estimator "is not the Horvitz-Thompson estimator" and that a weighted miss figure "is an index of reach, not a probability". It is the inverse of the maths repo's order (problem first, formula last; maths/README.md:5-12). The two are complementary teaching laws for the edition. UNVERIFIED: every doc's `Source:` (trillion_loop.py, t01_kernel.py ... t13_coverage.py; docs/0N:3) is absent from trillion-loop and from every estate clone I searched with `find -name` (globalgrid2050 included). The code layer cannot be checked against running source.
PATTERN: three-layer documentation; "where the code and the mathematics differ" as a required section

### F15 4,590 designs, four verdict classes, and the same verdict kernel lifted to 295,770,420,000 cases
KEY: worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 src/worlds.py:66-70
QUOTE:
```c
double nb = floor(%(MAXV).1f / (v * (1.0 + b / 100.0 * (tm - 25.0))));
double na = floor(%(MAXV).1f / (v * (1.0 + b / 100.0 * (tm - 15.0))));
double dcac = (se * w / 1000.0) * st / %(KVA).1f;
bool band = (dcac >= %(LO).2f) && (dcac <= %(HI).2f);
code = (se > na) ? %(FC)d : ((se > nb) ? %(DI)d : (band ? %(OK)d : %(OB)d));
```
KEY: worlds-@b5f15716486c3ff509c56914fbee06f2e6aec2d8 atlas-lattice.json:43-51
QUOTE:
```json
 "evaluated": 295770420000,
 "seconds": 76.384,
 "verified_differ": 0,
 "verdicts": {
  "buildable, both readings": 44113872000,
  "disputed: the clause decides it": 12874202000,
  "fails cold voltage": 119414460000,
  "DC:AC outside the band": 119367886000
 }
```
WHY: "Disputed" is a first-class verdict: a design that passes at the -25 deg-offset reading (nb) and fails at the -15 reading (na) is neither buildable nor failed. Both readings are kept, never collapsed (README.md:48-52). I recomputed the 4,590 in plain Python and got 684 / 204 / 1,853 / 1,849, which matches README.md:43-46 and the legend parsed from worlds.html. 3 x 6 x 15 x 17 = 4,590, Hilbert order 7. The atlas lattice is 5800 x 3 x 5 x 11 x 6 x 15 x 17 x 2 x 101 = 295,770,420,000, all evaluated (`space` = `evaluated`). Caution from the repo's own later work: watch_ulp.py:12-17 shows that a "0 differ" certificate on a 200,000-case probe could not have caught last-bit threshold flips. So `verified_differ: 0` is consistency, not truth (as trillion-loop README.md:55-57 says).
PATTERN: boundary-class verdict ("disputed") carried with both readings; enumerate, don't sample

### F16 Hilbert curve and smoothstep morph: the slider from the archive to the swept plane
KEY: grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a src/placement.py:98-108
QUOTE:
```python
def morph(a, b, t, ease=True):
    """One point on its way from arrangement a to arrangement b.

    An arrangement is not a still. Moving the SAME points from one to another
    is what shows that one descends from the other: nothing is created or
    destroyed, only rearranged.
    """
    if not 0.0 <= t <= 1.0:
        raise ValueError("t must be in [0, 1]")
    k = t * t * (3.0 - 2.0 * t) if ease else t      # smoothstep
    return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
```
WHY: The golden spiral destroys locality on purpose (no spokes). The Hilbert curve (placement.py:60-81) preserves it, so a verdict boundary shows as an edge. The README states the tension in one line: "it depends on exactly the property the golden spiral is built to destroy" (worlds- README.md:26-27). worlds.html reproduces the same smoothstep in the browser (`const k=t*t*(3-2*t)`, worlds.py:182), so the page and the library interpolate identically. Choosing an arrangement is choosing what "near" means (placement.py:6-8). That is a law the gridatlas map could state for its own layers.
PATTERN: two arrangements, one point set, an eased bijection between them

### F17 Small defects in the mathematics as published
KEY: maths@b898a5ee39aa81a45197c5f17ba1195727aa538e 10-kuiper-placement-law.md:169
QUOTE:
```md
1. Key 9: radius 3? Area inside it $\pi	imes 9 = 28.274334$?
```
WHY: `cat -A` shows `$\pi^Iimes 9` here: a literal TAB followed by "imes". `\t` in `\times` was eaten by an escape on the way in, so GitHub renders "pi<tab>imes 9", not "pi x 9". It is the only such defect: grep for a TAB in maths/*.md hit only this line in note 10. Others found: 10:159 "43,486,619,138 issued keys" is stale against 45,461,911,314. worlds- README.md:67 and worlds.py:76 say "~11,012" rad, but the computed value is 11,013.43. maths 07a:60 "So the angle is exact and identical on every machine" holds for the integer m, not for the float cos/sin that follows. worlds- README.md:67-69 is the counter-evidence: hosts disagree on trig far out.
PATTERN: (none; defects for the errata box)

### F18 The array drawing tool does not use the Kuiper law (and carries a lost character)
KEY: kuiper-drawing-engine@ee69a07a7ebf71f2f20c052f392991f115fdbee0 web/site.mjs:5
QUOTE:
```js
 const size=max.map((v,i)=>v-min[i]),tables=Math.ceil(p.modules/a.modules.length),columns=Math.ceil(Math.sqrt(tables)),rows=Math.ceil(tables/columns),pitch=size.map(v=>v+3);
```
WHY: Despite the name, kuiper-drawing-engine places plant tables on a near-square grid (`columns = ceil(sqrt(tables))`), not on the golden spiral. Grep for every law constant in web/ tools/ tests/ returns nothing. That is the right choice for a physical array, and an honest null for the table. Its law is input validation instead: web/geometry.mjs:3-15 rejects unknown keys, non-finite numbers and out-of-range values, and 11 of 11 tests pass. Defect: web/geometry.mjs:13 has a user-facing error string "reachable with this table at 0?60 degrees". `od -c` shows a literal `?` where an en dash was lost.
PATTERN: fail-closed settings validation (null result for the placement law)

## Keyed table: every implementation of the law across the estate

Grep (as briefed): `grep -rEil --include=*.js --include=*.mjs --include=*.py --include=*.html --include=*.md --exclude-dir={node_modules,vendor,.git,globalgrid2050} -e '2654435769|9E3779B9|0x9e3779b9|2\.399963229728653|137\.507764|222\.492236|0\.6180339887|1\.618033' /home/user/estate /home/user/pipelinenews` gives **120 files**, 430 matching lines. 92 of the 120 are in kuiper-belt/learn-the-kuiper and see-through dated editions (largely identical copies). A second grep for computed forms (`3 - Math.sqrt(5)`, `math.pi * (3.0 - math.sqrt(5.0))`) adds grid-distance-maths, worlds-, galaxies-wafers/iterations/36, particle-physics coax-field-test. globalgrid2050 (grep -l only): **149 files**, of which 96 are under testcode/wafer-development-environment/2026091913..2215-proof-*, 48 are under kuiper-grid/i00NN/releases/003100000000-kuiper-shell/{index,conductor,conductor-round}.html, 3 are under kuiper/releases/202609192301-kuiper-shell/, and there is 1 each in kuiper-grid/drawing/renderer.html and ventus/wiring/renderer.html. Focus repos: gridatlas, data-grid-gb, data-centres-gb and data-gridatlas have **0** files with any constant. The one gridatlas "vogel" word is a test name, `kv-vogel`, at tools/ci/lightning/overlay-engine.test.mjs:1066.

Legend. Radius: `k` = sqrt(k); `k+.5` = sqrt(k + 0.5); `scaled` = a + (b - a)*sqrt((k + .5)/n). Turn: `+222.49` = wafer chirality; `+137.5` = mirror (teaching/belt). Arithmetic: `odo32` = exact 32-bit integer (k*2654435769 mod 2^32); `f64` = float golden angle accumulated as k*GA; `f64-red` = with fmod reduction; `f32` = GPU float. FLAG marks a disagreement with the live wafer (F1), or within a repo.

| # | repo@sha (short) | path:line | radius | turn | arithmetic | role | flag |
|---|---|---|---|---|---|---|---|
| 1 | kuiper-belt@b243e38 | index.html:250 | k+.5 (keys from 0) | +222.49 | odo32 (Math.imul) | live wafer, CPU | reference |
| 2 | kuiper-belt@b243e38 | index.html:144-147 | k+.5 rationalised | +222.49 | odo32 uint, f32 split angle | live wafer, GPU | agrees (f32 error F9) |
| 3 | kuiper-belt@b243e38 | index.html:79 | k | +222.49 | odo32 | header comment | FLAG radius |
| 4 | kuiper-belt@b243e38 | index.html:70 | k ("√key") | "golden angle" (unstated) | n/a | on-screen caption | FLAG radius, chirality unstated |
| 5 | kuiper-belt@b243e38 | tools/wafer_keys.py:80; tools/wafer_topup.py:49 | k | +222.49 | odo32 | data law string in wafer-meta.json | data law (maths 10:126 distinguishes it) |
| 6 | kuiper-belt@b243e38 | tools/estate.py:21,157-158 | scaled | +137.5 | f64-red | belt of repositories | FLAG mirror (documented in 08a) |
| 7 | kuiper-belt@b243e38 | conductor.html:81 | scaled (strands) | +137.5 | f64 | cable strand seeding | different object, OK |
| 8 | kuiper-belt@b243e38 | SPEC-INFINITE.md:46 | k | +137.5 | f64 | spec claims this is the wafer | FLAG all three axes |
| 9 | kuiper-belt@b243e38 | learn-the-kuiper/202610050609/kuiper-law.js:39 (13 identical copies, sha256 2c7512ea1bfd) | k+.5 | +222.49 | odo32 + f32 replica (:63-74) | verbatim lift | agrees |
| 10 | kuiper-belt@b243e38 | learn-the-kuiper/202610050609/kuiper-law.js:103 | k | +137.5 | f64 degrees | teach.excel, labelled NOT THE REAL KUIPER | intentional |
| 11 | kuiper-belt@b243e38 | learn-the-kuiper/202610050609/modules/grid.js:17 (and descent.js:23) | (station cluster) | +137.5 | f64 | station cluster dots | different object |
| 12 | kuiper-belt@b243e38 | learn-the-kuiper/astra-codex/202610042233/logic.js:41 | power 0.5, offset 0.5 | +222.49 | turnNumber 2654435769, wrap 2^32 | "is this the real Kuiper?" predicate | agrees |
| 13 | kuiper-belt@b243e38 | learn-the-kuiper/build-your-own-kuiper/README.md:2 | k (keys 1..1000) | +222.49 | odo32 in Excel MOD | spreadsheet recipe | radius differs (intended, exact below key 3,393,263) |
| 14 | maths@b898a5e | 10-kuiper-placement-law.md:53 | k | +137.5 | f64 degrees | teaching version | labelled, warns at :56 |
| 15 | maths@b898a5e | 10-kuiper-placement-law.md:104-110,122 | k | +222.49 | odo32 | production law | agrees (data law) |
| 16 | maths@b898a5e | 10-kuiper-placement-law.md:131 | k+.5 | +222.49 | n/a | "what the live page draws" | agrees |
| 17 | maths@b898a5e | 10-kuiper-placement-law.md:162 | n/a | +222.49 | odo32 by 16-bit limbs in Excel | split formula | agrees (verified) |
| 18 | grid-distance-maths@8e91b07 | src/placement.py:38-47; src/placement.mjs:15-21 | k (x spacing) | +137.5 | f64, no reduction | canonical "Kuiper arrangement" | FLAG mirror; no fmod (contrast #20) |
| 19 | worlds-@b5f1571 | src/placement.py:38-47 | k | +137.5 | f64 | vendored, byte-identical to #18 | same as #18 |
| 20 | worlds-@b5f1571 | src/worlds.py:74-79, 137-138 | k (keys from 0) | +137.5 | f64-red (fmod), f32 output | GPU kernel + CPU reference | FLAG mirror; diverges from #18 by fmod |
| 21 | galaxies-wafers@fff6fc6 | wafer.mjs:43,53 (also iterations/11-the-bond, 12-visibility-lab; testcode@d09c185 sandbox/202609151802, 1815, 1852: 5 more copies) | k | +137.5 | f64 | galaxy wafer `place(key)` | FLAG mirror, radius |
| 22 | galaxies-wafers@fff6fc6 | iterations/36-elements-assembly/assembly.mjs:36 | k | +137.5 | f64 | molecule layout | different object |
| 23 | particle-physics-drawing-engine@eb52ad7 | tools/particles.py:49-50 | sqrt(sum of weights) | +137.5 via 2*pi*(1 - frac) | odo32 | particle layers, 2^18 slots | mirror, by design (F6) |
| 24 | particle-physics-drawing-engine@eb52ad7 | measurements/exactness.mjs:5-62 | k | both | 256-bit BigInt truth, int32, int64 C64, f32, f64 | exactness test | the judge (F2, F3) |
| 25 | particle-physics-drawing-engine@eb52ad7 | tools/underground.py:89-90 | 0.004*sqrt(i) | +137.5 | f64 | station dots | different object |
| 26 | stars@cbca125 | library/standalone.mjs:4857 | scaled (strands) | +137.5 | f64 | copy of conductor settle (#7) | provenance-stamped copy |
| 27 | stars@cbca125 | LINES.md:99845 (`let seed = 0x9e3779b9;`) | n/a | n/a | PRNG seed | not placement | false positive |
| 28 | pipelinenews@de3e68e | kuiper-edition/202610311905/tools/edition_belt.py:82-83 | scaled | +137.5 | f64, no fmod | this edition's belt | follows #6; drops `% 2pi` |
| 29 | galaxies-wafers@fff6fc6 | build/tile_layer.py:47 | k, banded by isqrt(key)//S | n/a | exact integer | tile bands of the disc | agrees with r = sqrt(k) exactly |

Disagreement summary (keyed above). (1) Chirality: the live wafer turns +222.49. Every float implementation (#6, 7, 18-22, 25, 26, 28) and particles.py turn +137.5. That is 2 families, mirror images, and 08a is the only reconciling text. (2) Radius: the live view uses sqrt(k + 0.5). The data law, SPEC, header comment, canonical placement and galaxies use sqrt(k). (3) Arithmetic: odo32 is exact but periodic at 2^32 and non-golden past about 6.5e7 keys (F3). f64 is near-golden to 5.67e-7 rad error at k = 2^31 (exactness-result.txt:13) but needs argument reduction for cross-library agreement (F5). (4) Reduction: worlds.py reduces, while canonical placement and edition_belt.py do not.

## Patterns (keyed; each cites at least one F above)
- **Integer-exact angle, float last** (F1, F6, F7, F9; table rows #1, #2, #17, #23): carry the angle as an exact 32-bit integer and convert to radians only at the end. Excel (F7), JS (F1) and GLSL (F9) each reach the same m by a different route: `MOD` limbs, `Math.imul`, uint wrap.
- **Exact ground truth by integer iteration** (F2): Heron in BigInt to 256 bits, used to score every float law.
- **Zero-tolerance twin gate that blocks the artefact** (F4, F10): `if worst > 0: return 1` before `page()`, and "A check that reached nothing is not a pass."
- **Determinism contracts for floats** (F5): reduce before trig; serialise constants with %.17g.
- **Lift, don't rewrite; label the wrong model** (F8): verbatim copy with a line reference, a float32 replica of the GPU, and a teaching variant whose return value says NOT THE REAL KUIPER.
- **Name the chirality** (F6, F11, F12): two golden spirals exist; reconcile with 1 - frac, and say which one you mean.
- **Measure at deployed scale** (F3): the law's quality at key 1 says nothing about key 4.5e10.
- **Three-layer documentation** (F14) against **problem-first notes** (maths README): both put a check for the non-specialist in the text.
- **Boundary verdict carried with both readings** (F15).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)
- **2026-09-19, one day, three laws.** kuiper-belt fc08c098d62d300d4913c4e5fa19f4c5bf751254 (2026-09-19T00:18:59+01:00) introduces `GOLDEN = 2.399963229728653` in tools/estate.py (+137.5). a98ff90b33ac07a52773501f12dea8dae4169635 (03:52:01+01:00) writes SPEC-INFINITE with the float law as "the wafer". 0755869facbe055f663ab9fbffb32f2eefc8c737 (13:56:08+01:00) ships the wafer with `G32 = 2654435769`, `Math.imul` and `sqrt(k + 0.5)`. That is the same commit for the shader radius (found with `git log -S'u_R0 + (d + 0.5)'` and `-S'G32 = 2654435769'`). The spec was never re-lifted (F12). globalgrid2050 testcode/wafer-development-environment/202609191325-proof-3 .. 202609192215-proof-s0004 (96 files, path stamps) are the same day's prototypes.
- **2026-09-21, the worlds- storm.** 58 commits between 01:29:24+01:00 (dd184be3d12e5379fa6bdcdfc89a24cd77a3e214) and 16:59:58+01:00 (b5f15716486c3ff509c56914fbee06f2e6aec2d8). grid-distance-maths 8e91b07d8312acca5bcaef43e839f06a3b1d642a (placement, 01:41:08) precedes worlds- 17cb850bff1dddd1d2403e78d5c77efe6b41425d (01:44:30) by 202 s: canonical first, vendor second. 17 commits "night results, published automatically" at about 20-minute cadence, 02:27-07:48. 11 commits "...an answer moved". Then the self-correction turn: 4868cf6fd32008ade4b68d23338a58d8d94df119 "\"0 differ on 200,000 cases\" reads like proof and is not", ada42a90c2b8ed3079fd2fc04fb23694c5dde33f "161 of the partings I published were made by my own generator", 28406d53a1f501460c386d8c0fc0981e5aaa5d78 "correct the overnight total: 31.29 trillion, not 17.39", eae9edeeaa4c905f7a4ac628fc9803648e710c2b "The verdict gate now gates the repository, not IEEE-754" (body: a gate that "returned 1 on every run for ever ... A red light that cannot turn green is not a light"), 0af50bcfdead41b14bb73c0c03418e27c46ee918 "The derivation sieve absorbed everything, so its zero meant nothing". Scrubs: 5f4294623e7fcd2a1c977eb7037fa9a9a93bbf19, f74b682f8afce33a5d6dd0e31034f80fa450d677 ("Scrub the account path that the last scrub's own commit reintroduced").
- **2026-09-21 trillion-loop**: 6eb29426885f6eb4d2a2fc0951898485e470c4f0 (15:28:53+01:00) initial, then 35fdea2f2744df338cfa7e28200e18008b307e73 (15:44:33+01:00) "Document the trillion loop in three layers": all 7 docs in one commit.
- **2026-09-25 kuiper-drawing-engine**: 24 commits, dff7ec1168661f263804422dbccf0c9b45404322 (00:37:18+01:00) to ee69a07a7ebf71f2f20c052f392991f115fdbee0 (15:17:02+01:00), single account.
- **2026-10-04/05 maths**: 1f15bf0732ce80a81b3062c3a5ffd1533de17b0c (15:10:01+01:00) to b898a5ee39aa81a45197c5f17ba1195727aa538e (2026-10-05T15:02:26+01:00), 8 commits. **Turning point** 9e236d48286a6920e5f5c3e7a891ee7018b652b2 (2026-10-04T21:02:39+01:00). Before it, 10-kuiper-placement-law.md said "area grow roughly in step" and "closely related to scaling the 32-bit range by the reciprocal of the golden ratio". After it, "exactly", "222.492236", "rounded down (hex 9E3779B9)", the +0.5 table and the Excel limit. That is the day the teaching caught up with the code (index.html, 0755869, 15 days earlier).
- Authorship: worlds-, maths, grid-distance-maths and kuiper-drawing-engine are 100% one org account (`git log --format=%an | sort | uniq -c`). trillion-loop has 1 commit under the org account and 1 under the owner's personal account name.

## Gridatlas and datacentre relevance (how this slice bears on the focus)
- **The Kuiper law is not in gridatlas or the datacentre lanes.** 0 files with any constant in gridatlas@cacb69a, data-grid-gb@b57c94d, data-centres-gb@f9f4728 or data-gridatlas@8bf88da (grep above). tools/offtakers/src has no spiral, jitter or `Math.imul`. The map places by geography (lat/lon), as it should. The law's place in the focus is therefore in *method*, not in coordinates.
- **What transfers.** (a) worlds-'s zero-tolerance gate (F4) is the pattern gridatlas's release flow could apply to the DC engine 30/30/30 counts: compute every count twice by different routes and refuse to write the cartridge on any difference. (b) The "disputed" verdict class with both readings (F15) maps directly onto datacentre sites whose connection status depends on which source lane is read (NESO against planning against DNO). Keep both, never collapse. (c) The canonical-plus-vendored rule with a parity test that fails on an empty set (F10) is the rule for any geodesy that gridatlas and data-grid-gb share; grid-distance-maths already holds geodesy.py/.mjs under the same regime. (d) If the edition draws the 225 mappable datacentre sites or 886 connection points as a Kuiper belt, it should use the belt form (#6/#28: scaled, +137.5, ordinal by sorted key) and say so. It should not claim to be the wafer law (F12).
- **Scale warning for any datacentre or grid wafer**: below 6.5e7 keys the odo32 law is golden (F3). The 1,392 circuits, 886 points and 227 sites are nowhere near the limit. A line-level wafer of globalgrid2050 (47,277 files) could be.

## Candidates (unkeyed; clearly marked)
- Candidate: globalgrid2050 kuiper-grid/i00NN/releases/003100000000-kuiper-shell/index.html (48 files) may hold older revisions of the keyPlace line. I read them with grep -l only, so I did not verify whether any differ from kuiper-belt index.html:250.
- Candidate: the float32 shader's visible error at the rim (F9, about 0.09 units of position) may be the source of the "photons" the kuiper-law.js header says are reported in `kuiper-law.receipt.json`. I did not read that file.
- Candidate: the odo32 law past 2^32 keys places about 10.6 keys per angle on a single ray. Whether this is visible as radial striping on the live wafer at full zoom-out was not tested.
- Candidate: replacing C32 with the 64-bit constant C64 = 11400714819323198485 (exactness.mjs:19, measured at 6.961e-10 rad error at k = 2^31, against 1.562 rad for int32) would remove both F3 caveats. A WebGL2 limb implementation (`mulhi32`) is already proven at 0 disagreements in 1e6 slots.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)
1. kuiper-belt index.html:250 (F1): the law itself, as it runs.
2. particle-physics-drawing-engine measurements/exactness.mjs:5 (F2): the deterministic square root, in nine tokens of BigInt; pair with maths 11:76.
3. particle-physics-drawing-engine measurements/exactness-result.txt:18-19 (F3): the honest limit of the law; the edition should print it beside line 1.
4. worlds- src/worlds.py:238-240 (F4): `if worst > 0: ... return 1`, the refusal that makes the picture evidence.
5. worlds- src/worlds.py:75-79 (F5): "REDUCE BEFORE THE TRIG."
6. kuiper-belt index.html:144 and :146 (F9): big integers kept out of float32 by algebra.
7. maths 08a:17-18 (F6): `222.492236° + 137.507764° = 360°`, the one-line chirality key for every reader.
8. grid-distance-maths test/verify_placement.mjs:54 (F10): "A check that reached nothing is not a pass."
9. kuiper-belt learn-the-kuiper/202610050609/kuiper-law.js:105 (F8): a wrong model that says so in its own output.
10. trillion-loop README.md:16-17 (F14): "a result nobody outside the room can check is not a result."
Errata box: maths 10:169 (TAB-eaten `\times`), 10:159 (stale key count), kuiper-belt SPEC-INFINITE.md:46 and index.html:79 (law stated as sqrt(k)/float), worlds- README.md:67 (11,012 should be about 11,013), kuiper-drawing-engine web/geometry.mjs:13 (`0?60`).

## One next command (exactly one, runnable from a clone)
```
cd /home/user/estate/particle-physics-drawing-engine && node measurements/exactness.mjs | diff - measurements/exactness-result.txt && echo "exactness reproduced byte-for-byte"
```
