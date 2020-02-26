const express = require('express');
const mdh = require('../util/mongodb')
const ObjectId = require('mongodb').ObjectId; 
const util = require('../util/util')
const bodyParser = require('body-parser');
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));

//GET list of bookings for a parent
router.get('/', async function(req, res) {
  //connect to database
  const promise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db();

      let query = {};
      if (req.query['teacher-id']) {
        if (req.query['teacher-id'].match(/^[0-9a-fA-F]{24}$/)) {
          query = { 'teacher-id': ObjectId(req.query['teacher-id']) };
        }
        else {
          res.status(400).send(util.makeErrorJson('Invalid teacher id.'));
          return;
        }
      }
    
      dbo.collection('bookings').find(query).toArray(function(err, result) {
        if (err) reject(err);
        resolve(result);
        db.close();
      })
    });
  })

  //return data via api
  const bookings = await promise.catch((err) => console.log(err));
  if (bookings != null)
    res.status(200).send(bookings);
  else 
    res.status(400).send(util.makeErrorJson('No teacher with matching teacher id found.'));
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

//POST bookings for a parent
router.post('/parent', function(req, res) {
  const data = req.data
  //check that required data is present
  const required = ['token', 'child-name', 'bookings'];
  const v = util.verify(required, data);
  if (v.error) {
    res.status(400).send(util.makeErrorJson(response + 'is not defined'));
  }

  //data is present
  else {
    //connect to database
    mdh.mongoDbHelper(function(database) {
      const promise = new Promise(function(resolve) {
        const db = database; 
        const dbo = db.db(global.NAME);
        const cdb = dbo.collection('consultants')

        //check available times for teachers & update them
        let numRuns = 0;
        const numBookings = data.length;
        const invalidBookings = [];
        data.forEach(function(d, index) {
          let didInsert = false;
          numRuns++;

          //find teacher
          const o_id = new ObjectId(d.consultantId);
          cdb.findOne({ _id: o_id }, function(err, result) {
            if (err) resolve(err);

            const times = result.availability.dates[d['date']];

            //attempts to insert appointment into schedule
            for (var i = 0; i < times.length - 1; i += 2) {
              if (d.time.start >= times[i] && d.time.end <= times[i+1]) { //this time works
                //insert start & end time into database
                if (i + 1 == times.length) { //at end of database
                  times.push(d.time.start, d.time.end);
                }
                else { //middle of database
                  times.splice(i + 1, 0, d.time.start, d.time.end); 
                }

                didInsert = true;
                break;
              }
            }
            //appointment booked successfully
            if (didInsert) {
              mdh.mongoDbHelper(function(database) {
                const newDb = database;
                const newCdb = newDb.db(global.NAME).collection('consultants')
              
                const obj = {};
                obj[d.date] = times;

                //update teacher's available times
                newCdb.updateOne({_id: o_id}, { $set: { 'availability.dates': obj } }, function (err) {
                  if (err) resolve (err);
                  newDb.close();
                });
              });
              //checked all appointments
              if (numRuns == numBookings) {
                resolve(invalidBookings);
              }
            }
            //failed to book appointment -- time slot taken
            else {
              //add booking to list of failed bookings & remove it from upload list
              invalidBookings.push(d);
              data.splice(index, 1);
              if (numRuns = numBookings) {
                resolve(invalidBookings)
              }
            }
          })
        });
      });

      //has to wait for other async process to finish before trying to add
      const waitInsert = async function(p) {
        let invalidBookings = await p.catch(function(err) {
          console.log(err);
          res.status(500).send(util.makeErrorJson('error inserting bookings'));
          return;
        });
        if (data.length != 0) { 
          const db = database;
          const dbo = db.db(global.NAME)
          dbo.collection('bookings').insertMany(data, function(err) {
            if (err) {
              res.status(500).send(util.makeErrorJson('error inserting bookings'));
              throw (err);
            }
            //all bookings work
            if (invalidBookings.length == 0) {
              res.status(200).send(JSON.stringify( { response: 'successfully added ' + data.length + ' booking(s).' } ));
            }
            //at least one failed
            else {
              res.status(200).send(JSON.stringify({
                response: 'successfully added ' + data.length + ' booking(s).',
                error: 'time slot(s) not available',
                bookings: invalidBookings
              }));
            } 
            db.close();
          })
        }
        //all bookings failed
        else {
          res.status(400).send(JSON.stringify( { error: 'time slot(s) not available', bookings: invalidBookings } ));
        }
      }

      waitInsert(promise);
    });
  }
});

  
module.exports = router;
