(function() {
    'use strict';

    const process = require('process');

    const logger = require('./logger');
    const puppeteer = require('puppeteer');

    // const analyse = require('./src/analyze');
    // const probe = require('./src/probe');

    // const constants = require('./src/constants');
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
        return puppeteer.launch()
            .then(function(createdBrowser) {
                browser = createdBrowser;
                return createdBrowser.newPage();
            });
    }

    _getPage()
        .then(function(page) {
            page.goto('http://example.com')
                .then(function() {
                    page.screenshot({path: 'example.png'})
                        .then(function() {
                            browser.close();
                        });
                });
        });

})();
