const mongoDb = require('./mongodb');



//set up indexes of collections
mongoDb.mongoDbHelper(function(database) {
  const db = database; 
  const dbo = db.db(global.NAME);

  //set up parents
  dbo.collection('parents').createIndex( { 'email': 1 }, { unique: true } );
});
