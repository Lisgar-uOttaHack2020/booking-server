const express = require('express');
const mdh = require('../util/mongodb')
const ObjectId = require('mongodb').ObjectId; 
const util = require('../util/util')
const bodyParser = require('body-parser');
const router = express.Router();

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', async function(req, res) {
  //
  const promise = new Promise(function(resolve, reject) {
    mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db(global.NAME);

      const query = (req.query.consultantId) ? { consultantId: ObjectId(consultantId) } : {};
    
      dbo.collection('bookings').find(query).toArray(function(err, result) {
        if (err) reject(err);
        resolve(result);
        db.close();
      })
    });
  })

  const customerId = await promise.catch((err) => console.log(err));
  res.status(200).send(customerId);
});

/* POST new bookings for a parent */
router.post('/create', function(req, res) {
  //check that required data is present
  let data = []
  req.body.forEach(function (booking) {
    data.push(booking);
  });

  const required = ['customerId', 'consultantId', 'child', 'date', 'time'];
  let response = '';
  let err = false;
  data.forEach(function(d) {
    const v = util.verify(required, d);
    if (v.error) {
      err = true;
    }
    response.concat(v.response);
  })
  if (err) {
    res.status(400).send(util.makeErrorJson(response + 'is not defined'));
  }
  //data is valid
  else {
    //connect to database
    mdh.mongoDbHelper(function(database) {
      const promise = new Promise(function(resolve) {
        const db = database; 
        const dbo = db.db(global.NAME);
        const cdb = dbo.collection('consultants')

        //check available times for teachers & update them
        let numRuns = 0;
        data.forEach(function(d) {
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
                newCdb.updateOne({_id: o_id}, { $set: { 'availability.dates': obj } }, function (err, result) {
                  if (err) throw (err);
                  newDb.close();
                });
              });
              if (numRuns == data.length) {
                resolve(didInsert);
              }
            }
            //failed to book appointment -- time slot taken
            else {
              //TODO: Make an error message build up; insert ones that worked
              res.status(400).send(JSON.stringify( { error: 'time slot not available', booking: d } ));
              if (numRuns == data.length) {
                resolve(didInsert);
              }
            }
          })
        });
      });

      //has to wait for other async process to finish before trying to add
      async function waitInsert(p) {
        let doRun = await p;
        if (doRun) { 
          const db = database;
          const dbo = db.db(global.NAME)
          dbo.collection('bookings').insertMany(data, function(err) {
            //Note: if bookings fail, a teacher's timetable will seem to have a reserved slot without anyone booking it
            if (err) {
              res.status(500).send(util.makeErrorJson('error inserting bookings'));
              throw (err);
            }
            res.status(200).send(JSON.stringify( { response: 'successfully added ' + data.length + ' booking(s).' } ));
            db.close();
          })
        }
      }

      waitInsert(promise);
    });
  }
});

  
module.exports = router;
