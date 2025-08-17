const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Game = require('./uno');
const { version } = require('./package.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const games = {};

const getLobbies = () =>
  Object.entries(games).map(([name, game]) => ({ name, started: game.started }));

io.on('connection', socket => {
  // send current lobbies on connect
  socket.emit('lobbies', getLobbies());

  socket.on('join', ({ room, name, create }) => {
    if (create) {
      if (games[room]) return socket.emit('joinError', 'exists');
      games[room] = new Game(room);
    } else if (!games[room]) {
      return socket.emit('joinError', 'notfound');
    }

    const game = games[room];
    const existing = game.players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing && existing.id) {
      return socket.emit('joinError', 'nameTaken');
    }
    if (!game.addPlayer(socket.id, name)) {
      if (game.started) {
        game.addSpectator(socket.id, name);
      } else {
        return socket.emit('joinError', 'notfound');
      }
    }
    socket.join(room);
    io.to(room).emit('state', game.getState());
    io.emit('lobbies', getLobbies());
  });

  socket.on('start', ({ room, ai }) => {
    const game = games[room];
    if (game && game.start(ai)) {
      io.to(room).emit('state', game.getState());
      io.emit('lobbies', getLobbies());
      game.checkAI(io, room);
    }
  });

  socket.on('play', ({ room, card, target }) => {
    const game = games[room];
    const result = game && game.play(socket.id, card, target);
    if (result === true) {
      io.to(room).emit('state', game.getState());
      game.checkAI(io, room);
      if (!game.started) io.emit('lobbies', getLobbies());
    } else if (result === 'specialFinish') {
      socket.emit('actionError', 'specialFinish');
    }
  });

  socket.on('draw', ({ room }) => {
    const game = games[room];
    if (game && game.draw(socket.id)) {
      io.to(room).emit('state', game.getState());
      game.checkAI(io, room);
      if (!game.started) io.emit('lobbies', getLobbies());
    }
  });

  socket.on('leave', ({ room }) => {
    const game = games[room];
    if (game) {
      if (game.replaceWithAI(socket.id)) {
        socket.leave(room);
        io.to(room).emit('state', game.getState());
        game.checkAI(io, room);
      } else {
        game.removeSpectator(socket.id);
        socket.leave(room);
        io.to(room).emit('state', game.getState());
      }
    }
    io.emit('lobbies', getLobbies());
  });

  socket.on('disconnect', () => {
    Object.keys(games).forEach(room => {
      const game = games[room];
      game.disconnectPlayer(socket.id);
      game.removeSpectator(socket.id);
      if (game.isEmpty()) {
        delete games[room];
      } else {
        io.to(room).emit('state', game.getState());
        game.checkAI(io, room);
      }
    });
    io.emit('lobbies', getLobbies());
  });

  socket.on('chat', ({ room, name, message }) => {
    io.to(room).emit('chat', { name, message });
  });

  socket.on('emptyRooms', () => {
    Object.keys(games).forEach(r => {
      io.to(r).emit('state', { started: false, players: [], spectators: [], current: null, top: null, winner: null });
      delete games[r];
    });
    io.emit('lobbies', getLobbies());
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server v${version} listening on ${PORT}`));
