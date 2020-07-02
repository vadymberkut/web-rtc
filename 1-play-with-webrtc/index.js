
(async function() {

    const openMediaDevices = async (constraints) => {
        return await navigator.mediaDevices.getUserMedia(constraints);
    }

    // Fetch an array of devices of a certain type
    async function getConnectedDevices(type) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === type)
    }

    // Updates the select element with the provided set of cameras
    function updateCameraList(cameras) {
        const listElement = document.querySelector('select#availableCameras');
        listElement.innerHTML = '';
        cameras.map(camera => {
            const cameraOption = document.createElement('option');
            cameraOption.label = `(${camera.kind}) ${camera.label}`;
            cameraOption.value = camera.deviceId;
            return cameraOption;
        }).forEach(cameraOption => listElement.add(cameraOption));
    }

    async function playVideoFromCamera() {
        try {
            const constraints = {'video': true, 'audio': false};
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const videoElement = document.querySelector('video#localVideo');
            videoElement.srcObject = stream;
        } catch(error) {
            console.error('Error opening video camera.', error);
        }
    }
    
    try {
        // const stream = await openMediaDevices({'video':true,'audio':false});
        // console.log('Got MediaStream:', stream);

        // Get the initial set of cameras connected
        const videoCameras = await getConnectedDevices('videoinput');
        console.log('videoCameras', videoCameras);
        updateCameraList(videoCameras);

        // Listen for changes to media devices and update the list accordingly
        navigator.mediaDevices.addEventListener('devicechange', event => {
            const newCameraList = getConnectedDevices('video');
            updateCameraList(newCameraList);
        });

        await playVideoFromCamera();
    } catch(error) {
        console.error('Error accessing media devices.', error);
    }

})();
