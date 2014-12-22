/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var Q    = require('q'),
    core = require('../gate.core');

var log = new (require('../../../utils/log')).Instance({label:'GATES_SESSIONS'});

function Constr ( o ) {
    o = o || {};
    core.Constructor.call(this);

    this.sessionManager = o.sessionManager;
    this.failedAnswer   = o.failedAnswer || function () {};

    this.use(checkAndSet);
}

Constr.prototype = new core.Constructor;

Constr.fn = Constr.prototype;

Constr.fn.onEnd = function (req, res, data, pocket) {

    this.sessionManager.update(req, res);
    return data;
}

Constr.fn.onFail = function (req, res) {
    this.sessionManager.rm(req, res);
    this.failedAnswer(req, res);
};

function checkAndSet (req, success, fail, pocket, res) {

    var that = this;

    this.sessionManager.get(req, res)
    .fin(function(){

        if ( req.session && req.session.tenant && req.session.tenant.id ) {
            req.user = that.touchUser(req.session.tenant.id, req.session.user.id);
        }
    })
    .then(success, fail)
    .fail(log.error.bind(log));
};

exports.Constructor = Constr;

