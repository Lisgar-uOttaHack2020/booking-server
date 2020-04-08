const express = require('express');
const mdh = require('../util/mongodb')
const util = require('../util/util')
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));

router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://parent-teacher-booking.herokuapp.com");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.delete('/', async function(req, res) {
  if (req.query['password'] !== 'seCre7P@ssW0Rd312') {
    res.status(400).send(util.makeErrorJson('Invalid password'));
    return;
  }

  const collection = req.query['collection'];
  if (collection) {
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db();

      //check if collection exists
      dbo.listCollections().toArray(function(err, result) {
        if (err) throw err;

        if (result.length == 0) {
          res.status(400).send(util.makeErrorJson('No collections to delete.'));
          return;
        }

        //check that specified collection exists
        result.forEach(function(c) {
          if (c.name == collection) {
            dbo.dropCollection(collection, function(err) {
              if (err) throw (err);
              console.log('Deleted ' + collection);
              res.status(200).send(JSON.stringify({ result: 'Successfully deleted ' + collection}))
              db.close();
            });
          }
          else if (collection == result[result.length - 1]) {
            res.status(400).send(util.makeErrorJson('Invalid collection'));
            db.close();
          }
        });
      });
    });
  }
  else {
    res.status(400).send(util.makeErrorJson('Invalid collection'));
  }
});

router.delete('/all', async function(req, res) {

  if (req.query['password'] !== 'seCre7P@ssW0Rd312') {
    res.status(400).send(util.makeErrorJson('Invalid password'));
    return;
  }

  mdh.mongoDbHelper(function(database) {
    const db = database;
    const dbo = db.db();

    //get list of all collections
    dbo.listCollections().toArray(function(err, result) {
      if (err) throw err;

      if (result.length == 0) {
        res.status(400).send(util.makeErrorJson('No collections to delete'));
        return;
      }
      
      result.forEach(function(collection) {
        dbo.dropCollection(collection.name, function(err) {
          if (err) throw (err);
          console.log('Deleted ' + collection.name);
          if (collection == result[result.length - 1]) {
            res.status(200).send(JSON.stringify({ result: 'Successfully dropped database'}));
            db.close();
          }
        });
      });
    });
  });
});

module.exports = router;
