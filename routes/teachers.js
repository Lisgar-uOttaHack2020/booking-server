const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');
const validator = require('email-validator')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const router = express.Router();

const securityKey = 'tempTeachers'

router.use(bodyParser.urlencoded({ extended: true }));

// GET list of teachers
router.get('/', async function(req, res) {
  //connect to database
  const promise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      var db = database; 
      var dbo = db.db();

      let query = {}
      if (req.query.teachers) {
        teacherIds = req.query.teachers.map(function(teacher) {
          return ObjectId(teacher);
        })
        query = { _id: { $in: teacherIds } }
      }

      const projection = { projection: { password: 0}}

      //get list of teachers
      dbo.collection('teachers').find(query, projection).toArray(function(err, result) {
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
router.post('/register/', async function(req, res) {
  //check that data is valid
  const required = ['security-key', 'first-name', 'last-name', 'email', 'password'];
  const v = util.verify(required, req.body);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }
  else if (req.body['security-key'] != securityKey) {
    res.status(400).send(util.makeErrorJson('Invalid security key.'));
  }
  else if (!validator.validate(req.body['email'])) {
    res.status(400).send(util.makeErrorJson('Invalid email address.'));
  }
  //data is valid
  else {
    const hash = bcrypt.hashSync(req.body['password'], 10)
    const teacher = {
      'first-name': req.body['first-name'],
      'last-name': req.body['last-name'],
      email: req.body['email'],
      password: hash
    }

    //verify that email is unique within database
    const checkEmail = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();
        
        dbo.collection('teachers').findOne( { email: req.body['email'] } , function(err, result) {
          if (err) {
            res.status(500).send(util.makeErrorJson('An internal server error occurred.'));
            reject(err);
          }
          else {
            resolve(result == null);
          }
          db.close();
        });
      });
    });

    //if email exists, give 400 error
    const uniqueEmail = await checkEmail.catch(err => {
      console.log(err);
    });
    if (!uniqueEmail) {
      res.status(400).send(util.makeErrorJson('Email in use.'))
      return;
    }

    //email is unique, insert teacher into database
    const teacherPromise = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();
        
        dbo.collection('teachers').insertOne(teacher, function(err, result) {
          if (err) {
            res.status(500).send(util.makeErrorJson('An internal server error occurred.'));
            reject(err);
          }
          else {
            resolve(result.insertedId);
          }
          db.close();
        });
      });
    })

    //get teacher id if insertion was successful
    let insertSuccess = true;
    const teacherId = await teacherPromise.catch(err => {
      console.log(err);
      insertSuccess = false;
    });
    if (!insertSuccess) {
      return;
    }

    //generate random token that links to teacher
    randToken = crypto.randomBytes(64).toString('hex');
    const token = {
      _id: randToken,
      type: 'teacher',
      linkId: teacherId
    }

    //TODO: verify that randomly generated token is unique (very very unlikely that it isn't but just in case)

    //insert token into database
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db();
      
      //insert token into database
      //TODO: instead of just replacing tokens, give tokens an expiry date
      dbo.collection('tokens').replaceOne( { linkId: teacherId }, token, { upsert: true }, function(err) {
        if (err)
          console.log(err);
     
        db.close();
      });
    });

    res.status(200).send(JSON.stringify({ token: randToken}));

  }
});

  
module.exports = router;
