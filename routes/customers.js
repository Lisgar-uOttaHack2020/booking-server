var express = require('express');
const mdh = require('../util/mongodb')
const me = require('../util/error')
const bodyParser = require('body-parser');

var router = express.Router();

var customer = null;

router.use(bodyParser.urlencoded({ extended: true }));

/* POST new customer */
router.post('/', function(req, res) {
  console.log('request received');
  if (!('name' in req.body) || req.body.name == null) {
    res.status(400).send(me.makeErrorJson('Name of customer must be defined.'));
  }
  else if (!('email' in req.body) || req.body.email == null) {
    res.status(400).send(me.makeErrorJson('Email of customer must be defined.'));
  }
  else if (!('children' in req.body) || req.body.children == null) {
    res.status(400).send(me.makeErrorJson('At least one child must be defined.'));
  }
  else {
    req.body.children = JSON.parse(req.body.children);
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

function addCustomer(database, name) {
    var db = database; 
    var dbo = db.db(name);

    dbo.collection('customers').insertOne(customer, function(err, result) {
        if (err) throw err;
        console.log(result);
        db.close();
    })
}
