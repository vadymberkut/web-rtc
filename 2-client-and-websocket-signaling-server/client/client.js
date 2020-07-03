'use strict';

// Taken from, but replaced WebSocket tpo Socket.io
// https://github.com/eugenp/tutorials/tree/master/webrtc/src/main/resources/static

// https://socket.io/docs/emit-cheatsheet/

(async function() {

    //connecting to our signaling server 
    var socket = io('http://localhost:3000');
    socket.on('connect', async function(){
        console.log('socket.io connect.');
        console.log("Connected to the signaling server");
        // socket.send({message: 'test from client'});
        await initialize();
    });
    socket.on('event', function(data){
        console.log('socket.io event.', data);
    });
    socket.on('disconnect', function(){
        console.log('socket.io disconnect.');
    });
    socket.on('message', function(message){
        console.log('socket.io message.', message);
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

    let peerConnection;
    let dataChannel;
    let input = document.querySelector("#messageInput");
    let createOfferButtonEl = document.querySelector("#createOfferButton");
    let sendDataChannelMessageButtonEl = document.querySelector("#sendDataChannelMessageButton");

    createOfferButtonEl.addEventListener('click', function(e) {
        createOffer();
    });
    sendDataChannelMessageButtonEl.addEventListener('click', function(e) {
        sendDataChannelMessage();
    });


    async function initialize() {
        let configuration = null;

        peerConnection = new RTCPeerConnection(configuration, {
            optional : [{
                RtpDataChannels : true
            }],
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
        peerConnection.onicecandidateerror = function(event) {
            console.error('onicecandidateerror', event);
        };
        peerConnection.oniceconnectionstatechange = function(event) {
            console.log('oniceconnectionstatechange', event);
        };
        peerConnection.onicegatheringstatechange = function(event) {
            console.log('onicegatheringstatechange', event);
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

        // setup local streams
        const constraints = {'video': true, 'audio': true};
        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.querySelector('video#localVideo');
        videoElement.srcObject = localStream;

        let audioTracks = localStream.getAudioTracks();
        let videoTracks = localStream.getVideoTracks();
        if (audioTracks.length > 0) {
            console.log(`Using audio device: ${audioTracks[0].label}`);
        }
        if (videoTracks.length > 0) {
            console.log(`Using video device: ${videoTracks[0].label}`);
        }
        let audioTrack = audioTracks[0];
        let videoTrack = videoTracks[0];

        peerConnection.addTrack(audioTrack, localStream);
        peerConnection.addTrack(videoTrack, localStream);

        peerConnection.ontrack = function(event /* RTCTrackEvent */) {
            console.log("ontrack", event);
            let {streams, tracks} = event;
            if(event.streams.length === 0) {
                return;
            }

            let stream = event.streams[0];
            let videoElId = `id_${stream.id}`; // prepend with letters to handle case when id starts with number

            // create video element for remote stream
            let remoteVideosEl = document.querySelector('#remoteVideos');
            let videoEl = document.querySelector(`video#${videoElId}`);
            if(!videoEl) {
                console.log(`adding video for remote streamId ${videoElId}`);
                videoEl = document.createElement('video');
                videoEl.setAttribute('id', videoElId);
                videoEl.setAttribute('autoplay', '');
                videoEl.setAttribute('playsinline', '');
                videoEl.setAttribute('controls', 'false');
                videoEl.muted = true;
                videoEl.srcObject = stream;
                remoteVideosEl.appendChild(videoEl);
            }
        }

        // create offer
        createOffer();
    }

    function createOffer() {
        const offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
        };

        peerConnection.createOffer(offerOptions).then(function(offer) {
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

    function sendDataChannelMessage() {
        dataChannel.send(input.value);
        input.value = "";
    }


})();
