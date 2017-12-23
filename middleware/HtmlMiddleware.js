'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var through = require('through2');
var zlib = require('zlib');
var url = require('url');

var httpUtil = {};
httpUtil.isGzip = function (res) {
    var contentEncoding = res.headers['content-encoding'];
    return !!(contentEncoding && contentEncoding.toLowerCase() == 'gzip');
};
httpUtil.isHtml = function (res) {
    var contentType = res.headers['content-type'];
    return typeof contentType != 'undefined' && /text\/html|application\/xhtml\+xml/.test(contentType);
};

function injectContentIntoHtmlHead(html, content) {
    html = html.replace(/(<\/head>)/i, function (match) {
        return content + match;
    });
    return html;
}

function injectContentIntoHtmlBody(html, content) {
    html = html.replace(/(<\/body>)/i, function (match) {
        return content + match;
    });
    return html;
}

function chunkReplace(_this, chunk, enc, callback, headContent, bodyContent) {
    var chunkString = chunk.toString();
    if (headContent) {
        chunkString = injectScriptIntoHtmlHead(chunkString, headContent);
    }
    if (bodyContent) {
        chunkString = injectContentIntoHtmlBody(chunkString, bodyContent);
    }
    _this.push(new Buffer(chunkString));
    callback();
}

module.exports = function () {
    function InjectHtmlPlugin(_ref) {
        var head = _ref.head,
            body = _ref.body;

        _classCallCheck(this, InjectHtmlPlugin);

        this.head = head;
        this.body = body;
    }

    _createClass(InjectHtmlPlugin, [{
        key: 'responseInterceptor',
        value: function responseInterceptor(req, res, proxyReq, proxyRes, ssl, next) {

            if (!this.head && !this.body) {
                next();
                return;
            }

            var isHtml = httpUtil.isHtml(proxyRes);
            var contentLengthIsZero = function () {
                return proxyRes.headers['content-length'] == 0;
            }();
            if (!isHtml || contentLengthIsZero) {
                next();
            } else {
                Object.keys(proxyRes.headers).forEach(function (key) {
                    if (proxyRes.headers[key] != undefined) {
                        var newkey = key.replace(/^[a-z]|-[a-z]/g, function (match) {
                            return match.toUpperCase();
                        });
                        var newkey = key;
                        if (isHtml && key === 'content-length') {
                            // do nothing
                        } else {
                            res.setHeader(newkey, proxyRes.headers[key]);
                        }
                    }
                });

                res.writeHead(proxyRes.statusCode);

                var isGzip = httpUtil.isGzip(proxyRes);

                if (isGzip) {
                    proxyRes.pipe(new zlib.Gunzip()).pipe(through(function (chunk, enc, callback) {
                        chunkReplace(this, chunk, enc, callback, this.head, this.body);
                    })).pipe(new zlib.Gzip()).pipe(res);
                } else {
                    proxyRes.pipe(through(function (chunk, enc, callback) {
                        chunkReplace(this, chunk, enc, callback, this.head, this.body);
                    })).pipe(res);
                }
            }
            next();
        }
    }]);

    return InjectHtmlPlugin;
}();