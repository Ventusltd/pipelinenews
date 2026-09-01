# Hostile review reconciled against current GridAtlas and data-grid-gb

This receipt preserves the external review as evidence while separating the
version it attacked from the current owner product and consumer.

## 1. Cross-voltage envelopes: confirmed live debt, owner fix already landed

The review is right about `connection-points.v2`: its site-wide envelope mixes
voltage levels. v9.61 reduced the immediate harm by placing `Site-wide` and
`across the 400/132 kV buses ... not a value for any one bus` before West
Burton's figures, but that is a disclosure, not the final data model.

`connection-points.v3` already provides:

- WBUR 132 kV and 400 kV fault-current scopes separately;
- ABHA 132 kV and 400 kV separately;
- BLHI 132/275/400 kV separately.

The next consumer must select the declared connection voltage. For West Burton
Solar that is 400 kV. No site-wide circuit-rating range should be presented as
point-of-connection headroom; ratings remain published circuit facts, not
available capacity.

## 2. West Burton citation: current-code allegation is false/stale

The current declared table for REPD 10916 says:

`West Burton Solar Project Order, granted 24 Jan 2025 (EN010132)`.

Gate Burton is separately EN010131. No `2024/807` or Gate Burton citation is
attached to West Burton in the current cartridge. The reviewer correctly
confirms the substantive West Burton works wording and identifies SI 2025/116
plus correction SI 2025/647; adding the SI numbers would improve precision,
but replacing a supposedly wrong current citation would be repairing a defect
that is not present.

## 3. Token location joins: catastrophic v2 evidence, closed in v3 examples

The Aberdeen Bay windfarm joined to Marylebone in v2. In current v3:

- ABBA `ABERDEEN BAY WINDFARM`: no location is published;
- ABTB `ABERTHAW B`: 51.388379,-3.403117, `Aberthaw Substation`, using
  `distinctive_tokens_highest_voltage`;
- WBUR: 53.359219,-0.809114, `West Burton Substation`.

Thus the external finding validates the v3 join redesign. It does not establish
a current v3 false positive rate. The remaining v3 token tier still requires
the requested manual sample before broad trust.

## 4. Node-code voltage convention: valid warning, wrong dependency if applied to faults

The derived 1/2/4 convention is explicitly non-authoritative and 726 nodes are
inconsistent or undecodable. Circuit topology consumers must preserve that
uncertainty and must not decode digits 0/3/5/6/7 by analogy.

But v3 fault-current grouping does not use the node suffix. The network builder
reads Appendix D rows whose header is explicitly `Voltage (kV)` and stores that
numeric cell as `voltage_kv`; v3 groups those rows by that field. The convention
warning therefore remains material to circuit-node topology, not a rebuttal of
the v3 per-voltage fault grouping.

## 5. Earth radius: method improvement, low-severity and not a release blocker

R = 6378.137 km is the WGS-84 equatorial semi-major axis used as a spherical
radius. A mean-radius sphere (6371.0088 km) is a better global spherical
approximation; an ellipsoidal geodesic is the rigorous upgrade. The present
choice biases distances by roughly 0.112%, normally below the displayed
precision for these short links. This is a real methodology debt, but changing
the estate-wide canonical radius requires a new version and parity migration,
not an in-place edit. Straight-line/geodesic caveats must remain visible.

## 6-8. Primary-source confirmations retained

The review independently confirms:

- One Earth pink is correct, with connection voltage 275 kV; the consumer must
  not imply 400 kV;
- Thorpe Marsh pink/under-construction is correct;
- Little Crow's no-node/no-line representation is honest, including 99.9 MW
  export and the approximately GBP22m Keadby works statement;
- Tillbridge transformer/GIS wording, Cottam 400 kV and Heckington Fen/Bicker
  Fen survive primary-source checking;
- no gold-should-be-pink error was found in the reviewed set.

## 9. Counts now directly confirmed

Current v3 records confirm COTT 17 planned changes, THOM 19, and BLHI 16
circuits/15 changes. The researcher's byte-cap limitation is not a product
uncertainty. Headline v1/v2 counts remain historical; v3 location coverage is
502 rather than v2's 574 because ambiguous joins are withheld.

## 10. UI claims remain acceptance work

The external review could not exercise schema failure, mobile timing, stale
selection replacement or whole-UI grading language. Existing local proofs are
evidence, but the next generation still requires:

1. an unknown-schema browser scenario producing no network answer;
2. a real narrow-viewport Pipeline News MAP journey;
3. immediate declared facts, followed only later by measured distance;
4. rapid project-to-project selection with no stale card or distance;
5. an executable rendered-string scan for grading language;
6. explicit assertion that the displayed fault metric is the declared-voltage
   three-phase RMS break current, never peak/DC and never another voltage.

The first likely engineer misreading remains the fault-current line until the
consumer adopts v3. That is the load-bearing correction; the hostile review
strengthens, rather than changes, the existing promotion boundary.
