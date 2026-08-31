# Supervising review — 202608312115 sector and maths gates

This note supplements `202608312120-build-plan.md`. It records independent
browser and payload checks; it does not authorise a deployment.

## Sector Intelligence

Chrome was used to open every topic in release `202608312037`. The visible
examples were not edge cases: 35 of 51 rows are irrelevant GOV.UK search hits,
five EC energy stories are useful but filed under the wrong topic, and only 11
rows are correctly placed. The same 18 GOV.UK URLs are duplicated into 35 rows.

The fault is in collection, not project binding:

- `govukItems()` accepts `payload.results.slice(0, 6)` with no relevance rule;
- `topicRow()` assigns every accepted item to `source.topic_code`;
- `order=-public_timestamp` suppresses GOV.UK's default relevance ordering;
- all project binding counts remain zero.

The six GOV.UK topic queries therefore accepted weak, newest-first matches and
called `SOURCE_DEFINITION_TOPIC` evidence. Being returned by a search endpoint
is acquisition provenance, not evidence that an item belongs to a topic.

`tools/intelligence/audits/sector_topic_relevance_audit.mjs` is a measured
regression oracle for the current payload. It identifies 12 displayable rows:
the original 11 correct rows plus one EC solar story reassigned to worldwide
PV. It withholds 39 rows: 35 irrelevant GOV.UK results and four useful EC
energy-security stories for which the current seven-topic UI has no honest
home. Zero rows in a topic is permitted; padding is forbidden.

The final collector should record a matched rule ID and matched evidence tokens
for every assignment. Source identity alone must never be the assignment basis.
Add negative fixtures from the live failures: Kidlington dump, biometrics FOI,
Scotland firing times, retail sales, conversion practices and school funding.

## Newspaper

Release `202608312114` correctly removes project name, capacity, operator and
county from unbound sector rows. This must be tested as a group: blanking only
the project name left a live Australian story captioned with a UK capacity,
operator and county in the superseded release.

The scanner should use positive engineering/business evidence rather than a
denylist. Neutrality is a presentation and scope rule: named geopolitical topic
tabs can be withdrawn, while an engineering story about supply, shipping,
components or price can later enter a neutral topic if it passes explicit
technical evidence rules.

## GridAtlas gates missing from tomorrow's plan

Two measured correctness defects must be added before further central-mode UI:

1. Central sizing squares `inverters per skid`. The shipped default reports
   211.2 MW although inverter nameplate is 105.6 MW and aggregate transformer
   nameplate is 52.8 MVA. Disable central auto-fit until fixed with an
   independent dimensional fixture.
2. The real substation voltage audit finds 229 OSM voltage strings misparsed;
   204 can display an impossible primary voltage above 400 kV. OSM `voltage`
   tokens are volts, including values below 1000; only explicit `kv` fields are
   already kV.

Botley West should default to an inferred AC-export basis using applicant
evidence: 840 MW at POI, 890 MW before stated losses, and the latest 935.31 MWp
DC scheme. The current string-mode BETA fixture is 90 skids / 18 rings,
931.392 MWp DC and 887.04 MW inverter AC, with all three capacity numbers shown
separately. Central mode remains `not computed` until corrected.
