const socketIO = require('socket.io');

var io,
  guestNumber = 1,
  nickNames = {},
  namesUsed = [],
  currentRoom = {};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = `Guest ${guestNumber}`;

  nickNames[socket.id] = name;

  socket.emit('nameResult', {
    success: true,
    name: name
  });

  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;

  socket.emit('joinResult', { room: room });
  socket.broadcast.to(room).emit('message', {
    text: `${nickNames[socket.id]} has joined ${room}.`
  });

  var usersInRoom = io.sockets.clients(room);

  if (usersInRoom.length > 1) {
    var usersInRoomSummary = `Users currently in ${room}: `;

    for (let index in usersInRoom) {
      var usersSocketID = usersInRoom[index].id;

      if (usersSocketID != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[usersSocketID];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', { text: usersInRoomSummary });
  }
}

function handleNameChangeAttempt(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function(name) {
    if (name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin w/ "Guest".'
      });
    } else {
      if (namesUsed.indexOf(name) == -1) {
        var previousName = nickNames[socket.id];
        var previousNameIdx = namesUsed.indexOf(previousName);

        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIdx];

        socket.emit('nameResult', {
          success: true,
          name: name
        });

        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: `${previousName} is now known as ${name}.`
        });
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use'
        });
      }
    }
  });
}

function handleMessageBroadcast(socket) {
  socket.on('message', function(message) {
    socket.broadcast.to(message.room).emit('message', {
      text: `${nickNames[socket.id]}: ${message.text}`
    });
  });
}

function handleRoomJoin(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnect(socket) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}

exports.listen = function(server) {
  io = socketIO.listen(server);
  io.set('log level', 1);

  io.sockets.on('connection', function(socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, 'Lobby');

    handleMessageBroadcast(socket, nickNames);
    handleNameChangeAttempt(socket, nickNames, namesUsed);
    handleRoomJoin(socket);

    socket.on('rooms', function() {
      socket.emit('rooms', io.sockets.manager.roooms);
    });

    handleClientDisconnect(socket, nickNames, namesUsed);
  });
};
