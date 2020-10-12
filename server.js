var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');
var krakenAPI = require('./krakenAPIModule.js')
const fetch = require("node-fetch");

//connect to discourseListDatabase on Startup
mongoUtil.connectToServer("discourseListDatabase", function(err, client){
    if (err) console.log(err);
});

//app.get('/', (req, res) => {
//    res.sendFile(__dirname + '/index.html');
//});

// create unique identifier 
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

function createSecretId(len){
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_';
    var charsLength = characters.length;
    for (var i = 0; i < len; i++ ){
        result += characters.charAt(Math.floor(Math.random() * charsLength));
    }
    return result; 
}

var uniqueUDIPromise = (discourse_UDI) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
                    UDI: {$regex: new RegExp(discourse_UDI, 'i')}, 
                    end_datetime: {$eq: null}
                    };

        dbo.collection("discourseList").find(query).toArray(function(e, res){                
            if(e) throw e;
            var maxInteger = 0; 
            for(var i = 0; i < res.length; i++){
                if(discourse_UDI == res[i]["UDI"]){
                    maxInteger = 1;
                }else{
                    var splitList = res[i]["UDI"].split('-');
                    var thisInt = parseInt(splitList[splitList.length - 1]);
                    if(thisInt >= maxInteger){
                        maxInteger = thisInt + 1;
                    }
                }
                }
                if(maxInteger > 0){
                   discourse_UDI += '-' + String(maxInteger);
                }
                resolve(discourse_UDI);
            })
    })
)

var callUniqueUDIPromise = async (discourse_UDI) => {
    var result = await (uniqueUDIPromise(discourse_UDI));
    return result;
}

var insertRecordPromise = (discourse_data) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        dbo.collection("discourseList").insertOne(discourse_data, function(e, res){
            if(e) throw e;
            resolve('success');
        })
    })
)

var callInsertRecordPromise = async (discourse_data) => {
    var result = await (insertRecordPromise(discourse_data));
    return result;
}

var findDiscourseByUDIPromise = (discourse_UDI) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
            UDI: discourse_UDI
        }
        dbo.collection("discourseList").find(query).toArray(function(e, res){ 
            if(e) throw e;
            if(res.length == 0){
                resolve(null);
            }else if(res.length == 1){
                resolve(res);
            }else{
                resolve("ERROR! More than one discourse with this UDI!")
            }
        })
    })
)

var callfindDiscourseByUDIPromise = async (discourse_UDI) => {
    var result = await (findDiscourseByUDIPromise(discourse_UDI));
    return result; 
}

var findDiscourseByJIDPromise = (discourse_JID) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
            JID: discourse_JID
        }
        dbo.collection("discourseList").find(query).toArray(function(e, res){ 
            if(e) throw e;
            if(res.length == 0){
                resolve(null);
            }else if(res.length == 1){
                resolve(res);
            }else{
                resolve("ERROR! More than one discourse with this JID!")
            }
        })
    })
)

var callfindDiscourseByJIDPromise = async (discourse_JID) => {
    var result = await (findDiscourseByJIDPromise(discourse_JID));
    return result; 
}

var findDiscourseByLIDPromise = (discourse_LID) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
            LID: discourse_LID
        }
        dbo.collection("discourseList").find(query).toArray(function(e, res){ 
            if(e) throw e;
            if(res.length == 0){
                resolve(null);
            }else if(res.length == 1){
                resolve(res);
            }else{
                resolve("ERROR! More than one discourse with this LID!")
            }
        })
    })
)

var callfindDiscourseByLIDPromise = async (discourse_LID) => {
    var result = await (findDiscourseByLIDPromise(discourse_LID));
    return result; 
}

var updateParticipantsAndListenersCount = (UDI, type, operation) => {
        callfindDiscourseByUDIPromise(UDI).then(function(res){
            var dbo = mongoUtil.getDb();
            var query = { UDI: UDI }
            if(type == 'participant'){
                var current_participants = res[0]['current_participants'];
                var max_participants = res[0]['max_participants'];
                if(operation == 'add'){
                    current_participants += 1;
                }else if(operation == 'subtract'){
                    current_participants -= 1;
                }
                if(current_participants > max_participants){
                    max_participants = current_participants;
                }
                var update = { $set: { current_participants: current_participants, max_participants: max_participants } };
            }else{
                var current_listeners = res[0]['current_listeners'];
                var max_listeners = res[0]['max_listeners'];
                if(operation == 'add'){
                    current_listeners += 1;
                }else if(operation == 'subtract'){
                    current_listeners -= 1;
                }
                if(current_listeners > max_listeners){
                    max_listeners = current_listeners;
                }
                var update = { $set: { current_listeners: current_listeners, max_listeners: max_listeners } };
            }
            dbo.collection("discourseList").updateOne(query, update, function(e, res){
                if(e) throw e;
                console.log('1 record updated');
            })
        })
}

