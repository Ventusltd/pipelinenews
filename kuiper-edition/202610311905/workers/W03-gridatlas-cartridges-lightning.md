# W03 gridatlas-cartridges-lightning
HEADS: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (311 commits in the local clone, depth-limited; HEAD = 2026-10-29T23:41:04+00:00 "202610292044-gridatlas-v9.187: release accepted data-centre Grid Engine preview")
Written 2026-10-31T19:15:00Z by W03 (Opus). Read only; `git status --porcelain | wc -l` = 0 after every command below.
READ:
BRIEF.md (kuiper-edition/202610311905)
tools/build-cartridge.mjs
tools/recompose.mjs
tools/rollback.mjs
tools/cartridges/audit.mjs
tools/lightning/make-generation.mjs
tools/lightning/build.mjs
tools/lightning/generations.json
tools/lightning/src/00-header.js, 02-transport.js, 04-windows.js, 06-load.js, 11b-repd-records.js (others listed and grepped)
tools/offtakers/generations.json
tools/release/split-lightning-cartridge.mjs
tools/scope/lib.mjs (ATLAS_LOADERS, CARTRIDGE_BYTE_BUDGETS, sha256PublishedFile)
tools/scope/loop.mjs (verifyReleaseChecksums, lint invariants 160-215)
tools/scope/payloads/atlas-loader.html (v1), tools/scope/payloads/atlas-loader-v2.html (v2)
tools/proofs/lightning-cartridge.mjs, tools/proofs/202610290935-sld-sandbox.proof.mjs, tools/proofs/202610290400-uk-lightning-overlay.proof.mjs
tools/ci/pr-gate.mjs (grep only)
docs/LIGHTNING-SOURCE.md, docs/LIGHTNING-CARTRIDGE.md (1-130 + grep)
atlas/data/UK-LIGHTNING-LAYER.md (the brief's data/UK-LIGHTNING-LAYER.md does not exist at that path; it is under atlas/data/)
atlas/current.json, atlas/manifests/202610291043|202610291044|202610292044-composition.json
atlas/index.html (the live loader, 124 lines)
atlas/releases/202608300453-atlas-v9/index.html (head + grep '<script'), sha256sums.txt
.gitattributes

## How IMMUTABLE_SHELL_PLUS_HASHED_CARTRIDGES works, as the code enforces it (summary; every step keyed in F1-F17)

1. **The shell never changes.** `atlas/current.json` names one shell, `./releases/202608300453-atlas-v9/index.html` (21,238 B, the v8 page). Its bytes are pinned in that release's `sha256sums.txt` (22 lines; `index.html` = `87a3aaf4…c467`, and `sha256sum` of the file today gives the same digest), and `loop.mjs lint` re-hashes every listed file (F2). The shell has 4 local `<script src>` tags (lines 135, 136, 138, 139). Those tags are the **slots**.
2. **How a cartridge hash is computed.** It is SHA-256 over the **LF bytes** of the file. The assembler normalises CRLF to LF before hashing (F4). The lint uses `sha256PublishedFile` (it LF-normalises `.js .mjs .html .json …`). `.gitattributes` `* text=auto eol=lf` makes the disk equal to the blob, which is what Pages serves. The browser hashes the raw served bytes, so the three readings agree only because of that `.gitattributes` line.
3. **How it is checked at load.** `atlas/index.html` is the loader. It fetches `current.json` with `no-store` and requires schema `gridatlas.current.v2` and architecture `IMMUTABLE_SHELL_PLUS_HASHED_CARTRIDGES`. Then it walks `cartridge_order` and, for each entry, requires a 64-hex `sha256`, fetches the bytes, compares `crypto.subtle.digest('SHA-256')`, and only then wraps the bytes in a blob URL. The composed document is written with `document.write`. Any failure shows "GRIDATLAS COMPOSITION FAILED … The immutable shell was not changed." (F1). The live order is `streaming-parquet-bridge, uk-gazetteer-flyto, substation-intelligence, sld-sandbox, uk-lightning-overlay, uk-offtakers-overlay`. All 6 MATCH their recorded sha256 at HEAD (node one-liner in History).
4. **Loader v1 vs v2.** v1 knows one slot, `replace-script`: it swaps a shell script tag, matched by filename, for the verified blob. v2 is byte-identical to the live `atlas/index.html` (`diff` reports no difference). It adds `after-cartridge`: a new tag inserted directly after the tag of an anchor cartridge that was composed earlier in the order, with chaining. v1 refuses a modular composition. Both are registered in `ATLAS_LOADERS`, and the lint refuses a served loader that is not byte-identical to a registered payload or that lacks a slot the pointer uses (F3).
5. **Size budget.** Two layers: 500,000 B per cartridge (the "recorded ceiling"; the target is 400 kB, raised to 460 and 480 kB, then to 500 kB on 28 Oct 2026), plus per-id budgets of `uk-lightning-overlay` 64,781 B and `uk-offtakers-overlay` 80,000 B. The 64,781 is 500,000 − 435,218 (the original sld-sandbox) − 1 (the joining newline) (F6, F8).
6. **How a generation is cut.** A composition is cut by `tools/recompose.mjs`: the stamp comes from the clock, only the named cartridges are restamped and reassembled through `build-cartridge.mjs`, the composition manifest is derived from `current.json`, and every mutation registers an undo (F11, F12). A lightning generation is cut from source by `tools/lightning/make-generation.mjs`: `build.mjs` turns `src/*.js` into the module with a fixed text transform, then the cartridge = base + "\n" + module (F7-F10). The monolith is converted to the modular form by `tools/release/split-lightning-cartridge.mjs` (F14).
7. **"One generation, six files".** make-generation writes exactly six files, each with flag `wx` (never overwrite): module, cartridge, proof, composition manifest, `atlas/v/<GEN>/index.html` and `atlas/v/<GEN>/current.json`. Checked here: all **21** lightning generations in `atlas/modules/` have 6 of 6 files, and for all 21 the cartridge equals `202609241334-sld-sandbox-v9-8.js` + `\n` + module, byte for byte (`cmp`, in History).

## Findings (keyed)

### F1 The load-time hash gate: no byte runs unless its SHA-256 matches the pointer
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/index.html:75-81
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/index.html:42-43
QUOTE:
```js
        invariant(/^[a-f0-9]{64}$/.test(cartridge.sha256 || ''), `${id}: invalid SHA-256`);

        const cartridgeUrl = new URL(cartridge.path, window.location.href);
        const response = await fetch(cartridgeUrl, { cache: 'no-store' });
        invariant(response.ok, `${id}: HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        invariant(await sha256Hex(bytes) === cartridge.sha256, `${id}: SHA-256 mismatch`);
```
```js
      invariant(current?.schema === 'gridatlas.current.v2', 'unsupported current.json schema');
      invariant(current?.architecture === 'IMMUTABLE_SHELL_PLUS_HASHED_CARTRIDGES', 'architecture contract mismatch');
```
WHY: This is the architecture in seven lines. The browser itself refuses any cartridge whose served bytes differ from the digest in `current.json`. Only verified bytes become a blob URL, so a cache, a CDN or a half-pushed commit cannot run code that was not released. The schema and architecture strings are checked before any shell or cartridge is fetched. The failure screen states that the shell was not changed (line 35). This makes it fail-closed composition at the edge.
PATTERN: VERIFY_THEN_EXECUTE (hash-pinned blob URLs); FAIL_CLOSED_COMPOSER

### F2 The shell is immutable by checksum file, re-verified on every lint
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:35-43
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/releases/202608300453-atlas-v9/sha256sums.txt:18
QUOTE:
```js
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    invariant(match, `${relativePosix(sumsPath)}: malformed checksum line ${JSON.stringify(line)}`);
    const target = path.resolve(releaseDirectory, match[2]);
    invariant(target.startsWith(`${path.resolve(releaseDirectory)}${path.sep}`), `${relativePosix(sumsPath)}: path escapes release: ${match[2]}`);
    invariant(fs.existsSync(target), `${relativePosix(target)} is missing`);
    // Compare against the published (LF) content rather than the working copy,
    // so a Windows CRLF checkout cannot fail an untouched immutable release.
    invariant(sha256PublishedFile(target) === match[1], `${relativePosix(target)} SHA-256 mismatch`);
```
```text
87a3aaf463843ce33ed5c151096395715cbc80f2575bcb7208f271e94d2ec467  index.html
```
WHY: "Immutable shell" is enforced, not just promised: every file of the release (22 lines) is re-hashed against its `sha256sums.txt`, a path cannot escape the release directory, and the comparison is on published LF bytes. `sha256sum atlas/releases/202608300453-atlas-v9/index.html` at HEAD = `87a3aaf463843ce33ed5c151096395715cbc80f2575bcb7208f271e94d2ec467`, which matches line 18. `current.json` also records `"shell_mutation_forbidden": true` and `"cartridge_sha256_required": true` (atlas/current.json:825-830).
PATTERN: CHECKSUM_MANIFEST_IMMUTABILITY

### F3 Loader v1 vs v2: one new slot, and the old loader refuses what it cannot compose
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/payloads/atlas-loader.html:62-63
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/index.html:69-74
KEY3: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/lib.mjs:85-88
QUOTE:
```js
        invariant(cartridge.slot === 'replace-script', `${id}: unsupported cartridge slot`);
        invariant(typeof cartridge.replace_script === 'string' && cartridge.replace_script, `${id}: replace_script missing`);
```
```js
        invariant(SLOTS.includes(cartridge.slot), `${id}: unsupported cartridge slot`);
        if (cartridge.slot === 'replace-script') {
          invariant(typeof cartridge.replace_script === 'string' && cartridge.replace_script, `${id}: replace_script missing`);
        } else {
          invariant(typeof cartridge.after === 'string' && tailTag.has(cartridge.after), `${id}: after-cartridge anchor ${cartridge.after} is not composed before it`);
        }
```
```js
export const ATLAS_LOADERS = Object.freeze({
  v1: Object.freeze({ payload: 'tools/scope/payloads/atlas-loader.html', slots: Object.freeze(['replace-script']) }),
  v2: Object.freeze({ payload: 'tools/scope/payloads/atlas-loader-v2.html', slots: Object.freeze(['replace-script', 'after-cartridge']) })
});
```
WHY: The exact loader difference. v1 (`atlas-loader.html`) accepts only `replace-script`. v2 (the live `atlas/index.html`, which `diff` shows identical to `atlas-loader-v2.html`) also accepts `after-cartridge`, but only when the anchor is already in `tailTag`, that is, composed earlier. Lines 93-98 then require the anchor tag to occur exactly once and splice the new tag in after it. Old loaders were never edited: v2 sits beside v1, the registry records which slots each one supports, and the lint (`loop.mjs:212-214`) refuses an unregistered served loader or a pointer that uses a slot its loader lacks. `docs/LIGHTNING-CARTRIDGE.md:111-119` records the proof: v2 writes byte-identical HTML to v1 for all 42 replace-script-only compositions, v1 refuses a modular one, and v2 refuses five malformed entries.
PATTERN: ADDITIVE_LOADER_VERSIONING (registered payloads by digest)

### F4 How a cartridge digest is computed: SHA-256 over LF bytes, and why
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/build-cartridge.mjs:66-74
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .gitattributes:32
QUOTE:
```js
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

async function readLf(relativePath) {
  const absolute = join(REPO, relativePath);
  try { await access(absolute, constants.R_OK); }
  catch { console.error(`missing part: ${relativePath}`); process.exit(1); }
  // Every digest in this estate is over LF bytes: the blob is LF and a
  // Windows working copy may not be.
  return (await readFile(absolute, 'utf8')).replace(/\r\n/g, '\n');
```
```text
* text=auto eol=lf
```
WHY: The hash definition every other tool must agree with. `.gitattributes:12-21` records that the CRLF/LF mismatch hit four separate places in one evening; the fix was to make the working copy LF everywhere (`eol=lf`, deliberately not bare `text=auto`, lines 28-30). Because of this, the browser's raw-byte digest (F1), the lint's LF-normalised `sha256PublishedFile` (`tools/scope/lib.mjs:249-257`) and rollback's committed-blob digest (F13) are one number.
PATTERN: ONE_BYTE_TRUTH (normalise at the cause, not at each comparison)

### F5 The assembler publishes a cartridge+manifest pair atomically or not at all
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/build-cartridge.mjs:145-152
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/build-cartridge.mjs:164-166
QUOTE:
```js
  await writeFile(outputTemp, assembled, { encoding: 'utf8', flag: 'wx' });
  await writeFile(manifestTemp, manifestText, { encoding: 'utf8', flag: 'wx' });
  if (sha256(await readFile(outputTemp, 'utf8')) !== manifest.sha256) {
    throw new Error('staged cartridge hash does not match its manifest');
  }
  if ((await readFile(manifestTemp, 'utf8')) !== manifestText) {
    throw new Error('staged manifest bytes changed before publication');
  }
```
```js
  // A failed command must never leave one plausible member of a release pair.
  if (createdManifest) await rm(manifestPath, { force: true });
  if (createdOutput) await rm(outputPath, { force: true });
```
WHY: Both members are staged with `wx` and re-read, and the staged cartridge is re-hashed against the manifest's `sha256` before either final path exists. The final writes are `wx` too ("Exclusive final writes close the race", line 154), and a failure removes whichever member was published. The manifest (`gridatlas.cartridge-parts.v1`, lines 113-121) records the SHA-256 and bytes of every part, so the shipped artefact is one file but the maintained artefact is a list of hashed parts. Lines 134-139 refuse to overwrite an existing cartridge or manifest: "cartridges are immutable here". Commit 32bc3bbe carries this boundary ("staged, exclusive, and owned rollback").
PATTERN: STAGED_EXCLUSIVE_PAIR_PUBLICATION; PARTS_MANIFEST

### F6 The size budget: a 500 kB ceiling plus per-cartridge budgets
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:195-198
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/lib.mjs:114-118
QUOTE:
```js
      invariant(fs.statSync(cartridgePath).size <= 500_000, `${id}: cartridge exceeds the 500 kB recorded ceiling (400 kB target; raised from 460 kB by the owner on 27 Oct 2026 and to 500 kB on 28 Oct 2026 for the lightning overlay)`);
      if (Object.hasOwn(CARTRIDGE_BYTE_BUDGETS, id)) {
        invariant(fs.statSync(cartridgePath).size <= CARTRIDGE_BYTE_BUDGETS[id], `${id}: cartridge exceeds its own ${CARTRIDGE_BYTE_BUDGETS[id]}-byte budget (tools/scope/lib.mjs CARTRIDGE_BYTE_BUDGETS)`);
      }
```
```js
export const CARTRIDGE_BYTE_BUDGETS = Object.freeze({
  'uk-lightning-overlay': 64_781,
  // Owner approval, 29 Oct 2026, issue #73: raise the potential-offtakers
  // module budget to 80,000 B for the data-centre 30/30/30 engine.
  'uk-offtakers-overlay': 80_000
```
WHY: The budget is enforced per served file in lint. Its comment (`loop.mjs:181-194`) explains why the old 400 kB gate became a recorded ceiling: "A budget that only ever reports the same known breach measures nothing." Each owner raise is dated in the message. Each per-id budget is derived arithmetically (lib.mjs:110-112) and needs an owner decision; the offtakers 80,000 B cites issue #73. At HEAD: uk-lightning-overlay 63,707 / 64,781 B (1,074 B spare); uk-offtakers-overlay 71,191 / 80,000 B; the largest cartridge is substation-intelligence at 451,935 B.
PATTERN: BUDGET_AS_LAW (derived figure + owner-dated raise)

### F7 One generation, six files, never overwritten
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/make-generation.mjs:19-26
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/make-generation.mjs:176-177
QUOTE:
```js
 * Writes the six generation files with flag 'wx' (an existing file is never overwritten) and adds the generation to
 * tools/lightning/generations.json, dropping from it every listed generation the edited source no longer rebuilds:
 *   atlas/modules/<GEN>-uk-lightning-overlay.js   node tools/lightning/build.mjs output for --variant, stamped <GEN>
 *   atlas/cartridges/<GEN>-sld-sandbox-v9-8.js    the template's base sld-sandbox bytes + "\n" + module
 *   tools/proofs/<GEN>-sld-sandbox.proof.mjs      the template proof with only `const GEN=` changed
 *   atlas/manifests/<GEN>-composition.json        the template manifest re-identified
 *   atlas/v/<GEN>/index.html                      byte copy of atlas/index.html
 *   atlas/v/<GEN>/current.json                    the template route current.json re-identified
```
```js
const write = (p, data) => fs.writeFileSync(R(p), data, { flag: 'wx' });
write(OUT.module, moduleBuf);
```
WHY: The invariant, stated and enforced. Lines 93-95 refuse if any of the six exists ("generations are immutable, pick a new --gen"). All six writes use `flag: 'wx'` (lines 176-182). `cut_at_utc` is derived from `--gen`, not the clock, so the cut is deterministic (line 70). Every protected file (live pointer, STATE.md, atlas/index.html, the live cartridges, and the template's and predecessor's six) is hashed before and after; any change aborts (lines 100-104, 193). Counted at HEAD: 21 lightning generations (202610261949 … 202610291043) and all 21 have 6/6 files.
PATTERN: N_FILE_GENERATION_INVARIANT; PROTECTED_SET_HASH_BEFORE_AFTER

### F8 The module budget is arithmetic, and the cartridge is base + \n + module, re-proven on the template and predecessor
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/make-generation.mjs:38-39
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/make-generation.mjs:117-122
QUOTE:
```js
const MODULE_CEILING = 64781;     // 500,000 - 435,218 base sld-sandbox bytes - 1 newline (owner, 28 Oct 2026)
const CARTRIDGE_CEILING = 500000; // tools/scope/loop.mjs (raised from 480 kB by the owner, 28 Oct 2026)
```
```js
for (const g of new Set([PRED, TPL])) need(readBuf(files(g).cartridge).equals(Buffer.concat([baseBuf, Buffer.from('\n'), readBuf(files(g).module)])),
  `${g} cartridge is not ${BASE} + \\n + its module`);
const cartridgeBuf = Buffer.concat([baseBuf, Buffer.from('\n'), moduleBuf]);
need(cartridgeBuf.length <= CARTRIDGE_CEILING, `cartridge is ${cartridgeBuf.length} B; the ceiling is ${CARTRIDGE_CEILING} B`);
const cartridgeSha = shaLF(cartridgeBuf);
need(cartridgeSha === sha(cartridgeBuf), 'raw and LF hashes differ (CR present)');
```
WHY: The budget is derived (500,000 − 435,218 − 1 = 64,781), not chosen. Before a new cartridge is made, the lineage shape is re-proven on the existing generations, byte for byte (`Buffer.equals`). Then the raw hash and the LF hash of the new cartridge must be equal, which proves it contains no CR. Line 109 requires the stamp to appear exactly twice in the module (the header and `GEN`). Size growth (from `wc -c`): module 23,973 B at 202610261949 → 63,707 B at 202610291043; cartridge 459,192 → 498,926 B. The cartridge crossed 460 kB at 202610270246 (464,312 B) and 480 kB at 202610282100 (487,281 B), the dates of the two owner raises. The peak was 499,088 B at 202610290315 (dots), 912 B under the ceiling.
PATTERN: DERIVED_BUDGET; LINEAGE_REPROOF

### F9 Shipped bytes are rebuilt from readable source, byte for byte, on every PR
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/build.mjs:123-126
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/build.mjs:94-97
QUOTE:
```js
    let got;
    try { got = Buffer.from(assemble({ variant, gen: g, variants: reg.variants }), 'utf8'); }
    catch (e) { bad.push(`${g} (${variant}): source does not assemble: ${e.message}`); continue; }
    if (got.equals(want)) lines.push(`ok   ${g} ${variant}: ${want.length} B sha256 ${sha256(want)} rebuilt byte for byte`);
```
```js
  for (const line of kept) {
    const piece = cont ? line.trimStart() : line;
    if (piece.endsWith('///')) { out += piece.slice(0, -3); cont = true; } else { out += piece + '\n'; cont = false; }
  }
```
WHY: A golfed 63 kB module is maintained as 17 readable files. The transform is fixed: concatenate in name order, apply `///#if` variant blocks, drop `///` comment lines, join lines that end in `///`, and substitute `@@GEN@@`. The PR gate step `lightning-source` (`tools/ci/pr-gate.mjs:252`) fails a hand-edited module, and on failure it reports the first differing byte and line. Run at HEAD 2026-10-31T19:11Z: `node tools/lightning/build.mjs --check` → `ok   202610291043 layers: 63707 B sha256 15ff1e37890770efc42b75651fac2fcc98a16c71a694481c79778ae0a6d818db rebuilt byte for byte`, exit 0. That digest equals the live `uk-lightning-overlay` sha256 in current.json:641. The source has 21 `///#if` directives: `grep -hc '^\s*///#if ' tools/lightning/src/*.js | paste -sd+ | bc` → 21, matching LIGHTNING-SOURCE.md:42.
PATTERN: REPRODUCIBLE_BUILD_GATE (source-only comment layer)

### F10 generations.json lists only what the current source rebuilds, and drops the rest
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/generations.json:7-12
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/make-generation.mjs:187-189
QUOTE:
```json
 "generations": {
  "202610291043": {
   "variant": "layers",
   "label": "M6u"
  }
 }
```
```js
const dropped = Object.keys(regText.generations).filter(g => g !== GEN && !readBuf(files(g).module)
  .equals(Buffer.from(assemble({ variant: regText.generations[g].variant, gen: g, variants: reg.variants }), 'utf8')));
for (const g of dropped) delete regText.generations[g];
```
WHY: The registry is a live claim, not a history. Each generation it lists must still rebuild from `src/`; one that no longer rebuilds is deleted, and "its source is the commit that cut it" (line 2). **Count:** `node -e '…Object.keys(j.generations).length…' tools/lightning/generations.json` → **1** (`202610291043`, variant `layers`, label `M6u`), although `ls atlas/modules | grep -c uk-lightning-overlay` → **21** modules exist. `tools/offtakers/generations.json` → **4** (202610290400, 202610290949, 202610291044, 202610292044); its entries carry `label`/`historical` and no `variant`. Total across the estate's two generations.json files: 5. Both variants `layers` and `dots` are declared, but no `dots` generation is currently listed.
PATTERN: REGISTRY_OF_REBUILDABLE_ONLY

### F11 A generation stamp is read from the clock, never typed
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/recompose.mjs:62-65
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/recompose.mjs:148-151
QUOTE:
```js
   So --generation is optional and defaults to UTC now. Given explicitly it
   must be within five minutes of UTC now: a stamp is a clock reading, and
   a reading the clock has not reached is not a reading. */
const utcNow = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
```
```js
  const drift = minute(generation) - minute(utcNow());
  if (Math.abs(drift) > 5) {
    die(`--generation ${generation} is ${drift > 0 ? drift + ' minutes ahead of' : (-drift) + ' minutes behind'} `
      + `the clock (UTC now ${utcNow()}). A stamp is read from the clock, not chosen; omit --generation.`);
```
WHY: A law with an incident behind it. The comment (lines 53-61) says v9.67 is named 202609012250 but was cut at 18:51 UTC. **The clone confirms this:** commit a342de44033e177e85d4aae6c5ffedfbdd9989a3 "202609012250-gridatlas-v9.67" has author date 2026-09-01T19:51:51+01:00 = 18:51:51Z, four hours before its name. The fix allows at most five minutes of drift. Lines 174-186 deliberately keep the out-of-order name visible ("the chain is previous_generation, which is a pointer").
PATTERN: CLOCK_READ_STAMPS (monotonic UTC generations)

### F12 The three identity fields of a cut are never inherited
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/recompose.mjs:408-418
QUOTE:
```js
  acceptance: {
    ...previousComposition.acceptance,
    /* A new producer/corpus must replace its inherited receipt explicitly;
       carrying an old commit beneath a new exact-corpus claim is provenance
       drift. The three identity fields below remain composer-owned. */
    ...acceptanceOverrides,
    // Never inherited: these three describe THIS generation or they lie.
    scope,
    proof: proofs.join(', '),
    golden_browser_verification: 'PENDING_THIS_GENERATION'
  }
```
WHY: The composition manifest is derived from `current.json` (lines 385-386: "The four-generation identity lie came from restating it"). Scope, proof and browser verification are forced fresh: `PENDING_THIS_GENERATION` until a browser proves it. `candidate_status` is cleared so that a rejection does not quarantine successors (lines 394-397). Lines 428-438 refuse a scope sentence that names the previous generation or version. Lines 69-77 make every mutation register an undo, so a failed cut leaves no half-composed tree.
PATTERN: DERIVED_NOT_RESTATED; NEVER_INHERIT_IDENTITY; UNDO_STACK

### F13 Rollback is a new forward generation, and it refuses what it cannot verify from committed bytes
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/rollback.mjs:131-133
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/rollback.mjs:173-176
KEY3: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/rollback.mjs:81-82
QUOTE:
```js
if (!lineage.includes(target)) {
  die(`${target} is not an ancestor of ${fromGeneration}; the lineage from here is ${lineage.join(' <- ')}`);
}
```
```js
const broken = checks.filter(check => check.state !== 'MATCH' && check.state !== 'PRESENT');
if (broken.length) {
  die(`${broken.length} of ${checks.length} target artefacts are absent or no longer hash to what ${target} recorded; refusing to point the live route at them`);
}
```
```js
  const shown = spawnSync('git', ['-C', ROOT, 'show', `HEAD:${relative}`], {
    encoding: 'buffer',
```
WHY: Rollback is append-only. The target must be an ancestor, found by walking `parent_generation`. It must not be `REJECTED_PRE_PROMOTION` (lines 111-118). Every cartridge it names must hash, from `git show HEAD:<path>` and not from the disk, to the digest the target recorded. The result is a NEW stamp with `restored_from` / `restored_generations_back`. Run at HEAD (dry run, nothing written): `node tools/rollback.mjs --to 202610291044 --reason "kuiper audit dry run" --dry-run` → 6 MATCH + `PRESENT shell:index.html`, "restoring 202610291044 v9.186 (1 generation back)", exit 0. Note: rollback only checks that the shell is PRESENT (line 168). Shell bytes are verified elsewhere (F2).
PATTERN: APPEND_ONLY_ROLLBACK; VERIFY_FROM_COMMITTED_BLOB

### F14 The monolith-to-modular split is proven by byte parity, not asserted
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/split-lightning-cartridge.mjs:68-70
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/lightning-cartridge.mjs:138-139
QUOTE:
```js
if (Buffer.compare(refBytes, Buffer.concat([originalBytes, Buffer.from('\n'), moduleBytes])) !== 0) {
  die(`${R}'s sld-sandbox is not original + '\\n' + ${moduleRel}; this tool splits only that shape`);
}
```
```js
  const joined = Buffer.concat([g.scripts[k].source, Buffer.from('\n'), g.scripts[k + 1].source]);
  assert.equal(sha(joined), refSld.sha256, `sld-sandbox(${R}) == sld-sandbox(${G}) + '\\n' + overlay(${G}), byte for byte`);
```
WHY: This is the turning point from loader v1 to v2. The split accepts only a monolith whose sld-sandbox is exactly original + "\n" + module. The new overlay cartridge IS the module file (no copy; lines 76-88: slot `after-cartridge`, `after: 'sld-sandbox'`, `byte_budget: 64781`). The proof composes both generations with their own served loaders in `node:vm`. It requires the same scripts in the same order, sld(G) + "\n" + overlay(G) equal to sld(R) by hash, and HTML identical except for the one overlay tag (lines 147-150). Verified at HEAD: 202610291043 (v9.185) has sld-sandbox 498,926 B = 435,218 + 1 + 63,707 (`cmp` OK). 202610291044 (v9.186, `"loader": "v2"`) has sld-sandbox back at 435,218 B, plus `uk-lightning-overlay` → `./modules/202610291043-uk-lightning-overlay.js`.
PATTERN: REFACTOR_BY_BYTE_PARITY

### F15 Inside the lightning module: every archive shard and the REPD manifest are hash-checked in the browser
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/src/04-windows.js:26-29
KEY2: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/src/11b-repd-records.js:31
QUOTE:
```js
let bad=[o.features.length!==t.count&&'count',b.byteLength!==t.bytes&&'bytes',///
          s&&[...new Uint8Array(await s.digest('SHA-256',b))].map(x=>(x|256).toString(16).slice(1)).join('')!==t.sha256&&'sha256'].filter(Boolean);
if(bad.length)E('index mismatch: '+bad.join(', '));///
        if(!s&&t.sha256)E('not verified (no WebCrypto)');///
```
```js
      if(h!='8850567ff9f1d2b6996b4e0d9707320030f3466a0b821cdcfc5325322b8be8c8'||(o=JSON.parse(new TextDecoder().decode(b))).parquet.sha256!='174040c37f3d63742d6fdd7af722a8cfdf3fb53de3ff85ff1142d22fdac4866b')E('REPD manifest is not the pinned one')}).catch(e=>{S.rv=0;throw e})));
