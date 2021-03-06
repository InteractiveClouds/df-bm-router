/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var Q        = require('q'),
    sysadmin = require('../../../dfx_sysadmin'),
    appGate  = require('./app');

var log = new (require('../../../utils/log')).Instance({label:'GATES_APPQUERY'});

function Constr ( o ) {
    appGate.Constructor.call(this, o);

    this.use(checkRights);
}

Constr.prototype = new appGate.Constructor({});

function checkRights (req, success, fail, pocket) {

    log.dbg(
        'Checking rights for the query (tenant::ser:queryName): ' + 
        [
            pocket.tenantid,
            pocket.userid,
            pocket.data.queryName
        ].join(':') + ' ...'
    );

    return sysadmin.tenant.user.hasRight(
        pocket.tenantid,
        pocket.userid,
        pocket.data.queryName,
        'DATAQUERY'
    )
    .then(
        function () {
            log.dbg(
                'Checking rights for the query (tenant:user:queryName): ' + 
                [
                    pocket.tenantid,
                    pocket.userid,
                    pocket.data.queryName
                ].join(':') + ' SUCCESS'
            );
        },
        function ( error ) {
            log.dbg(
                'Checking rights for the query (tenant:user:queryName): ' + 
                [
                    pocket.tenantid,
                    pocket.userid,
                    pocket.data.queryName
                ].join(':') + ' FAILED'
            );

            if (error) log.dbg(error);

            return Q.reject(Error(
                'User ' + pocket.tenantid + ':' + pocket.userid +
                ' has not right to execute query ' + pocket.data.queryName
            ));
        }
    )
    .then(success, fail)
    .done();
}

exports.Constructor = Constr;
