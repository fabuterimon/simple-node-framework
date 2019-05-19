const Helpers = require('../util/helpers');
const config = require('../config');
const errorHandler = require('../error').instance;

// this class implments the origin concept
// it will read origin node in configuration file and will test if the request sent all enabled origins
class Origin {
    constructor() {
        this.config = config;
        this.errorHandler = errorHandler;
    }

    // test if the request sent all enabled origins
    proccess(req, res, next) {
        if (this.config.origin && this.itsNotToIgnore(req)) {

            if (!this.hasApplication(req)) {
                return next(this.errorHandler.throw(`The header x-origin-application is required for request [${req.id}].`, 412));
            }

            if (!this.hasChannel(req)) {
                return next(this.errorHandler.throw(`The header x-origin-channel is required for request [${req.id}].`, 412));
            }

            if (!this.hasDevice(req)) {
                return next(this.errorHandler.throw(`The header x-origin-device is required for request [${req.id}].`, 412));
            }
        }

        req.origin = {
            application: req.header('x-origin-application'),
            channel: req.header('x-origin-channel'),
            device: req.header('x-origin-device')
        };

        return next();
    }

    // vefify if the route has to be ignored by the validation
    itsNotToIgnore(req) {
        const path = req.path.toLowerCase();

        /* eslint-disable no-restricted-syntax */
        if (this.config.origin.ignoreExact) {
            // ignore the exact route
            for (const currentPath of this.config.origin.ignoreExact) {
                if (path === currentPath.toLowerCase()) return false;
            }
        }

        if (this.config.origin.ignore) {
            // ignore the route pattern
            for (const currentPath of this.config.origin.ignore) {
                if (path.startsWith(currentPath)) return false;
            }
        }
        /* eslint-enable no-restricted-syntax */

        return true;
    }

    // test if request has x-origin-application header
    hasApplication(req) {
        return this.config.origin.require.application ? req.header('x-origin-application') : true;
    }

    // test if request has x-origin-channel header
    hasChannel(req) {
        return this.config.origin.require.channel ? req.header('x-origin-channel') : true;
    }

    // test if request has x-origin-device header
    hasDevice(req) {
        return this.config.origin.require.device ? req.header('x-origin-device') : true;
    }
}

module.exports = {
    class: Origin,
    instance: new Origin()
};