io.on('connection', (socket) => {
    console.log('a user connected with socket id: ' + socket.id);
    var auth_creds = {};
    var connection_state = null;
//    var dbo = mongoUtil.getDb();
//    dbo.collection( 'discourseList').find({}).toArray(function(err,res){
//        if(err) throw err;
//        console.log(res);
//    });
    
     socket.on('disconnecting', () => {
        if(Object.keys(auth_creds).length > 0){
            for(var UDI in auth_creds) break;
            if(connection_state == 'participant'){
                var update_data = {
                    'type': 'subtract_participant'
                }
                updateParticipantsAndListenersCount(UDI, connection_state, 'subtract');
                io.sockets.in(auth_creds[UDI]['RID']).emit('updateDiscourseCount', update_data);
            }else if(connection_state == 'listener'){
                var update_data = {
                    'type': 'subtract_listener'
                }
                updateParticipantsAndListenersCount(UDI, connection_state, 'subtract');
                io.sockets.in(auth_creds[UDI]['RID']).emit('updateDiscourseCount', update_data);
            }
        } 
    });
    
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
    socket.on('create_discourse', function(discourse_data, handler){
        try{
            var discourse_name = discourse_data['discourse-name'];
            var discourse_description = discourse_data['discourse-description'];
            var discourse_tags = discourse_data['discourse-tags'];
            var join_visibility = discourse_data['join-visibility'];
            var listen_visibility = discourse_data['listen-visibility'];
            var discourse_JID = discourse_data['discourse_JID'];
            var discourse_LID = discourse_data['discourse_LID'];

            var discourse_RID = uuidv4();
            var discourse_UDI = discourse_name.replace(/[^\w\s]/gi, '').trim().replace(/ /g, '-').toLowerCase(); 

            // ensure that the promise for finding unique UDI resolved before attempting to insert data
            callUniqueUDIPromise(discourse_UDI).then(function(result){
                discourse_UDI = result;

                if(join_visibility === 'private'){
                    var discourse_JID_secret = createSecretId(16);
                }else{
                    var discourse_JID_secret = null;
                }

                if(listen_visibility === 'private'){
                    var discourse_LID_secret = createSecretId(16);
                }else{
                    var discourse_LID_secret = null;
                }

                var datetime = new Date();
                var discourse_start_datetime = datetime.toUTCString();
                var discourse_end_datetime = null;

                var discourse_current_participants = 0;
                var discourse_current_listeners = 0;
                var discourse_max_participants = 0;
                var discourse_max_listeners = 0;

                //add everything to an array
                var discourse_data = {
                    name: discourse_name,
                    description: discourse_description,
                    tags: discourse_tags,
                    RID: discourse_RID,
                    UDI: discourse_UDI, 
                    JID: discourse_JID,
                    JID_secret: discourse_JID_secret,
                    LID: discourse_LID, 
                    LID_secret: discourse_LID_secret, 
                    start_datetime: discourse_start_datetime,
                    end_datetime: discourse_end_datetime,
                    current_participants: discourse_current_participants,
                    current_listeners: discourse_current_listeners,
                    max_participants: discourse_max_participants,
                    max_listeners: discourse_max_listeners
                 }

                callInsertRecordPromise(discourse_data).then(function(result){
                    if(result == 'success'){
                        var return_data = {
                            UDI: discourse_UDI,
                            JID_secret: discourse_JID_secret,
                            LID_secret: discourse_LID_secret
                        }
                        handler(null, discourse_data);
                    }
                });
            });
        } catch (error){
            handler(error, null);
        }
    });
    
    socket.on('get_auth_creds_from_jid', function(auth_jid, handler){
       try{
           callfindDiscourseByJIDPromise(auth_jid).then(function(res){
               if(res != null && res != "ERROR! More than one discourse with this JID!"){
                   console.log(res[0]);
                   var return_data = {
                       "UDI": res[0]['UDI'],
                       "JID": res[0]['JID'],
                       "JID_secret": res[0]['JID_secret'],
                       "LID": res[0]['LID'],
                       "LID_secret": res[0]['LID_secret']
                   }   
                   handler(null, return_data);
               }else{
                   console.log(res);
                   handler(null, res);
               }
           });
       } catch(error) {
           handler(error, null);
       }
    });
    
    socket.on('get_auth_creds_from_lid', function(auth_lid, handler){
       try{
           callfindDiscourseByLIDPromise(auth_lid).then(function(res){
               if(res != null && res != "ERROR! More than one discourse with this LID!"){
                   console.log(res[0]);
                   var return_data = {
                       "UDI": res[0]['UDI'],
                       "LID": res[0]['LID'],
                       "LID_secret": res[0]['LID_secret']
                   }   
                   handler(null, return_data);
               }else{
                   console.log(res);
                   handler(null, res);
               }
           });
       } catch(error) {
           handler(error, null);
       }
    });
    
    socket.on('auth_into_discourse', function(auth_data, handler){
        
        try{
            console.log('Auth attempt.');
            var user_UDI = auth_data['UDI'];
            var user_JID = auth_data['JID'];
            var user_LID = auth_data['LID'];
            var user_JID_secret = auth_data['JID_secret'];
            var user_LID_secret = auth_data['LID_secret'];
            
            callfindDiscourseByUDIPromise(user_UDI).then(function(res){
               var to_return; 
               if(res != null && res != "ERROR! More than one discourse with this UDI!"){
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
                       "start_datetime": res[0]['start_datetime'],
                       "end_datetime": res[0]['end_datetime'],
                       "current_participants": res[0]['current_participants'],
                       "current_listeners": res[0]['current_listeners']
                   }
               }else{
                   console.log(res);
                   to_return = null; 
               }
               handler(null, to_return);
            });
            
        } catch(error){
            handler(error, null);
        }
    });
    
    socket.on('connectToDiscourse', function(connection_data, handler){
        try { 
            var UDI = connection_data["UDI"];
            var user_id = connection_data["user_id"];
            var connection_type = connection_data["connection_type"]; 
            if(connection_type == 'join' && auth_creds[UDI]['join_auth'] == false){
                handler(null, 'not authorized');
            }else if(connection_type == 'listen' && auth_creds[UDI]['listen_auth'] == false){
                handler(null, 'not authorized');
            }else if((connection_type == 'join' && auth_creds[UDI]['join_auth'] == true ) || (connection_type == 'listen' && auth_creds[UDI]['join_auth'] == true )){
                callfindDiscourseByUDIPromise(UDI).then(function(res){
                    if(connection_state == null){
                       if(res != null && res != "ERROR! More than one discourse with this UDI!"){
                           socket.join(res[0]['RID']);
                           if(connection_type == 'join'){
                               connection_state = 'participant';
                           }else{
                               connection_state = 'listener';
                           }
                           updateParticipantsAndListenersCount(UDI, connection_state, 'add');
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
                           io.sockets.in(res[0]['RID']).emit('updateDiscourseCount', count_data);
                           handler(null, count_data);
                       }
                    }else if(connection_type == 'join' && connection_state == 'listener'){
                        if(res != null && res != "ERROR! More than one discourse with this UDI!"){
                            updateParticipantsAndListenersCount(UDI, connection_state, 'subtract');
                            if(connection_type == 'join'){
                               connection_state = 'participant';
                            }else{
                               connection_state = 'listener';
                            }
                            updateParticipantsAndListenersCount(UDI, connection_state, 'add');
                            var current_listeners = res[0]['current_listeners'] - 1;
                            var current_participants = res[0]['current_participants'] + 1;
                            var count_data = {
                                'type': 'values',
                                'current_listeners': current_listeners,
                                'current_participants': current_participants
                            } 
                            io.sockets.in(res[0]['RID']).emit('updateDiscourseCount', count_data);
                            handler(null, count_data);
                        }
                    }else if(connection_type == 'listen' && connection_state == 'participant'){
                        if(res != null && res != "ERROR! More than one discourse with this UDI!"){
                            updateParticipantsAndListenersCount(UDI, connection_state, 'subtract');
                            if(connection_type == 'join'){
                               connection_state = 'participant';
                            }else{
                               connection_state = 'listener';
                            }
                            updateParticipantsAndListenersCount(UDI, connection_state, 'add');
                            var current_listeners = res[0]['current_listeners'] + 1;
                            var current_participants = res[0]['current_participants'] - 1;
                            var count_data = {
                                'type': 'values',
                                'current_listeners': current_listeners,
                                'current_participants': current_participants
                            }
                            io.sockets.in(res[0]['RID']).emit('updateDiscourseCount', count_data); 
                            handler(null, count_data);
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
    })
    
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
                    console.log(result);
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
        
});

port = 3000;
hostname = 'localhost';

http.listen(port, hostname, () => {
    console.log('listening on *:3000');
}); 