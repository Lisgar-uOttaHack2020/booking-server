const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');
const validator = require('email-validator')
const crypto = require('crypto')
const router = express.Router();

const securityKey = 'temp'

router.use(bodyParser.urlencoded({ extended: true }));

// POST new parent
router.post('/register/', async function(req, res) {
  //check that data is valid
  const required = ['security-key', 'first-name', 'last-name', 'email', 'children'];
  const v = util.verify(required, req.body);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }
  else if (req.body.children.length < 1) {
    res.status(400).send(util.makeErrorJson('At least one child must be defined.'));
  }
  else if (req.body['security-key'] != securityKey) {
    res.status(400).send(util.makeErrorJson('Invalid security key.'));
  }
  else if (!validator.validate(req.body['email'])) {
    res.status(400).send(util.makeErrorJson('Invalid email address.'));
  }
  //data is valid
  else {
    const parent = {
      firstName: req.body['first-name'],
      lastName: req.body['last-name'],
      email: req.body['email'],
      children: req.body['children']
    }

    //verify that email is unique within database
    const checkEmail = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();
        
        dbo.collection('parents').findOne( { email: req.body['email'] } , function(err, result) {
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

    //email is unique, insert parent into database
    const parentPromise = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();
        
        dbo.collection('parents').insertOne(parent, function(err, result) {
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

    //get parent id if insertion was successful
    let insertSuccess = true;
    const parentId = await parentPromise.catch(err => {
      console.log(err);
      insertSuccess = false;
    });
    if (!insertSuccess) {
      return;
    }

    //generate random token that links to parent
    randToken = crypto.randomBytes(64).toString('hex');
    const token = {
      _id: randToken,
      type: 'parent',
      linkId: parentId
    }

    //insert token into database
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db();
      
      //insert token into database
      dbo.collection('tokens').replaceOne( { linkId: parentId }, token, { upsert: true }, function(err) {
        if (err)
          console.log(err);
     
        db.close();
      });
    });

    res.status(200).send(JSON.stringify({ token: randToken}));

  }
});

module.exports = router;
