# W04 gridatlas-history
HEADS: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e
READ:
/home/user/pipelinenews/kuiper-edition/202610311905/BRIEF.md
/home/user/pipelinenews/kuiper-edition/202610311905/proof/inventory.tsv (gridatlas row only)
/home/user/estate/gridatlas/.git/shallow
git log / git show / git shortlog over all 311 commits reachable from HEAD (read only; no checkout, no fetch)
blobs read at historic commits: tools/proofs/run-current.mjs@270c999, atlas/current.json@8e017d5, tools/ci/202609012200-local-ci.mjs@9118a2d,
atlas/parts/202609012045-sld-sandbox-body.js@93c13cf, atlas/modules/202609020015-injection-response.js@60d1938,
atlas/modules/202609030137-pinned-products.js@4a17fa3, tools/rollback.mjs@1762170, .github/workflows/teleprint-parse-gate.yml@78e49b0,
atlas/cartridges/README.md@efb844b, atlas/current.json@08b5cae, tools/release/acceptance.mjs@1adbd24, tools/release/flow-lib.mjs@1adbd24,
tools/release/release-generation.mjs@61fee61, tools/offtakers/src/06b-dc-engine.js@4fa72ae, tools/offtakers/src/01-data.js@5cf426a,
tools/proofs/offtakers-cartridge.mjs@0d97015, data/uk_datacentre_pipeline_202610292014.geojson@57ed074^, data/uk_datacentre_pipeline_202610292136.geojson@d3f4eb1,
atlas/current.json@cacb69a (= HEAD), STATE.md@cacb69a, docs/RELEASE.md@HEAD (line 40 only)

Key convention for this file. Every KEY names the commit whose tree holds the quoted line:
`gridatlas@<commit> <path>:<line>`. Verify with `git -C /home/user/estate/gridatlas show <commit>:<path> | sed -n '<a>,<b>p'`.
Where the same lines are byte-identical at HEAD cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e, a second line `HEAD-KEY:` gives the HEAD
location (checked by comparing `git show <commit>:<path> | sed -n` with `sed -n` on the HEAD tree). Times are as git records them
(`--date=iso-strict`, author offset); UTC where stated.

Shallow boundary: `.git/shallow` holds `f3ba7a31b5bbac2a0af7171ddb2402cf6f3b624c` (2026-09-01T14:43:56+01:00,
"202609011433-gridatlas-v9.51: the 400 kV public record"). It is a GRAFTED boundary, not the repository's first commit; its
numstat shows the whole tree as added (70,027 lines), which inflates the add totals below. `git rev-list --count HEAD` = 311
(more than the depth of 300 because 6 merge commits bring side-branch commits in).

## Findings (keyed)

### F1 Owner acceptance that an agent cannot forge (the ACCEPT gate)
Commit: `1adbd24a50019237ffa5944ee43358ddcc74f9b0 2026-10-29T02:55:21+00:00 tools/release: the delivery flow end to end (cut → preview → acceptance → release → live bytes → homepage → served → rollback) + release-status (#64)`
KEY: gridatlas@1adbd24a50019237ffa5944ee43358ddcc74f9b0 tools/release/flow-lib.mjs:150-155
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/flow-lib.mjs:150-155
QUOTE:
```js
export function trustedActor(user, app, body = '') {
  if (!user || !OWNER_LOGINS.includes(user.login)) return { ok: false, why: `by ${user?.login ?? 'unknown'}, not an owner login (${OWNER_LOGINS.join(', ')})` };
  if (app) return { ok: false, why: `posted through the GitHub App ${app.slug || app.name}` };
  const sig = AGENT_SIGNATURES.find(re => re.test(body));
  if (sig) return { ok: false, why: `carries an agent signature (${sig})` };
  return { ok: true };
```
KEY: gridatlas@1adbd24a50019237ffa5944ee43358ddcc74f9b0 tools/release/flow-lib.mjs:140
QUOTE:
```js
export const AGENT_SIGNATURES = [/Claude-Session:/i, /Generated (?:with|by) \[Claude Code\]/i, /noreply@anthropic\.com/i, /chatgpt-codex/i];
```
Changed file / hunk: tools/release/acceptance.mjs (new, 80 lines; numstat `80 0`). Representative lines (the header, :24-27):
```js
 * Agents work with the owner's token, so GitHub cannot tell an agent's comment
 * from the owner's by login alone. The rule is therefore procedural as well:
 * no agent and no script posts an ACCEPT line or the label. --record refuses
 * to run under Claude Code, Codex or CI, and needs --i-am-the-owner.
```
WHY: The turning point where release authority is separated from the agents doing the work. Agents push with the owner's token, so
login alone proves nothing; the gate refuses any verdict carrying an agent signature or a GitHub App marker. This commit's own
trailer would fail the check it introduces. The first release in the clone to cite a GitHub acceptance is cacb69a (F15).
PATTERN: human-only verdict gate (signature-exclusion acceptance)

### F2 R-cifix MAJOR: refuse the one-step loader+pointer release
Commit: `61fee61f5e5dd952893e85458d468951f537a049 2026-10-29T10:41:50+00:00 release-generation: refuse a one-step v1 -> v2 release unless --allow-loader-follows (R-cifix MAJOR)`
KEY: gridatlas@61fee61f5e5dd952893e85458d468951f537a049 tools/release/release-generation.mjs:189-200
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/release-generation.mjs:189-200
QUOTE:
```js
// A loader that moves WITH the pointer to one the live loader could not compose (v1 -> v2 for a modular G) opens the HTML
// cache window (docs/RELEASE.md "Loader first, then the pointer"): a browser holding the cached old loader reads the new
// pointer and fails closed for up to ~10 minutes. Ship the loader first (tools/release/loader-swap.mjs release), wait,
// then release the pointer; a one-step release needs --allow-loader-follows (an explicit owner decision).
const liveRegistered = registeredLoaderOf(loader);
const liveMissing = liveRegistered ? pointerSlots(manifest).filter(slot => !liveRegistered.slots.includes(slot)) : pointerSlots(manifest);
report.loader.live_missing_slots = liveMissing;
if (loaderMoves && liveMissing.length && !args['allow-loader-follows']) {
  die(`the live loader (${report.loader.live || 'unregistered'}) cannot compose slot(s) ${liveMissing.join(', ')} that ${G} uses: release the loader first ` +
    `(node tools/release/loader-swap.mjs release --to ${previewRegistered.name} …), wait for check-served plus 10 minutes, then release ${G}; ` +
    'or pass --allow-loader-follows to accept the cache window (docs/RELEASE.md)');
}
```
Changed file / hunk: this IS the hunk (`git show 61fee61 -- tools/release/release-generation.mjs`, @@ -184,6 +186,18 @@; numstat `15 1`).
WHY: A cache-window race became a refusal in code. The history then obeys it within half an hour: d35db7b4c0f50dc85d2d49d20bfa4baeb91d0b7c
(2026-10-29T11:08:52+00:00, "live loader v1 -> v2 (atlas/index.html only; the pointer stays 202610281340)") ships the loader alone,
and f0f449b4c61cc4c3865de969a46d39cad1dc052d (11:21:45+00:00) moves the pointer 12m53s later. That is the two-step path the refusal names.
PATTERN: refuse-and-name-the-safe-path (ordered two-phase deploy)

