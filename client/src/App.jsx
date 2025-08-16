import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

const translations = {
  en: {
    joinGame: 'Join Game',
    name: 'Name',
    room: 'Room',
    addComputer: 'Add Computer',
    join: 'Join',
    roomHeading: 'Room',
    start: 'Start',
    topCard: 'Top Card',
    yourHand: 'Your hand',
    yourTurn: '(Your turn)',
    draw: 'Draw',
    players: 'Players',
    turn: 'Turn',
    cards: 'cards',
  },
  tr: {
    joinGame: 'Oyuna Katıl',
    name: 'İsim',
    room: 'Oda',
    addComputer: 'Bilgisayar Ekle',
    join: 'Katıl',
    roomHeading: 'Oda',
    start: 'Başlat',
    topCard: 'Üst Kart',
    yourHand: 'Eliniz',
    yourTurn: '(Sıra sizde)',
    draw: 'Kart Çek',
    players: 'Oyuncular',
    turn: 'Sıra',
    cards: 'kart',
  },
};

function App() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('lobby');
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState(null);
  const [ai, setAi] = useState(false);
  const [lang, setLang] = useState('tr');
  const [playingIndex, setPlayingIndex] = useState(null);

  const t = (key) => translations[lang][key] || key;

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

  const play = (card, idx) => {
    setPlayingIndex(idx);
    setTimeout(() => {
      socket.emit('play', { room, card });
      setPlayingIndex(null);
    }, 300);
  };

  const draw = () => {
    socket.emit('draw', { room });
  };

  if (!joined) {
    return (
      <div className="join">
        <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
        </select>
        <h2>{t('joinGame')}</h2>
        <input placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} />
        <input placeholder={t('room')} value={room} onChange={e => setRoom(e.target.value)} />
        <label>
          <input type="checkbox" checked={ai} onChange={e => setAi(e.target.checked)} />
          {t('addComputer')}
        </label>
        <button onClick={join}>{t('join')}</button>
      </div>
    );
  }

  if (!state || !state.started) {
    return (
      <div className="lobby">
        <h2>{t('roomHeading')}: {room}</h2>
        <ul>
          {state?.players.map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <button onClick={start}>{t('start')}</button>
      </div>
    );
  }

  const me = state.players.find(p => p.id === id) || { hand: [] };
  const myTurn = state.current === id;

  return (
    <div className="game">
      <h2>{t('topCard')}: {state.top.color} {state.top.value}</h2>
      <h3>{t('turn')}: {state.players.find(p => p.id === state.current)?.name}</h3>
      <h3>{t('yourHand')} {myTurn ? t('yourTurn') : ''}</h3>
      <div className="hand">
        {me.hand.map((c, idx) => (
          <button
            key={idx}
            className={`card ${c.color} ${playingIndex === idx ? 'playing' : ''}`}
            onClick={() => play(c, idx)}
            style={{ backgroundImage: `url(/cards/${c.color}_${c.value}.svg)` }}
          >
            <span className="sr-only">{c.color} {c.value}</span>
          </button>
        ))}
      </div>
      <button onClick={draw}>{t('draw')}</button>
      <h3>{t('players')}</h3>
      <ul className="players">
        {state.players.map(p => (
          <li key={p.id} className={state.current === p.id ? 'current' : ''}>
            {p.name}: {p.hand.length} {t('cards')}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
