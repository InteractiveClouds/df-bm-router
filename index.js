#!/usr/bin/env node

var Log       = require('./lib/utils/log'),
    path      = require('path'),
    cloud     = require('./cloud'),
    theServer = require('./server');

Log.init.stdout({});

Log.init.file({
    rotate : 7,
    path   : path.join(__dirname, 'logs')
});

var log = new Log.Instance({label:'INDEX'});


cloud.init()
.then(theServer.start)
.fail(log.fatal.bind(log));
