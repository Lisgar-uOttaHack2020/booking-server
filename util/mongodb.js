const MongoClient = require('mongodb').MongoClient;

//IMPORTANT: SWITCH BETWEEN URLS WHEN PUSHING OR DATA WILL NOT BE STORED
/* const url = "mongodb://heroku_b77vk55s:h8pdmt6b2hdr86s0jk111bks91@ds061691.mlab.com:61691/heroku_b77vk55s";
global.NAME = 'heroku_b77vk55s'; */

/* const url = "mongodb://localhost:27017/booking"
global.NAME = 'booking'; */

const uri = "mongodb+srv://admin:3C8azvdpz1qFsXGR@teacherbooking-83sma.mongodb.net/test?retryWrites=true&w=majority";

function mongoDbHelper(callback) {

  MongoClient.connect(uri, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    callback(db);
  });
}

exports.mongoDbHelper = mongoDbHelper
