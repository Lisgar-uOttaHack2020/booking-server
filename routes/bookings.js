const express = require('express');
const mdh = require('../util/mongodb')
const me = require('../util/error')
const bodyParser = require('body-parser');

const router = express.Router();

const consultant = null;

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', async function(res) {
    const promise = new Promise(function(resolve, reject) {
        mdh.mongoDbHelper(function(database) {
            const db = database; 
            const dbo = db.db("booking");
        
            dbo.collection('consultants').find({}).toArray(function(err, result) {
                if (err) reject(err);
                resolve(result);
                db.close();
            })
        });
      })

      const customerId = await promise;
      res.status(200).send(customerId);
});

/* POST new consultant */
router.post('/register', function(req, res) {
    if (!('parentId' in req.body) || req.body.parentId == null) {
      res.status(400).send(me.makeErrorJson('Parent id must be defined.'));
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
      const promise = new Promise(function(resolve, reject) {
        mdh.mongoDbHelper(function(database) {
            const db = database; 
            const dbo = db.db("booking");
        
            dbo.collection('consultants').insertOne(consultant, function(err, result) {
                if (err) reject(err);
                resolve(result.insertedId);
                db.close();
            })
        });
      })

      const getReturnId = async() => {
          const customerId = await promise;

          return customerId;
      }

      getReturnId().then(function(customerId) {
        res.status(200).send(customerId);
     });
    }
  });

  
module.exports = router;
