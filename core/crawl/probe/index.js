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
    const setProbe = require('./src/probe').setProbe;

    let options = utils.getOptionsFromArgs(),
        browser;

    // handling SIGINT signal
    process.on('SIGINT', () => {
        _finishJob();
    });

    // DEBUG:
    // logger.info(`Current directory: ${process.cwd()}`);

    function _getBrowserAndPage() {
        return puppeteer.launch({
            headless: false,
        })
            .then(createdBrowser => {
                return createdBrowser.newPage()
                    .then(createdPage => {
                        return [createdBrowser, createdPage];
                    });
            });
    }

    function _finishJob(errorCode) {

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

        page.on('request', interceptedRequest => {
            //DEBUG:
            logger.info(`intercepted request: ${interceptedRequest.resourceType} ${interceptedRequest.url}`);

            // block image loading
            if (interceptedRequest.resourceType === 'image') {
                interceptedRequest.abort();
            } else {
                interceptedRequest.continue();
            }
        });

        page.on('console', consoleMessage => {
            logger.log('debug', `Page console message, type "${consoleMessage.type}": "${consoleMessage.text}"`);
        });

        page.on('dialog', dialog => {
            logger.log('debug', `Page dialog, type "${dialog.type}": "${dialog.message()}"`);
            dialog.accept();
        });

        page.on('error', error => {
            logger.log('warn', `Page crash: "${error.code}", "${error.message()}"`);
            _finishJob(1);
        });

        //DEBUG:
        page.on('frameattached', frameTo => {
            logger.info(`frameattached to ${frameTo.url()}`);
        });
        //DEBUG:
        page.on('framenavigated', frameTo => {
            logger.info(`framenavigated to ${frameTo.url()}`);
        });
        //DEBUG:
        page.on('requestfailed', failedRequest => {
            logger.info(`requestfailed: ${failedRequest.url}`);
        });
        //DEBUG:
        page.on('requestfinished', finishedRequest => {
            logger.info(`requestfinished: ${finishedRequest.response().ok} ${finishedRequest.response().status}, ${finishedRequest.method} ${finishedRequest.url}`);
        });
        //DEBUG:
        // page.on('load', () => {
        //     logger.debug('load done');
        // });


        // set function to return value from probe
        page.exposeFunction('__PROBE_FN_RETURN_STRING__', (request) => {
            logger.info(`Probe return: ${request}`);
        });

        // set function to request end from probe
        page.exposeFunction('__PROBE_FN_REQUEST_END__', () => {
            logger.info('Probe finished, closing the browser.');
            _finishJob();
        });

        Promise
            .all([
                page.setUserAgent(options.userAgent),
                page.setCookie(...options.cookies),
                page.setViewport(constants.viewport),
                page.setRequestInterceptionEnabled(true),
                page.authenticate(options.httpAuth),
            ])
            .then(
                () => {
                    let inputValues = utils.generateRandomValues(options.random);

                    // on every new document, initializing the probe into the page context
                    page.evaluateOnNewDocument(setProbe, ...[options, inputValues, constants]);

                    page.goto(options.startUrl.href, {waitUntil: 'networkidle'})
                        .then(
                            response => {
                                if (response.ok) {
                                    if (response.headers['content-type'].toLowerCase()
                                            .includes('text/html')) {

                                        page.cookies()
                                            .then(cookies => {
                                                logger.info('["cookies",' + JSON.stringify(cookies) + '],');
                                            });

                                        // DEBUG:
                                        logger.info('starting the probe');
                                        // start analysis on the page
                                        page.evaluate(() => {
                                            window.__PROBE__.startAnalysis();
                                        });
                                    } else {
                                        logger.info(`{"status":"error","code":"contentType","message":"content type is ${response.headers['content-type']}"}`);
                                        _finishJob();
                                    }
                                } else {
                                    //DEBUG:
                                    logger.debug(response);
                                }
                            },
                            (error) => {
                                logger.error(error);
                                _finishJob(1);
                            },
                        );
                },
                (error) => {
                    logger.error(error);
                    _finishJob(1);
                });
    }

    _getBrowserAndPage()
        .then(run);

})();
