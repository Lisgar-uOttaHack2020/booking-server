const express = require('express');
const mdh = require('../util/mongodb')
const ObjectId = require('mongodb').ObjectId; 
const util = require('../util/util')
const bodyParser = require('body-parser');
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));

router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://parent-teacher-booking.herokuapp.com");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//GET list of bookings for a parent
router.get('/', async function(req, res) {

  //connect to database
  const queryPromise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db();

      if (req.query['teacher-token']) {
        token = req.query['teacher-token'];
        
        dbo.collection('tokens').findOne( { value: token }, function(err, result) {
          if (err) {
            res.status(500).send(util.serverError())
            reject(err);
          }
          else if (result == null) {
            res.status(400).send(util.invalidToken())
            db.close();
            resolve(null);
          }
          else {
            resolve( { 'teacher-id': ObjectId(result['link-id']) } );
          }
        });
      }
      else {
        resolve(null);
      }
    });
  });

  const query = await queryPromise.catch((err) => console.log(err));
  if (query == null && req.query['teacher-token']) {
    //invalid token message has been sent already
    return;
  }

  //find bookings with given query
  const bookingsPromise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      const db = database;
      const dbo = db.db();

      dbo.collection('bookings').find(query).toArray(function(err, result) {
        if (err) reject(err);
        resolve(result);
        db.close();
      });
    })
  })

  //return data via api
  const bookings = await bookingsPromise.catch((err) => console.log(err));
  res.status(200).send(bookings);
});

//POST bookings for a teacher
router.post('/teacher', async function(req, res) {
  const data = req.body

  //check that required data is present
  const required = ['token', 'bookings'];
  const v = util.verify(required, data);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }

  //data is present
  else {

    //check that bookings are valid
    let validBookings = true;
    data.bookings.forEach(function(booking) {
      //TODO: verify no overlapping times (within request and database)
      if (!booking['time'] || !booking['time']['start'] || !booking['time']['end']) { //time not listed
        res.status(400).send(util.makeErrorJson('Missing booking time(s)'));
        validBookings = false;
        return;
      }
      if (!booking['room']) {
        res.status(400).send(util.makeErrorJson('Missing room number(s)'));
        validBookings = false;
        return;
      }
      if (!booking['date']) {
        res.status(400).send(util.makeErrorJson('Missing date(s)'));
        validBookings = false;
        return;
      }
    })
    if (!validBookings) {
      return;
    }

    //connect to database
    const teacherPromise = new Promise(function(resolve) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();

        //Check that the token is valid
        const token = data.token;

        dbo.collection('tokens').findOne( { value: token }, function(tokenErr, tokenRes) {
          if (tokenErr) reject(tokenErr);
          
          if (tokenRes == null || tokenRes['link-id'] == null) {
            resolve('Invalid token')
            db.close();
          }
          else {
            dbo.collection('teachers').findOne( { _id: ObjectId(tokenRes['link-id']) }, function(teacherErr, teacherRes) {
              if (teacherErr) reject(teacherErr);
            
              console.log(teacherRes);
              resolve(teacherRes);
              db.close();
            });
          }

        })
      });
    });

    const teacher = await teacherPromise.catch((err) => console.log(err));
    if (teacher === 'Invalid token') {
      res.status(400).send(util.invalidToken());
      return;
    }
    else {
      //insert bookings if token is valid
      const bookingPromise = new Promise(function(resolve) {
        mdh.mongoDbHelper(function(database) {
          const db = database; 
          const dbo = db.db();

          const bookings = data.bookings.map(function(booking) {
            return {
              'parent-id': null,
              'teacher-id': teacher._id,
              'child-name': null,
              'room': booking.room,
              'date': booking.date,
              'time': {
                start: booking.time.start,
                end: booking.time.end
              }
            }
          });
  
          dbo.collection('bookings').insertMany(bookings, function(err, res) {
            if (err) reject(err);

            console.log(res);
            resolve(res.insertedIds);
            db.close();
          })
        });
      });

      let insertSuccess = true;
      const bookingIds = await bookingPromise.catch((err) => {
        console.log(err);
        insertSuccess = false;
      });
      if (!insertSuccess) {
        res.status(500).send(util.makeErrorJson('Failed to insert bookings into database'));
        return;
      }
      else {
        let idList = [];
        for (let i = 0; i < data.bookings.length; i++) {
          idList.push(bookingIds[i.toString()]);
        }
        res.status(200).send({'booking-ids': idList});
      }
    }
  }
});

//POST bookings for a child
router.post('/parent', async function(req, res) {
  const data = req.body

  //check that required data is present
  const required = ['token', 'child-name', 'bookings'];
  const v = util.verify(required, data);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(v.response + 'is not defined'));
  }

  //data is present
  else {
    //connect to database
    const parentPromise = new Promise(function(resolve) {
      mdh.mongoDbHelper(function(database) {
        const db = database; 
        const dbo = db.db();

        //Check that the token is valid
        const token = data.token;

        dbo.collection('tokens').findOne( { value: token }, function(tokenErr, tokenRes) {
          if (tokenErr) reject(tokenErr);
          
          if (tokenRes == null || tokenRes['link-id'] == null) {
            resolve('Invalid token')
            db.close();
          }
          else {
            dbo.collection('parents').findOne( { _id: ObjectId(tokenRes['link-id']) }, function(parentErr, parentRes) {
              if (parentErr) reject(parentErr);
            
              resolve(parentRes);
              db.close();
            });
          }

        })
      });
    });

    const parent = await parentPromise.catch((err) => console.log(err));
    if (parent === 'Invalid token') {
      res.status(400).send(util.invalidToken());
      return;
    }
    else {
      //edit bookings if token is valid
      const bookingPromise = new Promise(function(resolve, reject) {
        mdh.mongoDbHelper(function(database) {
          const db = database; 
          const dbo = db.db();

          const bookings = data.bookings.map(function(booking) {
            return ObjectId(booking);
          });

          const query = { _id: { $in: bookings } };
          const body = { 
            $set: {
              'parent-id': parent._id,
              'child-name': req.body['child-name']
            }
          };
          
          //check that bookings are available
          dbo.collection('bookings').find(query).toArray(function(findErr, findRes) {
            if (findErr) reject(findErr);

            //invalid id
            if (findRes.length != bookings.length) {
              db.close();
              resolve('Invalid booking ID(s)');
              return;
            }

            //bookings already taken
            findRes.forEach(function(booking) {
              if (booking['child-name'] != null || booking['parent-id'] != null) {
                db.close();
                resolve('Booking(s) already taken')
                return;
              }
            });
            
            dbo.collection('bookings').updateMany(query, body, function(err, res) {
              if (err) reject(err);
  
              resolve('success');
              db.close();
            });
          });
        });
      });

      const insertStatus = await bookingPromise.catch((err) => console.log(err))
      if (insertStatus !== 'success') {
        res.status(500).send(util.makeErrorJson(insertStatus));
      }
      else {
        res.status(200).send(JSON.stringify({ result: 'Succesfully booking appointments' }));
      }
    }
  }
});
  
module.exports = router;
