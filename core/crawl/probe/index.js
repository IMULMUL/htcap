//TODO: make possible to send POST request and custom headers on page.goto() see: https://github.com/GoogleChrome/puppeteer/issues/1062

(function() {
    'use strict';

    const process = require('process');

    const logger = require('./logger');
    const puppeteer = require('puppeteer');

    const constants = require('./src/constants').__PROBE_CONSTANTS__;
    const utils = require('./src/utils');
    // const probe = require('./src/probe');

    let options = utils.getOptionsFromArgs();

    // handling SIGINT signal
    process.on('SIGINT', function() {
        process.exit();
    });

    // DEBUG:
    // logger.info(options);

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

        Promise.all([
            page.setUserAgent(options.userAgent),
            page.setCookie(...options.cookies),
            page.setViewport(constants.viewport),
            page.setRequestInterceptionEnabled(true),
            page.authenticate(options.httpAuth),
        ])
            .then(function() {

                utils.initializeProbe(page, options);
                page.evaluate(function() {

                    console.info(document.documentElement.innerHTML);
                });

                page.goto(options.startUrl.href)
                    .then(function() {
                        page.screenshot({path: '/home/guillaume/Downloads/probe.png'})
                            .then(function() {
                                page.evaluate(function() {
                                });
                                // browser.close();
                            });
                    });
            }, function(error) {
                logger.error(error);
                process.exit(1);
            });
    }

    _getBrowserAndPage()
        .then(run);

})();
