/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var SessionManager = require('./utils/sessionManager'),
    //MemoryStorage = require('./utils/storage/memoryStorage'),
    MongoStorage = require('./utils/storage/mongoStorage'),

    SETTINGS = require('../dfx_settings'),
    db = require('../mdbw')(SETTINGS.mdbw_options),
    crypt = require('./utils/tripleDes.wrapped.js'),
    apps = require('../dfx_applications'),
    tenants = require('../dfx_sysadmin/tenants'),
    users = tenants.user,
    sysdbName = SETTINGS.system_database_name,
    credCrypt = require('./utils/credCrypt'),
    Log = require('../utils/log'),
    ldap = require('../ldap'),
    schema = SETTINGS.authSchema || 'default',
    TokenManager = require('./utils/tokenManager.' + schema),
    runWhenAppUserIsLoggedIn = [],
    runWhenStudioUserIsLoggedIn = [],





    tokenStorage = new MongoStorage.Constructor({
        database   : sysdbName,
        collection : 'appsTokens',
        db         : db
    }),

    tokenManager = new TokenManager.Constructor({
        storage      : tokenStorage,
        tenants      : tenants,
        users        : users,
        expires      : SETTINGS.appToken_EpiresTime,
        firstExpires : SETTINGS.appToken_loginTokenExpires,
        apps         : apps,
        maxCalls     : SETTINGS.appToken_maxCallsPerToken,
        crypt        : crypt
    }),



    consoleSessionStorage = new MongoStorage.Constructor({
        database   : sysdbName,
        collection : 'consoleSessions',
        db         : db
    }),

    clearConsoleSessionsEach = SETTINGS.clearConsoleSessionsEach
        || 1000 * 60 * 60, // an hour

    consoleSessionExpiresIn = SETTINGS.consoleSessionExpiresIn
        || 1000 * 60 * 30, // half an hour

    consoleSessionManager = new SessionManager.Constructor({
        storage    : consoleSessionStorage,
        expires    : consoleSessionExpiresIn,
        path       : '/console',
        cookieName : 'dfx_console_session',
        clearEach  : clearConsoleSessionsEach
    }),



    studioSessionStorage = new MongoStorage.Constructor({
        database   : sysdbName,
        collection : 'studioSessions',
        db         : db
    }),

    // when to remove expired sessions
    clearStudioSessionsEach = SETTINGS.clearStudioSessionsEach
        || 1000 * 60 * 30, // half an hour

    // when cookie expires
    studioSessionExpiresIn = SETTINGS.studioSessionExpiresIn
        || 1000 * 60 * 60, // an hour

    studioSessionManager = new SessionManager.Constructor({
        storage    : studioSessionStorage,
        expires    : studioSessionExpiresIn,
        path       : '/studio',
        cookieName : 'dfx_studio_session',
        clearEach  : clearStudioSessionsEach
    });

exports.version   = '0.1';
var openidStudioLogin = require('./loginout/'+schema+'/openidStudioLogin');
var openidStudioLoginInstance = new openidStudioLogin.Constructor({
        log             : new Log.Instance({label:'LOGINOUT_OPENID_STUDIO'}),
        sessionManager  : studioSessionManager,
        runAfterLogin   : runWhenStudioUserIsLoggedIn,
        cookieExpiresIn : 1000 * 60 * 30, // 30 minutes
        cookieName      : 'dfx_openid_storage',
        cookiePath      : '/studio/openidverify'
    });
exports.studioOpenId = {
    verify   : openidStudioLoginInstance.endpoint.bind(openidStudioLoginInstance)
};

var studioInstance = new (require('./loginout/'+schema+'/studio')).Constructor({
        log            : new Log.Instance({label:'LOGINOUT_STUDIO'}),
        sessionManager : studioSessionManager,
        runAfterLogin  : runWhenStudioUserIsLoggedIn,
        openidStudioLogin : openidStudioLoginInstance
    });
exports.studio = {
    loginPage   : studioInstance.loginPage.bind(studioInstance),
    loginVerify : studioInstance.endpoint.bind(studioInstance)
};


var consoleInstance = new (require('./loginout/'+schema+'/console')).Constructor({
    log            : new Log.Instance({label:'LOGINOUT_CONSOLE'}),
    sessionManager : consoleSessionManager,
    db             : db
});
exports.console   = {
    loginPage   : consoleInstance.loginPage.bind(consoleInstance),
    loginVerify : consoleInstance.endpoint.bind(consoleInstance),
    logout      : consoleInstance.logout.bind(consoleInstance)
};

var appInstance = new (require('./loginout/'+schema+'/app')).Constructor({
    log           : new Log.Instance({label:'LOGINOUT_APP'}),
    tokenManager  : tokenManager,
    runAfterLogin : runWhenAppUserIsLoggedIn
});
exports.app = {
    login        : appInstance.endpoint.bind(appInstance),
    logout       : appInstance.logout.bind(appInstance),
    refreshtoken : appInstance.refreshtoken.bind(appInstance)
};


exports.gate      = require('./gates').init({
    tokenManager          : tokenManager,
    consoleSessionManager : consoleSessionManager,
    studioSessionManager  : studioSessionManager,
    schema                : schema
});

exports.credCrypt = credCrypt;

exports.whenAppUserIsLoggedIn = function ( func ) {
    runWhenAppUserIsLoggedIn.push(func);
};

exports.whenStudioUserIsLoggedIn = function ( func ) {
    runWhenStudioUserIsLoggedIn.push(func);
};
