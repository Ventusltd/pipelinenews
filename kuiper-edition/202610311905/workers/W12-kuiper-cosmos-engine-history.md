# W12 kuiper-cosmos-engine-history
HEADS: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4
READ:
/home/user/pipelinenews/kuiper-edition/202610311905/BRIEF.md
/home/user/pipelinenews/kuiper-edition/202610311905/proof/inventory.tsv
kuiper-belt/.github/workflows/engine.yml
kuiper-belt/.github/workflows/check.yml
kuiper-belt/.gitignore
kuiper-belt/tools/harvest.py
kuiper-belt/tools/wafer_topup.py
kuiper-belt/tools/wafer_keys.py
kuiper-belt/tools/ci_check.py
kuiper-belt/tools/check_proof.py (lines 1-72)
kuiper-belt/tools/permanence.py
kuiper-belt/cosmos/belt.tsv, pulse.tsv, repos.tsv, standing.tsv, wafer.tsv, wafer-meta.json, permanence.json
kuiper-belt/cosmos/commits/00.tsv .. 69.tsv (counted)
kuiper-belt/proof/*.json (20 files, heads)
kuiper-belt/data/counts.json, data/authored.tsv, data/blob-lines.tsv (summed, hashed)
kuiper-belt/README.md (law section 29-48, State and DRIFT block 175-192)
kuiper-belt/DRIFT.md, MEASURED.md, NEXT.md (1-82, 295-316)
kuiper-belt/diary/2026-10-05-learn-kuiper-project-links.md, diary/2026-10-05-public-links.json (head), diary/20261005.html (title)
kuiper-belt/learn-the-kuiper/README.md, learn-the-kuiper/202610050609/kuiper-law.js (1-60), kuiper-belt/index.html:79,92,250-251
kuiper-belt git history: git log --format='%H %ad %an %s' --date=iso-strict (all 234 commits), --numstat on cosmos/wafer.tsv and cosmos/pulse.tsv, selected git show
Not read, by the brief: ABOUT.md.

Clone completeness: `git rev-list --count HEAD` = 234; `git log --format=%H | tail -1` = 482dc7722ac85e4428c26b28008b25ef0fb39930, which is also the only `git rev-list --max-parents=0 HEAD`; `.git/shallow` does not exist. The kuiper-belt history in this clone is COMPLETE (no graft boundary).

Correction to the task framing: the engine is not hourly. It is scheduled every six hours at minute 17 (F1). Measured cadence from cosmos/pulse.tsv: 146 runs, mean interval 6.94 h, min 1.70 h, max 13.54 h (the gap after 2026-10-13T00:48:13Z). The word "hourly" in the repo refers to other machinery (NEXT.md:16 "the hourly iterations", and the local drift writer named in commit 84e4483's message).

## Findings (keyed)

### F1 The engine: a fail-closed sandwich on a six-hour timer, no assistant, no paid credit
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 .github/workflows/engine.yml:30-41 (cron at :8, commit at :51)
QUOTE:
```yaml
      - name: Check first, and fail closed
        run: python tools/ci_check.py
      - name: Measure the public estate
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: python tools/harvest.py
      - name: Check again with the new data in place
        run: python tools/ci_check.py
      - name: Grow the wafer by every public commit since its rim
        timeout-minutes: 30
        env:
          GITHUB_TOKEN: ${{ github.token }}
```
(engine.yml:8 is `    - cron: '17 */6 * * *'`; engine.yml:51 is `          git commit -q -m "engine: lines standing and the wafer grown, measured by GitHub Actions"`.)
WHY: Every mutation is bracketed by the same independent checker (ci_check.py runs three times per run: before harvest, after harvest, after wafer growth). A run whose data does not add up never reaches the commit step. This is the estate's self-sustaining measurement: 146 of 234 commits (62.4%) in kuiper-belt were made by this workflow with no human present.
PATTERN: check-mutate-check sandwich; zero-cost scheduled measurement.

### F2 What "lines standing" measures, in code
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/harvest.py:69-80 (depth-1 clone at :66)
QUOTE:
```python
    g = lambda *a: subprocess.run(['git'] + list(a), cwd=d, capture_output=True, text=True).stdout.strip()
    head, when = g('rev-parse', 'HEAD')[:12], int(g('log', '-1', '--format=%ct') or 0)
    files = lines = 0
    for f in subprocess.run(['git', 'ls-files', '-z'], cwd=d, capture_output=True).stdout.split(b'\0'):
        p = os.path.join(d.encode(), f)
        if not f or os.path.islink(p) or not os.path.isfile(p):
            continue
        body = open(p, 'rb').read()
        if b'\0' in body[:8192]:
            continue                                            # not text: it has no lines
        files += 1
        lines += body.count(b'\n') + (1 if body and not body.endswith(b'\n') else 0)
```
(harvest.py:66: `    r = subprocess.run(['git', 'clone', '-q', '--depth', '1', repo['clone_url'], d], ...)`, abbreviated here.)
WHY: Defines the metric exactly. "Lines standing" = for every PUBLIC, non-empty (`size > 0`, harvest.py:50) repository of the owner, a depth-1 clone of the default branch HEAD; for every tracked path that is a regular file (symlinks skipped) and has no NUL byte in its first 8,192 bytes, count newline bytes plus one if the last line is unterminated; sum over files and repos. It is a per-path snapshot of text present NOW (duplicate files count per path), not history, not distinct blobs, not authored lines. Totals at HEAD: cosmos/standing.tsv 81 repositories, 69,778 files, 51,446,529 lines, 0 missed (awk over standing.tsv). It is one of five distinct line measures in the repo (see Patterns P4).
PATTERN: metric defined by code, not prose.

