(function () {
    'use strict';
    const winston = require('winston');

    let logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)(
                {
                    prettyPrint: true,
                    timestamp: true,
                    level: 'debug',
                    colorize: true,
                },
            ),
            // new winston.transports.File({filename: __dirname + '/debug.log', json: false}),
        ],
        exceptionHandlers: [
            new (winston.transports.Console)({json: false, timestamp: true, prettyPrint: true, colorize: true}),
            // new winston.transports.File({filename: __dirname + '/exceptions.log', json: false}),
        ],
        exitOnError: true,
    });

    module.exports = logger;

})();
