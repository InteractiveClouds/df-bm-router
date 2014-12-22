/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var Q      = require('q'),
    format = require('./credStoreFormat'),
    crypt  = require('./tripleDes.wrapped.js');

var log = new (require('../../utils/log')).Instance({label:'CREDCRYPT'});

exports.encrypt = function ( cred, pass ) {
    return init('encrypt', cred, pass)
};
exports.decrypt = function ( phrase, pass ) {
    return init('decrypt', phrase, pass)
};

function init (action, str, pass) {

    var pass = '';

    try {
        pass = require('../.auth.conf').storagePass;
    } catch (e) {
        log.error('credCrypt can not be initialised -- no ".auth.conf"');
        return Q.reject();
    }


    /**
     * @param {String|Object} cred credentilals to encrypt
     * @returns {Promise * String} encrypted
     */
    exports.encrypt = function ( cred ) {
        return Q.when(format.pack(cred), function(box){
            return crypt.encrypt(box, pass)
        });
    };
    
    
    /**
     * @param {String} phrase encrypted credentilals
     * @returns {Promise * String|Object} credentilals
     */
    exports.decrypt = function ( phrase ) {

        if ( !phrase ) return Q.resolve('');

        return Q.when(crypt.decrypt(phrase, pass), format.unpack);
    };

    log.info('credCrypt is initialised');

    return exports[action](str, pass);
}
