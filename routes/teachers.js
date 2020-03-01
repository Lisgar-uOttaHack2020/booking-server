const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');
const validator = require('email-validator')
const bcrypt = require('bcrypt')
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

// POST login teacher
router.post('/login/', async function(req, res) {
  //check that data is valid
  const required = ['email', 'password'];
  const v = util.verify(required, req.body);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }

  //data is valid
  else {
    const teacher = {
      email: req.body['email'],
    }

    //get the teacher's token (if username/password is valid)
    mdh.mongoDbHelper(function(database) {
      const db = database;
      const dbo = db.db();

      //find teacher in database
      dbo.collection('teachers').findOne( teacher, function(teacherErr, teacherRes) {
        if (teacherErr) {
          res.status(500).send(util.serverError());
          console.log(teacherErr)
          db.close();
        }
        else if (teacherRes == null) {
          res.status(400).send(util.makeErrorJson('Invalid email or password'));
          db.close();
        }
        
        //TODO: refresh token on login
        //find associated token in database
        else {
          //check that password is correct
          if (bcrypt.compareSync(req.body['password'], teacherRes.password)) {

            dbo.collection('tokens').findOne( { 'link-id': teacherRes._id }, async function(tokenErr, tokenRes) {
              if (tokenErr) {
                res.status(500).send(util.serverError());
                reject(tokenErr);
              }
              else if (tokenRes == null) {
                //generate new token for teacher
                const tokenPromise = new Promise(function(resolve) {
                  mdh.mongoDbHelper(function(database) {
                      resolve(util.generateToken('teacher', teacherRes._id, database));
                  });
                });
                
                const randToken = await tokenPromise;
                res.status(200).send(JSON.stringify({ token: randToken}));
              }
              else {
                res.status(200).send(JSON.stringify( { token: tokenRes.value } ));
              }
              db.close();
            });
          }
          
          //invalid password
          else {
            res.status(400).send(util.makeErrorJson('Invalid email or password'));
            db.close();
          }
        }
      });
    });
  }
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

    //email is unique, insert teacher into database
    const teacherPromise = new Promise(function(resolve, reject) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();
        
        dbo.collection('teachers').insertOne(teacher, function(err, result) {
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
   const tokenPromise = new Promise(function(resolve) {
    mdh.mongoDbHelper(function(database) {
       resolve(util.generateToken('teacher', teacherId, database));
    });
  });
 
  const randToken = await tokenPromise;
  res.status(200).send(JSON.stringify({ token: randToken}));

  }
});

  
module.exports = router;
