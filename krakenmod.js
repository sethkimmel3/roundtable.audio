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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
    
async function subscribe_client(UDI, unameRPC, socket) {
    //var res = await rpc('subscribe', [rnameRPC, unameRPC, ucid]);
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
          //await rpc('answer', [rnameRPC, unameRPC, ucid, JSON.stringify(sdp)]);
          var answer_data = {
              "UDI": UDI,
              "unameRPC": unameRPC,
              "ucid": ucid,
              "sdp": JSON.stringify(sdp)
          }
          
          socket.emit('answer', answer_data, function(err, res){
             console.log('here'); 
          });
        }
        setTimeout(function () {
          subscribe_client(UDI, unameRPC, socket);
        }, 3000); 
    });
  } 


var pc; 

async function publish_client(UDI, unameRPC, socket){
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
            subscribe_client(UDI, unameRPC, socket);
        }                                       
    })
}

async function publish_blank_client(UDI, unameRPC, socket){
    await pc.setLocalDescription(await pc.createOffer());
    var uname = uuidv4() + ':' + Base64.encode('null');
    var unameRPC = encodeURIComponent(uname);
    //var res = await rpc('registerListenOnlyPeer', [rnameRPC, unameRPC, JSON.stringify(pc.localDescription)]);
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
            subscribe_client(UDI, unameRPC, socket);
       } 
    });
}
    
async function start_client(UDI, unameRPC, user_id, socket) {
    try {
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
        //rpc('trickle', [rnameRPC, unameRPC, ucid, JSON.stringify(candidate)]);
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