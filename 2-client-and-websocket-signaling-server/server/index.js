
// https://www.npmjs.com/package/socket.io
const server = require('http').createServer();
const io = require('socket.io')(server);
io.on('connection', socket => {
    console.log('socket.io connected.');

    socket.on('event', data => { 
        console.log('socket.io event.', data);
    });
    socket.on('disconnect', () => { 
        console.log('socket.io disconnected.');
    });

    // handle the event sent with socket.send()
    socket.on('message', (message) => {
        console.log('message', message);
        let {event, data} = message;
        
        // send to all except the sender
        socket.broadcast.send(message);
    });

    socket.send({message: 'test from server'});
});

const port = 3000;
server.listen(port);
console.log(`Listening on http://localhost:${port}...`);

