const mdh = require('./mongodb');
deleteCollection('parents');

//helper function to wipe databases
function deleteCollection(collection) {
  mdh.mongoDbHelper(function(database) {
    const db = database; 
    const dbo = db.db(global.NAME);

    dbo.collection(collection).deleteMany(function(err) {
      if (err) throw (err);
      console.log('Deleted ' + collection);
    });
  });
}
