(function() {
    'use strict';

    // keep track of all the opened tab
    let tabs = {};

    // Get all existing tabs
    chrome.tabs.query({}, function(results) {
        results.forEach(function(tab) {
            tabs[tab.id] = tab;
        });
    });


    // Create tab event listeners
    function onUpdatedListener(tabId, changeInfo, tab) {
        tabs[tab.id] = tab;
    }

    function onRemovedListener(tabId) {
        delete tabs[tabId];
    }

    /**
     * if the request url differ from the current tab url block it
     * @param details
     * @return {{redirectUrl: string}}
     */
    function onBeforeRequestListener(details) {
        let currentTab = tabs[details.tabId];

        if (currentTab.url.startsWith('http') && _compareUrls(details.url, currentTab.url)) {
            // DEBUG:
            console.warn(`Navigation to ${details.url} blocked.`);
            chrome.tabs.executeScript(details.tabId, {file: 'content.js'}, function() {
                chrome.tabs.sendMessage(details.tabId, {url: details.url});
            });
            return {redirectUrl: 'javascript:void(0)'};
        }
    }

    // Subscribe to tab events to track opened tabs
    chrome.tabs.onUpdated.addListener(onUpdatedListener);
    chrome.tabs.onRemoved.addListener(onRemovedListener);

    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestListener, {
        urls: ['<all_urls>'],
        types: ['main_frame', 'sub_frame'], // only watching for frame type request
    }, ['blocking']);

    /**
     * compare 2 urls based on there href form WITHOUT the hash part
     * @param {string} url1
     * @param {string} url2
     * @return {boolean}
     * @private
     */
    function _compareUrls(url1, url2) {
        let cleanedUrl1 = new URL(url1),
            cleanedUrl2 = new URL(url2);

        cleanedUrl1.hash = '';
        cleanedUrl2.hash = '';

        return cleanedUrl1.href !== cleanedUrl2.href;
    }

})();
