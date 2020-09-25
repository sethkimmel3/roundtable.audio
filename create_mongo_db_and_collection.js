var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/discourseListDatabase";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("discourseListDatabase");
  dbo.createCollection("discourseList", function(err, res) {
    if (err) throw err;
    console.log("discourseList Collection created!");
    db.close();
  });
});