"""Collect bounded BBC RSS metadata and write a single collection receipt."""

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import urllib.request

from .articles import canonical_article, merge_items, parse_feed
from .sources import MAX_BYTES, MAX_ITEMS, SECTIONS, feed_urls


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('feed redirect rejected')


def collect(previous, now, fetch=None):
    observed = now.isoformat()
    incoming, health = [], []
    opener = urllib.request.build_opener(NoRedirect)
    for url in feed_urls():
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
    parser.add_argument('--previous', type=pathlib.Path, help='Previous receipt (defaults to the output path)')
    args = parser.parse_args()
    path = pathlib.Path(args.output)
    previous_path = args.previous or path
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else {}
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
