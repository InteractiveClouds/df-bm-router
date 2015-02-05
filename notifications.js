var AR = require('./lib/authRequest');
var EventManager = require('./event').EventManager;

var allEvents = [
    'SUBSCRIPTION_ORDER',
    'SUBSCRIPTION_CANCEL',
    'SUBSCRIPTION_CHANGE',
    'USER_ASSIGNMENT',
    'USER_UNASSIGNMENT',
    'SUBSCRIPTION_NOTICE',
    'ADDON_ORDER',
    'ADDON_CHANGE',
    'ADDON_BIND',
    'ADDON_UNBIND',
    'ADDON_CANCEL'
];


var toNotify = CFG.notify;

var em = new EventManager({debug : true});


var ar = AR.getRequestInstance({});


for ( var server in toNotify ) (function ( server ) {

    var events = toNotify[server].events || allEvents;

    for ( var i = 0, l = events.length; i < l; i++ ) {
    
        em.subscribe( events[i], function ( event, data ) {

            ar.get({
                url  : toNotify[server].address +
                        '?event=' + encodeURIComponent(JSON.stringify(data.event)) +
                        '&success=' + data.success
            });
            // TODO log result
        });

    }

})(server)


exports.publish = em.publish.bind(em);
