var Q       = require('q'),
    URL     = require('url'),
    Request = require('./request'),
    log     = new (require('./lib/utils/log')).Instance({label:'CLOUD'}),

    out   = {},
    _s    = {},
    servers,
    regexp = {
            affectsTenantsList : /^\/?api\/tenant\/(?:create|remove)/
        };


module.exports.init = function () {

    delete module.exports.init;

    var tasks = [];

    try { servers = require('./config').servers }
    catch (e) { return Q.reject('can\'t find configuration file') }
    
    var serversNames = Object.keys(servers),
        serversQuantity = serversNames.length;
    
    if ( !serversQuantity ) return Q.reject('no servers found in configuration file');
    
    log.info(
        'found ' + serversQuantity + ' server' + (serversQuantity > 1 ? 's' : '') +
        ' declaration' + (serversQuantity > 1 ? 's' : '')
    );
    
    // TODO validate config syntax ( url, etc. )
    
    for ( var name in servers ) {
        _s[name]  = new _Server(name, servers[name]);
        out[name] = new  Server(name, servers[name]);

        tasks.push( _s[name].refreshTenantsList() );
    }


    return Q.allSettled(tasks).then(function(results){

        var atLeastOne = false;

        for ( var i = 0, l = results.length; i < l; i++ ) {
            if ( results[i].state === 'fulfilled' ) {
                atLeastOne = true;
                break;
            }
        }

        for ( var name in out ) exports[name] = out[name];
            
        return atLeastOne
            ? Q.resolve()
            : Q.reject('no active servers was found');
    })


};


function parseDFXAnswer ( json, serverName ) {

    if ( !json || !json.hasOwnProperty('result') || !json.hasOwnProperty('data') ) {
        log.warn('wrong format of answer of DFX server "' + serverName + '"', json);
        return Q.reject();
    }

    if ( json.result === 'success' ) return json.data;

    log.warn('DFX server "' + serverName + '" answered "failed".', json.data);

    return Q.reject();
}


function _Server ( name, o ) {
    this.name      = name;
    this.address   = o.address;
    this.parsedUrl = URL.parse(this.address);
    this.creds     = o.credentials;
    this.isOnline  = false;
    this.ar        = new Request({
            authRequestParams : {
                schema                 : 'oAuthSimpleSigned',
                oauth_signature_method : 'HMAC-SHA1',
                oauth_version          : '1.0',
                credentials            : this.creds
            },
        
            statusCase : {
    
                400 : function ( res ) {
                    return parseDFXAnswer(res.body, name);
                },
    
                401 : function ( res ) {
                    log.warn('DFX server "' + name + '" answered "unauthorized"');
                    return Q.reject();
                },
        
                500 : function ( res ) {
                    log.warn('DFX server "' + name + '" answered "server error"');
                    return Q.reject();
                },
    
                200 : function ( res ) {
                    return parseDFXAnswer(res.body, name);
                },
    
                '*' : function ( res ) {
                    log.warn(
                        'DFX server "' + name + '" error. '+
                        'Unknown HTTP status of response.', res
                    );
                    return Q.reject();
                }
            }
        });
}

_Server.prototype.caughtInactive = function () {

    var server = this;

    server.isOnline = false;
    server.tenants = [];
    server.D = Q.defer();

    log.warn('Server "' + server.name + '" is inactive. Ping is started.');

    server.pingProcess = setInterval(function(){
        server.ar.get('api/tenant/list')
        .then(function(list){

            clearInterval(server.pingProcess);
            delete server.pingProcess;

            log.ok(
                'Server "' + server.name + '" becames active. ' +
                'Ping is stopped. Tenants : ' + JSON.stringify(list)
            );

            server.tenants = list;

            server.isOnline = true;
            server.D.resolve();

        });
    }, 15000);
};


// TODO it returns old tenants list while the request is not done

_Server.prototype.refreshTenantsList = function () {
    var name = this.name;

    return out[name].get('/api/tenant/list').then(function(list){

        log.ok(
            'Server "' + name + '" is online. Tenants : ' +
            JSON.stringify(list)
        );
    
        _s[name].isOnline = true;
    
        _s[name].tenants = list;
    })
};


function Server ( name, o ) {
    this.name    = name;

    Object.defineProperty(this, 'isOnline', {
        get : function () { return _s[this.name].isOnline }
    });

    Object.defineProperty(this, 'becameOnline', {
        get : function () {

            var n = this.name;

            return _s[n].D instanceof Q.defer && _s[n].D.state === 'pending'
                ? _s[name].D.promise
                : Q.resolve();
        }
    });

    Object.defineProperty(this, 'tenants', {
        get : function () { return _s[this.name].tenants || [] }
    });

}

Server.prototype.get = function ( relUrl, query ) {
    var server = _s[this.name],
        url = out[this.name].getUrl(relUrl, query),
        affectsTenantsList = regexp.affectsTenantsList.test(relUrl);

    return server.ar.get(url).then(
        function ( data ) {

            if ( affectsTenantsList ) server.refreshTenantsList();

            return data;
        },
        function (error) {

            if ( error.code !== 'ECONNREFUSED' ) return Q.reject(log.error(
                'authRequest failed with uncnown code "' + error.code + '"'
            ));

            server.caughtInactive();

            return Q.reject();
        }
    );
};


Server.prototype.getUrl = function ( relUrl, query ) {

    var server = _s[this.name],
        url = URL.format({
            protocol : server.parsedUrl.protocol,
            host     : server.parsedUrl.host,
            port     : server.parsedUrl.port,
            hostname : server.parsedUrl.hostname,
            query    : query,
            pathname : relUrl
        });

    return url;
};
