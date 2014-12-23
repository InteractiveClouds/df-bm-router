var Q   = require('q');

exports.waitForEither = function ( servers ) {

    var D    = Q.defer(),
        proc = setTimeout(function(){ D.reject(
                'timeout expired to wait when servers ' +
                JSON.stringify(servers) +
                ' becomes online'
            ) }, CFG.maxTimeToWait),
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
