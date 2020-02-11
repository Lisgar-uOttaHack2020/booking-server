const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');
const router = express.Router();

var customer = null;

router.use(bodyParser.urlencoded({ extended: true }));

// POST new customer
router.post('/', async function(req, res) {
  //check that data is valid
  const required = ['name', 'email', 'children'];
  const v = util.verify(required, req.body);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }
  else if (req.body.children.length < 1) {
    res.status(400).send(util.makeErrorJson('At least one child must be defined.'));
  }
  //data is valid
  else {
    customer = {
      name: req.body.name,
      email: req.body.email,
      children: req.body.children
    }

    //connect to database
    const promise = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db(global.NAME);
        
        //insert customer into database
        dbo.collection('customers').insertOne(customer, function(err, result) {
          if (err) reject(err);
          resolve(result.insertedId)
          db.close();
        });
      });
    })

    //return customer id through api
    const customerId = await promise;
    res.status(200).send(JSON.stringify({ id: customerId}));
  }
});

module.exports = router;
