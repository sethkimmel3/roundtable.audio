//window.onload = function() {
const KRAKEN_API = 'https://rpc.discourse.fm';
//const KRAKEN_API = 'http://localhost:7000';
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

async function rpc(method, params = []) {
    try {
      const response = await fetch(KRAKEN_API, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'omit', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json'
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *client
        body: JSON.stringify({id: uuidv4(), method: method, params: params}) // body data type must match "Content-Type" header
      });
      return response.json(); // parses JSON response into native JavaScript objects
    } catch (err) {
      console.log('fetch error', method, params, err);
      return await rpc(method, params);
    }
  }
    
async function subscribe(rnameRPC, unameRPC) {
    var res = await rpc('subscribe', [rnameRPC, unameRPC, ucid]);
    console.log(res);
    if (res.error && typeof res.error === 'string' && res.error.indexOf(unameRPC + ' not found in')) {
      pc.close();
      await start();
      return;
    }
    if (res.data && res.data.type === 'offer') {
      console.log("subscribe offer", res.data);
      await pc.setRemoteDescription(res.data);
      var sdp = await pc.createAnswer();
      await pc.setLocalDescription(sdp);
      await rpc('answer', [rnameRPC, unameRPC, ucid, JSON.stringify(sdp)]);
    }
    setTimeout(function () {
      subscribe(rnameRPC, unameRPC);
    }, 3000);
  } 


var pc; 

async function publish(rnameRPC, unameRPC){
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
    
    var res = await rpc('publish', [rnameRPC, unameRPC, JSON.stringify(pc.localDescription)]);
    //var res = await rpc('publish', [rnameRPC, unameRPC, JSON.stringify(pc.localDescription), 0, "", "true"]);
      console.log(res);
      if (res.data && res.data.sdp.type === 'answer') {
        await pc.setRemoteDescription(res.data.sdp);
        ucid = res.data.track;
        subscribe(rnameRPC, unameRPC);
      }
}

async function publish_blank(rnameRPC, unameRPC){
    await pc.setLocalDescription(await pc.createOffer());
    var uname = uuidv4() + ':' + Base64.encode('null');
    var unameRPC = encodeURIComponent(uname);
    var res = await rpc('registerListenOnlyPeer', [rnameRPC, unameRPC, JSON.stringify(pc.localDescription)]);
      console.log(res);
      if (res.data && res.data.sdp.type === 'answer') {
        await pc.setRemoteDescription(res.data.sdp);
        ucid = res.data.track;
        subscribe(rnameRPC, unameRPC);
      }
}
    
async function start(rnameRPC, unameRPC, user_id) {
    try {
      //document.querySelectorAll('.peer').forEach((el) => el.remove());

      pc = new RTCPeerConnection(configuration);
      pc.createDataChannel('useless'); // FIXME remove this line
      pc.onicecandidate = ({candidate}) => {
        rpc('trickle', [rnameRPC, unameRPC, ucid, JSON.stringify(candidate)]);
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

//        event.track.onmute = (event) => {
//          console.log("onmute", event);
//          var el = document.querySelector(`[data-track-id="${event.target.id}"]`);
//          if (el) {
//            el.remove();
//            resizeVisulizers();
//          }
//        };

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

//        buildCanvas(stream, id, name, event.track.id);
//        resizeVisulizers();
      };

//      buildCanvas(stream, uid, name, 'me');
//      resizeVisulizers();
//      handlePartyPerform();
      audioCtx.resume();

    } catch (err) {
      console.error(err);
    }
  }    

//}