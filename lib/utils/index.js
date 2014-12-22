var crypto = require('crypto'),
    Q      = require('q');


/**
 * @param {Number} length
 * @returns {String} random string with 'length' symbols
 */
function random ( length ) {
    var D = Q.defer();
    length = length ? length >> 1 : 4;
    crypto.randomBytes(length, function(error, buf) {
    return error
        ? D.reject(error)
        : D.resolve( new Buffer(buf).toString('hex') );
    });
    return D.promise;
};

var unicue = (function () {
    var n = (new Date()).getTime();

    return function () {
        return Q.when(random(16), function (r) { return ++n + r })
    }
})();


var time = {
    get now() {
        return (new Date()).getTime();
    }
};

/**
 * @param {Array} arr1
 * @param {Array} arr2
 *
 * @returns {Boolean} is there similar elements in the arrays or not
 */
function hasSimilar ( arr1, arr2 ) {
    var a = arr1.sort(),
        b = arr2.sort(),
        al = a.length,
        bl = b.length,
        ai = bi = 0;

    while ( ai < al && bi < bl ) {
        if ( a[ai] === b[bi] ) return true;
        if ( a[ai] < b[bi] ) ai++; else bi++;
    }

    return false;
}



exports.random = random;
exports.unicue = unicue;
exports.time = time;
exports.hasSimilar = hasSimilar;