### F3 The wafer is append-only, and history proves it: 13,178 additions, 0 deletions in 118 commits
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_topup.py:22-25
QUOTE:
```python
APPEND ONLY. Nothing already issued moves: every new commit lands beyond the rim. The price is
that a commit pushed after a later run, bearing an older time, stays outside the wafer; it would
need an address that is already taken. Re-running wafer_keys.py rebuilds from belt.tsv and the
commit shards, which this tool does not extend, so it would drop everything appended here.
```
WHY: The claim is checkable by git alone. `git log --numstat -- cosmos/wafer.tsv` summed with awk: 118 commits touched the file, 13,178 lines added, 0 deleted (= header + 13,177 rows = `wc -l cosmos/wafer.tsv`). Breakdown: 0755869 +9,941 (header + 9,940 rows), 485851f +797, and 116 engine commits +2,440. No issued address has ever been rewritten. The docstring also states the price honestly (late-pushed old commits are excluded) and warns that re-running wafer_keys.py would destroy the appended rows.
PATTERN: append-only ledger; permanence of address; cost stated next to the guarantee.

### F4 The silence law: frozen constants, imported so they cannot drift
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_keys.py:13-14,33-34
QUOTE:
```python
GAP_KEYS_PER_SECOND is a DECLARED CONSTANT, frozen here. It is not fitted on each run, because a
constant that moved whenever a commit arrived would move every key after it.
GAP_KEYS_PER_SECOND = 600         # declared, frozen. About three tenths of the wafer is silence.
CAP_SECONDS = 14 * 86400          # no silence counts for more than a fortnight
```
WHY: The one design choice that makes keys permanent. Both wafer_topup.py:47 and permanence.py:29 import these constants rather than restating them (`from wafer_keys import GAP_KEYS_PER_SECOND, CAP_SECONDS, rows`). Measured: silence_share is 0.2785 at HEAD (wafer-meta.json:5), matching "about three tenths"; 4 rows sit exactly at the cap 725,760,000 (awk `$5==725760000`), at 2025-06-25T13:06:28Z, 2025-07-24T22:24:55Z, 2025-11-01T21:26:26Z, 2026-03-12T16:26:24Z.
PATTERN: declared constant, single source of truth by import.

### F5 Four refusals before one byte of the wafer is written
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_topup.py:150-152,181-187,221-224
QUOTE:
```python
    if int(wafer[-1][0]) != rim:
        print('REFUSED: wafer.tsv ends at %s, wafer-meta.json says %d' % (wafer[-1][0], rim))
        return 2
    if not found or len(missed) * 5 > len(listed):
        print('REFUSED: too many missed to call this a measurement; nothing written')
        return 1
    late = [n for n, p in missed if p > rim]
    if late:
        print('REFUSED: %d unread repositories were pushed since the rim; nothing written' % len(late))
        return 1
    if not (issued == sum(totals) == meta['issued_keys'] + sum(c[1] for c in add)
            and unissued == meta['unissued_keys'] + sum(int(l.split('\t')[4]) for l in lines)):
```
WHY: The rim check, the one-fifth missed rule, the "an unreadable repo pushed since the rim would lose commits forever" rule, and the K2 sum identity. The third is subtle and excellent: it refuses not because data is missing but because a gap would become permanent under append-only. Plus an L6 privacy refusal at :227-229.
PATTERN: fail closed; refuse rather than lose permanently.

### F6 harvest.py: a bad night cannot look like the estate shrinking
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/harvest.py:104-114
QUOTE:
```python
    if not rows or len(missed) * 5 > len(repos):
        print('FAIL: too many missed to call this a measurement; nothing written')
        return 1

    now = int(time.time())
    standing = '# repository\thead\thead_unix\tfiles\tlines\n' + ''.join('%s\t%s\t%d\t%d\t%d\n' % r for r in rows)
    standing += ''.join('# missed\t%s\n' % n for n in missed)
    pulse = '%d\t%d\t%d\t%d\t%d\n' % (now, len(rows), len(missed), sum(r[3] for r in rows), sum(r[4] for r in rows))
    if leaks(standing):
        print('REFUSED (L6): a name that is not public is in the result; nothing written')
        return 2
```
WHY: Missed repos are recorded as missed, never guessed; above 20% missed, nothing is written. Result in data: the `missed` column of cosmos/pulse.tsv is 0 in all 146 rows (awk `$3>0` printed nothing), and lines_standing fell in only 3 of 145 intervals, by 5, 15 and 41 lines (2026-09-29T05:50:45Z, 2026-10-12T15:37:53Z, 2026-10-21T04:58:16Z).
PATTERN: missing is recorded, not imputed; quorum threshold.

