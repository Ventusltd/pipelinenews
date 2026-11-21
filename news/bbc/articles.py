"""Parse, identify and retain BBC article metadata."""

import datetime as dt
import email.utils
import re
import urllib.parse
import xml.etree.ElementTree as ET

from .sources import MAX_BYTES, MAX_ITEMS

TOPIC = re.compile(r'\b(solar|photovoltaic|wind farm|battery storage|energy storage|electricity grid|substation)\b', re.I)


def canonical_article(value):
    u = urllib.parse.urlsplit(value)
    if u.scheme != 'https' or u.hostname not in ('www.bbc.co.uk', 'www.bbc.com') or u.username or u.password or u.port:
        raise ValueError('not a BBC article URL')
    if not re.fullmatch(r'/news/articles/[a-z0-9]+', u.path):
        raise ValueError('not a BBC article path')
    # RSS campaign parameters are attribution, not a second news identity.
    return 'https://www.bbc.co.uk' + u.path


def parse_feed(body, feed_url, observed_at):
    if len(body) > MAX_BYTES or b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
        raise ValueError('RSS exceeds bound or contains a DTD/entity declaration')
    root = ET.fromstring(body)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('not an RSS channel')
    result = []
    for item in root.findall('./channel/item')[:MAX_ITEMS]:
        try:
            url = canonical_article(item.findtext('link', '').strip())
        except ValueError:
            continue
        headline = ' '.join(item.findtext('title', '').split())[:300]
        # Description is used only to find relevant links; no article body is retained.
        description = item.findtext('description', '')[:2000]
        if not headline or not TOPIC.search(headline + ' ' + description):
            continue
        published = None
        try:
            parsed = email.utils.parsedate_to_datetime(item.findtext('pubDate', ''))
            if parsed.tzinfo is not None:
                published = parsed.astimezone(dt.timezone.utc).isoformat()
        except (ValueError, TypeError, OverflowError):
            pass
        result.append({'id': 'bbc:' + url.rsplit('/', 1)[1], 'url': url,
                       'headline': headline, 'publisher': 'BBC News',
                       'source_published_at': published, 'first_observed_at': observed_at,
                       'last_seen_at': observed_at, 'feed_urls': [feed_url],
                       'repd_ref': None, 'binding_status': 'UNMATCHED_REQUIRES_REVIEW',
                       'eligible_for_project_signal': False})
    return result


def merge_items(previous, incoming, now):
    cutoff = now - dt.timedelta(days=30)
    kept = {}
    for item in previous + incoming:
        identity = item['id']
        if identity in kept:
            old = kept[identity]
            item = dict(item, first_observed_at=old['first_observed_at'],
                        feed_urls=sorted(set(old['feed_urls'] + item['feed_urls'])))
        kept[identity] = item
    def recent(item):
        # Missing dates stay missing; observation is used only for retention.
        try:
            value = dt.datetime.fromisoformat(item['source_published_at'] or item['last_seen_at'])
            return value.tzinfo is not None and value >= cutoff
        except (ValueError, TypeError):
            return False
    return sorted((x for x in kept.values() if recent(x)),
                  key=lambda x: (x['source_published_at'] or '', x['id']), reverse=True)[:MAX_ITEMS]
