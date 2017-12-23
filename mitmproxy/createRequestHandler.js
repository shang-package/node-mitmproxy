'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var http = require('http');
var https = require('https');
var url = require('url');
var commonUtil = require('../common/util');
var upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i;

// create requestHandler function
module.exports = function createRequestHandler(requestInterceptor, responseInterceptor, middlewares, externalProxy) {

    // return
    return function requestHandler(req, res, ssl) {
        var _this = this;

        var proxyReq;

        var rOptions = commonUtil.getOptionsFormRequest(req, ssl, externalProxy);

        if (rOptions.headers.connection === 'close') {
            req.socket.setKeepAlive(false);
        } else if (rOptions.customSocketId != null) {
            // for NTLM
            req.socket.setKeepAlive(true, 60 * 60 * 1000);
        } else {
            req.socket.setKeepAlive(true, 30000);
        }

        var requestInterceptorPromise = function requestInterceptorPromise() {
            return new Promise(function (resolve, reject) {
                var next = function next() {
                    resolve();
                };
                try {
                    if (typeof requestInterceptor === 'function') {
                        requestInterceptor.call(null, rOptions, req, res, ssl, next);
                    } else {
                        resolve();
                    }
                } catch (e) {
                    reject(e);
                }
            });
        };

        var proxyRequestPromise = function proxyRequestPromise() {
            return new Promise(function (resolve, reject) {

                rOptions.host = rOptions.hostname || rOptions.host || 'localhost';

                // use the binded socket for NTLM
                if (rOptions.agent && rOptions.customSocketId != null && rOptions.agent.getName) {
                    var socketName = rOptions.agent.getName(rOptions);
                    var bindingSocket = rOptions.agent.sockets[socketName];
                    if (bindingSocket && bindingSocket.length > 0) {
                        bindingSocket[0].once('free', onFree);
                        return;
                    }
                }
                onFree();
                function onFree() {
                    proxyReq = (rOptions.protocol == 'https:' ? https : http).request(rOptions, function (proxyRes) {
                        resolve(proxyRes);
                    });
                    proxyReq.on('timeout', function () {
                        reject(rOptions.host + ':' + rOptions.port + ', request timeout');
                    });

                    proxyReq.on('error', function (e) {
                        reject(e);
                    });

                    proxyReq.on('aborted', function () {
                        reject('server aborted reqest');
                        req.abort();
                    });

                    req.on('aborted', function () {
                        proxyReq.abort();
                    });
                    req.pipe(proxyReq);
                }
            });
        };

        // workflow control
        _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
            var proxyRes, responseInterceptorPromise;
            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            _context.next = 2;
                            return requestInterceptorPromise();

                        case 2:
                            if (!res.finished) {
                                _context.next = 4;
                                break;
                            }

                            return _context.abrupt('return', false);

                        case 4:
                            _context.next = 6;
                            return proxyRequestPromise();

                        case 6:
                            proxyRes = _context.sent;
                            responseInterceptorPromise = new Promise(function (resolve, reject) {
                                var next = function next() {
                                    resolve();
                                };
                                try {
                                    if (typeof responseInterceptor === 'function') {
                                        responseInterceptor.call(null, req, res, proxyReq, proxyRes, ssl, next);
                                    } else {
                                        resolve();
                                    }
                                } catch (e) {
                                    reject(e);
                                }
                            });
                            _context.next = 10;
                            return responseInterceptorPromise;

                        case 10:
                            if (!res.finished) {
                                _context.next = 12;
                                break;
                            }

                            return _context.abrupt('return', false);

                        case 12:
                            _context.prev = 12;

                            if (!res.headersSent) {
                                // prevent duplicate set headers
                                Object.keys(proxyRes.headers).forEach(function (key) {
                                    if (proxyRes.headers[key] != undefined) {
                                        // https://github.com/nodejitsu/node-http-proxy/issues/362
                                        if (/^www-authenticate$/i.test(key)) {
                                            if (proxyRes.headers[key]) {
                                                proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
                                            }
                                            key = 'www-authenticate';
                                        }
                                        res.setHeader(key, proxyRes.headers[key]);
                                    }
                                });

                                res.writeHead(proxyRes.statusCode);
                                proxyRes.pipe(res);
                            }
                            _context.next = 19;
                            break;

                        case 16:
                            _context.prev = 16;
                            _context.t0 = _context['catch'](12);
                            throw _context.t0;

                        case 19:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, _this, [[12, 16]]);
        }))().then(function (flag) {
            // do nothing
        }, function (e) {
            if (!res.finished) {
                res.writeHead(500);
                res.write('Node-MitmProxy Warning:\n\n ' + e.toString());
                res.end();
            }
            console.error(e);
        });
    };
};