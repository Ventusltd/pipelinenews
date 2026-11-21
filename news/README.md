# PipelineNews collection

The BBC RSS collector polls 31 feeds. The repository's scheduled workflow runs
at minute 17 of every even UTC hour, for 12 scheduled runs per day. Check
[Actions](https://github.com/Ventusltd/pipelinenews/actions/workflows/bbc-rss-discovery.yml)
for actual start times and the collection receipt from each run.

- `bbc/sources.py` defines the feed sections and input limits.
- `bbc/articles.py` validates and filters RSS items, canonicalises BBC links,
  and merges observations with 30-day retention.
- `bbc/collector.py` fetches feeds, records health and checks the manual inbox.
- `tests/test_bbc_rss.py` covers collection and article boundaries using offline fixtures.

Run the offline tests and a live probe from the repository root.

```sh
python -B -m unittest discover -s news/tests -p 'test_*.py'
python -B -m news.bbc.collector --previous discovery/products/bbc-rss.json --output work/bbc-rss.json
```

Manual Actions runs default to a probe that keeps a seven-day receipt artifact.
Scheduled runs and explicit manual publication from `main` publish successful
or partial collections to `discovery/products/bbc-rss.json` and run the existing
provisional register reconciliation. A total feed failure preserves the last
published receipt and leaves the failed attempt in the run artifact.

The dated search and sector candidates are in `discovery/javascript/`.
