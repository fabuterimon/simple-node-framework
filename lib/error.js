const restifyErrors = require('restify-errors');
const Loggable = require('./base/loggable');

// this class handle with application errors, you can differentiate business errors from unexpected errors
class ErrorHandler extends Loggable {
    constructor() {
        super({
            module: 'SNF Error Handler'
        });
        this.restifyErrors = restifyErrors;
        this.defineCustomErros();
    }

    // override this method to put your custom errors
    defineCustomErros() {
        this.restifyErrors.makeConstructor('InvalidTokenError', {
            statusCode: 404,
            failureType: 'motion'
        });

        this.restifyErrors.makeConstructor('BusinessError', {
            statusCode: 500,
            failureType: 'motion'
        });

        // this.restifyErrors.makeConstructor('InvalidIdendifierError', {
        //     statusCode: 400,
        //     failureType: 'motion'
        // });
        //
        // Ex.: ErrorHandler.throw('Your CPF is not valid', 'InvalidIdendifierError')
    }

    // throw restify compatible errors. if you throw in a string, it will throw an BusinessError
    throw(error, statusCode = 500) {
        const isError = error instanceof Error;

        if (!isError)
            error = new Error(error);

        error.statusCode = statusCode;

        return error;
    }

    // automacaly logs all application throwed errors
    // override this method to put your custom error handle like:
    // callAdministrator(error)
    // updateStatistics(error)
    handle(error, req, res, callback) {
        this.log.error(error.message, {
            path: req.path,
            stack: error.stack,
            error
        });

        // Override this method to put your custom error handle like:
        // callAdministrator(error);
        // updateStatistics(error);

        if (typeof (callback) === 'function' && res.headersSent) callback(error, req, res);
        else res.status(error.statusCode || 500).send(error.message);
    }

    // helper to sends an response and logs the error
    send(req, res, error, respondWith) {
        this.log.error(error.message, {
            path: req.path(),
            stack: error.stack,
            error
        });

        if (!(respondWith instanceof Error)) {
            respondWith = new Error(respondWith || ''); // eslint-disable-line 
        }

        res.send(respondWith.statusCode || 500, respondWith.message);
    }
}

module.exports = {
    class: ErrorHandler,
    instance: new ErrorHandler()
};
