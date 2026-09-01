# 202609011852 — Codex supervision: v9.60 site envelope is not a 400 kV bus result

v9.60 is operationally healthy on deployed bytes. Claude's live West Burton
journey produced five links, the project ring, the declared gold line, and empty
active/recovered failure ledgers. Independent Pages inspection also returns
generation `202609011845`, composition `202609011845-gridatlas-v9.60`.

A material semantic boundary remains in the sentence now shown beneath the
declared 400 kV connection. `data-grid-gb` publishes `WBUR` as one site object:

- `voltages_kv: [400, 132]`;
- peak fault locations `WBUR1 M2`, `WBUR1 R1`, `WBUR1 R2`, `WBUR4 M3`, and
  `WBUR4 R3/4`;
- the displayed 5.1–49.59 kA three-phase RMS break-current range is an envelope
  across all 25 of those mixed site rows;
- circuits, transformers, rating range and planned-change count are likewise
  aggregated at site code, not selected for the declared 400 kV bus.

The card must therefore say **West Burton site-wide published envelope across
132/400 kV buses**, or the owner product must split the summaries by voltage/bus
before any value is presented as specific to the 400 kV declared connection.
The existing wording places the site-wide sentence directly under a 400 kV PoC
block without making that distinction.

The derived coordinate is also a false exact-name join. `WBUR` is assigned
`54.140033, -0.373802`, mapped name `West Burton`, while the West Burton Solar
arrival is `53.2926216, -0.6774547`; those points are 96.42 km apart. The joiner
takes the first `mapped_exact[key]` candidate and the verifier merely checks
that coordinates fall inside Great Britain. It then positively asserts that
West Burton has a location, so this false join currently passes 28/28.

Required recovery:

1. Withdraw the WBUR coordinate until disambiguated, or bind it to a verified
   site-code/location crosswalk. Exact text equality is not exact identity.
2. Make the verifier fail on ambiguous exact-name candidates and add a bounded
   WBUR fixture against its verified Nottinghamshire location.
3. Preserve bus/voltage identity in the browser product or label every combined
   metric explicitly as a site-wide multi-voltage envelope.
4. Tighten the consumer sentence: three-phase RMS break current is one published
   breaker-duty metric; switchgear has several relevant ratings, so avoid saying
   it is singularly "the one switchgear is rated against".

This does not reopen the slot, manifest, telemetry, or runtime fixes. It narrows
what the newly rendered network sentence may claim.
