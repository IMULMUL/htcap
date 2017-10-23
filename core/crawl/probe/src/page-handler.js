(function() {
    'use strict';

    const EventEmitter = require('events');

    const setProbe = require('./probe').setProbe;

    /**
     *
     * @param {Puppeteer} puppeteer
     * @param {String} proxy - in format: `hostname:port`
     * @return {Promise.<TResult>|*}
     */
    exports.getBrowserAndPage = function(puppeteer, proxy) {
        let browserArgs = [
            '--ignore-certificate-errors',
            '--ssl-version-max=tls1.3',
            '--ssl-version-min=tls1',
            '--disable-web-security',
            // '--allow-running-insecure-content',
        ];

        if (proxy) {
            browserArgs.push(`--proxy-server=${proxy}`);
        }

        return puppeteer.launch({
            headless: false,
            args: browserArgs,
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
                // logger.debug(`intercepted request: ${interceptedRequest.resourceType} ${interceptedRequest.url}`);

                // block image loading
                if (interceptedRequest.resourceType === 'image') {
                    interceptedRequest.abort();
                } else {
                    interceptedRequest.continue();
                }
            });

            this._page.on('console', consoleMessage => {
                //DEBUG:
                // logger.debug(`Page console message, type "${consoleMessage.type}": "${consoleMessage.text}"`);
            });

            this._page.on('dialog', dialog => {
                //DEBUG:
                // logger.debug(`Page dialog, type "${dialog.type}": "${dialog.message()}"`);
                dialog.accept();
            });

            this._page.on('error', error => {
                //DEBUG:
                // logger.debug(`Page crash: "${error.code}", "${error.message()}"`);
                let status = {'status': 'error', 'code': 'pageCrash', 'message': `Page crash with: "${error.code}", "${error.message()}"`};
                this.emit(Handler.Events.Finished, 1, status);
            });

            // //DEBUG:
            // this._page.on('frameattached', frameTo => {
            //     logger.debug(`frameattached to ${frameTo.url()}`);
            // });
            // //DEBUG:
            // this._page.on('framenavigated', frameTo => {
            //     logger.debug(`framenavigated to ${frameTo.url()}`);
            // });
            // //DEBUG:
            // this._page.on('requestfailed', failedRequest => {
            //     logger.debug(`requestfailed: ${failedRequest.url}`);
            // });
            // //DEBUG:
            // this._page.on('requestfinished', finishedRequest => {
            //     logger.debug(`requestfinished: ${finishedRequest.response().status}, ${finishedRequest.method} ${finishedRequest.url}`);
            // });
            // //DEBUG:
            // this._page.on('load', () => {
            //     logger.debug('load done');
            // });


            // set function to return value from probe
            this._page.exposeFunction('__PROBE_FN_RETURN_REQUEST__', (request) => {
                this.emit(Handler.Events.ProbeRequest, request);
            });

            // set function to request end from probe
            this._page.exposeFunction('__PROBE_FN_REQUEST_END__', () => {
                //DEBUG:
                // logger.debug('Probe finished');
                let status = {'status': 'ok'};
                this.emit(Handler.Events.Finished, 0, status);
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

    Handler.Events = {
        Finished: 'finished',
        ProbeRequest: 'probeRequest',
    };

    exports.Handler = Handler;

})();
