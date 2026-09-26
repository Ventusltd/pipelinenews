import datetime as dt
import unittest
from bbc_rss import canonical_article, parse_feed, merge_items, collect, SECTIONS, SOURCES

NOW = dt.datetime(2026, 9, 6, tzinfo=dt.timezone.utc)
RSS = b'''<rss><channel><item><title>New 25 MW solar farm proposed</title><link>https://www.bbc.co.uk/news/articles/c4gmkezn4nlo?at_campaign=rss</link><pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>'''


class RssTests(unittest.TestCase):
    def test_feed_item_stays_unmatched(self):
        item = parse_feed(RSS, 'feed', NOW.isoformat())[0]
        self.assertEqual(item['url'], 'https://www.bbc.co.uk/news/articles/c4gmkezn4nlo')
        self.assertIsNone(item['repd_ref'])
        self.assertFalse(item['eligible_for_project_signal'])
        self.assertEqual(item['source_published_at'], '2026-09-05T10:00:00+00:00')
        self.assertEqual(item['source_priority'], 1)
        self.assertTrue(item['id'].startswith('bbc:'))
        self.assertEqual(item['capacity_mw_max'], 25.0)
        self.assertEqual(item['capacity_gate'], 'ABOVE_1MW')

    def test_unknown_capacity_solar_is_retained_for_later_match(self):
        body = RSS.replace(b'25 MW ', b'')
        item = parse_feed(body, 'feed', NOW.isoformat())[0]
        self.assertIsNone(item['capacity_mw_max'])
        self.assertEqual(item['capacity_gate'], 'UNKNOWN_RETAIN_FOR_MATCH')

    def test_explicit_sub_one_mw_solar_is_excluded(self):
        body = RSS.replace(b'25 MW', b'500 kW')
        self.assertEqual(parse_feed(body, 'feed', NOW.isoformat()), [])

    def test_retry_and_cross_feed_deduplication(self):
        a = parse_feed(RSS, 'feed-a', NOW.isoformat())
        b = parse_feed(RSS, 'feed-b', NOW.isoformat())
        result = merge_items(a, b+b, NOW)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['feed_urls'], ['feed-a','feed-b'])

    def test_missing_date_never_becomes_collection_date(self):
        item = parse_feed(RSS.replace(b'<pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate>', b''), 'feed', NOW.isoformat())[0]
        self.assertIsNone(item['source_published_at'])

    def test_unsafe_urls_and_xml_are_rejected(self):
        for value in ['http://www.bbc.co.uk/news/articles/a', 'https://evil.test/news/articles/a', 'https://www.bbc.co.uk@evil.test/news/articles/a']:
            with self.assertRaises(ValueError): canonical_article(value)
        for body in [b'<!DOCTYPE rss><rss><channel/></rss>', b'<html/>', b'x'*1048577]:
            with self.assertRaises(ValueError): parse_feed(body, 'feed', NOW.isoformat())

    def test_feed_failure_retains_last_good_without_freshness_claim(self):
        previous = {'items':parse_feed(RSS,'feed',NOW.isoformat()),'last_success_at':'2026-09-05T10:00:00+00:00'}
        calls=[]
        def fail(url):
            calls.append(url)
            raise OSError('offline')
        result=collect(previous,NOW,fail)
        self.assertEqual(result['status'],'failed')
        self.assertEqual(result['last_success_at'],previous['last_success_at'])
        self.assertEqual(len(result['items']),1)
        self.assertEqual(len(calls), len(SECTIONS) + 2)
        self.assertTrue(all(url.startswith('https://feeds.bbci.co.uk/') for url in calls[:-2]))
        self.assertEqual(calls[-2:], [SOURCES[2][1], SOURCES[3][1]])


    def test_trade_sources_require_uk_and_keep_priority(self):
        spp = b'''<rss><channel><item><title>UK 15MW solar farm approved</title><link>https://www.solarpowerportal.co.uk/solar-projects/example</link><pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>'''
        pvm = b'''<rss><channel><item><title>British 20 MW solar project advances</title><link>https://www.pv-magazine.com/2026/09/05/example/</link><pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>'''
        self.assertEqual(parse_feed(spp, SOURCES[2][1], NOW.isoformat(), 2)[0]['source_priority'], 2)
        self.assertTrue(parse_feed(spp, SOURCES[2][1], NOW.isoformat(), 2)[0]['id'].startswith('spp:'))
        self.assertEqual(parse_feed(pvm, SOURCES[3][1], NOW.isoformat(), 3)[0]['source_priority'], 3)
        self.assertTrue(parse_feed(pvm, SOURCES[3][1], NOW.isoformat(), 3)[0]['id'].startswith('pvmag:'))
        non_uk = pvm.replace(b'British ', b'German ')
        self.assertEqual(parse_feed(non_uk, SOURCES[3][1], NOW.isoformat(), 3), [])


    def test_all_three_source_feeds_can_report_ok(self):
        def feed(url):
            if 'solarpowerportal' in url:
                return b'''<rss><channel><item><title>UK 15 MW solar farm approved</title><link>https://www.solarpowerportal.co.uk/solar-projects/example</link><pubDate>Sat, 05 Sep 2026 11:00:00 GMT</pubDate></item></channel></rss>'''
            if 'pv-magazine' in url:
                return b'''<rss><channel><item><title>British 20 MW solar project advances</title><link>https://www.pv-magazine.com/2026/09/05/example/</link><pubDate>Sat, 05 Sep 2026 09:00:00 GMT</pubDate></item></channel></rss>'''
            return RSS
        result = collect({}, NOW, feed)
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['source_priority']['1'], 'BBC News')
        priorities = [item['source_priority'] for item in result['items']]
        self.assertIn(1, priorities)
        self.assertIn(2, priorities)
        self.assertIn(3, priorities)


if __name__ == '__main__': unittest.main()
