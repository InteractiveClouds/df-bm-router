var log     = new (require('./lib/utils/log')).Instance({label:'SERVER'}),
    http    = require('http'),
    express = require('express'),
    login   = require('./login'),
    events  = require('./events'),

    app = express();



module.exports.start = function () {

    delete module.exports.start;

    app.set('port', 7000);

    app.get('/studio/login',    login);
    app.get('/appdirect/event', events);

    http.createServer(app).listen(app.get('port'), function(){
      log.info('The appDirect router server listening on port ' + app.get('port'));
    });
};
