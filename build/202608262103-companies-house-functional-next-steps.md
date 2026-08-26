# Companies House Functional Next Steps

**Status:** design instructions only  
**Created:** 202608262103 UTC

1. Create a manual root workflow at `.github/workflows/companies-house-build.yml`.
2. Create timestamped Python producers under `build/python/`.
3. Download the Companies House monthly basic-company snapshot.
4. Download the available Companies House accounts bulk files.
5. Extract company number, legal name, previous names, status, SIC codes, accounts date, total assets and net assets.
6. Exclude director names, individual PSC data, birth dates and residential addresses.
7. Retain companies where total assets or net assets are at least £10 million.
8. Compile a controlled vocabulary from REPD developer, operator, project and site names.
9. Match Companies House records to REPD candidates using legal name, previous name, postcode and company number where available.
10. Classify every match as `CONFIRMED_REPD_COMPANY`, `PROBABLE_PROJECT_SPV`, `RENEWABLE_COMPANY` or `UNRESOLVED_CANDIDATE`.
11. Tag potential behind-the-meter organisations using published SIC codes and transparent rules.
12. Use opportunity tags for manufacturing, food processing, chemicals, minerals, metals, water, waste, logistics, data centres, retail distribution and transport.
13. Treat every behind-the-meter tag as a potential opportunity, not confirmed energy demand.
14. Use the Companies House Public Data API only to verify and refresh shortlisted companies.
15. Store credentials only in GitHub Actions Secrets and respect the official request limit.
16. Emit timestamped company, REPD-linked and behind-the-meter data cartridges plus a manifest.
17. Validate schemas, record counts, financial units, company numbers, provenance and unexpected empty outputs.
18. Reject keyword-only matches from confirmed REPD status.
19. Create a lazy-loaded, virtualised Companies House tab with `REPD COMPANIES`, `£10M+ COMPANIES` and `BEHIND-THE-METER OPPORTUNITIES` views.
20. Display company name, company number, classification, REPD relationship, total assets, net assets, accounts date, SIC sector, opportunity tag, status, evidence and last-checked date.
21. Load only summary metadata at startup and activate each data cartridge when its view is selected.
22. Browser-test the candidate on mobile and desktop without deploying it.
23. Require exact functional, privacy and performance gates before compiling a new immutable release.
24. Deploy only after explicit owner approval.
