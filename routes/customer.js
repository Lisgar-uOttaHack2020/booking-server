var express = require('express');
const mdh = require('../util/mongodb')

var router = express.Router();
mdh.mongoDbHelper(postUser)

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;

/* dbo.collection("customers").find().sort(mysort).toArray(function(err, result) {
    if (err) throw err;
    console.log(result);
    db.close();
});
 */
function postUser(database) {
    var db = database; 
    var dbo = db.db("booking");

    console.log("it worked!")
}
