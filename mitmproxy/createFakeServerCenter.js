'use strict';

var config = require('../common/config');
var fs = require('fs');
var path = require('path');
var forge = require('node-forge');
var FakeServersCenter = require('../tls/FakeServersCenter');
var colors = require('colors');

module.exports = function createFakeServerCenter(_ref) {
    var caCertPath = _ref.caCertPath,
        caKeyPath = _ref.caKeyPath,
        requestHandler = _ref.requestHandler,
        upgradeHandler = _ref.upgradeHandler,
        getCertSocketTimeout = _ref.getCertSocketTimeout;

    var caCert;
    var caKey;
    try {
        fs.accessSync(caCertPath, fs.F_OK);
        fs.accessSync(caKeyPath, fs.F_OK);
        var caCertPem = fs.readFileSync(caCertPath);
        var caKeyPem = fs.readFileSync(caKeyPath);
        caCert = forge.pki.certificateFromPem(caCertPem);
        caKey = forge.pki.privateKeyFromPem(caKeyPem);
    } catch (e) {
        console.log(colors.red('Can not find `CA certificate` or `CA key`.'), e);
        process.exit(1);
    }

    return new FakeServersCenter({
        caCert: caCert,
        caKey: caKey,
        maxLength: 100,
        requestHandler: requestHandler,
        upgradeHandler: upgradeHandler,
        getCertSocketTimeout: getCertSocketTimeout
    });
};