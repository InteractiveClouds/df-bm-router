var Q       = require('q'),
    Request = require('./request'),
    router  = require('./router'),
    log   = new (require('./lib/utils/log')).Instance({label:'EVENTS'}),
    xml2js  = require('xml2js'),

    xmlBuilder = new xml2js.Builder({
            rootName : 'event'
        }),

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
            '*' : function ( res ) { return Q.reject() },
            200 : function ( res ) { return res.body }
        }
    });

function uuid () { return (new Date()).getTime() } // TODO



module.exports = function ( req, res, next ) {

    var url = req.query.url;

    appDirect.get({url: url})
    .then(function(json){

        var event = json && json.event;

        if ( !checkAndLogEvent(json) ) return Q.reject();

        if ( event.flag && event.flag[0] === 'STATELESS' ) return Q.resolve({
            success : true,
            message : log.info('Recieved STATELESS appDirect event. Nothing is done.')
        });

        return events.hasOwnProperty(event.type)
            ? events[event.type](event)
            : Q.reject('unknown event type "' + event.type + '"');

    })
    .then(
        function(result){
            answer(res, result)
        },
        function(error) {
            answer(res, error)
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



function answer ( res, obj ) {

    var xml;

    if ( typeof obj !== 'object' || !obj.hasOwnProperty('success') ) {

        log.error( obj || 'empty error' );

        xml = xmlBuilder.buildObject({
            success : false,
            message : 'Internal dreamface server error.'
        });

    } else {

        log.ok( obj.message || 'empty message');

        xml = xmlBuilder.buildObject(obj);

    }

    res.set('Cache-Control', 'no-cache, no-store, max-age=0');
    res.set('Connection', 'close');
    res.setHeader( 'Content-Type', 'application/xml; charset=utf-8' );
    res.header('Content-length', xml.length);
    res.end(xml);
}


function saySuccess ( o ) {
    var response = { success : true };

    if ( o.message           ) response.message           = o.message;
    if ( o.accountIdentifier ) response.accountIdentifier = o.accountIdentifier;

    return response;
}


function sayFailed () {
    return {
        success   : false,
        errorCode : 'UNKNOWN_ERROR'
    };
}



var events = {

    'SUBSCRIPTION_ORDER' : (function(){

        return function (event, exclude) {

            var tenantid  = uuid(),
                userid    = event.creator[0].openId[0];

            return createTenant(tenantid, userid).then(function(serverName){
                return saySuccess({
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

    'SUBSCRIPTION_CANCEL' : function ( event ) {

        var account = event.payload[0].account[0].accountIdentifier[0];

        return router.getServer( account ).then(function(server){
            return server.get('/api/tenant/remove', { tenantid : account }, true)
            .then(function(){
                return saySuccess({
                    message : 'Tenant "' + account +
                            '" is removed from the server "' + server.name + '"'
                });
            })
        })
    },

    'SUBSCRIPTION_CHANGE' : function ( event ) {
        return saySuccess();
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
                    return saySuccess({
                        message : 'User "' + userid + '" is assigned to the tenant "' +
                                account + '" at the server "' + server.name + '"'
                    })
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
                    return saySuccess({
                        message : 'User "' + userid + '" is unassigned from the tenant "' +
                                account + '" at the server "' + server.name + '"'
                    })
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
                            return saySuccess({
                                message : 'Tenant "' + account +
                                        '" is deactivated at the server "' + server.name + '"'
                            });
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
                            return saySuccess({
                                message : 'Tenant "' + account +
                                        '" is reactivated at the server "' + server.name + '"'
                            });
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
                            return saySuccess({
                                message : 'Tenant "' + account +
                                        '" is removed from the server "' + server.name + '"'
                            });
                        })
                    })
            },
            'UPCOMING_INVOICE' : function ( event ) {
                return saySuccess();
            }
        };

        return function ( event ) {
            var notice = event.payload[0].notice[0].type[0];

            return notices.hasOwnProperty(notice)
                ? notices[notice](event)
                : Q.reject('unknown type of notice"' + notice + '"');

        }
    })(),

    'ADDON_ORDER' : function ( event ) {
        return sayFailed();
    },

    'ADDON_CHANGE' : function ( event ) {
        return sayFailed();
    },

    'ADDON_BIND' : function ( event ) {
        return sayFailed();
    },

    'ADDON_UNBIND' : function ( event ) {
        return sayFailed();
    },

    'ADDON_CANCEL' : function ( event ) {
        return sayFailed();
    }
};
