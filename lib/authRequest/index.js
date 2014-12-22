/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

/**
 * returns ready for use request object
 * if credentials is specified
 * it will use credentials.schema for authentication each request
 *
 * @param {Object} [credentials]
 * @param {String} [credentials.schema]
 * @param {String} [credentials.user]
 * @param {String} [credentials.pass]
 *      or other credentials options if required
 * @retrurns {Object} instance
 */
exports.getRequestInstance = function ( credentials ) {
    var schema,
        schemaName = ( credentials && credentials.schema ) || 'no-auth';

    try { schema = require('./lib/auth-schemas/' + schemaName + '.js'); }
    catch (error) {
        throw( new Error( // TODO throw?
            'Not implemented authentication schema: ' + schemaName + '\n' + error
        ));
    };

    return new schema.Constructor(credentials);
}