### F7 The pulse: 146 rows, one per engine commit, never rewritten
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 cosmos/pulse.tsv:1-2,147
QUOTE:
```tsv
# unix	repositories	missed	files	lines_standing
1789826757	59	0	41551	46225159
1793450603	81	0	69778	51446529
```
WHY: The estate's growth curve, measured from the day it was switched on (harvest.py:13-14). First row 2026-09-19T14:05:57Z: 59 public repos, 41,551 files, 46,225,159 lines. Last row 2026-10-31T12:43:23Z: 81 repos, 69,778 files, 51,446,529 lines; +5,221,370 lines in 42 days. `git log --numstat -- cosmos/pulse.tsv`: 146 commits, 147 additions (header + 146 rows), 0 deletions. Largest single-run jumps: +1,253,425 at 2026-09-20T20:54:28Z, +756,866 at 2026-09-21T22:03:18Z, +745,893 at 2026-10-29T05:56:58Z.
PATTERN: append-only time series.

### F8 The CI checker cannot be satisfied by editing a number in a document
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/ci_check.py:8-13
QUOTE:
```python
  K1  no tracked file contains a token whose digest matches a repository name that is not public
  K2  cosmos/wafer.tsv re-summed equals cosmos/wafer-meta.json, and equals cosmos/repos.tsv
  K3  every tool is valid python, and the script inside every page parses as JavaScript
  K4  keys are in time order and no commit overlaps the one before it

Exit 0 only if all pass. Nothing here can be satisfied by editing a number in a document.
```
WHY: Three-way agreement (rows, meta, per-repo totals) plus order and closure of the address space. Re-run read-only by me with awk over the HEAD files (ci_check.py itself writes temp .mjs files into the clone, so it was not executed): issued 45,461,911,314 = wafer-meta issued_keys = repos.tsv sum 45,461,911,314; unissued 17,550,746,400; address space 63,012,657,714 = wafer-meta address_space; 13,177 rows = commits; 0 rows out of order, negative-gap or zero-line. K2 and K4 hold at HEAD.
PATTERN: cross-sum identity; order invariant.

### F9 The guard that does not spell what it guards
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/check_proof.py:23-25,47-53
QUOTE:
```python
THE GUARD DOES NOT SPELL WHAT IT GUARDS. An earlier guard listed the private repository names in
plain text inside a public repository, which is the leak it existed to prevent. Names are held
here as truncated SHA-256 digests, and text is checked by hashing every token in it.
def leaks(text):
    """Every run of name characters is hashed, whole and with its leading path stripped, and
    compared with the digests. Returns how many tokens matched, never which."""
    n = 0
    for tok in set(re.findall(r'[A-Za-z0-9_][A-Za-z0-9_.-]*', text)):
        for t in {tok, tok.rstrip('.'), tok.split('/')[-1]}:
            if hashlib.sha256(t.lower().encode()).hexdigest()[:24] in NOT_PUBLIC:
```
WHY: A privacy filter published in a public repo that reveals nothing: it holds 6 truncated SHA-256 digests (96 bits each), hashes every token, and returns a count, never the match. Imported by harvest.py:36, wafer_topup.py:46 and ci_check.py:26, so every write path and every push is screened. (Digest values deliberately not reproduced here.)
PATTERN: hashed denylist; count-not-name reporting.

### F10 Permanence tested once on real data: 9,848 kept, 0 moved
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 cosmos/permanence.json:2-13
QUOTE:
```json
 "earlier_measurement": "d672e69",
 "committed": "2026-09-19T11:59:13+01:00",
 "commits_then": 9848,
 "commits_now": 9868,
 "in_both": 9848,
 "kept_their_address": 9848,
 "MOVED": 0,
 "no_longer_present": 0,
 "arrived_since": 20,
 "lines_arrived_since": 243858,
 "address_space_then": 53296940953,
 "address_space_now": 53302718011,
```
WHY: A test that could fail (tools/permanence.py returns 1 if anything moved, :92). Two caveats found: (a) `d672e69` is a commit in the separate `cosmic` repo (permanence.py:10,31), not resolvable here (`git cat-file -t d672e69` fails in kuiper-belt), so this result cannot be re-run from this clone alone; (b) permanence.py keys addresses by sha12 alone (:51) while the wafer keys by (repo_index, sha12): the wafer then had 9,940 rows but only 9,868 distinct sha12 (72 sha12 appear in two repositories; same count, 72, at HEAD), which is exactly why commits_now is 9,868. It was run once (file only in commit 4ef5264) and never re-run after the topup; F3 (0 deletions) is the stronger, continuous evidence.
PATTERN: falsifiable regression test against a pinned earlier measurement.

