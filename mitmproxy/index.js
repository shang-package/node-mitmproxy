'use strict';

var tlsUtils = require('../tls/tlsUtils');
var http = require('http');
var config = require('../common/config');
var colors = require('colors');
var createRequestHandler = require('./createRequestHandler');
var createConnectHandler = require('./createConnectHandler');
var createFakeServerCenter = require('./createFakeServerCenter');
var createUpgradeHandler = require('./createUpgradeHandler');

module.exports = {
    createProxy: function createProxy(_ref) {
        var _ref$port = _ref.port,
            port = _ref$port === undefined ? config.defaultPort : _ref$port,
            caCertPath = _ref.caCertPath,
            caKeyPath = _ref.caKeyPath,
            sslConnectInterceptor = _ref.sslConnectInterceptor,
            requestInterceptor = _ref.requestInterceptor,
            responseInterceptor = _ref.responseInterceptor,
            _ref$getCertSocketTim = _ref.getCertSocketTimeout,
            getCertSocketTimeout = _ref$getCertSocketTim === undefined ? 1 * 1000 : _ref$getCertSocketTim,
            _ref$middlewares = _ref.middlewares,
            middlewares = _ref$middlewares === undefined ? [] : _ref$middlewares,
            externalProxy = _ref.externalProxy;


        // Don't reject unauthorized
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

        if (!caCertPath && !caKeyPath) {
            var rs = this.createCA();
            caCertPath = rs.caCertPath;
            caKeyPath = rs.caKeyPath;
            if (rs.create) {
                console.log(colors.cyan('CA Cert saved in: ' + caCertPath));
                console.log(colors.cyan('CA private key saved in: ' + caKeyPath));
            }
        }

        port = ~~port;
        var requestHandler = createRequestHandler(requestInterceptor, responseInterceptor, middlewares, externalProxy);

        var upgradeHandler = createUpgradeHandler();

        var fakeServersCenter = createFakeServerCenter({
            caCertPath: caCertPath,
            caKeyPath: caKeyPath,
            requestHandler: requestHandler,
            upgradeHandler: upgradeHandler,
            getCertSocketTimeout: getCertSocketTimeout
        });

        var connectHandler = createConnectHandler(sslConnectInterceptor, fakeServersCenter, externalProxy);

        var server = new http.Server();
        server.listen(port, function () {
            console.log(colors.green('node-mitmproxy\u542F\u52A8\u7AEF\u53E3: ' + port));
            server.on('error', function (e) {
                console.error(colors.red(e));
            });
            server.on('request', function (req, res) {
                var ssl = false;
                requestHandler(req, res, ssl);
            });
            // tunneling for https
            server.on('connect', function (req, cltSocket, head) {
                connectHandler(req, cltSocket, head);
            });
            // TODO: handler WebSocket
            server.on('upgrade', function (req, socket, head) {
                var ssl = false;
                upgradeHandler(req, socket, head, ssl);
            });
        });
    },
    createCA: function createCA() {
        var caBasePath = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : config.getDefaultCABasePath();

        return tlsUtils.initCA(caBasePath);
    }
};