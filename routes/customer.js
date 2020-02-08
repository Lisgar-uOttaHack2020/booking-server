var express = require('express');
const mdh = require('../util/mongodb')
const bodyParser = require('body-parser');

var router = express.Router();

var customer = null;

router.use(bodyParser.urlencoded({ extended: true }));

/* POST new customer */
router.post('/register', function(req, res) {
  if (!'name' in req.body) {
    res.status(400).send('Name of customer must be defined.');
  }
  else if (!'email' in req.body) {
    res.status(400).send('Email of customer must be defined.');
  }
  else if (!'children' in req.body) {
      res.status(400).send('At least one child must be defined.')
  }
  else {
    customer = {
        name: req.body.name,
        email: req.body.email,
        children: req.body.children
    }
    mdh.mongoDbHelper(addCustomer);
    res.status(200).send(req.body);
  }
});

module.exports = router;
/* dbo.collection("customers").find().sort(mysort).toArray(function(err, result) {
    if (err) throw err;
    console.log(result);
    db.close();
});
 */
function addCustomer(database) {
    var db = database; 
    var dbo = db.db("booking");

    console.log(customer);

    dbo.collection('customers').insertOne(customer, function(err, result) {
        if (err) throw err;
        console.log(result);
        db.close();
    })
}