### F11 The law lifted verbatim, identical in all nine dated editions, and it names its own discrepancy
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 learn-the-kuiper/202610050609/kuiper-law.js:23-28
QUOTE:
```javascript
//   keys start at 0.  m = (key * 2654435769) mod 2^32, an unsigned 32-bit integer product (Math.imul, wrapping).
//   turns = m / 2^32           the angle as a fraction of one full turn, in [0, 1)
//   theta = 2 pi turns         radians, anticlockwise from +x, with world y UP on screen (WebGL clip space, :148; overlay :357)
//   r     = sqrt(key + 0.5)    the radius; NOT sqrt(key). The half is in the live code at :250 and :144.
//   Successive keys turn by G32/2^32 = 0.6180339887 of a turn = 222.4922 degrees anticlockwise on screen, which is the
//   same point as 137.5078 degrees CLOCKWISE. The Excel "137.5 anticlockwise" spiral is the MIRROR IMAGE of the Kuiper.
```
WHY: `md5sum learn-the-kuiper/2026*/kuiper-law.js` gives one digest for all 9 dated folders: the law module never drifted across the edition burst. It quotes index.html:250 verbatim and that line still matches at HEAD (`function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);`). It also exposes a live inconsistency: index.html:79 comments `r = sqrt(k)` and cosmos/wafer-meta.json:12 declares `"law": "r = sqrt(key), theta = 2 pi frac(key x 2654435769 / 2^32)"`, while the code uses sqrt(k + 0.5). The diary (diary/2026-10-05-learn-kuiper-project-links.md:32) states the distinction publicly.
PATTERN: verbatim lift with line citations; one module, many dated editions.

### F12 MEASURED: the 67 million figure retracted, with a reproducible index
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 MEASURED.md:27-32
QUOTE:
```markdown
**67,108,864 is not the estate's line count and never was.** It is 2^26, the particle count of the
`spiral_vs_stack` benchmark, which measured what the renderer can place (21.03 s spiral against
26.89 s stack) using particles generated from a seed that stood for nothing. Quoting it as a line
count would be the same error as reporting the wafer's dust total for the Kuiper belt.

**The real figure is 25,335,587**, and it is 378 times the 250,174 lines the wafer currently draws.
```
WHY: A retraction backed by a hashable file. Verified: `sha256sum data/blob-lines.tsv` = 11a9aa789ca4def10dd6a884228f72731ecdf0b0a1e9dfd3ed8f1425aaa3f4b6, matching MEASURED.md:22; awk sum of column 2 = 25,335,587 over 17,835 rows, matching MEASURED.md:11,13.
PATTERN: retraction with digest; denominator before ratio.

### F13 The authored count reconciles across two files
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 proof/20260919T030003Z-counts.json:5-8
QUOTE:
```json
  "authored_added": 57820668,
  "authored_deleted": 11253909,
  "command": "<local path redacted by W12>",
  "commits": 9887,
```
(Line 7 is reproduced redacted because it carries a local home-directory path; lines 5, 6 and 8 are verbatim.)
WHY: data/authored.tsv (66 rows, no header; columns repo, added, deleted, commits) sums by awk to 57,820,668 / 11,253,909 / 9,887, exactly the proof record. data/counts.json:6 gives `"history_lines": 124904978` (distinct blobs across all history, 40,142 text blobs at :7).
PATTERN: proof record reconciles with published table.

### F14 The README's DRIFT block and State section are frozen at the first night
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 README.md:175-186
QUOTE:
```markdown
## State

Seeded 2026-09-18. `tools/estate.py` is **not yet written**. See [SPEC.md](SPEC.md) for its
contract and [LAWS.md](LAWS.md) for the derivation of each element. There is nothing in `data/` or
`proof/` yet, and this file says so rather than implying otherwise.

<!-- DRIFT:START -->
### Host entanglement, 2026-09-18T22:24:08.578Z

**NOT EVALUATED.** no observation from gitlab

Run `20260918T222408Z`, digest `a56fbe0df58281ec5971e7890d7c5ff35ab00572d83c31fd766398a30a6a56f0`. LAWS.md L10.
```
WHY: A law-breaking statement inside the law-giving file. tools/estate.py exists (236 lines, first commit fc08c09 at 2026-09-19T00:18:59+01:00), data/ holds 22 entries and proof/ 20 files. The README DRIFT block shows only the very first run (65 bodies NOT EVALUATED, proof/20260918T222408Z.json); the later DRIFT.md (last commit 84e4483) shows 71 bodies, 56 HONOURED, 7 OVERREACHED, 8 NOT EVALUATED. The DRIFT block lines were last touched by 47ce640 (git log -L181,187:README.md). The engine never writes README.md (engine.yml:49 adds only cosmos files). Proposed fix for the edition: update State, or re-point the block.
PATTERN: stale self-description (anti-pattern).

