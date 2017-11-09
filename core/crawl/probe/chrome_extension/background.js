(function() {
    'use strict';

    let isStartingUrlNavigated = false,
        startingUrl;

    chrome.webRequest.onBeforeRequest.addListener((details) => {

        if (!isStartingUrlNavigated && details.type === 'main_frame') {
            // DEBUG:
            console.warn(`First navigation to ${details.url} done.`);
            isStartingUrlNavigated = true;
            startingUrl = details.url;
        } else if (['main_frame', 'sub_frame'].includes(details.type) && details.url !== startingUrl) {
            // DEBUG:
            console.warn(`Navigation to ${details.url} blocked.`);
            return {redirectUrl: 'javascript:void(0)'};
        }
    },
    {urls: ['<all_urls>']},
    ['blocking']);

})();
