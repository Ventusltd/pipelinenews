---
name: build-source-grounded-sales-intelligence
description: Build or review public-source sales and deal intelligence in PipelineNews. Use for material events, organisations, commercial roles, grid milestones, opportunities, podcast evidence, data centres, source attribution, claim verification, abstention or public/private intelligence boundaries.
---

# Build source-grounded sales intelligence

Treat every intelligence output as a claim with evidence, not as a convenient fact.

## Work in three layers

1. Keep public evidence reproducible: source, URL, publication/observation time, excerpt or structured field, collection method and hash where possible.
2. Keep derived intelligence explicit: rule/model version, entity key, assertion type, confidence basis, limitations and decision.
3. Keep private sales workflow out of the public repository. CRM notes, contacts, outreach, relationship state, budgets and deal stages belong in a controlled private system.

Never allow a derived or private field to overwrite a public-source fact.

## Apply the claim gate

For every proposed assertion:

1. Define its grain and stable key.
2. Classify it as `FACT`, `SOURCE_CLAIM`, `INFERENCE` or `ABSTAIN`.
3. Record identity confidence separately from event or commercial-role verification.
4. Preserve the source URL and as-of time.
5. Use `ABSTAIN` when the evidence does not establish the claim.
6. Fail the release if a critical claim lacks evidence or violates the declared schema.

No source means `ABSTAIN`.

## Block unsupported commercial inference

- A headline mentioning two organisations does not establish buyer, seller, lender, EPC, ICP, OEM, supplier or adviser roles.
- A podcast appearance does not establish a prospect, customer, partner, referral, relationship or buying intent.
- A job title is valid only as observed at the source date; do not silently promote it to a current role.
- Do not infer budget, spend, probability, contact details, procurement stage or deal value.
- Do not use fuzzy identity alone for a publishable person, organisation, project or facility link.
- Data-centre capacity must distinguish IT load, requested grid capacity, contracted capacity and operational capacity.
- Data-centre entities must distinguish campus, facility and building.

## Build auditable releases

- Freeze predecessor versions; create a new addressable version for every material capability.
- Declare schema, grain, primary key, source register, hashes, controlled vocabularies and null policy.
- Keep backfill separate from forward updates.
- Make acceptance, rejection and abstention ledgers inspectable.
- Test identity canaries, exact counts, duplicate keys, missing sources, role nullability and recovery.
- Publish browser projections only from a validated release artifact.

Read [Ventus public-evidence rules](references/ventus-public-evidence.md) before adding podcasts, data centres or opportunity reasoning.
