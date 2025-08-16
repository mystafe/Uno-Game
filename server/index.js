const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Game = require('./uno');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const games = {};

io.on('connection', socket => {
  socket.on('join', ({ room, name }) => {
    if (!games[room]) {
      games[room] = new Game(room);
    }
    games[room].addPlayer(socket.id, name);
    socket.join(room);
    io.to(room).emit('state', games[room].getState());
  });

  socket.on('start', ({ room, ai }) => {
    const game = games[room];
    if (game) {
      game.start(ai);
      io.to(room).emit('state', game.getState());
      game.checkAI(io, room);
    }
  });

  socket.on('play', ({ room, card }) => {
    const game = games[room];
    if (game && game.play(socket.id, card)) {
      io.to(room).emit('state', game.getState());
      game.checkAI(io, room);
    }
  });

  socket.on('draw', ({ room }) => {
    const game = games[room];
    if (game) {
      game.draw(socket.id);
      io.to(room).emit('state', game.getState());
      game.checkAI(io, room);
    }
  });

  socket.on('disconnect', () => {
    Object.keys(games).forEach(room => {
      const game = games[room];
      game.removePlayer(socket.id);
      if (game.isEmpty()) {
        delete games[room];
      } else {
        io.to(room).emit('state', game.getState());
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
