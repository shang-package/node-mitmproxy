'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var tlsUtils = require('./tlsUtils');
var https = require('https');

module.exports = function () {
    function CertAndKeyContainer(_ref) {
        var _ref$maxLength = _ref.maxLength,
            maxLength = _ref$maxLength === undefined ? 1000 : _ref$maxLength,
            _ref$getCertSocketTim = _ref.getCertSocketTimeout,
            getCertSocketTimeout = _ref$getCertSocketTim === undefined ? 2 * 1000 : _ref$getCertSocketTim,
            caCert = _ref.caCert,
            caKey = _ref.caKey;

        _classCallCheck(this, CertAndKeyContainer);

        this.queue = [];
        this.maxLength = maxLength;
        this.getCertSocketTimeout = getCertSocketTimeout;
        this.caCert = caCert;
        this.caKey = caKey;
    }

    _createClass(CertAndKeyContainer, [{
        key: 'addCertPromise',
        value: function addCertPromise(certPromiseObj) {
            if (this.queue.length >= this.maxLength) {
                this.queue.shift();
            }
            this.queue.push(certPromiseObj);
            return certPromiseObj;
        }
    }, {
        key: 'getCertPromise',
        value: function getCertPromise(hostname, port) {
            var _this = this;

            for (var i = 0; i < this.queue.length; i++) {
                var _certPromiseObj = this.queue[i];
                var mappingHostNames = _certPromiseObj.mappingHostNames;
                for (var j = 0; j < mappingHostNames.length; j++) {
                    var DNSName = mappingHostNames[j];
                    if (tlsUtils.isMappingHostName(DNSName, hostname)) {
                        this.reRankCert(i);
                        return _certPromiseObj.promise;
                    }
                }
            }

            var certPromiseObj = {
                mappingHostNames: [hostname] // temporary hostname
            };

            var promise = new Promise(function (resolve, reject) {
                var once = true;
                var _resolve = function _resolve(_certObj) {
                    if (once) {
                        once = false;
                        var mappingHostNames = tlsUtils.getMappingHostNamesFormCert(_certObj.cert);
                        certPromiseObj.mappingHostNames = mappingHostNames; // change
                        resolve(_certObj);
                    }
                };
                var certObj = void 0;
                var preReq = https.request({
                    port: port,
                    hostname: hostname,
                    path: '/',
                    method: 'HEAD'
                }, function (preRes) {
                    try {
                        var realCert = preRes.socket.getPeerCertificate();
                        if (realCert) {
                            certObj = tlsUtils.createFakeCertificateByCA(_this.caKey, _this.caCert, realCert);
                        } else {
                            certObj = tlsUtils.createFakeCertificateByDomain(_this.caKey, _this.caCert, hostname);
                        }
                        _resolve(certObj);
                    } catch (e) {
                        reject(e);
                    }
                });
                preReq.setTimeout(~~_this.getCertSocketTimeout, function () {
                    if (!certObj) {
                        certObj = tlsUtils.createFakeCertificateByDomain(_this.caKey, _this.caCert, hostname);
                        _resolve(certObj);
                    }
                });
                preReq.on('error', function (e) {
                    if (!certObj) {
                        certObj = tlsUtils.createFakeCertificateByDomain(_this.caKey, _this.caCert, hostname);
                        _resolve(certObj);
                    }
                });
                preReq.end();
            });

            certPromiseObj.promise = promise;

            return this.addCertPromise(certPromiseObj).promise;
        }
    }, {
        key: 'reRankCert',
        value: function reRankCert(index) {
            // index ==> queue foot
            this.queue.push(this.queue.splice(index, 1)[0]);
        }
    }]);

    return CertAndKeyContainer;
}();