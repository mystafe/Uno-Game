import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

function App() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('lobby');
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState(null);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setId(socket.id));
    socket.on('state', st => setState(st));
    return () => {
      socket.off('connect');
      socket.off('state');
    };
  }, []);

  const join = () => {
    if (!name) return;
    socket.emit('join', { room, name });
    setJoined(true);
  };

  const start = () => {
    socket.emit('start', { room, ai });
  };

  const play = (card) => {
    socket.emit('play', { room, card });
  };

  const draw = () => {
    socket.emit('draw', { room });
  };

  if (!joined) {
    return (
      <div className="join">
        <h2>Join Game</h2>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Room" value={room} onChange={e => setRoom(e.target.value)} />
        <label>
          <input type="checkbox" checked={ai} onChange={e => setAi(e.target.checked)} />
          Add Computer
        </label>
        <button onClick={join}>Join</button>
      </div>
    );
  }

  if (!state || !state.started) {
    return (
      <div className="lobby">
        <h2>Room: {room}</h2>
        <ul>
          {state?.players.map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <button onClick={start}>Start</button>
      </div>
    );
  }

  const me = state.players.find(p => p.id === id) || { hand: [] };
  const myTurn = state.current === id;

  return (
    <div className="game">
      <h2>Top Card: {state.top.color} {state.top.value}</h2>
      <h3>Your hand {myTurn ? '(Your turn)' : ''}</h3>
      <div className="hand">
        {me.hand.map((c, idx) => (
          <button key={idx} className={`card ${c.color}`} onClick={() => play(c)}>
            {c.color} {c.value}
          </button>
        ))}
      </div>
      <button onClick={draw}>Draw</button>
      <h3>Players</h3>
      <ul>
        {state.players.map(p => (
          <li key={p.id}>{p.name}: {p.hand.length} cards</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
