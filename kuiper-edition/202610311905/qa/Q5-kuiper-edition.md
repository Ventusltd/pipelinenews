# Q5: the Kuiper edition 202610311905 (branch and mirror)

QA agent Q5 (Claude Fable 5.1), written 2026-10-31T23:35:00Z. Nothing changed: no commit, push, label or comment edit.
Worktree `/tmp/q5` of `kuiper-belt` FETCH_HEAD `edition/202610311905` = `5bf5202ff51a37e2f243eebcd0b9734c1d6fdbb1`;
scratch `/tmp/q5-belt`; both removed at the end. Clones under `/home/user/estate` and `/home/user/pipelinenews` read only
(fetch only). CONFIRMED = re-run here; PLAUSIBLE = read only; UNVERIFIED = could not run.

## Scope and heads

- kuiper-belt `edition/202610311905` at 5bf5202 (one commit over b243e38; 54 files, 20,511 insertions, `git show --stat`).
- Mirror `/home/user/pipelinenews/kuiper-edition/202610311905` (plus `fix/` 31 files and `qa/` 3 files that exist only there).
- Clone HEADs now (after `git fetch origin`): gridatlas origin/main 41729af0, data-grid-gb 01a4491d, globalgrid2050 35b5be2f,
  kuiper-belt main 55337bf8, pipelinenews 67aa2eb0; local checkouts gridatlas 5ec7f62f, data-grid-gb 75ab8ae5, kuiper-belt 5bf5202f.
- Register pins: all 61 kuiper-belt bodies at b243e38d; gridatlas at cacb69a7 (and older commits for history rows).

## Checks

