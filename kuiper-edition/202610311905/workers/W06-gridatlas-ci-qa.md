# W06 gridatlas-ci-qa
HEADS: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (HEAD commit 2026-10-29T23:53:53+00:00, "202610292044-gridatlas-v9.187: release accepted data-centre Grid Engine preview"; shallow clone, 311 commits reachable)
READ:
.github/workflows/202608301321-scope-loop.yml (triggers only)
.github/workflows/202608301321-verify-live.yml (all 445 lines)
.github/workflows/202608310015-gridatlas-overnight-next-versions.yml (lines 1-60)
.github/workflows/202608310050-gridatlas-next-version-builders.yml (triggers only)
.github/workflows/202608312212-cartridge-proof.yml (all 225 lines)
.github/workflows/offshore-coordinate-reconcile.yml (lines 17-95, uses: lines)
.github/workflows/pr-file-size-guard.yml (all 185 lines)
.github/workflows/rollback-composition.yml (lines 38-130 partial)
.github/workflows/teleprint-parse-gate.yml (lines 34-105 partial)
tools/scope/lib.mjs (lines 30-70)
tools/scope/loop.mjs (lines 95-130)
tools/scope/verify-live-bytes.mjs (all 195 lines)
tools/ci/pr-gate.mjs (all 452 lines)
tools/ci/202609012200-local-ci.mjs (lines 1-60, 340-420)
tools/ci/offtakers/browser-dc-smoke.mjs (all 132 lines)
tools/ci/offtakers/overlay-offtakers.test.mjs (lines 1-60, 132-519 test headers, DC1-DC11)
tools/overnight/202609012200-shift.mjs (lines 1-160, 315-329)
tools/overnight/shift-log.json (parsed, 41 runs)
tools/overnight/steps/ (listing, 9 steps)
tools/proofs/all-layer-clicks.browser.mjs (all 92 lines)
tools/proofs/202609041250-menu-bar-instrument-panel.browser.mjs (lines 1-60, 220-300)
tools/proofs/menu-bar-attrib-clearance.browser.mjs (lines 170-180)
tools/proofs/grid-subs-chips-on-desktop.browser.mjs (lines 20-40)
tools/proofs/export-print-and-image-outcomes.browser.mjs (lines 404-420)
tools/offtakers/src/06-tap-card.js (lines 58-59), 06b-dc-engine.js (lines 150-167), 07-panel-install.js (line 9)
atman/202608292126-layer-performance-comparator.mjs (lines 200-232)
docs/CI-CD-PLAN.md (all 177 lines)
docs/CI.md (lines 140-213)
README.md (lines 1-40)
nightly/202608310015-gridatlas-overnight-next-versions/ (listing; runs/ has 4 entries)
git log of .github/workflows, tools/ci, tools/overnight

Counts (commands run from /home/user/estate/gridatlas between 2026-10-31T19:10Z and 2026-10-31T19:17Z):
- Active workflows: **9** — `ls .github/workflows | wc -l` = 9, 2,001 lines (`wc -l .github/workflows/*.yml`). Budget: `ACTIVE_WORKFLOWS` in tools/scope/lib.mjs lists exactly 9; loop.mjs asserts set equality and **21** archived one-offs (`ls .github/workflow-archive/202608301321-hostile-amnesia | wc -l` = 21).
- Action pinning: **38 of 44** `uses:` lines are pinned to a 40-hex SHA (`grep -h "uses:" .github/workflows/*.yml | grep -c -E "@[0-9a-f]{40}"` = 38; total 44). The 6 unpinned: 5 in offshore-coordinate-reconcile.yml (lines 46, 54, 60, 65, 114), 1 in pr-file-size-guard.yml:181.
- Node test cases in tools/ci: **241** — `grep -cE "^\s*test\(" tools/ci/offtakers/overlay-offtakers.test.mjs tools/ci/lightning/*.test.mjs` = 30 + 203 + 8. Release tooling: 16 more (`tools/release/flow.test.mjs` 7, `loader-swap.test.mjs` 9).
- Offtakers suite **executed here**, read-only, at 2026-10-31T19:12:25Z: `OFFTAKERS_MODULE=atlas/modules/202610292044-uk-offtakers-overlay.js LIGHTNING_MODULE=$PWD/atlas/modules/202610291043-uk-lightning-overlay.js node --test --test-reporter=tap tools/ci/offtakers/overlay-offtakers.test.mjs` → `# tests 30 # pass 30 # fail 0 # skipped 0`, 42.7 s, Node v22.23.4 (the gate's pinned version). `git status --porcelain` empty afterwards.
- tools/proofs: **92** files; **17** `*.browser.mjs` (real Chromium), **62** `*.proof.mjs` (`ls tools/proofs/*.browser.mjs | wc -l`, `ls tools/proofs/*.proof.mjs | wc -l`).
- Overnight shift log: **41** runs — 30 failed, 9 live, 1 dry, 1 committed-not-pushed (parsed tools/overnight/shift-log.json with python3 -I; Counter on .outcome).
- Commits touching .github/workflows, tools/ci, tools/overnight: **120** of 311 reachable (`git log --format=%H -- .github/workflows tools/ci tools/overnight | wc -l`). Authors over all 311: Ventusltd 268, Claude 41, Vikram Kumar 2 (`git log --format=%an | sort | uniq -c`).

## Findings (keyed)

### F1 Three outcome classes, never merged: product, harness, dependency
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e docs/CI-CD-PLAN.md:43-53
QUOTE:
```text
### Three outcome classes, never merged

```
FAIL                the application did something wrong
BLOCKED_HARNESS     this rig measured wrongly
BLOCKED_DEPENDENCY  a host or tile was unreachable or uncached
```

Only the first is a bug in the code. Every fault found on the first night was
one class wearing another's clothes at least once, so the separation is the
whole point rather than a nicety.
```
WHY: The single best line in this slice. A CI that cannot tell "the application did something wrong" from "this rig measured wrongly" from "a tile host was down" will be fought, not followed. The doc says plainly that every fault on the first night "was one class wearing another's clothes at least once". README.md:15-16 says it again for the front door: "Outcome classes are kept apart there — product, harness, dependency — because only the first is a bug in the code." It is the same rule as the Kuiper law "a check that examined nothing refuses", turned into a taxonomy.
PATTERN: outcome-class separation (FAIL / BLOCKED_HARNESS / BLOCKED_DEPENDENCY)

### F2 Live bytes: the public site must serve the committed blob, SHA-256 for SHA-256, every path
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/verify-live-bytes.mjs:39-48
QUOTE:
```js
/* Committed bytes, not the working tree: a CRLF checkout or a stray edit must
   not decide what "committed" means. Falls back to the file when ROOT is not a
   Git checkout (e.g. an exported tree). */
function committedBytes(relative) {
  try {
    return execFileSync('git', ['-C', ROOT, 'show', `HEAD:${relative}`], { maxBuffer: 1 << 30 });
  } catch {
    return fs.readFileSync(path.join(ROOT, relative));
  }
}
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/verify-live-bytes.mjs:152-160
QUOTE:
```js
      const live = await fetchLive(relative, attempt);
      const want = expected.get(relative);
      const got = live.bytes ? { bytes: live.bytes.length, sha256: sha256(live.bytes) } : null;
      const match = live.status === 200 && got?.sha256 === want.sha256;
      results.set(relative, { path: relative, why: targets.get(relative), http: live.status, expected: want, live: got, match, attempts: attempt, error: live.error });
      if (match) pending.delete(relative);
    }
    console.log(`attempt ${attempt}: ${targets.size - pending.size}/${targets.size} paths match`);
    if (!pending.size || Date.now() + INTERVAL_MS > deadline) break;
