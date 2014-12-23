/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var Q    = require('q'),
    URL = require('url'),
    core = require('../gate.core');

var log = new (require('../../../utils/log')).Instance({label:'GATES_OAUTH_SS'});

function Constr ( o ) {
    o = o || {};
    core.Constructor.call(this);

    this.oauthSignature = o.oauthSignature;
    this.oauth_consumer_secret = o.oauth_consumer_secret;

    this.use(check);
}

Constr.prototype = new core.Constructor;

Constr.fn = Constr.prototype;

Constr.fn.onFail = function (req, res, _reason, httpStatus, pocket) {
    res.status(401).end();
};

Constr.fn.onEnd = function (req, res, data, pocket) { // TODO
    return data;
}

function check (req, success, fail, pocket, res) {

    var that = this;

    if ( req.method !== 'GET' ) return Q.reject(Error(
        'checking "' + req.method + '" is not implemented'
    ));

    var params = extractAuthInfo(req);

    if ( !params ) return fail();

    var originalSignature = params.oauth_signature;

    delete params.oauth_signature;

    var url = URL.parse( req.protocol + '://' + req.get('host') + req.originalUrl ),
        clearUrl = URL.format({
            protocol : url.protocol,
            host     : url.host,
            port     : url.port,
            hostname : url.hostname,
            pathname : url.pathname
        }),
        calculatedSignature = this.oauthSignature.generate(
            req.method,
            clearUrl,
            params,
            this.oauth_consumer_secret
        ),
        unescaped = unescape(calculatedSignature);

    //log.dbg('GOT REQUEST ================================================================================\\');
    //log.dbg('HEADERS: ', req.headers);
    //log.dbg('CLEAR URL', clearUrl);
    //log.dbg('AUTH INFO', params);
    //log.dbg('SIGNATURE ORIGINAL                   : ' + originalSignature);
    //log.dbg('SIGNATURE CALCULATED RAW ENC         : ' + calculatedSignature);
    //log.dbg('SIGNATURE CALCULATED UNESCAPED UNENC : ' + calculatedSignatureUnescapedUnenc);
    //log.dbg('GOT REQUEST ================================================================================\/');

    return originalSignature === calculatedSignature || originalSignature === unescaped
        ? success()
        : fail('Wrong oAuth signature');
};

function extractAuthInfo ( req ) {

    var authInfo,
        query = req.query;

    if ( !hasAuthHeader(req) ) {
        // TODO try to find the auth info in the URL's query
        log.warn('no Authorization header was found');
        return null;
    }

    authInfo = parseAuthorizationHeader(req.headers.authorization);

    if ( !authInfo || !Object.keys(authInfo).length ) {
        log.error('can not extract authorization info');
        return null;
    }

    for ( var param in query ) authInfo[param] = query[param];


    return authInfo;
}

var authParamRegExp = /^([^="]+)(?:="?([^"]*)"?)?$/;

function parseAuthorizationHeader ( str ) {

    var arr  = str.split(/,?\s+/),
        auth = arr.shift(),
        obj = {};

    if ( auth !== 'OAuth' ) {
        log.error('unknown authorization type "' + auth + '",\n\tHEADER: ' + str);
        return null;
    }

    arr.forEach(function(e){
        var arr = authParamRegExp.exec(e);

        if ( arr ) obj[arr[1]] = arr[2];
    });

    if (
               !obj.oauth_consumer_key
            || !obj.oauth_nonce
            || !obj.oauth_signature
            || !obj.oauth_signature_method
            || !obj.oauth_timestamp
            || !obj.oauth_version
        ) {
            log.error('wrong authorization header format: ' + str);
            return null;
    }

    return obj;
}

function hasAuthHeader ( req ) {
    return req.headers.hasOwnProperty('authorization');
}

exports.Constructor = Constr;
