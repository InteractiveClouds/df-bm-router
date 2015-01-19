var log    = new (require('./lib/utils/log')).Instance({label:'ANSWER'}),
    xml2js = require('xml2js'),

    xmlBuilder = new xml2js.Builder({
            rootName : 'result'
        });


exports.success = function ( res, data ) {
    if ( typeof data === 'object' ) {
        response = data;
        response.success = true;
    } else if ( typeof data === 'string' ) {
        response = {
            success : true,
            message : data
        }
    } else response = { success : true }

    log.ok( data || 'empty message');

    sendAnswer(res, response);
};

exports.fail = function ( res, data ) {
    var response = data instanceof AnswerError
            ? data
            : new AnswerError;

    log.error( data || 'empty error' );

    sendAnswer(res, response);
};

exports.Error = AnswerError;


function sendAnswer ( res, obj ) {

    var response = xmlBuilder.buildObject(obj);

    res.set('Cache-Control', 'no-cache, no-store, max-age=0');
    res.set('Connection', 'close');
    res.setHeader( 'Content-Type', 'application/xml; charset=utf-8' );
    res.header('Content-Length', response.length);
    res.end(response);
}

/**
 * @param {String|Object} o if String === o.message
 * @param {String} [o.message='Internal DFX error']
 * @param {String} [o.code] AppDirect error code
 */
function AnswerError ( o ) {

    if ( !(this instanceof AnswerError) ) return new AnswerError(o);

    if      ( !o )                      o = { message : 'Internal DFX error' };
    else if ( typeof o === 'string' )   o = { message : o };

    this.success   = 'false';

    if ( o.code )    this.errorCode = o.code;
    if ( o.message ) this.message   = o.message;
};
