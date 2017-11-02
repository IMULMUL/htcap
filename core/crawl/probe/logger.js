(function() {
    'use strict';
    const winston = require('winston');

    let logger = new (winston.Logger)({
        transports: [
            new (winston.transports.File)(
                {
                    level: 'debug',
                    filename: __dirname + '/debug.log',
                    prettyPrint: true,
                    timestamp: true,
                    colorize: true,
                },
            ),
            new (winston.transports.Console)(
                {
                    level: 'info',
                    timestamp: false,
                    prettyPrint: false,
                    json: true,
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
