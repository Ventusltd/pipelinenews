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

SOURCES = {
    1: ('BBC News', None),
    2: ('Solar Power Portal', 'https://www.solarpowerportal.co.uk/feed/'),
    3: ('pv magazine', 'https://www.pv-magazine.com/feed/'),
}
SOURCE_ID_PREFIX = {1: 'bbc', 2: 'spp', 3: 'pvmag'}
UK_SIGNAL = re.compile(r'\b(UK|United Kingdom|Britain|British|England|Scotland|Wales|Northern Ireland|London|GB)\b', re.I)

SECTIONS = ('science_and_environment', 'business', 'england', 'scotland', 'wales',
            'northern_ireland', 'uk',
            # BBC Local: deliberately broad. A failed/retired feed is recorded in health
            # rather than silently shrinking geographic coverage.
            'england/berkshire', 'england/beds_bucks_and_herts', 'england/birmingham_and_black_country',
            'england/bristol', 'england/cambridgeshire', 'england/cornwall', 'england/coventry_and_warwickshire',
            'england/cumbria', 'england/derbyshire', 'england/devon', 'england/dorset', 'england/essex',
            'england/gloucestershire', 'england/hampshire', 'england/hereford_and_worcester', 'england/humberside',
            'england/kent', 'england/lancashire', 'england/leeds_and_west_yorkshire', 'england/leicester',
            'england/lincolnshire', 'england/london', 'england/manchester', 'england/norfolk',
            'england/northamptonshire', 'england/nottingham', 'england/oxford', 'england/shropshire',
            'england/somerset', 'england/south_yorkshire', 'england/stoke_and_staffordshire',
            'england/suffolk', 'england/surrey', 'england/sussex', 'england/tees',
            'england/tyne', 'england/wear', 'england/wiltshire', 'england/north_yorkshire')
MAX_BYTES = 1_048_576
MAX_ITEMS = 500
SOLAR_TOPIC = re.compile(r'\b(solar|photovoltaic|photovoltaics|PV|solar farm|solar park|solar panels?)\b', re.I)
CAPACITY = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?)\s*(GW|MW|kW)(?:p|ac|dc)?\b', re.I)
MIN_SOLAR_MW = 1.0


def canonical_article(value, source_priority=1):
    u = urllib.parse.urlsplit(value)
    allowed = {
        1: ('www.bbc.co.uk', 'www.bbc.com'),
        2: ('www.solarpowerportal.co.uk', 'solarpowerportal.co.uk'),
        3: ('www.pv-magazine.com', 'pv-magazine.com'),
    }[source_priority]
    if u.scheme != 'https' or u.hostname not in allowed or u.username or u.password or u.port:
        raise ValueError('article URL is outside the selected priority source')
    if source_priority == 1:
        if not re.fullmatch(r'/news/articles/[a-z0-9]+', u.path):
            raise ValueError('not a BBC article path')
        return 'https://www.bbc.co.uk' + u.path
    return urllib.parse.urlunsplit(('https', allowed[0], u.path.rstrip('/') + '/', '', ''))


