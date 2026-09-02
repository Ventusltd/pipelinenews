# Session context, reconstructed at 202609020050

**Read this first if you are picking the estate up cold.**

## What this file is, and what it is not

Vikram asked for the laptop Claude's log files to be captured here. **They could
not be captured.** This session runs in an Anthropic cloud container, not on the
laptop: there is no PowerShell, no shell and no filesystem access to that
machine from here, and the egress proxy answers 403 to CONNECT for
`globalgrid2050.com` and `ventusltd.github.io`.

So this is a reconstruction from the record the laptop session actually left
behind, which is better evidence than a transcript anyway because every line of
it is committed and hashed:

- `pipelinenews/docs/coordination/BOARD.md` and `from-claude/`, `from-codex/`
- `pipelinenews/tools/overnight/shift-log.json`
- `gridatlas/tools/overnight/shift-log.json` and `gridatlas/STATE.md`
  (read over HTTPS from `raw.githubusercontent.com`, which is reachable)
- `gridatlas/atlas/current.json`
- the commit history of all three repositories, and the GitHub Actions runs

Anything below that rests on something I could not verify is marked as such.

## The two lanes

Two agents worked one estate overnight under a handshake
(`from-claude/202609012325-two-lane-handshake.md`): **Claude** owns Chrome, live
UI verification, publishing and pushes; **Codex** owns local source, maths,
payload and CI verification and does not push. Path ownership, a push protocol
and two shared files are set out there. Vikram's standing ruling governs both:
*"land on main every time using time stamps yearmonthdayhourminute-appname"*.

## GridAtlas: 9 live cuts overnight, v9.69 to v9.77

From that repository's own shift log — 41 runs, of which **9 live**, 30 failed,
1 dry, 1 committed-not-pushed. Failures are gates doing their job, not damage.

| Version | Generation | Step |
|---|---|---|
| v9.69 | `202609012211` | sizing-arithmetic (attended) |
| v9.70 | `202609012234` | data-contract-parity (attended) |
| v9.71 | `202609012243` | electrical-distance — hops, not kilometres |
| v9.72 | `202609012249` | rating-envelope — a structural refusal to sum ratings |
| v9.73 | `202609012308` | injection-response — the declared DC powerflow |
| v9.74 | `202609012317` | grid-at-point; collapsible layers dash |
| v9.75 | `202609012345` | planned-change |
| v9.76 | `202609020006` | owner-boundary |
| v9.77 | `202609020018` | powerflow-stopship |

Live composition is **v9.77 / `202609020018`**, shell `202608300453-atlas-v9`,
cartridge order streaming-parquet-bridge → uk-gazetteer-flyto →
substation-intelligence → sld-sandbox, live route `/gridatlas/atlas/`.

**v9.77 is the one that matters.** Codex's stop-ship of `202609020030` found two
P0s in the v9.73/v9.74 powerflow surface and both were real: the production
caller chose the first lexicographic bus as slack without checking connectivity
(the real 400 kV induced graph has 573 buses and **238 components**), and the
acceptance gate checked Kirchhoff at the injection bus alone, which a
disconnected pair can satisfy while the solve has not converged. Edge
deduplication also collapsed equal-reactance parallel circuits — keying on the
published row took modelled branches from 437 to 459. v9.77 ships components, a
declared sink in the same component, a refusal before the solver is asked for a
cross-component transfer, and acceptance as converged AND global residual AND
Kirchhoff at every bus. Both findings had the same shape: **the proof tested a
case the production caller never takes.**

## Pipeline News: the publishing failure Vikram found from his phone

*"none of the pipelinenews are on globalgrid2050.com since
/pipelinenews_intelligence/202608312339/"* — correct, and the cause was not in
any step's logs.

The bytes were never wrong. `202609012326` and `202609020025` were copied into
`pipelinenews_intelligence/`, verified byte-identical to their releases, pushed,
and deployed (Pages runs 143 and 145 both green). All 19 pre-existing snapshots
were re-verified here against their source releases: every one byte-identical,
the only difference anywhere an extra `README.md` inside `202608311343`.

