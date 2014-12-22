var Q       = require('q'),
    Request = require('./request'),
    router  = require('./router'),
    CFG     = require('./config'),
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

function uuid () { (new Date()).getTime() } // TODO 



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
            message : 'Recieved STATELESS appDirect event. Nothing is done.'
        });

        return events.hasOwnProperty(event.type)
            ? events[event.type](event)
            : Q.reject('unknown event type "' + event.type + '"');

    })
    .then(
        function(result){ answer(res, result) },
        function(error) { answer(res, error)  }
    );
};



function answer ( res, obj ) {

    var xml;

    if ( typeof obj !== 'object' || !obj.hasOwnProperty('success') ) {

        log.error(obj);

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

    'SUBSCRIPTION_ORDER' : function (event, exclude) {

        var unique  = uuid(),
            userid  = event.creator[0].openId[0],
            exclude = exclude || [];

        return router.getServer(exclude)
            .then(function(server){
                return server.get('/tenant/create', {
                    tenantid : unique,
                    userid   : userid,
                    usertype : 'openid',
                    roles    : 'developer'
                })
                .fail(function(){
                    exclude.push(server.name);
                    return events.SUBSCRIPTION_ORDER(event, exclude)
                })
            })
            .then(function(){
                return {
                    success : true,
                    message : 'Created tenant "' + unique + '" for user "' + userid + '"',
                    accountIdentifier : unique
                };
            });
    },

    //'SUBSCRIPTION_CANCEL' : function ( event ) {
    //    return removeTenant(
    //        event.payload[0].account[0].accountIdentifier[0]
    //    )
    //},

    //'SUBSCRIPTION_CHANGE' : function ( event ) {
    //    return saySuccess();
    //},

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

    //'SUBSCRIPTION_NOTICE' : (function(){

    //    var notices = {
    //        'DEACTIVATED' : function ( event ) {
    //            return tenants.deactivate(event.payload[0].account[0].accountIdentifier[0])
    //                .then(saySuccess);
    //        },
    //        'REACTIVATED' : function ( event ) {
    //            return tenants.activate(event.payload[0].account[0].accountIdentifier[0])
    //                .then(saySuccess);
    //        },
    //        'CLOSED' : function ( event ) {
    //            return removeTenant(
    //                event.payload[0].account[0].accountIdentifier[0]
    //            )
    //        },
    //        'UPCOMING_INVOICE' : function ( event ) {
    //            return saySuccess();
    //        }
    //    };

    //    return function ( event ) {
    //        var notice = event.payload[0].notice[0].type[0];

    //        return notices.hasOwnProperty(notice)
    //            ? notices[notice](event)
    //            : Q.reject('unknown type of notice"' + notice + '"');
    //        
    //    }
    //})(),

    //'ADDON_ORDER' : function ( event ) {
    //    return sayFailed();
    //},

    //'ADDON_CHANGE' : function ( event ) {
    //    return sayFailed();
    //},

    //'ADDON_BIND' : function ( event ) {
    //    return sayFailed();
    //},

    //'ADDON_UNBIND' : function ( event ) {
    //    return sayFailed();
    //},

    //'ADDON_CANCEL' : function ( event ) {
    //    return sayFailed();
    //}
};
