const uuidv4 = require('uuid/v4');
const logger = require('../log').instance;

// this class configure request/response automatic logs
class RequestAndResponseLogger {
    // configure the middlewares
    static configure(server) {
        server.use(RequestAndResponseLogger.request.bind(this));
        server.on('after', RequestAndResponseLogger.response.bind(this));
    }

    // log the request
    static request(req, res, next) {
        req.id = uuidv4().replace(/-/g, '');
        const request = `REQUEST ${req.id} - ${req.method} ${req.url} - Ip [${RequestAndResponseLogger.ip(req)}] - Body [${JSON.stringify(req.body)}] - Header [${JSON.stringify(req.headers)}]`;
        logger.debug('SNF RequestAndResponseLogger', request);
        return next();
    }

    // log the response
    static response(req, res, route) {
        const { versions } = route ? route.spec : '';

        // do not log in to some answers, depending on the content type
        let data = res._data;
        if (res._headers['content-type'] === 'application/javascript') {
            data = 'application/javascript';
        }

        const response = `RESPONSE ${req.id} - ${req.method} ${req.url} - Version [${versions}] - Status [${res.statusCode}] - Ip [${RequestAndResponseLogger.ip(req)}] - Body [${data}] - Header [${res._header}]`;
        logger.debug('SNF RequestAndResponseLogger', response);
    }

    // get user Ip address
    static ip(req) {
        let ip = '';

        try {
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        } catch (err) {
            // ignora os erros de recuperação de IP
        }

        return ip;
    }
}

module.exports = RequestAndResponseLogger;
