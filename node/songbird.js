/**
songbird.js
Utilizing Twitter's API for marketing purposes
**/

var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');
var DBUtils = require('./DBUtils.js');
var cron = require('node-cron');
var Twit = require('twit')

mongoUtil.connectToServer("discourseListDatabase", function(err, client){
    if (err) console.log(err);
});

 
var T = new Twit({
  consumer_key:         'RwXnCUM4ZrDm9zeMtaXFpYOfb',
  consumer_secret:      '5P9E8UTXeerWDhZm7D9z4bkgVtoU43vBFXdkt3mV7bEJGHTFpl',
  access_token:         '1323445323101052935-frMgvus9pwALWfywtLrVIqhKLr0ojB',
  access_token_secret:  'osKy4OgOQAFhRPnt32Xi4N1d9eqtjxSvXUe8RjJz90KiU',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
})
 
var post_tweet = (name, description, tags, public_join, public_listen, UDI) => {
    try{
        
        var tags_string = '';
        for(var i = 0; i < tags.length; i++){
            tags_string += '#' + tags[i].replace(/\s/g,'');
            if(i != tags.length - 1){
                tags_string += ' '; 
            }
        }
        
        if(public_join){
            var join_emoji = "✅";
        }else{
            var join_emoji = "❌";
        }
        
        if(public_listen){
            var listen_emoji = "✅";
        }else{
            var listen_emoji = "❌";
        }
        
        var public_availability_string = 'Public Join: ' + join_emoji + ' | Public Listen: ' + listen_emoji + '\n';
        
        var status = 'DISCOURSE BOT 🤖: \n';
        status += 'Name: ' + name + '\n';
        // (280 - 18 - UDI.length will ensure there are enough chars remaining for link)
        if((status.length + (13 + description.length) < (280 - 18 - UDI.length))){
            status += 'Description: ' + description + '\n';
        }
        if((status.length + tags_string.length) < (280 - 18 - UDI.length)){
            status += tags_string + '\n';
        }
        if((status.length + public_availability_string.length) < (280 - 18 - UDI.length)){
            status += public_availability_string;
        }
        status += 'discourse.fm/live/' + UDI;
        
        T.post('statuses/update', { status: status }, function(err, data, response){
          return data['id'];
        });
    
    } catch(error){
        console.log(error);
        return "error";
    }
        
}

cron.schedule('0,30 * * * * *', () =>{
    try { 
        var dbo = mongoUtil.getDb();
        
        var ongoing_public_query = {
            end_datetime: {
                $eq: null
            },
            public_listen: {
                $eq: true
            }
        };
        
        var cursor = dbo.collection("discourseList").find(ongoing_public_query);
        cursor.each(function(err,item){
            if(item != null){
                
                // find if tweet already made
                var _id = item['_id'];
                var tweet_exists_query = {
                    discourse_id: {
                        $eq: _id
                    }
                }
                
                dbo.collection("discourseTweets").find(tweet_exists_query).count().then(function(numItems){
                    if(numItems == 0){
                        // tweet it
                        var name = item['name'];
                        var description = item['description'];
                        var tags = item['tags'];
                        var public_join = item['public_join'];
                        var public_listen = item['public_listen'];
                        var UDI = item['UDI'];
                        
                        var tweet_id = post_tweet(name, description, tags, public_join, public_listen, UDI);
                        
                        if(tweet_id != 'error'){
                            //insert into discourseTweets collection 
                            var to_insert = {
                                'discourse_id': _id,
                                'tweet_id': tweet_id
                            }
                            dbo.collection("discourseTweets").insertOne(to_insert, function(e, res){
                                if(e) throw e;
                                console.log('new tweet posted');
                            });
                        }  
                    }
                });
                
                
            }
        });
        
        console.log('\n');
    } catch(error){
        console.log(error);
    }
});

function newMention(tweet){
    try{
        
        console.log("new mentioned detected.");
        
        if(tweet.truncated == true){
            var tweettxt = tweet.extended_tweet.full_text;
        }else{
            var tweettxt = tweet.text;   
        }
        
        if(tweettxt.includes('start a discourse')){

            var sender_name = tweet.user.screen_name;
            var tweet_id = tweet.id_str;
            
            var original_tweet_in_reply_to = tweet.in_reply_to_status_id_str;
            var in_reply_to_screen_name = tweet.in_reply_to_screen_name;
            
            if(original_tweet_in_reply_to == null){
                var reply_to = tweet_id;
                var tweet_link = 'twitter.com/' + sender_name + '/status/' + tweet_id;
            }else{
                var reply_to = original_tweet_in_reply_to;
                var tweet_link = 'twitter.com/' + sender_name + '/status/' + original_tweet_in_reply_to;
            }
            
            var discourse_info_array = {
                                           "discourse-name": 'A Freshly Whipped up Discourse for @' + sender_name,
                                           "discourse-description": "In response to: " + tweet_link, 
                                           "discourse-tags": ['autogenerated', 'from', 'tweet'],
                                           "join-visibility": 'public',
                                           "listen-visibility": 'public',
                                           "discourse_JID": null,
                                           "discourse_LID": null,
                                           "max-allowed-participants": 100
                                        }

            DBUtils.callCreateNewDiscoursePromise(discourse_info_array).then(function(res){
//                console.log(res); 
                if("UDI" in res){
                    //successly created  
                    var UDI = res["UDI"];
                    var reply_link = 'discourse.fm/live/' + UDI;
                    
                    if(in_reply_to_screen_name == null){
                        var reply = "DISCOURSE BOT 🤖: Here is a freshly created discourse @" + sender_name + ". \n\n" + reply_link + "\n\n Anyone is welcome to join!";
                    }else{
                        var reply = "DISCOURSE BOT 🤖: Here is a freshly created discourse by @" + sender_name + " autogenerated from their reply to you @" + in_reply_to_screen_name + ". \n\n" + reply_link + "\n\n Jump right in!";
                    }
                    
                    var params = {
                        status: reply,
                        in_reply_to_status_id: reply_to
                    };

                    T.post('statuses/update', params, function(err, data, response){
                       if (err !== undefined) {
                          console.log(err);
                       } else {
                          console.log('success');
                       } 
                    });
                }else{
                    console.log("Error in creating discourse: " + res);
                }
            })
        }
    }
    catch (error){
        console.log(error);
    }
}

var stream = T.stream('statuses/filter', { track: ['@DiscourseFm'] });
stream.on('tweet', newMention);