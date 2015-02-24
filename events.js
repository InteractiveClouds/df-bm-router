var Q       = require('q'),
    URL     = require('url'),
    Request = require('./request'),
    router  = require('./router'),
    addons  = require('./addons'),
    answer  = require('./answer'),
    parseEvent = require('./eventParser'),
    notifications = require('./notifications'),
    log     = new (require('./lib/utils/log')).Instance({label:'EVENTS'}),

    appDirect = new Request({
        authRequestParams : {
            schema                 : 'oAuthSimpleSigned',
            oauth_signature_method : 'HMAC-SHA1',
            oauth_version          : '1.0',
            credentials            : {
                consumer_key    : CFG.appDirectCredentials.consumer_key,
                consumer_secret : CFG.appDirectCredentials.consumer_secret
            }
        },
        statusCase : {
            '*' : function ( res ) { return Q.reject('got answer with status ' + res.status) },
            401 : function ( res ) { return Q.reject('got answer with status 401') },
            200 : function ( res ) { return res.body }
        }
    });

function uuid () { return (new Date()).getTime() } // TODO



module.exports = function ( req, res, next ) {

    var url = req.query.url,
        event;

    appDirect.get({
        url: url,
        headers : {'Accept': 'application/json; charset=utf-8'}
    })
    .then(function(_event){

        if ( checkAndLogEvent(_event) ) event = _event;
        else return Q.reject();

        if ( event.flag === 'STATELESS' ) return Q.resolve(
            'Recieved STATELESS appDirect event. Nothing is done.'
        );

        return events.hasOwnProperty(event.type)
            ? events[event.type](event)
            : Q.reject('unknown event type "' + event.type + '"');

    })
    .then(
        function (data) {

            notifications.publish(event.type, {success : true, event : event});

            return answer.success(res, data)
        },
        function (error) {

            if ( event && event.type ) {
                notifications.publish(event.type, {success : false, event : event});
            }

            return answer.fail(res, error)
        }
    );
};

function checkAndLogEvent ( event ) {

    // TODO use eventParser instead

    if ( (typeof event !== 'object') || !event.hasOwnProperty('type') ) {
        log.warn('wrong format of appdirect event.\n\n', event);
        return false;
    }

    log.info(event);

    return true;
}


var events = {

    'SUBSCRIPTION_ORDER' : (function(){

        return function (event, exclude) {

            var tenantid  = uuid(),
                userid    = event.creator.openId,
                baseurl   = event.marketplace.baseUrl,
                partner   = event.marketplace.partner,
                logoutUrlTempl      = URL.resolve(baseurl, '/applogout?openid='),
                sysUserManagmentUrl = URL.resolve(baseurl, '/account/assign');

            return createTenant({
                tenantid : tenantid,
                userid   : userid,
                partner  : JSON.stringify({
                        name : partner,
                        redirect : {
                            logoutUrlTempl      : logoutUrlTempl,
                            sysUserManagmentUrl : sysUserManagmentUrl
                        }
                    })
            }).then(function(serverName){
                return Q.resolve({
                    message : 'Created tenant "' + tenantid + '" at the server "' +
                                serverName + '" for user "' + userid + '"',
                    accountIdentifier : tenantid
                });
            });
        }

        function createTenant ( o, exclude) {

            var exclude = exclude || [];

            return router.getServer(exclude).then(function(server){
                return server.get('/api/tenant/create', {
                    tenantid : o.tenantid,
                    userid   : o.userid,
                    partner  : o.partner,
                    usertype : 'openid',
                    roles    : 'developer'
                })
                .then(function(){ return server.name })
                .fail(function(){
                    log.warn(
                        'Failed to created the tenant "' + o.tenantid + '" at server "' +
                        server.name + '" for user "' + o.userid + '"'
                    );

                    if ( server.isOnline ) exclude.push(server.name);
                    return createTenant( o, exclude )
                })
            })
        }

    })(),

    'SUBSCRIPTION_CHANGE' : function ( event ) {
        return Q.resolve();
    },

    'SUBSCRIPTION_CANCEL' : function ( event ) {

        var account = event.payload.account.accountIdentifier;

        return router.getServer( account ).then(function(server){
            return server.get('/api/tenant/remove', { tenantid : account }, true)
            .then(function(){
                return Q.resolve(
                    'Tenant "' + account +
                    '" is removed from the server "' + server.name + '"'
                );
            })
        })
    },

    'USER_ASSIGNMENT'   : function ( event ) {

        var account = event.payload.account.accountIdentifier,
            userid  = event.payload.user.openId;

        return router.getServer( account )
            .then(function(server){
                return server.get(
                    '/api/user/create',
                    {
                        tenantid : account,
                        userid   : userid,
                        usertype : 'openid',
                        userkind : 'system',
                        roles    : 'developer'
                    },
                    true
                )
                .then(function(){
                    return Q.resolve(
                        'User "' + userid + '" is assigned to the tenant "' +
                        account + '" at the server "' + server.name + '"'
                    )
                })
            })
    },

    'USER_UNASSIGNMENT' : function ( event ) {

        var account = event.payload.account.accountIdentifier,
            userid  = event.payload.user.openId;

        return router.getServer( account )
            .then(function(server){
                return server.get(
                    '/api/user/remove',
                    {
                        tenantid : account,
                        userid   : userid
                    },
                    true
                )
                .then(function(){
                    return Q.resolve(
                        'User "' + userid + '" is unassigned from the tenant "' +
                        account + '" at the server "' + server.name + '"'
                    )
                })
            })
    },

    'SUBSCRIPTION_NOTICE' : (function(){

        var notices = {

            'DEACTIVATED' : function ( event ) {

                var account = event.payload.account.accountIdentifier;

                return router.getServer( account )
                    .then(function(server){
                        return server.get(
                            '/api/tenant/deactivate',
                            {
                                tenantid : account
                            },
                            true
                        )
                        .then(function(){
                            return Q.resolve(
                                'Tenant "' + account +
                                '" is deactivated at the server "' + server.name + '"'
                            );
                        })
                    })
            },
            'REACTIVATED' : function ( event ) {

                var account = event.payload.account.accountIdentifier;

                return router.getServer( account )
                    .then(function(server){
                        return server.get(
                            '/api/tenant/activate',
                            {
                                tenantid : account
                            },
                            true
                        )
                        .then(function(){
                            return Q.resolve(
                                'Tenant "' + account +
                                '" is reactivated at the server "' + server.name + '"'
                            );
                        })
                    })
            },
            'CLOSED' : function ( event ) {

                var account = event.payload.account.accountIdentifier;

                return router.getServer( account )
                    .then(function(server){
                        return server.get(
                            '/api/tenant/remove',
                            {
                                tenantid : account
                            },
                            true
                        )
                        .then(function(){
                            return Q.resolve(
                                'Tenant "' + account +
                                '" is removed from the server "' + server.name + '"'
                            );
                        })
                    })
            },
            'UPCOMING_INVOICE' : function ( event ) {
                return Q.resolve();
            }
        };

        return function ( event ) {
            var notice = event.payload.notice.type;

            return notices.hasOwnProperty(notice)
                ? notices[notice](event)
                : Q.reject('unknown type of notice"' + notice + '"');

        }
    })(),

    'ADDON_ORDER'  : addons,
    'ADDON_CHANGE' : addons,
    'ADDON_BIND'   : addons,
    'ADDON_UNBIND' : addons,
    'ADDON_CANCEL' : addons
};
