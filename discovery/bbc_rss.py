"""Compatibility entry point for the BBC RSS collector in news.bbc."""

import sys
from pathlib import Path

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from news.bbc.articles import TOPIC, canonical_article, merge_items, parse_feed
from news.bbc.collector import NoRedirect, collect, main
from news.bbc.sources import MAX_BYTES, MAX_ITEMS, SECTIONS

__all__ = [
    "TOPIC", "canonical_article", "merge_items", "parse_feed",
    "NoRedirect", "collect", "main", "MAX_BYTES", "MAX_ITEMS", "SECTIONS",
]


if __name__ == "__main__":
    raise SystemExit(main())
