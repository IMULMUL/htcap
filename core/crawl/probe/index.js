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
    logger.debug(options);

    function _getPage() {
        return puppeteer.launch({headless: true})
            .then(function(createdBrowser) {
                browser = createdBrowser;
                return createdBrowser.newPage();
            });
    }

    function run() {
        _getPage()
            .then(function(page) {

                Promise.all([
                    page.setUserAgent(options.userAgent),
                    page.setCookie(...options.cookies),
                    page.setViewport(constants.viewport),
                ])
                    .then(function() {
                        page.goto('http://example.com')
                            .then(function() {
                                page.screenshot({path: 'example.png'})
                                    .then(function() {
                                        browser.close();
                                    });
                            });
                    }, function(error) {
                        // DEBUG:
                        logger.error(error);
                    });
            });
    }

    run();

})();
