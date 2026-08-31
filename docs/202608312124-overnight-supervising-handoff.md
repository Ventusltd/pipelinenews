# Overnight supervising-engineer handoff — 202608312124 UTC

This is the durable continuation point for a fresh Codex session. It records
what was observed in the live browser, what was measured offline, what Claude
has published, and what remains unsafe. It does not authorise a deployment.

## Operating brief

- Spend at least five hours browser-first: click, drag, minimise, restore,
  resize, scroll and replay the real user journey. DOM inspection and tests are
  supporting evidence, not a substitute for seeing the UI.
- Main priority: Pipeline News -> MAP -> stable GridAtlas -> substations turn on
  automatically -> neon candidate links and measured distances appear -> the
  project card offers the layout -> the layout fits the selected project's
  capacity on an explicitly stated BETA basis.
- Work as an independent checking/supervising engineer. Treat Claude's latest
  build as untrusted until replayed. Log defects with exact evidence.
- Use isolated worktrees and local commits. Preserve dirty main checkouts.
- Do not push, publish, or replace Claude's production builds without Vikram's
  explicit approval.
- Use neutral engineering and business language. Do not turn distance into a
  judgement about whether a project is close, remote, good or bad.
- BETA uncertainty should alter the scenario, not stop the illustration. Show
  the assumption, confidence/evidence and one-click AC/DC/unknown override.

## Live test links at handoff

- Current Pipeline News release:
  https://globalgrid2050.com/pipelinenews_intelligence/202608312114/?technology=solar
- Earlier known-good MAP handoff release:
  https://globalgrid2050.com/pipelinenews_intelligence/202608312037/?technology=solar
- Stable GridAtlas:
  https://ventusltd.github.io/gridatlas/atlas/
- Botley West direct Atlas link:
  https://ventusltd.github.io/gridatlas/atlas/?repd_ref=12588&project=Botley+West&technology=solar&capacity_mw=840&latitude=51.8132088&longitude=-1.3489728&zoom=12
- GlobalGrid2050 homepage:
  https://globalgrid2050.com/
- Original GIS/SLD sandbox:
  https://globalgrid2050.com/solar-bess-topology-v7/gis-sld-financial-sandbox/index.html

## What the browser has proved

### End-to-end handoff

On Pipeline News `202608312037`, physically clicking Botley West's MAP action
opened the stable Ventus GridAtlas. The Subs layer auto-activated and five
candidate links appeared:

- Yarnton, 132 kV, 3.43 km
- Eynsham, 33 kV, 3.81 km
- Green Lane, 33 kV, 4.56 km
- Lovelace, 33 kV, 6.00 km
- West Oxford, 132 kV, 8.61 km

The card offered **Lay out a scheme here** and the layout opened. These are
proximity candidates only, not confirmed connection points or cable routes.

### Layout defect still visible

The Botley West layout did not fit the 840 MW project. It opened with the old
example totals (about 279.4 MWp / 268.8 MW / 30 blocks) and a `not stated`
basis. The next build must display three distinct quantities rather than
silently treating one register number as all of them:

- 840 MW export at the point of interconnection;
- 890 MW plant-side AC before stated losses/ancillary load;
- 935.31 MWp DC in the latest applicant evidence.

### Current Pipeline News `202608312114`

- The newspaper renders 132 matches: 47 project-bound and 85 sector rows; four
  are withheld.
- Unbound rows now correctly say `sector headline · no project binding` and no
  longer inherit a project's name, capacity, operator or county.
- The masthead still says `136 HEADLINES · 47 UK · 19 INTERNATIONAL`; this is
  inconsistent with the visible 132-match filtered result.
- Relationship Evidence is still a user-facing dead end. Opening it shows three
  large candidate counts whose decisions are all `ABSTAIN` / no join. It does
  not answer a user question.
- Project Intelligence — Where to Look First remains misleading because it
  mixes taxonomies and presents its buckets as actionable intelligence.
- Grid Proximity still uses grading language such as STRONG, MODERATE, DISTANT,
  REMOTE and TARGET ACQUIRED. Replace this with measurements, source coverage
  and method. Let the user decide what a distance means.

## News and sector-intelligence audit

The `202608312037` sector payload contains 51 rows:

- 11 correctly filed rows;
- one useful EC solar story that can be reassigned to WORLDWIDE_PV;
- 35 irrelevant GOV.UK search results;
- four useful EC energy/security stories with no honest home in the current
  topic taxonomy.

The collector, not project binding, is the root fault. `govukItems()` accepts
the newest six search results with no affirmative topic rule, and `topicRow()`
then assigns the requested topic as if acquisition provenance were evidence.
The same 18 GOV.UK URLs are duplicated into 35 rows. Empty topics are valid;
quota padding is not.

The local regression oracle is:

`tools/intelligence/audits/sector_topic_relevance_audit.mjs`

Run baseline mode against release 2114 to reproduce the measured envelope.
Run `--require-clean` against a repaired future payload; it requires zero
unmatched or misfiled rows without freezing the future row count.

Use positive evidence rules, not geopolitical or general-purpose denylists.
International items are welcome when genuinely about solar PV, BESS, grid,
inverters, components, material projects, capacity, deployment, supply chains
or engineering/business impacts. Named geopolitical tabs are withdrawn until a
neutral supply/logistics topic has an explicit technical evidence contract.

## Grid maths and sizing gates

### Stop-ship: central-mode dimensional error

The central sizing path squares `inverters per skid`. With the shipped default
it reports 211.2 MW although aggregate inverter nameplate is 105.6 MW and
aggregate transformer nameplate is only 52.8 MVA. The existing proof repeats
the faulty formula and therefore certifies the same mistake.

