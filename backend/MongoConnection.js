const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://127.0.0.1:27017/';

var _db; 

module.exports = { 
    connectToServer: async function ( database ){
        await MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client){
            _db = client.db(database);
        })
    }, 
    
    returnConnectionPromise: async function (database){
        return await MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true})
    },
    
    getDb: function(){
        return _db;
    }
};