(function () {
    'use strict';


    exports.getOptionsFromArgs = function () {
        const ArgsParse = require('../node_modules/argparse').ArgumentParser;

        let argumentParser = new ArgsParse();

        _getArguments(argumentParser);

        let args = argumentParser.parseArgs();
        let options = _getOptions(args);

        return options;
    };

    function _getArguments(argumentParser) {

        let args;

        argumentParser.addArgument(
            '-A',
            {
                help: 'user agent',
                dest: 'userAgent',
                defaultValue: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
            },
        );
        argumentParser.addArgument(
            '-R',
            {
                help: 'random string used to generate random values - the same random string will generate the same random values',
                dest: 'random',
                defaultValue: 'IsHOulDb34RaNd0MsTR1ngbUt1mN0t',
            },
        );
        argumentParser.addArgument(
            '-f',
            {
                help: 'do NOT fill values in forms',
                dest: 'fillValues',
                defaultValue: true,
                nargs: 0,
                action: 'storeFalse',
            },
        );
        argumentParser.addArgument(
            '-t',
            {
                help: 'do NOT trigger events (onload only)',
                dest: 'triggerEvents',
                defaultValue: true,
                nargs: 0,
                action: 'storeFalse',
            },
        );
        argumentParser.addArgument(
            '-X',
            {
                help: 'comma separated list of excluded urls',
                dest: 'excludedUrls',
                defaultValue: '',
            },
        );
        argumentParser.addArgument(
            '-O',
            {
                help: 'do NOT override timeout functions',
                dest: 'overrideTimeoutFunctions',
                defaultValue: true,
                nargs: 0,
                action: 'storeFalse',
            },
        );
        argumentParser.addArgument(
            '-c',
            {
                help: 'set cookies from file (json)',
                dest: 'cookieFilePath',
                defaultValue: '',
            },
        );
        argumentParser.addArgument(
            '-r',
            {
                help: 'url referer',
                dest: 'referer',
                defaultValue: '',
            },
        );

        argumentParser.addArgument(
            '-p',
            {
                help: 'http auth (user:pass)',
                dest: 'httpAuth',
                defaultValue: '',
            },
        );
        argumentParser.addArgument(
            '-P',
            {
                help: 'load page with POST',
                dest: 'sendPOST',
                defaultValue: false,
                nargs: 0,
                action: 'storeTrue',
            },
        );
        argumentParser.addArgument(
            '-D',
            {
                help: 'POST data',
                dest: 'POSTData',
            },
        );

        argumentParser.addArgument(
            'startUrl',
            {
                help: 'starting url',
            },
        );

        args = argumentParser.parseArgs();

        if (!args.startUrl.startsWith('http')) {
            argumentParser.error('invalid starting url: "' + args.startUrl + '"');
        }

        return args;
    }

    function _getOptions(args) {
        const fs = require('fs'), url = require('url');
        let options = {};

        options.userAgent = args.userAgent;
        options.random = args.random;
        options.fillValues = args.fillValues;
        options.triggerEvents = args.triggerEvents;
        options.excludedUrls = args.excludedUrls !== '' ? args.excludedUrls.split(',') : [];
        options.overrideTimeoutFunctions = args.overrideTimeoutFunctions;

        if (args.cookieFilePath !== '') {
            let data = fs.readFileSync(args.cookieFilePath, 'utf8');
            options.cookies = JSON.parse(data);
        } else {
            options.cookies = [];
        }

        if (args.referer !== '') {
            options.referer = args.referer;
        }

        if (args.httpAuth !== '') {
            let a = args.httpAuth.split(':');
            options.httpAuth = [
                a[0],
                a.slice(1)
                    .join(':'),
            ];
        }

        if (args.sendPOST) {
            options.sendPOST = args.sendPOST;
            options.POSTData = args.POSTData;
        }

        options.startUrl = url.parse(args.startUrl);

        return options;

    }

})();

function compareUrls(url1, url2, includeHash) {
    var a1 = document.createElement('a');
    var a2 = document.createElement('a');
    a1.href = url1;
    a2.href = url2;

    var eq = (a1.protocol === a2.protocol && a1.host === a2.host && a1.pathname === a2.pathname && a1.search === a2.search);

    if (includeHash) {
        eq = eq && a1.hash === a2.hash;
    }

    return eq;
}


function printCookies() {
    console.log('["cookies",' + JSON.stringify(phantom.cookies) + '],');
}


