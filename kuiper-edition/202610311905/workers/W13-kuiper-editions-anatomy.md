# W13 kuiper-editions-anatomy
HEADS: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 (HEAD commit dated 2026-10-31T12:43:52+00:00; 234 commits; `git rev-parse --is-shallow-repository` = false)
READ:
kuiper-belt/learn-the-kuiper/README.md
kuiper-belt/learn-the-kuiper/index.html
kuiper-belt/learn-the-kuiper/build-your-own-kuiper/README.md
kuiper-belt/learn-the-kuiper/<9 dated folders> (ls -la, diff -rq, git log)
kuiper-belt/learn-the-kuiper/astra-codex/202610042233/README.md, index.html (head)
kuiper-belt/learn-the-kuiper/202610050609/README.txt, NOTICE.md, kuiper-law.js, index.html, one.js (lines 12-18, 100-112), learn-the-kuiper.zip (unzip -l, extracted to /tmp)
kuiper-belt/see-through/README.md
kuiper-belt/see-through/index.html
kuiper-belt/see-through/<3 dated folders> (ls -la, diff -rq, git log)
kuiper-belt/see-through/202610050609/README.md, LICENSE.md, NOTICE.md, index.html, grid-data.js, descent.js, pf.js, model.js, data/osm/*.json (heads), data/substations-footprints.odbl.json (head), vendor/maplibre-gl.js (licence header)
kuiper-belt/.gitattributes, LICENSE (head), README.md:150-160, LAWS.md:128-135
kuiper-belt/diary/2026-10-05-public-links.json, diary/2026-10-05-learn-kuiper-project-links.md
kuiper-belt git: log of learn-the-kuiper and see-through; show 55db60c, 1b54cdc, 17c8da9, e98991a, d303932, 01ac470; 7a65dd3:index.html; 55db60c^:learn-the-kuiper/202610050010/kuiper-law.receipt.json
NOT READ (per brief): ABOUT.md

K = kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 (every KEY below uses this sha)

## Findings (keyed)

### F1 The placement law, one frozen file, byte-identical in all 13 editions
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/kuiper-law.js:22-29
QUOTE:
```js
// WHAT THE LAW SAYS, in words that match the code exactly:
//   keys start at 0.  m = (key * 2654435769) mod 2^32, an unsigned 32-bit integer product (Math.imul, wrapping).
//   turns = m / 2^32           the angle as a fraction of one full turn, in [0, 1)
//   theta = 2 pi turns         radians, anticlockwise from +x, with world y UP on screen (WebGL clip space, :148; overlay :357)
//   r     = sqrt(key + 0.5)    the radius; NOT sqrt(key). The half is in the live code at :250 and :144.
//   Successive keys turn by G32/2^32 = 0.6180339887 of a turn = 222.4922 degrees anticlockwise on screen, which is the
//   same point as 137.5078 degrees CLOCKWISE. The Excel "137.5 anticlockwise" spiral is the MIRROR IMAGE of the Kuiper.
//   Keys beyond 2^32 wrap: key % 4294967296 first (:250), and the shader gets the low 32 bits of the batch offset (:334).
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/kuiper-law.js:38-40
QUOTE:
```js
  // index.html:250-251, VERBATIM. This is the electron. Do not edit it; edit the live page and re-lift.
  function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);
    return [r*Math.cos(th), r*Math.sin(th)]; }
```
WHY: This is the one rule every edition teaches and ships. `md5sum learn-the-kuiper/*/kuiper-law.js learn-the-kuiper/astra-codex/*/kuiper-law.js see-through/*/kuiper-law.js` returns the single digest `60c004ee5618572bab86a527f4367478` for all 13 copies (9 learn + 1 astra-codex + 3 see-through), 8,388 bytes each. `sha256sum` of the 202610050609 copy is `2c7512ea1bfdc65f646684655338fa9e2e0564fa89ba38b42577cbc1ceb564ea`, exactly the `kuiper_law_sha256` recorded in the deleted fidelity receipt (F9). The lifted `keyPlace` still matches root `index.html:250-251` at HEAD (only leading indentation differs; checked with `diff <(sed -n '250,251p' index.html) <(sed -n '39,40p' .../kuiper-law.js)`). Correction for the swarm: the brief states the law as `r = sqrt(k)`; the live and shipped law is `r = sqrt(k + 0.5)`, keys from 0.
PATTERN: Verbatim lift with source line numbers ("electron/positron"): copy the live function, cite its commit and lines, freeze it, never edit the copy.

### F2 The stable link is a three-place pointer to one dated folder
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/index.html:7-12
QUOTE:
```html
<meta http-equiv="refresh" content="0; url=202610050609/">
<style>html,body{margin:0;height:100%;background:#000;color:#fff;font:700 24px/1.4 "Segoe UI",Arial,sans-serif}a{color:#00ffff}main{padding:32px 20px}</style>
</head>
<body>
<main>Opening the latest Learn the Kuiper. <a href="202610050609/">Tap here if it does not open.</a></main>
<script>location.replace('202610050609/' + location.hash);</script>
```
WHY: The stable URL `.../learn-the-kuiper/` resolves to the newest edition by a hard-coded stamp in three places: meta refresh (:7), fallback anchor (:11) and `location.replace` that preserves the `#hash` deep link (:12). Nothing scans folders; the pointer IS the release act. `see-through/index.html:7,11,12` is the same shape pointing at `202610050609/`. History of the pointer (from `git show <c> -- learn-the-kuiper/index.html | grep url=`): e98991a 202610050010 -> 17c8da9 202610042346 -> 77258c4 202610050144 -> e9d86c4 202610050204 -> fb68c29 202610050354 -> ee0874b 202610050501 -> d303932 202610050609. See-through: 01ac470 202610050356 -> 7442288 202610050513 -> d303932 202610050609. From 77258c4 on, every pointer move is in the same commit as the new folder.
PATTERN: Immutable dated folders + one mutable pointer (same shape as gridatlas `atlas/current.json`).

### F3 Folder rules are written down: stamp naming, newest-wins, earlier folders kept unchanged
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/README.md:27-32
QUOTE:
```md
## How the folders are organised

- The stable link above always opens the newest dated folder.
- Each folder is named by a date and time stamp: year, month, day, hour, minute.
- Earlier dated folders are kept unchanged as history, so old links keep working.
- `astra-codex/202610042233/` is a separate version of the same idea, kept the same way.
```
WHY: The edition contract in four lines. `see-through/README.md:21-25` repeats the first three bullets verbatim. These are the rules the new edition must obey (see "Anatomy of an edition" below for where history departs from them: F4, F5).
PATTERN: Append-only release folders.

### F4 Turning point: the stamp is not the chronology (version 3 is future-stamped)
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/index.html:7
QUOTE:
```html
<meta http-equiv="refresh" content="0; url=202610050609/">
```
WHY: `git log --format='%H %ad %s' --date=iso-strict -- learn-the-kuiper see-through` shows `1b54cdc... 2026-10-04T23:20:16+01:00 learn-the-kuiper: version 3 202610050010` and then `17c8da9... 2026-10-04T23:47:09+01:00 learn-the-kuiper: version 4 202610042346 (... latest link moved)`. Folder 202610050010 was committed 50 minutes BEFORE the time its name claims, and version 4 (202610042346) sorts lexically BEFORE version 3. Every other stamp is 0 to 4 minutes before its commit time in +01:00 (Europe/London summer time), e.g. 202610050609 -> commit 06:09:57+01:00. Consequence for the harness: "newest folder" must be read from the index pointer (or git), never from `ls | sort | tail -1`; and a new stamp must be the real local time at commit and strictly greater than every existing stamp. Note: 202610311905 (the brief's stamp, 19:05:00Z) is UTC; on 2026-10-31 London is on GMT, so it coincides with local time, but the earlier editions' stamps are +01:00 local.
PATTERN: Monotonic stamp invariant (violated once; caught by the pointer, not by the name).

### F5 Turning point: one documented sweep rewrote every earlier folder
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/README.md:31
QUOTE:
```md
- Earlier dated folders are kept unchanged as history, so old links keep working.
```
WHY: `git log -- learn-the-kuiper/<stamp>` shows each earlier folder touched by exactly two commits: its own publication commit and `55db60ca29cacb7e97019aa53b684598f456c037` (2026-10-05T09:42:02+01:00, "public front pages and tidy documentation", 49 files, +363/-3620). Its body states the exception: "In earlier folders only, single text replacements remove a local file path, audience labels and builder names from what a visitor reads. Program code in the newest folders is unchanged." It also deleted every `kuiper-law.receipt.json`, `scale-logic.receipt.json` and astra-codex `verification-summary.json`, and "each learn-the-kuiper.zip rebuilt to match its folder". So "unchanged" means: no behaviour change after publication; a privacy/hygiene sweep with a commit message is tolerated. After 55db60c only the newest folders (202610050609) were touched again (9c5c140, 613b10f, 8e24d1f). The new edition must not touch earlier folders at all.
PATTERN: Immutability with an explicit, single, explained exception commit.

### F6 Licences differ by folder: Apache-2.0 + CC BY 4.0 (learn) vs CERN-OHL-S v2 (see-through)
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 see-through/202610050609/LICENSE.md:1-7
QUOTE:
```md
# Licence

See Through reuses simulator code by Ventus Ltd from the globalgrid2050 repository (place-frame.mjs,
mod/pylons-real.js, mod/substations.js, and the method of overlay.html, mod/wire-look.js, mod/morph.js, mod/perf.js).
That code is licensed CERN-OHL-S v2 (strongly reciprocal). See Through is a separate app built on that code and is
offered under the same licence: CERN Open Hardware Licence Version 2, Strongly Reciprocal.
Full text: `licences/globalgrid2050-CERN-OHL-S-2.0.txt`.
```
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/NOTICE.md:7-11
QUOTE:
```md
Code in this folder is Apache-2.0, as the kuiper-belt repository (see its `LICENSE`); documentation and generated data
are CC BY 4.0. Two parts are adapted from the globalgrid2050 repository and keep its licence, CERN-OHL-S v2:

- `modules/grid.js`: the DRAW THE GRID animation, from `testcode/wafer-development-environment/202609180245-real-systems`.
- `modules/zoom.js`: the touch joystick pattern, from `energy-transition-simulator/202609282123/mod/walk-fps.js`.
```
WHY: The reciprocal licence follows the reused code, per file in learn-the-kuiper and per whole app in see-through. The repo default is `README.md:156-157` ("Code is licensed under Apache-2.0, see [LICENSE](LICENSE); documentation and generated data under CC BY 4.0"). Notable: the identical `kuiper-law.js` (F1) is Apache-2.0 in learn-the-kuiper and "CERN-OHL-S v2 here" in see-through (`see-through/202610050609/NOTICE.md:11`). Only see-through folders carry a `LICENSE.md` and a `licences/` full text (15,156 bytes); learn-the-kuiper relies on the repo-root `LICENSE` (Apache 2.0) and carries no licence text in its zip.
PATTERN: Licence travels with the reused file; reciprocal code makes the whole app reciprocal.

### F7 NOTICE convention: a per-file provenance table, sources with commits, network use, acknowledgements
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 see-through/202610050609/NOTICE.md:8-16
QUOTE:
```md
| File here | Came from | Licence |
|---|---|---|
| `descent.js` | the SEE THROUGH module of Learn the Kuiper (`modules/descent.js`), adapted | CERN-OHL-S v2 here |
| `kuiper-law.js`, `grid-data.js` | Learn the Kuiper (`grid-data.js` carries OpenStreetMap data, see below) | CERN-OHL-S v2 here |
| `pf.js` | globalgrid2050 `energy-transition-simulator/202609282123/place-frame.mjs` (c5ac5219), only `export` removed | CERN-OHL-S v2 |
| `model.js` (parts, cited by line in its header) | globalgrid2050 `.../mod/pylons-real.js` and `.../mod/substations.js` | CERN-OHL-S v2 |
| `see3d.js` (method, cited by line) | globalgrid2050 `.../overlay.html`, `.../mod/wire-look.js`, `.../mod/morph.js`, `.../mod/perf.js` | CERN-OHL-S v2 |
| `vendor/joystick.js` | globalgrid2050 simulator joystick (verbatim extract) | CERN-OHL-S v2 |
| `data/substations-footprints.odbl.json` | globalgrid2050 `.../mod/substations-footprints.odbl.json` (OpenStreetMap outlines matched to GridAtlas points) | ODbL 1.0 (data) |
```
WHY: The NOTICE pattern every new edition should copy: header line "Credits and licences for this folder" + "All source repositories belong to Ventus Ltd"; then Licence, Sources (file -> origin repo/path/commit -> licence), third-party data and services with the exact on-screen credit string, third-party software with version and licence file, Network use ("No account, key or tracking", :43), Fonts, and Acknowledgements (Fibonacci 1202, Bravais 1837, Vogel 1979, Knuth 1973, ending "Any error in how their work is used here is ours."). The Acknowledgements section was added to the newest folders only, after publication, by 8e24d1f (2026-10-05T11:03:37+01:00); `diff learn-the-kuiper/202610050501/NOTICE.md learn-the-kuiper/202610050609/NOTICE.md` shows it plus an Esri credit change ("Esri, Maxar, ..." -> "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community"). Earlier folders keep the old Esri wording.
PATTERN: Provenance table in a NOTICE beside the code (README law: "the attribution travels with the data").

### F8 The offline zip is the folder minus itself, built on a Windows/FAT host with CRLF line endings
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 .gitattributes:1-3
QUOTE:
```
# Text is stored and checked out with LF, so the file on disk is the file that ships,
# and a digest taken on one machine matches a digest taken on another. See LAWS.md, L9.
* text=auto eol=lf
```
WHY: No zip build script exists in the repo (`Grep "learn-the-kuiper\.zip|zipfile|make_zip|\bzip -"` finds only the download link in `start-here.js:619-621` and README mentions). `unzip -l learn-the-kuiper/202610050609/learn-the-kuiper.zip` lists 26 entries under a root folder `learn-the-kuiper/` (1,803,997 bytes uncompressed; archive 654,315 bytes), host "fat". Extracted and compared: `diff -rq --strip-trailing-cr <zip>/learn-the-kuiper learn-the-kuiper/202610050609` reports only `Only in ...: learn-the-kuiper.zip` - so the content matches the folder, but `file` shows the zipped text has CRLF terminators while the tracked files are LF. The zip therefore breaks the `.gitattributes` promise that "a digest taken on one machine matches a digest taken on another": file digests inside the zip differ from the tracked files. A new edition's zip should be built deterministically (LF, fixed order, fixed mtimes) by a committed script.
PATTERN: Release artefact must be reproducible (L9); currently UNVERIFIED as reproducible, no builder in repo.

### F9 The fidelity receipt that proved F1 was deleted; a dangling reference remains in the law file
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/kuiper-law.js:61-62
QUOTE:
```js
  // The vertex shader at :143-148 reproduced in float32, as the GPU computes it. The live view itself has these float32
  // differences from keyPlace; they are reported separately in kuiper-law.receipt.json and are not photons.
```
WHY: `ls learn-the-kuiper/*/kuiper-law.receipt.json` finds nothing at HEAD; 55db60c removed them (F5). `git show 55db60c^:learn-the-kuiper/202610050010/kuiper-law.receipt.json` begins `"gate": "FIDELITY GATE: electron (live index.html keyPlace executed from the file text) vs positron (kuiper-law.js)"`, `"live_index_sha256": "425a03d5...1bccb"`, `"kuiper_law_sha256": "2c7512ea...b564ea"`, `"verbatim_comments_checked": 14, "verbatim_comments_wrong": 0`. Re-checked now: `git show 7a65dd3:index.html | sha256sum` = 425a03d53f4a5d77743f8c1cf67cfaa1b2bf47ffcf39be2d7e52339d3271bccb and the law file hash = 2c7512ea... - both match. The proof survives in git history only; the shipped comment points at a file that no longer ships. Recommendation: the new edition either ships the receipt or rewrites line 62 in the NEW folder's copy only by re-lifting (the file says "Do not edit it; edit the live page and re-lift").
PATTERN: Receipt beside the artefact (gate: hash of source + hash of copy + per-line verbatim check).

### F10 See Through loads 5,800 substations from one script global, one node per substation
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 see-through/202610050609/grid-data.js:1-8
QUOTE:
```js
// grid-data.js  DRAW THE GRID network data, built by a script from the owner's public files in globalgrid2050
// testcode/wafer-development-environment/202609180245-real-systems/*-network.json (origin/main).
// Kept: every node, every edge, every substation name, each file's own source, attribution and law, verbatim.
// Simplified: coordinates stored as integers in units of 1e-4 of the frame (the source already rounds to 4 decimals,
// so this is lossless); edges stored as [a minus previous a, b minus a]; line names on the 400 kV and 132 kV
// vertices (the circuit name repeated on every vertex) are dropped because only substations are tapped.
// Attribution: OpenStreetMap-derived layers are (c) OpenStreetMap contributors, ODbL; the coastline is Natural Earth, public domain.
"law":"one node per substation, no edges: the particles cluster at each","file":"substations-network.json","n":5800,"xy":[
```
(line 8 is a 587 KB single line; the last quoted line is a verbatim substring of it, confirmed with `sed -n '8p' ... | grep -o`.)
WHY: Count, cited: a sandboxed node script (`new Function('window', src)(g)` over the file, then `d[k].n` and `d[k].xy.length/2`) prints `substations n= 5800 xy/2= 5800`, `grid400 n= 7536`, `grid132 n= 13091`, `uk n= 5051`; `Object.keys(substations.names).length` = 4460 named of 5,800 (descent.js falls back to `'SUBSTATION ' + i + ' (NO NAME IN THE PUBLIC FILE)'`, :100). `grep -o '"n":[0-9]*' grid-data.js` gives `"n":5800 "n":7536 "n":13091 "n":5051`. The file (md5 3874282866fb71086735b9d99064280f) is byte-identical across all 3 see-through folders and all 7 learn-the-kuiper `modules/grid-data.js` copies. descent.js carries a second, parallel table (`/*DATA-BEGIN*/ ... /*DATA-END*/` on line 15) with `"n":5800`, and lon/lat/v/o arrays of 5,800 each (parsed by a node script), whose source string says `"source":"globalgrid2050.com/grid_substations.geojson (same 5,800 features and order as grid-data.js)"`. Index i is the shared join key between the two tables.
PATTERN: Data-as-script global (`window.KGGridData`) so the page runs from file:// with no fetch; delta + integer quantisation documented as lossless.

### F11 The fall from stars to a substation: substation j gets the star with key index j on every device
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 see-through/202610050609/descent.js:950-966
QUOTE:
```js
    // particles: the DRAW THE GRID keys; particle j < 5800 lands on substation j, the rest gather around substations
    // Desktop: all 20,000 DRAW THE GRID keys, particle p carries key index p. Phone: the first 5,800 the same, then every
    // second key of the rest (12,900 stars). Particle p goes to substation p mod 5,800, so substation j always gets the star
    // with key index j: its STAR KEY is grid.js keyOf(j) on every device.
    var L = window.KuiperLaw, phoneNow = Math.min(host.clientWidth || innerWidth, host.clientHeight || innerHeight) < 600;
    var n = phoneNow ? NSUB + Math.ceil((NRULE - NSUB) / 2) : NRULE; S.NP = n;
    ...
    var Rw = Math.sqrt(S.SPACE + 0.5);
    for (var p = 0; p < n; p++) {
      var ki = (phoneNow && p >= NSUB) ? NSUB + 2 * (p - NSUB) : p, key = Math.floor((ki + 0.5) * S.SPACE / NRULE), pl = L.place(key);
      S.kx[p] = pl.x; S.ky[p] = pl.y; S.delay[p] = 0.3 * pl.r / Rw;
      var c = Math.floor(p / NSUB); S.pSub[p] = p % NSUB; if (c === 0) S.subKey[p] = key;
      var th = c * GA, rr = 2.2 * Math.sqrt(c); S.ox[p] = rr * Math.cos(th); S.oy[p] = rr * Math.sin(th);
```
("..." elides lines 956-960, array allocations; all other lines verbatim, 12 shown.)
WHY: The descent is one scalar D in [0, 8] (`:21 var DMAX = 8; // the one control: D = 0 stars, 1 to 2 the stars gather, 2 to 8 the fall to one substation`). Stars are 20,000 evenly spaced keys over the whole wafer (`key = floor((i + 0.5) * SPACE / 20000)`, SPACE = 59,637,070,538 from kuiper-law.js:36) placed by `KuiperLaw.place`; overflow particles ring each substation on a golden-angle spiral (`th = c * GA, rr = 2.2*sqrt(c)`, GA = 2.399963229728653 rad). The phone path halves the stars but keeps j -> key(j) invariant, a device-independent result in the spirit of L9. The camera (`camera(D)`, :251-263) interpolates Web Mercator zoom linearly from the UK frame to zoom 16 (ZEND) across D 2..8; `flightDepth(seconds)` (:428-437) scripts the 8-second GO flight (stars 0-1 s, gather 1.2-3.3 s, hold at town-label zoom 9 for 4-6 s, land by 8 s). The header is honest about the limit: `:11 // A star is a line of code today, not a substation. The stars gather into the grid; they do not address it.`
PATTERN: One-control scrubbable narrative; device-independent key assignment.

### F12 pf.js: one exact WGS84 coordinate frame and a 100 m place-key lattice, copied with only `export` removed
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 see-through/202610050609/pf.js:95-101
QUOTE:
```js
function placeKey(lat, lon) {
  if (!(Math.abs(lat) < LAT_LIMIT) || !Number.isFinite(lon)) throw new Error(`no place key at ${lat}, ${lon}`);
  const w = ((lon + 180) % 360 + 360) % 360 - 180; // longitude in [-180, 180)
  const j = Math.round(lat / STEP_LAT);
  return anchorFromKey({ j, i: Math.round(w / stepLon(j * STEP_LAT)) });
}
```
WHY: pf.js (219 lines) computes: geodetic <-> ECEF on the exact WGS84 ellipsoid (`:28 const WGS84 = { a: 6378137.0, f: 1 / 298.257223563 };`, fixed-point inverse "converged to 1e-15 rad"), local tangent-plane metres <-> lat/lon (foot of the ellipsoid normal), and MapLibre 4.7.1 Mercator term-for-term. Every object is authored in metres around a place key `pf:j:i` on a 100 m lattice (`:75 const STEP_LAT = 100 / 111320;`, longitude step from the prime-vertical radius at that row). `placeKey` refuses (throws) outside the Mercator edge or for non-finite input: fail closed. The header states its own epistemic limit: "Agreement between these functions proves they are consistent with each other, never that the map imagery or grid layers are right on the ground." Provenance `:1-3`: "every line below the wrapper is the original with only the word 'export' removed" (globalgrid2050 c5ac5219).
PATTERN: Place key on a geodetic lattice; fail-closed coordinate API; claims bounded to what agreement proves (L10).

### F13 model.js: one function draws any of 5,800 substations by rule and labels mapped vs estimated
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 see-through/202610050609/model.js:1-9
QUOTE:
```js
// model.js - SEE THROUGH: one substation drawn BY RULE from open data, with its pylons, as a 3D wire model.
//
//   SeeModel.substation(record, data) -> model
//     record: { i, name, lat, lon, volt }   one row of the public substation table (OpenStreetMap, ODbL)
//     data:   { footprint: [[lon, lat], ...] or null   the OpenStreetMap outline (simulator footprints file or Overpass)
//               lines: { '400': [{ bbox, coords }], ... }   GridAtlas line files (OpenStreetMap, ODbL)
//               others: [{ bbox, ring }]                 other substations' outlines, so a line stops where it lands
//               osm: { busbars, transformers, buildings, portals } or null   mapped features inside the fence }
//   No site-specific code: the same function runs for all 5,800 rows (tools/run-all.mjs) and in the page (see3d.js).
```
WHY: model.js (490 lines) computes wire-segment geometry in tangent-plane metres: fence (mapped OSM outline, else a dashed typical square by voltage, :213-215), gantries ("at mapped portals" vs "by rule", :296), busbars, transformers, lattice towers along GridAtlas line routes with parabolic sag `- 4 * sag * t * (1 - t)` (:143), using the KV table of tower heights/spans lifted from globalgrid2050 pylons-real.js:19-23 (:31-36: 400 kV H 50 m span 360 m; 275 kV H 46; 132 kV H 27; 66 kV estimated). `:23-24`: "ESTIMATED HERE (not surveyed; by voltage class) ... Every model says which of its parts are mapped and which are drawn by rule." `check(m)` (:480-486) is a self-test: no non-finite vertex, a fence exists, group ranges in bounds. Note: `tools/run-all.mjs` named at :9 is NOT in kuiper-belt (`find . -name run-all.mjs` empty) - UNVERIFIED here.
PATTERN: Rule-drawn model with per-part provenance flags (mapped / by rule).

### F14 Exact integer arithmetic for the front screen: the multiplier split so doubles never round
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/one.js:102-106
QUOTE:
```js
  // the same step in ordinary numbers, for searching many keys quickly (keys 0 and up). Exact for every key
  // up to MAX: the real pair uses the split form of LESSON-CONTRACT.md (2654435769 = 40503 x 65536 + 31161);
  // other pairs reduce the key first; anything that could round goes back to BigInt.
  function fastStep(M, C) {
    if (M === REAL_M && C === REAL_C) return function (k) { var a = k % 4294967296; return (((a * 40503) % 65536) * 65536 + a * 31161) % 4294967296; };
```
WHY: `echo $((40503*65536+31161))` = 2654435769. Splitting the Knuth multiplier keeps every intermediate product below 2^53, so the angle numerator is exact in plain JS numbers for any key up to 2^53-1, with BigInt as the fallback (`:16 var REAL_M = 2654435769n, REAL_C = 4294967296n;`). The same split is what makes the Build-Your-Own-Kuiper spreadsheet exact (its README: "where the short formula stops being exact"). Note: LESSON-CONTRACT.md is cited but is NOT in the kuiper-belt clone (`find . -name LESSON-CONTRACT.md` empty).
PATTERN: Exactness by operand splitting; BigInt fallback.

### F15 The public edition is pinned by commit in a machine-readable catalogue
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 diary/2026-10-05-public-links.json:9-14
QUOTE:
```json
  "applications": [
    {
      "name": "Learn the Kuiper",
      "url": "https://ventusltd.github.io/kuiper-belt/learn-the-kuiper/",
      "dated_page": "https://ventusltd.github.io/kuiper-belt/learn-the-kuiper/202610050609/"
    },
```
WHY: The diary records both the moving link and the dated page, plus `"reference_commit": "8e24d1f3142c805e13695b9c48ce3e2979454cf3"` (:35). `diary/2026-10-05-learn-kuiper-project-links.md:40` states the contract in one sentence: "The main play link can move forward as new work is published." Publishing a new edition should add the same pair (stable url + dated_page + reference commit) to a dated diary entry.
PATTERN: Moving pointer + pinned permalink + commit receipt.

## Patterns (keyed; each cites at least one F above)

- P1 Immutable dated folder + single mutable pointer (F2, F3, F15). Pointer lives in three places in one 14-line index.html; moved in the same commit as the folder (from 77258c4).
- P2 Verbatim lift with line citations and a hash receipt (F1, F9). The law is copied, never re-implemented; a receipt pins source and copy SHA-256.
- P3 Provenance travels with the file (F6, F7, F10). NOTICE table per folder; licence per reused file; data files carry source/attribution/law inside them.
- P4 Fail closed / say what is missing (F12 `placeKey` throws; descent.js :100 "NO NAME IN THE PUBLIC FILE", :99 "OPERATOR NOT IN THE PUBLIC FILE"; :885 'descent.js: data or KuiperLaw missing').
- P5 Exactness by construction (F14 split multiplier; F10 "lossless" integer quantisation; F12 exact ellipsoid).
- P6 Device-independent assignment (F11: substation j always receives star key index j).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

All times from `git log --format='%H %ad %an %s' --date=iso-strict -- learn-the-kuiper see-through`; author on every commit is "Ventusltd"; trailers name Claude Fable 5.1 (version commits, session_01C7k...) and Claude Opus 5.5 (55db60c).

| Edition | Commit | Commit time | Stamp vs commit |
|---|---|---|---|
| learn 202610042225 (v1, "preserved; inputs not yet working") | bb55165e384e46414e5ed12ed9b9aa52bcb3e102 | 2026-10-04T22:26:34+01:00 | stamp 1 min earlier |
| astra-codex 202610042233 ("independent Astra by Codex") | 057b6bf4dfdbb0202d8b321914338e6f9526f5a8 | 2026-10-04T22:37:49+01:00 | 4 min |
| learn 202610042243 (v2) | ab5a696e5e3bf7f3ae6e3f62989ec4a4de48de9c | 2026-10-04T22:45:59+01:00 | 2 min |
| learn 202610050010 (v3, offline zip appears) | 1b54cdc68be10a244e3af9b6e3770a195538d43c | 2026-10-04T23:20:16+01:00 | stamp 50 min in the FUTURE |
| (pointer created -> 202610050010) | e98991ad68edae02ff7ca879131d6e3c466ac1ca | 2026-10-04T23:24:41+01:00 | - |
| learn 202610042346 (v4, first NOTICE, "latest link moved") | 17c8da984e7a0bcc65c14dbe7a930ce8457402cc | 2026-10-04T23:47:09+01:00 | 1 min |
| learn 202610050144 (README.txt, audio-unlock, test pages dropped) | 77258c402c0d60f9f38e825d4189f09e04e26529 | 2026-10-05T01:45:44+01:00 | 1 min |
| learn 202610050204 (lesson, modes, play) | e9d86c47d4b62ad24085d82f83561c4cfa281ed0 | 2026-10-05T02:06:10+01:00 | 2 min |
| learn 202610050354 (one.js, solid, fx, menu) | fb68c2931ad202df8812246c1f756ea8000a9a28 | 2026-10-05T03:54:47+01:00 | 0 min |
| see-through 202610050356 (first publication) | 01ac4707d764fdf9639ffe2988ba28140aed789b | 2026-10-05T03:57:21+01:00 | 1 min |
| learn 202610050501 | ee0874bb2fbe72c7230cb15879d125398d0aa033 | 2026-10-05T05:02:05+01:00 | 1 min |
| see-through 202610050513 (plain.css) | 7442288b94c5d273c02b1a84df12a328c8675996 | 2026-10-05T05:13:42+01:00 | 0 min |
| learn + see-through 202610050609 (newest) | d3039324a2663f6c2a542194db6a9ca3e0e8285d | 2026-10-05T06:09:57+01:00 | 0 min |
| sweep of all folders (F5) | 55db60ca29cacb7e97019aa53b684598f456c037 | 2026-10-05T09:42:02+01:00 | - |
| spreadsheet added | ba378dab60b84356a24a0b07190f7c00d6d9649f | 2026-10-05T09:45:56+01:00 | - |
| newest folders: credits, sound, text | 9c5c140c64634d6207acae18c9b9224484ae990f | 2026-10-05T10:02:20+01:00 | - |
| newest learn: wording | 613b10f4746ae2603fd0268ef0a890fbfa85281a | 2026-10-05T10:04:39+01:00 | - |
| newest folders: Acknowledgements | 8e24d1f3142c805e13695b9c48ce3e2979454cf3 | 2026-10-05T11:03:37+01:00 | - |

Cadence: 13 editions in 7 h 44 min (22:26 to 06:09 +01:00), one night storm; no edition since 2026-10-05 (26 days before this brief). No reverts. Turning points: 1b54cdc/17c8da9 (stamp inversion, F4); 01ac470 (see-through split off as a separate CERN-OHL-S app); 55db60c (immutability exception, receipts deleted, F5/F9). Post-publication edits were applied to the newest folder (202610050609) three times (9c5c140, 613b10f, 8e24d1f) - i.e. the newest edition was treated as mutable until superseded.

Changed files between consecutive learn-the-kuiper editions (`diff -rq A B`, files only):
- 2225 -> 2243: README.md, start-here.js
- 2243 -> 2346: +NOTICE.md, README.md, index.html, +learn-the-kuiper.zip, +modules/, +scale-logic.js, +sheet.html, start-here.js
- 2346 -> 0010 (stamp order; chronologically reversed): NOTICE.md only in 2346; README.md, index.html, zip, modules/{deep-test.html, deep.js, grid.js, radar-test.html, radar.js, realgame-test.html, realgame.js, strings.js, zoom.js}, start-here.js
- 0010 -> 0144: +NOTICE.md, README.md -> README.txt, +audio-unlock.js, index.html, zip, modules: -deep.js -deep-test.html -grid-test.html -radar-test.html -realgame-test.html -strings-test.html -zoom-test.html +descent.js, grid.js radar.js realgame.js strings.js zoom.js changed, -sheet.html, start-here.js
- 0144 -> 0204: index.html, zip, +lesson.html, +lesson.js, +modes.html, +play.js
- 0204 -> 0354: +fx-common.js, +fx-raw.js, index.html, zip, +menu.html, +one.js, +play.html, +solid.html, +solid.js
- 0354 -> 0501: index.html, zip, lesson.html, lesson.js, one.js, play.html, play.js, solid.html
- 0501 -> 0609: NOTICE.md, zip, lesson.html, lesson.js, modes.html, modules/{descent,grid,radar,realgame,strings,zoom}.js, one.js, play.html, play.js, solid.html, solid.js, start-here.js
See-through: 0356 -> 0513: descent.js, index.html, +plain.css, see3d.js; 0513 -> 0609: NOTICE.md, descent.js, plain.css, see3d.js.
Never changed across any edition: kuiper-law.js (all 13), grid-data.js (all 10 copies), scale-logic.js (31,383 bytes in all 7 copies from 2346), pf.js and model.js (12,311 and 40,054 bytes in all 3 see-through folders).

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- The edition scheme is the same idea as gridatlas immutable releases + `atlas/current.json`: see-through pins an immutable gridatlas release path, `see-through/202610050609/descent.js:30` `var GA_DATA = 'https://ventusltd.github.io/gridatlas/atlas/releases/202608300453-atlas-v9/data/';`, not the live pointer. A new Kuiper edition that wants the data-centre Grid Engine (generation 202610292044, v9.187) must change this pinned path in the new folder only (earlier editions stay on 202608300453).
- The substation spine is shared with gridatlas: `data/substations-footprints.odbl.json` header says "power=substation outer rings matched to GridAtlas atlas-v9 grid_substations by feature index" (read via `head -c 300`), and model.js draws lines from "GridAtlas line files" (model.js:6). The 5,800-row index (F10) is the natural join key for placing the 225 mappable data-centre sites next to substations in a future edition.
- descent.js:451 `function findSite(i) {   // feature-detected against modules/grid-engine-pack.js (KGEngine) and grid-topology-data.js` - a hook for the grid engine; neither file is shipped in any edition folder (`ls` of all folders), so SPIDER returns null in see-through today. This is the cleanest insertion point for the dc-engine in a new edition.
- Data centres in the current editions are incidental only. `grep -rilE "data.?centre|datacenter|data center" learn-the-kuiper see-through --exclude=*.zip | wc -l` = 25 files, all repeated copies of grid-data.js (substation names), realgame-data.js and zoom.js (the repo name `data-centres-gb` in the estate list), and astra-codex code-data.js. Among the 4,460 substation names in grid-data.js, a node filter `/data.?cent(re|er)/i` over `KGGridData.substations.names` finds exactly 2: index 3629 "Maxwell House Data Centre" and index 4050 "Rockingham Data Centre Substation". No edition has a data-centre layer; the 227-site pipeline would be new content.

## Candidates (unkeyed; clearly marked)

- C1 descent.js header in see-through still says "MapLibre GL 3.6.2 from jsDelivr" (descent.js:8) while lines 23-26 and NOTICE say MapLibre 4.7.1 vendored; header stale in the CERN copy.
- C2 `descent/build_descent_data.py` (descent.js:6), `descent/DESCENT-MAP.md` (:8), `tools/run-all.mjs` (model.js:9) and `LESSON-CONTRACT.md` (one.js:103) are cited but absent from kuiper-belt; they may live in globalgrid2050 or a session workspace. The editions cannot be rebuilt from this repo alone.
- C3 learn-the-kuiper `index.html` (202610050609) does not load kuiper-law.js; `one.js` computes with its own BigInt constants (F14). kuiper-law.js:4 says real-wafer particles must go through `window.KuiperLaw`; one.js teaches arbitrary keys, so this may be within the rule - not verified screen by screen.
- C4 (withdrawn: the data-centre grep was run; see Gridatlas and datacentre relevance.)
- C5 learn-the-kuiper/README.md:41 allows "a credits line in its README" instead of NOTICE.md; folders 202610042225, 202610042243, 202610050010 and astra-codex/202610042233 have no NOTICE.md (presence matrix from `[ -e ]` loop).

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. kuiper-law.js:22-29 and :38-40 (F1) - the law in words and code, with the `+ 0.5` the brief omits.
2. learn-the-kuiper/index.html:7-12 (F2) - the whole release mechanism in six lines.
3. learn-the-kuiper/README.md:27-32 (F3) - the edition contract.
4. descent.js:950-966 (F11) - stars -> substation invariant across devices.
5. pf.js:95-101 (F12) - fail-closed place key on a 100 m geodetic lattice.
6. one.js:102-106 (F14) - exactness by splitting 2654435769 = 40503 x 65536 + 31161.
7. .gitattributes:1-3 (F8) - the LF law the zip currently breaks; a good "law vs artefact" teaching line.

## Anatomy of an edition

What a Kuiper "edition" is, as practised in kuiper-belt@b243e38 and as the harness should prepare 202610311905.

1. Families and location. Three families exist: `learn-the-kuiper/<stamp>/` (9 editions), `learn-the-kuiper/astra-codex/<stamp>/` (1, a separate frozen variant), `see-through/<stamp>/` (3). Note there is no top-level `astra-codex/`; it lives under learn-the-kuiper. Each family has a front `README.md` (human page, licences, folder rules) and an `index.html` pointer. Both live families last shipped at 202610050609 together (d303932).

2. Naming rule: `YYYYMMDDHHMM`, 12 digits, year-month-day-hour-minute (README.md:30). Historically the clock was Europe/London local (+01:00 in October summer time), taken within 0-4 minutes before the commit. Invariant the harness must enforce (because 1b54cdc broke it, F4): new stamp > every existing stamp in that family, and stamp <= commit time. 202610311905 satisfies both against the newest 202610050609. Do not rely on lexical sorting to find "newest"; read the pointer.

3. Mandatory files (present in the newest edition of each family; minimum for a new one):
   - Both families: `index.html` (the app entry; standalone, relative paths only), `kuiper-law.js` (byte-identical copy, md5 60c004ee5618572bab86a527f4367478, sha256 2c7512ea...b564ea; never edited, only re-lifted from root index.html with a new source commit), a short README (three plain lines: what it is / how to open / "Credits and licences: NOTICE.md"), `NOTICE.md`.
   - learn-the-kuiper adds: `README.txt` (the current name since 202610050144), `learn-the-kuiper.zip` (the folder minus the zip, under a root dir `learn-the-kuiper/`, rebuilt whenever the folder changes - 55db60c did this), `modules/` (descent, grid, grid-data, radar, realgame, realgame-data, strings, zoom), `audio-unlock.js`.
   - see-through adds: `README.md`, `LICENSE.md`, `licences/globalgrid2050-CERN-OHL-S-2.0.txt`, `vendor/` (maplibre-gl.js/.css 4.7.1, MAPLIBRE-LICENSE.txt, joystick.js), `data/` (substations-footprints.odbl.json, osm/<index>.json with each file carrying its Overpass query, endpoint and time, osm/index.json listing `[9, 201, 229, 259, 324, 350, 463, 578, 2392]`), and the script chain loaded in order by index.html:10-16: kuiper-law.js, grid-data.js, vendor/maplibre-gl.js, pf.js, model.js, see3d.js, descent.js.
   - Not to ship: test pages (`*-test.html` dropped at 202610050144), receipts were removed by 55db60c (but see F9: either ship the receipt or fix the dangling reference by re-lift), local file paths, builder names, audience labels (the 55db60c sweep list).
   Sizes of the newest editions (`ls -la`): learn 202610050609 top level 18 files + modules/ (index.html 11,217; kuiper-law.js 8,388; NOTICE.md 3,388; README.txt 264; learn-the-kuiper.zip 654,315; start-here.js 146,593; play.js 126,113; lesson.js 97,785; one.js 77,402; scale-logic.js 31,383; solid.js 29,383; fx-raw.js 17,524; fx-common.js 8,669; audio-unlock.js 4,920; modes.html 1,981; solid.html 1,212; play.html 1,134; menu.html 935; lesson.html 911); modules/ (grid-data.js 587,233; realgame-data.js 289,403; descent.js 154,788; realgame.js 42,316; strings.js 38,020; radar.js 30,542; grid.js 27,934; zoom.js 62,457). see-through 202610050609: grid-data.js 587,233; descent.js 156,211; model.js 40,054; see3d.js 31,590; pf.js 12,311; kuiper-law.js 8,388; NOTICE.md 3,877; plain.css 2,562; index.html 1,032; LICENSE.md 619; README.md 328; data/substations-footprints.odbl.json 1,180,729; vendor/maplibre-gl.js 803,086.

4. Immutability. Earlier folders are never edited (README.md:31). One historical exception, 55db60c, edited every earlier folder for hygiene with an explaining commit body (F5). The newest folder was edited after publication three times (9c5c140, 613b10f, 8e24d1f) until it was superseded. Harness rule for 202610311905: create the new folder in one commit; touch no earlier `<stamp>/` path (verify with `git diff --name-only <base>..HEAD -- learn-the-kuiper/2026* see-through/2026*` listing only the new stamp); post-publication fixes go in the new folder only, or in a newer stamp.

5. NOTICE conventions (F7): title `# NOTICE` (or `# NOTICE: See Through`); first line "Credits and licences for this folder." and "All source repositories belong to Ventus Ltd (github.com/Ventusltd)."; sections Licence, Sources / Code reused (file -> origin repo, path, short commit -> licence), Third-party data and services with the exact on-screen credit strings (OpenStreetMap ODbL 1.0; CARTO; Esri "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community"; AWS Terrain Tiles with the Environment Agency UK credit), Third-party software with version and licence file (MapLibre GL JS, BSD-3-Clause), Network use ("No account, key or tracking"), Fonts ("System fonts only."), Acknowledgements (Archimedes, Fibonacci 1202, Bravais 1837, Vogel 1979, Knuth 1973 s6.4, Roberts 2018, Bret Victor 2011, Shiffman) ending "Any error in how their work is used here is ours." The kuiper-law.js source line names root index.html at commit 7a65dd3 "unchanged".

6. Licences per folder (F6):
   - learn-the-kuiper/<stamp>/ and astra-codex: code Apache-2.0 (repo-root LICENSE); documentation and generated data CC BY 4.0 (README.md:156-157); `modules/grid.js` and `modules/zoom.js` CERN-OHL-S v2 (adapted from globalgrid2050); data ODbL 1.0 (OSM) and Natural Earth public domain.
   - see-through/<stamp>/: the whole app CERN-OHL-S v2 (LICENSE.md + full text in licences/), because it reuses globalgrid2050 simulator code (pf.js verbatim, model.js and see3d.js by method and cited lines); data ODbL; MapLibre BSD-3.
   - build-your-own-kuiper/: Apache-2.0 (its README line 5). Any new file adapted from globalgrid2050 (e.g. a gridatlas or dc-engine extract) inherits CERN-OHL-S v2 and must be listed per file in NOTICE; anything that pulls CERN code into the learn app should be named file by file as grid.js and zoom.js are.

7. Index pointer update: in the SAME commit as the new folder, replace the stamp in all three places of `<family>/index.html` (meta refresh :7, anchor :11, `location.replace(... + location.hash)` :12), keeping the hash pass-through. Then update the family README only if the folder rules change, and record the stable url + dated_page + reference commit in a dated diary entry, as `diary/2026-10-05-public-links.json` did (F15).

8. Reproducibility gaps to close in this edition: no zip builder in repo and the shipped zip is CRLF (F8); build scripts for descent data and model batch runs are absent (C2); the fidelity receipt was deleted (F9). A new edition that ships a committed builder, LF zip with fixed mtimes, and a receipt (source sha256, copy sha256, per-line verbatim check) would make the edition itself obey L9.

## One next command (exactly one, runnable from a clone)

```
cd /home/user/estate/kuiper-belt && git diff --stat 8e24d1f3142c805e13695b9c48ce3e2979454cf3 b243e38d4964557458fcaf636fd8d49c799f91a6 -- learn-the-kuiper see-through index.html
```
(Confirms nothing in the edition folders or the root law page changed between the last edition commit and HEAD. Run by W13 at 2026-10-31: empty output, i.e. no change; listed so the controller can re-run it.)
