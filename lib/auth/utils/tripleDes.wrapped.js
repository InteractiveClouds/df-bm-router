/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var CRYPTO = require('crypto-js');


/**
 * @param {String} str string to encrypt
 * @returns {String} encrypted
 */
exports.encrypt = function ( str, pass ) {
    return CRYPTO.TripleDES.encrypt(str, pass).toString();
}


/**
 * @param {String} str string to decrypt
 * @returns {String} decrypted
 */
exports.decrypt = function ( str, pass ) {
    return CRYPTO.TripleDES.decrypt(str, pass).toString(CRYPTO.enc.Utf8);
}
