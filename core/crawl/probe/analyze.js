/*
 HTCAP - beta 1
 Author: filippo.cavallarin@wearesegment.com

 This program is free software; you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation; either version 2 of the License, or (at your option) any later
 version.
 */

// TODO: stop using console.log() to transmit data to crawler thread

var system = require('system');
var fs = require('fs');
var page = require('webpage').create();

window.page = page;
window.fs = fs;


phantom.injectJs("functions.js");
phantom.injectJs("options.js");
phantom.injectJs("constants.js");
phantom.injectJs("probe.js");

window.response = null;

var headers = {};
var page_settings = {encoding: "utf8"};

page.viewportSize = {
    width: 1920,
    height: 1080
};

var args = getopt(system.args, "hVaftUJdICc:MSEp:Tsx:A:r:mHX:PD:R:Oi:u:v");

parseArgsToOptions(args, window.options, page_settings);

window.site = parseArgsToURL(args);
// window.result_file = parseArgsToResultFilePath(args);

setCookies(window.options.cookies);

if (window.options.httpAuth) {
    headers['Authorization'] = 'Basic ' + btoa(window.options.httpAuth[0] + ":" + window.options.httpAuth[1]);
}

if (window.options.referer) {
    headers['Referer'] = window.options.referer;
}

page.customHeaders = headers;

setCookies(window.options.cookies);

page.settings.userAgent = window.options.userAgent;
page.settings.loadImages = window.options.loadImages;

console.log("[");

/* maximum execution time */
setTimeout(execTimedOut, window.options.maxExecTime);


phantom.onError = function (msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function (t) {
            msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
        });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
};


page.onConsoleMessage = function (msg) {
    if (window.options.verbose)
        console.log("console: " + msg);
};

page.onError = function (msg, lineNum) {
    if (window.options.verbose)
        console.log("console error: on   " + JSON.stringify(lineNum) + " " + msg);
};

page.onAlert = function (msg) {
    if (window.options.verbose)
        console.log('ALERT: ' + msg);
};


page.onResourceReceived = function (resource) {
    if (window.response === null) {
        window.response = resource;
        // @TODO sanytize response.contentType
    }
};


page.onResourceRequested = function (requestData, networkRequest) {
    //console.log(JSON.stringify(requestData))
};

// to detect window.location= / document.location.href=
page.onNavigationRequested = function (url, type) {

    if (page.navigationLocked === true) {
        page.evaluate(function (url, type) {
            if (type === "LinkClicked")
                return;

            if (type === 'Other' && url !== "about:blank") {
                window.__PROBE__.printLink(url);
            }

        }, url, type);
    }

    // allow the navigation if only the hash is changed
    if (page.navigationLocked === true && compareUrls(url, window.site)) {
        page.navigationLocked = false;
        page.evaluate(function (url) {
            document.location.href = url;
        }, url);
    }

    page.navigationLocked = true;
};

page.onConfirm = function () {
    return true;
};

/*
 phantomjs issue #11684 workaround
 https://github.com/ariya/phantomjs/issues/11684
 */
var isPageInitialized = false;
page.onInitialized = function () {
    if (!isPageInitialized) {
        isPageInitialized = true;

        // try to hide phantomjs
        page.evaluate(function () {
            window.__callPhantom = window.callPhantom;
            delete window.callPhantom;
        });
        startProbe(window.options.random, window.options.injectScript);
    }
};


page.onCallback = function (data) {
    switch (data.cmd) {
        case "print":
            console.log(data.argument);
            break;
        case "end":
            page.evaluate(function () {
                window.__PROBE__.printRequests();
            });

            if (window.options.returnHtml) {
                page.evaluate(function () {
                    window.__PROBE__.printPageHTML();
                });
            }

            page.evaluate(function () {
                window.__PROBE__.triggerUserEvent("onEnd");
            });

            printStatus("ok", window.response.contentType);

            // fs.write(window.result_file, 'hello world, it works!', 'w');
            phantom.exit(0);
            break;

        /**
         * For user script only: log, render, fwrite and fread
         */
        case "log":
            try {
                fs.write("htcap_log-" + window.options.id + ".txt", data.argument + "\n", 'a');
            } catch (e) {
            } // @
            break;
        case "render":
            try {
                page.render(data.argument);
                return true;
            } catch (e) {
                return false;
            }
            break;
        case "fwrite":
            try {
                fs.write(data.file, data.content, data.mode || 'w');
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
            break;
        case "fread":
            try {
                return "" + fs.read(data.file);
            } catch (e) {
                return false;
            }
            break;
    }

};


page.open(window.site, page_settings, function (status) {
    var response = window.response; // just to be clear

    if (status !== 'success') {

        if (!response || response.headers.length === 0) {
            printStatus("error", "load");
            phantom.exit(1);
        }

        // check for redirect first
        for (var a = 0; a < response.headers.length; a++) {
            if (response.headers[a].name.toLowerCase() === 'location') {

                if (window.options.getCookies) {
                    printCookies();
                }
                printStatus("ok", null, null, response.headers[a].value);
                phantom.exit(0);
            }
        }

        assertContentTypeHtml(response);

        phantom.exit(1);
    }

    if (window.options.getCookies) {
        printCookies();
    }

    assertContentTypeHtml(response);

    page.evaluate(function () {
        console.log("startAnalysis");
        // starting page analysis
        window.__PROBE__.startAnalysis();
    });

});
