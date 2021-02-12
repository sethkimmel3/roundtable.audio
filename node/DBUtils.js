var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');

//connect to discourseListDatabase on Startup
mongoUtil.connectToServer("discourseListDatabase", function(err, client){
    if (err) console.log(err);
});

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

function createDiscourseUDIFromName(discourse_name){
    var discourse_UDI = discourse_name.replace(/[^\w\s]/gi, '').trim().replace(/ /g, '-').toLowerCase(); 
    //if the last entry is an integer, this could cause collision issues
    var splitList = discourse_UDI.split('-');
    var lastEntry = splitList[splitList.length - 1];
    if(isNaN(lastEntry) == false){
        discourse_UDI += '-safe';
    }
    return discourse_UDI;
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

var findDiscourseByUDIPromise = (community, discourse_UDI) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        if(community != ''){
            var query = {
                UDI: discourse_UDI,
                community: community,
                end_datetime: null
            }
        }
        else{
            var query = {
                UDI: discourse_UDI,
                end_datetime: null
            }
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

var callfindDiscourseByUDIPromise = async (community, discourse_UDI) => {
    var result = await (findDiscourseByUDIPromise(community, discourse_UDI));
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
    try{
        callfindDiscourseByUDIPromise('', UDI).then(function(res){
            var dbo = mongoUtil.getDb();
            var query = { UDI: UDI, end_datetime: null };
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
                // console.log('1 record updated');
            })
        })
    }catch (error){
        console.log(error);
    }
}

var updateCurrentParticipantsArray = (UDI, user_id, nickname, operation) => {
    try{
        callfindDiscourseByUDIPromise('', UDI).then(function(res){
            if(res != null && res != "ERROR! More than one discourse with this UDI!"){
                var currentParticipantsArray = res[0]['current_participants_array']; 
                if(operation == 'add'){
                    var newParticipant = [user_id, nickname];
                    if(Array.isArray(currentParticipantsArray) == false){
                        currentParticipantsArray = [];
                    }
                    var found = false;
                    for(var i = 0; i < currentParticipantsArray.length; i++){
                        if(currentParticipantsArray[i][0] == user_id){
                            found = true;
                        }
                    }
                    if(found == false){
                        currentParticipantsArray.push(newParticipant);
                    }
                }else {
                    var removeIndex = -1;
                    for(var i = 0; i < currentParticipantsArray.length; i++){
                        if(currentParticipantsArray[i][0] == user_id){
                            removeIndex = i;
                        }
                    }
                    if(removeIndex != -1){
                        currentParticipantsArray.splice(removeIndex, 1);
                    }else{
                        console.log("Participant not found");
                    }
                }
                
                console.log(currentParticipantsArray);
                var dbo = mongoUtil.getDb();
                var query = { UDI: UDI, end_datetime:null };
                var update = { $set:{ current_participants_array: currentParticipantsArray} };
                dbo.collection("discourseList").updateOne(query, update, function(e, res){
                    if(e) throw e;
                });
            }
        })
    }
    catch( error ){
        console.log(error);
    }
}

var createNewDiscoursePromise = (discourse_data) => (
        new Promise((resolve, reject) => {
            try{
                var discourse_name = discourse_data['discourse-name'];
                var discourse_description = discourse_data['discourse-description'];
                var discourse_tags = discourse_data['discourse-tags'];
                var join_visibility = discourse_data['join-visibility'];
                var listen_visibility = discourse_data['listen-visibility'];
                var discourse_JID = discourse_data['discourse_JID'];
                var discourse_LID = discourse_data['discourse_LID'];
                var max_allowed_participants = discourse_data['max-allowed-participants'];
                if("community" in discourse_data){
                    var discourse_community = discourse_data['community'];
                }else{
                    var discourse_community = '';
                }
                if("metadata" in discourse_data){
                    var metadata = discourse_data['metadata'];
                }else{
                    var metadata = '';
                }

                var discourse_RID = uuidv4();
                var discourse_UDI = createDiscourseUDIFromName(discourse_name);

                // ensure that the promise for finding unique UDI resolved before attempting to insert data
                callUniqueUDIPromise(discourse_UDI).then(function(result){
                    discourse_UDI = result;

                    if(join_visibility === 'private'){
                        var discourse_JID_secret = createSecretId(16);
                        var public_join = false;
                    }else{
                        var discourse_JID_secret = null;
                        var public_join = true;
                    }

                    if(listen_visibility === 'private'){
                        var discourse_LID_secret = createSecretId(16);
                        var public_listen = false;
                    }else{
                        var discourse_LID_secret = null;
                        var public_listen = true;
                    }

                    var discourse_start_datetime = new Date();
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
                        public_join: public_join,
                        public_listen: public_listen,
                        start_datetime: discourse_start_datetime,
                        end_datetime: discourse_end_datetime,
                        current_participants: discourse_current_participants,
                        current_listeners: discourse_current_listeners,
                        max_participants: discourse_max_participants,
                        max_listeners: discourse_max_listeners,
                        max_allowed_participants: max_allowed_participants,
                        community: discourse_community,
                        metadata: metadata,
                        current_participants_array: []
                     }

                    callInsertRecordPromise(discourse_data).then(function(result){
                        if(result == 'success'){
                            var return_data = {
                                UDI: discourse_UDI,
                                JID_secret: discourse_JID_secret,
                                LID_secret: discourse_LID_secret
                            }
                            resolve(return_data);
                        }
                    });
                });
            } catch (error){
                resolve(error);
            }
        })
    )

var callCreateNewDiscoursePromise = async (discourse_data) => {
    var result = await createNewDiscoursePromise(discourse_data);
    return result;
}

// export these functions 
module.exports = {
    uuidv4,
    createSecretId,
    createDiscourseUDIFromName,
    uniqueUDIPromise,
    callUniqueUDIPromise,
    insertRecordPromise,
    callInsertRecordPromise,
    findDiscourseByUDIPromise,
    callfindDiscourseByUDIPromise,
    findDiscourseByJIDPromise,
    callfindDiscourseByJIDPromise,
    findDiscourseByLIDPromise,
    callfindDiscourseByLIDPromise,
    updateParticipantsAndListenersCount,
    updateCurrentParticipantsArray,
    createNewDiscoursePromise,
    callCreateNewDiscoursePromise
}