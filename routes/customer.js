var express = require('express');
const mdh = require('../util/mongodb')
const bodyParser = require('body-parser');

var router = express.Router();
mdh.mongoDbHelper(postUser)

router.use(bodyParser.urlencoded({ extended: true }));

/* POST new customer */
router.post('/register', function(req, res, next) {
  res.status(200).send(req.body);
  console.log("Works!");
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
