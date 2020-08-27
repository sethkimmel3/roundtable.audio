var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');

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

io.on('connection', (socket) => {
    console.log('a user connected with socket id: ' + socket.id);

//    var dbo = mongoUtil.getDb();
//    dbo.collection( 'discourseList').find({}).toArray(function(err,res){
//        if(err) throw err;
//        console.log(res);
//    });
    
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
            
            callfindDiscourseByUDIPromise(user_UDI).then(function(res){
               var to_return; 
               if(res != null && res != "ERROR! More than one discourse with this UDI!"){
                   var join_auth; 
                   var listen_auth;
                   
                   if(res[0]['JID'] == null){
                       join_auth = true;
                   }else if(res[0]['JID'] != null && user_JID == res[0]['JID']){
                       join_auth = true;
                   }else if(res[0]['JID'] != null && user_JID != res[0]['JID']){
                       join_auth = false;
                   }
                   
                   if(res['LID'] == null){
                       listen_auth = true;
                   }else if(res[0]['LID'] != null && user_LID == res[0]['LID']){
                       listen_auth = true;
                   }else if(res[0]['LID'] != null && user_LID != res[0]['LID']){
                       listen_auth = false;
                   }
                   
                   to_return = {
                       "name": res[0]['name'],
                       "description": res[0]['description'],
                       "tags": res[0]['tags'],
                       //"RID": res[0]['RID'],
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
    
    socket.on('verify_auth', function(client_auth_data, handler){
        // let user attempt to join/listen to discourse
        try{
            console.log('Verify auth attempt.');
            callfindDiscourseByUDIPromise(client_auth_data['UDI']).then(function(res){
                var to_return;
                if(res != null && res != "ERROR! More than one discourse with this UDI!"){
                    var auth; 
                    
                    if(client_auth_data['Type'] == 'Join'){
                        if(res[0]['JID'] == null){
                            auth = true;
                        } else if(res[0]['JID'] != null && res[0]['JID'] == client_auth_data['JID'] && res[0]['JID_secret'] == client_auth_data['JID_secret']){
                            auth = true;
                        } else{
                            auth = false;
                        }
                    }else if(client_auth_data['Type'] == 'Listen'){
                        if(res[0]['LID'] == null){
                            auth = true;
                        } else if(res[0]['LID'] != null && res[0]['LID'] == client_auth_data['LID'] && res[0]['LID_secret'] == client_auth_data['LID_secret']){
                            auth = true;
                        } else{
                            auth = false;
                        }
                    }
                    
                    if(auth){
                        to_return = res[0]['RID'];
                    }else{
                        to_return = null;
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
        
});

http.listen(3000, () => {
    console.log('listening on *:3000');
}); 