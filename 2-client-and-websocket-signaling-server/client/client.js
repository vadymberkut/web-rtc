'use strict';

// Taken from, but replaced WebSocket with Socket.io
// https://github.com/eugenp/tutorials/tree/master/webrtc/src/main/resources/static
// https://github.com/googlecodelabs/webrtc-web/blob/master/step-06/js/main.js

// https://socket.io/docs/emit-cheatsheet/

(async function() {

    //connecting to our signaling server 
    var socket = io('http://localhost:3000');

    
    socket.on('connect', async function(){
        console.log('socket.io connect. Connected to the signaling server.');
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

    let isCaller = false;
    let isCalee = false;

    let peerConnection;
    let dataChannel;
    let input = document.querySelector("#messageInput");
    let createOfferButtonEl = document.querySelector("#createOfferButton");
    let sendDataChannelMessageButtonEl = document.querySelector("#sendDataChannelMessageButton");

    let localVideoEl = document.getElementById('localVideo');
    let photoEl = document.getElementById('photo');
    let photoContext = photo.getContext('2d');
    let dataChannelMessagesEl = document.querySelector('#dataChannelMessages');
    let trailEl = document.getElementById('trail');
    let snapBtnEl = document.getElementById('snap');
    let sendBtnEl = document.getElementById('send');
    let snapAndSendBtnEl = document.getElementById('snapAndSend');

    let photoContextW;
    let photoContextH;

    createOfferButtonEl.addEventListener('click', function(e) {
        createOffer();
    });
    sendDataChannelMessageButtonEl.addEventListener('click', function(e) {
        sendDataChannelMessage();
    });

    snapBtnEl.addEventListener('click', () => snapPhoto(localVideoEl));
    sendBtnEl.addEventListener('click', sendPhoto);
    snapAndSendBtnEl.addEventListener('click', snapAndSend);

    async function initialize() {
        let configuration = null;

        peerConnection = new RTCPeerConnection(configuration);
        // peerConnection = new RTCPeerConnection(configuration, {
        //     optional : [{
        //         RtpDataChannels : true // looks like some olf stuff that prevents from sending bytes through data channel
        //     }],
        // });

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
        // called when data channel created by other peer
        peerConnection.ondatachannel = function(event) {
            console.log('ondatachannel:', event.channel);
            // for calee no need to create data channel
            if(isCalee) {
                dataChannel = event.channel;
                setupDataChannel();
            }
        };

        // setup local streams
        const constraints = {'video': true, 'audio': true};
        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideoEl.srcObject = localStream;
        localVideoEl.onloadedmetadata = function() {
            photoEl.width = photoContextW = localVideoEl.videoWidth;
            photoEl.height = photoContextH = localVideoEl.videoHeight;
            console.log('gotStream with width and height:', photoContextW, photoContextH);
        };

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
        //createOffer();
    }

    function createOffer() {
        isCaller = true;
        setupDataChannel();

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
        isCalee = true;
        setupDataChannel();

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

    function setupDataChannel() {
        let buffer;
        let bufferCount;

        if(isCaller) {
            dataChannel = peerConnection.createDataChannel("dataChannel", {
                reliable : true
            });
        }

        if(!dataChannel) {
            return;
        }

        dataChannel.onopen = function() {
            console.log('dataChannel onopen');
        };
        dataChannel.onclose = function() {
            console.log('dataChannel onclose');
        };
        dataChannel.onerror = function(error) {
            console.log("dataChannel Error occured on datachannel:", error);
        };
        // when we receive a message from the other peer, printing it on the console
        dataChannel.onmessage = function(event) {
            console.log("dataChannel message:", event.data);

            // let newElem = document.createElement('p');
            // newElem.innerText = event.data;
            // dataChannelMessagesEl.appendChild(newElem);

            if (typeof event.data === 'string') {
                buffer = window.buffer = new Uint8ClampedArray(parseInt(event.data));
                bufferCount = 0;
                console.log('Expecting a total of ' + buffer.byteLength + ' bytes');
                return;
            }

            var data = new Uint8ClampedArray(event.data);
            buffer.set(data, bufferCount);

            bufferCount += data.byteLength;
            console.log('count: ' + bufferCount);

            if (bufferCount === buffer.byteLength) {
                // we're done: all data chunks have been received
                console.log('Done. Rendering photo.');
                renderPhoto(buffer);
            }
        };
    }

    function snapPhoto(videoEl) {
        photoContext.drawImage(videoEl, 0, 0, photoEl.width, photoEl.height);
    }
      
    function sendPhoto() {
      // Split data channel message in chunks of this byte length.
      var CHUNK_LEN = 13000; // ~16KB
      console.log('width and height ', photoContextW, photoContextH);
      var img = photoContext.getImageData(0, 0, photoContextW, photoContextH);
      let len = img.data.byteLength;
      let n = len / CHUNK_LEN | 0;
      
      console.log('Sending a total of ' + len + ' byte(s)');
      
      if (!dataChannel) {
        console.error('Connection has not been initiated. Get two peers in the same room first');
        return;
      } else if (dataChannel.readyState === 'closed') {
        console.error('Connection was lost. Peer closed the connection.');
        return;
      }
      
      dataChannel.send(len);
      
      // split the photo and send in chunks
      for (var i = 0; i < n; i++) {
        var start = i * CHUNK_LEN,
        end = (i + 1) * CHUNK_LEN;
        console.log(start + ' - ' + (end - 1));
        let uint8ClampedArray = img.data.subarray(start, end); // Uint8ClampedArray
        let arrayBuffer = uint8ClampedArray.buffer; // ArrayBuffer

        // TODO - for some reason it fails when trying to send bytes, but sends strings
        dataChannel.send(arrayBuffer);
      }
      
      // send the reminder, if any
      if (len % CHUNK_LEN) {
        console.log('last ' + len % CHUNK_LEN + ' byte(s)');
        dataChannel.send(img.data.subarray(n * CHUNK_LEN));
      }
    }
    
    function snapAndSend() {
        snapPhoto();
        sendPhoto();
    }
    
    function renderPhoto(data) {
        var canvas = document.createElement('canvas');
        canvas.width = photoContextW;
        canvas.height = photoContextH;
        canvas.classList.add('incomingPhoto');
        // trail is the element holding the incoming images
        trailEl.insertBefore(canvas, trailEl.firstChild);
        
        var context = canvas.getContext('2d');
        var img = context.createImageData(photoContextW, photoContextH);
        img.data.set(data);
        context.putImageData(img, 0, 0);
    }

})();
