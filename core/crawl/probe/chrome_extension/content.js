(function() {
    'use strict';
    // transmitting url received from the background page to the page
    chrome.runtime.onMessage.addListener(function(msg) {
        window.postMessage({from: 'javascript-probe', name: 'navigation-blocked', url: msg.url}, '*');
    });
})();
