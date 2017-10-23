(function() {
    'use strict';

    const EventEmitter = require('events');

    const logger = require('../logger');

    const setProbe = require('./probe').setProbe;

    exports.getBrowserAndPage = function(puppeteer) {
        return puppeteer.launch({
            headless: false,
        })
            .then(createdBrowser => {
                return createdBrowser.newPage()
                    .then(createdPage => {
                        return [createdBrowser, createdPage];
                    });
            });
    };

    class Handler extends EventEmitter {
        /**
         * @constructor
         */
        constructor(page, constants, options) {
            super();
            this._page = page;
            this._constants = constants;
            this._options = options;
        }

        initialize() {
            this._page.on('request', interceptedRequest => {
                //DEBUG:
                logger.info(`intercepted request: ${interceptedRequest.resourceType} ${interceptedRequest.url}`);

                // block image loading
                if (interceptedRequest.resourceType === 'image') {
                    interceptedRequest.abort();
                } else {
                    interceptedRequest.continue();
                }
            });

            this._page.on('console', consoleMessage => {
                logger.log('debug', `Page console message, type "${consoleMessage.type}": "${consoleMessage.text}"`);
            });

            this._page.on('dialog', dialog => {
                logger.log('debug', `Page dialog, type "${dialog.type}": "${dialog.message()}"`);
                dialog.accept();
            });

            this._page.on('error', error => {
                logger.log('warn', `Page crash: "${error.code}", "${error.message()}"`);
                this.emit('finished', 1);
            });

            //DEBUG:
            this._page.on('frameattached', frameTo => {
                logger.info(`frameattached to ${frameTo.url()}`);
            });
            //DEBUG:
            this._page.on('framenavigated', frameTo => {
                logger.info(`framenavigated to ${frameTo.url()}`);
            });
            //DEBUG:
            this._page.on('requestfailed', failedRequest => {
                logger.info(`requestfailed: ${failedRequest.url}`);
            });
            //DEBUG:
            this._page.on('requestfinished', finishedRequest => {
                logger.info(`requestfinished: ${finishedRequest.response().status}, ${finishedRequest.method} ${finishedRequest.url}`);
            });
            //DEBUG:
            // this._page.on('load', () => {
            //     logger.debug('load done');
            // });


            // set function to return value from probe
            this._page.exposeFunction('__PROBE_FN_RETURN_STRING__', (request) => {
                this.emit('probe_message', `Probe return: ${request}`);
            });

            // set function to request end from probe
            this._page.exposeFunction('__PROBE_FN_REQUEST_END__', () => {
                logger.info('Probe finished');
                this.emit('finished');
            });

            return Promise.all([
                this._page.setUserAgent(this._options.userAgent),
                this._page.setCookie(...this._options.cookies),
                this._page.setViewport(this._constants.viewport),
                this._page.setRequestInterceptionEnabled(true),
                this._page.authenticate(this._options.httpAuth),
            ]);
        }

        setProbe() {
            // on every new document, initializing the probe into the page context
            this._page.evaluateOnNewDocument(setProbe, ...[this._options, this._constants]);
        }

        startProbe() {
            this._page.evaluate(() => {
                window.__PROBE__.startAnalysis();
            });
        }

        /**
         * @return {Promise|Cookie}
         */
        getCookies() {
            return this._page.cookies();
        }

    }

    exports.Handler = Handler;

})();
