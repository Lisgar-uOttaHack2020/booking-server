var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/booking";

function mongoDbHelper(callback) {

    MongoClient.connect(url, { useUnifiedTopology: true }, function(err, db) {
        if (err) throw err;

        callback(db);
    });
}

exports.mongoDbHelper = mongoDbHelper
