var mongo = require('mongodb');
var mongoUtil = require('./MongoConnection.js');

//connect to roundtableListDatabase on Startup
mongoUtil.connectToServer("roundtableListDatabase", function(err, client){
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

function createRoundtableUDIFromName(roundtable_name){
    var roundtable_UDI = roundtable_name.replace(/[^\w\s]/gi, '').trim().replace(/ /g, '-').toLowerCase();
    //if the last entry is an integer, this could cause collision issues
    var splitList = roundtable_UDI.split('-');
    var lastEntry = splitList[splitList.length - 1];
    if(isNaN(lastEntry) == false){
        roundtable_UDI += '-safe';
    }
    return roundtable_UDI;
}

var uniqueUDIPromise = (roundtable_UDI) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
                    UDI: {$regex: new RegExp(roundtable_UDI, 'i')},
                    end_datetime: {$eq: null}
                    };

        dbo.collection("roundtableList").find(query).toArray(function(e, res){
            if(e) throw e;
            var maxInteger = 0;
            for(var i = 0; i < res.length; i++){
                if(roundtable_UDI == res[i]["UDI"]){
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
                   roundtable_UDI += '-' + String(maxInteger);
                }
                resolve(roundtable_UDI);
            })
    })
)

var callUniqueUDIPromise = async (roundtable_UDI) => {
    var result = await (uniqueUDIPromise(roundtable_UDI));
    return result;
}

var insertRecordPromise = (roundtable_data) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        dbo.collection("roundtableList").insertOne(roundtable_data, function(e, res){
            if(e) throw e;
            resolve('success');
        })
    })
)

var callInsertRecordPromise = async (roundtable_data) => {
    var result = await (insertRecordPromise(roundtable_data));
    return result;
}

var findRoundtableByUDIPromise = (community, roundtable_UDI) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        if(community != ''){
            var query = {
                UDI: roundtable_UDI,
                community: community,
                end_datetime: null
            }
        }
        else{
            var query = {
                UDI: roundtable_UDI,
                end_datetime: null
            }
        }
        dbo.collection("roundtableList").find(query).toArray(function(e, res){
            if(e) throw e;
            if(res.length == 0){
                resolve(null);
            }else if(res.length == 1){
                resolve(res);
            }else{
                resolve("ERROR! More than one roundtable with this UDI!")
            }
        })
    })
)

var callfindRoundtableByUDIPromise = async (community, roundtable_UDI) => {
    var result = await (findRoundtableByUDIPromise(community, roundtable_UDI));
    return result;
}

var findRoundtableByJIDPromise = (roundtable_JID) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
            JID: roundtable_JID
        }
        dbo.collection("roundtableList").find(query).toArray(function(e, res){
            if(e) throw e;
            if(res.length == 0){
                resolve(null);
            }else if(res.length == 1){
                resolve(res);
            }else{
                resolve("ERROR! More than one roundtable with this JID!")
            }
        })
    })
)

var callfindRoundtableByJIDPromise = async (roundtable_JID) => {
    var result = await (findRoundtableByJIDPromise(roundtable_JID));
    return result;
}

var findRoundtableByLIDPromise = (roundtable_LID) => (
    new Promise((resolve, reject) => {
        var dbo = mongoUtil.getDb();
        var query = {
            LID: roundtable_LID
        }
        dbo.collection("roundtableList").find(query).toArray(function(e, res){
            if(e) throw e;
            if(res.length == 0){
                resolve(null);
            }else if(res.length == 1){
                resolve(res);
            }else{
                resolve("ERROR! More than one roundtable with this LID!")
            }
        })
    })
)

var callfindRoundtableByLIDPromise = async (roundtable_LID) => {
    var result = await (findRoundtableByLIDPromise(roundtable_LID));
    return result;
}