function printStatus(status, errcode, message, redirect) {
    var o = {status: status};
    if (status === 'error') {
        o.code = errcode;
        switch (errcode) {
            case 'load':
                break;
            case 'contentType':
                o.message = message;
                break;
            case 'requestTimeout':
                break;
            case 'probe_timeout':
                break;
        }
    }
    if (redirect) {
        o.redirect = redirect;
    }
    o.time = Math.floor((Date.now() - window.startTime) / 1000);
    console.log(JSON.stringify(o));
    console.log(']');
}


function execTimedOut() {
    if (!response || response.headers.length === 0) {
        printStatus('error', 'requestTimeout');
        phantom.exit(0);
    }
    printStatus('error', 'probe_timeout');
    phantom.exit(0);

}

// generates PSEUDO random values. the same seed will generate the same values
function generateRandomValues(seed) {
    var values = {};
    var letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var numbers = '0123456789';
    var symbols = '!#&^;.,?%$*';
    var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    var years = ['1982', '1989', '1990', '1994', '1995', '1996'];
    var names = ['james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'charles', 'joseph', 'thomas', 'christopher', 'daniel', 'paul', 'mark', 'donald', 'george', 'kenneth'];
    var surnames = ['anderson', 'thomas', 'jackson', 'white', 'harris', 'martin', 'thompson', 'garcia', 'martinez', 'robinson', 'clark', 'rodriguez', 'lewis', 'lee', 'walker', 'hall'];
    var domains = ['.com', '.org', '.net', '.it', '.tv', '.de', '.fr'];

    var randoms = [];
    var randoms_i = 0;

    for (var a = 0; a < seed.length; a++) {
        var i = seed[a].charCodeAt(0);
        randoms.push(i);
    }

    var rand = function (max) {
        var i = randoms[randoms_i] % max;
        randoms_i = (randoms_i + 1) % randoms.length;
        return i;
    };

    var randarr = function (arr, len) {
        var r;
        var ret = '';
        for (var a = 0; a < len; a++) {
            r = rand(arr.length - 1);
            ret += arr[r];
        }
        return ret;
    };

    var generators = {
        string: function () {
            return randarr(letters, 8);
        },
        number: function () {
            return randarr(numbers, 3);
        },
        month: function () {
            return randarr(months, 1);
        },
        year: function () {
            return randarr(years, 1);
        },
        date: function () {
            return generators.year() + '-' + generators.month() + '-' + generators.month();
        },
        color: function () {
            return '#' + randarr(numbers, 6);
        },
        week: function () {
            return generators.year() + '-W' + randarr(months.slice(0, 6), 1);
        },
        time: function () {
            return generators.month() + ':' + generators.month();
        },
        datetimeLocal: function () {
            return generators.date() + 'T' + generators.time();
        },
        domain: function () {
            return randarr(letters, 12)
                .toLowerCase() + randarr(domains, 1);
        },
        email: function () {
            return randarr(names, 1) + '.' + generators.surname() + '@' + generators.domain();
        },
        url: function () {
            return 'http://www.' + generators.domain();
        },
        humandate: function () {
            return generators.month() + '/' + generators.month() + '/' + generators.year();
        },
        password: function () {
            return randarr(letters, 3) + randarr(symbols, 1) + randarr(letters, 2) + randarr(numbers, 3) + randarr(symbols, 2);
        },
        surname: function () {
            return randarr(surnames, 1);
        },
        firstname: function () {
            return randarr(names, 1);
        },
        tel: function () {
            return '+' + randarr(numbers, 1) + ' ' + randarr(numbers, 10);
        },
    };

    for (var type in generators) {
        values[type] = generators[type]();
    }

    return values;

}


function startProbe(random) {
    // generate a static map of random values using a "static" seed for input fields
    // the same seed generates the same values
    // generated values MUST be the same for all analyze.js call othewise the same form will look different
    // for example if a page sends a form to itself with input=random1,
    // the same form on the same page (after first post) will became input=random2
    // => form.data1 != form.data2 => form.data2 is considered a different request and it'll be crawled.
    // this process will lead to and infinite loop!
    var inputValues = generateRandomValues(random);

    // adding constants to page
    page.evaluate(function (__HTCAP) {
        window.__HTCAP = __HTCAP;
    }, window.__HTCAP);

    page.evaluate(initProbe, options, inputValues);

    page.evaluate(function (options) {

        Node.prototype.__originalAddEventListener = Node.prototype.addEventListener;
        Node.prototype.addEventListener = function () {
            if (arguments[0] !== 'DOMContentLoaded') { // is this ok???
                window.__PROBE__.addEventToMap(this, arguments[0]);
            }
            this.__originalAddEventListener.apply(this, arguments);
        };

        window.__originalAddEventListener = window.addEventListener;
        window.addEventListener = function () {
            if (arguments[0] !== 'load') { // is this ok???
                window.__PROBE__.addEventToMap(this, arguments[0]);
            }
            window.__originalAddEventListener.apply(this, arguments);
        };

        XMLHttpRequest.prototype.__originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async, user, password) {

            var _url = window.__PROBE__.removeUrlParameter(url, '_');
            this.__request = new window.__PROBE__.Request('xhr', method, _url);

            // adding XHR listener
            this.addEventListener('readystatechange', function () {
                // if not finish, it's open
                // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
                if (this.readyState >= 1 && this.readyState < 4) {
                    window.__PROBE__.eventLoopManager.sentXHR(this);
                } else if (this.readyState === 4) {
                    // /!\ DONE means that the XHR finish but could have FAILED
                    window.__PROBE__.eventLoopManager.doneXHR(this);
                }
            });
            this.addEventListener('error', function () {
                window.__PROBE__.eventLoopManager.inErrorXHR(this);
            });
            this.addEventListener('abort', function () {
                window.__PROBE__.eventLoopManager.inErrorXHR(this);
            });
            this.addEventListener('timeout', function () {
                window.__PROBE__.eventLoopManager.inErrorXHR(this);
            });

            this.timeout = constants.XHRTimeout;

            return this.__originalOpen(method, url, async, user, password);
        };

        XMLHttpRequest.prototype.__originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (data) {
            this.__request.data = data;
            this.__request.triggerer = window.__PROBE__.getLastTriggerPageEvent();

            var absurl = window.__PROBE__.getAbsoluteUrl(this.__request.url);
            for (var a = 0; a < options.excludedUrls.length; a++) {
                if (absurl.match(options.excludedUrls[a])) {
                    this.__skipped = true;
                }
            }

            // check if request has already been sent
            var requestKey = this.__request.key;
            if (window.__PROBE__.sentXHRs.indexOf(requestKey) !== -1) {
                return;
            }

            window.__PROBE__.sentXHRs.push(requestKey);
            window.__PROBE__.addToRequestToPrint(this.__request);

            if (!this.__skipped) {
                return this.__originalSend(data);
            }
        };

        Node.prototype.__originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function (node) {
            window.__PROBE__.printJSONP(node);
            return this.__originalAppendChild(node);
        };

        Node.prototype.__originalInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function (node, element) {
            window.__PROBE__.printJSONP(node);
            return this.__originalInsertBefore(node, element);
        };

        Node.prototype.__originalReplaceChild = Node.prototype.replaceChild;
        Node.prototype.replaceChild = function (node, oldNode) {
            window.__PROBE__.printJSONP(node);
            return this.__originalReplaceChild(node, oldNode);
        };

        window.WebSocket = (function (WebSocket) {
            return function (url) {
                window.__PROBE__.printWebsocket(url);
                return WebSocket.prototype;
            };
        })(window.WebSocket);

        if (options.overrideTimeoutFunctions) {
            window.__originalSetTimeout = window.setTimeout;
            window.setTimeout = function () {
                // Forcing a delay of 0
                arguments[1] = 0;
                return window.__originalSetTimeout.apply(this, arguments);
            };

            window.__originalSetInterval = window.setInterval;
            window.setInterval = function () {
                // Forcing a delay of 0
                arguments[1] = 0;
                return window.__originalSetInterval.apply(this, arguments);
            };

        }

        HTMLFormElement.prototype.__originalSubmit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = function () {
            window.__PROBE__.addToRequestToPrint(window.__PROBE__.getFormAsRequest(this));
            return this.__originalSubmit();
        };

        // prevent window.close
        window.close = function () {
        };

        window.open = function (url) {
            window.__PROBE__.printLink(url);
        };

        // create an observer instance for DOM changes
        var observer = new WebKitMutationObserver(function (mutations) {
            window.__PROBE__.eventLoopManager.nodeMutated(mutations);
        });
        var eventAttributeList = ['src', 'href'];
        window.__HTCAP.mappableEvents.forEach(function (event) {
            eventAttributeList.push('on' + event);
        });
        // observing for any change on document and its children
        observer.observe(document.documentElement, {
            childList: true,
            attributes: true,
            characterData: false,
            subtree: true,
            characterDataOldValue: false,
            attributeFilter: eventAttributeList,
        });

    }, options);

}


function assertContentTypeHtml(response) {
    if (response.contentType.toLowerCase()
            .split(';')[0] !== 'text/html') {
        printStatus('error', 'contentType', 'content type is ' + response.contentType); // escape response.contentType???
        phantom.exit(0);
    }
}
