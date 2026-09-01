# Seven-hour Grid Computation 10× overnight scope

Owner instruction, 2026-09-01: use the laptop as the primary build and proof
engine, GitHub as version control and publication when needed, and deliver ten
new and improved timestamped versions across GridAtlas and Pipeline News. The
work must focus on grid computation. It must not manufacture ten cosmetic
version numbers or enlarge the existing SLD monolith ten times.

## Outcome

By the end of the shift the estate should have up to ten independently useful,
immutable, paired generations. Each pair consists of:

1. a GridAtlas computation or consumer improvement, implemented as a
   timestamped module or data cartridge with an executable proof; and
2. a Pipeline News journey/contract improvement that exposes or verifies that
   computation from the real MAP entry point without becoming a second source
   of grid truth.

“Up to ten” is a safety boundary, not permission to stop early. The target is
ten. A generation is counted only after local proof, complete composition
proof, immutable hashes, GitHub CI, deployed-byte verification and a mutual
board receipt. Failed candidates remain evidence in the shift ledger and do
not consume a release number.

## Non-negotiable scientific boundary

The products may publish what an authoritative source states and what the
software measures. They may not infer connection availability, queue position,
thermal headroom, reinforcement cost, fault-level acceptability, planning
success or whether a project is well placed. R/X/B, ratings and fault currents
may be carried as published parameters. A load-flow, fault-level or headroom
calculation requires its own validated model, base quantities, topology state,
operating scenario and benchmark cases; it must not be smuggled into a distance
or nearest-substation feature.

Every electrical quantity must retain:

- source and publication identity;
- voltage scope and bus/site scope;
- unit and base (including the ETYS 100 MVA base where applicable);
- study year/season/scenario;
- explicit nulls for unpublished fields;
- whether it is existing, planned, consented or under construction;
- a refusal to treat the result as a connection assessment.

## The ten paired generations

### 1. Provenance and product-contract closure

GridAtlas: make runtime, `atlas/current.json`, immutable composition manifest,
source registry and card text agree on the exact `data-grid-gb` schema, product
path, content hash and owner commit. Unknown or mismatched schemas return no
answer. Remove stale v2/v3 prose rather than interpreting it generously.

Pipeline News: stamp every MAP producer with the receiver contract it targets
and prove its emitted parameters against the currently composed GridAtlas
consumer. The journey must preserve `repd_ref`, project, technology,
capacity_mw, latitude and longitude; navigation-only parameters such as zoom
must be classified rather than mistaken for an electrical input.

Acceptance: a deliberately mismatched schema/hash and a stale manifest both
fail; the current product passes byte-for-byte.

### 2. Identity and coordinate trust

GridAtlas/data-grid-gb: separate exact identity from name similarity and
location. Quarantine unverified distinctive-token coordinate joins. Carry
join method, verification state and reconciliation gap with every location.
Never print a product-derived distance when location trust is insufficient.

Pipeline News: prove that MAP identity comes from the selected REPD record and
cannot cross-contaminate another project sharing a place name.

Acceptance: Aberdeen Bay must never resolve to Aberdeen Place in London; West
Burton must not inherit the wrong West Burton coordinate; exact REPD mismatch
is rejected.

### 3. Voltage-class exactness

GridAtlas: use explicit named voltage membership, never lower-bound bucketing.
750 kV must not become 400 kV, 110 kV must not become 66 kV, and an unparseable
or undeclared terminal remains null. Remove any voltage decoder based only on a
node-code digit unless the source documents it.

Pipeline News: carry declared connection voltage only where a primary record
supports it; otherwise omit it.

Acceptance: adversarial voltage fixtures plus the real register/product; no
cross-voltage envelope is possible in the returned object.

### 4. One-hop topology at the declared connection

GridAtlas: from the declared site and voltage, return existing circuit
landings, remote sites, circuit type and explicit local/remote voltages from
the ETYS node/branch product. Do not decode missing terminal voltage. Geometry
is presentation evidence only and must retain location trust.

Pipeline News: the MAP journey must open the declared project card immediately,
then fill this topology asynchronously without delaying the identity, citation
or project ring.

