#!/usr/bin/env python
# -*- coding: utf-8 -*- 

"""
HTCAP - beta 1
Author: filippo.cavallarin@wearesegment.com

This program is free software; you can redistribute it and/or modify it under 
the terms of the GNU General Public License as published by the Free Software 
Foundation; either version 2 of the License, or (at your option) any later 
version.
"""

import sys

from core.crawl.crawler import Crawler
from core.lib.utils import get_program_infos
from core.scan.scanner import Scanner
from core.util.util import Util


def usage():
	infos = get_program_infos()
	print ("htcap ver " + infos['version'] + "\n"
		   "usage: htcap <command>\n" 
		   "Commands: \n"
		   "  crawl                  run crawler\n"
		   "  scan                   run scanner\n"
		   "  util                   run utility\n"
		   )


if __name__ == '__main__':

	if len(sys.argv) < 2:
		usage()
		sys.exit(1)

	elif sys.argv[1] == "crawl":
		Crawler(sys.argv[2:])
	elif sys.argv[1] == "scan":
		Scanner(sys.argv[2:])
	elif sys.argv[1] == "util":
		Util(sys.argv[2:])
	else:
		usage()
		sys.exit(1)

	sys.exit(0)