### F3 Runtime data pinned by commit and SHA-256 (v9.83)
Commit: `4a17fa3a48b2617716070a8a1a7601c31d68c70b 2026-09-03T02:38:13+01:00 202609030137-gridatlas-v9.83: the runtime data is pinned to a commit and checked by its digest`
KEY: gridatlas@4a17fa3a48b2617716070a8a1a7601c31d68c70b atlas/modules/202609030137-pinned-products.js:48-58
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/modules/202609030137-pinned-products.js:48-58
QUOTE:
```js
  /* Each entry: the repository, the 40-character commit the Atlas was built
     against, the path, and the SHA-256 of the bytes served at that commit.
     `bytes` is recorded beside the digest because a truncated response is
     the failure mode a digest catches last and a length catches first. */
  const PINS = {
    'connection-points.v3': {
      repository: 'data-grid-gb',
      ref: '1c9909d1138704b29235c27fd769436dda8a0b18',
      path: 'derived/connection-points.v3.json',
      sha256: '11e28859a6d17cc8ee4047c2032d55d043be98f7123743f3b2b03225e07a4c0c',
      bytes: 2896561,
```
Changed file / hunk: atlas/modules/202609030137-pinned-products.js (new, numstat `152 0`). Same file :31 reads
`   MOVING A PIN IS A CUT, AND THAT IS THE POINT. A data correction and a map`, and :112 reads `   *   Only 'MISMATCH' means the caller must refuse.`
WHY: The commit body names the trigger. A schema string "defends SHAPE and is blind to VALUES", and an upstream branch published changed
transformer counts. From here a data change can only reach the map as a new cut. The data-centre pipeline uses the same discipline
seven weeks later (F13, DCFSHA).
PATTERN: content-addressed dependency pin (commit + digest + length)

### F4 Rollback that refuses what it cannot verify
Commit: `1762170b3274559a1c880150a1a93df5d346210d 2026-09-03T04:16:36+01:00 202609030316: the live composition can be moved back, and the tool refuses what it cannot verify`
KEY: gridatlas@1762170b3274559a1c880150a1a93df5d346210d tools/rollback.mjs:28-39
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/rollback.mjs:28-39
QUOTE:
```js
 * WHAT IT REFUSES
 * ---------------
 * A rollback that cannot be trusted is worse than no rollback, because it is
 * reached for in the one moment nobody has time to check it. So before it
 * writes anything:
 *
 *   - the target must be an ANCESTOR of the current generation, walked
 *     through parent_generation. "Roll back" to something that never shipped
 *     on this line is a typo, and a typo at 3am must not be servable.
 *   - every cartridge the target names must still exist, and its bytes must
 *     still hash to the digest the target recorded. A pointer to bytes that
 *     are gone is the failure this whole mechanism exists to prevent.
```
Changed files: tools/rollback.mjs (`238 0`), .github/workflows/rollback-composition.yml (`180 0`). The body says "Ten generations were
cut in three hours tonight" and quotes the cvaa result `rollback-exists  FAIL`.
WHY: This commit makes the pointer reversible. Rollback is gated on ancestry and on digests taken from committed bytes. Every later rollback in
this history is a pointer move, never a repair: 8fe77a5 (F9) and 1eb6414 (F11).
PATTERN: verified rollback (ancestor + digest precondition)

### F5 Codex stop-ship accepted: no arbitrary slack, Kirchhoff everywhere (v9.77)
Commit: `60d193827d336a40c91ec64cce4bc56e50074bcb 2026-09-02T01:18:54+01:00 202609020018-gridatlas-v9.77: Codex stop-ship 202609020030, both findings accepted in full. The first proof passed while production was broken because it chose a connected slack by hand and the caller chose the first lexicographic bus; the successor proof runs the production path itself. Modelled branches went 437 to 459 when the published row became the edge identity.`
KEY: gridatlas@60d193827d336a40c91ec64cce4bc56e50074bcb atlas/modules/202609020015-injection-response.js:91-101
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/modules/202609020015-injection-response.js:91-101
QUOTE:
```js
 * 1. NO ARBITRARY SLACK. The caller chose the first bus that was not the
 *    injection bus. The 400 kV induced graph is not connected - 573 buses,
 *    437 modelled edges, 238 components - so that bus is usually in a
 *    different component from the injection, and a transfer between two
 *    components does not exist. West Burton was paired with ABHA41, which
 *    is disconnected from 572 of the 573 buses; the solve ran 2,292
 *    iterations to a residual of about 1.7e13.
 *
 *    Worse, acceptance checked Kirchhoff at the INJECTION BUS ONLY, which
 *    a disconnected pair can satisfy while the solve has not converged at
 *    all. A page gated on that check could print an impossible transfer.
```
Changed file: atlas/modules/202609020015-injection-response.js (new, numstat `568 0`).
WHY: A cross-agent (Codex) review stopped the ship. The fix is written down with its numbers: 573 buses, 238 components, residual 1.7e13.
The lesson is that a proof must run the production path, not a hand-picked case. The DC powerflow came in only 70 minutes earlier (F12).
PATTERN: proof-runs-production-path; global conservation check

