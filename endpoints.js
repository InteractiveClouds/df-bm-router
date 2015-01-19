var Q = require('q'),
    Log = require('./log').Instance;

function ResponseError ( o ) {

    if ( !( this instanceof ResponseError) ) return new ResponseError(o);

    var error = Error.call(this);

    o = o || {};

    this.title   = o.title;
    this.message = o.message || '';
    this.data    = o.data;
    this.stack   = error.stack.replace(/^(?:.+\n){3}/, '');
}

ResponseError.prototype = Object.create(Error.prototype, {
    constructor : { value: ResponseError }
});

ResponseError.prototype.toString = function () {
    return [(this.title || 'ResponseError'), this.message, JSON.stringify(this.data)].join(' : ');
};

exports.ResponseError = ResponseError;

/**
 * @param {Object} o options
 * @param {Function} o.parser is invoked with `req` and should return extracted data for o.action
 * @param {Function|Object.<Function>} o.action  is invoked with result of `parser`
 *      if it returns some instance of Error -- `failed` answer is generated, with `error type` == 'server error'
 *      if it returns Q.reject -- `failed` answer is generated with `error type` == 'request error'
 *      otherwise `success` answer is generated
 *
 * for answer format see `formatData` and `formatError` bellow
 */
exports.json = function ( o ) {

    var action       = o.action,
        log          = o.log,
        typeofAction = typeof action,
        invokeAction;

    if ( !(log instanceof Log) ) throw('log is not defined at new endpoint');


    if ( typeofAction === 'function' ) {
        invokeAction = function ( parsed ) { return action(parsed) }; 
    } else if ( typeofAction === 'object' && Object.keys(action).length ) {

        if ( typeof o.parser !== 'function' ) {
            log.fatal('when "action" is object "parser" is required and must be a function.');
        }

        invokeAction = function ( parsed ) {

            if ( typeof parsed !== 'object' ) return Q.reject(new Error(
                '[ENDPOINTS] "parsed" has returned not object.'
            ));

            if ( !action.hasOwnProperty(parsed.action) ) return Q.reject(
                'unknown action: "' + parsed.action + '".'
            );

            return action[parsed.action].call(action, parsed.data);
        };

    } else {
        log.fatal('"action" must be either: function or not empty object.');
    }

    var parser = o.parser || function () {};


    return function ( req, res, next ) {

        Q(req)
        .then(parser)
        .then(invokeAction)
        .then(function (data) {

            return data instanceof Error
                ? Q.reject(data)
                : formatData(data);
        })
        .fail(function (error) {

            var errorMessage, errorType;
            var errorInstance;

            if ( error instanceof Error ) {
                if ( error instanceof ResponseError ) {
                    res.status(400);
                    errorInstance = error;
                    errorInstance.type = 'request error';
                } else {
                    res.status(500);
                    errorInstance = new ResponseError();
                    errorInstance.type = 'server error';
                }
            } else {
                res.status(400);
                errorInstance = new ResponseError({
                    message : error.toString()
                });
                errorInstance.type = 'request error';
            }

            log.error(errorInstance.type + ': ' + error.toString());

            return formatError(errorInstance);
        })
        .then(res.json.bind(res))
    }
};

function formatData ( data ) {
    return {
        result : 'success',
        data   : data || ''
    }
}

function formatError ( e ) {
    return {
        result : 'failed',
        error  : {
            type    : e.type,
            message : e.message,
            title   : e.title,
            data    : e.data
        }
    }
}
