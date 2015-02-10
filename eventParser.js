var u = undefined;

var log = new (require('./lib/utils/log')).Instance({label:'EVENT_PARSER'});

module.exports = function ( j ) {

    var errors  = [],
        fatals  = [],
        r       = {}; // parsed result

    if ( toExtract.hasOwnProperty(j.type) ) toExtract[j.type].forEach(function(item){
        extract[item](j, r, errors, fatals);
    });

    if ( errors.length ) log.warn(errors);
    if ( fatals.length ) log.warn(fatals);

    log.info(JSON.stringify(r,null,4));

    return fatals.length
        ? new Error(fatals.toString())
        : r;
};


var toExtract = {
    'SUBSCRIPTION_ORDER'  : [ 'type', 'flag', 'creator',                               'order' ],
    'SUBSCRIPTION_CHANGE' : [ 'type', 'flag', 'creator', 'account',                    'order' ],
    'SUBSCRIPTION_CANCEL' : [ 'type', 'flag', 'creator', 'account'                             ],
    'USER_ASSIGNMENT'     : [ 'type', 'flag', 'creator', 'account',           'user'          ],
    'USER_UNASSIGNMENT'   : [ 'type', 'flag', 'creator', 'account',           'user'          ],
    'SUBSCRIPTION_NOTICE' : [ 'type', 'flag', 'creator', 'account', 'notice'                   ]
    /* TODO
    'ADDON_ORDER'         : [ 'type', 'flag', 'creator', 'account', 'notice', 'user', 'order' ],
    'ADDON_CHANGE'        : [ 'type', 'flag', 'creator', 'account', 'notice', 'user', 'order' ],
    'ADDON_BIND'          : [ 'type', 'flag', 'creator', 'account', 'notice', 'user', 'order' ],
    'ADDON_UNBIND'        : [ 'type', 'flag', 'creator', 'account', 'notice', 'user', 'order' ],
    'ADDON_CANCEL'        : [ 'type', 'flag', 'creator', 'account', 'notice', 'user', 'order' ]
    */
};


var extract = {};

extract.type = function ( j, r, errors, fatals ) {
    r.type = j.type[0] || ( fatals.push('no "type" field was found') && u );
};

extract.flag = function ( j, r, errors, fatals ) {
    r.flag = j.flag && j.flag[0] || u;
};

extract.creator = function ( j, r, errors, fatals ) {

    if ( !j.creator || !j.creator[0] ) return fatals.push('no "creator" field was found');

    r.creator = {};

    extractUserInfo(j.creator[0], r.creator, 'creator', errors, fatals);

};

function extractUserInfo ( j, r, type, errors, fatals ) {

        r.openId    = ( j.openId && j.openId[0] )
                        || (fatals.push('no "'+type+'.openId" field was found')    && u);

        r.email     = ( j.email && j.email[0] )
                        || (errors.push('no "'+type+'.email" field was found')     && u);

        r.firstName = ( j.firstName && j.firstName[0] )
                        || (errors.push('no "'+type+'.firstName" field was found') && u);

        r.lastName  = ( j.lastName && j.lastName[0] )
                        || (errors.push('no "'+type+'.lastName" field was found' ) && u);

        r.language  = ( j.language && j.language[0] )
                        || (errors.push('no "'+type+'.language" field was found' ) && u);
}

extract.account = function ( j, r, errors, fatals ) {

    if ( !j.payload || !j.payload[0] || !j.payload[0].account || !j.payload[0].account[0] ) {
        return fatals.push('no "payload.account" field was found');
    }

    r.payload = r.payload || {};

    r.payload.account = {
        accountIdentifier : j.payload[0].account[0].accountIdentifier[0]
                || ( fatals.push('no "payload.account.accountIdentifier" field was found') && u ),
        status : j.payload[0].account[0].status[0]
                || ( errors.push('no "payload.account.status" field was found') && u )
    };
    
};

extract.notice = function ( j, r, errors, fatals ) {

    r.payload = r.payload || {};
    r.payload.notice = {};

    r.payload.notice.type =  (
                j.payload &&
                j.payload[0] &&
                j.payload[0].notice &&
                j.payload[0].notice[0] &&
                j.payload[0].notice[0].type &&
                j.payload[0].notice[0].type[0]
            )
        || ( fatals.push('no "payload.notice" field was found') && u );
};

extract.user = function ( j, r, errors, fatals ) {
    
    r.payload = r.payload || {};

    if ( !j.payload || !j.payload[0] || !j.payload[0].user || !j.payload[0].user[0] ) {
        return fatals.push('no "payload.user" field was found');
    }

    r.payload.user = {};

    extractUserInfo(j.payload[0].user[0], r.payload.user, 'user', errors, fatals);
};

extract.order = function ( j, r, errors, fatals ) {

    r.payload = r.payload || {};

    if ( !j.payload || !j.payload[0] || !j.payload[0].order || !j.payload[0].order[0] ) {
        return fatals.push('no "payload.order" field was found');
    }

    r.payload.order = {
        editionCode : j.payload[0].order[0].editionCode && j.payload[0].order[0].editionCode[0]
                || ( fatals.push('no "payload.order.editionCode" field was found') && u )
    };

    if ( j.payload[0].order[0].item instanceof Array ) {
        r.payload.order.item = {};

        j.payload[0].order[0].item.forEach(function( item, i, items ){
            r.payload.order.item[ item[unit[0]] ] = item[quantity[0]];
        });
    }
};
