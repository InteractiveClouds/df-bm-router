/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var SETTINGS = require('../../../dfx_settings'),
    util     = require('../../utils'),
    core     = require('../../core'),
    tenants  = require('../../../dfx_sysadmin').tenant,
    user     = require('../../../dfx_sysadmin').tenant.user,


    SUCCECC_REDIRECT_URL = '/studio/index.html';


function Constr ( o ) {

    o = o || {};

    core.Constructor.call(this);

    this.log = o.log;
    this.sessionManager = o.sessionManager;
    this.afterLoginBin  = o.runAfterLogin;
    this.openidStudioLogin = o.openidStudioLogin;


    this.use(this.parse);
    this.use(this.findUser);
    this.use(this.checkCredentials);
    this.use(this.hasRightToStartStudio);
    this.use(this.createSession);
    this.use(this.setLastLoginCookie);
    this.use(this.afterLogin);
    this.use(this.writeSession);
}

Constr.fn = Constr.prototype = Object.create(core.Constructor.prototype);

Constr.fn.parse = function (req, success, fail, pocket, res) {

    var isPOST = req.method === 'POST';

    pocket.userid    = isPOST ? req.body.userid   || '' : req.query.user || '';
    pocket.password  = isPOST ? req.body.password || '' : '';
    pocket.tenantid  = isPOST ? req.body.tenantid : req.query.tenant;

    if ( !pocket.tenantid || !pocket.userid) {
            return fail('Wrong credentials. No tenantid or userid.');
    }
    
    if ( !pocket.password ) {
        if ( this.openidStudioLogin.looksLikeOpenId(pocket.userid) ) {
            // the flow is terminated from here
            // ( no findUser, createSession etc. will be invoked )
            // the openidStudioLogin flow is started instead
            return this.openidStudioLogin.start(
                pocket.userid,
                pocket.tenantid,
                res,
                fail
            );
        } else {
            return fail('Wrong credentials. No password.');
        }
    }

    success();
};

Constr.fn.findUser = function (req, success, fail, pocket, res) {
    tenants.isActive(pocket.tenantid).then(
        function(){
            user.get(pocket.tenantid, pocket.userid).then(
                function (user) {
                    pocket.user = user;
                    req.user = that.touchUser(pocket.tenantid, pocket.userid);
                    success();
                },
                fail
            );
        },
        function () {
            fail(Error('tenant "' + pocket.tenantid + '" is not active.'));
        }
    );
};

Constr.fn.checkCredentials = function (req, success, fail, pocket, res) {

    return req.user.getProperty('type').then(function(type){

        if ( !type || type === 'staff' ) return user.checkCredentials(
            pocket.tenantid,
            pocket.userid,
            pocket.password
        )
        .then(success, fail);

        fail('Unknown user\'s type "' + type + '"');
    })
};

Constr.fn.hasRightToStartStudio = function (req, success, fail, pocket, res) {

    req.user.hasRight('accessRealm::studio').then(
        success,
        fail.bind(null, 'user has no right to start studio')
    );
}

Constr.fn.createSession = function (req, success, fail, pocket, res) {

    req.session = {
        tenant : { id: pocket.tenantid },
        user   : { id: pocket.userid }
    };

    success();
};

Constr.fn.writeSession = function (req, success, fail, pocket, res) {
    this.sessionManager.create(req, res, req.session).then(success, fail);
};

Constr.fn.setLastLoginCookie = function (req, success, fail, pocket, res) {
    util.lastLoginCookie.set(req, res);
    success();
};

Constr.fn.onFail = function (req, res, reason, httpStatus, pocket) {

    var last   = util.lastLoginCookie.get(req),
        tenant = pocket.tenantid || last.tenantid || '',
        path   = tenant
            ? '/studio/' + tenant + '/login'
            : '/studio/loginerror';

    this.log.warn('Failed login. User ' + pocket.tenantid + ':' + pocket.userid);

    res.redirect(path);
};

Constr.fn.onSuccess = function (req, res, next, pocket) {
    res.redirect(SUCCECC_REDIRECT_URL);
    this.log.info('User ' + pocket.tenantid + ':' + pocket.userid + ' is logged in.');
};

Constr.fn.loginPage = function ( req, res ) {
    var tenantid = req.params.tenantid,
        last     = util.lastLoginCookie.get(req);

    this.sessionManager.rm(req, res).fin(function(){

        res.render('login_dialog', {
            tenantid    : tenantid,
            userid      : last.tenantid === tenantid ? last.userid : ''
        });
    });
};


exports.Constructor = Constr;
