var Q = require('q')
    answer = require('./answer'),
    router = require('./router');

module.exports = function ( action, event ) {
    var account = event.payload[0].account[0].accountIdentifier[0],
        addonid = event.payload[0].order[0].addonOfferingCode[0];
    
    return addons.hasOwnProperty(addonid)
    
        ?   router.getServer( account ).then(function(server){
                return addons[addonid].action(account, server)
            })
    
        : Q.reject(new AnswerError('unknown add-on id')); // TODO add errCode
}

var addons = {
    'PLUS_TEN' : {

        order : function ( account, server ) {

            return server.get(
                '/api/limit/set',
                {
                    tenantid : account,
                    limit    : 'applications',
                    action   : '+',
                    value    : '10'
                },
                true
            )
            .then(function(){
                return Q.resolve({message : 'applications limit increased for 10'})
            })
            .fail(function( error ){

                log.warn(
                    'failed to increase applications limit for account "' +
                    account + '" of the server "' + server.name + '"'     ,
                    error
                );

                return Q.reject(new AnswerError(
                    'can not increase applications limit for 10'
                ));
            })
        },

        cancel : function ( o ) {
        }
    }
};
