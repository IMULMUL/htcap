# -*- coding: utf-8 -*- 

"""
HTCAP - beta 1
Author: filippo.cavallarin@wearesegment.com

This program is free software; you can redistribute it and/or modify it under 
the terms of the GNU General Public License as published by the Free Software 
Foundation; either version 2 of the License, or (at your option) any later 
version.
"""

THSTAT_WAITING = 0
THSTAT_RUNNING = 1

CRAWLSCOPE_DOMAIN = "domain"
CRAWLSCOPE_DIRECTORY = "directory"
CRAWLSCOPE_URL = "url"

CRAWLOUTPUT_RENAME = "rename"
CRAWLOUTPUT_OVERWRITE = "overwrite"
CRAWLOUTPUT_RESUME = "resume"
CRAWLOUTPUT_COMPLETE = "complete"

CRAWLMODE_PASSIVE = "passive"
CRAWLMODE_ACTIVE = "active"
CRAWLMODE_AGGRESSIVE = "aggressive"

REQTYPE_LINK = "link"
REQTYPE_XHR = "xhr"
REQTYPE_WS = "websocket"
REQTYPE_JSONP = "jsonp"
REQTYPE_FORM = "form"
REQTYPE_REDIRECT = "redirect"
REQTYPE_UNKNOWN = "unknown"

ERROR_CONTENTTYPE = "contentType"
ERROR_TIMEOUT = "timeout"
ERROR_PROBE_TO = "probe_timeout"
ERROR_LOAD = "loaderror"
ERROR_PROBEKILLED = "probe_killed"
ERROR_PROBEFAILURE = "probe_failure"
ERROR_MAXREDIRECTS = "too_many_redirects"
ERROR_CRAWLDEPTH = "crawler_depth_limit_reached"
VULNTYPE_SQLI = "sqli"
VULNTYPE_XSS = "xss"

CRAWLER_DEFAULTS = {
    "process_timeout": 300,  # when lots of element(~25000) are added dynamically it can take some time..
    "num_threads": 10,
    "max_redirects": 10,
    "max_depth": 100,
    "max_post_depth": 10,
    "output_mode": CRAWLOUTPUT_RENAME,
    "scope": CRAWLSCOPE_DOMAIN,
    "mode": CRAWLMODE_AGGRESSIVE,
    "proxy": None,
    "group_qs": False,
    "user_agent": 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
    "override_timeout_functions": True,
    "crawl_forms": True,  # only if mode == CRAWLMODE_AGGRESSIVE
    "random_seed": "",
    "use_urllib_onerror": True,
    "set_referer": True,
}
