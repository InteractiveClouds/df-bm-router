module.exports = {

    theServerPort : 7000,

    maxTimeToWait : 60000, // a minute
    pingInterval  : 10000, // 10 seconds

    appDirectCredentials : {
        consumer_key     : 'a53c05bb316a',
        consumer_secret  : '53d1381ec71f3ce1f238ab2c'
    },

    servers : {
        s1 : {
            address : 'http://localhost:3000',
            credentials : {
                consumer_key    : 'a53c05bb316a',
                consumer_secret : '53d1381ec71f3ce1f238ab2c'
            }
        },
        s2 : {
            address : 'http://other.host',
            credentials : {
                consumer_key    : 'a53c05bb316a',
                consumer_secret : '53d1381ec71f3ce1f238ab2c'
            }
        },
    }
}
