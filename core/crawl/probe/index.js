//TODO: make possible to send POST request and custom headers on page.goto() see: https://github.com/GoogleChrome/puppeteer/issues/1062

(function() {
    'use strict';

    const process = require('process');

    const logger = require('./logger');
    const puppeteer = require('puppeteer');

    // const analyse = require('./src/analyze');
    // const probe = require('./src/probe');

    const constants = require('./src/constants');
    const utils = require('./src/utils');
    let browser = undefined;

    let options = utils.getOptionsFromArgs();

    // handling SIGINT signal
    process.on('SIGINT', function() {
        process.exit();
    });

    // DEBUG:
    // logger.info(options);

    function _getPage() {
        return puppeteer.launch({
            headless: false,
        })
            .then(function(createdBrowser) {
                browser = createdBrowser;
                return createdBrowser.newPage();
            });
    }

    function run(page) {
        page.on('request', function(interceptedRequest) {
            if (interceptedRequest.resourceType === 'image') {
                interceptedRequest.abort();
            } else {
                interceptedRequest.continue();
            }
        });

        Promise.all([
            page.setUserAgent(options.userAgent),
            page.setCookie(...options.cookies),
            page.setViewport(constants.viewport),
            page.setRequestInterceptionEnabled(true),
        ])
            .then(function() {

                page.goto(options.startUrl.href)
                    .then(function() {
                        page.screenshot({path: '/home/guillaume/Downloads/probe.png'})
                            .then(function() {
                                browser.close();
                            });
                    });
            }, function(error) {
                logger.error(error);
                // process.abort(error);
            });
    }

    _getPage()
        .then(run);

})();
