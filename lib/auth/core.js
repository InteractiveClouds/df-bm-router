/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var Q = require('q');
Q.longStackSupport = true;

var log = new (require('../utils/log')).Instance({label:'AUTH_CORE'});

function Core () {
    this.flow = [];
};

Core.fn = Core.prototype;

Core.fn.touchUser = function(){};

Core.fn.use = function ( func ) {
    this.flow.push(func);
};

Core.fn.endpoint = function ( req, res, next ) {

    var i = 0,
        l = this.flow.length,
        pocket = {}
        that = this;

    // TODO wrap params to object
    this.flow[i].call(this, req, success, fail, pocket, res);

    function success () {

        if ( ++i < l ) {
            return that.flow[i]
                    .call(that, req, success, fail, pocket, res);
        }

        that.onSuccess.call(that, req, res, next, pocket);
    }

    function fail ( reason, httpStatus ) {

        log.warn(
            'Unauthorized request from ' + req.ip + ' for '
            + req.path + '. ' + ( reason || '' )
        );

        var _reason = typeof reason === 'string' ? reason : '';

        return that.onFail.call(that, req, res, _reason, httpStatus, pocket);
    }
};

Core.fn.afterLogin = function (req, success, fail, pocket, res) {

    if ( !this.afterLoginBin ) return success();

    var i = 0,
        l = this.afterLoginBin.length,
        that = this;

    this.afterLoginBin[i].call(null, req, done);

    function done ( error ) {

        if ( error ) log.warn(error);

        if ( ++i < l ) that.afterLoginBin[i].call(null, req, done);
        else success();
    }
};


Core.fn.onFail = function () {};

Core.fn.onSuccess = function () {};


exports.Constructor = Core;
