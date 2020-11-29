var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var mongo = require('mongodb'),
    assert = require('assert');
var mongoUtil = require('./MongoConnection.js');
const fetch = require("node-fetch");
var cron = require('node-cron');


var manually_end_discourses = async (to_end) => {    
    var client = await mongoUtil.returnConnectionPromise("discourseListDatabase");
    var dbo = client.db("discourseListDatabase");
    
    var end_time = new Date();
    
    var query = { UDI: { $in: to_end } };
    var update = { $set: {end_datetime: end_time } };
    dbo.collection("discourseList").updateMany(query, update, function(err, result){
        if(err) throw err;
        console.log("Ended the following discourses: " + to_end.toString());
    });
}
//manually_end_discourses(['here-is-a-discourse-with-quite-a-long-title-well-have-to-see-how-it-looks']);

var change_UTCDateStrings_to_date_objects = async() => {
    var client = await mongoUtil.returnConnectionPromise("discourseListDatabase");
    var dbo = client.db("discourseListDatabase");
    
    var cursor = dbo.collection("discourseList").find();
    
//    cursor.count().then(function(numItems){
//        console.log(numItems);
//    });

    cursor.each(function(err,item){
        if(item != null){
            var start_datetime = item['start_datetime'];
            var end_datetime = item['end_datetime'];
            var discourse_RID = item['RID'];
            
            if(typeof start_datetime == "string"){
                var start_datetime_dateObject = new Date(start_datetime);
                var query = {RID: discourse_RID};
                var updates = {$set: {start_datetime: start_datetime_dateObject}};
                
                dbo.collection("discourseList").updateOne(query, updates, function(err, res){
                    if (err) throw err;
                    console.log('updated 1 start_datetime'); 
                })
            }
            if(typeof end_datetime == "string"){
                var end_datetime_dateObject = new Date(end_datetime);
                var query = {RID: discourse_RID};
                var updates = {$set: {end_datetime: end_datetime_dateObject}};
                
                dbo.collection("discourseList").updateOne(query, updates, function(err, res){
                    if (err) throw err;
                    console.log('updated 1 end_datetime'); 
                })
            }
        }else{
            assert.equal(null, err);
            console.log('search concluded. quit.')
        }
    });
}
//change_UTCDateStrings_to_date_objects();