// Contains functions for Mute mic, Disable camera and hang up call.

document.getElementById("dropCall").addEventListener('click', () =>{
    RTCPeerConnection.close();
    console.log("Hanging up...");
});
