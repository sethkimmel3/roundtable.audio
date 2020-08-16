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
                    end_dateTime: {$eq: null}
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
        var error_to_return;
        var message_to_return;
        try{
            var discourse_name = discourse_data['discourse-name'];
            var discourse_description = discourse_data['discourse-description'];
            var discourse_tags = discourse_data['discourse-tags'];
            var join_visibility = discourse_data['join-visibility'];
            var listen_visibility = discourse_data['listen-visibility'];
            var discourse_JID = discourse_data['discourse_JID'];
            var discourse_LID = discourse_data['discourse_LID'];

            var discourse_RID = uuidv4();
            var discourse_UDI = discourse_name.replace(/[^\w\s]/gi, '').trim().replace(/ /g, '-'); 

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

                var dateTime = new Date();
                var discourse_start_dateTime = dateTime.toUTCString();
                var discourse_end_dateTime = null;

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
                    start_dateTime: discourse_start_dateTime,
                    end_dateTime: discourse_end_dateTime,
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
});


http.listen(3000, () => {
    console.log('listening on *:3000');
}); 
