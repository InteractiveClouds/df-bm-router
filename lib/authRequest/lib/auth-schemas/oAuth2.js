/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var CLASS  = require('../class'),
    OAUTH2 = require('oauth').OAuth2,
    Q      = require('q');

var Constr = new CLASS.create();

exports.Constructor = Constr;

Constr.include({

    /**
     * @param {Objet} cr credentials
     */
    init : function (cr) {
        this._creds = cr = cr.credentials;
        this._oa= new OAUTH2(
            cr.consumer_key,
            cr.consumer_secret,
            cr.base_site,
            cr.authorize_path,
            cr.access_token_path,
            cr.custom_headers
        );

        this._oa.useAuthorizationHeaderforGET(true);
    }, 

    get : function ( params ) {
        return performRequest.call(this, params, 'get')
    }
});


function performRequest ( params, method ) {
    var D = Q.defer();

    if ( method !== 'get' ) return D.reject('method '+method+' is not implemented');

    this._oa.get(params.url, this._creds.access_token, function(error, result, response){
        return error
            ? D.reject(JSON.stringify(error))
            : D.resolve({body: result});
    });

    return D.promise;
}
