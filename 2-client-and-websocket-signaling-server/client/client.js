
// Taken from, but replaced WebSocket tpo Socket.io
// https://github.com/eugenp/tutorials/tree/master/webrtc/src/main/resources/static

//connecting to our signaling server 
var socket = io('http://localhost:3000');
socket.on('connect', function(){
    console.log('socket.io connect.');
    console.log("Connected to the signaling server");
    socket.send({message: 'test from client'});
    initialize();
});
socket.on('event', function(data){
    console.log('socket.io event.', data);
});
socket.on('disconnect', function(){
    console.log('socket.io disconnect.');
});
socket.on('message', function(message){
    console.log('socket.io message.', message);
    console.log("Got message", message);
    let {event, data} = message;
    switch (event) {
        // when somebody wants to call us
        case "offer":
            handleOffer(data);
            break;
        case "answer":
            handleAnswer(data);
            break;
        // when a remote peer sends an ice candidate to us
        case "candidate":
            handleCandidate(data);
            break;
        default:
            break;
    }
});

function send(message) {
    socket.send(message);
}

var peerConnection;
var dataChannel;
var input = document.getElementById("messageInput");

function initialize() {
    var configuration = null;

    peerConnection = new RTCPeerConnection(configuration, {
        optional : [ {
            RtpDataChannels : true
        } ]
    });

    // Setup ice handling
    peerConnection.onicecandidate = function(event) {
        console.log('onicecandidate', event);
        if (event.candidate) {
            send({
                event : "candidate",
                data : event.candidate
            });
        }
    };

    // creating data channel
    dataChannel = peerConnection.createDataChannel("dataChannel", {
        reliable : true
    });

    dataChannel.onerror = function(error) {
        console.log("dataChannel Error occured on datachannel:", error);
    };

    // when we receive a message from the other peer, printing it on the console
    dataChannel.onmessage = function(event) {
        console.log("dataChannel message:", event.data);

        let elem = document.querySelector('#dataChannelMessages');
        let newElem = document.createElement('p');
        newElem.innerText = event.data;
        elem.appendChild(newElem);
    };

    dataChannel.onclose = function() {
        console.log("dataChannel is closed");
    };
}

function createOffer() {
    peerConnection.createOffer(function(offer) {
        send({
            event : "offer",
            data : offer
        });
        peerConnection.setLocalDescription(offer);
    }, function(error) {
        alert("Error creating an offer");
    });
}

function handleOffer(offer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // create and send an answer to an offer
    peerConnection.createAnswer(function(answer) {
        peerConnection.setLocalDescription(answer);
        send({
            event : "answer",
            data : answer
        });
    }, function(error) {
        alert("Error creating an answer");
    });

};

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("connection established successfully!!");
};

function sendMessage() {
    dataChannel.send(input.value);
    input.value = "";
}
