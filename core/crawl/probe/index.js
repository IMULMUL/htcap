/**
 * @todo:
 * - return error on failed resources (like in `printStatus()`), error type supported:
 *     requestTimeout, invalidContentType, pageCrash, probeException, failedStatus (40x, 50x) …
 * - return redirect
 * - asserting content type before launching analysis
 * - closing the probe nicely (ie. return finding on SIGINT)
 *
 *
 * @todo (blocked):
 * - make possible to send POST request and custom headers on page.goto() see: https://github.com/GoogleChrome/puppeteer/issues/1062
 * - set a referer if any provided
 * - block navigation away
 * - return content related to "navigationRequest" as in PhantomJS
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
        // TODO: send found content
        // TODO: close the browser
        process.exit(0);
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

    function run([browser, page]) {

        page.on('request', interceptedRequest => {
            //DEBUG:
            // logger.info(`intercepted request: ${interceptedRequest.resourceType} ${interceptedRequest.url}`);

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
            process.exit(1);
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
        // page.on('requestfinished', finishedRequest => {
        // logger.info(`requestfinished: ${finishedRequest.url}`);
        // });
        //DEBUG:
        page.on('load', () => {
            logger.debug('load done');
        });


        // set function to return value from probe
        page.exposeFunction('__PROBE_FN_RETURN_STRING__', (request) => {
            logger.info(`Probe return: ${request}`);
        });

        // set function to request end from probe
        page.exposeFunction('__PROBE_FN_REQUEST_END__', () => {
            logger.info('Probe finished, closing the browser.');
            browser.close();
        });

        Promise.all([
            page.setUserAgent(options.userAgent),
            page.setCookie(...options.cookies),
            page.setViewport(constants.viewport),
            page.setRequestInterceptionEnabled(true),
            page.authenticate(options.httpAuth),
        ])
            .then(
                () => {

                    let inputValues = utils.generateRandomValues(options.random);

                    // initializing the probe into the page context
                    page.evaluateOnNewDocument(setProbe, ...[options, inputValues, constants]);

                    page.goto(options.startUrl.href, {waitUntil: 'networkidle'})
                        .then(() => {

                            page.cookies()
                                .then(cookies => {
                                    logger.info('["cookies",' + JSON.stringify(cookies) + '],');
                                });

                            // DEBUG:
                            logger.info('starting the probe');

                            page.evaluate(() => {
                                window.__PROBE__.startAnalysis();
                            });

                        });
                },
                (error) => {
                    logger.error(error);
                    process.exit(1);
                });
    }

    _getBrowserAndPage()
        .then(run);

})();
