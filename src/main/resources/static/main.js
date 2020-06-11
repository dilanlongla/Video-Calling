'use strict';

var localStream;
var pc;
var remoteStream;
var username;
var remoteUser;
var sock;
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var mediaConstraints = {
    audio: true, // We want an audio track
    video: true // ...and we want a video track
};


var configuration = {
    iceServers: [{  
            urls: ["stun:ws-turn5.xirsys.com"]
        },
        {  
            username: "uh110by5w1vhvlU0DqIRPSEmiPslc_X5ON2S6EzDhud4rT80S2ebml-tXlyNUCMWAAAAAF7eKMpEaWxhbkxvbmdsYQ==",
            credential: "e6f7a8f4-a97f-11ea-9142-0242ac140004",
            urls: [      "turn:ws-turn5.xirsys.com:80?transport=udp", "turn:ws-turn5.xirsys.com:3478?transport=udp",       "turn:ws-turn5.xirsys.com:80?transport=tcp",       "turn:ws-turn5.xirsys.com:3478?transport=tcp",       "turns:ws-turn5.xirsys.com:443?transport=tcp",       "turns:ws-turn5.xirsys.com:5349?transport=tcp"  ]
        }
    ]
};

function connect() {
    username = document.getElementById('username').value.trim();
    if (username) {
        document.querySelector('#connection').classList.add('hidden');
        document.querySelector('#call').classList.remove('hidden');

        var loc = window.location
        var uri = "wss://" + loc.hostname + "/signal";
        sock = new WebSocket(uri);
        console.log(username + ' is connected to signaling server');

        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(getStream)
            .catch(function(e) {
                alert('getUserMedia() error: ' + e.name);
            });

        sock.onopen = function(e) {
            console.log('open', e);
            sock.send(
                JSON.stringify({
                    type: "login",
                    data: username
                })
            );
        }

        //called when socket connection closes
        sock.onclose = function(e) {
            console.log('close', e);
        }

        //called when an error occures
        sock.onerror = function(e) {
            console.log('error', e);
            console.log("Couldn't place call, Please try again");
        }

        //called on message reception by the client
        sock.onmessage = function(e) {
            console.log('message', e.data);

            var message = JSON.parse(e.data);
            if (message.type === 'rtc') {
                if (message.data.sdp) {
                    if (message.data.sdp.type === 'offer') {
                        startRTC();
                        pc.addStream(localStream);
                        pc.setRemoteDescription(new RTCSessionDescription(message.data.sdp),
                            function() {
                                // if we received an offer, we need to answer
                                if (pc.remoteDescription.type == 'offer') {
                                    console.log('Sending answer to peer.');
                                    remoteUser = message.dest;
                                    pc.createAnswer(localDescCreated, logError);
                                }
                            },
                            logError);
                    } else if (message.data.sdp.type === 'answer') {
                        pc.setRemoteDescription(new RTCSessionDescription(message.data.sdp));
                    }
                } else {
                    pc.addIceCandidate(new RTCIceCandidate(message.data.candidate));
                }
            }
        }
    }

}


function call(user) {

    remoteUser = user;
    startRTC();
    pc.addStream(localStream);
    console.log('Sending offer to peer');
    pc.createOffer(localDescCreated, logError);
}

function localDescCreated(desc) {
    pc.setLocalDescription(desc, function() {
        // ici en voyé un obj {type: offer, dest: B, data: desc}
        sendMessage({
            type: "rtc",
            dest: remoteUser,
            data: {
                'sdp': desc
            }
        });
    }, logError);
};

function startRTC() {
    try {
        pc = new RTCPeerConnection(configuration);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }


}

//adding localStream
function getStream(stream) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
}

// send any ice candidates to the other peer
function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: "rtc",
            dest: remoteUser,
            data: {
                'candidate': event.candidate
            }
        });
    } else {
        console.log('End of candidates.');
    }
}

//add remote stream to remoteVideo element
function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

//called when socket open i.e after a succesful connection

function logError(error) {
    console.log(error.name + ': ' + error.message);
}

function sendMessage(payload) {
    sock.send(JSON.stringify(payload));
}


// Contains functions for Mute mic, Disable camera and hang up call.

document.getElementById("dropCall").addEventListener('click', () =>{
    console.log("Hanging up...");
    pc.close();
    pc = null;
    document.getElementById("dropCall").disabled = true;
    localStream.getTracks().forEach(function(track) {
        track.stop();
      });
      
});



