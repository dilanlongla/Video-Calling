var configuration = {
    'iceServers': [{
        'url': 'stun:stun2.l.google.com:19302' //free google STUN server
    }]
};
var pc; //RTCPeerConnection
var peer;

var mediaConstraints = {
    audio: true, // We want an audio track
    video: true // ...and we want a video track
};

function logError(error) {
    console.log(error.name + ': ' + error.message);
}

function connect(username) {
    console.log('connect');

    var loc = window.location;
    var uri = "wss://" + loc.hostname + "/signal";
    sock = new WebSocket(uri);

    sock.onopen = function(e) {
        console.log('open', e);
        sock.send(
            JSON.stringify({
                type: "login",
                data: username
            })
        );
        // should check better here, it could have failed
        // moreover not logout implemented
    }

    sock.onclose = function(e) {
        console.log('close', e);
    }

    sock.onerror = function(e) {
        console.log('error', e);
    }

    sock.onmessage = function(e) {
        console.log('message', e.data);
        if (!pc) {
            startRTC();
        }

        var message = JSON.parse(e.data);
        if (message.type === 'rtc') {
            if (message.data.sdp) {
                pc.setRemoteDescription(
                    new RTCSessionDescription(message.data.sdp),
                    function() {
                        // if we received an offer, we need to answer
                        if (pc.remoteDescription.type == 'offer') {
                            peer = message.dest;
                            pc.createAnswer(localDescCreated, logError);
                        }
                    },
                    logError);
            } else {
                pc.addIceCandidate(new RTCIceCandidate(message.data.candidate));
            }
        }
    }
}

function offer(dest) {
    peer = dest;
    pc.createOffer(localDescCreated, logError);
}

function localDescCreated(desc) {
    pc.setLocalDescription(desc, function() {
        // ici en voyé un obj {type: offer, dest: B, data: desc}
        sendMessage({
            type: "rtc",
            dest: peer,
            data: {
                'sdp': desc
            }
        });
    }, logError);
};

function startRTC() {
    pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function(evt) {
        if (evt.candidate) {
            sendMessage({
                type: "rtc",
                dest: peer,
                data: {
                    'candidate': evt.candidate
                }
            });
        }
    };

    // once remote stream arrives, show it in the remote video element
    pc.onaddstream = function(evt) {
        document.querySelector('video#remoteView').srcObject = evt.stream
    };

    // get a local stream, show it in a self-view and add it to be sent
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(function(localStream) {
            document.querySelector('video#selfView').srcObject = localStream;
            pc.addStream(localStream);
        });
}

function sendMessage(payload) {
    sock.send(JSON.stringify(payload));
}