var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var mongo = require('mongodb');
var mongoUtil = require('../MongoConnection.js');
const fetch = require("node-fetch");
var cron = require('node-cron');

//connect to roundtableListDatabase on Startup



var manually_end_roundtables = async (to_end) => {
    var client = await mongoUtil.returnConnectionPromise("roundtableListDatabase");
    var dbo = client.db("roundtableListDatabase");

    var datetime = new Date();
    var end_time = datetime.toUTCString();

    var query = { UDI: { $in: to_end } };
    var update = { $set: {end_datetime: end_time } };
    dbo.collection("roundtableList").updateMany(query, update, function(err, result){
        if(err) throw err;
        console.log("Ended the following roundtables: " + to_end.toString());
    });
}

manually_end_roundtables(['here-is-a-roundtable-with-quite-a-long-title-well-have-to-see-how-it-looks']);