### F6 A composed cartridge without a proof is a failure, not a log line
Commit: `270c99940d5335af0368ecda487537455bf1e377 2026-09-01T13:47:16+01:00 Require a proof for every composed GridAtlas cartridge`
KEY: gridatlas@270c99940d5335af0368ecda487537455bf1e377 tools/proofs/run-current.mjs:34-38
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/run-current.mjs:34-38
QUOTE:
```js
  const proof = path.join(ROOT, 'tools', 'proofs',
    `${cartridge.generation}-${id}.proof.mjs`);
  if (!fs.existsSync(proof)) {
    failures.push(`${id} ${cartridge.generation}: no proof at ${path.relative(ROOT, proof)}`);
    continue;
```
Hunk (`git show 270c999 -- tools/proofs/run-current.mjs`, @@ -34,9 +34,7 @@):
```diff
   if (!fs.existsSync(proof)) {
-    // Not every cartridge in this composition carries a proof under its own
-    // id; say which, plainly, rather than passing in silence.
-    console.log(`  ${id} ${cartridge.generation}: no proof at ${path.relative(ROOT, proof)}`);
+    failures.push(`${id} ${cartridge.generation}: no proof at ${path.relative(ROOT, proof)}`);
     continue;
   }
```
WHY: This is the first child of the shallow boundary (parent f3ba7a31). A missing proof stops being a log line and becomes a failure,
and every later generation in this clone runs on that rule.
PATTERN: fail closed on absent evidence

### F7 "A skip is not a pass": CI that catches a check that declines to check
Commit: `9118a2db177563a3175c51b9428719c940edc79b 2026-09-01T20:01:10+01:00 202609012310: the CI learns to catch a check that declines to check`
KEY: gridatlas@9118a2db177563a3175c51b9428719c940edc79b tools/ci/202609012200-local-ci.mjs:351-358
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/202609012200-local-ci.mjs:367-374 (same text, shifted +16)
QUOTE:
```js
   Codex found the original on 202609012230: the topology proof skipped
   every real-payload assertion when its sibling data product was absent -
   the normal condition on an isolated checkout - and reported 46/46. Green
   exactly where nobody is watching. */
const CLAIMS_TO_CHECK = /\.(proof|verify|test|spec)\.(mjs|js|ts)$|(^|\/)(proofs?|verify|tests?)\//i;
const ANNOUNCES_SKIP = /\[skip\]|\bskipping\b|\bskipped\b|did not run|checks below did not/i;
const GUARDS_ON_ABSENCE = /if\s*\(\s*!\s*\w*(present|exists|found|available|ready|installed)\w*\s*\)/i;
const DECLARES_CONCESSION = /process\.env\.[A-Z0-9_]*(ALLOW|SKIP|WITHOUT|OFFLINE|MISSING)[A-Z0-9_]*/;
```
Changed file: tools/ci/202609012200-local-ci.mjs (numstat `93 1`). This one hunk adds the whole PASS 4 ("checks that decline to check, and report success").
WHY: A meta-check over every proof in two repositories. It flags a skip guarded on absence unless a named env opt-in declares the
concession. In the same hunk an empty catch had hidden a ReferenceError ("0 proof/verifier files read"), and the hunk fixes that too.
PATTERN: skip-is-not-a-pass detector; named concession

### F8 v9.58: the composer refused, and service was restored by composition, not repair
Commit: `8e017d5e239ee175bd04a3b2de87a8f999a26d25 2026-09-01T17:56:15+01:00 202609011805-gridatlas-v9.58: service restored - v9.57 claimed a slot the shell never loads`
KEY: gridatlas@8e017d5e239ee175bd04a3b2de87a8f999a26d25 atlas/current.json:14-18
QUOTE:
```json
  "cartridge_order": [
    "streaming-parquet-bridge",
    "uk-gazetteer-flyto",
    "sld-sandbox"
  ],
```
Hunk (`git show 8e017d5 -- atlas/current.json`, @@ -14,7 +14,6 @@):
```diff
   "cartridge_order": [
     "streaming-parquet-bridge",
     "uk-gazetteer-flyto",
-    "substation-intelligence",
     "sld-sandbox"
   ],
```
Commit body (verbatim): "The listing was not the contract. index.html is the contract, and I read the wrong one" and "Rollback by composition, never by repair. Proofs 3/3."
WHY: This is the first recorded live outage in the clone. The composer was right to refuse a cartridge that claimed a slot the shell never loads. One of the
five deletion commits in the history removes that cartridge and its proof (434 + 150 lines). It returns 7 minutes later through
a real slot: 633aa32dba0c455aa4721894be924ae8932b1c52 (2026-09-01T18:03:06+01:00) "the substation cartridge returns, through a slot that exists".
PATTERN: the shell is the contract; recompose forward to restore

