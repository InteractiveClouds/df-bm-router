var authReq = require('./lib/authRequest'),
    Q       = require('q'),
    xml2js  = require('xml2js'),

    xmlParser  = new xml2js.Parser();


module.exports = Request;

function Request ( o ) {
    this.ar = new authReq.getRequestInstance(o.authRequestParams);
    this.statusCase = o.statusCase || {};
}

Request.prototype.get = function ( o ) {
    var that = this,
        options = typeof o === 'string'
            ? { url : o }
            : o; // authRequest options object

    return this.ar.get(options).then(function (res) {

        return parseBody(res).then(function(data){
    
            res.body = data;
    
            return that.statusCase.hasOwnProperty(res.status)
                ? that.statusCase[res.status](res)
                : that.statusCase.hasOwnProperty('*')
                    ? that.statusCase['*'](res)
                    : Q(res)
        });
    
    });
};

var parseBody = (function(){

    var parse = {

        text : function ( data ) {
                return Q(data);
            },
        json : function ( data ) {
                var parsed, error;

                try { parsed = JSON.parse(data) } catch (e) { error = e };

                return error
                    ? Q.reject(error)
                    : Q(parsed)
            },
        xml : function ( data ) {
            
                var D = Q.defer();

                xmlParser.parseString(data, function(error, json){

                    return error
                        ? D.reject(error)
                        : D.resolve(json);
                });

                return D.promise;
            },
        html : function ( data ) {
                return Q.reject('parsing of HTML is not implemented.');
            }
    };

    return function ( res ) {
        var ct = parseContentType(res.headers['content-type']);

        // TODO remove
        console.log( res.body.toString(ct.encoding) );

        return parse[ct.type](res.body.toString(ct.encoding));
    }
})();

var parseContentType = (function(){

    var type = {
            xml   : 'xml',
            html  : 'html',
            json  : 'json',
            plain : 'text'
        },
        typeRegexp = /(?:application|text)\/([^ ;]+)/i,
        encodingRegexp = /charset=([^ ;]+)/i;

    return function ( header ) {
        return !header
            ? { type : 'text', encoding : 'utf-8' }
            : { type     : type[( typeRegexp.exec(header) || [] )[1]] || 'text',
                encoding : ( encodingRegexp.exec(header) || [] )[1] || 'utf-8'
                }
    }
})();
