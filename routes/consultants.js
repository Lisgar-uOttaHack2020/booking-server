var express = require('express');
const mdh = require('../util/mongodb')
const bodyParser = require('body-parser');

var router = express.Router();

var customer = null;

router.use(bodyParser.urlencoded({ extended: true }));

/* POST new consultant */
router.post('/register', function(req, res) {
    console.log('request received');
    if (!('name' in req.body) || req.body.name == null) {
      res.status(400).send(me.makeErrorJson('Name of consultant must be defined.'));
    }
    else if (!('email' in req.body) || req.body.email == null) {
      res.status(400).send(me.makeErrorJson('Email of consultant must be defined.'));
    }
    else if (!('bookings' in req.body) || req.body.bookings == null) {
      res.status(400).send(me.makeErrorJson('At least one booking must be defined.'));
    }
    else {
      let bookings = JSON.parse(req.body.children);
      teacher = {
          name: req.body.name,
          email: req.body.email,
      }
      mdh.mongoDbHelper(addCustomer);
      res.status(200).send(req.body);
    }
  });

module.exports = router;

function addCustomer(database) {
    var db = database; 
    var dbo = db.db("booking");

    //todo: check that email is unique
    dbo.collection('consultants').insertOne(customer, function(err, result) {
        if (err) throw err;
        console.log(result);
        db.close();
    })
}
