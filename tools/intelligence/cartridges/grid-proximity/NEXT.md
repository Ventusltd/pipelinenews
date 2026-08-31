# grid-proximity — what is parked, and why

Shipped in this generation. Everything below is deliberately **not** in it, so
that what is in it can be trusted. Ordered by value per unit of effort.

The rule this list holds: **nothing enters the model from memory.** A voltage
threshold, a licence area, a connection practice — each needs a citable source
before it is coded, or it is a guess wearing a number's clothes.

---

## 1. Voltage taxonomy from official sources

The model currently knows five transmission voltages because they are the five
pinned layers. It does not know what voltage a given project would actually
connect at, and it must not pretend to.

Needed, with sources cited in the payload:

- **ENA** — Engineering Recommendation G99 / G100 connection thresholds, and the
  ENA Open Networks published practice on connection voltage by capacity.
- **NGET** (formerly WPD), **UKPN**, **ENWL**, **Northern Powergrid**, **SP
  Energy Networks (SPEN)**, **SSEN** — published Long Term Development
  Statements and licence area boundaries. Each DNO publishes its own
  capacity-to-voltage practice; they are not identical.
- **IDNOs** — presence and adopted networks; an IDNO connection changes both the
  route and the commercial position.
- **National Grid ESO / NESO APIs** — connection queue, Gate 2 status, headroom.
- **Non-standard voltages** — 12 kV and 20 kV exist in parts of the network and
  are absent from the pinned layers entirely.
- **Offshore wind** — export circuits run at voltages and on routes that do not
  follow the onshore pattern; 220 kV is already in the set and is largely
  offshore export cable.
- **Network Rail** — 25 kV OHL and its feeder substations; **London Underground**
  — already present in the Atlas layer set.
- **Heavy energy users** — steel, water pumping, emitters. Already in the Atlas
  via the emissions layers.

Until these are cited, `grid_probable` deliberately bands on **measured geometry
only** and publishes what it does not model.

## 2. ~~The 33 kV and 11 kV layers~~ — done

Shipped. 33 kV added as 104,557 line segments across eleven regional files;
UKPN 11 kV added as 15,126 estimated substation points, capped at 15 km so a
project outside the licence area reports null rather than a meaningless number.
489 projects are now nearest to 33 kV, and transmission and distribution
distances are published separately so a 500 MW scheme reads the one that
applies to it.

## 3. DCO and NSIP grid data

Nationally significant projects publish grid connection detail through the
planning process that smaller schemes do not. It is public, but it should be
**found rather than advertised** — surfaced behind an existing control, not
announced on the face of the app.

Route: ingest from the published examination libraries, join on the REPD
reference already in the spine, and expose through the existing map control
rather than a new banner.

## 4. Route rather than straight line

Every distance in the estate today is a straight line. The mapped road and rail
network is already held. A weighted graph search over it turns "how far is the
grid" into "what would it cost to reach it", which is the question that is
actually paid for.

Weights to be set by the architect, not assumed: road verge, private land,
watercourse crossing, and rail crossing as a directional drill rather than an
open cut. The geometry is solved; the cost model is domain judgement.

## 4b. Grid literature as newspaper source

The news algorithms are already advanced; what they lack is grid-side source
material. Three feeds are both model input and newspaper copy:

- **DNO local grid planning guidance** — each licence area publishes its own,
  and it moves. It is the earliest public signal that a corridor is opening or
  closing.
- **National Grid Gate 2 connection literature** — queue reform, Gate 2
  criteria and the published outcomes. A project changing Gate status is a
  headline and a model input on the same day.
- **DNO Long Term Development Statements** — the same documents that carry the
  voltage practice in item 1.

Feeding these into the news engine costs little beyond the ingest, and the
same parse serves the `grid_probable` model. It is the cheapest place where
one piece of work pays twice.

## 5. Integration with what already exists

Pipeline News already has a working map control and a news alert. Both are
better homes for this engine than another panel:

- the map control can take the indicative connection geometry directly,
- the news alert can fire on movement in the bands, not just on headlines.

Neither should become a second visual language. Additive, inside the freeze.

## 5b. Fault level and headroom — only if genuinely open

Not a priority, and previously declined. Revisit only on this condition: an
open API with no paywall and no login. Several DNOs publish network capacity
and embedded capacity registers as open data, but **that must be verified
before a line of code is written** — the claim that a given feed is open is
itself something to check, not assume.

There is a pandapower clone already in the estate. Pandapower can model fault
level and thermal headroom properly, but it needs network impedance data that
the open layers do not carry. Without impedances it would produce numbers that
look authoritative and mean nothing, which is worse than no number. So: source
the data first, model second, and only if the data is genuinely free.

## 6. Housekeeping

- `src/geodesy.py` in `grid-distance-maths`, so the Python builders and the
  browser share one implementation instead of one each.
- `tools/intelligence/render_proof.mjs` is hardcoded to the project-intelligence
  payload filename, contract name and mount function, so it can prove exactly
  one cartridge. It should read the registry instead. Until then each cartridge
  carries its own `proof.mjs`.
- The segment index registers a segment by the cells its bounding box touches.
  A very long diagonal span can still be evaluated in a cell it does not pass
  through — harmless, only wasted work — but the reverse is now impossible.
