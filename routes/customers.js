const express = require('express');
const mdh = require('../util/mongodb')
const me = require('../util/error')
const bodyParser = require('body-parser');
const router = express.Router();

var customer = null;

router.use(bodyParser.urlencoded({ extended: true }));

/* POST new customer */
router.post('/', async function(req, res) {
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
    customer = {
        name: req.body.name,
        email: req.body.email,
        children: req.body.children
    }

    const promise = new Promise(function(resolve, reject) {
        mdh.mongoDbHelper(function(database) {
            const db = database; 
            const dbo = db.db(global.NAME);
        
            dbo.collection('customers').insertOne(customer, function(err, result) {
                if (err) reject(err);
                resolve(result.insertedId)
                db.close();
            });
        });
    })

    const customerId = await promise;
    res.status(200).send(JSON.stringify({ id: customerId}));
  }
});

module.exports = router;