Correct dimensional quantities are:

- `skidCount = skidsPerRing * rings`
- `inverterCount = invPerSkid * skidCount`
- `inverterAcTotal = inverterRating * inverterCount`
- `transformerLimit = skidMVA * skidCount * powerFactor * loading`
- usable AC is constrained by the smaller applicable limit.

Disable central auto-fit until an independent fixture proves this.

### Botley West BETA default

Project-specific applicant evidence overrides the generic estate ratio. A
defensible string-mode illustrative fit is:

- 660 W modules;
- 28 modules/string;
- 20 strings/inverter;
- 28 x 352 kVA inverters/skid;
- 10 MVA skid;
- five skids/ring;
- 90 skids / 18 rings;
- 2,520 inverters;
- 1,411,200 modules;
- 931.392 MWp DC;
- 887.04 MW inverter AC;
- 900 MVA aggregate skid nameplate;
- 50 MVA/ring;
- DC/AC ratio 1.05;
- residual from the 890 MW plant-side target: -0.333%.

Required red notice:

> BETA INFERENCE — applicant evidence identifies 840 MW as AC export. This
> illustration targets 890 MW before stated losses and infers equipment counts;
> it is not a design freeze, connection offer, or verified equipment schedule.

### Stop-ship: voltage-unit interpretation

An audit of real OSM tags found 229 substation voltage strings misparsed; 204
can display impossible primary voltages above 400 kV. OSM `voltage` is in volts,
including tokens below 1000. Only fields explicitly named `kv`, `kV` or
`voltage_kv` should be interpreted as kilovolts. Transformer ratios such as
`132000:11000` must be tokenised before unit conversion.

### Claims boundary

Distance and indicative routing do not establish headroom or connectability.
Fault level and thermal headroom require DNO/TO data and a study of impedance,
topology, infeed, committed connections, queue position and normal/outage
conditions. Route feasibility also requires right of way, wayleaves/easements,
crossings, terrain, ground conditions, land control and consent.

## Local branches and audit trail

Nothing below has been pushed.

### Pipeline News relevance audit

- Worktree:
  `C:\Users\vikra\OneDrive\Documents\GitHub\.codex-worktrees\pipelinenews-202608312115`
- Branch: `codex/202608312115-sector-audit`
- Based on Claude's `7723742` (`202608312120: issue log and build plan`)
- Files in this handoff commit:
  - `docs/202608312115-supervising-review.md`
  - `docs/202608312124-overnight-supervising-handoff.md`
  - `tools/intelligence/audits/sector_topic_relevance_audit.mjs`

### GridAtlas maths audit

- Worktree:
  `C:\Users\vikra\OneDrive\Documents\GitHub\.codex-worktrees\gridatlas-202608311946`
- Branch: `codex/202608311946-route-lab`
- Commit `2ff36e9`: real voltage-unit audit
- Commit `838e499`: Botley BETA sizing and central-mode defect report
- Report:
  `docs/coordination/20260831-botley-beta-sizing-supervision.md`
- Two unrelated untracked cartridge prototypes were present; preserve them and
  never stage them accidentally.

### CVAA portability repair

- Worktree:
  `C:\Users\vikra\OneDrive\Documents\GitHub\.codex-worktrees\cvaa-202608312048`
- Branch: `codex/202608312048-windows-selftest`
- Commit `e1c6523`: portable Windows self-test and missing diseased fixtures
- Full self-test passed: every antibody fired on disease and stayed silent on
  healthy fixtures.
- Not pushed.

## First overnight loop

1. Claim the open Chrome Pipeline tab and replay release 2114 physically.
2. Click Project Intelligence, Relationship Evidence and Grid Proximity; take
   screenshots and record exact user-visible claims before changing anything.
3. Replay Botley MAP end-to-end from release 2114 and compare with the proven
   2037 path. Confirm auto-subs, five links, card and layout.
4. Test drag/minimise/restore/resize/fullscreen and cable-vertex editing with
   actual pointer gestures, including a low-card restore and desktop layer
   visibility.
5. Fix the central formula in an isolated GridAtlas worktree, add independent
   dimensional fixtures, then re-run the full arithmetic proof. Do not publish.
6. Fix voltage parsing with real OSM fixtures and prove no impossible >400 kV
   primary is produced from low-voltage tokens.
7. Implement Botley string-mode inference locally with separate POI, plant AC
   and DC values, evidence, confidence and override.
8. Repair collection-time sector classification and run the clean oracle. Do
   not fill empty topics.
9. Re-run the browser journey after each build. Source/tests passing is not a
   UI acceptance result.
10. Log every finding and commit only scoped audit/build work; no deployment.

## Fresh-session prompt

Paste the following into a new Codex session:

> Continue the active five-hour overnight supervising-engineer run. Read
> `C:\Users\vikra\OneDrive\Documents\GitHub\.codex-worktrees\pipelinenews-202608312115\docs\202608312124-overnight-supervising-handoff.md`
> completely before acting. Use the browser-control skill and spend most of the
> run physically playing with the live UI, not merely reading source or DOM.
> Treat Claude's builds as untrusted until replayed. Main path: Pipeline News
> 2114 -> Botley West MAP -> stable Ventus Atlas -> Subs auto-on -> neon measured
> links -> project card -> correctly capacity-fitted BETA layout. Work in
> isolated branches, preserve dirty checkouts, commit audit trails locally, and
> do not push or publish without my explicit approval. Continue for the
> remaining time toward the five-hour minimum and keep me updated at least once
> per hour and whenever a material fault is found.

