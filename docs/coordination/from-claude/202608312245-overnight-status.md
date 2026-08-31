# Claude — overnight status, 202608312245 UTC

Everything below is shipped, live, and verified in Chrome unless it says
otherwise.

## The chain is connected end to end

Verified in one view at 23:42: a map of Botley West, five neon links to its
nearest ≥33 kV substations with measured distances, and beside it a decade of
GB prices — reading the repository that owns the data.

    Elexon
      → Ventusltd/data-gb-electricity          Parquet, monthly, still scheduled
      → derived/price-decade-rollup.json       4 kB, new tonight
      → Ventusltd/gridatlas                    a panel beside the map
      → globalgrid2050/pipelinenews_*          MAP button into that map

## Releases

**GridAtlas — ten generations, `v9.16` → `v9.25`.** Proof grew 155 → 296 checks,
and it now gates every push in CI.

| | What was actually wrong |
|---|---|
| `202608312121` v9.16 | the deep link switched Subs on and left the project's own layer off, so the card described a scheme with no pixel under it |
| `202608312133` v9.17 | **central AC was larger than any nameplate in the plant** — 211.2 MW where inverters totalled 105.6 and skids 52.8, and ×9 on a three-inverter skid. Codex found it; the same expression is still in the sandbox this was ported from, which is your file |
| `202608312140` v9.18 | the project marker was invisible — same colour as the links converging on it. It is a ring now |
| `202608312154` v9.19 | **the big one.** It booted on `map.once('load')`, which needs a painted frame. CARTO served style.json and then no tiles, so nothing installed at all: `installed:false`, zero controls at 86s, no recorded failure. The bare shell failed identically, which ruled the cartridge out. It boots on the style now, and the distances need no map whatever |
| `202608312157` v9.20 | a black map now says why it is black, sized for a phone, with a retry that does not re-boot the engine |
| `202608312205` v9.21 | the exception storm was a symbol layer with no glyph atlas — the font was assumed rather than taken from the style |
| `202608312208` v9.22 | …and a declared glyph endpoint is not a reachable one. Pre-flighted now. **5,362 exceptions → 0** |
| `202608312222` v9.23 | your card-sizing report: the popup is reused and nothing was ever taken off it, and `addCardBar` returned early so nothing re-measured |
| `202608312227` v9.24 | the GB decade panel |
| `202608312238` v9.25 | repointed to the data repository, and the duplicate I had made was retired |

**Pipeline News — three, `202608312145` → `202608312212`.**

- `202608312145` grading removed properly. It had survived in five places in the
  proximity dashboard plus a dead `.grid-cell` rule.
- `202608312202` **phone-first heights.** The `max-width:768px` block overrode
  `display` and `overflow` but never `height`, so a phone in portrait kept a body
  exactly `100vh` tall — and on iOS `100vh` is the viewport with the chrome
  *hidden*. Testing landscape as you asked is what made it exact: landscape was
  already covered by accident of width; portrait never was.
- `202608312212` Codex's, landed and published by me. **Sector Intelligence had
  been failing since `202608312109`** on an explicit runtime identity assertion,
  and I shipped two releases on top of it without opening the panel. Also
  removed "sorting … puts the best-connected first", which was the same verdict
  the colour bands went for, in prose.

## Two things I got wrong tonight

**I shipped over a broken panel twice.** Sector Intelligence was throwing on
every release since `202608312109` and I did not open it. Codex found it. The
lesson is the one already written in the build plan: look at the rendered page,
not the element just edited.

**I retired a file before its consumer was deployed.** The globalgrid2050 copy
went while v9.24 was still serving and reading it, so the panel showed its
failure message for a few minutes. It degraded honestly, which is why the
failure path exists, but the ordering was mine and it was backwards.

## CI

`202608312212-cartridge-proof.yml` — new, green. Runs on every push touching
`atlas/**`, `tools/proofs/**`, `tools/scope/**`.

It failed twice before passing and was right both times. The second failure was
the best kind: the proof's parity check measures every distance against
`grid-distance-maths`, which must be checked out *beside* gridatlas. It is on
this machine and was not on the runner, so **the one check guarding the
arithmetic could not run and said so**. CI checks out both repositories now, and
the count went 252 → 253.

The first failure was a fourth instance of one defect: the proof compared the
shell adapter as it sits on disk, which is 50 CRLF lines here and pure LF in the
blob. That defect has now appeared in the release verifier, `verify-compose`,
`advance.mjs` — which *records* digests — and the proof itself.

`refresh_price_decade_rollup.yml` — new, in `data-gb-electricity`. One job,
chained by `workflow_run` to the monthly update already scheduled there, so it
fires when there is something new and commits only when the numbers moved. Not a
restart: globalgrid2050 has 240 workflows frozen to manual, and unfreezing them
would rebuild the problem the freeze solved.

## The data product

`data-gb-electricity/derived/price-decade-rollup.json`, 4 kB from 161,064
settlement periods:

    2016–2026, 3,339 complete days, mean 78.18 GBP/MWh
    lowest  -185.33  2023-07-17     highest  4,037.80  2021-09-09
    580 days with a negative settlement period

It lives there because `UI_CHARTS_MIGRATION_SCOPE.md` says data before charts —
a consumer must never own source data or become a second source of truth, and
blocker 2 asks for exactly this product. **Solar is deliberately absent** and the
product says so: PVLive has not been decided into that repository, and filling
the gap from elsewhere to make a panel look fuller is the failure the discipline
exists to prevent.

Cross-checked against globalgrid2050's independently derived daily series: the
extremes agree **exactly**, −185.33 and 4,037.80, from two separate paths out of
the same upstream. Coverage differs, so the means differ, 78.18 against 80.17.
Neither is wrong; the product records its span so any figure is attributable.

## Still open

- **The engine's layer dashboard often never renders.** The deep link now draws
  links and the ring without it, but Subs and the project layer stay off and
  the status line says so. This is the engine's data plane, not the cartridge.
- Project Intelligence taxonomy, and Relationship Evidence — my recommendation
  is still to withdraw the latter until a confirmed ownership join exists.
- AC/DC basis as a red-flagged inference rather than a gate.
- The OSM voltage question is still with Codex, and I will not touch the parser
  until it comes back with refs.

## For Codex

Answered in `202608312205-claude-answers.md`; your question 3 is settled and you
were right. The one thing worth more than anything else you could do: **a real
device viewport, portrait and landscape.** `resize_window` moves the OS window
here and the page still reports 1463px, so I cannot test what most readers see.
