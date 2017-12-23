'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var https = require('https');
var tlsUtils = require('./tlsUtils');
var CertAndKeyContainer = require('./CertAndKeyContainer');
var forge = require('node-forge');
var pki = forge.pki;
var colors = require('colors');
var tls = require('tls');

module.exports = function () {
    function FakeServersCenter(_ref) {
        var _ref$maxLength = _ref.maxLength,
            maxLength = _ref$maxLength === undefined ? 100 : _ref$maxLength,
            requestHandler = _ref.requestHandler,
            upgradeHandler = _ref.upgradeHandler,
            caCert = _ref.caCert,
            caKey = _ref.caKey,
            getCertSocketTimeout = _ref.getCertSocketTimeout;

        _classCallCheck(this, FakeServersCenter);

        this.queue = [];
        this.maxLength = maxLength;
        this.requestHandler = requestHandler;
        this.upgradeHandler = upgradeHandler;
        this.certAndKeyContainer = new CertAndKeyContainer({
            getCertSocketTimeout: getCertSocketTimeout,
            caCert: caCert,
            caKey: caKey
        });
    }

    _createClass(FakeServersCenter, [{
        key: 'addServerPromise',
        value: function addServerPromise(serverPromiseObj) {
            if (this.queue.length >= this.maxLength) {
                var delServerObj = this.queue.shift();
                try {
                    delServerObj.serverObj.server.close();
                } catch (e) {
                    console.log(e);
                }
            }
            this.queue.push(serverPromiseObj);
            return serverPromiseObj;
        }
    }, {
        key: 'getServerPromise',
        value: function getServerPromise(hostname, port) {
            var _this = this;

            for (var i = 0; i < this.queue.length; i++) {
                var _serverPromiseObj = this.queue[i];
                var mappingHostNames = _serverPromiseObj.mappingHostNames;
                for (var j = 0; j < mappingHostNames.length; j++) {
                    var DNSName = mappingHostNames[j];
                    if (tlsUtils.isMappingHostName(DNSName, hostname)) {
                        this.reRankServer(i);
                        return _serverPromiseObj.promise;
                    }
                }
            }

            var serverPromiseObj = {
                mappingHostNames: [hostname] // temporary hostname
            };

            var promise = new Promise(function (resolve, reject) {

                _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
                    var certObj, cert, key, certPem, keyPem, fakeServer, serverObj;
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                        while (1) {
                            switch (_context2.prev = _context2.next) {
                                case 0:
                                    _context2.next = 2;
                                    return _this.certAndKeyContainer.getCertPromise(hostname, port);

                                case 2:
                                    certObj = _context2.sent;
                                    cert = certObj.cert;
                                    key = certObj.key;
                                    certPem = pki.certificateToPem(cert);
                                    keyPem = pki.privateKeyToPem(key);
                                    fakeServer = new https.Server({
                                        key: keyPem,
                                        cert: certPem,
                                        SNICallback: function SNICallback(hostname, done) {
                                            _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                                                var certObj;
                                                return regeneratorRuntime.wrap(function _callee$(_context) {
                                                    while (1) {
                                                        switch (_context.prev = _context.next) {
                                                            case 0:
                                                                _context.next = 2;
                                                                return _this.certAndKeyContainer.getCertPromise(hostname, port);

                                                            case 2:
                                                                certObj = _context.sent;

                                                                done(null, tls.createSecureContext({
                                                                    key: pki.privateKeyToPem(certObj.key),
                                                                    cert: pki.certificateToPem(certObj.cert)
                                                                }));

                                                            case 4:
                                                            case 'end':
                                                                return _context.stop();
                                                        }
                                                    }
                                                }, _callee, _this);
                                            }))();
                                        }
                                    });
                                    serverObj = {
                                        cert: cert,
                                        key: key,
                                        server: fakeServer,
                                        port: 0 // if prot === 0 ,should listen server's `listening` event.
                                    };

                                    serverPromiseObj.serverObj = serverObj;
                                    fakeServer.listen(0, function () {
                                        var address = fakeServer.address();
                                        serverObj.port = address.port;
                                    });
                                    fakeServer.on('request', function (req, res) {
                                        var ssl = true;
                                        _this.requestHandler(req, res, ssl);
                                    });
                                    fakeServer.on('error', function (e) {
                                        console.error(e);
                                    });
                                    fakeServer.on('listening', function () {
                                        var mappingHostNames = tlsUtils.getMappingHostNamesFormCert(certObj.cert);
                                        serverPromiseObj.mappingHostNames = mappingHostNames;
                                        resolve(serverObj);
                                    });
                                    fakeServer.on('upgrade', function (req, socket, head) {
                                        var ssl = true;
                                        _this.upgradeHandler(req, socket, head, ssl);
                                    });

                                case 15:
                                case 'end':
                                    return _context2.stop();
                            }
                        }
                    }, _callee2, _this);
                }))();
            });

            serverPromiseObj.promise = promise;

            return this.addServerPromise(serverPromiseObj).promise;
        }
    }, {
        key: 'reRankServer',
        value: function reRankServer(index) {
            // index ==> queue foot
            this.queue.push(this.queue.splice(index, 1)[0]);
        }
    }]);

    return FakeServersCenter;
}();