var router = require('./router'),
    log    = new (require('./lib/utils/log')).Instance({label:'LOGIN'});

module.exports = function ( req, res, next ) {

    if ( !req.query.tenant ) return res.status(400).end('wrong request');

    router.getServer(req.query.tenant)
    .then(
        function(server){
            res.redirect(server.getUrl('studio/login', req.query));
        },
        function(error){
            log.error('Can\'t get server.', error);
            res.status(500).end('Server is temporary unavailable. Try later.');
        }
    )
};