def parse_feed(body, feed_url, observed_at, source_priority=1):
    if len(body) > MAX_BYTES or b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
        raise ValueError('RSS exceeds bound or contains a DTD/entity declaration')
    root = ET.fromstring(body)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('not an RSS channel')
    result = []
    for item in root.findall('./channel/item')[:MAX_ITEMS]:
        try:
            url = canonical_article(item.findtext('link', '').strip(), source_priority)
        except ValueError:
            continue
        headline = ' '.join(item.findtext('title', '').split())[:300]
        # Description is used only to find relevant links; no article body is retained.
        description = item.findtext('description', '')[:2000]
        text = headline + ' ' + description
        if not headline or not SOLAR_TOPIC.search(text):
            continue
        # BBC local/national feeds are UK by construction. Trade publications
        # are global, so require a UK signal before they enter this lane.
        if source_priority in (2, 3) and not UK_SIGNAL.search(text):
            continue
        capacities_mw = []
        for value, unit in CAPACITY.findall(text):
            scale = {'kw': 0.001, 'mw': 1.0, 'gw': 1000.0}[unit.lower()]
            capacities_mw.append(float(value) * scale)
        # Keep unknown-capacity solar stories: RSS summaries often omit MW even when
        # the underlying project is utility-scale. Explicitly sub-1 MW-only items are
        # outside this lane. Later project matching can resolve unknown capacity.
        if capacities_mw and max(capacities_mw) <= MIN_SOLAR_MW:
            continue
        published = None
        try:
            parsed = email.utils.parsedate_to_datetime(item.findtext('pubDate', ''))
            if parsed.tzinfo is not None:
                published = parsed.astimezone(dt.timezone.utc).isoformat()
        except (ValueError, TypeError, OverflowError):
            pass
        slug = url.rstrip('/').rsplit('/', 1)[1]
        result.append({'id': SOURCE_ID_PREFIX[source_priority] + ':' + slug, 'url': url,
                       'headline': headline, 'publisher': SOURCES[source_priority][0], 'source_priority': source_priority,
                       'topic': 'solar', 'capacity_mw_max': max(capacities_mw) if capacities_mw else None,
                       'capacity_gate': 'ABOVE_1MW' if capacities_mw and max(capacities_mw) > MIN_SOLAR_MW else 'UNKNOWN_RETAIN_FOR_MATCH',
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
    return sorted(
        (x for x in kept.values() if recent(x)),
        key=lambda x: (
            -(dt.datetime.fromisoformat(x['source_published_at']).timestamp()
              if x.get('source_published_at') else 0),
            int(x.get('source_priority', 99)),
            x['id'],
        ),
    )[:MAX_ITEMS]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('feed redirect rejected')


def collect(previous, now, fetch=None):
    observed = now.isoformat()
    incoming, health = [], []
    opener = urllib.request.build_opener(NoRedirect)
    feed_specs = [(1, f'https://feeds.bbci.co.uk/news/{section}/rss.xml') for section in SECTIONS]
    feed_specs += [(priority, spec[1]) for priority, spec in SOURCES.items() if priority > 1]
    for source_priority, url in feed_specs:
        try:
            if fetch:
                body = fetch(url)
            else:
                req = urllib.request.Request(url, headers={'User-Agent':'PipelineNews-RSS/1.0', 'Accept':'application/rss+xml, application/xml'})
                with opener.open(req, timeout=10) as response:
                    body = response.read(MAX_BYTES + 1)
            items = parse_feed(body, url, observed, source_priority)
            incoming.extend(items)
            health.append({'url':url, 'status':'ok', 'items':len(items), 'sha256':hashlib.sha256(body).hexdigest()})
        except Exception as error:
            health.append({'url':url, 'status':'failed', 'error':type(error).__name__ + ': ' + str(error)[:180]})
    ok = sum(x['status'] == 'ok' for x in health)
    return {'schema':'pipelinenews.priority-solar-news.v1', 'checked_at':observed,
            'last_success_at':observed if ok else previous.get('last_success_at'),
            'status':'ok' if ok == len(feed_specs) else 'partial' if ok else 'failed',
            'items':merge_items(previous.get('items', []), incoming, now), 'feeds':health,
            'limits':{'feeds':len(feed_specs), 'bytes_per_feed':MAX_BYTES, 'retained_items':MAX_ITEMS, 'retention_days':30},
            'source_priority': {'1':'BBC News','2':'Solar Power Portal','3':'pv magazine'},
            'scope':'Priority UK solar discovery: BBC national/local first, Solar Power Portal second, pv magazine third. Explicit <=1 MW-only items excluded; unknown MW retained for project matching/review. No article-page requests; no inferred REPD match.'}


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
