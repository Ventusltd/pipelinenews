# W02 gridatlas-release
HEADS: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (shallow clone: `git rev-parse --is-shallow-repository` = true; `git rev-list --count HEAD` = 311; oldest visible commit f3ba7a3 2026-09-01T14:43:56+01:00, newest cacb69a 2026-10-29T23:41:04+00:00)
READ:
docs/RELEASE.md
tools/release/release-generation.mjs
tools/release/rollback-generation.mjs
tools/release/lib.mjs
tools/release/flow-lib.mjs
tools/release/acceptance.mjs
tools/release/release-accepted.mjs
tools/release/publish-preview.mjs
tools/release/check-live.mjs
tools/release/check-served.mjs
tools/release/homepage-bump.mjs (header + guards)
tools/release/release-status.mjs (header)
tools/scope/loop.mjs
tools/scope/lib.mjs (lines 1-100)
tools/ci/pr-gate.mjs (header, lines 120-245)
atlas/current.json (head)
STATE.md
AGENTS.md
CLAUDE.md
governance/*.md (grep for immutable/owner/refuse/never; read stamps-ran-ahead-of-the-clock and quantumspawn-recovery headers)
contracts/*.json (atlas-v9-deep-link-contract.v1.json, 202608291430-atlas-v9-live-release.json head)
git log (all 311 visible commits; release commits cacb69a, f0f449b, 08b5cae, 1eb6414, c09d199, 61fee61, 4b1641e)

Written 2026-10-31T19:13:40Z by W02. Read only: no checkout, fetch or edit in the clone. Two read-only executions
were made from /tmp, outside the clone (see F2 and F4): a pure-function import of flow-lib.mjs, and a re-derivation of
three release pointers from `git show` blobs.

## Findings (keyed)

### F1 Agents cannot record acceptance: env-var agent detection, and --record refuses under it
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/flow-lib.mjs:48-52
QUOTE:
```js
/** True when an agent (Claude Code, CI) is running this process. */
export function runningAsAgent() {
  return Boolean(process.env.CLAUDECODE || process.env.CLAUDE_CODE_SESSION_ID || process.env.CODEX_SANDBOX
    || process.env.GITHUB_ACTIONS || process.env.CI);
}
```
WHY: The single line that keeps an AI agent (running with the owner's own GitHub token) from manufacturing the owner's consent. It checks Claude Code (CLAUDECODE, CLAUDE_CODE_SESSION_ID), Codex (CODEX_SANDBOX) and CI (GITHUB_ACTIONS, CI). Verified live from this worker's session: `runningAsAgent()` returned `true` (CLAUDECODE and CLAUDE_CODE_SESSION_ID are set here), so this very swarm could not record an acceptance. The refusal site is F1b.
PATTERN: agent-cannot-consent (the actor that benefits from a release may not authorise it)

### F1b The refusal site: acceptance.mjs --record
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/acceptance.mjs:58-61
QUOTE:
```js
if (args.record) {
  if (runningAsAgent()) die('refused: an agent or CI is running this. Only the owner records acceptance; run with --how and pass the command to the owner.');
  if (!args['i-am-the-owner']) die('--record needs --i-am-the-owner');
  if (!args.pr) die('--record needs --pr N');
```
WHY: Three independent stops before anything is posted: agent/CI detection, an explicit --i-am-the-owner, and a named PR. The refusal message routes the agent to the only thing it may do: print the owner's one-line command (--how). The header (lines 24-27) states why: GitHub cannot tell an agent's comment from the owner's by login alone, so the rule is procedural as well.
PATTERN: refuse-and-route (a refusal that names the legitimate path)

### F2 What counts as acceptance: owner login, not via a GitHub App, no agent signature
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/flow-lib.mjs:150-156
QUOTE:
```js
export function trustedActor(user, app, body = '') {
  if (!user || !OWNER_LOGINS.includes(user.login)) return { ok: false, why: `by ${user?.login ?? 'unknown'}, not an owner login (${OWNER_LOGINS.join(', ')})` };
  if (app) return { ok: false, why: `posted through the GitHub App ${app.slug || app.name}` };
  const sig = AGENT_SIGNATURES.find(re => re.test(body));
  if (sig) return { ok: false, why: `carries an agent signature (${sig})` };
  return { ok: true };
}
```
WHY: The reading side of F1. Even a comment by the owner login is discarded if it was posted through a GitHub App (Codex connector) or carries Claude's own attribution (Claude-Session:, 'Generated with [Claude Code]', noreply@anthropic.com) or chatgpt-codex. parseVerdict only reads the FIRST non-blank line, so a quoted 'ACCEPT' deeper in a comment cannot count. Verified by a pure-function run (no network) of decideAcceptance with four synthetic comments: the Claude-signed one was ignored ('carries an agent signature'), the app-posted one ignored ('posted through the GitHub App chatgpt-codex-connector'), a non-owner REJECT ignored, and only the clean owner ACCEPT decided the state ('accepted').
PATTERN: signature-blocklist on consent; latest-qualifying-verdict-wins

### F2b The blocklist and the first-line-only verdict parser
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/flow-lib.mjs:140-148
QUOTE:
```js
export const AGENT_SIGNATURES = [/Claude-Session:/i, /Generated (?:with|by) \[Claude Code\]/i, /noreply@anthropic\.com/i, /chatgpt-codex/i];
export const acceptLabel = (G) => `accepted:${G}`;

export function parseVerdict(body, G) {
  const first = String(body || '').split(/\r?\n/).map(s => s.trim()).find(Boolean) || '';
  const m = first.match(/^\/?(ACCEPT|ACCEPTED|REJECT|REJECTED)\s+(\d{12})\b/i);
  if (!m || m[2] !== G) return null;
  return /^REJECT/i.test(m[1]) ? 'reject' : 'accept';
}
```
WHY: Claude's and Codex's own attribution strings are turned into a blocklist on consent: a comment carrying them is never an acceptance. parseVerdict reads only the first non-blank line and requires the 12-digit generation to match exactly, so 'ACCEPT' quoted lower in a discussion, or an ACCEPT for a different generation, decides nothing.
PATTERN: signature-blocklist; exact-generation verdict

### F3 The owner's authorisation is a required argument, and it is written into the commit
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/release-generation.mjs:148-148
QUOTE:
```js
  if (!args.check && !args['no-commit'] && !args['authorised-by']) die('--authorised-by is required to commit a release');
```
WHY: No release commit can exist without a human-readable authorisation string. It is not inferred: the commit body records it verbatim (F3b). In the release-accepted path the string is built from the GitHub acceptance record itself (F3c). docs/RELEASE.md:11-13 states the law: 'never decide that something should ship: the owner's authorisation is a required argument and is written into the commit.'
PATTERN: authorisation-as-argument (consent travels inside the artefact it authorises)

### F3b ...where it lands in the commit body
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/release-generation.mjs:342-344
QUOTE:
```js
  const subject = `${G}-gridatlas-${manifest.composition_version}: ${args.title || `release composition ${G} to the live route`}`;
  const body = `Moves atlas/current.json and STATE.md${loaderMoves ? ` and the loader (${LOADER_FILE} := ${previewLoaderRel}, ${report.loader.live} -> ${previewRegistered.name})` : ''} from ${live.generation} to ${G}, written from ${manifestRel} by tools/release/release-generation.mjs. Nothing else changes.\nRollback: git revert this commit (tools/release/rollback-generation.mjs).\n\nAuthorised by: ${args['authorised-by']}`;
  const sha = commitWithMessage(`${subject}\n\n${body}${trailers}\n`);
```
WHY: Every release commit carries 'Authorised by: <text>' plus its own rollback instruction. On main this is visible: 08b5cae (2026-10-28T17:34:02+00:00) 'Authorised by: owner (Vikram), 28 Oct 2026 17:3x UTC, release conditional on ChatGPT's V1-V15 veto passing on L3'; f0f449b (2026-10-29T11:21:45+00:00) 'Authorised by: Owner (Vikram), chat instruction 29 Oct 2026 09:13 UTC'; cacb69a (2026-10-29T23:41:04+00:00, the live 202610292044 data-centre release) 'Authorised-by: owner (Ventusltd), https://github.com/Ventusltd/gridatlas/pull/75#issuecomment-6511041884, 2026-10-29T23:34:44Z'. The progression from chat instruction to a GitHub comment URL is the acceptance law (F1/F2) arriving in practice.
PATTERN: authorisation-as-argument

### F3c release-accepted.mjs: no acceptance, no release; the acceptance URL becomes --authorised-by
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/release-accepted.mjs:70-74
QUOTE:
```js
  const a = readAcceptance(G, { since: cutAtUtc(G) || undefined, pulls });
  for (const i of a.ignored) console.log(`  ignored: ${i.url}  ${i.why}`);
  if (a.state !== 'accepted') die(`${G} is not accepted (${a.state}). The owner records it: node tools/release/acceptance.mjs --generation ${G} --how --pr ${preview.number}`);
  authorisedBy = `owner (${a.by}), ${a.url}, ${a.at}`;
  ok(`accepted: ${authorisedBy}`);
```
WHY: Step 4 of the eight-step flow refuses unless step 3 (owner acceptance read from GitHub, after the generation's cut_at_utc) is 'accepted', then passes 'owner (<login>), <url>, <time>' into release-generation.mjs. That is exactly the shape of the live cacb69a commit's trailer.
PATTERN: evidence-chained authorisation

### F4 The tested preview is the release: byte equality between the preview route and the pointer about to go live
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/release-generation.mjs:152-157
QUOTE:
```js
const derived = deriveCurrent(manifestText);
const previewPointer = gitBlob('HEAD', previewPointerRel).toString('utf8');
if (rerootForPreview(derived) !== previewPointer) die(`${previewPointerRel} is not the derived pointer re-rooted to ../../; the preview that was tested is not what would go live`);
ok(`${previewPointerRel} == derived pointer re-rooted (the tested preview is the release)`);
if (noop && derived !== liveText.toString('utf8')) die('live is G but the pointer derived from its manifest is not byte-identical to atlas/current.json');
if (noop) ok('derived pointer is byte-identical to the live atlas/current.json');
```
WHY: Stops a release if anyone edited the preview pointer and not the manifest (or vice versa): what people tested at atlas/v/G/ must be, byte for byte after re-rooting, what goes live. Independently re-verified by W02 from git blobs (read-only, node from /tmp): for release commits cacb69a (202610292044), f0f449b (202610291044) and 08b5cae (202610281340), deriveCurrent(manifest) == atlas/current.json is true and reroot(derived) == atlas/v/G/current.json is true, all three.
PATTERN: tested-equals-shipped

### F5 The derivation: six cut-only keys dropped, two files only
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/lib.mjs:25-30
QUOTE:
```js
export const MANIFEST_ONLY_KEYS = Object.freeze([
  'parent_generation', 'version', 'cut_at_utc', 'note', 'acceptance', 'candidate_status'
]);

/* The only two files a release (or its revert) may change... */
export const POINTER_FILES = Object.freeze(['atlas/current.json', 'STATE.md']);
```
WHY: The whole release is a pure function of a committed manifest (deriveCurrent, lib.mjs:107-112: delete these six keys, JSON.stringify(m, null, 1) + newline). POINTER_FILES is the reason a release is revertable byte for byte: a release may touch exactly atlas/current.json and STATE.md (plus atlas/index.html only when the loader moves). Every one of the three scripted-era release commits on main touches exactly 2 files (git show --stat cacb69a / f0f449b / 08b5cae).
PATTERN: pure-derivation release; minimal-diff release commit

### F6 Refuse a one-step loader v1 -> v2 release (the HTML cache window)
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/release-generation.mjs:189-200
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
WHY: Encodes a measured fact of the hosting platform (GitHub Pages HTML max-age about 10 minutes, current.json fetched no-store) as a refusal: if the loader and a modular pointer moved together, a browser with a cached v1 loader would read the v2 pointer and fail closed. The default is refusal; --allow-loader-follows is the explicit owner override. Introduced by 61fee61 (2026-10-29T10:41:50+00:00) 'release-generation: refuse a one-step v1 -> v2 release unless --allow-loader-follows (R-cifix MAJOR)'. docs/RELEASE.md:130-135 and 236-255 document the two-step path (loader first, wait for check-served plus 10 minutes, then the pointer).
PATTERN: order-the-deploys-around-the-cache (loader first, then pointer)

### F7 Route C rollback: revert the release commit and prove byte-exact restoration
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/rollback-generation.mjs:91-101
QUOTE:
```js
if (JSON.stringify(touched) !== JSON.stringify([...RELEASE_FILES].sort())) die(`${R} changed ${touched.join(', ')}; a release commit changes exactly ${POINTER_FILES.join(' and ')} (and ${LOADER_FILE} when the loader moved)`);
ok(`${R.slice(0, 7)} is a single-parent release commit touching ${touched.join(', ')}`);

const releasedPointer = gitBlob(R, 'atlas/current.json');
const restoredPointer = gitBlob(`${R}^`, 'atlas/current.json');
const restoredState = gitBlob(`${R}^`, 'STATE.md');
const G = JSON.parse(releasedPointer.toString('utf8')).generation;
const P = JSON.parse(restoredPointer.toString('utf8')).generation;
const livePointer = gitBlob('HEAD', 'atlas/current.json');
if (Buffer.compare(livePointer, releasedPointer) !== 0) die(`atlas/current.json has moved since ${R.slice(0, 7)} (live is ${JSON.parse(livePointer).generation}); reverting would not restore a known state`);
if (loaderMoved && Buffer.compare(gitBlob('HEAD', LOADER_FILE), gitBlob(R, LOADER_FILE)) !== 0) die(`${LOADER_FILE} has moved since ${R.slice(0, 7)}; reverting would not restore a known state`);
```
WHY: Rollback is not a new edit: it is git revert of a commit that changed only the pointer files, refused if the pointer has moved since (reverting an older release 'would not restore a known state'). After the revert, lines 121 and 128 require atlas/current.json (and STATE.md, when untouched since) to be byte-exact to the release commit's parent. --reason is mandatory (line 65: 'an unexplained pointer move is not a rollback').
PATTERN: revert-as-rollback with byte-exact proof

### F8 A handover check that could not fail, made able to fail
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:238-249
QUOTE:
```js
   AGENTS.md asks, before every handover: "Prove `node tools/scope/loop.mjs
   state --stdout` exactly matches STATE.md". That proof could not fail.
   Only `process.argv[2]` was ever read, so `--stdout` was silently ignored,
   the command took its normal path, and its normal path WRITES STATE.md -
   the very file the operator is about to compare it against.

   Demonstrated rather than argued: replace STATE.md with the single line
   "DELIBERATELY WRONG", run `state --stdout`, and the file comes back
   correct. A drifted STATE.md was repaired by the check that existed to
   detect it, and the operator saw a match every time.

   So the flag is read now, and with it nothing is written: the rendered
```
WHY: The best governance comment in the slice. AGENTS.md requires 'state --stdout exactly matches STATE.md', but --stdout was ignored and the command WROTE STATE.md, so the check repaired the drift it existed to detect and always passed. Demonstrated, not argued ('DELIBERATELY WRONG'). Fixed in 4b1641e (2026-09-03T02:40:54+01:00) '`loop.mjs state --stdout` renders without writing, so the handover check can fail'.
PATTERN: a-check-must-be-able-to-fail

### F9 STATE.md is tied to the pointer: the contract line
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e AGENTS.md:16-16
QUOTE:
```md
- Any change to `atlas/current.json` must regenerate `STATE.md` with `node tools/scope/loop.mjs state` in the same commit.
```
WHY: The invariant that makes the pointer and the durable state file move together. It is enforced in three places: release-generation.mjs:301-303 writes the pointer and immediately runs 'loop.mjs state'; release-generation.mjs:316-319 requires the change set to be exactly those files; runGates (lib.mjs:167-169) and the PR gate (F9b) compare 'state --stdout' to STATE.md byte for byte.
PATTERN: derived-state-file regenerated in the same commit

### F9b ...enforced on every PR
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/pr-gate.mjs:146-153
QUOTE:
```js
group('state-parity', () => {
  const r = run(['node', 'tools/scope/loop.mjs', 'state', '--stdout']);
  const committed = fs.readFileSync(path.join(ROOT, 'STATE.md'), 'utf8');
  const ok = r.code === 0 && r.stdout === committed;
  record('state-parity', ok, ok ? '' : r.code !== 0
    ? `state --stdout exit ${r.code}: ${tail(r.stderr, 3)}`
    : 'STATE.md differs from `node tools/scope/loop.mjs state --stdout`; regenerate it in the same commit');
});
```
WHY: CI-side enforcement of F9: a PR whose STATE.md differs from the generator fails with the instruction 'regenerate it in the same commit'. History shows why: the hand rollback of 2026-10-23 split the pair across two commits, 1eb6414 (atlas/current.json only, 2026-10-23T01:15:26+01:00) and c09d199 (STATE.md only, 2026-10-23T01:15:32+01:00); at 1eb6414 the pointer read 202609241334 while STATE.md still said 202610221600.
PATTERN: state-parity gate

### F10 Rebase, never squash: the reason is written down
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e docs/RELEASE.md:211-213
QUOTE:
```md
Merge with **Rebase and merge**, never squash. Squashing would fold any
preparatory commit into the release commit, and the revert would then undo the
gate raise too. After Pages deploys, `check-live.mjs --generation <G> --wait`
```
WHY: A merge-method rule with its causal reason: squashing folds preparatory commits (e.g. a gate raise) into the release commit, and a revert would then also undo the gate raise. Repeated at the point of use in release-generation.mjs:361 ('Rebase and merge, never squash: the release commit must stay separately revertable'), release-accepted.mjs:22-24 (the exact gh api merge command with merge_method=rebase) and the default PR body (release-accepted.mjs:103). The scripts cannot enforce the merge method (only the owner merges, docs/RELEASE.md:54-55); enforcement is by instruction plus F7, which refuses to revert any commit that is not a single-parent commit touching exactly the pointer files.
PATTERN: keep-the-release-commit-atomic

### F11 atlas/releases is immutable: baseline set plus checksum verification
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:133-137
QUOTE:
```js
  invariant(rootReleases.length === 0, `top-level release directories remain: ${rootReleases.join(', ')}`);
  const releaseRoot = path.join(ROOT, 'atlas', 'releases');
  const movedReleases = existingDirectories(releaseRoot).filter(name => RELEASE_PATTERN.test(name));
  invariant(JSON.stringify(movedReleases) === JSON.stringify([...EXPECTED_RELEASES].sort()), `atlas/releases immutable baseline mismatch: ${JSON.stringify(movedReleases)}`);
  invariant(fs.existsSync(path.join(releaseRoot, 'cartridges', SHARED_400KV_CARTRIDGE, 'grid_400kv.geojson')), 'shared 400 kV cartridge was not moved with the release baseline');
```
WHY: AGENTS.md:12 says '`atlas/releases/` is immutable.' Here it becomes an invariant: the set of release directories must equal EXPECTED_RELEASES (8 names, tools/scope/lib.mjs:10-19), and verifyReleaseChecksums (loop.mjs:30-44) re-hashes every file in the current release's sha256sums.txt against its published LF bytes (22 lines in atlas/releases/202608300453-atlas-v9/sha256sums.txt). Further guards: publish-preview.mjs:64-66 (a preview may never change atlas/releases/), release-generation.mjs:255-256 (a prep commit must leave releases alone). Count: `git log --format=%h -- atlas/releases | wc -l` = 1, and that one is f3ba7a3, the shallow-clone boundary; no visible commit after it touches atlas/releases.
PATTERN: immutable-baseline-by-name-and-hash

### F12 A crashing proof cannot read as 'no new failures'
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/lib.mjs:135-144
QUOTE:
```js
/** FAIL rows of the data-contract parity proof, parsed from its FAILURES
    block. A non-zero exit with no FAILURES block is itself a FAIL row, so a
    proof that crashes cannot read as "no new failures". */
export function parityFailRows() {
  const r = run('node', [PARITY_PROOF], { allowFail: true });
  const lines = r.out.split('\n');
  const start = lines.findIndex(l => l.trim() === 'FAILURES');
  let rows = start === -1 ? [] : lines.slice(start + 1).map(l => l.trim()).filter(Boolean);
  if (r.status !== 0 && rows.length === 0) rows = [`parity proof exited ${r.status} without a FAILURES block`];
  return { status: r.status, rows, out: r.out };
```
WHY: The data-contract parity gate is 'no FAIL row the base did not have'. A naive implementation would treat a crash (no FAILURES block) as zero rows and pass. This one turns a non-zero exit with no rows into a FAIL row. Known pre-existing rows are 'reported, never hidden' (lib.mjs:57-59).
PATTERN: absent-output-is-failure (a check that examined nothing refuses)

### F13 An unrecognised flag is a typo, not a no-op
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:285-295
QUOTE:
```js
const command = process.argv[2] || 'lint';
const flags = new Set(process.argv.slice(3));
/* An unrecognised flag is a typo, not a no-op. `--stdout` was ignored for
   as long as it has been in AGENTS.md; a silently discarded flag is how a
   governance check becomes a formality. */
for (const flag of flags) {
  if (flag !== '--stdout') {
    console.error(`[scope-loop:${command}] unknown flag ${flag}`);
    process.exit(1);
  }
}
```
WHY: Direct sequel to F8: the silently discarded flag was how 'a governance check becomes a formality'. Any flag other than --stdout now exits 1.
PATTERN: strict-argv

### F14 A budget that only reports the same breach measures nothing
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:184-195
QUOTE:
```js
         week - has been over it. So the invariant has not been holding a line;
         it has been failing on every run, which silently made `state`
         unrunnable and the AGENTS.md rule tying STATE.md to a current.json
         change impossible to satisfy. A budget that only ever reports the same
         known breach measures nothing.

         The ceiling is therefore recorded at what is actually shipping, and
         400 kB stays the target rather than the gate. The real fix is to split
         substation-intelligence into parts and assemble it the way the
         gazetteer already does (`assembled_from`); until that is done this
         number must not be raised again to admit further growth. */
      invariant(fs.statSync(cartridgePath).size <= 500_000, `${id}: cartridge exceeds the 500 kB recorded ceiling (400 kB target; raised from 460 kB by the owner on 27 Oct 2026 and to 500 kB on 28 Oct 2026 for the lightning overlay)`);
```
WHY: An honest record of a gate that had been failing every run since 202609051503 (making STATE.md unregenerable and AGENTS.md:16 unsatisfiable). The ceiling is set at what ships (500 kB), 400 kB stays the target, and the raise history is in the message itself. Raises are owner decisions recorded as their own commits: 2f7d752 (2026-10-27T02:39:16+00:00, 460 -> 480 kB) and edb17db (2026-10-28T21:06:04+00:00, 480 -> 500 kB, quoting the owner). release-generation.mjs:277-295 can only RAISE it, via --prep-gate-kb with a mandatory --prep-gate-reason, as a separate preparatory commit.
PATTERN: recorded-ceiling vs target; owner-decision-as-commit

### F15 The workflow budget: a decision written down, not a number nudged
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/lib.mjs:20-23
QUOTE:
```js
// The budget exists because this repository once accumulated one-off
// workflows faster than it retired them -- 21 sit in the archive. It is a cap
// on sprawl, not a ban on automation, so adding to it is a decision that gets
// written down rather than a number that gets nudged.
```
WHY: Why there is no release workflow (docs/RELEASE.md:314-337): loop.mjs:106 makes the active .github/workflows set equal ACTIVE_WORKFLOWS exactly, and STATE.md prints the count (9; `ls .github/workflows | wc -l` = 9). A tenth workflow means editing the list and regenerating STATE.md in one commit, which CI lanes are not authorised to do. So releases stay script-only, run by a person.
PATTERN: capped-automation budget

### F16 Existing generations keep the loader bytes they were cut with
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/pr-gate.mjs:224-227
QUOTE:
```js
  // Existing generations keep the loader bytes they were cut with.
  for (const file of changed) {
    if (/^atlas\/v\/\d{12}\/index\.html$/.test(file) && baseHas(file)) bad.push(`${file} existed at the base and was changed or removed`);
  }
```
WHY: Per-generation immutability for the newer atlas/v/<G>/ routes (51 directories in atlas/v): a PR may add a pinned route but may not change or remove the loader of one that exists at the base. Together with F11 this makes every published route, old and new, append-only.
PATTERN: append-only routes

### F17 Loader rollback refused while a generation needing the newer loader is live
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/rollback-generation.mjs:153-164
QUOTE:
```js
   reverted only while the live pointer composes under the loader being restored, byte for byte as under
   the current one; while a generation that needs the newer loader (an after-cartridge slot under v2) is
   live, it is refused: roll the pointer back first, then the loader. */
async function rollbackLoaderOnly(R) {
  ok(`${R.slice(0, 7)} is a single-parent loader-only commit (${LOADER_FILE})`);
  const released = gitBlob(R, LOADER_FILE);
  const restored = gitBlob(`${R}^`, LOADER_FILE);
  if (Buffer.compare(gitBlob('HEAD', LOADER_FILE), released) !== 0) die(`${LOADER_FILE} has moved since ${R.slice(0, 7)}; reverting would not restore a known state`);
  const pointerText = gitBlob('HEAD', 'atlas/current.json').toString('utf8');
  const proof = await proveLoaderSwap({ fromLoader: released, toLoader: restored, pointerText });
  const from = proof.from?.name || 'unregistered', to = proof.to?.name || 'unregistered';
  if (!proof.ok) die(`refusing the loader rollback ${from} -> ${to}: ${proof.reasons.join('; ')}`);
```
WHY: Rollback order is enforced, not advised: pointer first, then loader. A loader-only revert must prove (proveLoaderSwap, run in node:vm) that the restored loader composes the live pointer byte for byte; otherwise it refuses.
PATTERN: reverse-order rollback with equivalence proof

### F18 Governance: the stamp is read from the clock
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e governance/202609012148-stamps-ran-ahead-of-the-clock.md:98-100
QUOTE:
```md
1. **The stamp is read from the clock.** \`tools/recompose.mjs\` now defaults
   \`--generation\` to UTC now and refuses a given one more than five minutes
   from it. Commit subjects are stamped from \`date -u\` at commit time.
```
WHY: The origin of cut_at_utc, which acceptance uses (flow-lib.mjs:199-205: only verdicts after G's cut count). The same file (line 29) holds the estate's sharpest governance sentence: 'A vaccine nobody runs is a note.' Its measured table shows commit stamps running up to +253 minutes ahead of UTC on 2026-09-01.
PATTERN: time-from-clock, never chosen

## Patterns (keyed; each cites at least one F above)

- **Agent-cannot-consent.** The party that does the work (an agent with the owner's token) is barred from
  producing the consent signal, at both the write end (F1, F1b: env detection, refusal) and the read end
  (F2: GitHub-App marker, Claude/Codex signature blocklist, first-line-only parsing). The rule is
  stated to be procedural as well as technical (acceptance.mjs:24-27).
- **Authorisation travels inside the artefact.** --authorised-by is mandatory and lands in the commit body
  (F3, F3b); in the automated path it is the acceptance URL itself (F3c). Gate raises carry the owner
  decision in their subject (F14).
- **Pure-derivation, minimal-diff release.** The live pointer is a pure function of a committed manifest
  (F5), the preview that was tested must equal it (F4), and a release commit touches exactly two files
  (three when the loader moves) so that the revert is byte-exact (F7). Rebase-not-squash (F10) protects
  that atomicity.
- **A check that examined nothing refuses / a check must be able to fail.** F8 (the --stdout check that
  repaired what it checked), F12 (a crashed proof is a FAIL row), F13 (unknown flag fails), F14 (a budget
  that always fails measures nothing).
- **Immutability by name and hash.** atlas/releases (F11) and atlas/v/<G>/index.html (F16) are append-only;
  previews and prep commits are forbidden to touch them (F11 cites publish-preview.mjs:64-66,
  release-generation.mjs:255-256).
- **Deploy ordering around a cache.** F6 and F17: loader first, then pointer; roll back pointer first, then
  loader; each step separately revertable.

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Clone is shallow (300 + boundary; 311 visible commits). Authorship of visible commits
(`git log --format=%an | sort | uniq -c`): Ventusltd 268, Claude 41, Vikram Kumar 2.
Cadence (`git log --format=%ad --date=format:%Y-%m-%d | sort | uniq -c`): a storm 2026-09-01..09-08
(63, 43, 34, 15, 22, 2, 16, 16 commits/day), near silence 09-11..10-23 (1-5/day on 7 days), then the
release-machinery storm 10-27 (7), 10-28 (15), 10-29 (61).

Turning points:
- 4b1641e 2026-09-03T02:40:54+01:00 Ventusltd: `loop.mjs state --stdout` renders without writing (F8).
- cd9a27e 2026-10-23T00:20:12+01:00 Ventusltd "Add public UK lightning layer to GridAtlas" (pointer moved by hand),
  then the hand rollback split across two commits: 1eb6414 2026-10-23T01:15:26+01:00 (atlas/current.json only)
  and c09d199 2026-10-23T01:15:32+01:00 (STATE.md only). This is the pre-script world the release tooling ends:
  at 1eb6414 the pointer said 202609241334 and STATE.md said 202610221600 (checked with `git show <sha>:...`).
- 2f7d752 2026-10-27T02:39:16+00:00 and edb17db 2026-10-28T21:06:04+00:00 Claude: owner-decided ceiling raises
  as separate commits (F14).
- 08b5cae 2026-10-28T17:34:02+00:00 Claude: Build L3 release, the hand release the scripts were rebuilt from
  (docs/RELEASE.md:9-10, 344 "byte-identical to PR #49's 08b5cae").
- 5a0d924 2026-10-28T21:02:19+00:00 Ventusltd: "tools/release: scripted generation release and route-C rollback
  (script only, no workflow) (#54)".
- 1adbd24 2026-10-29T02:55:21+00:00 Ventusltd: "the delivery flow end to end (cut → preview → acceptance →
  release → live bytes → homepage → served → rollback) + release-status (#64)".
- c105959 2026-10-29T09:22:44+00:00 Claude: "loader first, then the pointer"; 61fee61 2026-10-29T10:41:50+00:00
  Claude: refuse a one-step v1 -> v2 release (R-cifix MAJOR) (F6).
- f0f449b 2026-10-29T11:21:45+00:00 Claude: release of 202610291044 (v9.186), authorised by a chat instruction.
- cacb69a 2026-10-29T23:41:04+00:00 Ventusltd (HEAD): release of 202610292044 (v9.187, data-centre Grid Engine),
  authorised by a GitHub acceptance comment URL on PR #75 at 2026-10-29T23:34:44Z: the first visible release
  whose authorisation is the F1/F2 acceptance record. Its trailer is spelled `Authorised-by:` (hyphen),
  unlike the script's `Authorised by:` (release-generation.mjs:343), and its body says "CI must independently
  validate all release gates", so it reads as composed outside release-generation.mjs; nonetheless W02
  re-derived its pointer from the manifest byte-exact (F4).

R-<code> bug-ticket convention. The command asked for,
`git log --oneline | grep -o 'R-[a-z0-9]*' | sort | uniq -c`, gives (subjects only):
```
      1 R-a11yperf
      1 R-camera
      1 R-cifix
      1 R-otdata
      2 R-otsec
      4 R-taps
      2 R-words
```
(12 matches over 11 subject lines; one of the R-camera hits is a false positive from "M2R-camera" in
a80b760.) Severity-tagged in subjects: `R-taps MAJOR` x2 (f3018a7, c054ecf, both 2026-10-29T10:42:11+00:00),
`R-cifix MAJOR` x1 (61fee61), `R-otsec ORS8` x1 (da79f4c). Over full commit bodies
(`git log --format=%B | grep -o -E 'R-[a-z0-9]+ (MAJOR|MINOR|...|ORS[0-9]+)'`): R-taps MAJOR 3, R-cifix MAJOR 1,
R-cifix MINOR 3, R-handoff MINOR 1, R-l3regress MINOR 1, R-release MINOR 1, R-otsec ORS8 1. Codes seen in
bodies: R-1, R-2, R-4, R-a11y, R-a11yperf (5), R-bugs, R-camera (2), R-cifix (4), R-data, R-diff, R-handoff,
R-l3regress, R-layout, R-otdata (4), R-otsec (4), R-provenance, R-release, R-repd, R-security, R-taps (7),
R-words (7). Every commit matching `--grep='R-[a-z]'` (16) is authored by Claude, all 2026-10-28/29: the
convention is the review-ticket vocabulary of the agent lanes (review finding code + severity), folded into
commit subjects at fix time.

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- The live pointer (atlas/current.json generation 202610292044, v9.187, "release accepted data-centre Grid
  Engine preview") was moved by cacb69a, a two-file release commit whose authorisation is an owner
  acceptance comment URL, and whose pointer W02 re-derived byte-exact from its manifest and the tested
  preview route (F4, F5). The data-centre engine reached production through exactly this machinery.
- Any future data-centre cartridge (tools/offtakers/src/06b-dc-engine.js lives in the offtakers overlay,
  touched by 4fa72ae 2026-10-29T20:40:02+00:00 "data-centre category + Grid Engine 30/30/30") is bound by the
  500 kB ceiling (F14), the preview-then-accept-then-release flow (F1-F4), and the loader rule (F6) if it
  needs an after-cartridge slot.
- Rollback for the data-centre release is a single command already named in its commit body
  (`rollback-generation.mjs --release-commit <this SHA>`), byte-exact by F7.

## Candidates (unkeyed; clearly marked)

- CANDIDATE: runningAsAgent() is environment-variable detection; an agent that unsets those variables would
  pass F1. The real backstop is F2 (app marker, signatures) plus procedure; an agent posting via plain `gh`
  with the owner's token and no signature would not be caught technically. The code comments acknowledge this.
- CANDIDATE: rebase-not-squash is not enforced by code (no branch-protection file read in this slice);
  only F7's refusal of a non-pointer-only commit would catch a squashed release at rollback time.
- CANDIDATE: cacb69a appears hand-composed rather than produced by release-generation.mjs (trailer spelling,
  body wording); whether the gates were run for it is not provable from the local clone.
- UNVERIFIED: flow.test.mjs and loader-swap.test.mjs were not run (they may create worktrees/branches, which
  the read-only law forbids). docs/RELEASE.md's "13 negative cases" were not re-run.
- UNVERIFIED: GitHub-side acceptance comment on PR #75 was not fetched (no GitHub API for workers).

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. flow-lib.mjs:48-52 + acceptance.mjs:59 (F1) - the estate's clearest "the agent may not consent" law, and it
   fired against this swarm itself (runningAsAgent() = true here).
2. flow-lib.mjs:140 (F2b) - Claude's own signatures used as a blocklist on consent.
3. loop.mjs:238-249 (F8) - "A drifted STATE.md was repaired by the check that existed to detect it": the
   archetype of law 4 ("a check that examined nothing refuses").
4. release-generation.mjs:152-155 (F4) - tested-equals-shipped, verified on three real releases.
5. release-generation.mjs:189-200 (F6) - a platform cache window turned into a refusal.
6. docs/RELEASE.md:211-213 (F10) - why rebase, in two sentences.
7. lib.mjs:143 (F12) - one line that turns silence into failure.
8. governance/202609012148-stamps-ran-ahead-of-the-clock.md:29 (F18) - "A vaccine nobody runs is a note."

## One next command (exactly one, runnable from a clone)

```bash
cd /home/user/estate/gridatlas && for c in $(git log --format=%h -- atlas/current.json); do printf '%s %s files=%s state=%s\n' "$c" "$(git show $c:atlas/current.json | node -pe 'JSON.parse(require("fs").readFileSync(0)).generation')" "$(git show --format= --name-only $c | wc -l)" "$(git show --format= --name-only $c | grep -c '^STATE.md$')"; done
```
