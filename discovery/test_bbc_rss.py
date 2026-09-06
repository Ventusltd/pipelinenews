import datetime as dt
import unittest
from bbc_rss import canonical_article, parse_feed, merge_items, collect, SECTIONS

NOW = dt.datetime(2026, 9, 6, tzinfo=dt.timezone.utc)
RSS = b'''<rss><channel><item><title>New solar farm proposed</title><link>https://www.bbc.co.uk/news/articles/c4gmkezn4nlo?at_campaign=rss</link><pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>'''


class RssTests(unittest.TestCase):
    def test_feed_item_stays_unmatched(self):
        item = parse_feed(RSS, 'feed', NOW.isoformat())[0]
        self.assertEqual(item['url'], 'https://www.bbc.co.uk/news/articles/c4gmkezn4nlo')
        self.assertIsNone(item['repd_ref'])
        self.assertFalse(item['eligible_for_project_signal'])
        self.assertEqual(item['source_published_at'], '2026-09-05T10:00:00+00:00')

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
        self.assertEqual(len(calls),len(SECTIONS))
        self.assertTrue(all(url.startswith('https://feeds.bbci.co.uk/') for url in calls))


if __name__ == '__main__': unittest.main()
