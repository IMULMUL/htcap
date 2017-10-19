//TODO: make possible to send POST request and custom headers on page.goto() see: https://github.com/GoogleChrome/puppeteer/issues/1062

(function() {
    'use strict';

    const process = require('process');

    const logger = require('./logger');
    const puppeteer = require('puppeteer');

    const __PROBE_CONSTANTS__ = require('./src/constants').__PROBE_CONSTANTS__;
    const utils = require('./src/utils');
    const setProbe = require('./src/probe').setProbe;

    let options = utils.getOptionsFromArgs();

    // handling SIGINT signal
    process.on('SIGINT', () => {
        process.exit();
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
            logger.info(`intercepted request: ${interceptedRequest.resourceType} ${interceptedRequest.url}`);

            // block image loading
            if (interceptedRequest.resourceType === 'image') {
                interceptedRequest.abort();
            } else {
                interceptedRequest.continue();
            }
        });

        page.on('console', consoleMessage => {
            logger.log('debug', `Console message, type "${consoleMessage.type}": "${consoleMessage.text}"`);
        });

        page.on('dialog', dialog => {
            logger.log('debug', `Dialog, type "${dialog.type}": "${dialog.message()}"`);
            dialog.accept();
        });

        page.on('error', error => {
            logger.log('warn', `Page crash: "${error.code}", "${error.message()}"`);
            process.exit(1);
        });
        page.on('frameattached', frameTo => {
            logger.info(`frameattached to ${frameTo.url()}`);
        });

        page.on('framenavigated', frameTo => {
            logger.info(`framenavigated to ${frameTo.url()}`);
        });

        Promise.all([
            page.setUserAgent(options.userAgent),
            page.setCookie(...options.cookies),
            page.setViewport(__PROBE_CONSTANTS__.viewport),
            page.setRequestInterceptionEnabled(true),
            page.authenticate(options.httpAuth),
        ])
            .then(
                () => {
                    //DEBUG:
                    page.evaluate(() => {
                        console.info(document.documentElement.innerHTML);
                    });

                    let inputValues = utils.generateRandomValues(options.random);

                    // initializing the probe into the page context
                    page.evaluateOnNewDocument(setProbe, ...[options, inputValues, __PROBE_CONSTANTS__]);

                    page.goto(options.startUrl.href, {waitUntil: 'networkidle'})
                        .then(() => {

                            page.evaluate(() => {
                                window.__PROBE__.startAnalysis();
                            });


                            // page.screenshot({path: '/home/guillaume/Downloads/probe.png'})
                            //     .then(() => {
                            //         page.evaluate(() => {
                            //             console.info(window.__PROBE_CONSTANTS__.messageEvent.eventLoopReady.from);
                            //             console.info(document.documentElement.innerText);
                            //         });
                            //         browser.close();
                            //     });
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
