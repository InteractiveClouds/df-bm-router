/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var SETTINGS = require('../../dfx_settings'),
    log = new (require('../../utils/log')).Instance({label:'GATES_INDEX'}),
    oauthSignature = require('oauth-signature'),
    util = require('../utils');


exports.init = function ( o ) {
    exports.init = function () { log.fatal('Init can be invoked only once'); };


    var out = {};

    var app = new (require('./' + o.schema + '/app.js').Constructor)({
        tokenManager : o.tokenManager
    });
try {
    var appQuery = new (require('./' + o.schema + '/appQuery.js').Constructor)({
        tokenManager : o.tokenManager
    });
} catch (e) {
    log.error(e, e.stack)
}

    var console = new (require('./' + o.schema + '/sessionGate').Constructor)({
        sessionManager : o.consoleSessionManager,
        failedAnswer   : function ( req, res ) {
            res.redirect('/console/login');
        }
    });

    var consoleStatic = new (require('./' + o.schema + '/sessionGateStatic').Constructor)({
        sessionManager : o.consoleSessionManager,
        failedAnswer   : function ( req, res ) {
            res.status(401).end();
        }
    });

    var studio = new (require('./' + o.schema + '/sessionGate').Constructor)({
        sessionManager: o.studioSessionManager,
        failedAnswer:   function (req, res) {
            if (/^\/studio(?:\/(?:widget\/)?index\.html)?$/.test(req.path)) {
                var tenantid = util.lastLoginCookie.get(req).tenantid;
                if (tenantid) {
                    res.redirect('/studio/' + tenantid + '/login');
                    return;
                }
            }
            res.statusCode = 401;
            res.end('Unauthorized');
        }
    });

    if ( SETTINGS.appDirect.credentials.consumer_secret ) {

        var oAuthSimpleSigned = new (require('./default/oAuthSimpleSigned').Constructor)({
            oauthSignature : oauthSignature,
            oauth_consumer_secret : SETTINGS.appDirect.credentials.consumer_secret
        });

        out.oAuthSimpleSigned = oAuthSimpleSigned.endpoint.bind(oAuthSimpleSigned);

    } else {
        log.error('can\'t init oAuthSimpleSigned cause of no credentials was found');
    }


    out.app = app.endpoint.bind(app);

    out.appQuery = appQuery.endpoint.bind(appQuery);

    out.studio = studio.endpoint.bind(studio);

    out.console = console.endpoint.bind(console);

    out.consoleStatic = consoleStatic.endpoint.bind(consoleStatic);

    return out;
};
