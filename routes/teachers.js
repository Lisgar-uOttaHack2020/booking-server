const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');

const router = express.Router();

var teacher = null;

router.use(bodyParser.urlencoded({ extended: true }));

// GET list of teachers
router.get('/', async function(req, res) {
  //connect to database
  const promise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      var db = database; 
      var dbo = db.db();

      //get list of consultants
      dbo.collection('teachers').find({}).toArray(function(err, result) {
        if (err) reject(err);
        resolve(result);
        db.close();
      })
    });
  });

  //return list through api
  const data = await promise.catch((err) => console.log(err));
  res.status(200).send(JSON.stringify(data));
});

// POST new teacher
router.post('/register', async function(req, res) {
  //check that data is valid
  const required = ['first-name', 'last-name', 'email'];
  const v = util.verify(required, req.body);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }

  //data is valid
  else {
    availabilityList = JSON.parse(req.body.availability);
    consultant = {
      name: req.body.name,
      email: req.body.email,
      timeInt: (req.body.timeInt == null) ? 10 : req.body.timeInt, //default to 10 min
      availability: availabilityList
    }
    
    //connect to database
    var promise = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        var db = database; 
        var dbo = db.db(global.NAME);
        
        //insert consultant
        dbo.collection('consultants').insertOne(consultant, function(err, result) {
          if (err) reject(err);
            resolve(result.insertedId);
            db.close();
          })
      });
    })

    //return id of inserted consultant through api
    const consultantId = await promise;
    res.status(200).send(JSON.stringify({ id: consultantId}));
  }
});

  
module.exports = router;
