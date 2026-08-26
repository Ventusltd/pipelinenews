# Ventus public-evidence rules

## Podcast evidence

Ventus podcast episodes may support a market-pain taxonomy or search vocabulary. They do not prove that a guest, employer or named organisation is a current commercial opportunity.

Record episode URL, title, publication date, speaker role as stated at that time, relevant theme, evidence class and coverage limitation. Label the result `THEME_ONLY_NOT_OPPORTUNITY` unless a separate public source establishes a more specific current claim.

## Data-centre evidence

Use public official sources where their terms permit and preserve attribution. A directory such as Data Center Map remains a credited outbound source link unless licensed extraction is established. Regulatory publications can establish policy or grid-process facts, but they do not by themselves establish a particular site, capacity or deal.

Keep facility identity, lifecycle status, power-capacity type, commercial role and event verification as separate fields.

## Opportunity reasons

Public outputs may explain why a verified event could be relevant to a Ventus capability. They must show the evidence and rule used. They must not publish private relationship state, personal contact data, inferred spend, a fabricated deal stage or an unsupported probability.

The safest public product is a transparent reason-to-research, not a claim that a sale exists.

## API and freshness evidence

An endpoint returning HTTP 200 or a payload containing `health: ok` does not establish freshness. Record the source observation time, ingestion time, revision time where applicable, freshness deadline and scheduler state. Label an expired last-known-good artifact `STALE`; never preserve its old `live` label.

Keep market context separate from project identity and event verification. Generation, price, carbon, frequency, proximity and interconnector observations do not by themselves establish a project connection, constraint, curtailment, buyer, budget or deal.

Every adapter must disclose its source owner, record key, licence/attribution, adapter/schema versions, raw and output hashes, record counts, duplicate/null-key gates, evidence class and exact last-known-good recovery point. A failed or partial fetch must not overwrite the last independently verified product.
