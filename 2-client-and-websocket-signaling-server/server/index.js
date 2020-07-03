'use strict';

// https://www.npmjs.com/package/socket.io
// https://socket.io/docs/emit-cheatsheet/
var os = require('os');
const server = require('http').createServer();
const io = require('socket.io')(server);

io.on('connection', socket => {
    console.log('socket.io connected.');

    // convenience function to log server messages on the client
    function log() {
        console.log.apply(console, arguments);
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('event', data => { 
        console.log('socket.io event.', data);
    });
    socket.on('disconnect', () => { 
        console.log('socket.io disconnected.');
    });

    // handle the event sent with socket.send()
    socket.on('message', (message) => {
        console.log('message', message.event);
        let {event, data} = message;
        
        // send to all except the sender
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.send(message);
    });

    socket.on('createOrJoin', function(room) {
        log('Received request to create or join room ' + room);
    
        var clientsInRoom = io.sockets.adapter.rooms[room];
        var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log('Room ' + room + ' now has ' + numClients + ' client(s)');
    
        if (numClients === 0) {
          socket.join(room);
          log('Client ID ' + socket.id + ' created room ' + room);
          socket.emit('roomCreated', room, socket.id);

        } else if (numClients === 1) {
          log('Client ID ' + socket.id + ' joined room ' + room);
          io.sockets.in(room).emit('join', room);
          socket.join(room);
          socket.emit('rooJoined', room, socket.id);
          io.sockets.in(room).emit('roomReady');

        } else { // max two clients
          socket.emit('roomFull', room);
        }
      });

      socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              socket.emit('ipaddr', details.address);
            }
          });
        }
      });
    
      socket.on('bye', function(){
        console.log('received bye');
      });

    // socket.send({message: 'test from server'});
});

const port = 3000;
server.listen(port);
console.log(`Listening on http://localhost:${port}...`);

