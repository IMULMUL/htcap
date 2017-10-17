(function() {
    'use strict';

    const __PROBE_CONSTANTS__ = require('./constants').__PROBE_CONSTANTS__;


    /**
     * EventLoop Manager
     * Responsibility:
     * Managing the eventLoop to ensure that every code execution (from the page or from the probe)
     * is completely done before launching anything else.
     * Since the possible actions on the page are _user triggered_, the executed code is design to be triggered by
     * a _normal_ interaction through standard HID, not automated. So it is important to give time
     * to the JS stack to empty before launching anything new.
     *
     * Possible actions to be schedule are: DOM Assessment and event triggering.
     *
     * Upon schedule, the action will take place as soon as the eventLoop is empty and nothing is waiting
     * to be completed (like an XHR request).
     *
     * The logic is (in this order):
     * if a XHR has been sent or is done, do nothing (ie. wait the next event loop before acting)
     * then if a DOM Assessment is waiting, do it first.
     * then if a event is waiting to be triggered, trigger it.
     *
     * A new DOM Assessment is schedule every time the DOM is modified.
     * A new event is schedule for every triggerable event on every element in the DOM.
     *
     *
     * more info on {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop MDN}
     */
    class EventLoopManager {

        /*
         * @param probe the probe from where it's initialized
         * @constructor
         */
        constructor(probe) {
            this._probe = probe;
            this._DOMAssessmentQueue = [];
            this._toBeTriggeredEventsQueue = [];
            this._sentXHRQueue = [];
            this._doneXHRQueue = [];
            this._emptyLoopCounter = 0;
        }


        /**
         * callback for the eventMessage listener
         * it will wait until x empty eventLoop before requesting a `doNextAction()`,
         * x being the buffer size set in constants.js
         *
         * @param eventMessage - the eventMessage triggered
         * @private
         */
        eventMessageHandler(eventMessage) {

            // if it's our eventMessage
            if (eventMessage.source === window && eventMessage.data.from === 'htcap') {
                eventMessage.stopPropagation();

                if (eventMessage.data.name === __PROBE_CONSTANTS__.messageEvent.eventLoopReady.name) {

                    // waiting x number eventLoop before doing anything (x being the buffer size)
                    if (this._emptyLoopCounter < __PROBE_CONSTANTS__.eventLoop.bufferCycleSize) {
                        window.postMessage(__PROBE_CONSTANTS__.messageEvent.eventLoopReady, '*');
                        this._emptyLoopCounter += 1;
                    } else {
                        this._emptyLoopCounter = 0;
                        this.doNextAction();
                    }
                }
            }
        }

        /**
         * start the eventLoopManager
         */
        start() {
            // DEBUG:
            // console.log('eventLoop start');

            window.postMessage(__PROBE_CONSTANTS__.messageEvent.eventLoopReady, '*');
        }

        /**
         * Do the next action based on the priority:
         * if a XHR has been sent or is done, do nothing (ie. wait the next event loop before acting)
         * then if a DOM Assessment is waiting, do it first.
         * then if a event is waiting to be triggered, trigger it.
         * then close the manager
         */
        doNextAction() {

            // DEBUG:
            // if (this._sentXHRQueue.length <= 0) {            // avoiding noise
            //     console.log('eventLoop doNextAction - done:', this._doneXHRQueue.length,
            //         ', DOM:', this._DOMAssessmentQueue.length,
            //         ', event:', this._toBeTriggeredEventsQueue.length);
            // }

            if (this._sentXHRQueue.length > 0) { // if there is XHR waiting to be resolved
                // releasing the eventLoop waiting for resolution
                window.postMessage(__PROBE_CONSTANTS__.messageEvent.eventLoopReady, '*');

            } else if (this._doneXHRQueue.length > 0) { // if there is XHR done
                this._doneXHRQueue.shift();

                window.__originalSetTimeout(function() {
                    window.postMessage(__PROBE_CONSTANTS__.messageEvent.eventLoopReady, '*');
                }, __PROBE_CONSTANTS__.eventLoop.afterDoneXHRTimeout);

            } else if (this._DOMAssessmentQueue.length > 0) { // if there is DOMAssessment waiting

                var element = this._DOMAssessmentQueue.shift();
                // DEBUG:
                // console.log('eventLoop analyzeDOM: ' + _elementToString(element));

                // starting analyze on the next element
                this._probe._analyzeDOMElement(element);
                window.postMessage(__PROBE_CONSTANTS__.messageEvent.eventLoopReady, '*');

            } else if (this._toBeTriggeredEventsQueue.length > 0) { // if there is event waiting
                // retrieving the next pageEvent
                var pageEvent = this._toBeTriggeredEventsQueue.pop();

                // setting the current element
                this._probe._currentPageEvent = pageEvent;

                // DEBUG:
                // console.log('eventLoop pageEvent.trigger', pageEvent.element.tagName, pageEvent.eventName);

                // Triggering the event
                pageEvent.trigger();

                window.__originalSetTimeout(function() {
                    window.postMessage(__PROBE_CONSTANTS__.messageEvent.eventLoopReady, '*');
                }, __PROBE_CONSTANTS__.eventLoop.afterEventTriggeredTimeout);
            } else {
                // DEBUG:
                // console.log("eventLoop END");
                window.__callPhantom({cmd: 'end'});
            }
        }

        scheduleDOMAssessment(element) {
            if (this._DOMAssessmentQueue.indexOf(element) < 0) {
                this._DOMAssessmentQueue.push(element);
            }
        }

        nodeMutated(mutations) {
            // DEBUG:
            // console.log('eventLoop nodesMutated:', mutations.length);
            mutations.forEach(function(mutationRecord) {
                if (mutationRecord.type === 'childList') {
                    for (var i = 0; i < mutationRecord.addedNodes.length; i++) {
                        var addedNode = mutationRecord.addedNodes[i];
                        // DEBUG:
                        // console.log('added:', _elementToString(mutationRecord.addedNodes[i]), mutationRecord.addedNodes[i]);

                        // see: https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#Constants
                        if (addedNode.nodeType === Node.ELEMENT_NODE) {
                            // DEBUG:
                            // console.log('added:', addedNode);
                            this.scheduleDOMAssessment(addedNode);
                        }
                    }
                } else if (mutationRecord.type === 'attributes') {
                    var element = mutationRecord.target;
                    // DEBUG:
                    // console.log('eventLoop nodeMutated: attributes', _elementToString(element), mutationRecord.attributeName);
                    this._probe._triggeredPageEvents.forEach(function(pageEvent, index) {
                        if (pageEvent.element === element) {
                            this._probe._triggeredPageEvents.splice(index, 1);
                        }
                    }.bind(this));
                    this.scheduleDOMAssessment(element);

                }
            }.bind(this));
        }

        scheduleEventTriggering(pageEvent) {
            if (this._toBeTriggeredEventsQueue.indexOf(pageEvent) < 0) {
                // DEBUG:
                // console.log('eventLoop scheduleEventTriggering');
                this._toBeTriggeredEventsQueue.push(pageEvent);
            }
        }

        sentXHR(request) {
            if (this._sentXHRQueue.indexOf(request) < 0) {
                // DEBUG:
                // console.log('eventLoop sentXHR');
                this._sentXHRQueue.push(request);
            }
        }

        doneXHR(request) {
            if (this._doneXHRQueue.indexOf(request) < 0) {
                // DEBUG:
                // console.log('eventLoop doneXHR');

                // if the request is in the sentXHR queue
                var i = this._sentXHRQueue.indexOf(request);
                if (i >= 0) {
                    this._sentXHRQueue.splice(i, 1);
                }

                this._doneXHRQueue.push(request);
            }
        }

        inErrorXHR(request) {
            // DEBUG:
            // console.log('eventLoop inErrorXHR');
        }
    }

    exports.EventLoopManager = EventLoopManager;

})();
