(function() {
    'use strict';
    const winston = require('winston');

    let outputLogger = new winston.Logger({
        transports: [
            new (winston.transports.Console)(
                {
                    formatter: (options) => {
                        return options.message;
                    },
                },
            ),
        ],
        exitOnError: true,
    });

    let debugLogger = new winston.Logger({
        transports: [
            new (winston.transports.File)(
                {
                    level: 'debug',
                    filename: __dirname + '/debug.log',
                    prettyPrint: true,
                    timestamp: true,
                    json: false,
                },
            ),
        ],
        exceptionHandlers: [
            new (winston.transports.Console)({json: false, timestamp: true, prettyPrint: true}),
        ],
    });
    module.exports = {output: outputLogger, debug: debugLogger};

})();
