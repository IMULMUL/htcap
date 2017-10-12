(function() {
    'use strict';

    // const analyse = require('./src/analyze');
    const defaults = require('./src/defaults');
    const constants = require('./src/constants');
    const utils = require('./src/utils');
    // const probe = require('./src/probe');

    const puppeteer = require('puppeteer');
    let browser = undefined;


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
                            // DEBUG:
                            console.log(constants);
                            browser.close();
                        });
                });
        });

})();
