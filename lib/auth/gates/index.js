var log = new (require('../../utils/log')).Instance({label:'GATES_INDEX'}),
    oauthSignature = require('oauth-signature');


exports.init = function ( o ) {

    delete exports.init;

    var out = {};

    var oAuthSimpleSigned = new (require('./default/oAuthSimpleSigned').Constructor)({
        oauthSignature : oauthSignature,
        oauth_consumer_secret : CFG.appDirectCredentials.consumer_secret
    });

    out.oAuthSimpleSigned = oAuthSimpleSigned.endpoint.bind(oAuthSimpleSigned);

    return out;
};
