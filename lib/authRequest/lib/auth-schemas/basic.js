/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var CLASS = require('../class'),
    NOAUTH = require('./no-auth');

var Constr = new CLASS.create(NOAUTH.Constructor);

exports.Constructor = Constr;

Constr.include({

    init : function ( o ) {
        this._creds = {
            user : o.credentials.username,
            pass : o.credentials.password,
        };
    }, 

    _send : function (params) {
        params.headers.Authorization = 'Basic '
            + new Buffer( this._creds.user + ':' + this._creds.pass).toString('base64');
        return this._sendQioRequest(params);
    }
});
