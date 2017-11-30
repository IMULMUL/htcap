(function() {
    'use strict';

    exports.constants = {
        XHRTimeout: 5000,

        eventLoopConfig: {
            messageEvent: {
                from: 'javascript-probe',
                name: 'event-loop-ready',
            },
            bufferCycleSize: 150, // number of event loop cycle between every new action proceed in the eventLoop
            afterEventTriggeredTimeout: 1, // after triggering an event, time in ms to wait before requesting another eventLoop cycle
            afterDoneXHRTimeout: 10, // after a done XHR, time in ms to wait before requesting another eventLoop cycle
            beforeClosingEventLoopManagerTimeout: 200, // time in ms to wait before closing the event loop manager
        },

        // see: https://developer.mozilla.org/en-US/docs/Web/Events
        mappableEvents: [
            'abort', 'blur', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextmenu', 'copy',
            'cut', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop',
            'durationchange', 'emptied', 'ended', 'error', 'focus', 'fullscreenchange', 'fullscreenerror',
            'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata',
            'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover',
            'mouseup', 'paste', 'pause', 'play', 'playing', 'progress', 'ratechange', 'reset', 'resize',
            'scroll', 'seeked', 'seeking', 'select', 'show', 'stalled', 'submit', 'suspend', 'timeupdate',
            'volumechange', 'waiting', 'wheel',
        ],

        /* always trigger these events since event delegation mays "confuse" the triggering of mapped events */
        triggerableEvents: {
            'button': ['click', 'dblclick', 'keyup', 'keydown', 'mouseup', 'mousedown'],
            'select': ['change', 'click', 'keyup', 'keydown', 'mouseup', 'mousedown'],
            'input': ['change', 'click', 'blur', 'focus', 'keyup', 'keydown', 'mouseup', 'mousedown'],
            'a': ['click', 'dblclick', 'keyup', 'keydown', 'mouseup', 'mousedown'],
            'textarea': ['change', 'click', 'blur', 'focus', 'keyup', 'keydown', 'mouseup', 'mousedown'],
            'span': ['click', 'mouseup', 'mousedown'],
            'td': ['click', 'mouseup', 'mousedown'],
            'tr': ['click', 'mouseup', 'mousedown'],
            'div': ['click', 'mouseup', 'mousedown'],
        },

        // map input names to string generators. see generateRandomValues to see all available generators
        inputNameMatchValue: [ // regexps NEED to be string to get passed to the page
            {name: 'mail', value: 'email'},
            {name: '((number)|(phone))|(^tel)', value: 'number'},
            {name: '(date)|(birth)', value: 'humandate'},
            {name: '((month)|(day))|(^mon$)', value: 'month'},
            {name: 'year', value: 'year'},
            {name: 'url', value: 'url'},
            {name: 'firstname', value: 'firstname'},
            {name: '(surname)|(lastname)', value: 'surname'},
        ],

        viewport: {
            width: 1920,
            height: 1080,
        },
    };

})();
