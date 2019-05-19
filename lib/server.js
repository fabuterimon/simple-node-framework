const express  = require('express');
var bodyParser = require('body-parser')
const bunyan = require('bunyan');
const os = require('os');
const Base = require('./base/base');
const Cache = require('./cache');
const Session = require('./session');
const config = require('./config');
const origin = require('./plugins/origin').instance;
const logger = require('./log').instance;
const route = require('./route').instance;
const database = require('./database').instance;
const redis = require('./redis').instance;
const errorHandler = require('./error').instance;
const RequestAndResponseLogger = require('./plugins/request-response-logger');

// this class abstracts the web server concept.
class Server extends Base {
    constructor({ module = 'SNF Server' } = {}) {
        super({
            module
        });

        this.config = config;
        this.baseServer = express;
        this.server = null;
        this.origin = origin;
        this.route = route;
        this.module = module;
        this.healthCheckUrl = this.config.app.healthCheck || '/';
    }

    // configure server, middlewares, cors, error handle and audit
    configure(options = { port: 8080, listenCallBack: null }) {
        this.configureWebServer();

        this.configureMiddlewares();

        this.configureErrorHaldle();

        this.configureAudit();

        this.listen(options.port, options.listenCallBack);

        return this.server;
    }

    // creating the web server and attaching the logger
    configureWebServer() {
        this.server = this.baseServer();

        // close server event
        // close database and redis connections on server close event
        process.on('SIGINT', () => {
            if (this.listeningServer) {
                this.log.debug('The application has been terminated');
                this.listeningServer.close();
                database.close();
                redis.close();
            }
        });
    }

    // override this method to include or change the order of your middleware and plugins
    configureMiddlewares() {
        // applying the web server plugins
        this.server.use(bodyParser.urlencoded({ extended: false }));
        this.server.use(bodyParser.json());

        
        // this.server.use(this.baseServer.plugins.acceptParser(this.server.acceptable));
        // this.server.use(this.baseServer.plugins.authorizationParser());
        // this.server.use(this.baseServer.plugins.gzipResponse());
        // this.server.use(this.baseServer.plugins.queryParser());
        // this.server.use(this.baseServer.plugins.bodyParser());
        
        // enable the automatic request and response logs
        RequestAndResponseLogger.configure(this.server);
        
        // enable the limit of the quantity of requests per user in a time interval
        //if (this.config.throttle) this.server.use(this.baseServer.plugins.throttle(this.config.throttle));
        
        // enable the origin plugin
        if (this.origin) this.server.use(this.origin.proccess.bind(this.origin));
        
        this.configureCors();
        
        this.configureCache();
        
        this.configureSession();
        
    }
    
    // configure application routes
    configureRoutes() {
        this.route.importModuleRoutes();
        this.configureHealthCheck();
    }

    // configure health check route
    configureHealthCheck() {
        this.server.get(this.healthCheckUrl, (req, res, next) => {
            res.send(200, `${this.config.app.name} is running with ${this.config.app.env} environment on ${os.hostname()}`);
            return next();
        });
    }

    // configure Cross-Origin Resource Sharing (CORS) [https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Controle_Acesso_CORS]
    configureCors() {
        // if (this.config.cors) {
        //     const cors = require('restify-cors-middleware')(this.config.cors); // eslint-disable-line
        //     this.server.pre(cors.preflight);
        //     this.server.use(cors.actual);
        // }
    }

    // configure the error handle
    configureErrorHaldle() {
        process.on('uncaughtException', (error) => {
            logger.debug('Uncaught Exception', 'An Uncaught Exception was throwed', {
                error
            });
            console.log(error);
        });

        this.server.use(errorHandler.handle.bind(errorHandler));
        this.server.on('restifyError', errorHandler.handle.bind(errorHandler));
    }

    // configure web server audit
    configureAudit({ customMethod } = {}) {
        // if (this.config.audit && this.config.audit.enabled) {
        //     this.server.on(
        //         'after',
        //         restify.plugins.auditLogger({
        //             server: this.server,
        //             event: 'after',
        //             log: bunyan.createLogger(this.config.audit.bunyan),
        //             context: customMethod,
        //             printLog: this.config.audit.printLog
        //         })
        //     );
        // }
    }

    // configure and connect to the database
    configureDatabase() {
        database.connect();
    }

    // configure and connect to the redis
    configureRedis() {
        redis.connect();
    }

    // configure and cache if the redis is enabled
    configureCache() {
        if (this.config.redis && this.config.cache && this.config.cache.enabled) {
            this.server.use((req, res, next) => {
                req.cache = new Cache();
                return next();
            });

            this.log.debug('Cache has been configured');
        }
    }

    // configure session if the redis is enabled
    configureSession() {
        if (this.config.redis && this.config.session) {
            this.server.use(async (req, res, next) => {
                new Session(req)
                    .load()
                    .then(() => {
                        return next();
                    })
                    .catch((error) => {
                        this.log.error('Unespected error on session load', error);
                        return next('Unespected error on session load');
                    });
            });
            this.log.debug('Session has been configured');
        }
    }

    // start web-server listen
    listen(port, listenCallBack) {
        const _port = this.config.app.port || port;

        const callback = () => {
            this.log.debug(`The sandbox is running as [${config.app.env}] [http://localhost:${_port}${this.healthCheckUrl}]`);
            this.configureDatabase();
            this.configureRedis();
            this.configureRoutes(); // ATTENTION: configureRoutes have to be after configureDatabase
        };

        this.listeningServer = this.server.listen(_port, listenCallBack || callback);
    }
}

module.exports = Server;
