import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Use a configurable server URL to support both local and deployed environments
const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(serverUrl);

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
    roomExists: 'Room already exists',
    roomNotFound: 'Room not found',
    invalidMove: 'Invalid move',
    notYourTurn: 'Not your turn',
    nameTaken: 'Name already used',
    chooseColor: 'Choose a color',
    sort: 'Sort Cards',
    colors: { red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Blue', wild: 'Wild' },
    values: { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw 2', wild: 'Wild', wild4: 'Wild +4' },
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
    roomExists: 'Oda zaten mevcut',
    roomNotFound: 'Oda bulunamadı',
    invalidMove: 'Geçersiz hamle',
    notYourTurn: 'Sıra sizde değil',
    nameTaken: 'Bu isim zaten kullanılıyor',
    chooseColor: 'Renk seçin',
    sort: 'Kartları sırala',
    colors: { red: 'Kırmızı', yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', wild: 'Özel' },
    values: { skip: 'Atla', reverse: 'Yön Değiştir', draw2: 'Çek 2', wild: 'Joker', wild4: 'Çek 4 Joker' },
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
  const [hand, setHand] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [lobbies, setLobbies] = useState([]);
  const [toast, setToast] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const colorOrder = ['red', 'yellow', 'green', 'blue', 'wild'];
  const COLORS = ['red', 'yellow', 'green', 'blue'];
  const [colorPicker, setColorPicker] = useState(null);

  const myTurn = state?.current === id;

  const t = useCallback((key) => translations[lang][key] || key, [lang]);
  const colorText = (color) => translations[lang].colors[color] || color;
  const valueText = (value) => translations[lang].values[value] || value;
  const cardIcons = {
    skip: '🚫',
    reverse: '🔁',
    draw2: '+2',
    wild: '🌈',
    wild4: '🌈+4',
  };
  const displayValue = (val) => cardIcons[val] ? `${cardIcons[val]} ${valueText(val)}` : valueText(val);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const joinErrorHandler = msg => {
      if (msg === 'exists') showToast(t('roomExists'));
      else if (msg === 'nameTaken') showToast(t('nameTaken'));
      else showToast(t('roomNotFound'));
      setJoined(false);
    };
    socket.on('connect', () => setId(socket.id));
    socket.on('state', st => {
      setState(st);
      setActionPending(false);
    });
    socket.on('lobbies', setLobbies);
    socket.on('joinError', joinErrorHandler);
    return () => {
      socket.off('connect');
      socket.off('state');
      socket.off('lobbies');
      socket.off('joinError', joinErrorHandler);
    };
  }, [lang, t]);

  useEffect(() => {
    const me = state?.players.find(p => p.id === id);
    setHand(me ? [...me.hand] : []);
  }, [state, id]);

  const joinLobby = (r) => {
    if (!name) return;
    setRoom(r);
    socket.emit('join', { room: r, name });
    setJoined(true);
  };

  const createLobby = () => {
    if (!name || !room) return;
    socket.emit('join', { room, name, create: true });
    setJoined(true);
  };

  const start = () => {
    socket.emit('start', { room, ai });
  };

  const performPlay = (card, idx) => {
    setActionPending(true);
    setPlayingIndex(idx);
    setHand(h => {
      const newHand = [...h];
      newHand.splice(idx, 1);
      return newHand;
    });
    setTimeout(() => {
      socket.emit('play', { room, card });
      setPlayingIndex(null);
    }, 400);
  };

  const play = (card, idx) => {
    if (!myTurn) {
      showToast(t('notYourTurn'));
      return;
    }
    if (actionPending) return;
    const top = state.top;
    const canPlay = card.color === 'wild' || card.color === top.color || card.value === top.value;
    if (!canPlay) {
      showToast(t('invalidMove'));
      return;
    }
    if (card.color === 'wild') {
      setColorPicker({ card, idx });
      return;
    }
    performPlay(card, idx);
  };

  const chooseColor = (color) => {
    if (!colorPicker) return;
    const { card, idx } = colorPicker;
    setColorPicker(null);
    performPlay({ ...card, chosenColor: color }, idx);
  };

  const sortHand = () => {
    setHand(h => [...h].sort((a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color)));
  };

  const draw = () => {
    if (!myTurn) {
      showToast(t('notYourTurn'));
      return;
    }
    if (actionPending) return;
    setActionPending(true);
    socket.emit('draw', { room });
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDrop = (index) => {
    if (dragIndex === null) return;
    const newHand = [...hand];
    const [moved] = newHand.splice(dragIndex, 1);
    newHand.splice(index, 0, moved);
    setHand(newHand);
    setDragIndex(null);
  };

  let content;
  if (!joined) {
    content = (
      <div className="join">
        <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
          <option value="tr">Türkçe</option>
          <option value="en">İngilizce</option>
        </select>
        <h2>{t('joinGame')}</h2>
        <input placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} />
        <h3>Aktif Lobbiler</h3>
        <ul className="lobbies">
          {lobbies.map(l => (
            <li key={l.name}>
              {l.name} {l.started ? '(başladı)' : ''}
              <button onClick={() => joinLobby(l.name)}>{l.started ? 'İzle' : 'Katıl'}</button>
            </li>
          ))}
        </ul>
        <h3>Yeni Lobby</h3>
        <input placeholder={t('room')} value={room} onChange={e => setRoom(e.target.value)} />
        <button onClick={createLobby}>Oluştur</button>
      </div>
    );
  } else if (!state || !state.started) {
    content = (
      <div className="lobby">
        <h2>{t('roomHeading')}: {room}</h2>
        <ul>
          {state?.players.map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <label>
          <input type="checkbox" checked={ai} onChange={e => setAi(e.target.checked)} />
          {t('addComputer')}
        </label>
        <button onClick={start}>{t('start')}</button>
      </div>
    );
  } else {
    content = (
      <div className="game">
        <h2>{t('topCard')}: {colorText(state.top.color)} {displayValue(state.top.value)}</h2>
        <h3>{t('turn')}: {state.players.find(p => p.id === state.current)?.name}</h3>
        <h3>{t('yourHand')} {myTurn ? t('yourTurn') : ''}</h3>
        <div className="hand">
          {hand.map((c, idx) => (
            <button
              key={idx}
              className={`card ${c.color} ${playingIndex === idx ? 'playing' : ''}`}
              onClick={() => play(c, idx)}
              disabled={!myTurn || actionPending}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              aria-label={`${colorText(c.color)} ${valueText(c.value)}`}
            >
              {cardIcons[c.value] || c.value}
              <span className="tooltip">{`${colorText(c.color)} ${displayValue(c.value)}`}</span>
            </button>
          ))}
        </div>
        <button onClick={draw} disabled={!myTurn || actionPending}>{t('draw')}</button>
        <button onClick={sortHand}>{t('sort')}</button>
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
  return (
    <>
      <header className="app-header">
        <h1 className="app-title" title="0.2.1">{lang === 'tr' ? 'Uno Oyunu' : 'Uno Game'}</h1>
      </header>
      {content}
      {colorPicker && (
        <div className="color-picker">
          <p>{t('chooseColor')}</p>
          <div className="color-options">
            {COLORS.map(c => (
              <button key={c} className={`color-btn ${c}`} onClick={() => chooseColor(c)}>
                {colorText(c)}
              </button>
            ))}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      <footer className="app-footer">Mustafa Evleksiz tarafından geliştirilmiştir</footer>
    </>
  );
}

export default App;
