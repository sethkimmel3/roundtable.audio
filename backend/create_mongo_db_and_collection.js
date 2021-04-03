var MongoClient = require('mongodb').MongoClient;

var database = "roundtableListDatabase";
var url = "mongodb://localhost:27017/" + database;

var collection = "roundtableTweets"
MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, db) {
  if (err) throw err;
  var dbo = db.db(database);
  dbo.createCollection(collection, function(err, res) {
    if (err) throw err;
    console.log(collection + " Collection created!");
    db.close();
  });
});