### F15 Two counters, two binary thresholds; .gitignore that does not untrack
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/harvest.py:77
QUOTE:
```python
        if b'\0' in body[:8192]:
```
WHY: harvest.py classifies binary on the first 8,192 bytes; wafer_topup.py:114-115, count_lines.py:61, key.py:40 and MEASURED.md:17 use 8,000. A file with its first NUL between bytes 8,001 and 8,192 counts as text in "lines standing" but as binary in issued keys. Small, but it is two definitions of "text" in one instrument. Separately: .gitignore (added in 485851f) lists `__pycache__/`, yet `git ls-files tools/__pycache__` still returns 3 tracked .pyc files (check_proof, key, wafer_keys), committed before the ignore rule.
PATTERN: shared constant missing (anti-pattern); ignore-is-not-untrack.

### F16 The redaction commit: names replaced, counts untouched, history rewrite left to the owner
KEY: kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 cosmos/belt.tsv:8
QUOTE:
```tsv
unnamed-01	7923	70	13	1158	1789756278
```
WHY: belt.tsv (70 repos) carries 6 `unnamed-NN` rows; commit 84e44834231571e7440eb4578ec39bdfe438fc13 replaced matching tokens in 18 tracked files. Its message states the residue honestly: "The names remain in this repository's history, and removing them needs a history rewrite, which is the owner's decision." I confirm the pre-redaction names are visible in that commit's diff; they are NOT reproduced here (brief law 7).
PATTERN: redact forward, disclose residue.

## Patterns (keyed; each cites at least one F above)

P1 Check-mutate-check sandwich (F1, F8): engine.yml runs ci_check.py before and after every mutation; check.yml (check.yml:25-26 `- name: Check, and fail closed` / `run: python tools/ci_check.py`) runs it on every push with `contents: read` only (check.yml:10-11). The writer has write permission; the push checker does not.

P2 Refuse rather than impute (F5, F6): both harvest.py and wafer_topup.py use the same one-fifth quorum (`len(missed) * 5 > len(...)`), record missing as missing, and exit non-zero with "nothing written".

P3 Append-only ledger with frozen constants (F3, F4, F7, F10): pulse.tsv and wafer.tsv only ever gain lines (0 deletions each in git numstat). Constants live in one file and are imported.

P4 Five line measures, never conflated (F2, F12, F13): (1) lines standing, per path at public HEADs, 51,446,529 (standing.tsv); (2) distinct text blobs at local HEADs, 25,335,587 (MEASURED.md:13); (3) authored, numstat additions, 57,820,668 (proof counts :5); (4) distinct blobs across history, 124,904,978 (counts.json:6); (5) issued keys, one per line in every file in every commit, 45,461,911,314 (wafer-meta.json:2). MEASURED.md and NEXT.md:295-316 (the HUD defect) are the repo telling itself not to mix these.

P5 Hashed denylist (F9, F16): privacy enforced without publishing what is private.

P6 Code frozen after birth: every engine tool has exactly one commit or two (`git log --format=%h -- <file>`: harvest.py 024d127; ci_check.py and check.yml 1b18e9c; wafer_keys.py 0755869; wafer_topup.py 485851f; permanence.py 4ef5264; check_proof.py 9dcf8f8, 84e4483). 146 runs used unchanged code; engine.yml has 3 commits (024d127, ccc8d72, 485851f).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Commands: `git log --format='%an' | sort | uniq -c`; `git log --format='%ad' --date=format:%Y-%m-%d | sort | uniq -c` (author-local dates).

Authorship (names only): kuiper-engine 146, Ventusltd 75, Claude 13 = 234. Bot share 146/234 = 62.4%. Human commits 88. Committer pairs: kuiper-engine|kuiper-engine 146, Ventusltd|Ventusltd 72, Claude|Claude 11, Ventusltd|GitHub 3, Claude|Ventusltd 2. Bot subjects: 30 x "engine: lines standing, measured by GitHub Actions" (2026-09-19 to 2026-09-26), then 116 x "engine: lines standing and the wafer grown, measured by GitHub Actions".

Human commits by day: 2026-09-18 13, 2026-09-19 53, 2026-09-26 1, 2026-10-04 7, 2026-10-05 14. No human commit after 2026-10-05T15:02:15+01:00; the last 26 days are the bot alone, 2 to 4 commits a day.
All commits by day: 09-18 13, 09-19 55, 09-20 4, 09-21 3, 09-22 5, 09-23..25 4 each, 09-26 6, 09-27 4, 09-28..10-02 3 each, 10-03 4, 10-04 10, 10-05 16, 10-06..10-11 3 each, 10-12 2, 10-13 3, 10-14..10-18 4 each, 10-19 3, 10-20..10-25 4 each, 10-26..10-30 3 each, 10-31 2.

