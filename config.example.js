module.exports = {

    theServerPort : 7000,

    // how long to wait anactive server for an answer
    // before send 500 to appDirect
    maxTimeToWait : 60000, // a minute

    // how often to send ping request to a unactive server
    pingInterval  : 10000, // 10 seconds

    appDirectCredentials : {
        consumer_key     : 'a53c05bb316a',
        consumer_secret  : '53d1381ec71f3ce1f238ab2c'
    },

    servers : {

        // ensure that server address is visible from the Internet
        // DO NOT use nothing like localhost, 127.0.0.1 or
        // a local address behind a NAT like 10.10.0.100 etc.
        one : {
            address : 'http://example.com:3000',
            credentials : {
                consumer_key    : 'a53c05bb316a',
                consumer_secret : '53d1381ec71f3ce1f238ab2c'
            }
        },

        two : {
            address : 'http://other.host',
            credentials : {
                consumer_key    : 'a53c05bb316a',
                consumer_secret : '53d1381ec71f3ce1f238ab2c'
            }
        },
    }
}