var updateParticipantsAndListenersCount = (UDI, type, operation) => {
    try{
        callfindRoundtableByUDIPromise('', UDI).then(function(res){
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
            dbo.collection("roundtableList").updateOne(query, update, function(e, res){
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
        callfindRoundtableByUDIPromise('', UDI).then(function(res){
            if(res != null && res != "ERROR! More than one roundtable with this UDI!"){
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
                dbo.collection("roundtableList").updateOne(query, update, function(e, res){
                    if(e) throw e;
                });
            }
        })
    }
    catch( error ){
        console.log(error);
    }
}

var createNewRoundtablePromise = (roundtable_data) => (
        new Promise((resolve, reject) => {
            try{
                var roundtable_name = roundtable_data['roundtable-name'];
                var roundtable_description = roundtable_data['roundtable-description'];
                var roundtable_tags = roundtable_data['roundtable-tags'];
                var join_visibility = roundtable_data['join-visibility'];
                var listen_visibility = roundtable_data['listen-visibility'];
                var roundtable_JID = roundtable_data['roundtable_JID'];
                var roundtable_LID = roundtable_data['roundtable_LID'];
                var max_allowed_participants = roundtable_data['max-allowed-participants'];
                if("community" in roundtable_data){
                    var roundtable_community = roundtable_data['community'];
                }else{
                    var roundtable_community = '';
                }
                if("metadata" in roundtable_data){
                    var metadata = roundtable_data['metadata'];
                }else{
                    var metadata = '';
                }

                var roundtable_RID = uuidv4();
                var roundtable_UDI = createRoundtableUDIFromName(roundtable_name);

                // ensure that the promise for finding unique UDI resolved before attempting to insert data
                callUniqueUDIPromise(roundtable_UDI).then(function(result){
                    roundtable_UDI = result;

                    if(join_visibility === 'private'){
                        var roundtable_JID_secret = createSecretId(16);
                        var public_join = false;
                    }else{
                        var roundtable_JID_secret = null;
                        var public_join = true;
                    }

                    if(listen_visibility === 'private'){
                        var roundtable_LID_secret = createSecretId(16);
                        var public_listen = false;
                    }else{
                        var roundtable_LID_secret = null;
                        var public_listen = true;
                    }

                    var roundtable_start_datetime = new Date();
                    var roundtable_end_datetime = null;

                    var roundtable_current_participants = 0;
                    var roundtable_current_listeners = 0;
                    var roundtable_max_participants = 0;
                    var roundtable_max_listeners = 0;

                    //add everything to an array
                    var roundtable_data = {
                        name: roundtable_name,
                        description: roundtable_description,
                        tags: roundtable_tags,
                        RID: roundtable_RID,
                        UDI: roundtable_UDI,
                        JID: roundtable_JID,
                        JID_secret: roundtable_JID_secret,
                        LID: roundtable_LID,
                        LID_secret: roundtable_LID_secret,
                        public_join: public_join,
                        public_listen: public_listen,
                        start_datetime: roundtable_start_datetime,
                        end_datetime: roundtable_end_datetime,
                        current_participants: roundtable_current_participants,
                        current_listeners: roundtable_current_listeners,
                        max_participants: roundtable_max_participants,
                        max_listeners: roundtable_max_listeners,
                        max_allowed_participants: max_allowed_participants,
                        community: roundtable_community,
                        metadata: metadata,
                        current_participants_array: []
                     }

                    callInsertRecordPromise(roundtable_data).then(function(result){
                        if(result == 'success'){
                            var return_data = {
                                UDI: roundtable_UDI,
                                JID_secret: roundtable_JID_secret,
                                LID_secret: roundtable_LID_secret
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

var callCreateNewRoundtablePromise = async (roundtable_data) => {
    var result = await createNewRoundtablePromise(roundtable_data);
    return result;
}

// export these functions
module.exports = {
    uuidv4,
    createSecretId,
    createRoundtableUDIFromName,
    uniqueUDIPromise,
    callUniqueUDIPromise,
    insertRecordPromise,
    callInsertRecordPromise,
    findRoundtableByUDIPromise,
    callfindRoundtableByUDIPromise,
    findRoundtableByJIDPromise,
    callfindRoundtableByJIDPromise,
    findRoundtableByLIDPromise,
    callfindRoundtableByLIDPromise,
    updateParticipantsAndListenersCount,
    updateCurrentParticipantsArray,
    createNewRoundtablePromise,
    callCreateNewRoundtablePromise
}
