/**
 * @todo:
 * - return error on failed resources (like in `printStatus()`), error type supported:
 *     requestTimeout, invalidContentType, pageCrash, probeException, failedStatus (40x, 50x) …
 * - closing the probe nicely (ie. return finding on SIGINT)
 *
 * @todo (blocked):
 * - make possible to send POST request and custom headers (set a referer) on page.goto() see: {@link https://github.com/GoogleChrome/puppeteer/issues/1062}
 *   possible workaround: using `request.continue({overrides})` on the first request
 * - block navigation away and return content related to "navigationRequest" as in PhantomJS see: {@link https://github.com/GoogleChrome/puppeteer/issues/823}
 *   possible workaround: watching `onunload` page event to prevent navigation
 * - handle redirect see: {@link https://github.com/GoogleChrome/puppeteer/issues/1132}
 *   possible workaround: blocking the request with `request.status === 30x`
 *
 * @todo (nice to have):
 * - add a debug level
 * - return cookies for every request
 */

(function() {
    'use strict';

    const process = require('process');

    const logger = require('./logger');
    const puppeteer = require('puppeteer');

    const constants = require('./src/constants').constants;
    const utils = require('./src/utils');

    const pageHandler = require('./src/page-handler');

    let options = utils.getOptionsFromArgs(),
        browser,
        handler;

    // handling SIGINT signal
    process.on('SIGINT', () => {
        _requestJobEnd();
    });

    function _requestJobEnd(errorCode) {

        logger.info('closing Node process');
        if (browser) {
            browser.close()
                .then(() => {
                    process.exit(errorCode);
                });
        } else {
            process.exit(errorCode);
        }
    }

    function run([newBrowser, page]) {

        browser = newBrowser;

        handler = new pageHandler.Handler(page, constants, options);

        handler.on('finished', _requestJobEnd);
        handler.on('probe_message', (msg) => {
            logger.info(msg);
        });

        handler.initialize()
            .then(() => {

                handler.setProbe();

                page.goto(options.startUrl.href, {waitUntil: 'networkidle'})
                    .then(response => {

                            if (response.ok) {
                                // checking if it's some HTML document
                                if (response.headers['content-type']
                                        .toLowerCase()
                                        .includes('text/html')) {

                                    handler.getCookies()
                                        .then(cookies => {
                                            logger.info('["cookies",' + JSON.stringify(cookies) + '],');
                                        });

                                    // DEBUG:
                                    logger.info('starting the probe');
                                    // start analysis on the page
                                    handler.startProbe();
                                } else {
                                    logger.info(`{"status":"error","code":"contentType","message":"content type is ${response.headers['content-type']}"}`);
                                    _requestJobEnd();
                                }
                            } else {
                                //DEBUG:
                                logger.debug(response);
                            }
                        },
                        (error) => {
                            logger.error(error);
                            _requestJobEnd(1);
                        },
                    );
            }, (error) => {
                logger.error(error);
                _requestJobEnd(1);
            });
    }

    pageHandler.getBrowserAndPage(puppeteer)
        .then(run);

})();
