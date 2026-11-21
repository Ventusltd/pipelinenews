"""BBC feed inventory and request limits."""

SECTIONS = ('science_and_environment', 'business', 'england', 'scotland', 'wales',
            'northern_ireland', 'uk', 'england/lincolnshire', 'england/cambridgeshire',
            'england/norfolk', 'england/suffolk', 'england/nottingham',
            'england/essex', 'england/kent', 'england/oxford', 'england/wiltshire',
            'england/somerset', 'england/devon', 'england/cornwall', 'england/lancashire',
            'england/cumbria', 'england/tees', 'england/north_yorkshire',
            'england/south_yorkshire', 'england/leicester', 'england/derbyshire',
            'england/northamptonshire', 'england/hampshire', 'england/shropshire',
            'england/stoke_and_staffordshire', 'england/hereford_and_worcester')
MAX_BYTES = 1_048_576
MAX_ITEMS = 500


def feed_urls():
    return (f"https://feeds.bbci.co.uk/news/{section}/rss.xml" for section in SECTIONS)
