var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://heroku_b77vk55s:h8pdmt6b2hdr86s0jk111bks91@ds061691.mlab.com:61691/heroku_b77vk55s";
var name = 'heroku_b77vk55s';

/* var url = "mongodb://localhost:27017/booking"
var name = 'booking'; */

function mongoDbHelper(callback) {

    MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
        if (err) throw err;

        callback(db);
    });
}

exports.mongoDbHelper = mongoDbHelper
