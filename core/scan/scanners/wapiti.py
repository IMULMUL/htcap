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
import os
import time
import re
import json
import base64
import uuid

from core.lib.exception import *
from core.lib.cookie import Cookie
from core.lib.utils import *
from core.scan.base_scanner import BaseScanner

class Wapiti(BaseScanner):
	

	def init(self, argv):
		return True
	
	def get_settings(self):
		return dict(
			scanner_name = "wapiti",
			request_types = "xhr,link,form,jsonp,redirect",
			num_threads = 10,
			process_timeout = 180,
			scanner_exe = "python /usr/local/bin/wapiti"
		)

	# return False to skip current request
	def get_cmd(self, request, tmp_dir):
		url = request.url
		# skip check of XSS via POST sice they should be considered CSRF 
		if request.method == "POST" and request.data:
			url += "?" + request.data
			

		out_file = tmp_dir + "/output.json"

		cookie_file = tmp_dir + "/cookies.json"
		with open(cookie_file,'w') as cf:
			jsn = self.convert_cookies(request.cookies)			
			cf.write(jsn)
		

		cmd = [			
			url,
			"--timeout", "30",			
			# Set the modules (and HTTP methods for each module) to use for attacks.
			# Prefix a module name with a dash to deactivate the related module.
			# To only browse the target (without sending any payloads), deactivate every module with -m "-all".
			# If you don't specify the HTTP methods, GET and POST will be used.
			# Example: -m "-all,xss:get,exec:post"
			"--module", "-all,xss:get",
			"--scope", "page",
			"--format", "json",
			"--output", out_file,
			"--verify-ssl", "0"
			]

		# ! no option to set referer ?

		if len(request.cookies) > 0:
			cmd.extend(("--cookie", cookie_file))

		# print cmd_to_str(cmd)
		# self.exit(1)
		# return False
		return cmd

	def scanner_executed(self, request, out, err, tmp_dir, cmd):
		out_file = tmp_dir + "/output.json"

		if not os.path.exists(out_file):
			return 

		with open(out_file,'r') as fil:
			jsn = fil.read()		
		
		report = []
		try:
			report = json.loads(jsn)['vulnerabilities']['Cross Site Scripting']
		except Exception as e:
			print err
		
		for vuln in report:
			self.save_vulnerability(request, "XSS", json.dumps(vuln))



	# convert cookies to wapiti format
	def convert_cookies(self, cookies):
		wcookies = {}
		for cookie in cookies:
			domain = cookie.domain
			if domain:
				if not domain.startswith("."): domain = ".%s" % domain				
			else:
				domain = cookie.setter.hostname
			
			if not domain in wcookies.keys():
				wcookies[domain] = {}

			if not cookie.path in wcookies[domain].keys():
				wcookies[domain][cookie.path] = {}

			wcookies[domain][cookie.path][cookie.name] = dict(
				version = 0,
				expires = cookie.expires,
				secure = cookie.secure,
				value = cookie.value,
				port = None
			)
		
		return json.dumps(wcookies)