#!/usr/bin/env node
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

require('babel-polyfill');
var mitmproxy = require('../mitmproxy/index');
var program = require('commander');
var packageJson = require('../../package.json');
var tlsUtils = require('../tls/tlsUtils');
var fs = require('fs');
var path = require('path');
var colors = require('colors');

fs.existsSync = fs.existsSync || path.existsSync;

program.version(packageJson.version).option('-c, --config [value]', 'config file path').parse(process.argv);

console.log(program.config);

var configPath = path.resolve(program.config);

if (fs.existsSync(configPath)) {

    var configObject = require(configPath);

    if ((typeof configObject === 'undefined' ? 'undefined' : _typeof(configObject)) !== 'object') {
        console.error(colors.red('Config Error in ' + configPath));
    } else {
        mitmproxy.createProxy(configObject);
    }
} else {
    console.error(colors.red('Can not find `config file` file: ' + configPath));
}