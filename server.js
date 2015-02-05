var log     = new (require('./lib/utils/log')).Instance({label:'SERVER'}),
    http    = require('http'),
    express = require('express'),
    login   = require('./login'),
    events  = require('./events'),
    gate    = require('./lib/auth').gate,

    app = express();



module.exports.start = function () {

    delete module.exports.start;

    app.set('port', CFG.theServerPort);

    app.get('/studio/login',    login);
    app.get('/appdirect/event', gate.oAuthSimpleSigned, events);

    http.createServer(app).listen(app.get('port'), function(){
      log.info('The appDirect router server listening on port ' + app.get('port'));
    });
};