```
WHY: The cartridge law repeats at data level. Each day file must match its index row on count, bytes and SHA-256. Without WebCrypto the result is "not verified", never assumed. The REPD join runs only after the manifest hashes to the pinned `8850567f…` and names the pinned parquet `174040c3…`. Gaps are reported, not filled: the alias `U='unknown, not zero'` (00-header.js:36). `06-load.js:49-55` treats a sha256 mismatch on an unsealed day as "archive updating": it reloads the index once and then says so.
PATTERN: DATA_PLANE_HASH_PINNING; UNKNOWN_NOT_ZERO

### F16 Nothing is deleted: the cartridge audit classifies files instead
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/cartridges/audit.mjs:21-26
QUOTE:
```js
// Classes, most to least protected:
//   LIVE       named in atlas/current.json (served at the live route)
//   VERSIONED  named in atlas/v/<generation>/current.json (a published route)
//   TOOLING    named by a proof, CI script, .gitattributes or a workflow
//   ROLLBACK   named only by atlas/manifests/*-composition.json (rollback target)
//   ORPHAN     named by nothing at all outside its own directory
```
WHY: Immutability has a storage cost: `ls atlas/cartridges/*.js | wc -l` → 164 files, `du -sh atlas/cartridges` → 54M. The audit leaves the files in place and classifies them by who still references them. A ROLLBACK-class file must stay, because rollback refuses a generation whose bytes are gone (F13). It was added by commit efb844b9 (2026-09-29T08:34:05+01:00) "Add PR file size guard and a cartridge audit instead of deleting old copies".
PATTERN: CLASSIFY_DONT_DELETE

### F17 The per-generation proof: the change boundary is the live bytes, one newline, one module
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/202610290935-sld-sandbox.proof.mjs:21-24
QUOTE:
```js
const expected=original+'\n'+module;
assert.equal(source,expected,'the cartridge must be the live bytes, one newline and the module: nothing replaced, nothing reordered');
assert.ok(Buffer.byteLength(module,'utf8')<=64781,'module exceeds the 64,781-byte budget');
assert.ok(Buffer.byteLength(source,'utf8')<=500000,'cartridge exceeds the 500 kB ceiling (raised from 480 kB by the owner, 28 Oct 2026)');
```
WHY: Each monolithic lightning generation has a proof that asserts the change boundary exactly: the base is unchanged (its sha256 is pinned at line 19), and the budget and ceiling are re-asserted. Static negatives (line 27) forbid `ukConfig|initVentusMap|window.fetch|localStorage…`, so the overlay cannot reach into the shell's contracts. make-generation copies this proof with only `const GEN=` changed and requires that string to occur exactly once (make-generation.mjs:126-127).
PATTERN: EXACT_DELTA_PROOF

## Patterns (keyed; each cites at least one F above)

- **VERIFY_THEN_EXECUTE / FAIL_CLOSED_COMPOSER** (F1, F3): bytes become executable only after their digest matches; any defect stops composition and leaves the shell unchanged.
- **CHECKSUM_MANIFEST_IMMUTABILITY** (F2): immutability = a sha256sums file + a lint that re-hashes it.
- **ONE_BYTE_TRUTH** (F4): fix line-ending drift at the cause (`eol=lf`) so browser, lint and git agree.
- **STAGED_EXCLUSIVE_PAIR_PUBLICATION** (F5) and **N_FILE_GENERATION_INVARIANT** (F7): every output uses `wx`; a pair or a six-file set appears whole or not at all.
- **DERIVED_BUDGET / BUDGET_AS_LAW** (F6, F8): a ceiling is an arithmetic consequence (500,000 − 435,218 − 1) and each raise is owner-dated in code.
- **REPRODUCIBLE_BUILD_GATE** (F9, F10): readable source → shipped bytes by a fixed transform; CI rebuilds and compares raw bytes; the registry lists only what still rebuilds.
- **CLOCK_READ_STAMPS** (F11): a generation name is a clock reading; the clone's commit times prove the incident that motivated it.
- **DERIVED_NOT_RESTATED / NEVER_INHERIT_IDENTITY** (F12): identity fields are regenerated per cut; inherited prose is the bug class.
- **APPEND_ONLY_ROLLBACK** (F13): undoing is a forward cut with `restored_from`, verified from committed blobs.
- **REFACTOR_BY_BYTE_PARITY** (F14): an architecture change (monolith → modular) is accepted only if it composes to the same scripts and bytes in the same order.
- **DATA_PLANE_HASH_PINNING / UNKNOWN_NOT_ZERO** (F15): the cartridge law applied to runtime data.
- **CLASSIFY_DONT_DELETE** (F16).

## History (keyed by commit SHAs; all times as authored)

- 8a8161ee7e11c5d2368db9a6020d5261fc7044c9 2026-09-01T18:35:01+01:00 "202609011950: modules, proven against the 4,000 lines, nothing swapped": modules/parts begin.
- 32bc3bbe60e16b1d93c07e809a0f0e4527929547 2026-09-01T19:00:45+01:00 "carry Codex's assembler boundary — staged, exclusive, and owned rollback" (F5).
- e25d8f951db7e48b12ae57cef05171f4af70a53b 2026-09-01T19:07:15+01:00 "202609012110-gridatlas-v9.64: a cut is a tool, and a cartridge is checked against its parts": recompose is born.
- a342de44033e177e85d4aae6c5ffedfbdd9989a3 2026-09-01T19:51:51+01:00 "202609012250-gridatlas-v9.67": the stamp was typed ahead of the clock (named 22:50, committed 18:51Z), which is the incident recompose.mjs:53-61 records.
- 1b1740d5e051a52c487f1ad776e7aae53b6579b3 2026-09-01T22:48:45+01:00 "202609012148: the stamp is read from the clock …" (F11 lands).
- 25e147123160d9ef005a589b2373e908c9f4ef08 / 3646d730074914ed562edab9b39a771a90d14f37 2026-09-02T00:54/00:58+01:00: per-cartridge module edits, truthful `assembled_from` pointer, parts seed.
- 1762170b3274559a1c880150a1a93df5d346210d 2026-09-03T04:16:36+01:00 "the live composition can be moved back, and the tool refuses what it cannot verify" (F13). That day has 22 composition manifests: `ls atlas/manifests | grep -- '-composition.json' | cut -c1-8 | sort | uniq -c` → 20260903: 22, 20260904: 17, 20260905: 17, 20261029: 12; 117 composition manifests and 115 parts manifests in total.
- efb844b9bba70edd42671aa56a9877709d7526c3 2026-09-29T08:34:05+01:00 (Vikram Kumar) cartridge audit instead of deletion (F16).
- **Storm and revert:** cd9a27efed8a9c005d87cdcfe9f363ed7e80d6ad 2026-10-23T00:20:12+01:00 "Add public UK lightning layer to GridAtlas" (generation 202610221600, atlas/data/UK-LIGHTNING-LAYER.md:5), then 1eb641488224a3558a888815c6f5bbe12ddb9084 2026-10-23T01:15:26+01:00 "Rollback live composition: restore atlas/current.json to verified 202609241334 baseline", 55 minutes later.
- 08b5caeac1b0128311d7a5e985f1fbe1c18414ae 2026-10-28T17:34:02+00:00 "202610281340-gridatlas-v9.172: release the UK lightning overlay (OFF by default) to the live route".
- 38f8405c1d8582936ac5afb92ccfca9835a2cc04 2026-10-29T02:37:43+00:00 loader v2 / after-cartridge design + tooling; 3ec1e6bc3168d06f440cbfaab170c595a87ec795 2026-10-29T02:43:21+00:00 "lightning: readable overlay source + byte-exact build + scaffolder; CI rebuilds the newest generation from source (#63)".
- ddd14534…, 3424389a…, fd0f9fb8…, 207a8c60bfdd9549fa31086df53472cef9a8b693 (2026-10-29T02:46Z → 10:43Z): M5/M5b, M6/M6b, M6t and M6u cut from `src/` by the scaffolder (git log -- tools/lightning).
- c1059598d928cf4dd164898e9f87774e661ac0ce 2026-10-29T09:22:44+00:00 "loader first, then the pointer".
- f0f449b4c61cc4c3865de969a46d39cad1dc052d 2026-10-29T11:21:45+00:00 "202610291044-gridatlas-v9.186: release composition 202610291044 to the live route": the first live modular composition, loader v2.
- cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 2026-10-29T23:41:04+00:00 HEAD, v9.187, the data-centre Grid Engine.
- Authorship (depth-limited clone): `git log --format='%an' | sort | uniq -c` → 268 Ventusltd, 41 Claude, 2 Vikram Kumar. The October lightning work is mostly Claude-authored commits; the September cartridge tooling is Ventusltd.
- Checks run at HEAD: the six live cartridges hashed with node → 6 MATCH (13,589 / 41,120 / 451,935 / 435,218 / 63,707 / 71,191 B). `for g in …; cat 202609241334-sld-sandbox-v9-8.js <(printf '\n') atlas/modules/$g-… | cmp -s - atlas/cartridges/$g-sld-sandbox-v9-8.js` → holds for 21 of 21.

## Gridatlas and datacentre relevance

- The data-centre engine ships through the same mechanism: `uk-offtakers-overlay` is an `after-cartridge` cartridge (atlas/current.json:717-726: slot after-cartridge, `./modules/202610292044-uk-offtakers-overlay.js`, sha256 `e4d3fb28…`, 71,191 B, `byte_budget` 80,000). Its budget is the second entry in `CARTRIDGE_BYTE_BUDGETS` (F6, "Owner approval, 29 Oct 2026, issue #73 … for the data-centre 30/30/30 engine").
- The lightning split (F14) came first: the offtakers module became possible without crossing the 500 kB ceiling only once the overlay had its own slot. v9.186 (202610291044) introduced both `uk-lightning-overlay` and `uk-offtakers-overlay` as after-cartridge entries in one composition.
- `tools/offtakers/generations.json` lists 4 generations, the last "OT5 / DC-B1 (… data-centre category from the DC-A7 pipeline + Grid Engine 30/30/30, #73 steps 7-8; Marchwood fix)". The datacentre chapter can use the same registry → build → six-file pattern.
- Any future data-centre cut inherits F1 (hash gate), F6 (80,000 B budget, 8,809 B spare at HEAD), F12 (fresh identity) and F13 (rollback verification).

## Candidates (unkeyed; clearly marked)

- CANDIDATE: `make-generation.mjs` still cuts the **monolithic** shape. It reads the template's sld-sandbox `derived_from` and writes cartridge = base + "\n" + module (make-generation.mjs:113-119). The live pointer is modular. A new lightning generation therefore seems to need make-generation followed by split-lightning-cartridge, or a modular mode that has not been written yet. I did not find a modular scaffolder; UNVERIFIED beyond tools/lightning and tools/release.
- CANDIDATE: `docs/LIGHTNING-SOURCE.md:37-39` still names M5/M5b as the current variants, and line 48 lists M6/M6b sizes. generations.json lists only M6u. The documentation lags the registry.
- CANDIDATE: `split-lightning-cartridge.mjs` writes with plain `writeFileSync`, not `wx`, relying on its preflight existence check (line 52). That is weaker than build-cartridge/make-generation and leaves a small race window.
- CANDIDATE: the brief's path `data/UK-LIGHTNING-LAYER.md` does not exist; the file is `atlas/data/UK-LIGHTNING-LAYER.md` (15 lines). It describes the superseded 202610221600 `ukConfig`-wrapper approach, the one that was rolled back in 55 minutes.
- CANDIDATE: the browser hashes raw bytes while the tools hash LF-normalised bytes. They agree only while `.gitattributes` holds `eol=lf` and Pages serves blob bytes; a non-LF-normalised extension such as `.wasm` would not be covered by `LF_NORMALISED_EXTENSIONS`.

## Proposed lines for the Kuiper edition

1. **F1 atlas/index.html:81**: `invariant(await sha256Hex(bytes) === cartridge.sha256, ...)`. The whole architecture in one line.
2. **F11 tools/recompose.mjs:62-65**: "a reading the clock has not reached is not a reading", proven by commit a342de44's timestamp. A law, its incident and its proof are all in the clone.
3. **F14 tools/proofs/lightning-cartridge.mjs:139**: architecture change accepted by byte parity.
4. **F8 tools/lightning/make-generation.mjs:38**: `MODULE_CEILING = 64781; // 500,000 - 435,218 … - 1 newline`. A derived budget.
5. **F9 tools/lightning/build.mjs:126**: "rebuilt byte for byte", the reproducible-build gate.
6. **F13 tools/rollback.mjs:131-133**: ancestry walked, not assumed; a rollback is a new forward generation.
7. **F4 .gitattributes:32**: `* text=auto eol=lf`, one line that removed a class of four bugs.

## One next command

```bash
cd /home/user/estate/gridatlas && node tools/proofs/loader-equivalence.proof.mjs
```
