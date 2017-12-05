(function() {
    'use strict';

    exports.constants = {
        XHRTimeout: 5000,

        eventLoopConfig: {
            messageEvent: {
                from: 'javascript-probe',
                name: 'event-loop-ready',
            },

            /**
             * number of event loop cycle between every new action proceed in the eventLoop
             * lower is better for speed
             * higher is better for discovery
             */
            bufferCycleSize: 150,

            /**
             * in milliseconds,
             * after trigger of an event, time to wait before requesting another eventLoop cycle
             * lower is better for speed
             */
            afterEventTriggeredTimeout: 10,

            /**
             * in milliseconds,
             * after a done XHR, time to wait before requesting another eventLoop cycle
             */
            afterDoneXHRTimeout: 10,

            /**
             * in milliseconds,
             * time to wait before closing the event loop manager (when everything seems to be done)
             */
            beforeClosingEventLoopManagerTimeout: 500,
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

        /**
         *  always trigger these events on the given element
         */
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

        /**
         * in pixels,
         * viewport size of the browser
         */
        viewport: {
            width: 1920,
            height: 1080,
        },
    };

})();