First human commit: 482dc7722ac85e4428c26b28008b25ef0fb39930 2026-09-18T19:31:18+01:00 Ventusltd "Initial commit" (adds .gitattributes, 2 lines).
Last human commit: a287b4cbe517e03628d2e43783c826820eedcbbd 2026-10-05T15:02:15+01:00 Ventusltd "docs: publish 5 October Kuiper diary and project links".
First bot commit: c7c8fb52162fe7bc8ca62204dfc597ae3ca56789 2026-09-19T14:05:58+00:00, four minutes after engine.yml landed (024d127 at 14:01:54Z), off the :17 schedule (see Candidates).
Last bot commit = HEAD: b243e38d4964557458fcaf636fd8d49c799f91a6 2026-10-31T12:43:52+00:00.
Reverts: none (`git log --format=%s | grep -ci revert` = 0).

The night storm, 2026-09-18T19:31+01:00 to 2026-09-19T18:48+01:00: 66 human commits in about 23 hours, including 14 consecutive NEXT.md commits from 02:14:48 to 03:49:49+01:00 (15 NEXT.md commits in all, first at 00:42:22+01:00; the handover written live), then the MEASURED retraction (8b4b1d2), the wafer (0755869), the proof and guard chain (4ef5264, 9dcf8f8, 84e4483, 1b18e9c), and Claude's engine (024d127, ccc8d72).

Wafer growth (`git log --numstat -- cosmos/wafer.tsv`, awk sums): rows 9,940 (0755869, 2026-09-19) -> frozen for a week while 30 engine runs only measured standing -> 10,737 (485851f bootstrap, +797) -> 13,177 at HEAD (+2,440 over 116 engine commits, 2026-09-26 to 2026-10-31). Daily engine additions range 17 (2026-10-12) to 266 (2026-10-29); spikes 2026-09-28 +236, 2026-10-18 +146, 2026-10-27 +220, 2026-10-29 +266. Largest single runs: 685bae4 (2026-10-27T05:15:04Z) +156, ca37bf4 (2026-09-28T05:32:59Z) +145, 0f44097 (2026-10-29T22:51:53Z) +126. Meta (git show <c>:cosmos/wafer-meta.json): issued keys 37,929,255,811 / 70 repos (0755869) -> 41,820,178,889 / 88 (485851f) -> 43,710,819,042 / 95 (5dbc3f0, 2026-10-04) -> 45,461,911,314 / 98 (HEAD). Silence share 0.2884 -> 0.2737 -> 0.2785.

Edition burst, 2026-10-04T16:08+01:00 to 2026-10-05T15:02+01:00: 21 Ventusltd commits (7 + 14), 70,319 insertions and 4,347 deletions (`git log --author=Ventusltd --since=2026-10-04T00:00:00+01:00 --numstat`). learn-the-kuiper/ now has 9 dated folders (202610042225 .. 202610050609) plus astra-codex/ and build-your-own-kuiper/: 181 tracked files, 73,256 lines; see-through/ has 3 dated folders (202610050356, 202610050513, 202610050609): 82 files, 8,955 lines. Dated folder size grew from 4 files / 465 lines (202610042225) to 27 files / 12,792 lines (202610050609). Biggest single commit: d3039324a2663f6c2a542194db6a9ca3e0e8285d (56 files, +13,766). Followed by a tidy commit 55db60c (49 files, +363, -3,620). 18 commits touch the two folders. The engine kept running through it (5dbc3f0, 8bb127e interleaved).

Turning points (full SHA, then a representative hunk of at most 12 lines):

T1 482dc7722ac85e4428c26b28008b25ef0fb39930 2026-09-18T19:31:18+01:00 Initial commit. Root of a complete history; 1 file (.gitattributes, +2). (Hunk is 2 lines; the README it was followed by contains personal biography and is not quoted.)

T2 4ffcced5b853a107dd96bd745a30846b5b22abf6 2026-09-18T20:06:28+01:00 Kuiper-belt seeded: laws, spec, framework (4 files, +498 -52).
```diff
+# LAWS — the derivation of every number a body carries
+
+Each law below states what is measured, how it is computed, and what would prove it wrong. A law
+that cannot be falsified is not a law and does not belong here. Read [README.md](README.md) first.
+
+Notation: `C(b)` is the ordered list of commit timestamps for body `b`, each with its UTC offset.
+`gaps(b)` is the list of intervals between consecutive commits. `refs(b)` is the set of other
+bodies `b` references. All logarithms are natural.
+
+---
+
+## L1 — The shepherd is computed, never declared
```

T3 8b4b1d220ac87bd4f6bef4ccdb54e5d899a03ab3 2026-09-19T03:55:15+01:00 MEASURED: 25,335,587 lines, not 67 million (MEASURED.md +43, data/blob-lines.tsv +17,835).
```diff
+
+**67,108,864 is not the estate's line count and never was.** It is 2^26, the particle count of the
+`spiral_vs_stack` benchmark, which measured what the renderer can place (21.03 s spiral against
+26.89 s stack) using particles generated from a seed that stood for nothing. Quoting it as a line
+count would be the same error as reporting the wafer's dust total for the Kuiper belt.
+
```