**`index.html` is the only route a reader has to those directories, and it named
neither.** The newest reachable version was `202608312339`, three behind the head
of the lineage. The runner deliberately does not edit that homepage — naming a
release there is a separate act governed by a numbered-snapshot ritual — so no
single step failed. The gap was between two steps and nothing was watching it.
Same shape as the powerflow findings.

Two further holes fell out of the audit: `202608312244`, the direct parent of
`202608312339`, was built and never mirrored at all; and the homepage's Grid
Atlas row still advertised *CURRENT VERIFIED · v9.5 · 202608301624* while the
live composition was v9.77.

### Closed at `202609020042`

globalgrid2050 `c993b8e`, Pages run 146 green on all four jobs including the one
that curls the public host:

- `202609020025` is the current entry; `202609012326` above the demoted
  `202608312339`; `202608312244` published and placed in the chain. **20
  snapshots, all reachable, newest presented first.**
- the Atlas row names v9.77 / `202609020018`; markers, URL and the V8 sentinel
  untouched.
- `homepage_v012.html` snapshot taken, measured and recorded; the two earlier
  snapshots taken without a README entry identified from their contents and
  recorded rather than renumbered.
- `scripts/verify_published_versions.py` + a push-triggered workflow, **verified
  to fire on the unfixed page before being trusted** (all three findings, exit 1).
- pipelinenews `22dbf1b`: `tools/publication/202609020042-homepage-reachability.mjs`,
  wired into the runner so every cut records `homepage.named` and
  `served_but_reachable_from_nothing`.

### Four releases are deliberately not published

`202608311550`, `202608311557`, `202608312018`, `202608312337` are superseded
siblings that never became a parent of anything. `202609020010` declares
`ISOLATED_CANDIDATE_ONLY_NO_SHARED_POINTER` in its own manifest — it is paired
with the isolated Codex atlas lab route. They are named in the checker so they
are not unexplained absences.

## State of the queues

Pipeline News overnight steps at `tools/overnight/steps/`:

| Step | State |
|---|---|
| `202609012335-transmission-is-answerable` | done — release `202609012326`, published, now named |
| `202609012340-mapped-is-not-nearest` | done — release `202609020025`, published, now named. **Its success is not in the shift log**: the successful cut was made outside the runner or its log entry was lost when the laptop froze. The log's last entry for this step is a gate failure at `202609020023`. Reconciled at `202609020050` from the release manifest (`cartridge_added: mapped_is_not_nearest`) so the runner does not cut a duplicate |
| `202609012345-season-is-named` | pending |
| `202609012350-hops-are-not-kilometres` | pending |

## Open and not claimed

- **Chrome eyes.** No live page has been loaded by this session. Every live
  statement rests on workflow `curl` against the public host and on Actions
  conclusions. The interaction receipt for `#btn-gridpoint` and
  `#gridatlas-dash-toggle` is still owed by both lanes.
- **Two GridAtlas UI faults from Vikram's phone, unfixed**: HIDE LAYERS hides
  the whole application on mobile and sits out of place in full screen; and
  substations do not load for wind at all. This session has read-only access to
  `Ventusltd/gridatlas`; the attempt to attach it with push was blocked.
- **`V9.5.1` and `V9.6.1 Exact Commit Validation`** are red on globalgrid2050
  `main`. They were already red on `875a881` and `1f8ecfe` before this session
  touched anything. Not caused here, still red.
- **One fault of mine.** I loaded the overnight runner module to syntax-check it
  and it *ran*. It refused instantly on its own `working tree not clean` guard —
  nothing built, committed or pushed — but it appended a `failed` run to
  `shift-log.json` that no shift asked for. `node --check` from here on.

## Where the truth lives

- `docs/coordination/BOARD.md` — the channel between lanes. **Append, never rewrite.**
- `tools/overnight/shift-log.json` — every attempt including failures. Only
  `outcome: "live"` counts; `published` means the bytes are there and the host
  was not seen serving them.
- `gridatlas/atlas/current.json` — the live composition pointer.
- `globalgrid2050/state/current-gridatlas-v9.json` — `CANONICAL_GRIDATLAS_V9_POINTER_NO_MIRROR`.
  GridAtlas is **not** mirrored to globalgrid2050.com; the legacy path redirects
  to `ventusltd.github.io/gridatlas/`. Only Pipeline News is mirrored there.
