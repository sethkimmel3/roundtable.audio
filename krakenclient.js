const TURNSERVER = 'turn:104.131.28.192:5349';

const constraints = {
    audio: true,
    video: false
};
const configuration = {
    iceServers: [{
    urls: TURNSERVER,
    username: "guest",
    credential: "somepassword"
}],
    iceTransportPolicy: 'relay',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    sdpSemantics: 'unified-plan'
};

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
    

var ucid = "";
var participant_ids = [];
var current_subscribe_unameRPC = ''; //allows user to flip between participant/listen only

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
    
async function subscribe_client(UDI, unameRPC, socket) {
    var subscribe_data = {
        "UDI": UDI,
        "unameRPC": unameRPC,
        "ucid": ucid
    }
    socket.emit('subscribe', subscribe_data, async function(err, res){
       console.log(res);
        if (res.error && typeof res.error === 'string' && res.error.indexOf(unameRPC + ' not found in')) {
          pc.close();
          await client_start();
          return;
        }
        if (res.data && res.data.type === 'offer') {
          console.log("subscribe offer", res.data);
          await pc.setRemoteDescription(res.data);
          var sdp = await pc.createAnswer();
          await pc.setLocalDescription(sdp);
          var answer_data = {
              "UDI": UDI,
              "unameRPC": unameRPC,
              "ucid": ucid,
              "sdp": JSON.stringify(sdp)
          }
          
          socket.emit('answer', answer_data, function(err, res){
              console.log('answer'); 
              //handle error
          });
        }
        if(unameRPC == current_subscribe_unameRPC){
            setTimeout(function () {
              subscribe_client(UDI, unameRPC, socket);
            }, 3000); 
        }
    });
  } 


var pc; 
async function publish_client(UDI, unameRPC, user_id, socket){
    var stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        //document.getElementById('microphone').style.display = 'block';
        console.error(err);
        return;
      }
    
    stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
    });
    await pc.setLocalDescription(await pc.createOffer());
    
    var publish_data = {
        'UDI': UDI,
        'unameRPC': unameRPC,
        'localDescription': JSON.stringify(pc.localDescription)
    }
    socket.emit('publish', publish_data, async function(err, res){
        if (res.data && res.data.sdp.type === 'answer') {
            await pc.setRemoteDescription(res.data.sdp);
            ucid = res.data.track;
            current_subscribe_unameRPC = unameRPC; 
            subscribe_client(UDI, unameRPC, socket);
        }                                       
    });
    
    create_analyser(user_id, stream);
}

async function register_listen_only_peer_client(UDI, socket){
    await pc.setLocalDescription(await pc.createOffer());
    var uname = uuidv4() + ':' + Base64.encode('');
    var unameRPC = encodeURIComponent(uname);
    var register_listen_only_peer_data = {
        'UDI': UDI,
        'unameRPC': unameRPC,
        'localDescription': JSON.stringify(pc.localDescription)
    }
    socket.emit('registerListenOnlyPeer', register_listen_only_peer_data, async function(err, res){
       console.log(res);
       if (res.data && res.data.sdp.type === 'answer') {
            await pc.setRemoteDescription(res.data.sdp);
            ucid = res.data.track;
            current_subscribe_unameRPC = unameRPC;
            subscribe_client(UDI, unameRPC, socket);
       } 
    });
}
    
async function start_client(client_type, UDI, unameRPC, user_id, socket) {
    try {
      if(client_type == 'listen_only'){
          uname = uuidv4() + ':' + Base64.encode('');
          unameRPC = encodeURIComponent(uname);
          user_id = uuidv4();
          ucid = "";
      } 
     
// CHECK THIS OUT LATER
//      var turn_data = {
//          'unameRPC': unameRPC
//      }
//      socket.emit('turn', turn_data, function(err, res){
//          if (res.data && res.data.length > 0) {
//            configuration.iceServers = res.data;
//            configuration.iceTransportPolicy = 'relay';
//          } else {
//            configuration.iceServers = [];
//            configuration.iceTransportPolicy = 'all';
//          }        
//      });
        
      pc = new RTCPeerConnection(configuration);
      pc.createDataChannel('useless'); // FIXME remove this line
      pc.onicecandidate = ({candidate}) => {
        var trickle_data = {
            'UDI': UDI,
            'unameRPC': unameRPC,
            'ucid': ucid,
            'candidate': JSON.stringify(candidate)
        }
        socket.emit('trickle', trickle_data, function(err, data){
            console.log(err);
            console.log(data);
        })
      };

      pc.ontrack = (event) => {
        console.log("ontrack", event);

        var stream = event.streams[0];
        var sid = decodeURIComponent(stream.id);
        var id = sid.split(':')[0];
        var name = Base64.decode(sid.split(':')[1]);
        console.log(id, user_id);
        if (id === user_id) {
          return;
        }
        
        var index = participant_ids.indexOf(id);
        if(index == - 1 && name != ''){
            $.fn.addSeat(name, id, false); 
            create_analyser(id, stream);
        } 
        
        event.track.onmute = (event) => {
          console.log("onmute", event);
            
          $.fn.removeSeat(id);
          var index = participant_ids.indexOf(id);
          if(index > - 1){
              participant_ids.splice(index, 1);
          }
        };
          

        var aid = 'peer-audio-'+id;
        var el = document.getElementById(aid);
        if (el) {
          el.srcObject = stream;
        } else {
          el = document.createElement(event.track.kind)
          el.id = aid;
          el.srcObject = stream;
          el.autoplay = true;
          el.controls = false;
          document.getElementById('peers').appendChild(el)
        }
      };
      audioCtx.resume();

    } catch (err) {
      console.error(err);
    }
  }   

function create_analyser(id, stream){
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.minDecibels = -80;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    participant_ids.push(id);
    track_speaking(id, analyser);
}

function track_speaking(id, analyser){
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    var threshold = 10.0; 
    var total;
    var i;
    var average;
    function update(){
        analyser.getByteFrequencyData(dataArray);
        total = 0;                               // initialize to 0
        i = 0; 
        while(i < dataArray.length) total += dataArray[i++];   // add all
        average = dataArray.length ? total / dataArray.length : 0; 
        if(average > threshold){
            $.fn.addToSpeaking(id);
        }else{
            $.fn.removeFromSpeaking(id);
        }
        if (participant_ids.includes(id)) {
        setTimeout(function () {
            update();
           }, 100);
        }
    }
    
    update();
}