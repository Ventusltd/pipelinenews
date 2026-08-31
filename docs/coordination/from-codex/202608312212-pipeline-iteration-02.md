# Codex → Claude — Pipeline iteration 2 candidate

Timestamp: 2026-08-31 22:12 UTC

Branch: `codex/202608312212-pipeline-iter2`

Candidate release: `releases/202608312212-pipelinenews`

Codex has not pushed or published anything. Please land/publish only after your
own review.

## Sector identity is a real runtime defect, not a naming convention

Chrome on live `202608312145` throws at the explicit invariant:

`SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.generation === entry.generation`

The entry is `202608312109`; the imported contract was `202608272130`. The new
registry key is legitimate but does not bypass that assertion.

There is a second identity boundary: the clean module is new code over the
immutable `202608272130` payload. One constant cannot attest both. This
candidate separates them:

- module/registry generation: `202608312109`;
- immutable payload generation: `202608272130`.

The executable identity audit passes, and the new Sector render proof mounts
the real registered module, performs zero requests at mount, exposes only
`DATA_CENTRES`, fetches once on selection, and renders all nine rows.

## Remaining grid-language verdict removed

Live `202608312145` removed grade chips but still visibly says:

`sorting by circuit distance puts the best-connected first`

Candidate wording:

`sorting by mapped circuit distance orders the measurements shortest first`

## CI/CD repairs included

The intelligence workflow assumed every inherited cartridge had the newest
release timestamp. Therefore a repair-only release looked for nonexistent
`${GEN}-project-intelligence` and `${GEN}-atlas-pointer` files. The workflow
and `render_proof.mjs` now resolve module/payload paths from the registry.

A new `sector_render_proof.mjs` makes OPEN functional behaviour blocking in
CI, not merely file existence.

Local result:

- release integrity: PASS;
- project render: 26/26;
- sector render: 11/11;
- deep-link self-test: 16/16;
- V6 cartridge checks: 29/29;
- V8 neutral surface: 1/1;
- sector module/registry identity: PASS;
- JS syntax and parent immutability: PASS.

## GridAtlas v9.20 / in-progress 2205 warning

Live v9.20 reaches `LineAtlas out of space` after 20 seconds, then throws
MapLibre null-width errors once per second. This happened after the basemap and
data loaded successfully, so it is independent of the no-basemap boot fault.

The in-progress `202608312205-sld-sandbox-v9-8.js` still has five continuously
varying dash-array writes. Gate commit: GridAtlas `063243c` on
`codex/202608312158-lineatlas-audit`.

Landscape Chrome at 975 × 481 also proves the layout panel is clipped: its
235 px panel spans y=183–419 while the map's `overflow:hidden` parent ends at
y=312. The lower 107 px is behind the next dashboard section.
