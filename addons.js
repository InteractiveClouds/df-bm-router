var Q = require('q')
    answer = require('./answer'),
    log    = new (require('./lib/utils/log')).Instance({label:'ADDONS'}),
    router = require('./router');

var AnswerError = answer.Error;

module.exports = function ( event ) {

    //return Q.resolve();

    var account = event.payload.account.accountIdentifier,
        addonid;

    try {
        addonid = event.payload.order.addonOfferingCode;
    } catch (e) {
        try {
            addonid = event.payload.addonInstance.id
        } catch (e) {}
    }

    if ( !addonid ) return Q.reject(new AnswerError('no add-on ID was found'));


    return addons.hasOwnProperty(addonid)
        ? router.getServer(account).then(function(server){
                return addons[addonid].hasOwnProperty(event.type)
                    ? addons[addonid][event.type](event, server)
                    : Q.reject(new AnswerError('unknown add-on type'));
            })
        : Q.reject(new AnswerError('unknown add-on id')); // TODO add errCode
}

var addons = {
    'BASIC' : {
        // TODO set local scope for the THIS_ADDON_ID

        ADDON_ORDER : function ( event, server ) {

            // TODO set local scope for the THIS_ADDON_ID
            var THIS_ADDON_ID = 'BASIC',
                account = event.payload.account.accountIdentifier;

            return server.get(
                '/api/limit/set',
                {
                    tenant   : account,
                    limit    : 'users',
                    action   : '+',
                    value    : '10'
                },
                true
            )
            .then(function(data){
                //log.info('SETTING LIMIT: ', data);
                return Q.resolve({
                    id : THIS_ADDON_ID,
                    message : 'users limit is set for 10'
                })
            })
            .fail(function( error ){

                log.warn(
                    'failed to increase users limit for account "' +
                    account + '" of the server "' + server.name + '"'     ,
                    error
                );

                return Q.reject(new AnswerError(
                    'can not increase users limit for 10'
                ));
            })
        },

        ADDON_CANCEL : function ( event, server ) {

            // TODO set local scope for the THIS_ADDON_ID
            var THIS_ADDON_ID = 'BASIC',
                account = event.payload.account.accountIdentifier;

            return server.get(
                '/api/limit/set',
                {
                    tenant   : account,
                    limit    : 'users',
                    action   : '-',
                    value    : '10'
                },
                true
            )
            .then(function(data){
                //log.info('UNSETTING LIMIT: ', data);
                return Q.resolve({
                    id : THIS_ADDON_ID,
                    message : 'userss limit decreased for 10'
                })
            })
            .fail(function(error){

                console.log('ERROR: %s', error.message);

                log.warn(
                    'failed to decrease users limit for account "' +
                    account + '" of the server "' + server.name + '"'     ,
                    error
                );

                return Q.reject(new AnswerError(
                    'can not increase users limit for 10'
                ));
            });
        }
    }
};
