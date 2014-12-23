var Q       = require('q'),
    Request = require('./request'),
    router  = require('./router'),
    CFG     = require('./config'),
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
        var event = json.event;

        if ( typeof event !== 'object' ) return Q.reject(
            'wrong format of appdirect event.\n\n' +
            ( typeof json === 'object' ? JSON.stringify(json) : json )
        );

        if ( event.flag && event.flag[0] === 'STATELESS' ) return Q.resolve({
            success : true,
            message : log.info('Recieved STATELESS appDirect event. Nothing is done.')
        });

        log.info('event "' + event.type + '" recieved ');

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



function answer ( res, obj ) {

    var xml;

    if ( typeof obj !== 'object' || !obj.hasOwnProperty('success') ) {

        log.error( obj || 'empty error' );

        xml = xmlBuilder.buildObject({
            success : false,
            message : 'Internal dreamface server error.'
        });

    } else {

        xml = xmlBuilder.buildObject(obj);

    }

    res.set('Cache-Control', 'no-cache, no-store, max-age=0');
    res.set('Connection', 'close');
    res.setHeader( 'Content-Type', 'application/xml; charset=utf-8' );
    res.header('Content-length', xml.length);
    res.end(xml);
}


function saySuccess () {
    return { success : true };
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

            return createTenant(tenantid, userid).then(function(){
                return {
                    success : true,
                    message : 'Created tenant "' + tenantid + '" for user "' + userid + '"',
                    accountIdentifier : tenantid
                };
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
                .then(function(){
                    log.ok(
                        'Created tenant "' + tenantid + '" at server "' +
                        server.name + '" for user "' + userid + '"'
                    );
                })
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

        return router.getServer( account )
            .then(function(server){
                return server.get('/api/tenant/remove', {
                    tenantid : account
                }, true)
            })
            .then(saySuccess);
    },

    'SUBSCRIPTION_CHANGE' : function ( event ) {
        return saySuccess();
    },

    //'USER_ASSIGNMENT'   : function ( event ) {
    //    return assignUser(
    //        event.payload[0].account[0].accountIdentifier[0],
    //        event.payload[0].user[0].openId[0]
    //    )
    //},

    //'USER_UNASSIGNMENT' : function ( event ) {
    //    return unassignUser(
    //        event.payload[0].account[0].accountIdentifier[0],
    //        event.payload[0].user[0].openId[0]
    //    )
    //},

    'SUBSCRIPTION_NOTICE' : (function(){

        var notices = {
    //        'DEACTIVATED' : function ( event ) {
    //            return tenants.deactivate(event.payload[0].account[0].accountIdentifier[0])
    //                .then(saySuccess);
    //        },
    //        'REACTIVATED' : function ( event ) {
    //            return tenants.activate(event.payload[0].account[0].accountIdentifier[0])
    //                .then(saySuccess);
    //        },
            'CLOSED' : function ( event ) {

                var account = event.payload[0].account[0].accountIdentifier[0];

                return router.getServer( account )
                    .then(function(server){
                        return server.get('/api/tenant/remove', {
                            tenantid : account
                        })
                    })
                    .then(saySuccess);
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
