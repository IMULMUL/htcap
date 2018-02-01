## HTCAP

Htcap is a web application scanner able to crawl single page application (SPA) in a recursive manner by intercepting xhr calls and DOM changes.  
Htcap is not just another vulnerability scanner since it's focused mainly on the crawling process and uses external tools to discover vulnerabilities. It's designed to be a tool for both manual and automated penetration test of modern web applications.

More infos at [htcap.org](http://htcap.org).

### Difference with the upstream version

* Use Chrome + Puppeteer instead of PhantomJS as crawl engine
* Add option to restart/complete a crawl
* Rewrite the injected code of the javascript crawler to take into account the [javascript event loop](https://www.youtube.com/watch?v=8aGhZQkoFbQ) (ie. javascript is async, stop using `setTimeout` calls) and make use of the [DOM mutation event handler](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
* Drop the flimsy supported feature "custom user script" in the crawler
* Add unittest for the crawler part
* Mainly this fixes issues (and other): [#9](https://github.com/segment-srl/htcap/issues/9), [#11](https://github.com/segment-srl/htcap/issues/11), [#16](https://github.com/segment-srl/htcap/issues/16), [#19](https://github.com/segment-srl/htcap/issues/19), [#22](https://github.com/segment-srl/htcap/issues/22), [#23](https://github.com/segment-srl/htcap/issues/23), [#28](https://github.com/segment-srl/htcap/issues/28) and [#31](https://github.com/segment-srl/htcap/issues/31)

## SETUP

### Requirements

 1. Python 2.7
 2. NodeJS v8.9.4 (for the crawler)
 3. Sqlmap (for sqlmap scanner module)
 4. Arachni (for arachni scanner module)

### Installation

```console
git clone git@github.com:delvelabs/htcap.git htcap
cd htcap
pip install -r requirements.txt
cd core/crawl/probe/
npm install
```

## Documentation
Try `python htcap.py -h` for help

## LICENSE

This program is free software; you can redistribute it and/or modify it under the terms of the [GNU General Public License](https://www.gnu.org/licenses/gpl-2.0.html) as published by the Free Software Foundation; either version 2 of the License, or(at your option) any later version.
