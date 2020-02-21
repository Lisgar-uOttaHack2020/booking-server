const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://admin:3C8azvdpz1qFsXGR@teacherbooking-83sma.mongodb.net/test?retryWrites=true&w=majority";

function mongoDbHelper(callback) {

  MongoClient.connect(uri, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    callback(db);
  });
}

exports.mongoDbHelper = mongoDbHelper