T4 0755869facbe055f663ab9fbffb32f2eefc8c737 2026-09-19T13:56:08+01:00 the Kuiper belt as one wafer: belt.tsv, 70 commit shards, wafer.tsv (+9,941), wafer_keys.py.
```diff
+GAP_KEYS_PER_SECOND = 600         # declared, frozen. About three tenths of the wafer is silence.
+CAP_SECONDS = 14 * 86400          # no silence counts for more than a fortnight
+
+
+def rows(path):
+    return [l.rstrip('\n').split('\t') for l in io.open(path, encoding='utf-8')
+            if l.strip() and not l.startswith('#')]
```

T5 4ef5264fd82e2a626182567c628b112e318484d3 2026-09-19T14:05:43+01:00 proof 2: permanence of addresses (permanence.json, permanence.py, publish_proof.py).
```diff
+ "in_both": 9848,
+ "kept_their_address": 9848,
+ "MOVED": 0,
+ "no_longer_present": 0,
+ "arrived_since": 20,
+ "lines_arrived_since": 243858,
```

T6 9dcf8f8d6fd8065d86b3eae7804a477061d82427 2026-09-19T14:25:43+01:00 the checking engineer, and a guard that does not spell what it guards (check_proof.py +177).
```diff
+Verdicts go to E:\particles-runs\checks\ as CHECK-<proof>.md and CHECKS.json. The checker never
+edits a proof, never publishes and never commits: a checking engineer who can change the drawing
+is not checking it.
+
+THE GUARD DOES NOT SPELL WHAT IT GUARDS. An earlier guard listed the private repository names in
+plain text inside a public repository, which is the leak it existed to prevent. Names are held
+here as truncated SHA-256 digests, and text is checked by hashing every token in it.
```

T7 84e44834231571e7440eb4578ec39bdfe438fc13 2026-09-19T14:27:43+01:00 redact names of repositories that are not public from every tracked file (18 files). Hunk withheld (it shows the removed private names); the commit message, verbatim in part:
```text
Eighteen tracked files in this public repository named private repositories: the
handover, the drift log, the authored table, the host registers and twin files, and
an estate network. They were committed before the rule that a name is disclosure
existed, and were found today by a guard that holds digests rather than names. Every
matching token is replaced by one of our own words and a number; counts are
untouched. The names remain in this repository's history, and removing them needs a
history rewrite, which is the owner's decision.
```

T8 1b18e9c115b4a46f67c3365a2c035c2bed7e9464 2026-09-19T14:29:36+01:00 a second checking engineer: GitHub checks every push and fails closed (check.yml +26, ci_check.py +102). Hunk = ci_check.py:8-13 as quoted in F8 (file unchanged since).

T9 024d127e3f632ade1b105d8d5bd8684180bbc397 2026-09-19T15:01:54+01:00 (Claude) engine: a scheduled harvest on GitHub Actions that needs no assistant and no paid credit (engine.yml +46, harvest.py +128).
```diff
+name: engine
+
+# The engine that runs with nobody paying and nobody watching. On a timer, on GitHub's machine, it
+# checks the repository, measures every PUBLIC repository of the estate, and commits what it found.
+# It uses no assistant and no paid credit. If every other machine is switched off, this still runs.
+on:
+  schedule:
+    - cron: '17 */6 * * *'
+  workflow_dispatch:
+
+permissions:
+  contents: write
```

T10 c7c8fb52162fe7bc8ca62204dfc597ae3ca56789 2026-09-19T14:05:58+00:00 (kuiper-engine) first measurement: pulse.tsv born, standing.tsv 59 repos.
```diff
+++ b/cosmos/pulse.tsv
@@ -0,0 +1,2 @@
+# unix	repositories	missed	files	lines_standing
+1789826757	59	0	41551	46225159
```

T11 485851fcbf5cd825a574bc8ed0e8996f77d3c6b2 2026-09-26T23:00:23+01:00 wafer: grow by itself after every engine run (wafer_topup.py +247, wafer.tsv +797). Message: "First run, 26 Sept 2026 22:41 London: 797 new commits, 3,890,923,078 new keys, 18 new public repositories."
```diff
+      - name: Grow the wafer by every public commit since its rim
+        timeout-minutes: 30
+        env:
+          GITHUB_TOKEN: ${{ github.token }}
+        run: python tools/wafer_topup.py
+      - name: Check the grown wafer
+        run: python tools/ci_check.py
       - name: Commit the measurement
         run: |
           git config user.name "kuiper-engine"
           git config user.email "actions@users.noreply.github.com"
-          git add cosmos/standing.tsv cosmos/pulse.tsv
+          git add cosmos/standing.tsv cosmos/pulse.tsv cosmos/wafer.tsv cosmos/repos.tsv cosmos/wafer-meta.json
```

