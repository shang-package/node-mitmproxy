'use strict';

var url = require('url');
var Agent = require('./ProxyHttpAgent');
var HttpsAgent = require('./ProxyHttpsAgent');
var tunnelAgent = require('tunnel-agent');
var ProxyAgent = require('proxy-agent');

var util = exports;
var httpsAgent = new HttpsAgent({
    keepAlive: true,
    timeout: 60000,
    keepAliveTimeout: 30000, // free socket keepalive for 30 seconds
    rejectUnauthorized: false
});
var httpAgent = new Agent({
    keepAlive: true,
    timeout: 60000,
    keepAliveTimeout: 30000 // free socket keepalive for 30 seconds
});
var socketId = 0;

var httpOverHttpAgent, httpsOverHttpAgent, httpOverHttpsAgent, httpsOverHttpsAgent;

util.getOptionsFormRequest = function (req, ssl) {
    var externalProxy = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    var urlObject = url.parse(req.url);
    var defaultPort = ssl ? 443 : 80;
    var protocol = ssl ? 'https:' : 'http:';
    var headers = Object.assign({}, req.headers);
    var externalProxyUrl = null;

    if (externalProxy) {
        if (typeof externalProxy === 'string') {
            externalProxyUrl = externalProxy;
        } else if (typeof externalProxy === 'function') {
            try {
                externalProxyUrl = externalProxy(req, ssl);
            } catch (e) {
                console.error(e);
            }
        }
    }

    delete headers['proxy-connection'];
    var agent = false;
    if (!externalProxyUrl) {
        // keepAlive
        if (headers.connection !== 'close') {
            if (protocol == 'https:') {
                agent = httpsAgent;
            } else {
                agent = httpAgent;
            }
            headers.connection = 'keep-alive';
        }
    } else {
        agent = util.getTunnelAgent(protocol === 'https:', externalProxyUrl);
    }

    var options = {
        protocol: protocol,
        hostname: req.headers.host.split(':')[0],
        method: req.method,
        port: req.headers.host.split(':')[1] || defaultPort,
        path: urlObject.path,
        headers: req.headers,
        agent: agent
    };

    if (protocol === 'http:' && externalProxyUrl && url.parse(externalProxyUrl).protocol === 'http:') {
        var externalURL = url.parse(externalProxyUrl);
        options.hostname = externalURL.hostname;
        options.port = externalURL.port;
        // support non-transparent proxy
        options.path = 'http://' + urlObject.host + urlObject.path;
    }

    // mark a socketId for Agent to bind socket for NTLM
    if (req.socket.customSocketId) {
        options.customSocketId = req.socket.customSocketId;
    } else if (headers['authorization']) {
        options.customSocketId = req.socket.customSocketId = socketId++;
    }

    return options;
};

util.getTunnelAgent = function (requestIsSSL, externalProxyUrl) {
    return new ProxyAgent(externalProxyUrl);
    var urlObject = url.parse(externalProxyUrl);
    var protocol = urlObject.protocol || 'http:';
    var port = urlObject.port;
    if (!port) {
        port = protocol === 'http:' ? 80 : 443;
    }
    var hostname = urlObject.hostname || 'localhost';

    if (requestIsSSL) {
        if (protocol === 'http:') {
            if (!httpsOverHttpAgent) {
                httpsOverHttpAgent = tunnelAgent.httpsOverHttp({
                    proxy: {
                        host: hostname,
                        port: port
                    }
                });
            }
            return httpsOverHttpAgent;
        } else {
            if (!httpsOverHttpsAgent) {
                httpsOverHttpsAgent = tunnelAgent.httpsOverHttps({
                    proxy: {
                        host: hostname,
                        port: port
                    }
                });
            }
            return httpsOverHttpsAgent;
        }
    } else {
        if (protocol === 'http:') {
            // if (!httpOverHttpAgent) {
            //     httpOverHttpAgent = tunnelAgent.httpOverHttp({
            //         proxy: {
            //             host: hostname,
            //             port: port
            //         }
            //     });
            // }
            return false;
        } else {
            if (!httpOverHttpsAgent) {
                httpOverHttpsAgent = tunnelAgent.httpOverHttps({
                    proxy: {
                        host: hostname,
                        port: port
                    }
                });
            }
            return httpOverHttpsAgent;
        }
    }
};