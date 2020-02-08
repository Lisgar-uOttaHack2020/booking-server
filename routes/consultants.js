const express = require('express');
const mdh = require('../util/mongodb')
const me = require('../util/error')
const bodyParser = require('body-parser');

const router = express.Router();

var consultant = null;

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', async function(res) {
  var promise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      var db = database; 
      var dbo = db.db(global.NAME);

      dbo.collection('consultants').find({}).toArray(function(err, result) {
        if (err) reject(err);
        resolve(result);
        db.close();
      })
    });
  })

  const consultantId = await promise;
  res.status(200).send(JSON.stringify({ id: consultantId}));
});

/* POST new consultant */
router.post('/register', async function(req, res) {
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
      timeInt: (req.body.timeInt === null) ? 10 : req.body.timeInt,
      availability: availabilityList
    }
    var promise = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        var db = database; 
        var dbo = db.db(global.NAME);
        
        dbo.collection('consultants').insertOne(consultant, function(err, result) {
          if (err) reject(err);
            resolve(result.insertedId);
            db.close();
          })
      });
    })

    const consultantId = await promise;
    res.status(200).send(JSON.stringify({ id: consultantId}));
  }
});

  
module.exports = router;
