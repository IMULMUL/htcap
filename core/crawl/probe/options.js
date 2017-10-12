/*
HTCAP - beta 1
Author: filippo.cavallarin@wearesegment.com

This program is free software; you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation; either version 2 of the License, or (at your option) any later
version.
*/


window.options = {
    fillValues: true,
    triggerEvents: true,
    maxExecTime: 100000, // 100 seconds
    XHRTimeout: 5000,
    httpAuth: false,
    overrideTimeoutFunctions: true,
    referer: false,
    userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
    setCookies: [],
    excludedUrls: [],

    // map input names to string generators. see generateRandomValues to see all available generators
    inputNameMatchValue: [ // regexps NEED to be string to get passed to phantom page
        {name: "mail", value: "email"},
        {name: "((number)|(phone))|(^tel)", value: "number"},
        {name: "(date)|(birth)", value: "humandate"},
        {name: "((month)|(day))|(^mon$)", value: "month"},
        {name: "year", value: "year"},
        {name: "url", value: "url"},
        {name: "firstname", value: "firstname"},
        {name: "(surname)|(lastname)", value: "surname"},
    ]
};
