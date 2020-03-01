const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');
const validator = require('email-validator')
const crypto = require('crypto')
const ObjectId = require('mongodb').ObjectId; 
const router = express.Router();

const securityKey = 'temp'

router.use(bodyParser.urlencoded({ extended: true }));

// GET parent
router.get('/', async function(req, res) {
  //connect to database
  const promise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      var db = database; 
      var dbo = db.db();

      const required = ['token'];
      const v = util.verify(required, req.query);

      if (v.error) {
        res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
        reject(new Error('token is not defined'));
      }
      else {
        const token = req.query['token']

        //get list of parents
        dbo.collection('tokens').findOne( { value: token }, function(tokenErr, tokenRes) {
          if (tokenErr) reject(tokenErr);
          
          if (tokenRes == null || tokenRes['link-id'] == null) {
            resolve('Invalid token')
          }
          else {
            dbo.collection('parents').findOne( { _id: ObjectId(tokenRes['link-id']) }, function(parentErr, parentRes) {
              if (parentErr) reject(parentErr);
              
              resolve(parentRes);
            });

          }
        });
      }
    });
  });

  //return list through api
  const data = await promise.catch((err) => console.log(err));
  if (data === 'Invalid token')
    res.status(400).send(util.invalidToken());
  else 
    res.status(200).send(JSON.stringify(data));
});

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
      'first-name': req.body['first-name'],
      'last-name': req.body['last-name'],
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
            res.status(500).send(util.serverError());
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
            res.status(500).send(util.serverError());
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
      res.status(500).send(util.makeErrorJson('Failed to insert parent into database'));
      return;
    }

    //generate random token that links to parent
    randToken = crypto.randomBytes(64).toString('hex');
    const token = {
      value: randToken,
      type: 'parent',
      'link-id': parentId
    }

    //TODO: verify that randomly generated token value is unique (very very unlikely that it isn't but just in case)

    //insert token into database
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db();
      
      //insert token into database
      //TODO: instead of just replacing tokens, give tokens an expiry date
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