### F9 The print outage: ROLL BACK, "it parses, and this time that was checked", the gate leaves the laptop
Commits:
`8fe77a54d35fa9145230eabf6924cd365f1fb206 2026-09-05T16:35:53+01:00 202609051535-gridatlas: ROLL BACK live to 202609051510 (v9.130)`
`96d70a52b0700ba3cd6d6c652ff564e4cd008020 2026-09-05T16:40:47+01:00 202609051540-gridatlas v9.135: it parses, and this time that was checked`
`78e49b0f35f3471feb05b28f496b31449fdd06f9 2026-09-05T17:20:52+01:00 202609051620-gridatlas: the parse gate leaves the laptop`
KEY: gridatlas@78e49b0f35f3471feb05b28f496b31449fdd06f9 .github/workflows/teleprint-parse-gate.yml:16-22
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/teleprint-parse-gate.yml:16-22
QUOTE:
```yaml
# Pages here is served from the branch, not from a deployment job: whatever is
# on main is what the world downloads, the moment it is pushed. So on `push`
# this workflow runs AFTER the bytes are already public. It is a DETECTOR
# there, not a gate, and saying otherwise would be the same kind of comfortable
# false claim it exists to prevent. Its blocking uses are `pull_request`, where
# it runs before the merge, and `workflow_dispatch`, which is how it gets fired
# from a phone.
```
Hunk of the rollback (`git show 8fe77a5 -- atlas/current.json`, @@ -61,13 +61,13 @@; part):
```diff
-   "generation": "202609051522",
-   "version": "v9.131",
+   "generation": "202609050354",
+   "version": "v9.121",
    "type": "script",
    "slot": "replace-script",
    "replace_script": "202608292126-pre-snapped-config-adapter.js",
-   "path": "./cartridges/202609051522-sld-sandbox-v9-8.js",
-   "sha256": "a4948e8e2656f306cc17d19ecfbfc59d1574fb2a04ecb7286255aa06153f79a3",
+   "path": "./cartridges/202609050354-sld-sandbox-v9-8.js",
+   "sha256": "7c2df5dabb0082d4cef941b98bf31e92161d1e79a7d22bd6c84e81b171507022",
```
WHY: In 45 minutes the repo goes from outage to rollback, fix and CI gate. v9.131-v9.134 shipped a cartridge that does not parse.
The rollback body says "node --check passed on the ES module it was flattened from, which is not the same file". The workflow is
honest that on push it is a detector, not a gate. That candour comes back at HEAD in the release body of cacb69a ("CI must
independently validate all release gates").
PATTERN: check the artifact you ship, not its source; label a detector a detector

### F10 Keep every old cartridge, and audit why (no orphans)
Commit: `efb844b9bba70edd42671aa56a9877709d7526c3 2026-09-29T08:34:05+01:00 Add PR file size guard and a cartridge audit instead of deleting old copies` (author: Vikram Kumar)
KEY: gridatlas@efb844b9bba70edd42671aa56a9877709d7526c3 atlas/cartridges/README.md:18-24
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/README.md:18-24
QUOTE:
```markdown
| Class | Files | MB | Meaning |
|---|---:|---:|---|
| LIVE | 5 | 1.3 | named in `atlas/current.json`; served at the live route |
| VERSIONED | 32 | 9.5 | named in `atlas/v/<generation>/current.json`; a published route |
| TOOLING | 25 | 7.0 | named by a proof, a CI script, `.gitattributes` or a workflow |
| ROLLBACK | 79 | 25.3 | named only by `atlas/manifests/<generation>-composition.json` |
| ORPHAN | 0 | 0 | named by nothing |
```
Changed files: .github/workflows/pr-file-size-guard.yml (`106 0`), tools/cartridges/audit.mjs (`110 0`), atlas/cartridges/README.md (`58 0`).
WHY: The append-only cost is counted rather than "cleaned up". Measured over the clone, `git log --numstat --format=` sums to 1,519,049 added and only 7,024
deleted lines. Old copies stay because F4 rollback hashes their committed bytes. This is one of only 2 commits authored by a human git
identity other than Ventusltd. It is followed by the longest silence in the history (F-History, 23.7 days).
PATTERN: classify before delete (reachability audit); append-only storage

### F11 Lightning: live, rolled back in 55 minutes, five days of previews, then released OFF by default
Commits:
`cd9a27efed8a9c005d87cdcfe9f363ed7e80d6ad 2026-10-23T00:20:12+01:00 Add public UK lightning layer to GridAtlas`
`1eb641488224a3558a888815c6f5bbe12ddb9084 2026-10-23T01:15:26+01:00 Rollback live composition: restore atlas/current.json to verified 202609241334 baseline`
`c09d199914817c7502b875c58eb22715e53c57ec 2026-10-23T01:15:32+01:00 Rollback live composition: restore STATE.md to verified 202609241334 baseline`
`08b5caeac1b0128311d7a5e985f1fbe1c18414ae 2026-10-28T17:34:02+00:00 202610281340-gridatlas-v9.172: release the UK lightning overlay (OFF by default) to the live route`
KEY: gridatlas@08b5caeac1b0128311d7a5e985f1fbe1c18414ae atlas/current.json:576-581
QUOTE:
```json
   "derived_from": "./cartridges/202609241334-sld-sandbox-v9-8.js",
   "uk_lightning": {
    "module": "./modules/202610281340-uk-lightning-overlay.js",
    "module_bytes": 44700,
    "delta": "live 202609241334 bytes + \"\\n\" + module; nothing replaced",
    "default": "OFF, never persisted; no request, source or layer until the first switch-on",
```
KEY: gridatlas@08b5caeac1b0128311d7a5e985f1fbe1c18414ae atlas/current.json:572
QUOTE:
```json
     "upstream": "EUMETSAT MTG Lightning Imager L2-LFL archive built by Ventusltd/lightning; unsearched or lost time is unknown, not zero"
```
Rollback hunk (`git show 1eb6414 -- atlas/current.json`, @@ -1,7 +1,7 @@):
```diff
- "generation": "202610221600",
- "previous_generation": "202609241334",
+ "generation": "202609241334",
+ "previous_generation": "202609200022",
```
WHY: This arc changed the process. A direct-to-live feature was rolled back in 55 minutes. It then went through 14 isolated/preview-only commits
(bd191e8 2026-10-23 .. 5f8715f 2026-10-28; PRs #40 #42 #44..#48 plus unnumbered; subjects say "no live pointer switch", "preview only" or "isolated"), and was released as an additive delta whose arrival
"is pixel-identical to 202609241334" (release body). The release body records "Rollback: git revert this commit" and
"Authorised by: owner (Vikram), 28 Oct 2026 17:3x UTC". "unknown, not zero" is the estate's absence rule applied to a data feed.
PATTERN: additive delta, default OFF; preview-only until accepted

### F12 v9.73: the first computation that solves, and publishes its own conservation error
Commit: `93c13cf3d7d59d8c489adc9a11d28214556a27d0 2026-09-02T00:08:50+01:00 202609012308-gridatlas-v9.73: the first computation here that solves rather than reports; resistance and susceptance are untouched because the declared DC model says they are, a zero-reactance branch is shorted as the busbar it physically is rather than given an invented reactance, and a branch with no published reactance is skipped and counted`
KEY: gridatlas@93c13cf3d7d59d8c489adc9a11d28214556a27d0 atlas/parts/202609012045-sld-sandbox-body.js:409-413
QUOTE:
```js
  /* Published so a reviewer can ask the page whether any answer it gave
     failed its own conservation check. A solve that has not converged
     produces plausible-looking flows that are wrong, so the error is
     surfaced rather than trusted. */
  const powerflow = { answered: 0, worst_kirchhoff_error: 0 };
```
HEAD drift: at HEAD the line is `atlas/parts/202609012045-sld-sandbox-body.js:755` and reads
`  const powerflow = { answered: 0, refused: 0, worst_kirchhoff_error: 0 };`. A `refused` counter was added after F5.
Hunk (`git show 93c13cf -- atlas/parts/202609012045-sld-sandbox-body.js`, @@ -244,6 +244,11 @@):
```diff
   let currentNearest400 = null;
+  /* The capacity Pipeline News sent, kept where the network card can
+     reach it. Without this the powerflow answer would have to invent a
+     figure, and an invented megawatt is exactly the kind of number that
+     gets quoted back as the project's own. */
+  let currentCapacityMw = null;
```
WHY: The Atlas moves from reporting to solving (a declared DC powerflow over 400 kV). It publishes its worst Kirchhoff error on
`window`, so a reviewer can audit a figure before anyone quotes it. F5 then tightens this to a global check.
PATTERN: self-reporting numerical error; no invented inputs

### F13 Data-centre Grid Engine 30/30/30 (#73 steps 7-8)
Commit: `4fa72ae0927f335fd1265e93b28992315cdb55a3 2026-10-29T20:40:02+00:00 offtakers src: data-centre category + Grid Engine 30/30/30 (#73 steps 7-8); pinned pipeline and conventional data; Marchwood fix`
KEY: gridatlas@4fa72ae0927f335fd1265e93b28992315cdb55a3 tools/offtakers/src/06b-dc-engine.js:1-9
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:1-9
QUOTE:
```js
/// ---- DC-B1 (#73 steps 7-8): a data-centre tap fires the Grid Engine 30/30/30 (card and map: DC-B2 CARD-SPEC.md) ----
/// Substations: the original link.measure.nearestSubstations returns LINK_COUNT = 5, a closure constant with no limit
/// argument (sld-sandbox 202609241334 :1664, :3513), so the 30 come from the engine's own Grid Finding Scope
/// (__GRIDATLAS_MODULES__.gridScope.scope, same cartridge :45-186: same list link.substations, same geodesy) with its count
/// and its 40 km radius as parameters (DC-B3 ENGINE.md). The original is still called on every tap: its 5 must be the
/// head of the scope's list (else noted in S.errors), and it names the nearest beyond 40 km when none is within.
/// REPD: the same register and grouping as the 15 (RG, near, sites), 30 within 40 km, ties kept.
/// Conventional (owner via lead, 29 Oct 20:05 UTC): ALWAYS the nearest 30, any distance, listed with km; lines are
/// drawn only up to R100 km and the card says so.
```
Changed file: tools/offtakers/src/06b-dc-engine.js (new, numstat `167 0`). The commit also adds tools/ci/offtakers/overlay-offtakers.test.mjs `176 18`.
WHY: The data-centre engine is born in this commit. It does not fork the substation search: it reuses the shipped Grid Finding Scope and still calls the
original 5-nearest function as a cross-check ("its 5 must be the head"). It is cited to line numbers in the immutable 202609241334 cartridge.
PATTERN: extend by reuse plus an invariant cross-check (old answer must be a prefix of new)

### F14 The 203-site dataset is replaced by the corrected 227-site pipeline (225 mappable)
Commits:
`d3f4eb106abc6f360b34ed54b606d75007031c85 2026-10-29T21:37:34+00:00 Vendor corrected 227-site open-data pipeline with provenance (#73)`
`5cf426a1fd545499bfb2972afc14bf74defe899e 2026-10-29T21:37:59+00:00 Point data-centre overlay to corrected 227-site pipeline (#73)`
`57ed07493cc41a5b26de747b1eaa3ac76d303f3b 2026-10-29T21:43:25+00:00 Remove superseded 203-site dataset with incorrect cross-operator merges`
KEY: gridatlas@5cf426a1fd545499bfb2972afc14bf74defe899e tools/offtakers/src/01-data.js:18-19
HEAD-KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:18-19
QUOTE:
```js
/// Both are committed verbatim, pinned by SHA-256 and capped (PCAP bytes, PMAX features).
DCF='https://ventusltd.github.io/gridatlas/data/uk_datacentre_pipeline_202610292136.geojson',DCFSHA='176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89',
```
Hunk (`git show 5cf426a -- tools/offtakers/src/01-data.js`, @@ -16,7 +16,7 @@; the two changed lines):
```diff
-DCF='https://ventusltd.github.io/gridatlas/data/uk_datacentre_pipeline_202610292014.geojson',DCFSHA='f9f056c29b335be9f583be8a1cd97227f2ae85095c7e1164be8f19b38f82c6c9',
+DCF='https://ventusltd.github.io/gridatlas/data/uk_datacentre_pipeline_202610292136.geojson',DCFSHA='176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89',
```
Measured (python3 -I json load of each blob): 57ed074^:data/uk_datacentre_pipeline_202610292014.geojson = 203 features, 203 with geometry,
406,015 bytes, sha256 f9f056c2...c6c9; d3f4eb1:data/uk_datacentre_pipeline_202610292136.geojson = 227 features, 225 with geometry,
sha256 176c1b2e...2d89. Both digests equal the pinned DCFSHA values. 57ed074 numstat: `0 1 data/uk_datacentre_pipeline_202610292014.geojson` (single-line GeoJSON).
WHY: A wrong dataset (cross-operator merges) is swapped by changing a pin and then deleting the old blob from the tree. Git history
still holds it. The follow-ups state the count exactly: 79eb77fa1a00d4efff5857e9643c16f5445d6326 (21:50:34+00:00) "Browser expect 225 mappable sites;
preserve two unlocated planning records as unknown". aca16f6a4ca61ea0be90249777bb384853038818 (21:40:17+00:00) "Prove distinct Slough operators are separate origins in preview test (#73)".
PATTERN: swap by pin; unknown stays unknown (225 drawn of 227 records)

### F15 v9.187: release of the accepted data-centre preview (HEAD)
Commit: `cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 2026-10-29T23:41:04+00:00 202610292044-gridatlas-v9.187: release accepted data-centre Grid Engine preview`
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/current.json:717-726
QUOTE:
```json
   "id": "uk-offtakers-overlay",
   "generation": "202610292044",
   "version": "v9.187",
   "type": "script",
   "slot": "after-cartridge",
   "after": "uk-lightning-overlay",
   "path": "./modules/202610292044-uk-offtakers-overlay.js",
   "sha256": "e4d3fb288ef0ac3782f50f53dae9ebeb8564ca65e220d7b24f755179be7fb30a",
   "bytes": 71191,
   "byte_budget": 80000,
```
Hunk (`git show cacb69a -- atlas/current.json`, @@ -715,22 +715,24 @@; part):
```diff
-   "path": "./modules/202610291044-uk-offtakers-overlay.js",
-   "sha256": "2f455e7a93791e8f9f3b463ad2857019b98d648f217dea71e13e465d0597b242",
-   "bytes": 39633,
-   "byte_budget": 40000,
+   "path": "./modules/202610292044-uk-offtakers-overlay.js",
+   "sha256": "e4d3fb288ef0ac3782f50f53dae9ebeb8564ca65e220d7b24f755179be7fb30a",
+   "bytes": 71191,
```
Verified: `git show HEAD:atlas/modules/202610292044-uk-offtakers-overlay.js | wc -c` = 71191, and its sha256 = e4d3fb28...fb30a, matching the pointer.
Commit body (verbatim): "Release only atlas/current.json and STATE.md from accepted immutable preview." /
"Authorised-by: owner (Ventusltd), https://github.com/Ventusltd/gridatlas/pull/75#issuecomment-6511041884, 2026-10-29T23:34:44Z".
WHY: The live pointer the brief names. It is a 2-file release (numstat `1 1 STATE.md`, `56 25 atlas/current.json`), and it is the first release whose authority
is a GitHub comment URL. The comment text itself is UNVERIFIED: the GitHub API is not available to workers and the clone does not hold PR comments.
The module grew 39,633 -> 71,191 bytes (+79.6%) under an owner-approved ceiling of 80,000.
PATTERN: pointer-only release from an immutable preview

## Patterns (keyed; each cites at least one F above)
- Fail closed on missing evidence: F6 (missing proof = failure), F7 (skip is not a pass), F3 (only MISMATCH refuses, absent crypto is stated), F2 (refuse the unsafe release path).
- Rollback is a pointer move to verified bytes, never a repair: F4 (ancestor + digest), F8 ("Rollback by composition, never by repair"), F9 (8fe77a5), F11 (1eb6414).
- Content addressing at every hop: F3 (data pins), F14 (DCFSHA), F15 (module sha256 + bytes + byte_budget in the pointer).
- Separation of duties between agents and owner: F1 (AGENT_SIGNATURES), F11 and F15 ("Authorised by" lines in release bodies).
- Honest labelling of what a check can do: F9 ("It is a DETECTOR there, not a gate"), F12 (publish worst_kirchhoff_error), F11 ("unknown, not zero"), F14 (225 of 227 drawn).
- Extend by reuse plus cross-check: F13 (old 5-nearest must head the new 30).
- Append-only, audited growth: F10 (0 orphans; 79 rollback-only files).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

All counts are over the 311 commits reachable from gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (shallow; boundary f3ba7a31b5bbac2a0af7171ddb2402cf6f3b624c, 2026-09-01T14:43:56+01:00).

Authorship (`git shortlog -sn HEAD`, names only): Ventusltd 268, Claude 41, Vikram Kumar 2.
Committer names (`git log --format=%cn | sort | uniq -c`): Ventusltd 275, GitHub 27, Claude 7, Vikram Kumar 2.
- GitHub Actions bots: 0 commits. `git log --format='%an|%cn' | grep -ic bot` = 0. The 27 "GitHub" committer commits are web-flow
  (PR merges/squashes via github.com, e.g. a5bee46 "(#69)", 94009a2 "Merge pull request #67"), all authored by Ventusltd.
- Agent involvement (body scan of every commit): 41 authored by Claude; 186 of the 270 Ventusltd/Vikram Kumar commits carry a Claude
  `Co-Authored-By`/`Claude-Session` marker; 84 carry no Claude marker. 20 subjects mention Codex (`git log -i --grep=codex --format=%s | wc -l`).
- Claude as git author by day: 2026-09-04 1, 2026-10-27 1, 2026-10-28 7, 2026-10-29 32. October's release tooling is largely agent-authored.
- Merges: 6 (`git rev-list --count --merges HEAD`). These include 94009a2a0b300bfa4c2e55e6870f6830ed049bcf (2026-10-29T03:37:28+00:00, PR #67) and 2fd4d9725772e5a6b4bf51f2212cf3a957422575 (2026-09-29T08:37:29+01:00, PR #20).
- Reverts: 0 commits whose subject starts "Revert" (`git log --format=%s | grep -c '^Revert'`). Rollbacks are pointer moves:
  8fe77a54d35fa9145230eabf6924cd365f1fb206 (2026-09-05, print outage), 1eb641488224a3558a888815c6f5bbe12ddb9084 + c09d199914817c7502b875c58eb22715e53c57ec (2026-10-23, lightning),
  and 8e017d5e239ee175bd04a3b2de87a8f999a26d25 (2026-09-01, "service restored" by recomposition).

Cadence (`--date=iso-strict`, calendar day in the author's offset): 2026-09-01 63, 09-02 43, 09-03 34, 09-04 15, 09-05 22, 09-06 2,
09-07 16, 09-08 16, 09-11 4, 09-17 1, 09-20 1, 09-24 1, 09-29 2, 10-23 5, 10-26 3, 10-27 7, 10-28 15, 10-29 61. By month: September 220, October 91.
Two storms: 2026-09-01..09-05 (177 commits; v9.51 -> v9.138) and 2026-10-27..10-29 (83 commits; previews -> v9.172 -> v9.186 -> v9.187).
Subjects containing "overnight": 51 (2026-09-01T23:09:03+01:00 to 2026-09-02T01:19:58+01:00, the loop of "step authored" / "verified live").
Versions named in subjects run v9.51 -> v9.187.

Busiest hours (UTC, `git log --date=format-local:%H`, TZ=UTC): 23h 38, 22h 35, 00h 35, 21h 32, 03h 24, 02h 20, 09h 17, 17h 12.
Commits between 21:00 and 03:59 UTC: 196 of 311 (63%).

Longest gaps (committer time, sorted):
1. 567.7 h (23.7 days): 2fd4d9725772e5a6b4bf51f2212cf3a957422575 2026-09-29T08:37:29+01:00 -> cd9a27efed8a9c005d87cdcfe9f363ed7e80d6ad 2026-10-23T00:20:12+01:00
2. 133.3 h: ece848117a6d21b7fccb232557194877698c48a9 2026-09-11T11:24:22+01:00 -> 238578f05707d2b4537d5c988e46a2164079e5c6 2026-09-17T00:43:08+01:00
3. 113.8 h: 173b329ba45cc0d458422b0b243364d65ebdad9f 2026-09-24T14:45:09+01:00 -> efb844b9bba70edd42671aa56a9877709d7526c3 2026-09-29T08:34:05+01:00
4. 109.2 h: f2d3bfb2d241d21bf4e7582301986ec9ef8a65d3 2026-09-20T01:34:56+01:00 -> 173b329ba45cc0d458422b0b243364d65ebdad9f 2026-09-24T14:45:09+01:00
5. 72.9 h: 238578f05707d2b4537d5c988e46a2164079e5c6 -> f2d3bfb2d241d21bf4e7582301986ec9ef8a65d3 (2026-09-17 -> 09-20)

Size (`git log --numstat --format=`): 1,519,049 lines added, 7,024 deleted (the boundary's 70,027 included). Largest after the boundary:
5c41ec4 "NESO connection register: the substation each project actually connects at" (+69,517 / -224) and b7a40d1 (v9.115, Vikram Kumar, +45,636 / -51).

Generation stamps in subjects (`git log --format=%s | grep -o '20261[0-9]\{7\}' | sort | uniq -c`): 24 distinct October stamps.
202610281340 x3, 202610291044 x3, 202610290400 x2, 202610292044 x2, and 20 others x1 (202610262323 ... 202610291043).
Across all of 2026: 241 stamp mentions, 190 distinct (`grep -o '2026[0-9]\{8\}'`).

Preview -> ACCEPT -> release for the last three generations (UTC, author time):
| Generation | Preview | Gate / acceptance evidence in clone | Release | Preview -> release |
|---|---|---|---|---|
| 202610281340 (v9.172) | 5f8715f37814e12ba5b4d55023d772b665cdf04a 2026-10-28T13:50:24Z "Publish Lightning Build L3 preview 202610281340 (no live pointer switch) (#48)" | body of 08b5cae: "Authorised by: owner (Vikram), 28 Oct 2026 17:3x UTC, release conditional on ChatGPT's V1-V15 veto passing on L3" (before acceptance.mjs existed) | 08b5caeac1b0128311d7a5e985f1fbe1c18414ae 2026-10-28T17:34:02Z | 3h44m |
| 202610291044 (v9.186) | 6bd84eb27ee94b1a08c1d991a7f2b2a90dd46ebb 2026-10-29T10:44:12Z "202610291044 preview (v9.186) ..." (candidate 207a8c6 at 10:43:12Z) | body of f0f449b: "Authorised by: Owner (Vikram), chat instruction 29 Oct 2026 09:13 UTC". Chat, not an ACCEPT comment. Loader-first step d35db7b 11:08:52Z (F2) | f0f449b4c61cc4c3865de969a46d39cad1dc052d 2026-10-29T11:21:45Z | 37m33s |
| 202610292044 (v9.187) | 2f807295c6ff0a0ebf148a74312f9befc499d805 2026-10-29T20:44:37Z "202610292044 preview (v9.187) ..." | 22 #73 follow-up commits 21:20:09Z..21:55:40Z (80 kB budget approval, 227-site swap, Chromium smoke tests); body of cacb69a cites PR #75 comment 2026-10-29T23:34:44Z (content UNVERIFIED) | cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 2026-10-29T23:41:04Z | 2h56m27s |
Note: the 22 follow-ups plus 4fa72ae and 2f80729 all have committer time 2026-10-29T21:59:11+00:00, which suggests one rebase/push. Several come in same-subject pairs touching
one file each (465d247/0d97015, b2ed386/486ea3c, 5709508/6deccf5), consistent with per-file commits through the GitHub web or API.

R-<code> review tickets (subjects): R-taps MAJOR x2 (c054ecf897aa334062182e63cb7edaf400a53185, f3018a7e3d92c06c7261e19cfa2ca852267a2187), R-cifix MAJOR x1 (61fee61f5e5dd952893e85458d468951f537a049),
R-otsec x2, R-words x2, R-taps x2, R-a11yperf, R-camera, R-otdata. Bodies add R-cifix MINOR x3, R-release MINOR, R-l3regress MINOR, R-handoff MINOR,
R-security, R-repd, R-provenance, R-layout, R-diff, R-data, R-bugs, R-a11y. All appear on 2026-10-28/29.

Issue/PR numbers in subjects: #73 x15 (the data-centre engine; all on 2026-10-29), #64 x2, and once each #19 #20 #40 #42 #44 #45 #46 #47 #48 #50 #51 #52 #54
#56 #58 #60 #61 #62 #63 #67 #69 #75. #69 = a5bee46 "ci: pr-gate runs the offtakers suite with each composition's own lightning module (#69)".
#75 = the v9.187 preview PR (in subject 2355c78 "Run draft #75 real Chromium mobile/desktop browser checks in existing CI", and in the cacb69a authorisation URL).

Budget ratchet (owner decisions recorded in code):
2f7d752ea301856456691eebcb00cc2a1c282d20 (authored 2026-10-27T02:39:16Z, committed 2026-10-28T18:52:15Z) tools/scope/loop.mjs 460_000 -> 480_000;
edb17db37000a941d4f48412f659895b12286f1c (2026-10-28T21:06:04Z) 480_000 -> 500_000 (subject quotes the owner: "Raise the limit if needed make the feature comprehensive");
offtakers module 40,000 -> 72,000 PROPOSED (4fa72ae) -> 80,000 approved (465d247 tools/scope/lib.mjs, 0d97015 tools/proofs/offtakers-cartridge.mjs:21:
`export const OFFTAKERS_ID = 'uk-offtakers-overlay', ANCHOR = 'uk-lightning-overlay', BUDGET = 80000; // Owner-approved 80,000 bytes, 29 Oct 2026, issue #73 (tools/scope/lib.mjs)`).

Deletions (`git log --diff-filter=D`; 5 commits, 8 paths in total):
- 57ed07493cc41a5b26de747b1eaa3ac76d303f3b 2026-10-29T21:43:25+00:00 data/uk_datacentre_pipeline_202610292014.geojson (the superseded 203-site set; F14)
- 05388f1b669dc83126f40c3162d90de5aa7fe53f 2026-10-29T03:29:35+00:00 tools/ci/offtakers/fixtures/{datacentres.geojson.gz, heavy_emitters_uk.json.gz, industrial_offtakers.geojson.gz}
- 2fb7106d8c89e74505e2413b903b61180f2f2c35 2026-10-28T17:33:31+00:00 .github/workflows/uk-lightning-preview.yml ("Retire ... so the scope loop passes on main", 31 s before the v9.172 release)
- 5634beb939b65ba6bc376452a7df67eca7fb42eb 2026-09-01T18:52:12+01:00 atlas/manifests/202609012020-sld-sandbox-v9-8-parts.json
- 8e017d5e239ee175bd04a3b2de87a8f999a26d25 2026-09-01T17:56:15+01:00 atlas/cartridges/202609011751-substation-intelligence-v9-57.js, tools/proofs/202609011751-substation-intelligence.proof.mjs (F8)
No cartridge has been deleted since 2026-09-01. That is consistent with F10.

Turning points in order (full SHA, author date, subject):
1. 270c99940d5335af0368ecda487537455bf1e377 2026-09-01T13:47:16+01:00 Require a proof for every composed GridAtlas cartridge (F6)
2. 8e017d5e239ee175bd04a3b2de87a8f999a26d25 2026-09-01T17:56:15+01:00 202609011805-gridatlas-v9.58: service restored - v9.57 claimed a slot the shell never loads (F8)
3. 9118a2db177563a3175c51b9428719c940edc79b 2026-09-01T20:01:10+01:00 202609012310: the CI learns to catch a check that declines to check (F7)
4. 93c13cf3d7d59d8c489adc9a11d28214556a27d0 2026-09-02T00:08:50+01:00 202609012308-gridatlas-v9.73: the first computation here that solves rather than reports; ... (F12)
5. 60d193827d336a40c91ec64cce4bc56e50074bcb 2026-09-02T01:18:54+01:00 202609020018-gridatlas-v9.77: Codex stop-ship 202609020030, both findings accepted in full. ... (F5)
6. 4a17fa3a48b2617716070a8a1a7601c31d68c70b 2026-09-03T02:38:13+01:00 202609030137-gridatlas-v9.83: the runtime data is pinned to a commit and checked by its digest (F3)
7. 1762170b3274559a1c880150a1a93df5d346210d 2026-09-03T04:16:36+01:00 202609030316: the live composition can be moved back, and the tool refuses what it cannot verify (F4)
8. 8fe77a54d35fa9145230eabf6924cd365f1fb206 2026-09-05T16:35:53+01:00 202609051535-gridatlas: ROLL BACK live to 202609051510 (v9.130) (F9)
9. 78e49b0f35f3471feb05b28f496b31449fdd06f9 2026-09-05T17:20:52+01:00 202609051620-gridatlas: the parse gate leaves the laptop (F9)
10. efb844b9bba70edd42671aa56a9877709d7526c3 2026-09-29T08:34:05+01:00 Add PR file size guard and a cartridge audit instead of deleting old copies (F10)
11. 1eb641488224a3558a888815c6f5bbe12ddb9084 2026-10-23T01:15:26+01:00 Rollback live composition: restore atlas/current.json to verified 202609241334 baseline (F11)
12. 1adbd24a50019237ffa5944ee43358ddcc74f9b0 2026-10-29T02:55:21+00:00 tools/release: the delivery flow end to end (...) + release-status (#64) (F1)
13. 61fee61f5e5dd952893e85458d468951f537a049 2026-10-29T10:41:50+00:00 release-generation: refuse a one-step v1 -> v2 release unless --allow-loader-follows (R-cifix MAJOR) (F2)
14. 4fa72ae0927f335fd1265e93b28992315cdb55a3 2026-10-29T20:40:02+00:00 offtakers src: data-centre category + Grid Engine 30/30/30 (#73 steps 7-8); ... (F13)
15. cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 2026-10-29T23:41:04+00:00 202610292044-gridatlas-v9.187: release accepted data-centre Grid Engine preview (F15)
(F11's 08b5cae and F14's 57ed074 are supporting turning points inside these arcs.)

## Gridatlas and datacentre relevance (how this slice bears on the focus)
- The data-centre feature is the last 4 hours of the history. On 2026-10-29: engine 4fa72ae (20:40Z), preview 2f80729 (20:44Z), 22 #73 follow-ups,
  release cacb69a (23:41Z). Its mechanics are the September disciplines: pin by SHA-256 (F3 -> F14), proof per cartridge (F6),
  budget as an owner decision (80 kB), pointer-only release (F15), verified rollback (F4).
- The 227/225 count (F14) is enforced in browser tests: 79eb77f "Browser expect 225 mappable sites; preserve two unlocated planning records as unknown".
  Its digest 176c1b2e... is the number to cross-check against W-workers reading data-grid-gb `datacentres/` dc-a7.
- The 203-site set had "incorrect cross-operator merges" (57ed074). The fix is mirrored by aca16f6 ("distinct Slough operators are separate origins").

## Candidates (unkeyed; clearly marked)
- CANDIDATE: The PR #75 comment cited by cacb69a is an `ACCEPT 202610292044` line that passes trustedActor. Not verifiable from the clone (no GitHub API); UNVERIFIED.
- CANDIDATE: The single committer timestamp 2026-10-29T21:59:11Z on 24 commits reflects one rebase-and-push of PR #75 before merge. Inferred from timestamps only.
- CANDIDATE: The 23.7-day gap (2026-09-29 -> 10-23) is real inactivity rather than work on other branches. The clone shows only HEAD's ancestry.
- CANDIDATE: History before f3ba7a31 (v9.1..v9.50, from 2026-08-30 per "since 30 Aug" in 9ba8baa's subject) holds the shell's birth (release 202608300453-atlas-v9). Beyond the shallow boundary; not examined.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)
1. F1 gridatlas@1adbd24a50019237ffa5944ee43358ddcc74f9b0 tools/release/flow-lib.mjs:150-155. Agents cannot accept their own work; the gate reads signatures, not logins.
2. F2 gridatlas@61fee61f5e5dd952893e85458d468951f537a049 tools/release/release-generation.mjs:196-200. A refusal that names the safe path; obeyed by the next two commits.
3. F4 gridatlas@1762170b3274559a1c880150a1a93df5d346210d tools/rollback.mjs:28-39. "A rollback that cannot be trusted is worse than no rollback."
4. F3 gridatlas@4a17fa3a48b2617716070a8a1a7601c31d68c70b atlas/modules/202609030137-pinned-products.js:48-58. Commit + sha256 + bytes: length catches first, digest last.
5. F7 gridatlas@9118a2db177563a3175c51b9428719c940edc79b tools/ci/202609012200-local-ci.mjs:351-358. "Green exactly where nobody is watching."
6. F5 gridatlas@60d193827d336a40c91ec64cce4bc56e50074bcb atlas/modules/202609020015-injection-response.js:91-101. A stop-ship with numbers.
7. F13 gridatlas@4fa72ae0927f335fd1265e93b28992315cdb55a3 tools/offtakers/src/06b-dc-engine.js:1-9. The data-centre engine's birth certificate.
8. F15 gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/current.json:717-726. The live pointer to the data-centre module (digest verified 71,191 B).

## One next command (exactly one, runnable from a clone)
git -C /home/user/estate/gridatlas log -i --grep='Authori[sz]ed' --date=iso-strict --format='%H %ad %s' -- atlas/current.json
(lists every pointer move that records its authority: 4 today, from 3235a34 2026-09-08 to cacb69a; the trend of who may move the live map)
