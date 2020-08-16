const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://127.0.0.1:27017/';

var _db; 

module.exports = { 
    connectToServer: async function ( database, callback ){
        await MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client){
            _db = client.db(database);
            return callback;
        })
    }, 
    
    getDb: function(){
        return _db;
    }
};