Acceptance: West Burton 400 kV returns only 400 kV landings; Little Crow’s DNO
circuit archetype remains a no-transmission-node result.

### 5. Transformer and two-hop chain

GridAtlas: publish transformers at the selected site by explicit terminal
voltage and carry their published ratings. Where a verified customer
substation exists, represent project → customer substation → transmission site
as two relationships and three separately measured points, never one inferred
connection line.

Pipeline News: distinguish “project beside an existing transmission
substation” from “project owns a newly built customer substation”.

Acceptance: Cleve Hill/West Burton-style customer-substation cases and a
nearby-existing-substation battery case are distinct types in data and UI.

### 6. Planned-change timeline

GridAtlas: expose ETYS planned changes touching the selected site and voltage,
grouped by source year, with existing network visually separate from future
changes. Planned, consented and under-construction are not interchangeable.

Pipeline News: connect project chronology to public network chronology without
claiming causation. A project article may link to the published network change;
it may not claim that the change creates capacity unless the source says so.

Acceptance: Cottam, Thorpe Marsh and Blackhillock counts reconcile to the owner
product; absent years and fields remain null.

### 7. Per-voltage, per-bus fault-current facts

GridAtlas: show NESO’s named three-phase RMS break-current metric only for the
declared connection voltage and identified bus rows. Preserve all other fault
metrics separately; never call the selected metric “the fault level” or the
only switchgear rating. Site-wide fallback must label itself before numbers.

Pipeline News: source/citation presentation only; no grading of suitability.

Acceptance: West Burton cannot show a range mixing WBUR1 and WBUR4; ABHA and
Blackhillock adversarial multi-voltage cases remain split.

### 8. Impedance and rating fact surface

GridAtlas: carry circuit R, X and B on the published 100 MVA base, circuit type,
length and seasonal rating fields with explicit missingness. Provide no load
flow, prospective current, losses or headroom result in this generation.

Pipeline News: explain in plain language that impedance is a model input and
distance is not its substitute, linked to the authoritative product.

Acceptance: source values round-trip exactly; a source without a seasonal
rating produces null, not zero; static proof forbids impedance arithmetic in
the consumer.

### 9. Measurement, geometry and uncertainty

GridAtlas: centralise geodesy in the timestamped module, declare the chosen
radius/form, and attach coordinate provenance and straight-line caveat to every
distance. Quantisation/rounding occurs only at presentation. Unverified joins
cannot produce authoritative-looking geometry.

Pipeline News: mobile MAP links must not show a stale measured value from the
previous selection. Immediate declared facts remain distinct from later
measurements.

Acceptance: historical haversine variants remain reported; current code uses
one form/radius; rapid successive selections cannot retain prior distances.

### 10. Integrated click computation and mobile acceptance

GridAtlas: compose the prior modules into one fail-closed click answer: identity,
declared public connection, verified location, voltage-scoped topology,
transformers, planned changes, scoped fault current, impedance/rating facts and
reconciliation gaps. Rendering remains a thin consumer. The 4,000+ line SLD
body must not grow for this composition.

Pipeline News: prove the complete sales journey at phone widths from real MAP
buttons for at least: Botley West (register-present), Craig y Perthi or another
register-absent project, West Burton Solar (declared customer substation), One
Earth (unbuilt/pink far end), Little Crow (DNO circuit/no line), and a BESS
case. Test portrait and landscape.

Acceptance: immediate identity/public record, progressive engineering detail,
five neon measurements where scientifically applicable, zero active failures,
no stale card, correct far-end colour/state, and deployed bytes matching the
composition hash.

## Local CI/CD execution model

The laptop is the primary compute engine. Each candidate runs, in order:

1. syntax and schema validation;
2. unit/module proof against adversarial fixtures;
3. proof against the real owner data product;
4. cross-repo Pipeline News producer ↔ GridAtlas consumer contract proof;
5. current composition proof for every cartridge;
6. parts/assembler atomicity and immutable-hash proof;
7. all-version historical scan and zero-match diagnostics;
8. CVAA inoculation and spiders-style source traversal;
9. scope/state deterministic regeneration check;
10. clean-tree and timestamp monotonicity check.

