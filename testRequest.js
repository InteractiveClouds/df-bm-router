var Q       = require('q'),
    Request = require('./request'),

    request = new Request({
        authRequestParams : {
            schema                 : 'no-auth'
        },
        statusCase : {
            '*' : function ( res ) { return Q.reject('got answer with status ' + res.status) },
            401 : function ( res ) { return Q.reject('got answer with status 401') },
            200 : function ( res ) { return res.body }
        }
    });

request.get({
    url   : 'http://localhost:5000',
    path  : 'publish?a=AA&b=BB'
})
.then(
    function ( data ) {
        console.log('DONE', data);
    },
    function ( data ) {
        console.log('DONE', data);
    }
);