```
WHY: Proves deployment, not just existence. It hashes `git show HEAD:<path>` (blob bytes, so a CRLF working copy cannot decide what "committed" means), then fetches every path that current.json references plus every file under atlas/v/ with a cache-busting query, and a path counts only when HTTP is 200 AND the SHA-256 matches. Exit 0 only when every path matches; otherwise a per-path report. This is the served-bytes half of the immutable-shell-plus-hashed-cartridges design.
PATTERN: byte-for-byte served check (committed blob == served bytes)

### F3 live-bytes runs after every push, retries for CDN lag, and gives way when main moves
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/202608301321-verify-live.yml:359-373
QUOTE:
```bash
          set -euo pipefail
          # Pages publishes main within about two minutes and its CDN may serve
          # stale copies for up to ten more; the verifier retries with
          # cache-busting queries for LIVE_BYTES_TIMEOUT_S before failing.
          status=0
          node tools/scope/verify-live-bytes.mjs --root work/compare --report work/live-bytes.json || status=$?
          if [ "$status" -ne 0 ] && [ "$EVENT" = push ]; then
            head="$(git ls-remote origin refs/heads/main | cut -f1)"
            if [ -n "$head" ] && [ "$head" != "$TARGET_SHA" ]; then
              echo "::warning title=live-bytes superseded::main moved from $TARGET_SHA to $head during verification; the run for $head is authoritative."
              echo "superseded=true" >> "$GITHUB_OUTPUT"
              exit 0
            fi
          fi
          exit "$status"
