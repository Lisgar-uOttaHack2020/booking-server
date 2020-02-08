const express = require('express');
const mdh = require('../util/mongodb')
const me = require('../util/error')
const bodyParser = require('body-parser');

const router = express.Router();

const consultant = null;

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', async function(res) {
    const promise = new Promise(function(resolve, reject) {
        mdh.mongoDbHelper(function(database) {
            const db = database; 
            const dbo = db.db("booking");
        
            dbo.collection('consultants').find({}).toArray(function(err, result) {
                if (err) reject(err);
                resolve(result);
                db.close();
            })
        });
      })

      const customerId = await promise;
      res.status(200).send(customerId);
});

/* POST new bookings for a parent */
router.post('/create', function(req, res) {
  const data = JSON.parse(req.body);
  const required = ['customerId', 'consultantId', 'child', 'date', 'time'];
  var response = "";
  var error = false;
  for (const r in required) {
    data.forEach(function(d, index) {
      if (!d[r]) {
        if (!data[r]) {
          response.concat(r + '[' + index + ']');
          error = true;
        }
      }
    })
    if (!data[r]) {
      response.concat(r);
      error = true;
    }
    res.status(400).send(me.makeErrorJson(reponse + ' must be defined.'));
  }

  mdh.mongoDbHelper(function(database) {
      const db = database; 
      const dbo = db.db(global.NAME);

      //check available times for teachers & update them
      const cdb = dbo.collection('consultant')
      for (d in data) {
        cdb.findOne({'_id': d.consultantId}, function(err, result) {
          if (err) throw (err);

          const times = result.availability.dates[d['date']];

          //attempts to insert appointment into schedule
          var didInsert = false
          for (var i = 0; i < times.length - 1; i += 2) {
            if (d.time.start > times[i] && d.time.end < times[i+1]) { //this time works
              //insert start & end time into database
              if (i + 1 == times.length) { //at end of database
                times.push(d.time.start, d.time.end);
              }
              else { //inside database
                times.splice(i + 1, 0, d.time.start, d.time.end); 
              }

              didInsert = true;
              break;
            }
          }
          //appointment booked successfully
          if (didInsert) {
            const obj = {};
            obj[d.date] = times;
            cdb.update({'_id': d.consultantId}, { $set: { 'availability.dates': obj } }, function (err) {
              if (err) throw (err);
            });
          }
          else {
            //TODO: Make an error message build up; insert ones that worked
            res.status(400).send(JSON.stringify( { error: 'time slot not available', booking: d } ));
          }
        })
      }
  
      dbo.collection('bookings').insertMany(data, function(err) {
        //Note: if bookings fail, a teacher's timetable will seem to have a reserved slot without anyone booking it
        if (err) reject(err);
        db.close();
      })
  });
});

  
module.exports = router;
