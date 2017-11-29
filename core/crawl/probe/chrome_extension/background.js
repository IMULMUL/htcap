(function() {
    'use strict';

    // keep track of all the opened tab
    let tabs = {};

    // store the probe starting tab (the first tab navigated with success)
    let startingTabId = undefined;

    // Get all existing tabs
    chrome.tabs.query({}, function(results) {
        results.forEach(function(tab) {
            tabs[tab.id] = tab;
        });
    });

    function onCreatedListener(tab) {
        tabs[tab.id] = tab;
        tabs[tab.id].haveBeenNavigated = false;
    }

    // Create tab event listeners
    function onUpdatedListener(tabId, changeInfo, tab) {
        if (tab.url.startsWith('http')) {
            if (tab.url.startsWith('http') && changeInfo.status === 'complete') {
                startingTabId = tabId;
                tabs[startingTabId].haveBeenNavigated = true;
            }
        }
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
        let result, currentTab = tabs[details.tabId];

        // if the current tab exist (sometimes the request is issue before the tab exist)
        if (currentTab) {

            // DEBUG:
            // console.group();
            // console.log('currentTab', currentTab);
            // console.log('details', details);
            // console.log('startingTabId', startingTabId);
            // console.log(currentTab.url.startsWith('http') && !_isSameUrls(currentTab.url, details.url));
            // console.groupEnd();

            // if the tab is loading content from somewhere else (ie. for a frame)
            if (currentTab.url.startsWith('http') && !_isSameUrls(currentTab.url, details.url)) {

                _notifyProbe(details.url, startingTabId || currentTab.id);

                // redirect the navigation to nowhere
                result = {redirectUrl: 'javascript:void(0)'};

            } else if (startingTabId) {

                if (currentTab.id !== startingTabId) { // if the current tab is a new tab
                    _notifyProbe(details.url, startingTabId);

                    // redirect the navigation to nowhere
                    result = {redirectUrl: 'javascript:void(0)'};

                    // close the tab
                    chrome.tabs.remove(currentTab.id);

                } else if (tabs[startingTabId].haveBeenNavigated) { // if the starting tab have already been navigated

                    _notifyProbe(details.url, startingTabId);

                    // redirect the navigation to nowhere
                    result = {redirectUrl: 'javascript:void(0)'};
                }
            }
        }
        return result;
    }

    // Subscribe to tab events to track opened tabs
    chrome.tabs.onCreated.addListener(onCreatedListener);
    chrome.tabs.onUpdated.addListener(onUpdatedListener);
    chrome.tabs.onRemoved.addListener(onRemovedListener);

    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestListener, {
        urls: ['<all_urls>'],
        types: ['main_frame', 'sub_frame'], // only watching for "frame" type request
    }, ['blocking']);

    /**
     * compare 2 urls based on there href form WITHOUT the hash part
     * @param {string} url1
     * @param {string} url2
     * @return {boolean}
     * @private
     */
    function _isSameUrls(url1, url2) {
        let cleanedUrl1 = new URL(url1),
            cleanedUrl2 = new URL(url2);

        cleanedUrl1.hash = '';
        cleanedUrl2.hash = '';

        return cleanedUrl1.href === cleanedUrl2.href;
    }

    function _notifyProbe(url, tabId) {

        // DEBUG:
        console.warn(`Navigation to ${url} blocked.`);

        // sending message to the probe
        chrome.tabs.executeScript(tabId, {file: 'content.js'}, function() {
            chrome.tabs.sendMessage(tabId, {url: url});
        });
    }

})();
