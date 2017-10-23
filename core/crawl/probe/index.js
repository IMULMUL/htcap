/**
 * @todo (blocked):
 * - make possible to send POST request and custom headers (set a referer) on page.goto() see: {@link https://github.com/GoogleChrome/puppeteer/issues/1062}
 *   possible workaround: using `request.continue({overrides})` on the first request
 * - block navigation away and return content related to "navigationRequest" as in PhantomJS see: {@link https://github.com/GoogleChrome/puppeteer/issues/823}
 *   possible workaround: watching `onunload` page event to prevent navigation
 * - handle redirect see: {@link https://github.com/GoogleChrome/puppeteer/issues/1132}
 *   possible workaround: blocking the request with `request.status === 30x`
 *
 * @todo (nice to have):
 * - add a debug level
 * - return cookies for every request
 * - also analyse the error pages (40x and 50x)
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
        result = [],
        browser,
        handler;

    // handling SIGINT signal
    process.on('SIGINT', () => {
        result.push({'status': 'error', 'code': 'interruptReceived'});
        _requestJobEnd();
    });

    function _requestJobEnd(exitCode) {

        //DEBUG:
        // logger.debug('closing Node process');

        logger.info(`result: ${JSON.stringify(result)}`);
        if (browser) {
            browser.close()
                .then(() => {
                    process.exit(exitCode);
                });
        } else {
            process.exit(exitCode);
        }
    }

    function run([newBrowser, page]) {

        browser = newBrowser;

        handler = new pageHandler.Handler(page, constants, options);

        handler.on('finished', (exitCode, status) => {
            result.push(status);
            _requestJobEnd(exitCode);
        });

        handler.on('probeRequest', (request) => {
            result.push(request);
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
                                            result.push(['cookies', cookies]);
                                        });

                                // DEBUG:
                                logger.debug('starting the probe');
                                // start analysis on the page
                                handler.startProbe();
                            } else {
                                result.push({'status': 'error', 'code': 'contentType', 'message': `content type is ${response.headers['content-type']}`});
                                _requestJobEnd();
                            }
                        } else {
                            result.push({'status': 'error', 'code': 'load', 'message': `response code is ${response.status}`});
                            _requestJobEnd(1);
                        }
                    },
                    (error) => {
                        logger.error(error);
                        result.push({'status': 'error', 'code': 'load', 'message': `error is ${error}`});
                        _requestJobEnd(1);
                    });
            }, (error) => {
                logger.error(error);
                result.push({'status': 'error', 'code': 'probeError', 'message': `error is ${error}`});
                _requestJobEnd(1);
            });
    }

    pageHandler.getBrowserAndPage(puppeteer)
        .then(run);

})();
