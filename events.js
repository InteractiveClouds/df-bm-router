//
//
//
//
//
// TODO answer.success --> Q.resolve ( see answer.js )
//
//
//
//
//


var Q       = require('q'),
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

    appDirect.get({url: url})
    .then(function(json){

        log.info(json);

        var parsedEvent = parseEvent(json.event);

        if ( parsedEvent instanceof Error ) return Q.reject(log.error(parsedEvent));

        event = json && json.event;

        if ( !checkAndLogEvent(json) ) return Q.reject();

        if ( event.flag && event.flag[0] === 'STATELESS' ) return Q.resolve(
            'Recieved STATELESS appDirect event. Nothing is done.'
        );

        return events.hasOwnProperty(event.type)
            ? events[event.type](event)
            : Q.reject('unknown event type "' + event.type + '"');

    })
    .then(
        function (data) {

            if ( event && event.type ) {
                notifications.publish(event.type, {success : true, event : event});
            }

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

function checkAndLogEvent ( json ) {

    var event = json && json.event;

    if ( typeof event !== 'object' ) {
        log.warn('wrong format of appdirect event.\n\n', json);
        return false;
    }

    var type    = event.type,
        creator = event.creator            && event.creator[0].openId[0],
        account = event.payload[0].account && event.payload[0].account[0].accountIdentifier[0],
        notice  = event.payload[0].notice  && event.payload[0].notice[0].type[0],
        userid  = event.payload[0].user    && event.payload[0].user[0].openId[0];

    if ( !type ) {
        log.warn('wrong format of appdirect event.\n\n', json);
        return false;
    }

    log.info(
        'event "' + type + '"' + ( notice ? ' / "' + notice + '"' : '' ) + ' is recieved:\n' +
        ( creator ? '\t\tcreator : ' + creator + '\n' : '' ) +
        ( account ? '\t\taccount : ' + account + '\n' : '' ) +
        ( userid  ? '\t\tuserid  : ' + userid  + '\n' : '' )
    );

    return true;
}


var events = {

    'SUBSCRIPTION_ORDER' : (function(){

        return function (event, exclude) {

            var tenantid  = uuid(),
                userid    = event.creator[0].openId[0];

            return createTenant(tenantid, userid).then(function(serverName){
                return Q.resolve({
                    message : 'Created tenant "' + tenantid + '" at the server "' +
                                serverName + '" for user "' + userid + '"',
                    accountIdentifier : tenantid
                });
            });
        }

        function createTenant ( tenantid, userid, exclude) {

            var exclude = exclude || [];

            return router.getServer(exclude).then(function(server){
                return server.get('/api/tenant/create', {
                    tenantid : tenantid,
                    userid   : userid,
                    usertype : 'openid',
                    roles    : 'developer'
                })
                .then(function(){ return server.name })
                .fail(function(){
                    log.warn(
                        'Failed to created the tenant "' + tenantid + '" at server "' +
                        server.name + '" for user "' + userid + '"'
                    );

                    if ( server.isOnline ) exclude.push(server.name);
                    return createTenant(tenantid, userid, exclude)
                })
            })
        }

    })(),

    'SUBSCRIPTION_CHANGE' : function ( event ) {
        return Q.resolve();
    },

    'SUBSCRIPTION_CANCEL' : function ( event ) {

        var account = event.payload[0].account[0].accountIdentifier[0];

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

        var account = event.payload[0].account[0].accountIdentifier[0],
            userid  = event.payload[0].user[0].openId[0];

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

        var account = event.payload[0].account[0].accountIdentifier[0],
            userid  = event.payload[0].user[0].openId[0];

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

                var account = event.payload[0].account[0].accountIdentifier[0];

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

                var account = event.payload[0].account[0].accountIdentifier[0];

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

                var account = event.payload[0].account[0].accountIdentifier[0];

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
            var notice = event.payload[0].notice[0].type[0];

            return notices.hasOwnProperty(notice)
                ? notices[notice](event)
                : Q.reject('unknown type of notice"' + notice + '"');

        }
    })(),

    'ADDON_ORDER'  : function (event) {
        addons('order', event);
    },
    'ADDON_CHANGE' : addons.bind(null, 'change'),
    'ADDON_BIND'   : addons.bind(null, 'bind'),
    'ADDON_UNBIND' : addons.bind(null, 'unbind'),
    //'ADDON_CANCEL' : addons.bind(null, 'cancel'),
    'ADDON_CANCEL'  : function (event) {
        addons('cancel', event);
    },
};
