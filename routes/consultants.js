var express = require('express');
const mdh = require('../util/mongodb')
const me = require('../util/error')
const bodyParser = require('body-parser');

var router = express.Router();

var consultant = null;

router.use(bodyParser.urlencoded({ extended: true }));

/* POST new consultant */
router.post('/register', function(req, res) {
    if (!('name' in req.body) || req.body.name == null) {
      res.status(400).send(me.makeErrorJson('Name of consultant must be defined.'));
    }
    else if (!('email' in req.body) || req.body.email == null) {
      res.status(400).send(me.makeErrorJson('Email of consultant must be defined.'));
    }
    else if (!('availability' in req.body) || req.body.availability == null) {
      res.status(400).send(me.makeErrorJson('Availability must be defined.'));
    }
    else {
      availabilityList = JSON.parse(req.body.availability);
      consultant = {
          name: req.body.name,
          email: req.body.email,
          availability: availabilityList
      }
      var promise = new Promise(function(resolve, reject) {
        mdh.mongoDbHelper(function(database) {
            var db = database; 
            var dbo = db.db("booking");
        
            dbo.collection('consultants').insertOne(consultant, function(err, result) {
                if (err) reject(err);
                resolve(result.insertedId);
                db.close();
            })
        });
      })

      var getReturnId = async() => {
          var customerId = await promise;

          return customerId;
      }

      getReturnId().then(function(customerId) {
        res.status(200).send(customerId);
     });
    }
  });

  
module.exports = router;
