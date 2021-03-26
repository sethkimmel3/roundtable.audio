//window.onload = function() {
//const KRAKEN_API = 'https://rpc.discourse.fm';
const KRAKEN_API = 'http://kraken_listen_only:7000';
//const KRAKEN_API = 'http://localhost:7000';
const fetch = require("node-fetch");

obj = {
    uuidv4: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      } ,

    rpc: async function(method, params = []) {
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
            body: JSON.stringify({id: obj.uuidv4(), method: method, params: params}) // body data type must match "Content-Type" header
          })
          return response.json(); // parses JSON response into native JavaScript objects
        } catch (err) {
          console.log('fetch error', method, params, err);
          return await obj.rpc(method, params);
        }
      } ,

    turn: async function(unameRPC) {
        var res = await obj.rpc('turn', [unameRPC]);
        //console.log(res);
        return res;
    } ,

    trickle: async function(rnameRPC, unameRPC, ucid, candidate) {
        await obj.rpc('trickle', [rnameRPC, unameRPC, ucid, candidate]);
    } ,

    answer: async function(rnameRPC, unameRPC, ucid, sdp) {
        await obj.rpc('answer', [rnameRPC, unameRPC, ucid, sdp]);
    } ,

    subscribe: async function(rnameRPC, unameRPC, ucid) {
        var res = await obj.rpc('subscribe', [rnameRPC, unameRPC, ucid]);
        return res;
    } ,

    publish: async function(rnameRPC, unameRPC, localDescription){
        var res = await obj.rpc('publish', [rnameRPC, unameRPC, localDescription]);
//        if (res.data && res.data.sdp.type === 'answer') {
//            ucid = res.data.track;
//        }
        return res;
    } ,

    registerListenOnlyPeer: async function(rnameRPC, unameRPC, localDescription){
        var res = await obj.rpc('registerListenOnlyPeer', [rnameRPC, unameRPC, localDescription]);
//        if (res.data && res.data.sdp.type === 'answer') {
//            ucid = res.data.track;
//        }
        return res;
    }
}

module.exports = obj;
