var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');
var krakenAPI = require('./krakenAPIModule.js');
var DBUtils = require('./DBUtils.js');
const fetch = require("node-fetch");
var cron = require('node-cron');

//connect to roundtableListDatabase on Startup
mongoUtil.connectToServer("roundtableListDatabase", function(err, client){
    if (err) console.log(err);
});


io.on('connection', (socket) => {
    console.log('a user connected with socket id: ' + socket.id);
    var auth_creds = {};
    var connection_state = null;
    var user_id;

    socket.on('disconnecting', (reason) => {
        if(Object.keys(auth_creds).length > 0){
            for(var UDI in auth_creds) break;
            if(connection_state == 'participant'){
                var update_data = {
                    'type': 'subtract_participant'
                }
                DBUtils.updateParticipantsAndListenersCount(UDI, connection_state, 'subtract');
                DBUtils.updateCurrentParticipantsArray(UDI, user_id, '', 'remove');
                io.sockets.in(auth_creds[UDI]['RID']).emit('updateRoundtableCount', update_data);
                var remove_seat_data = {
                    'user_id': user_id
                }
                io.sockets.in(auth_creds[UDI]['RID']).emit('removeSeat', remove_seat_data);
            }else if(connection_state == 'listener'){
                var update_data = {
                    'type': 'subtract_listener'
                }
                DBUtils.updateParticipantsAndListenersCount(UDI, connection_state, 'subtract');
                io.sockets.in(auth_creds[UDI]['RID']).emit('updateRoundtableCount', update_data);
            }
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('user disconnected due to: ' + reason);
    });

    socket.on('reinstate_participant', function(reinstate_participant_data, handler){
        try{
            var user_UDI = reinstate_participant_data['UDI'];
            var user_id = reinstate_participant_data['user_id'];
	    var user_JID = reinstate_participant_data['JID'];
	    var user_LID = reinstate_participant_data['LID'];
	    var user_JID_secret = reinstate_participant_data['user_JID_secret'];
	    var user_LID_secret = reinstate_participant_data['user_LID_secret'];

            // do a mini-auth to make sure they're actually supposed to be allowed in
            DBUtils.callfindRoundtableByUDIPromise('', user_UDI).then(function(res){
               var to_return;
               if(res != null && res != "ERROR! More than one roundtable with this UDI!"){
                   var join_auth;
                   var listen_auth;

                   if(res[0]['JID'] == null){
                       join_auth = true;
                   }else if(res[0]['JID'] != null && user_JID == res[0]['JID'] && user_JID_secret == res[0]['JID_secret']){
                       join_auth = true;
                   }else if(res[0]['JID'] != null && (user_JID != res[0]['JID'] || user_JID_secret != res[0]['JID_secret'])){
                       join_auth = false;
                   }

                   if(res['LID'] == null){
                       listen_auth = true;
                   }else if(res[0]['LID'] != null && user_LID == res[0]['LID'] && user_LID_secret == res[0]['LID_secret']){
                       listen_auth = true;
                   }else if(res[0]['LID'] != null && (user_LID != res[0]['LID'] || user_LID_secret != res[0]['LID_secret'])){
                       listen_auth = false;
                   }

                   auth_creds[user_UDI] = {
                       'RID': RID,
                       'join_auth': join_auth,
                       'listen_auth': listen_auth
                   }

                   var RID = res[0]['RID'];

                   if(join_auth == true){
                       connection_state = 'participant';
                       socket.join(RID);

                       var reinstate_participant_data = {
                           "user_id": user_id
                       }
                       io.sockets.in(RID).emit('reinstate_participant_client', user_id);
                       handler(null, 'success');
                   }
               }
            });
        } catch (error){
            handler(error, null);
            console.log(error);
        }
    });

    socket.on('create_roundtable', function(roundtable_data, handler){
        DBUtils.callCreateNewRoundtablePromise(roundtable_data).then(function(res){
            // console.log(res);
            if("UDI" in res){
                handler(null, res);
            }else{
                handler(res, null);
            }
        })
    });

    socket.on('get_auth_creds_from_jid', function(auth_jid, handler){
       try{
           DBUtils.callfindRoundtableByJIDPromise(auth_jid).then(function(res){
               if(res != null && res != "ERROR! More than one roundtable with this JID!"){
                   //console.log(res[0]);
                   var return_data = {
                       "UDI": res[0]['UDI'],
                       "JID": res[0]['JID'],
                       "JID_secret": res[0]['JID_secret'],
                       "LID": res[0]['LID'],
                       "LID_secret": res[0]['LID_secret']
                   }
                   handler(null, return_data);
               }else{
                   //console.log(res);
                   handler(null, res);
               }
           });
       } catch(error) {
           handler(error, null);
       }
    });

    socket.on('get_auth_creds_from_lid', function(auth_lid, handler){
       try{
           DBUtils.callfindRoundtableByLIDPromise(auth_lid).then(function(res){
               if(res != null && res != "ERROR! More than one roundtable with this LID!"){
                   //console.log(res[0]);
                   var return_data = {
                       "UDI": res[0]['UDI'],
                       "LID": res[0]['LID'],
                       "LID_secret": res[0]['LID_secret']
                   }
                   handler(null, return_data);
               }else{
                   //console.log(res);
                   handler(null, res);
               }
           });
       } catch(error) {
           handler(error, null);
       }
    });

    socket.on('auth_into_roundtable', function(auth_data, handler){

        try{
            console.log('Auth attempt.');
            var user_UDI = auth_data['UDI'];
            var user_JID = auth_data['JID'];
            var user_LID = auth_data['LID'];
            var user_JID_secret = auth_data['JID_secret'];
            var user_LID_secret = auth_data['LID_secret'];

            DBUtils.callfindRoundtableByUDIPromise('', user_UDI).then(function(res){
               var to_return;
               if(res != null && res != "ERROR! More than one roundtable with this UDI!"){
                   var join_auth;
                   var listen_auth;

                   if(res[0]['JID'] == null){
                       join_auth = true;
                   }else if(res[0]['JID'] != null && user_JID == res[0]['JID'] && user_JID_secret == res[0]['JID_secret']){
                       join_auth = true;
                   }else if(res[0]['JID'] != null && (user_JID != res[0]['JID'] || user_JID_secret != res[0]['JID_secret'])){
                       join_auth = false;
                   }

                   if(res['LID'] == null){
                       listen_auth = true;
                   }else if(res[0]['LID'] != null && user_LID == res[0]['LID'] && user_LID_secret == res[0]['LID_secret']){
                       listen_auth = true;
                   }else if(res[0]['LID'] != null && (user_LID != res[0]['LID'] || user_LID_secret != res[0]['LID_secret'])){
                       listen_auth = false;
                   }

                   var RID = res[0]['RID'];

                   auth_creds[user_UDI] = {
                       'RID': RID,
                       'join_auth': join_auth,
                       'listen_auth': listen_auth
                   }

                   to_return = {
                       "name": res[0]['name'],
                       "description": res[0]['description'],
                       "tags": res[0]['tags'],
                       "join_auth": join_auth,
                       "listen_auth": listen_auth,
                       "public_join": res[0]['public_join'],
                       "public_listen": res[0]['public_listen'],
                       "start_datetime": res[0]['start_datetime'],
                       "end_datetime": res[0]['end_datetime'],
                       "current_participants": res[0]['current_participants'],
                       "current_listeners": res[0]['current_listeners'],
                       "max_allowed_participants": res[0]['max_allowed_participants'],
                       "community": res[0]['community']
                   }
               }else{
                   //console.log(res);
                   to_return = null;
               }
               handler(null, to_return);
            });

        } catch(error){
            handler(error, null);
        }
    });

    socket.on('connectToRoundtable', function(connection_data, handler){
        try {
            var UDI = connection_data["UDI"];
            user_id = connection_data["user_id"];
            var nickname = connection_data["nickname"];
            var connection_type = connection_data["connection_type"];
            if(connection_type == 'join' && auth_creds[UDI]['join_auth'] == false){
                handler(null, 'not authorized');
            }else if(connection_type == 'listen' && auth_creds[UDI]['listen_auth'] == false){
                handler(null, 'not authorized');
            }else if((connection_type == 'join' && auth_creds[UDI]['join_auth'] == true ) || (connection_type == 'listen' && auth_creds[UDI]['join_auth'] == true )){
                DBUtils.callfindRoundtableByUDIPromise('', UDI).then(function(res){
                    if(connection_state == null){
                       if(res != null && res != "ERROR! More than one roundtable with this UDI!" && (res[0]['current_participants'] < res[0]['max_allowed_participants'])){
                           socket.join(res[0]['RID']);
                           if(connection_type == 'join'){
                               connection_state = 'participant';
                           }else{
                               connection_state = 'listener';
                           }
                           DBUtils.updateParticipantsAndListenersCount(UDI, connection_state, 'add');
                           if(connection_state == 'participant'){
                               DBUtils.updateCurrentParticipantsArray(UDI, user_id, nickname, 'add');
                           }
                           if(connection_type == 'join'){
                               var current_listeners = res[0]['current_listeners'];
                               var current_participants = res[0]['current_participants'] + 1;
                           }else{
                               var current_listeners = res[0]['current_listeners'] + 1;
                               var current_participants = res[0]['current_participants'];
                           }
                           var count_data = {
                               'type': 'values',
                               'current_listeners': current_listeners,
                               'current_participants': current_participants
                           }
                           io.sockets.in(res[0]['RID']).emit('updateRoundtableCount', count_data);
                           handler(null, count_data);
                       }
                       else if(res[0]['current_participants'] >= res[0]['max_allowed_participants']){
                           handler('room is full', null);
                       }
                    }else if(connection_type == 'join' && connection_state == 'listener'){
                        if(res != null && res != "ERROR! More than one roundtable with this UDI!" && (res[0]['current_participants'] < res[0]['max_allowed_participants'])){

                            connection_state = 'participant';

                            //update the counts
                            var current_listeners = res[0]['current_listeners'] - 1;
                            var current_participants = res[0]['current_participants'] + 1;
                            var count_data = {
                                'type': 'values',
                                'current_listeners': current_listeners,
                                'current_participants': current_participants
                            }
                            io.sockets.in(res[0]['RID']).emit('updateRoundtableCount', count_data);
                            handler(null, count_data);

                            DBUtils.updateParticipantsAndListenersCount(UDI, 'listener', 'subtract');
                            DBUtils.updateParticipantsAndListenersCount(UDI, 'participant', 'add');
                            DBUtils.updateCurrentParticipantsArray(UDI, user_id, nickname, 'add');
                        }
                        else if(res[0]['current_participants'] >= res[0]['max_allowed_participants']){
                           handler('room is full', null);
                        }
                    }else if(connection_type == 'listen' && connection_state == 'participant'){
                        if(res != null && res != "ERROR! More than one roundtable with this UDI!"){

                            connection_state = 'listener';

                            var current_listeners = res[0]['current_listeners'] + 1;
                            var current_participants = res[0]['current_participants'] - 1;
                            var count_data = {
                                'type': 'values',
                                'current_listeners': current_listeners,
                                'current_participants': current_participants
                            }
                            io.sockets.in(res[0]['RID']).emit('updateRoundtableCount', count_data);
                            var remove_seat_data = {
                                'user_id': user_id
                            }
                            io.sockets.in(auth_creds[UDI]['RID']).emit('removeSeat', remove_seat_data);
                            handler(null, count_data);

                            DBUtils.updateParticipantsAndListenersCount(UDI, 'participant', 'subtract');
                            DBUtils.updateParticipantsAndListenersCount(UDI, 'listener', 'add');
                            DBUtils.updateCurrentParticipantsArray(UDI, user_id, '', 'remove');
                        }
                    }else{
                        handler('nothing to do', null);
                    }
                });
            } else{
                handler('auth failure', null);
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('clientMessage', function(message_data, handler){
        try{
            if(Object.keys(auth_creds).length > 0){
                for(var UDI in auth_creds) break;
                io.sockets.in(auth_creds[UDI]['RID']).emit('serverMessage', message_data);
                handler(null, 'success');
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('turn', function(turn_data, handler){
       try{
           var unameRPC = turn_data['unameRPC'];
           var res = krakenAPI.turn(unameRPC).then(function(result){
                handler(null, result);
           });
       } catch(error){
           handler(error, null);
       }
    });

    socket.on('trickle', function(trickle_data, handler){
        try {
            var UDI = trickle_data['UDI'];
            if(auth_creds[UDI]['join_auth'] == true || auth_creds[UDI]['listen_auth'] == true){
                var rnameRPC = encodeURIComponent(auth_creds[UDI]['RID']);
                var unameRPC = trickle_data['unameRPC'];
                var ucid = trickle_data['ucid'];
                var candidate = trickle_data['candidate'];

                krakenAPI.trickle(rnameRPC, unameRPC, ucid, JSON.stringify(candidate));
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('publish', function(publish_data, handler){
	 try {
            var UDI = publish_data['UDI'];
            if(auth_creds[UDI]['join_auth'] == true && auth_creds[UDI]['listen_auth'] == true){
                var rnameRPC = encodeURIComponent(auth_creds[UDI]['RID']);
                var unameRPC = publish_data['unameRPC'];
                var localDescription = publish_data['localDescription'];

                krakenAPI.publish(rnameRPC, unameRPC, localDescription).then(function(result){
                    // console.log(result);
                    handler('null', result);
                });
            }else{
                handler('null', 'join not permitted');
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('subscribe', function(subscribe_data, handler){
        try {
            var UDI = subscribe_data['UDI'];
            if(auth_creds[UDI]['listen_auth'] == true){
                var rnameRPC = encodeURIComponent(auth_creds[UDI]['RID']);
                var unameRPC = subscribe_data['unameRPC'];
                var ucid = subscribe_data['ucid'];

                krakenAPI.subscribe(rnameRPC, unameRPC, ucid).then(function(result){
                    //console.log(result);
                    handler('null', result);
                });
            }else{
                handler('null', 'listen not permitted');
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('answer', function(answer_data, handler){
        try {
            var UDI = answer_data['UDI'];
            if(auth_creds[UDI]['listen_auth'] == true){
                var rnameRPC = encodeURIComponent(auth_creds[UDI]['RID']);
                var unameRPC = answer_data['unameRPC'];
                var ucid = answer_data['ucid'];
                var sdp = answer_data['sdp'];

                krakenAPI.answer(rnameRPC, unameRPC, ucid, sdp);
            }else{
                handler('null', 'listen not permitted');
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('registerListenOnlyPeer', function(register_listen_only_peer_data, handler){
        try {
            var UDI = register_listen_only_peer_data['UDI'];
            if(auth_creds[UDI]['listen_auth'] == true){
                var rnameRPC = encodeURIComponent(auth_creds[UDI]['RID']);
                var unameRPC = register_listen_only_peer_data['unameRPC'];
                var localDescription = register_listen_only_peer_data['localDescription'];

                krakenAPI.registerListenOnlyPeer(rnameRPC, unameRPC, localDescription).then(function(result){
                    //console.log(result);
                    handler('null', result);
                });
            }else{
                handler('null', 'listen only not permitted');
            }
        } catch(error){
            handler(error, null);
        }
    });

    socket.on('getActiveRoundtables', function(data, handler){
        try {
            var dbo = mongoUtil.getDb();
            var query = { end_datetime: null, public_listen:true };
            var exclude = {JID:0, JID_secret:0, LID:0, LID_secret:0, RID:0, max_participants:0, max_listeners:0, _id:0};
            dbo.collection("roundtableList").find(query).project(exclude).toArray(function(e, res){
                handler(null, res);
            })
        } catch(err){
            handler(err, null);
        }
    });

    //FOR HACKERNEWS PURPOSES
    socket.on('createCommunityRoundtableIfNotExist', function(story_data, handler){
        //this will check if a roundtable exists for a given name and create one if not
        try{
            var story_name = story_data['story_name'];
            var story_url = story_data['story_url'];
            var story_id = story_data['story_id'];
            var community = story_data['community'];
            var roundtable_UDI = DBUtils.createRoundtableUDIFromName(story_name);
            DBUtils.callfindRoundtableByUDIPromise('hackernews', roundtable_UDI).then(function(res){
                if(res == null){
                    // create a new roundtable
                    var roundtable_info_array = {
                       "roundtable-name": story_name,
                       "roundtable-description": story_url,
                       "roundtable-tags": ['YC', 'hackernews'],
                       "community": "hackernews",
                       "join-visibility": 'public',
                       "listen-visibility": 'public',
                       "roundtable_JID": null,
                       "roundtable_LID": null,
                       "max-allowed-participants": 15,
                       "metadata": {"story_id": story_id}
                    }

                   DBUtils.callCreateNewRoundtablePromise(roundtable_info_array).then(function(res){
                        if("UDI" in res){
                            handler(null, res["UDI"]);
                        }else{
                            handler(res, null);
                        }
                    })
                }
                else{
                    handler(null, res[0]["UDI"]);
                }
            })
        } catch(err){
            console.log(err);
            handler(err, null);
        }
    })

    socket.on('getStoriesParticipantsAndListeners', function(story_data, handler){
        // get the current number of listeners and participants for the stories
        try{
            var stories = story_data['stories'];
            var community = story_data['community']
            var story_UDIs = [];
            for(var i = 0; i < stories.length; i++){
                if(stories[i] != null){
                    story_UDIs[i] = DBUtils.createRoundtableUDIFromName(stories[i].title);
                }
            }
            var dbo = mongoUtil.getDb();
            var query = { UDI: {$in: story_UDIs}, community: community, end_datetime: null};
            var story_counts = [];

            dbo.collection("roundtableList").find(query).toArray(function(e, res){
                for(var i = 0; i < story_UDIs.length; i++){
                    var found = false;
                    for(var j = 0; j < res.length; j++){
                        if(story_UDIs[i] == res[j]["UDI"]){
                            found = true;
                            if(res[j]['current_participants'] > 0){
                                var nicknames = [];
                                if("current_participants_array" in res[j] && res[j]['current_participants_array'] != null){
                                    for (var k = 0; k < res[j]['current_participants_array'].length; k++){
                                        nicknames.push(res[j]['current_participants_array'][k][1]);
                                    }
                                }
                            }else{
                                var nicknames = null;
                            }
                            story_counts[i] = {
                                "started": true,
                                "participants": res[j]['current_participants'],
                                "listeners": res[j]['current_listeners'],
                                "nicknames": nicknames
                            }
                        }
                    }
                    if(found == false){
                        story_counts[i] = {
                                "started": false,
                                "participants": 0,
                                "listeners": 0,
                                "nicknames": null
                        }
                    }

                    if(story_counts.length == stories.length){
                        handler(null, story_counts);
                    }
                }
            });
        } catch(err){
            console.log(err);
            handler(err, null);
        }
    })

    socket.on('getMostActiveStories', function(info, handler){
        try{
            var community = info['community'];
            var dbo = mongoUtil.getDb();
            var query = {community: community, end_datetime: null};
            var story_ids = [];
            dbo.collection("roundtableList").find(query).sort( {current_participants: -1} ).toArray(function(e, res){
                for(var i = 0; i < res.length; i++){
                    if("metadata" in res[i]){
                        story_ids[i] = res[i]['metadata']['story_id'];
                    }
                }
                handler(null, story_ids);
            })
        } catch (err){
            console.log(err);
            handler(err, null);
        }
    })

});

// every six hours this will end roundtables that either have no active participants and have been active for more than 3 hours, or have been active for more than 24 hours (in case of a bug in tracking number of participants)
cron.schedule('* * 0,6,12,18 * * *', () =>{
    try {
        var dbo = mongoUtil.getDb();
        var query = { end_datetime: null };
        var to_end = [];
        dbo.collection("roundtableList").find(query).toArray(function(e, res){
            if(e) throw e;
            var now = Date.now();
            for(var i = 0; i < res.length; i++){
                var UDI = res[i]['UDI'];
                var start_datetime = Date.parse(res[i]['start_datetime']);
                var days_elapsed = (now - start_datetime)/86400000;
                var current_participants = res[i]['current_participants'];
                if((current_participants == 0 && days_elapsed >= 0.125) || days_elapsed >= 1.0){
                    to_end.push(UDI);
                }
            }

            var end_time = new Date();
            if(to_end.length > 0){
                var query = { UDI: { $in: to_end } };
                var update = { $set: {end_datetime: end_time } };
                dbo.collection("roundtableList").updateMany(query, update, function(err, result){
                    if(err) throw err;
                      console.log("Automatically ended the following roundtables: " + to_end.toString())
                    });
              }
          });
      } catch(error){
          console.log(error);
      }
});

port = 3000;
//hostname = 'localhost';
hostname = "0.0.0.0";

http.listen(port, hostname, () => {
    console.log('listening on *:3000');
});
