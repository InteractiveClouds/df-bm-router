var Q = require('q')
    answer = require('./answer'),
    log    = new (require('./lib/utils/log')).Instance({label:'ADDONS'}),
    router = require('./router');

var AnswerError = answer.Error;

module.exports = function ( action, event ) {

    //return Q.resolve();

    var account,
        addonid,
        errors = [];

    try {
        account = event.payload[0].account[0].accountIdentifier[0],
        addonid = event.payload[0].order[0].addonOfferingCode[0];
    } catch (e) {}

    if ( !account ) errors.push('no account ID was found');
    if ( !addonid ) errors.push('no add-on ID was found');

    if ( errors.length ) return Q.reject(new AnswerError(errors.toString()));
    
    return addons.hasOwnProperty(addonid)
        ? router.getServer(account).then(function(server){
                return addons[addonid][action](account, server)
            })
        : Q.reject(new AnswerError('unknown add-on id')); // TODO add errCode
}

var addons = {
    'BASIC' : {
        // TODO set local scope for the THIS_ADDON_ID

        order : function ( account, server ) {

            // TODO set local scope for the THIS_ADDON_ID
            var THIS_ADDON_ID = 'BASIC';

            return server.get(
                '/api/limit/set',
                {
                    tenant   : account,
                    limit    : 'users',
                    action   : '=',
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

        cancel : function ( account, server ) {

            // TODO set local scope for the THIS_ADDON_ID
            var THIS_ADDON_ID = 'BASIC';

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