```
WHY: A byte check that retries for 1,200 s (`LIVE_BYTES_TIMEOUT_S: '1200'`, line 316) handles Pages/CDN lag honestly, and a failure on a push whose main has since moved is downgraded to a warning: "the run for $head is authoritative". That stops a stale run from crying wolf without hiding a real mismatch. A failing check opens, and the next passing one closes, a "live-bytes" issue (lines 382-396, tools/ci/live-bytes-issue.mjs; added by 97929ba and ef4f4d4).
PATTERN: superseded-run handling; served-byte watchdog with issue lifecycle

### F4 The overnight worker fails closed, puts the tree back, and logs why
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/overnight/202609012200-shift.mjs:22-27
QUOTE:
```js
 *
 * Fail closed: any red anywhere and the working tree is put back to what it
 * was before the step was applied, the reason is written to the log, and
 * the process exits non-zero so the next wake reads why before anything
 * else is attempted. Nothing shipped is amended; a failed step is not cut
 * and its stamp is never used.
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/overnight/202609012200-shift.mjs:105-120
QUOTE:
```js
/* the undo: tracked files back to HEAD, and only the untracked files that
   appeared AFTER the step was applied are removed. Armed after apply. */
let untrackedBefore = null;
function undo() {
  if (untrackedBefore === null) return;
  run('git', ['checkout', '--', '.'], { allowFail: true, quiet: true });
  const before = new Set(untrackedBefore);
  for (const p of untracked()) if (!before.has(p)) fs.rmSync(path.join(ROOT, p), { force: true, recursive: true });
}
function fail(reason, extra = {}) {
  entry.outcome = 'failed'; entry.reason = reason; entry.finished_at = new Date().toISOString(); Object.assign(entry, extra);
  console.log(`\n\x1b[31mFAILED: ${reason}\x1b[0m`);
  undo();
  record(entry);
  process.exit(1);
}
```
WHY: The laptop night shift (1 Sep 2026) cut ten versions with GitHub as the deploy engine. Any red anywhere restores the working tree, removes only files that appeared after the step was applied (lesson of 22:03 UTC: the first undo ran `git clean` and deleted a step's own proof), records the reason in shift-log.json and exits non-zero. The log proves it was used in anger: 41 runs, 30 `failed`, 9 `live`. Reasons recorded verbatim include "recompose refused the cut", "gate red: sandbox proof" and "origin/main has diverged from this worktree; a human merges, not the night shift".
PATTERN: fail closed with an armed undo; append-only run log

### F5 "live" requires at least one CI run, and every one of them green
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/overnight/202609012200-shift.mjs:317
QUOTE:
```js
const ciGreen = Array.isArray(actions) && actions.length > 0 && actions.every(r => r.conclusion === 'success');
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/overnight/202609012200-shift.mjs:322-325
QUOTE:
```js
if (!live) { entry.outcome = 'pushed-not-seen-live'; entry.reason = 'Pages did not serve the generation within 12 minutes'; record(entry); process.exit(1); }
if (!live.cartridge_sha_matches) { entry.outcome = 'live-bytes-differ'; record(entry); process.exit(1); }
if (!ciGreen) { entry.outcome = 'live-but-ci-not-green'; entry.reason = 'GitHub workflow runs for the commit did not all conclude success within 10 minutes'; record(entry); process.exit(1); }
entry.outcome = 'live';
```
WHY: `actions.length > 0` is the Kuiper law "a check that examined nothing refuses" in one expression: an empty list of workflow runs is not "all green". The outcome ladder (pushed-not-seen-live, live-bytes-differ, live-but-ci-not-green, live) means a step is only marked done when Pages serves it, the cartridge SHA matches, and every runner for the commit succeeded.
PATTERN: vacuous-truth refusal; graded outcome ladder

### F6 The workflow budget: exactly nine files, enforced by set equality
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/lib.mjs:42-50
QUOTE:
```js
export const ACTIVE_WORKFLOWS = Object.freeze([
  '202608301321-scope-loop.yml',
  '202608301321-verify-live.yml',
  '202608310015-gridatlas-overnight-next-versions.yml',
  '202608310050-gridatlas-next-version-builders.yml',
  '202608312212-cartridge-proof.yml',
  /* Added by 98dd908 as the annual offshore coordinate reconciliation, and left
     unregistered exactly as the parse gate below was, so the budget invariant
     kept failing and STATE.md still could not be regenerated. Intended
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:103-113
QUOTE:
```js
function validateWorkflowBudget(master) {
  const workflowDirectory = path.join(ROOT, '.github', 'workflows');
  const activeFiles = existingFiles(workflowDirectory, /\.ya?ml$/);
  invariant(JSON.stringify(activeFiles) === JSON.stringify([...ACTIVE_WORKFLOWS].sort()), `active workflow budget mismatch: ${JSON.stringify(activeFiles)}`);

  const archiveDirectory = path.join(ROOT, '.github', 'workflow-archive', '202608301321-hostile-amnesia');
  const archived = existingFiles(archiveDirectory, /\.ya?ml$/);
  invariant(archived.length === 21, `expected 21 archived one-off workflows, found ${archived.length}`);

  const loopWorkflow = fs.readFileSync(path.join(workflowDirectory, ACTIVE_WORKFLOWS[0]), 'utf8');
  invariant(loopWorkflow.includes('11bd71901bbe5b1630ceea73d27597364c9af683'), 'checkout action must be pinned by full SHA');
```
WHY: A budget with teeth. The active `.github/workflows/*.yml` set must equal `ACTIVE_WORKFLOWS` exactly, the 21 retired one-off workflows must still be in the archive, and the scope-loop checkout must be pinned by full SHA. The comments around the list record two times a workflow was added without being registered (teleprint-parse-gate, offshore-coordinate-reconcile), so "the budget invariant has failed on every run since". The lightning candidate of 2026-10-26 deleted a tenth workflow to get back under it (docs/lightning/CANDIDATE-202610261949.md:20).
PATTERN: exact-set workflow budget (registry == directory)

### F7 The PR gate runs every check even after one fails, and refuses a new generation with no proof
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/pr-gate.mjs:9-10
QUOTE:
```js
 * Checks, in order; every check runs even after an earlier one fails, so one
 * run reports everything that is wrong:
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/pr-gate.mjs:181-186
QUOTE:
```js
    const proofs = proofFiles.filter(f => f.startsWith(`${gen}-`)).sort();
    if (!proofs.length) {
      const isNew = fs.existsSync(pinned) && !baseHas(`atlas/v/${gen}/current.json`);
      if (isNew || isLive) record(`proof ${gen}`, false, `no tools/proofs/${gen}-*.proof.mjs for a ${isLive ? 'live' : 'new pinned'} generation`);
      else console.log(`note  ${gen}: historical generation with no proof; nothing to run`);
      return;
```
WHY: One run reports everything that is wrong, not just the first thing. A NEW pinned generation, or the live one, with no `tools/proofs/<gen>-*.proof.mjs` is a FAIL; a historical one is reported as a note, because nothing can be run for it. The gate covers lint, STATE.md parity, composition SHA-256, run-current, verify-compose, loader byte identity, lightning/offtakers source rebuild byte for byte, and both overlay suites (header, lines 12-53). docs/CI.md:205-209 records that it was proven both ways: a one-byte flip in a cartridge ran red on "SHA-256 mismatch".
PATTERN: run-all-then-report gate; new-artefact-needs-proof

### F8 Wait for the fully composed map before asserting anything
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/offtakers/browser-dc-smoke.mjs:46-51
QUOTE:
```js
  await page.goto(route,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(g=>document.documentElement.dataset.gridatlasGeneration===g&&window.__GRIDATLAS_MODULES__?.ukOfftakers&&window.__GRIDATLAS_V9_MAP__,G,{timeout:90000});
  await page.waitForFunction(()=>window.__GRIDATLAS_MODULES__?.menuBar?.inspect?.().complete===true,null,{timeout:90000});
  const init=await page.evaluate(()=>({gen:document.documentElement.dataset.gridatlasGeneration,lightning:window.__GRIDATLAS_MODULES__.ukLightning?.generation,installed:window.__GRIDATLAS_MODULES__.menuBar.inspect()}));
  assert.equal(init.gen,G);assert.equal(init.lightning,'202610291043');
  assert.equal(init.installed.complete,true);
```
WHY: Line 48 was added alone by commit 9975a7a07e260c810c92372a05612fb2c8c578e2 ("Wait for fully composed map before browser assertions", 2026-10-29T21:46:05+00:00). The test waits on the application's own signals (the generation stamp on <html>, the overlay module, the map object, and `menuBar.inspect().complete===true`), not on a clock. It applies the CI-CD-PLAN rule (docs/CI-CD-PLAN.md:164-166): "Measure before asserting, and prefer the application's own signals to a clock. A fixed wait made three healthy lanes look dead simultaneously".
PATTERN: assert-after-composition (wait on app-declared readiness, not on a timer)

### F9 The hidden checkbox is driven in the harness, and the commit says so
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/offtakers/browser-dc-smoke.mjs:52-53
QUOTE:
```js
  await page.waitForSelector('[data-offtakers-control="toggle"]',{state:'attached',timeout:45000});
  await page.evaluate(()=>{const el=[...document.querySelectorAll('[data-offtakers-control="toggle"]')].find(x=>x.closest('#scada-ui-container'))||document.querySelector('[data-offtakers-control="toggle"]');el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
```
WHY: The overlay toggle is a hidden <input> that the SCADA panel's proxy controls drive. The harness waits for it as `state:'attached'` (not visible), sets `checked` and fires a bubbling `change`. Commit 45cf73ac90e1c1695d54d03444b5a84aef487530 is titled "Drive attached hidden checkbox in Chromium smoke harness (not visual UI)". That is an honest label: this step proves the overlay's data path, not that a person can tap the toggle. The visual tap path is proven elsewhere (F13 clicks the real proxy). atman/202608292126-layer-performance-comparator.mjs:211-217 uses the same pattern on purpose, to time the 400 kV warm toggle without UI latency.
PATTERN: hidden-control drive, labelled as harness rather than UI

### F10 225 of 227, asserted in a real browser at two viewports, then a real Slough tap
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/offtakers/browser-dc-smoke.mjs:66-70
QUOTE:
```js
  const n=await page.evaluate(()=>window.__GRIDATLAS_MODULES__.ukOfftakers.state.data.dots.filter(d=>d.k==='c').length);
  assert.equal(n,225,'227 source records, of which two planning sites have unknown coordinates and must not be mapped');
  await page.evaluate(()=>{const S=window.__GRIDATLAS_MODULES__.ukOfftakers.state,m=window.__GRIDATLAS_V9_MAP__;
    const d=S.data.dots.find(x=>x.k==='c'&&/Digital Realty LHR26/.test(x.n))||S.data.dots.find(x=>x.k==='c'&&/Slough/.test(x.n));
    if(!d)throw Error('No Slough data centre');window.__DC_SMOKE_SITE__=d;m.jumpTo({center:d.a,zoom:15});});
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/offtakers/browser-dc-smoke.mjs:123
QUOTE:
```js
  for(const vp of [[393,852],[1280,800]])await run(...vp);
```
WHY: The data-centre count is checked in the browser, not only in node: 225 drawn because "227 source records, of which two planning sites have unknown coordinates and must not be mapped". The assertion message encodes the refusal to invent a location. Then it taps Digital Realty LHR26 (or any Slough site) at its projected pixel, needs exactly 4 tabs, walks s/r/v/a, downloads the CSV, and taps Court Lane Industrial Estate and Cobalt Park Data Centres. It runs once at 393x852 (touch, isMobile) and once at 1280x800. It is wired into pr-file-size-guard.yml:157-178 as `dc-browser-smoke`, gated `if: github.event.pull_request.number == 75`, so it is a one-off on PR #75 by design (comment at lines 154-156: "Remove the job after its browser report has been reviewed; keep the reusable script").
PATTERN: real-browser data-count assertion; phone + desktop smoke

### F11 CSV formula injection: neutralised in the source, red-teamed in the suite
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06-tap-card.js:58-59
QUOTE:
```js
/// a cell: Cf stripped; a text starting = + - @ TAB or CR gets a leading apostrophe (no formula), numbers stay numbers; quoted on " , CR LF # (R-otsec ORS5)
cq=v=>{let s=v==null?'':String(v).replace(/\p{Cf}/gu,'');if(typeof v!='number'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return/[",\r\n#]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s},
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/offtakers/overlay-offtakers.test.mjs:461
QUOTE:
```js
  for (const c of rows) { assert.ok(c[15], 'licence ' + c); assert.ok(!/^[=+\-@]/.test(c[2]), 'no formula'); }
```
WHY: Every exported cell goes through `cq()`. It strips Unicode format characters (\p{Cf}, which includes bidi overrides), prefixes an apostrophe to any non-number text starting `= + - @ TAB CR`, and quotes on `" , CR LF #`. Test DC5 asserts that no name cell starts with `[=+\-@]`. The sheet is also capped at 400 rows and 256 kB (06b-dc-engine.js:167); the browser smoke asserts `rows.length<=256000+500` (browser-dc-smoke.mjs:96). Gap: the test checks only column 2 (name) and only four of the six trigger characters. TAB and CR are covered by the source but not asserted.
PATTERN: spreadsheet-safe export (formula prefix neutralisation + size cap)

### F12 44 px tap targets, measured on the <input> itself, all 63 of them
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/202609041250-menu-bar-instrument-panel.browser.mjs:287-291
QUOTE:
```js
    check(`every one of the ${sizes?.length ?? 0} Grid layer controls measures >=44px on its `
      + 'smaller axis (the <input> itself, not only its label)',
      Array.isArray(sizes) && sizes.length === 63
      && sizes.every((size) => size >= 44),
      sizes ? `min=${Math.min(...sizes)}` : 'no controls found');
```
WHY: Measured, not styled. The defect it closes (header, lines 18-24) was "63 real checkboxes at 17x17 px, 5 px tall, pinned off the bottom of the viewport". The proof requires exactly 63 controls, each >=44 CSS px on its smaller axis, measured on the input and not only its label. The offtakers overlay applies the same rule at build time: tools/offtakers/src/07-panel-install.js:9 adds `min-height:44px;min-width:44px` to every `.map-ctrl-btn`. 8 lines across 4 files in tools/offtakers/src carry `44px` (`grep -c "44px" tools/offtakers/src/*.js`), and tools/proofs/202609051522-sld-sandbox.proof.mjs has 4 `check()` titles naming 44 px (lines 2466, 2511, 2954, 3700).
PATTERN: measured tap-target floor (>=44 CSS px, smaller axis)

### F13 The viewport matrix: named widths, each with a reason
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/menu-bar-attrib-clearance.browser.mjs:170-179
QUOTE:
```js
// The five widths the architect named: two phone widths measured live
// (393, 456), the module's own 700px breakpoint boundary (768), and the
// two desktop widths where the defect actually reproduced (1280, 2327).
const WIDTHS = [
  { width: 393, height: 852, touch: true },
  { width: 456, height: 906, touch: true },
  { width: 768, height: 1024, touch: false },
  { width: 1280, height: 800, touch: false },
  { width: 2327, height: 1200, touch: false },
];
```
WHY: Every width is justified: two phone widths measured live (393, 456), the module's own 700 px breakpoint (768), and the two desktop widths where the defect actually reproduced (1280, 2327). Related matrices: menu-bar-instrument-panel.browser.mjs:220-221 `[393, 456, 1280, 1568]` and `[393, 1280]`; grid-subs-chips-on-desktop.browser.mjs:24-28 includes "393x852 phone (must not regress)"; cartridge-proof.yml:83-86 runs a CI matrix `width: [1440, 393]` with `fail-fast: false`. 393x852 is the estate's reference phone and appears in all of them.
PATTERN: justified viewport matrix (phone reference 393x852)

### F14 Every layer: wait for source loaded AND rendered features AND two frames, then tap
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/all-layer-clicks.browser.mjs:63-70
QUOTE:
```js
   if(source.eligible&&r.checked&&!r.disabled){
    await page.waitForFunction(id=>{const m=window.__GRIDATLAS_V9_MAP__,l=m.getLayer('l-'+id);return m.isSourceLoaded(l.source)&&m.queryRenderedFeatures({layers:['l-'+id]}).length>0;},id,{timeout:30000});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    r.rendered=await page.evaluate(id=>window.__GRIDATLAS_V9_MAP__.queryRenderedFeatures({layers:['l-'+id]}).length,id);
    await page.screenshot({path:path.join(out,`${id}-map.png`)});
    const hit=await page.evaluate(target=>{const m=window.__GRIDATLAS_V9_MAP__,p=m.project(target),b=m.getCanvas().getBoundingClientRect();return {x:b.left+p.x,y:b.top+p.y};},source.target);
    if(width<700)await page.touchscreen.tap(hit.x,hit.y);else await page.mouse.click(hit.x,hit.y);
    await page.waitForTimeout(250);
```
WHY: A layer passes only when its source has loaded, `queryRenderedFeatures` is non-empty, two animation frames have passed, and a real tap (touchscreen under 700 px) opens a popup. Line 79 then refuses a card whose close control is clipped by the viewport, and line 85 also needs the off-switch to set `visibility: none`. It runs in CI at 1440 and 393 (cartridge-proof.yml:96).
PATTERN: render-confirmed interaction proof

### F15 "A file a gate asserts must be a file that wakes the gate"
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/202608312212-cartridge-proof.yml:46-57
QUOTE:
```yaml
  # STATE.md IS ON THIS LIST BECAUSE A STEP BELOW ASSERTS IT.
  #
  # The v9.89 cut moved the composition without regenerating STATE.md, and
  # this gate caught it - correctly, at "STATE.md was regenerated before it was
  # committed". The regeneration that fixed it then touched STATE.md and
  # nothing else, so it matched no path here and the gate did not run at all.
  # The composition's last runner conclusion stayed the failure, and the commit
  # that actually fixed it was never checked by anything.
  #
  # A file a gate asserts must be a file that wakes the gate. Otherwise the
  # only commits it can judge are the ones that happen to touch something else,
  # which is the same shape as a check that skips when its input is missing.
```
WHY: A precise lesson from a turning point (commit fe4e272f28ecf05024096059697f09e0ea72aaae, 2026-09-03T14:21:11+01:00): the STATE.md-only fix commit matched no trigger path, so the gate never judged it and the last runner conclusion stayed a failure. Path filters are part of the gate's logic, not a performance detail.
PATTERN: trigger-coverage of asserted files

### F16 The guard rail pins its actions by commit, and the newest job breaks the rule
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/202608312212-cartridge-proof.yml:29-35
QUOTE:
```yaml
# THE ACTIONS ARE PINNED BY COMMIT, and this workflow is the reason to care.
# It is the gate every cartridge cut passes through, so whatever it trusts,
# the whole composition trusts. `@v4` is a mutable tag: whoever can move it
# can run code inside the one job that decides whether a generation ships,
# with the repository checked out. Three of them stood here - checkout twice,
# setup-node once - and nowhere else in this repository; the other four
# workflows were already pinned by SHA, so the only unpinned actions in
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/pr-file-size-guard.yml:179-185
QUOTE:
```yaml
      - name: Preserve screenshots for review
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dc-browser-smoke-${{ github.run_id }}
          path: ${{ runner.temp }}/gridatlas-dc-browser/
          if-no-files-found: ignore
```
WHY: The doctrine (commit a9f2f76f4595c44a37e9a46d3b66e3736334e924, "the gate pins the actions it runs, because everything else trusts it") is that `@v4` is a mutable tag. But the PR #75 Chromium smoke job uses `actions/upload-artifact@v4`, and offshore-coordinate-reconcile.yml has 5 more mutable tags (lines 46, 54, 60, 65, 114). Measured: 38 of 44 `uses:` lines are SHA-pinned. There is a second tension. pr-file-size-guard.yml:3-7 and docs/CI.md:185-187 say cartridge-proof.yml (home of the browser proofs and of this doctrine) is "currently **disabled** in the repository settings". So the only browser checks running on PRs are the one-off dc-browser-smoke, and the cartridge-gate is "no browser" by design (pr-file-size-guard.yml:118-120).
PATTERN: SHA-pinned actions (with a measured exception)

### F17 A skip is not a pass: a detector for proofs that guard on absence and report green
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/202609012200-local-ci.mjs:367-373
QUOTE:
```js
   Codex found the original on 202609012230: the topology proof skipped
   every real-payload assertion when its sibling data product was absent -
   the normal condition on an isolated checkout - and reported 46/46. Green
   exactly where nobody is watching. */
const CLAIMS_TO_CHECK = /\.(proof|verify|test|spec)\.(mjs|js|ts)$|(^|\/)(proofs?|verify|tests?)\//i;
const ANNOUNCES_SKIP = /\[skip\]|\bskipping\b|\bskipped\b|did not run|checks below did not/i;
const GUARDS_ON_ABSENCE = /if\s*\(\s*!\s*\w*(present|exists|found|available|ready|installed)\w*\s*\)/i;
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/202609012200-local-ci.mjs:385-391
QUOTE:
```js
    /* The catch RECORDS. An empty catch here swallowed a ReferenceError -
       readFileSync was not imported - for every file in both repositories,
       and the pass reported "0 proof/verifier files read" and a clean
       result. It was only visible because the count is printed; a pass that
       reported nothing would have looked like a pass. */
    try { text = readFileSync(full, 'utf8'); }
    catch (error) { unreadable.push(`${repo.name}:${path} (${error.message})`); continue; }
```
WHY: It catches the "green exactly where nobody is watching" class: a topology proof that skipped every real-payload assertion when its sibling data was absent and reported 46/46. It also caught a bug in itself. An empty catch swallowed a ReferenceError and the pass reported "0 proof/verifier files read" and a clean result, which was visible only because the count is printed. The cure test (lines 403-416) is exact: a guard is acceptable only if the guard variable itself is passed to `check()`.
PATTERN: skip-detection; printed denominators

### F18 Check before the write, or the regression gate can never fail
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/offshore-coordinate-reconcile.yml:75-87
QUOTE:
```yaml
      # Check BEFORE writing. --check recomputes from the live sources and
      # compares against the COMMITTED file; running it afterwards would only
      # ever compare the new file against itself and could never fail.
      #
      # Fewer recovered projects than the committed set is a regression,
      # whether from a renamed lease file, a changed column, or a matcher that
      # quietly got narrower. Fail loudly rather than commit it.
      - name: Fail if coverage regressed
        run: |
          python gridatlas/tools/offshore/reconcile_offshore_coordinates.py \
            --root "$GITHUB_WORKSPACE" \
            --out gridatlas/atlas/data/offshore-coordinates.json \
            --check
```
WHY: Order matters. Run after the write, `--check` would only compare the new file against itself. docs/CI-CD-PLAN.md:81-83 records that it was proven both ways: exit 1 against an inflated baseline, exit 0 against the real one.
PATTERN: pre-write regression gate; proven-both-ways

### F19 A gate never seen to fail is not known to work: negative controls and mutants
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/teleprint-parse-gate.yml:85-88
QUOTE:
```yaml
      # Nine checks, including a negative control that corrupts a copy of a
      # driver with the exact 2026-09-05 defect and requires the build to
      # refuse for that reason. A gate never seen to fail is not known to work,
      # so the control runs here too rather than only on a laptop.
```

KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e docs/CI.md:153-157
QUOTE:
```text
| suite | mutants caught |
| --- | --- |
| `overlay-latest.test.mjs` alone (the gate before this change) | 1 of 18 (only "ON at arrival") |
| `test-engine.mjs` as vendored, before CI1 and CI2 | 16 of 18 |
| `overlay-engine.test.mjs` with CI1 and CI2 | 17 of 18 |
```
WHY: The teleprint gate corrupts a copy of a driver with the exact 2026-09-05 defect and must refuse for that reason, on the runner and not only on a laptop. The lightning suite was mutation-tested: the previous gate caught 1 of 18 single-point bugs, the vendored suite 16, and the hardened suite 17. The one survivor is documented with the reason no test was added. Commit 39c62b458eec5e75dc7e351b5c46d3640cb3773f ("mutants caught: 1/18 → 17/18", 2026-10-28T23:09:53+00:00).
PATTERN: negative control in CI; mutation score as gate evidence

### F20 A dead schedule is worse than no schedule
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/202608310015-gridatlas-overnight-next-versions.yml:32-33
QUOTE:
```yaml
# A dead schedule is worse than no schedule, because it reads as automation
# that is running.
```
WHY: Two crons that each named one August day were removed, not rewritten (commit 5556000c46e188b88dd9551b233b1bb8333fc88e, 2026-09-03T04:24:04+01:00). The comment (lines 34-41) also records that the cvaa antibody scanned raw text for `cron:` and could not tell a record from a trigger, so the removed schedules are quoted in a non-YAML shape. That is the outcome-class lesson (F1) applied to a scanner: the harness, not the workflow, was wrong.
PATTERN: no time-bombed automation; record without the trigger shape

## Patterns (keyed; each cites at least one F above)

- **P1 Outcome-class separation.** A red is first assigned a class: product, harness or dependency. Only product reds are code bugs. Cited: F1 (docs/CI-CD-PLAN.md:43-53), applied to a scanner in F20, and to stale runs in F3 (a superseded run is a warning, not a product failure).
- **P2 Fail closed, and say why.** F4 (undo + log + exit 1), F5 (refuse an empty CI list), F7 (new generation without proof = FAIL), F18 (gate before write). Rollback has the same shape: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/rollback-composition.yml:74-82 refuses unless `confirm` is exactly `ROLL BACK` and `to_generation` is 12 digits.
- **P3 Committed blob equals served bytes.** F2 hashes `git show HEAD:`, never the working tree. The cartridge-proof comment at gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/202608312212-cartridge-proof.yml:159-164 records "Four verifiers in this estate hashed the working copy rather than the bytes served before that was fixed". docs/CI-CD-PLAN.md:103-106 tells the CRLF story that nearly shipped an unmatchable hash.
- **P4 Readiness by application signal, not by clock.** F8 (`menuBar.inspect().complete`), F14 (`isSourceLoaded` + `queryRenderedFeatures` + two rAF).
- **P5 Proven both ways.** F18 (inflated baseline exit 1, real exit 0), F19 (negative control; 17 of 18 mutants), F7 (one-byte flip ran red, docs/CI.md:205-209).
- **P6 Budgets as invariants.** F6 (9 workflows, 21 archived), F10/F11 (CSV 400 rows / 256 kB), pr-file-size-guard 5 MB per file (gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/pr-file-size-guard.yml:31).
- **P7 Measured accessibility.** F12 (>=44 px on the input, all 63), F13 (justified viewport matrix), F14 line 79 (close control must not be clipped).
- **P8 Label the harness honestly.** F9 (hidden checkbox, "not visual UI"); cartridge-proof.yml:108-110: "Android-sized touch Chromium is an emulation, not a physical-device claim ... a hosted CPU runner must never label its browser test a GPU run."

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

All SHAs resolve in gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (shallow, 311 commits reachable; `git rev-parse --is-shallow-repository` = true).

- **2026-09-01, the night shift.** 8f227193849958b5448ee5fae490c2ef44e8b126 (2026-09-01T23:09:03+01:00) "overnight - step sizing-arithmetic authored". shift-log.json then records 41 runs from 2026-09-01T22:09:02Z to 2026-09-02T00:18:23Z. 9 versions went live (202609012211 ... 202609020018), with 30 recorded failures in between. Step 202609012350-owner-boundary alone failed 14 times before going live at 2026-09-02T00:06:31Z.
- **2026-09-03 04:16-04:36 +01:00, the hardening storm** (Ventusltd, 6 commits in 20 minutes): 1762170b3274559a1c880150a1a93df5d346210d "the live composition can be moved back, and the tool refuses what it cannot verify"; 5556000c46e188b88dd9551b233b1bb8333fc88e "three schedules that fired for the last time in August are removed"; a9f2f76f4595c44a37e9a46d3b66e3736334e924 "the gate pins the actions it runs, because everything else trusts it". Same day, 14:21 +01:00: fe4e272f28ecf05024096059697f09e0ea72aaae "a file the gate asserts must be a file that wakes the gate".
- **2026-09-05 / 09-07, gates leave the laptop.** 78e49b0f35f3471feb05b28f496b31449fdd06f9 (teleprint parse gate) and 98dd908954c4c9bc21dac97346f7d71d9b201a27 (offshore annual workflow). Both were added without registering in ACTIVE_WORKFLOWS, and the budget invariant failed on every run until it was fixed (comments at tools/scope/lib.mjs:48-59).
- **2026-09-29.** efb844b9bba70edd42671aa56a9877709d7526c3 (author Vikram Kumar) "Add PR file size guard and a cartridge audit instead of deleting old copies".
- **2026-10-28, the PR-gate night** (Ventusltd): 2fb7106d8c89e74505e2413b903b61180f2f2c35 (17:33:31Z, Claude) retired a tenth workflow so the scope loop passes; 97929ba7674fc3b9496eb835e2e1329ad99e0049 (20:57:15Z) live bytes after every push (#51); 94c5c7c5e32dde954ae5e0cff7a77f35f79c4619 (21:02:41Z) the PR gate (#52); 39c62b458eec5e75dc7e351b5c46d3640cb3773f (23:09:53Z) lightning suite in the gate, mutants 1/18 → 17/18 (#56). Then ef4f4d4b53513f8e17db1006aed52d178a691dfe (2026-10-29T02:39:55Z) the live-bytes issue (#60).
- **2026-10-29 21:40-21:55Z, the data-centre browser storm** (Ventusltd, 7 commits to browser-dc-smoke / pr-file-size-guard in 13 minutes, each a fix forced by a real Chromium run): 95ae6d4d7c334e01f000fbd248bbfecd8457e132 add the smoke (21:42:32Z) → 2355c78477a0f26f3f44af2c360f6020bfc98d8d wire it to PR #75 (21:42:50Z) → 9975a7a07e260c810c92372a05612fb2c8c578e2 wait for the composed map (21:46:05Z) → 45cf73ac90e1c1695d54d03444b5a84aef487530 drive the hidden checkbox (21:48:12Z) → 79eb77fa1a00d4efff5857e9643c16f5445d6326 expect 225 mappable, two unlocated kept unknown (21:50:34Z) → 2285a9192466dcaf550e60d48afc111586e8b27c diagnose instead of silent timeout (21:52:58Z) → 6d5fd05204e34243e4ea344accf24ef8f96b6a15 tap three actual sites on mobile and desktop (21:55:40Z). HEAD (v9.187 release) followed at 2026-10-29T23:41:04Z.
- **Cadence and authorship:** 120 of 311 reachable commits touch .github/workflows, tools/ci or tools/overnight. Authors over all reachable commits: Ventusltd 268, Claude 41, Vikram Kumar 2. No reverts in the CI paths: `git log --format=%s -- .github/workflows tools/ci tools/overnight | grep -ci revert` = 0. Storms are fixed forward, never reverted.

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- The data-centre release v9.187 (generation 202610292044) is the generation the real-browser smoke pins: `DC_SMOKE_GENERATION: '202610292044'` (pr-file-size-guard.yml:177) and `assert.equal(init.lightning,'202610291043')` (browser-dc-smoke.mjs:50), which matches atlas/current.json's lightning module.
- The 227-site pipeline (225 mappable) from data-grid-gb is asserted twice. In the node suite, DC1 (overlay-offtakers.test.mjs:386-407) says "two unplaced planning records (SDC M40 and Ebbsfleet) remain in the source, never drawn". In the browser, F10 asserts 225.
- Slough is the reference cluster: DC1 requires ">=16 origins within 3 km" around `SL = [-0.62, 51.523]` (line 375) and forbids cross-operator merges for record pairs 133/237, 193/231, 56/196 and 56/57 (lines 396-402). DC2 checks the Grid Engine 30/30/30 against independent haversine and the original nearestSubstations.
- DC11 (lines 508-519) keeps IT load and grid connection apart: "never derived or added", and an unlabelled MW never sizes the dot. The browser smoke checks the CSV carries the "grid connection" distinction (browser-dc-smoke.mjs:95).
- Live: once the release lands on main, the live-bytes job (F2/F3) is what proves the public site serves the data-centre cartridge bytes.

## Candidates (unkeyed; clearly marked)

- CANDIDATE: The dc-browser-smoke job is bound to PR #75 only. After PR #75 merges or closes, no workflow in the active nine runs a real browser on the data-centre overlay, unless cartridge-proof.yml is re-enabled in repository settings. Repository settings are not visible from a clone: UNVERIFIED beyond the two in-repo statements (pr-file-size-guard.yml:3-7, docs/CI.md:185-187).
- CANDIDATE: The overnight worker described in docs/CI-CD-PLAN.md (`D:\gridatlas-ci\worker.mjs`, five lanes, baseline.json fingerprints) lives on an external drive and is not in this repository. Its fingerprint/diff code is UNVERIFIED (`ls` and grep found no worker.mjs or baseline.json in the clone).
- CANDIDATE: The workflow-archive's 21 files first appear at f3ba7a31b5bbac2a0af7171ddb2402cf6f3b624c, which may be the shallow-clone boundary rather than the true archive commit; UNVERIFIED at depth 300.
- CANDIDATE: The offtakers suite's DC5 checks formula prefixes on column 2 only. A malicious operator or substation name in another text column is covered by cq() in source but not asserted.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. **docs/CI-CD-PLAN.md:43-53** (F1): the outcome-class triad. It is the estate's clearest statement of why a red is not automatically a bug. It belongs beside the Kuiper law "a check that examined nothing refuses".
2. **tools/overnight/202609012200-shift.mjs:317** (F5): `actions.length > 0 && actions.every(...)`, vacuous truth refused in one line.
3. **tools/scope/verify-live-bytes.mjs:152-160** (F2): `live.status === 200 && got?.sha256 === want.sha256`, the served-equals-committed law.
4. **tools/ci/offtakers/browser-dc-smoke.mjs:67** (F10): `assert.equal(n,225,'227 source records, of which two planning sites have unknown coordinates and must not be mapped')`, the data-centre focus and the refusal to invent a coordinate in one assertion.
5. **tools/ci/offtakers/browser-dc-smoke.mjs:48** (F8): wait for `inspect().complete===true`, a whole commit for one line, and the right one.
6. **.github/workflows/202608312212-cartridge-proof.yml:55-57** (F15): "A file a gate asserts must be a file that wakes the gate."
7. **tools/offtakers/src/06-tap-card.js:59** (F11): `cq()`, a CSV export that cannot become a spreadsheet formula.
8. **tools/proofs/202609041250-menu-bar-instrument-panel.browser.mjs:287-291** (F12): 63 inputs, each >=44 px, "the <input> itself, not only its label".

## One next command (exactly one, runnable from a clone)

```bash
cd /home/user/estate/gridatlas && node tools/scope/verify-live-bytes.mjs --timeout-s 120 --interval-s 20 --report /tmp/w06-live-bytes.json
```

Why this one: it is read-only (it writes only the report under /tmp) and needs no browser or secrets. It checks whether https://ventusltd.github.io/gridatlas/ serves HEAD cacb69a7 (v9.187, the data-centre release) byte for byte, which this worker could not observe from the clone. Already run here and passed at 2026-10-31T19:16Z: `node tools/scope/loop.mjs state --stdout | diff -q - STATE.md` → `STATE-PARITY-OK` (stderr `scope-ledger=PASS active=none master=done`); `git status --porcelain` empty.
