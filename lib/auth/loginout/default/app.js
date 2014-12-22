var Q    = require('q'),
    core = require('../../core'),
    tenants  = require('../../../dfx_sysadmin').tenant;

/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

/*
 * if tenantid, userid, appid are valid — login is successfull
 *      token with short expires time is created,
 *      encrypted and is send to app
 * app should decrypt it with user password,
 * to get decrypted token and to send an refresh request immediately
 * then normal exipred time is set for the token,
 * otherwise the token will be rotten
 */



function Constr ( o ) {

    o = o || {};

    core.Constructor.call(this);

    this.log = o.log;
    this.tokenManager = o.tokenManager;
    this.afterLoginBin  = o.runAfterLogin;

    this.use(this.parse);
    this.use(this.check);
    this.use(this.createSession);
    this.use(this.afterLogin);
    this.use(this.createToken);
}

Constr.fn = Constr.prototype = new core.Constructor;

Constr.fn.parse = function (req, success, fail, pocket, res) {

    pocket.tenantid = req.body.tenantid;
    pocket.userid   = req.body.userid;
    pocket.appid    = req.body.appid;

    success();
};

Constr.fn.check = function (req, success, fail, pocket, res) {

    tenants.isActive(pocket.tenantid).then(
        function(){
            ( pocket.tenantid && pocket.userid && pocket.appid ? success : fail )();
        },
        function () {
            fail(Error('tenant "' + pocket.tenantid + '" is not active.'));
        }
    );
};

Constr.fn.createSession = function (req, success, fail, pocket, res) {

    req.session = {
        tenant : { id: pocket.tenantid },
        user   : { id: pocket.userid },
        app    : { id: pocket.appid }
    };

    success();
};

Constr.fn.createToken = function (req, success, fail, pocket, res) {

    this.tokenManager.create(pocket.tenantid, pocket.userid, pocket.appid, req.session)
    .then(
        function (token) {
            pocket.token = token
            success();
        },
        fail
    );
};

Constr.fn.logout = function (req, res, next) {
    var tokenid = req.user.tokenid
        that = this;
    
    this.tokenManager.rm(tokenid)
    .then( // crutch
        function ()      { that.onSuccess(req, res, next, {}); },
        function (error) { that.onFail(req, res, error);       }
    );
}

Constr.fn.refreshtoken = function (req, res, next) {
    this.tokenManager.update(req.user.tokenid)
    .then(function(s){
        res.end(s);
    })
}

Constr.fn.onSuccess = function (req, res, next, pocket) {
    res.json({
        result : 'success',
        data   : pocket.token || {}
    });
}

Constr.fn.onFail = function (req, res, reason, httpStatus, pocket) {
    res.json({
        result : 'failed',
        reason : reason || 'unauthorized'
    });
}



exports.Constructor = Constr;