| # | check | command (abridged) | measured | expected | result |
|---|---|---|---|---|---|
| 1 | branch vs mirror | `diff -rq /tmp/q5/editions/202610311905 <mirror> -x fix -x qa` | 1 file differs: `workers/W17-globalgrid2050-shepherd.md` (mirror has CRLF on lines 217-218, 223, 258-259, 264-265; branch LF; `cmp` differs at byte 15029) | 0 | FAIL (MINOR, D1) |
| 2 | register rows | `tail -n +2 register.tsv \| wc -l`; `awk -F'\t' '{print $10}' \| sort \| uniq -c`; `awk '{print NF}'` | 354; 354 CONFIRMED; every row 11 columns | 354 all CONFIRMED | PASS |
| 3 | bodies, focus | `python3 -I` over `belt/bodies.json`: len, `class` counter | 346 bodies, 346 distinct ids; focus 174 (gridatlas 121, data-grid-gb 35, data-centres-gb 18), estate 172 | 346 / 174 | PASS |
| 4 | 354 -> 346 | blob:line computed per register row with `git rev-parse <commit>:<path>` | 8 keys carry 2 rows (16 rows): 5 same line twice, 3 same blob at two commits (`flow-lib.mjs:150` cacb69a7/1adbd24a, `release-generation.mjs:189` cacb69a7/61fee61f, `06b-dc-engine.js:1` 4fa72ae0/cacb69a7); one duplicate is W13 twice inside C4 (`learn-the-kuiper/index.html:7`) | "eight lines cited by two chapters" | PASS (wording NOTE D4) |
| 5 | keys 495 | `grep "Keys verified"` in C1..C5 | C1 113, C2 103, C3 98, C4 88, C5 93 = 495 (arithmetic CONFIRMED; the counts are the controllers' claims, 10 re-verified in check 15) | 495 | PASS (PLAUSIBLE for the 485 not re-run) |
| 6 | workers | `ls workers \| wc -l`; `cat workers/*.md \| wc -l` | 20 files, 10,233 lines | 20 / 10,233 | PASS |
| 7 | chapters, inventory | `ls chapters`; `wc -w`; `tail -n +2 proof/inventory.tsv \| wc -l` | 5 chapters (2,974-3,102 words), 5 nl006 notes, 5 registers; 26 inventory rows | 5 / 26 | PASS |
| 8 | manifest, branch | `cd /tmp/q5/editions/202610311905 && sha256sum -c proof/edition-sha256.txt` | 50 OK, 1 FAILED (`workers/W17`); 51 files in folder besides the manifest, all 51 listed | 51 OK | FAIL (MINOR, D1) |
| 9 | manifest, mirror | same in the mirror | 51 OK; unlisted: `fix/` 31 files, `qa/` 3 files (written after the manifest, as expected) | 51 OK | PASS |
| 10 | belt reproducibility | `python3 -I tools/edition_belt.py --register register.tsv --roots /home/user/estate,/home/user --out /tmp/q5-belt --run-id 202610311905 --asof 2026-10-31T19:05:00+00:00` | `belt.json` 22b6f5be…5754e, `bodies.json` 70c212dc…4e00d, `unresolved.json` 4f53cda1…b945 identical to shipped and to `proof/202610311905-belt.json`; counts identical; `rules.txt` differs only in line 13 (`--out /tmp/q5-belt`); re-run with `--out .` in a scratch copy: `rules.txt` 47885301…d212 and `proof/202610311905-belt.json` byte-identical (`cmp`) | identical | PASS (NOTE D3) |
| 11 | key resolution | `git -C <clone> rev-parse <commit>:<path>` for all 61 kuiper-belt bodies + 40 random (seed 202610311905) | 101 of 101 equal the body's `blob` | 101 | PASS |
| 12 | quote at cited line | `git show <commit>:<path>`, line `line`, for 40 random (seed 7) | 35 exact; 40 of 40 after collapsing whitespace and TSV quote-stripping (the 5 differ only by `"` and spaces) | 40 | PASS |
| 13 | destinations, API | `gh api repos/Ventusltd/<repo>/contents/<path>?ref=<commit> --jq .sha` for 25 random (seed 25) | 16 equal the blob; 9 refused with "GitHub access to this repository is not enabled for this session" (gridmachine1, worlds-, data-centres-gb, cvaa, ventus-grid-engine) | 25 | 16 PASS, 9 UNVERIFIED by API (session scoping, not GitHub) |
| 14 | destinations, raw | `curl -f https://raw.githubusercontent.com/Ventusltd/<repo>/<commit>/<path>` then `sha1("blob <len>\0"+bytes)` for the same 25 | 25 of 25 equal the key's blob (10 repositories) | 25 | PASS |
| 15 | chapters re-verified | C2 first five `KEY:` lines, C4 first five backtick keys: commit reachable, `git show`, first fenced line inside the range | C2 5/5 (dcmerge.py L236, fetch_neso.py L409, compile-atlas-v9.py L103, compile-atlas-v9-live.py L131, reconcile_offshore_coordinates.py L16); C4 5/5 (index.html L250, kuiper-law.js L26, maths 08a:18 = `222.492236° + 137.507764° = 360°`, exactness-result.txt L18, learn-the-kuiper/index.html L7); extra: `cosmos/wafer-meta.json:12` reads `"r = sqrt(key), …"` as C4 says | 10/10 | PASS |
| 16 | law in file = generator | recomputed r, theta, x, y for every k with A_MIN 0.16, A_MAX 0.92, MULT 2654435769, n 346; compared `belt.stations[k]` to bodies | 0 of 346 mismatches; stations are `[x, y, id, 1]`; ids sorted, k = index; k=1 theta 3.883222 rad = 222.49223 deg, r 0.21004, (x,y) = (-0.154877, -0.14188); r in 0.188891..0.919451 inside 0.16..0.92; `edges: []`; `rules.txt` law lines equal `edition_belt.py:26-27, 91-92` | law as written | PASS |
| 17 | viewer | `python3 -m http.server 8765 --bind 127.0.0.1` + Playwright 1.63 chromium-1243 headless 1280x800 | HTTP 200; hud "346 bodies (174 gridatlas/datacentre) · 0 unresolved"; `belt.stations.length` 346, `bodies.length` 346; click at station k=1 (578.0, 456.8) opens `#card` (display block) with title, key `00855d9f…:1` and link `https://github.com/Ventusltd/globalgrid2050/blob/c66759f0…/…/pilot-rules.js#L1`; empty click closes it; 0 pageerrors, 0 console errors/warnings; 3 GETs all 200 | renders, tap opens card with GitHub link | PASS |
| 18 | editions pointer | `cat -n editions/index.html`; `grep -o 202610311905 \| wc -l` | 3 (line 7 meta refresh, line 11 link, line 12 `location.replace`); `editions/README.md` lists the edition | 3 | PASS |
| 19 | NOTICE, licences | `cat NOTICE.md`; `head -3 /tmp/q5/LICENSE` | NOTICE.md present (Apache-2.0 code, CC BY 4.0 text/data, quotes keep CERN-OHL-S / ODbL / OGL); repository LICENSE is Apache 2.0 | present | PASS |
| 20 | inventory heads vs now | per clone `git fetch -q origin; git rev-parse origin/main` | 8 moved: data-grid-gb b57c94d4→01a4491d, gridatlas cacb69a7→41729af0, globalgrid2050 c66759f0→35b5be2f, kuiper-belt b243e38d→55337bf8, particle-physics-drawing-engine eb52ad7e→e5112779, stars cbca125b→529ae158, time-stone a1703b1b→c507d8ce, ventus-grid-engine 96a800eb→5eead830; 18 unchanged; pipelinenews origin/main still 67aa2eb0 | gridatlas and data-grid-gb moved | NOTE D5 |
| 21 | local paths | `grep -rn -E '/home/[a-z]+\|/root/\|/Users/' .` (worktree folder) | 50 hits in 29 files: BRIEF.md:31, CONTROLLER-BRIEF.md:9-10, belt/rules.txt:13, proof/202610311905-belt.json:18, 20 worker files, 5 chapters; `/tmp/w20` in proof/denominator.tsv:1-2 and proof/duplicates.tsv:2 | none | NOTE D2 |
| 22 | e-mails | `grep -rno -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}'` | only `actions@users.noreply.github.com` (2), `noreply@anthropic.com` (1), `private@example.invalid` (1); no owner address | no personal address | PASS |
| 23 | private repository names | kuiper-belt's own guard: `check_proof.leaks` over `editions/` (54 files) and `python3 -I tools/ci_check.py` in the worktree | 0 of 54 match a private digest; ci_check: K1 495 tracked files 0 matches, K2 agree, K3 13 tools 5 pages, K4 0 out of order, RESULT PASS | 0 | PASS |
| 24 | repository visibility | `curl -H "Authorization:" https://api.github.com/repos/Ventusltd/<repo>` for the 26 | 200 for data-grid-gb, globalgrid2050, gridatlas, kuiper-belt, pipelinenews (`private: false`); 403 from the session proxy for the other 21 | all public | 5 CONFIRMED public, 21 UNVERIFIED (proxy scoping) |

## Defects

**D1 MINOR, introduced by this release.** `proof/edition-sha256.txt` does not verify from the branch. The mirror's
`workers/W17-globalgrid2050-shepherd.md` carries CRLF on seven quoted lines (217-218, 223, 258-259, 264-265); the
repository's `.gitattributes:3` (`* text=auto eol=lf`) normalised them on commit, so the committed blob differs from the
bytes the manifest hashed. Key: `kuiper-belt@5bf5202 editions/202610311905/proof/edition-sha256.txt` (W17 line) against
`git show 5bf5202:editions/202610311905/workers/W17-globalgrid2050-shepherd.md`. Reproduce: `cd /tmp/q5/editions/202610311905
&& sha256sum -c proof/edition-sha256.txt` → `./workers/W17-globalgrid2050-shepherd.md: FAILED`, 50 OK. Suggested fix:
convert W17 in the mirror to LF (note the quoted lines were CRLF at source) and recompute the manifest from the committed
bytes (`git show` or `git hash-object` over the tree), so the manifest obeys LAWS.md L9 the way the rest of the repository does.

**D2 NOTE, pre-existing pattern.** Machine paths in shipped files: `/home/user/estate,/home/user` in `belt/rules.txt:13` and
`proof/202610311905-belt.json:18` (the `--roots` argument), `/home/user/...` in `BRIEF.md:31`, `CONTROLLER-BRIEF.md:9-10`,
`/tmp/w20/...` in `proof/denominator.tsv:1-2` and `proof/duplicates.tsv:2`; 50 occurrences in 29 files including workers and
chapters. No secret, but the layout of the cutting machine. Suggested fix: print `--roots` relative or as `<roots>` in the
record, keep the full line in the harness log.

**D3 NOTE, introduced by this release.** `belt/rules.txt` embeds `sys.argv` and `git --version` (`edition_belt.py:119-120`),
so its digest in `proof/202610311905-belt.json` reproduces only with `--out .` and git 2.43.0; the law lines themselves are
stable. Suggested fix: hash the law block and the command line separately.

**D4 NOTE.** README "eight lines were cited by two chapters and are one body each": eight keys do carry two rows, but one pair
is W13 twice in the same chapter (`learn-the-kuiper/index.html:7`) and three pairs are the same blob at two commits, not the
same cited line. Wording only.

**D5 NOTE.** Inventory heads have moved for 8 of 26 repositories (check 20); gridatlas and data-grid-gb as the brief expected,
also globalgrid2050, kuiper-belt main, particle-physics-drawing-engine, stars, time-stone, ventus-grid-engine. The register
pins commits, and the belt reproduced byte for byte against the moved clones, so no body is affected.

**D6 NOTE.** The viewer's hud (two lines of law text) overlays the top of the annulus at 1280x800 (screenshot taken during check 17).
Cosmetic.

## What is good

- The belt is reproducible to the byte from `register.tsv` and the clones (`belt.json` 22b6f5be…, `bodies.json` 70c212dc…),
  five seconds, after two clones moved; the key is the blob, so the pin holds. (check 10, 11)
- The law in the file is the law in the generator and the law the wafer ships: 346 of 346 positions recompute, k=1 turns
  +222.49°, y is drawn up (`belt/index.html:28`), no edges. (check 16, 17)
- Every sampled destination opens: 25 of 25 raw fetches hash to the key's blob; the card carries the commit-pinned GitHub link. (check 14, 17)
- The repository's own K1 privacy guard and `ci_check.py` pass on the branch (495 tracked files). (check 23)
- `editions/index.html` names the stamp in three places; `NOTICE.md` names every licence a quote can carry. (check 18, 19)

## Verdict

PASS with one MINOR: the edition's own manifest fails for W17 from the branch (CRLF normalised by `.gitattributes`); belt, law,
keys, destinations and viewer are CONFIRMED; 9 API destination checks and 21 repository visibilities are UNVERIFIED by session scoping only.
