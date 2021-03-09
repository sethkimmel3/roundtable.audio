/**
Hawk.js
Monitoring Active Discourses on a Regular cadence 
**/

var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');
var cron = require('node-cron');

mongoUtil.connectToServer("discourseListDatabase", function(err, client){
    if (err) console.log(err);
});

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

cron.schedule('0,30 * * * * *', () =>{
    try { 
        var dbo = mongoUtil.getDb();
        
        var one_week_ago = new Date();
        one_week_ago.setDate(one_week_ago.getDate() - 7);
        var one_day_ago = new Date();
        one_day_ago.setDate(one_day_ago.getDate() - 1);
        
        var one_week_query = {
            start_datetime: {
                $gte: one_week_ago
            }
        };
        
        var one_day_query = {
            start_datetime: {
                $gte: one_day_ago
            }
        };
        
        var ongoing_query = {
            end_datetime: {
                $eq: null
            }
        };
        
        dbo.collection("discourseList").find(one_week_query).count().then(function(numItems){
         console.log('Discourses started in the last week: ' + numItems.toString());    
        });
        
        dbo.collection("discourseList").find(one_day_query).count().then(function(numItems){
         console.log('Discourses started in the last day: ' + numItems.toString()); 
         if(numItems > 0){
                var cursor = dbo.collection("discourseList").find(one_day_query);
                console.log('Discourses Started in Last Day: ');
                cursor.each(function(err,item){
                    if(item != null){
                        console.log('\t Discourse Name: ' + item['name']);
                        console.log('\t \t Description: ' + item['description']);
                        console.log('\t \t Tags: ' + item['tags']);
                        console.log('\t \t Max No. of Participants: ' + item['max_participants']);
                        console.log('\t \t Max No. of Listeners: ' + item['max_listeners']);
                    }
                });
            }
        });
        
        
        dbo.collection("discourseList").find(ongoing_query).count().then(function(numItems){
            console.log('Discourses ongoing now: ' + numItems.toString()); 
            if(numItems > 0){
                var cursor = dbo.collection("discourseList").find(ongoing_query);
                console.log('Active Discourses: ');
                cursor.each(function(err,item){
                    if(item != null){
                        console.log('\t' + item['name']);
                        console.log('\t \t Participants: ' + item['current_participants']);
                        console.log('\t \t Listeners: ' + item['current_listeners']);
                    }
                });
            }
        });
        
        console.log('\n');
    } catch(error){
        console.log(error);
    }
});