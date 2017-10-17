/*
 HTCAP - www.htcap.org
 Author: filippo.cavallarin@wearesegment.com

 This program is free software; you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation; either version 2 of the License, or (at your option) any later
 version.
 */


(function() {
    'use strict';

    const __PROBE_CONSTANTS__ = require('./constants').__PROBE_CONSTANTS__;


    exports.setProbe = function setProbe(options, inputValues, EventLoopManager) {

        console.info(EventLoopManager());

        class Probe {
            /**
             * @param options
             * @param inputValues
             * @constructor
             */
            constructor(options, inputValues) {
                this._options = options;

                this.sentXHRs = [];

                this.eventLoopManager = new EventLoopManager(this);

                this.requestToPrint = [];
                this._currentPageEvent = undefined;
                this._eventsMap = [];
                this._triggeredPageEvents = [];
                this._inputValues = inputValues;
            }


            addToRequestToPrint(request) {
                var requestKey = request.key;
                if (this.requestToPrint.indexOf(requestKey) < 0) {
                    this.requestToPrint.push(requestKey);
                }
            }

            printRequests() {
                this.requestToPrint.forEach(function(request) {
                    _print('["request",' + request + '],');
                });
            }

            printJSONP(node) {

                if (node.nodeName.toLowerCase() === 'script' && node.hasAttribute('src')) {
                    var a = document.createElement('a'),
                        src = node.getAttribute('src');

                    a.href = src;

                    // JSONP must have a querystring...
                    if (a.search) {
                        var req = new this.Request('jsonp', 'GET', src, null, this.getLastTriggerPageEvent());
                        this.addToRequestToPrint(req);
                    }
                }
            }

            printLink(url) {
                var req;

                url = url.split('#')[0];

                if (!(url.match(/^[a-z0-9\-_]+:/i) && !url.match(/(^https?)|(^ftps?):/i))) {
                    req = new this.Request('link', 'GET', url, undefined, this.getLastTriggerPageEvent());
                }

                if (req) {
                    this.addToRequestToPrint(req);
                }
            }

            printWebsocket(url) {
                var req = new this.Request('websocket', 'GET', url, null, this.getLastTriggerPageEvent());
                this.addToRequestToPrint(req);
            }

            getRandomValue(type) {
                if (!(type in this._inputValues)) {
                    type = 'string';
                }

                return this._inputValues[type];
            }

            /**
             * return the last element/event name pair triggered
             * @returns {PageEvent}
             */
            getLastTriggerPageEvent() {
                return this._currentPageEvent;
            }

            /**
             * get request from the given FORM element
             * @param {Element} form
             * @returns {Probe.Request}
             */
            getFormAsRequest(form) {
                var par, req,
                    formObj = {};

                formObj.method = form.getAttribute('method');
                if (!formObj.method) {
                    formObj.method = 'GET';
                } else {
                    formObj.method = formObj.method.toUpperCase();
                }

                formObj.url = form.getAttribute('action');
                if (!formObj.url) {
                    formObj.url = document.location.href;
                }
                formObj.data = [];
                var inputs = form.querySelectorAll('input, select, textarea');
                for (var a = 0; a < inputs.length; a++) {
                    if (!inputs[a].name) {
                        continue;
                    }
                    par = encodeURIComponent(inputs[a].name) + '=' + encodeURIComponent(inputs[a].value);
                    if (inputs[a].tagName === 'INPUT' && inputs[a].type !== null) {

                        switch (inputs[a].type.toLowerCase()) {
                            case 'button':
                            case 'submit':
                                break;
                            case 'checkbox':
                            case 'radio':
                                if (inputs[a].checked) {
                                    formObj.data.push(par);
                                }
                                break;
                            default:
                                formObj.data.push(par);
                        }

                    } else {
                        formObj.data.push(par);
                    }
                }

                formObj.data = formObj.data.join('&');

                if (formObj.method === 'GET') {
                    var url = _replaceUrlQuery(formObj.url, formObj.data);
                    req = new this.Request('form', 'GET', url);
                } else {
                    req = new this.Request('form', 'POST', formObj.url, formObj.data);
                }

                return req;
            }

            /**
             * add the given element/event pair to map
             * @param {Element} element
             * @param {String} eventName
             */
            addEventToMap(element, eventName) {

                for (var a = 0; a < this._eventsMap.length; a++) {
                    if (this._eventsMap[a].element === element) {
                        this._eventsMap[a].events.push(eventName);
                        return;
                    }
                }

                this._eventsMap.push({
                    element: element,
                    events: [eventName],
                });
            }

            /**
             * Start the analysis of the current Document
             */
            startAnalysis() {

                // Parsing the current DOM
                var elements = document.getElementsByTagName('*');
                for (var i = 0; i < elements.length; i++) {
                    var element = elements[i];
                    if (element.nodeType === Node.ELEMENT_NODE) {
                        this.eventLoopManager.scheduleDOMAssessment(element);
                    }
                }

                // starting the eventLoop manager
                this.eventLoopManager.start();
            }

            removeUrlParameter(url, par) {
                var anchor = document.createElement('a');
                anchor.href = url;

                var pars = anchor.search.substr(1)
                    .split(/(?:&amp;|&)+/);

                for (var a = pars.length - 1; a >= 0; a--) {
                    if (pars[a].split('=')[0] === par) {
                        pars.splice(a, 1);
                    }
                }

                return anchor.protocol + '//' + anchor.host + anchor.pathname + (pars.length > 0 ? '?' + pars.join('&') : '') + anchor.hash;
            }

            getAbsoluteUrl(url) {
                var anchor = document.createElement('a');
                anchor.href = url;
                return anchor.href;
            }

            /**
             * returns true if the value has been set
             * @param {Element} el
             * @private
             */
            _setVal(el) {
                var _this = this;

                var setv = function(name) {
                    var ret = _this.getRandomValue('string');
                    __PROBE_CONSTANTS__.inputNameMatchValue.forEach(function(matchValue) {
                        var regexp = new RegExp(matchValue.name, 'gi');
                        if (name.match(regexp)) {
                            ret = _this.getRandomValue(matchValue.value);
                        }
                    });
                    return ret;
                };

                // needed for example by angularjs
                var triggerChange = function() {
                    // update angular model
                    _this._trigger(new _this.PageEvent(el, 'input'));

                    // _this._trigger(new _this.PageEvent(el, 'blur'));
                    // _this._trigger(new _this.PageEvent(el, 'keyup'));
                    // _this._trigger(new _this.PageEvent(el, 'keydown'));
                };

                if (el.tagName.toLowerCase() === 'textarea') {
                    el.value = setv(el.name);
                    triggerChange();

                } else if (el.tagName.toLowerCase() === 'select') {
                    var opts = el.getElementsByTagName('option');
                    if (opts.length > 1) { // avoid to set the first (already selected) options
                        // @TODO .. qui seleziono l'ultimo val.. ma devo controllare che non fosse "selected"
                        el.value = opts[opts.length - 1].value;
                    } else {
                        el.value = setv(el.name);
                    }
                    triggerChange();

                } else if (el.tagName.toLowerCase() === 'input') {
                    var type = el.type.toLowerCase();

                    switch (type) {
                        case 'button':
                        case 'hidden':
                        case 'submit':
                        case 'file':
                            return;
                        case '':
                        case 'text':
                        case 'search':
                            el.value = setv(el.name);
                            break;
                        case 'radio':
                        case 'checkbox':
                            el.setAttribute('checked', !(el.getAttribute('checked')));
                            break;
                        case 'range':
                        case 'number':
                            if ('min' in el && el.min) {
                                el.value = (parseInt(el.min) + parseInt(('step' in el) ? el.step : 1));
                            } else {
                                el.value = parseInt(this.getRandomValue('number'));
                            }
                            break;
                        case 'password':
                        case 'color':
                        case 'date':
                        case 'email':
                        case 'month':
                        case 'time':
                        case 'url':
                        case 'week':
                        case 'tel':
                            el.value = this.getRandomValue(type);
                            break;
                        case 'datetime-local':
                            el.value = this.getRandomValue('datetimeLocal');
                            break;
                        default:
                            return;
                    }

                    triggerChange();
                }
            }

            /**
             * schedule the trigger of the given event on the given element when the eventLoop is ready
             *
             * @param {PageEvent} pageEvent which have to be triggered
             * @private
             */
            _trigger(pageEvent) {
                // workaround for a phantomjs bug on linux (so maybe not a phantom bug but some linux libs??).
                // if you trigger click on input type=color everything freezes... maybe due to some
                // color picker that pops up ...
                if (!(pageEvent.element.tagName.toUpperCase() === 'INPUT' &&
                        pageEvent.element.type.toLowerCase() === 'color' &&
                        pageEvent.eventName.toLowerCase() === 'click')) {

                    // trigger the given event only when there is some space in the event stack to avoid collision
                    // and give time to things to resolve properly (since we trigger user driven event,
                    // it is important to give time to the analysed page to breath between calls)
                    this.eventLoopManager.scheduleEventTriggering(pageEvent);
                }
            }

            /**
             * @param  {Element} element
             * @returns {Array}
             * @private
             */
            _getEventsForElement(element) {
                var events = [];

                var map = this._eventsMap;
                for (var a = 0; a < map.length; a++) {
                    if (map[a].element === element) {
                        events = map[a].events.slice();
                        break;
                    }
                }

                for (var selector in __PROBE_CONSTANTS__.triggerableEvents) {
                    if (element.webkitMatchesSelector(selector)) {
                        events = events.concat(__PROBE_CONSTANTS__.triggerableEvents[selector]);
                    }
                }

                return events;
            }

            /**
             * Request trigger all event for a given element
             * @param {Element} element
             * @private
             */
            _triggerElementEvents(element) {
                var events = this._getEventsForElement(element);

                events.forEach(function(eventName) {
                    var pageEvent = new this.PageEvent(element, eventName);
                    // DEBUG:
                    // console.log("triggering events for : " + _elementToString(element) + " " + eventName);

                    if (_isEventTriggerable(eventName) && !_objectInArray(this._triggeredPageEvents, pageEvent)) {
                        this._triggeredPageEvents.push(pageEvent);
                        this._trigger(pageEvent);
                    }
                }.bind(this));
            }

            /**
             * @param {Element} element
             * @private
             */
            _mapElementEvents(element) {
                __PROBE_CONSTANTS__.mappableEvents.forEach(function(eventName) {
                    var onEventName = 'on' + eventName;

                    if (onEventName in element && element[onEventName]) {
                        this.addEventToMap(element, eventName);
                    }
                }.bind(this));
            }

            /**
             * print request from <form> html tag
             * @param {Element} element
             * @private
             */
            _printRequestFromForm(element) {
                if (element.tagName.toLowerCase() === 'form') {
                    this.addToRequestToPrint(this.getFormAsRequest(element));
                }
            }

            /**
             * print request from <a> html tag
             * @param {Element} element
             * @private
             */
            _printRequestFromATag(element) {
                if (element.tagName.toLowerCase() === 'a' && element.hasAttribute('href')) {
                    this.printLink(element.href);
                }
            }

            /**
             * analyze the given element
             * @param {Element} element - the element to analyze
             * @private
             */
            _analyzeDOMElement(element) {

                // map property events and fill input values
                this._mapElementEvents(element);

                if (this._options.fillValues) {
                    // Parsing the current element and set values for each element within
                    var elements = element.getElementsByTagName('*');
                    for (var i = 0; i < elements.length; i++) {
                        this._setVal(elements[i]);
                    }
                }

                this._printRequestFromForm(element);
                this._printRequestFromATag(element);

                if (this._options.triggerEvents) {
                    this._triggerElementEvents(element);
                }
            }
        }

        // /**
        //  * Class Request
        //  *
        //  * @param {String}  type
        //  * @param {String} method
        //  * @param {String} url
        //  * @param {Object=} data
        //  * @param {PageEvent=} triggerer - the PageEvent triggered to generate the request
        //  * @constructor
        //  */
        // Probe.prototype.Request = function(type, method, url, data, triggerer) {
        //     this.type = type;
        //     this.method = method;
        //     this.url = url;
        //     this.data = data || null;
        //
        //     /** @type {PageEvent} */
        //     this.triggerer = triggerer;
        //
        //     //this.username = null; // todo
        //     //this.password = null;
        // };
        //
        // Object.defineProperties(Probe.prototype.Request.prototype, {
        //     /**
        //      *  returns a unique string representation of the request. used for comparision.
        //      */
        //     key: {
        //         get: function() {
        //             return JSON.stringify(this);
        //         },
        //     },
        // });
        //
        // /**
        //  * the standard toJSON for JSON.stringify() call
        //  * @returns {{type: *, method: *, url: *, data: null}}
        //  */
        // Probe.prototype.Request.prototype.toJSON = function() {
        //     var obj = {
        //         type: this.type,
        //         method: this.method,
        //         url: this.url,
        //         data: this.data || null,
        //     };
        //
        //     if (this.triggerer) {
        //         obj.trigger = {element: _elementToString(this.triggerer.element), event: this.triggerer.eventName};
        //     }
        //
        //     return obj;
        // };
        //
        // // END OF class Request..
        //
        // /**
        //  * Class PageEvent
        //  * Element's event found in the page
        //  *
        //  * @param {Element} element
        //  * @param {String} eventName
        //  * @constructor
        //  */
        // Probe.prototype.PageEvent = function(element, eventName) {
        //     /**
        //      * the DOM element
        //      * @type {Element}
        //      */
        //     this.element = element;
        //     /**
        //      * the event name
        //      * @type {String}
        //      */
        //     this.eventName = eventName;
        // };
        //
        // /**
        //  * Trigger the page event
        //  */
        // Probe.prototype.PageEvent.prototype.trigger = function() {
        //
        //     // DEBUG:
        //     // console.log('PageEvent triggering events for : ', _elementToString(this.element), this.eventName);
        //
        //     if ('createEvent' in document) {
        //         var evt = document.createEvent('HTMLEvents');
        //         evt.initEvent(this.eventName, true, false);
        //         this.element.dispatchEvent(evt);
        //     } else {
        //         var eventName = 'on' + this.eventName;
        //         if (eventName in this.element && typeof this.element[eventName] === 'function') {
        //             this.element[eventName]();
        //         }
        //     }
        // };
        //


        function _print(str) {
            window.__callPhantom({cmd: 'print', argument: str});
        }

        /**
         * convert an element to a string
         * @param {Element=} element - element to convert
         * @returns {string}
         * @private
         * @static
         */
        function _elementToString(element) {
            if (!element) {
                return '[]';
            }
            var tagName = (element === document ? 'DOCUMENT' : (element === window ? 'WINDOW' : element.tagName));
            var text = undefined;
            if (element.textContent) {
                text = element.textContent.trim()
                    .replace(/\s/, ' ')
                    .substring(0, 10);
                if (text.indexOf(' ') > -1) {
                    text = '\'' + text + '\'';
                }
            }

            var className = element.className ? (element.className.indexOf(' ') !== -1 ? '\'' + element.className + '\'' : element.className) : '';

            return '[' +
                (tagName ? tagName + ' ' : '') +
                (element.name && typeof element.name === 'string' ? element.name + ' ' : '') +
                (className ? '.' + className + ' ' : '') +
                (element.id ? '#' + element.id + ' ' : '') +
                (element.src ? 'src=' + element.src + ' ' : '') +
                (element.action ? 'action=' + element.action + ' ' : '') +
                (element.method ? 'method=' + element.method + ' ' : '') +
                (element.value ? 'v=' + element.value + ' ' : '') +
                (text ? 'txt=' + text : '') +
                ']';
        }

        /**
         * @param eventName
         * @returns {boolean}
         * @private
         * @static
         */
        function _isEventTriggerable(eventName) {
            return ['load', 'unload', 'beforeunload'].indexOf(eventName) === -1;
        }

        /**
         *
         * @param arr
         * @param el
         * @param ignoreProperties
         * @returns {boolean}
         * @private
         * @static
         */
        function _objectInArray(arr, el, ignoreProperties) {
            ignoreProperties = ignoreProperties || [];
            if (arr.length === 0) {
                return false;
            }
            if (typeof arr[0] !== 'object') {
                return arr.indexOf(el) > -1;
            }
            for (var a = 0; a < arr.length; a++) {
                var found = true;
                for (var k in arr[a]) {
                    if (arr[a][k] !== el[k] && ignoreProperties.indexOf(k) === -1) {
                        found = false;
                    }
                }
                if (found) {
                    return true;
                }
            }
            return false;
        }

        function _replaceUrlQuery(url, qs) {
            var anchor = document.createElement('a');
            anchor.href = url;
            /*
             Example of content:
             anchor.protocol; // => "http:"
             anchor.host;     // => "example.com:3000"
             anchor.hostname; // => "example.com"
             anchor.port;     // => "3000"
             anchor.pathname; // => "/pathname/"
             anchor.hash;     // => "#hash"
             anchor.search;   // => "?search=test"
             */
            return anchor.protocol + '//' + anchor.host + anchor.pathname + (qs ? '?' + qs : '') + anchor.hash;
        }

        let probe = new Probe(options, inputValues);
        // listening for messageEvent to trigger waiting events
        window.addEventListener('message', probe.eventLoopManager.eventMessageHandler.bind(probe.eventLoopManager), true);

        window.__PROBE__ = probe;

    };
})();
