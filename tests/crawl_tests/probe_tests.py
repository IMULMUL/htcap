import unittest
import mock

from core.constants import CRAWLER_DEFAULTS
from core.crawl.crawler import Crawler
from core.crawl.lib.shared import Shared


class SetProbeTest(unittest.TestCase):

    def setup_shared_object(self,
                            mode=CRAWLER_DEFAULTS['mode'],
                            timeout=CRAWLER_DEFAULTS['process_timeout'],
                            user_agent=CRAWLER_DEFAULTS['user_agent'],
                            proxy=CRAWLER_DEFAULTS['proxy'],
                            seed=CRAWLER_DEFAULTS['random_seed'],
                            override=CRAWLER_DEFAULTS['override_timeout_functions'],
                            excluded='',
                            ):

        Shared.excluded_urls = excluded
        Shared.options['random_seed'] = seed
        Shared.options['proxy'] = proxy
        Shared.options['mode'] = mode
        Shared.options['process_timeout'] = timeout
        Shared.options['user_agent'] = user_agent
        Shared.options['override_timeout_functions'] = override

    @mock.patch('core.crawl.crawler.get_probe_cmd', return_value=['/usr/bin/node'])
    def test_setting_probe_calls_node(self, mock_probe_cmd):

        args = ['http://example.com', 'out.txt']
        crawler = Crawler(args)
        self.setup_shared_object()
        crawler._set_probe()

        self.assertIn('/usr/bin/node', crawler._probe["cmd"])

    @mock.patch('core.crawl.crawler.get_probe_cmd', return_value=['/usr/bin/node'])
    def test_set_probe_puts_proxy_in_options(self, mock_probe_cmd):

        args = ['http://example.com', 'out.txt']
        crawler = Crawler(args)
        self.setup_shared_object(proxy={'proto': 'http', 'host': '254.254.254.254', 'port': '1'})
        crawler._set_probe()

        self.assertIn('--proxy=254.254.254.254:1', crawler._probe["options"])
        self.assertIn('--proxy-type=http', crawler._probe["options"])
        self.assertNotIn('--proxy=254.254.254.254:1', crawler._probe["cmd"])


class SendProbeTest(unittest.TestCase):

    def setup_request_object(self):
        pass

    def setup(self):
        pass
