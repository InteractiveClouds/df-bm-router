var message = require('./message');


var channel,
    isRunning   = true,
    givenLabels = {};


/**
 * @param {Object} o params
 *  @param {String} o.label name of the log instance (is printed at log messages)
 */
function Log ( o ) {

    if ( !o.label ) throw(Error('Log label is required.'));

    if ( !/^[a-z0-9_]+$/i.test(o.label) ) throw(Error('Letters, digits, underscore is allowed at label name. ' + o.label));

    if ( givenLabels[o.label] ) throw(Error(
        'The label "' + o.label + '" already exists.'
    ));

    givenLabels[o.label] = true;

    this.label = o.label;
};

Log.fn = Log.prototype;

Log.fn.debug = function () { return go('DEBUG', this.label, arguments) };
Log.fn.dbg   = function () { return go('DEBUG', this.label, arguments) };
Log.fn.info  = function () { return go('INFO ', this.label, arguments) };
Log.fn.ok    = function () { return go('OK   ', this.label, arguments) };
Log.fn.warn  = function () { return go('WARN ', this.label, arguments) };
Log.fn.error = function () { return go('ERROR', this.label, arguments) };
Log.fn.fatal = function () {
    go('FATAL', this.label, arguments);
    channel.onClear(process.exit);
};


function go ( level, label, args ) {

    var text = formatText(args);


    if ( isRunning ) {

        var m = new message.Instance({
            level : level,
            label : label,
            text  : text
        });

        channel.publish(level, m);
    }

    return text;
}


function formatText ( args ) {
    return Array.prototype.reduce.call(args, function( p, c ) {
        var type = typeof c;
        return p +
            '\n    ' +
            (
                type === 'string' || type === 'number'
                    ? c
                    : Object.keys(c).length
                        ? JSON.stringify(c, null, 8).replace(/(.)$/, '    $1')
                        : c.toString()
            )
    }, '').replace(/^\n    /, '');
}


exports.Instance = Log;

exports.init = function ( o ) {

    channel  = o.channel;

    delete exports.init;

    return exports;
};
