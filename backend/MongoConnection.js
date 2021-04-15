const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://db:27017/';
//const url = 'mongodb://127.0.0.1:27017/';

var _db;

module.exports = {
    connectToServer: async function ( database ){
        // url += database;
        await MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client){
            	if(err) console.log(err);
		_db = client.db(database);
		console.log("Mongo connected");
        })
    },

    returnConnectionPromise: async function (database){
        return await MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true})
    },

    getDb: function(){
        return _db;
    }
};
