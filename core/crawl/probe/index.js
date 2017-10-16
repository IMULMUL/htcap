(function() {
    'use strict';

    // const analyse = require('./src/analyze');
    // const probe = require('./src/probe');
    // const constants = require('./src/constants');
    const utils = require('./src/utils');

    const puppeteer = require('puppeteer');
    let browser = undefined;

    let options = utils.getOptionsFromArgs();

    // DEBUG:
    console.log(options);

    function _getPage() {
        return puppeteer.launch({headless: false})
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