T12 bb55165e384e46414e5ed12ed9b9aa52bcb3e102 2026-10-04T22:26:34+01:00 learn-the-kuiper: initial version 202610042225 (5 files, +805): the edition burst begins; kuiper-law.js born and never changed (F11).

T13 b243e38d4964557458fcaf636fd8d49c799f91a6 2026-10-31T12:43:52+00:00 HEAD, a routine engine run (5 files, +43 -20).
```diff
@@ -144,3 +144,4 @@
 1793365523	80	0	69768	51446243
 1793399275	80	0	69771	51446328
 1793426027	81	0	69775	51446464
+1793450603	81	0	69778	51446529
```

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- gridatlas is the third-largest body in the wafer: cosmos/repos.tsv:46 `44	gridatlas	1063560477` (2.3% of issued keys; globalgrid2050 at :68 holds 41,764,869,222, 91.9%). 927 wafer rows for gridatlas, 2026-08-29T06:10:33Z to 2026-10-29T23:53:53Z.
- Cross-check, wafer vs clone: every commit on gridatlas main in the local clone (311 commits since 2026-09-01T13:43:56Z, HEAD cacb69a7c4ab) appears in cosmos/wafer.tsv under repo_index 44; 0 missing. The wafer holds 703 gridatlas rows in that window, because wafer_topup takes every branch (`git log --branches`, wafer_topup.py:127). Same test: data-grid-gb 15/15 clone commits present (wafer 51 rows, idx 38), data-centres-gb 13/13 present (wafer 16 rows, idx 50). The wafer is a complete commit ledger for the focus repos as far as the clones can show.
- cosmos/standing.tsv:36 `gridatlas	cacb69a7c4ab	1793318033	1187	1512023`: same HEAD as the brief's inventory, but the inventory reports 1,189 files / 1,510,335 text lines. Two counters, one HEAD, 1,688 lines apart (harvest skips 2 binary files and counts unterminated last lines; inventory rule not read by me).
- Datacentre lines standing at HEAD: data-grid-gb 364,565 (standing.tsv:17), data-centres-gb 5,286 (:14), data-gridatlas 24,140 (:18).
- data-grid-gb's wafer keys rose from 2,277,896 in the frozen belt (belt.tsv:40) to 16,477,118 (repos.tsv:40): growth since 2026-09-19 that only the engine recorded, consistent with the dc-a lanes arriving on branches.
- Pattern transfer: the gridatlas release flow could adopt P1 (check-mutate-check) and P2 (one-fifth quorum, "nothing written") directly; the wafer's append-only rim is the same idea as gridatlas's immutable shell plus hashed cartridges.

## Candidates (unkeyed; clearly marked)

- CANDIDATE: the first bot commit (14:05:58Z) was a manual workflow_dispatch, since the cron fires at minute 17. Actions run logs are not available to workers: UNVERIFIED.
- CANDIDATE: the 13.54 h gap after 2026-10-13T00:48:13Z is a skipped or failed scheduled run. Could also be a run that refused (exit 1 or 2) and wrote nothing; refusals leave no commit, so the git history cannot distinguish them: UNVERIFIED.
- CANDIDATE: the 3 small lines_standing drops (5, 15, 41) are ordinary deletions in public repos, not measurement faults.
- CANDIDATE: proof/*.json and data/counts.json carry local machine paths and a host namespace in their `command` fields; the K1 digest guard only catches private repository names, so this class of personal data is outside what the instrument checks. Recommend the edition does not quote those fields (I have not).
- CANDIDATE: the README DRIFT block stopped updating because the drift writer that targeted it was a local scheduled job, which commit 84e4483 says "still emits real names and must be fixed at its source".

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. engine.yml:30-53 (F1): the self-running, fail-closed measurement, 146 unattended commits.
2. harvest.py:79-80 (F2): the two lines that define "lines standing".
3. wafer_topup.py:22-25 (F3) with the numstat proof (13,178 added, 0 deleted): permanence shown by git.
4. wafer_keys.py:13-14,33-34 (F4): the frozen-constant argument.
5. wafer_topup.py:184-187 (F5): refuse because a gap would become permanent.
6. ci_check.py:13 (F8): "Nothing here can be satisfied by editing a number in a document."
7. check_proof.py:23-25 (F9): the guard that does not spell what it guards.
8. kuiper-law.js:26 (F11): `r = sqrt(key + 0.5)    the radius; NOT sqrt(key)`, plus the fix to wafer-meta.json:12 and index.html:79.
9. MEASURED.md:27 (F12): the retraction.
10. README.md:177-179 (F14), as the edition's honest correction: the law file must not misstate its own state.

## One next command (exactly one, runnable from a clone)

cd /home/user/estate/kuiper-belt && git log --numstat --format='C %H %ad' --date=iso-strict -- cosmos/wafer.tsv cosmos/pulse.tsv | awk '/^C /{c=$2} NF==3 && $2>0 {print "DELETION", c, $3}' | head
