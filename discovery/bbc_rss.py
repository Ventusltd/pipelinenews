"""Bounded BBC RSS discovery. Never fetch article pages or infer REPD bindings."""
import argparse
import datetime as dt
import email.utils
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

SECTIONS = ('science_and_environment', 'business', 'england', 'scotland', 'wales',
            'northern_ireland', 'uk', 'england/lincolnshire', 'england/cambridgeshire',
            'england/norfolk', 'england/suffolk', 'england/nottingham',
            'england/essex', 'england/kent', 'england/oxford', 'england/wiltshire',
            'england/somerset', 'england/devon', 'england/cornwall', 'england/lancashire',
            'england/cumbria', 'england/tees', 'england/york_and_north_yorkshire',
            'england/south_yorkshire', 'england/leicester', 'england/derbyshire',
            'england/northamptonshire', 'england/hampshire', 'england/shropshire',
            'england/stoke_and_staffordshire', 'england/hereford_and_worcester')
MAX_BYTES = 1_048_576
MAX_ITEMS = 500
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


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('feed redirect rejected')


def collect(previous, now, fetch=None):
    observed = now.isoformat()
    incoming, health = [], []
    opener = urllib.request.build_opener(NoRedirect)
    for section in SECTIONS:
        url = f'https://feeds.bbci.co.uk/news/{section}/rss.xml'
        try:
            if fetch:
                body = fetch(url)
            else:
                req = urllib.request.Request(url, headers={'User-Agent':'PipelineNews-RSS/1.0', 'Accept':'application/rss+xml, application/xml'})
                with opener.open(req, timeout=10) as response:
                    body = response.read(MAX_BYTES + 1)
            items = parse_feed(body, url, observed)
            incoming.extend(items)
            health.append({'url':url, 'status':'ok', 'items':len(items), 'sha256':hashlib.sha256(body).hexdigest()})
        except Exception as error:
            health.append({'url':url, 'status':'failed', 'error':type(error).__name__ + ': ' + str(error)[:180]})
    ok = sum(x['status'] == 'ok' for x in health)
    return {'schema':'pipelinenews.bbc-rss.v1', 'checked_at':observed,
            'last_success_at':observed if ok else previous.get('last_success_at'),
            'status':'ok' if ok == len(SECTIONS) else 'partial' if ok else 'failed',
            'items':merge_items(previous.get('items', []), incoming, now), 'feeds':health,
            'limits':{'feeds':len(SECTIONS), 'bytes_per_feed':MAX_BYTES, 'retained_items':MAX_ITEMS, 'retention_days':30},
            'attribution':'BBC News', 'source':'https://www.bbc.co.uk/news',
            'scope':'RSS headlines and links; no article-page requests; no inferred REPD match.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='discovery/products/bbc-rss.json')
    args = parser.parse_args()
    path = pathlib.Path(args.output)
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    result = collect(previous, dt.datetime.now(dt.timezone.utc))
    result['submitted_articles'] = []
    for receipt in sorted(pathlib.Path('discovery/inbox').glob('*.json')):
        intake = json.loads(receipt.read_text(encoding='utf-8'))
        if intake.get('schema') != 'pipelinenews.manual-url-intake.v1':
            continue
        url = canonical_article(intake['submitted_url'])
        found = next((item for item in result['items'] if item['url'] == url), None)
        result['submitted_articles'].append({'url':url, 'intake_id':intake['intake_id'],
            'status':'FOUND_IN_RSS' if found else 'NOT_SEEN_IN_FETCHED_RSS',
            'headline':found['headline'] if found else None,
            'note':'Not seen does not mean absent from BBC or REPD; RSS is a rolling feed.'})
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temp.replace(path)
    print(json.dumps({'status':result['status'], 'items':len(result['items']), 'feeds':len(result['feeds']), 'output':str(path)}))
    return 1 if result['status'] == 'failed' else 0


if __name__ == '__main__':
    raise SystemExit(main())
