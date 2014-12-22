var Q     = require('q'),
    cloud = require('./cloud'),
    //log   = new (require('./lib/utils/log')).Instance({label:'ROUTER'}),

    maxTimeToWait = 30000;
    

/**
 * @param {String|Array} [param] tenant name or list of servers names to exclude
 * @returns {Promise * Object} promise for server ( instance of Server )
 */
exports.getServer = function ( param ) {

    var tenant  = typeof param === 'string' ? param : '',
        exclude = param instanceof Array
            ? param.length
                ? param
                : null
            : null;

    if ( tenant ) {

        var foundServer = null;

        for ( var name in cloud ) {

            if ( ~cloud[name].tenants.indexOf(tenant) ) {
                foundServer = cloud[name];
                break;
            }
        }

        return foundServer.isOnline
            ? Q.resolve(foundServer)
            : waitForEither([foundServer]);

    } else {

        var offline = [],
            available = Object.keys(cloud)
            .sort(function(a,b){
                return cloud[a].tenants.length < cloud[b].tenants.length
            })
            .filter(function(name){

                var server = cloud[name],
                    shouldBeExcluded = exclude && !~exclude.indexOf(name);

                if ( server.isOnline ) {
                    return !shouldBeExcluded;
                } else {
                    if ( !shouldBeExcluded ) offline.push(server);
                    return false;
                }
            });

        return available.length
            ? Q.resolve(available[0])
            : offline.length
                ? waitForEither(offline) // promise
                : Q.reject();
    }
};


function waitForEither ( servers ) {

    var D    = Q.defer(),
        proc = setTimeout(function(){ D.reject() }, maxTimeToWait),
        resolved = false;

    servers.forEach(function(server){
        server.becameOnline.then(function(){

            if ( resolved ) return;

            resolved = true;
            clearTimeout(proc);
            D.resolve(server);
        });
    });

    return D.promise;
}