Only then may it commit and push. GitHub Actions are receipts and deployment,
not the primary compute engine. After Pages changes, fetch `current.json` and
every new artifact without cache, recompute hashes, and run the real browser
journey. A generation is not “live” merely because `git push` succeeded.

## Concurrency and ownership

- Claude, desktop Codex and phone Codex work only in named branches/worktrees.
- No agent writes to another agent’s worktree.
- `main` has one publication owner at a time, recorded on the shared board.
- Candidates are cherry-picked or rebuilt onto fresh `origin/main`; agents do
  not merge two independently modified composition pointers.
- Dirty/untracked user files are preserved. Automation may not use broad clean,
  reset or checkout operations against a workspace root.
- The local transcript harvester runs every 15 minutes and retains raw evidence
  only in the ignored `.local` path. Reviewed decisions go to the board.
- If another agent advances `origin/main`, publication pauses, fast-forwards,
  reruns all proofs, and only then resumes.

## Laptop resource policy

- Parallelise read-only history scans, module proofs and cross-repo analysis.
- Serialize operations that modify a worktree, composition pointer, Git index,
  Pages deployment or shared board.
- Prefer Node/Python/PowerShell processes with bounded memory and explicit
  timeouts. Avoid an unbounded process per historical commit.
- Use WSL/Linux tools when available for parity and line-ending checks, but
  never make a proof depend silently on WSL being installed.
- Cache immutable source downloads by content hash; revalidate metadata and
  fail on changed bytes.
- Keep the mobile/browser acceptance lane separate from CPU-heavy scans so a
  proof run cannot starve the interaction test.

## Stop-ship conditions

Stop publication immediately for any of the following:

- failed, skipped or missing proof for a composed cartridge;
- runtime/schema/hash/provenance mismatch;
- cross-voltage or site-wide quantity presented as a bus value;
- unverified coordinate join used for a distance or map node;
- inferred connection/headroom verdict;
- stale generation, manifest, pointer, badge or acceptance receipt;
- partial assembler publication or rollback not owned by the invocation;
- Pipeline News emitting an identity the receiver does not read;
- phone journey that appears inert, retains stale state or records an active
  failure;
- concurrent `main` publisher or diverged composition pointer;
- GitHub CI/deployed bytes not green within the bounded observation window.

## Evidence and final receipt

The final receipt must list every attempted candidate, including failures; the
ten accepted version pairs; exact commits, generations, paths and hashes;
local proof tallies; CVAA/spider results; GitHub workflow URLs; deployed-byte
hashes; phone/browser journeys and timings; remaining scientific limitations;
and every branch not merged. Context loss is not a reason to omit this: the
shared board, local transcript ledger, shift log and immutable repository
history are the recovery mechanism.

## GlobalGrid2050 homepage acceptance index

The root `index.html` in `Ventusltd/globalgrid2050` is tomorrow's human test
surface. It must contain exactly twenty new acceptance links in a clearly
labelled, mobile-readable section:

- ten direct GridAtlas links, one for each accepted computation generation;
- ten corresponding Pipeline News links that begin the real project journey
  and expose the same generation through its MAP action.

Each entry states the immutable generation, project/archetype, computation
being exercised, expected visible result and whether the far end is existing,
planned, under construction or a circuit rather than a substation. The index
must not link to a pending, failed or merely local candidate. A compiler/proof
must require ten complete pairs, unique identities, HTTPS targets, monotonic
generations, no duplicate URLs, and successful HTTP/deployed-byte read-back
before the homepage is committed. The stable current links remain available;
this is an acceptance matrix, not a silent replacement of history.

## Authority required for this shift

The owner authorises local read/build/test processes in the four named
repositories; timestamped module, proof, data-product and coordination-file
creation in isolated branches; bounded authoritative public-data downloads;
Git fetch/push for those repositories; GitHub Actions/Pages observation; local
browser acceptance; and the installed read-only transcript harvester.

This scope does not authorise deleting user files, rewriting history,
force-pushing, changing repository visibility, modifying credentials, widening
the governed Atlas register, publishing inferred engineering advice, or
allowing multiple agents to race `main`.
