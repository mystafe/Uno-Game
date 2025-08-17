import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import pkg from '../package.json';

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
    noSpecialFinish: 'You cannot finish with a special card',
    colors: { red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Blue', wild: 'Wild' },
    values: { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw 2', wild: 'Wild', wild4: 'Wild +4', swap: 'Swap Hands' },
    viewing: 'Viewing',
    follow: 'Follow turn',
    leave: 'Leave Game',
    started: 'started',
    watch: 'Watch',
    newLobby: 'New Lobby',
    create: 'Create',
    developedBy: 'Developed by Mustafa Evleksiz',
    english: 'English',
    turkish: 'Turkish',
    winner: 'Winner',
    wins: 'wins!',
    choosePlayer: 'Choose a player',
    activeLobbies: 'Active Lobbies',
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
    noSpecialFinish: 'Özel kart ile oyunu bitiremezsiniz',
    colors: { red: 'Kırmızı', yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', wild: 'Özel' },
    values: { skip: 'Atla', reverse: 'Yön Değiştir', draw2: 'Çek 2', wild: 'Joker', wild4: 'Çek 4 Joker', swap: 'El Değiştir' },
    viewing: 'İzlenen',
    follow: 'Sıradakini izle',
    leave: 'Oyundan Ayrıl',
    started: 'başladı',
    watch: 'İzle',
    newLobby: 'Yeni Lobby',
    create: 'Oluştur',
    developedBy: 'Mustafa Evleksiz tarafından geliştirilmiştir',
    english: 'İngilizce',
    turkish: 'Türkçe',
    winner: 'Kazanan',
    wins: 'kazandı!',
    choosePlayer: 'Bir oyuncu seçin',
    activeLobbies: 'Aktif Lobbiler',
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
  const [swapPicker, setSwapPicker] = useState(null);
  const [watching, setWatching] = useState(null);
  const [follow, setFollow] = useState(true);
  const [sorted, setSorted] = useState(false);

  const myTurn = state?.current === id;
  const spectator = state ? !state.players.some(p => p.id === id) : false;

  const t = useCallback((key) => translations[lang][key] || key, [lang]);
  const colorText = (color) => translations[lang].colors[color] || color;
  const valueText = (value) => translations[lang].values[value] || value;
  const cardIcons = {
    skip: '🚫',
    reverse: '🔁',
    draw2: '+2',
    wild: '🌈',
    wild4: '🌈+4',
    swap: '🔄',
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
    const actionErrorHandler = msg => {
      if (msg === 'specialFinish') showToast(t('noSpecialFinish'));
      else showToast(t('invalidMove'));
      setActionPending(false);
    };
    socket.on('actionError', actionErrorHandler);
    return () => {
      socket.off('connect');
      socket.off('state');
      socket.off('lobbies');
      socket.off('joinError', joinErrorHandler);
      socket.off('actionError', actionErrorHandler);
    };
  }, [lang, t]);

  useEffect(() => {
    if (spectator) {
      if (follow) setWatching(state?.current || null);
    } else {
      const me = state?.players.find(p => p.id === id);
      if (me) {
        if (sorted) {
          setHand(h => {
            const serverHand = [...me.hand];
            const existing = [...h];
            const counts = serverHand.map(c => JSON.stringify(c));
            const result = [];
            existing.forEach(card => {
              const key = JSON.stringify(card);
              const idx = counts.indexOf(key);
              if (idx !== -1) {
                result.push(card);
                counts[idx] = null;
              }
            });
            counts.forEach((key, idx) => {
              if (key !== null) result.push(serverHand[idx]);
            });
            return result;
          });
        } else {
          setHand([...me.hand]);
        }
      }
    }
  }, [state, id, spectator, follow, sorted]);

  const joinLobby = (r) => {
    if (!name) return;
    setRoom(r);
    socket.emit('join', { room: r, name });
    localStorage.setItem('unoGame', JSON.stringify({ room: r, name }));
    setJoined(true);
    setSorted(false);
  };

  const createLobby = () => {
    if (!name || !room) return;
    socket.emit('join', { room, name, create: true });
    localStorage.setItem('unoGame', JSON.stringify({ room, name }));
    setJoined(true);
    setSorted(false);
  };

  const start = () => {
    socket.emit('start', { room, ai });
  };

  const performPlay = (card, idx, target) => {
    setActionPending(true);
    setPlayingIndex(idx);
    setHand(h => {
      const newHand = [...h];
      newHand.splice(idx, 1);
      return newHand;
    });
    setTimeout(() => {
      socket.emit('play', { room, card, target });
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
    if (hand.length === 1 && typeof card.value !== 'number') {
      showToast(t('noSpecialFinish'));
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
    if (card.value === 'swap') {
      setSwapPicker({ card: { ...card, chosenColor: color }, idx });
    } else {
      performPlay({ ...card, chosenColor: color }, idx);
    }
  };

  const chooseSwapTarget = (targetId) => {
    if (!swapPicker) return;
    const { card, idx } = swapPicker;
    setSwapPicker(null);
    performPlay(card, idx, targetId);
  };

  const sortHand = () => {
    setHand(h => [...h].sort((a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color)));
    setSorted(true);
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

  const leaveGame = () => {
    socket.emit('leave', { room });
    localStorage.removeItem('unoGame');
    setJoined(false);
    setState(null);
    setSorted(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem('unoGame');
    if (saved) {
      try {
        const { room: savedRoom, name: savedName } = JSON.parse(saved);
        setName(savedName);
        setRoom(savedRoom);
        socket.emit('join', { room: savedRoom, name: savedName });
        setJoined(true);
      } catch {
        // ignore parsing errors
      }
    }
  }, []);

  const viewingPlayer = spectator
    ? state?.players.find(p => p.id === watching)
    : state?.players.find(p => p.id === id);
  const displayHand = spectator ? viewingPlayer?.hand || [] : hand;

  let content;
  if (!joined) {
    content = (
      <div className="join">
        <select className="lang-select" value={lang} onChange={e => setLang(e.target.value)}>
          <option value="tr">{t('turkish')}</option>
          <option value="en">{t('english')}</option>
        </select>
        <h2>{t('joinGame')}</h2>
        <input placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} />
        <h3>{t('activeLobbies')}</h3>
        <ul className="lobbies">
          {lobbies.map(l => (
            <li key={l.name}>
              {l.name} {l.started ? `(${t('started')})` : ''}
              <button onClick={() => joinLobby(l.name)}>{l.started ? t('watch') : t('join')}</button>
            </li>
          ))}
        </ul>
        <h3>{t('newLobby')}</h3>
        <input placeholder={t('room')} value={room} onChange={e => setRoom(e.target.value)} />
        <button onClick={createLobby}>{t('create')}</button>
      </div>
    );
  } else if (!state || !state.started) {
    content = (
      <div className="lobby">
        <h2>{t('roomHeading')}: {room}</h2>
        {state?.winner && <h3>{t('winner')}: {state.players.find(p => p.id === state.winner)?.name}</h3>}
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
        <div className="top-area">
          <h2>{t('topCard')}</h2>
          <div
            className={`card ${state.top.color} small`}
            aria-label={`${colorText(state.top.color)} ${valueText(state.top.value)}`}
          >
            {cardIcons[state.top.value] || state.top.value}
          </div>
          <span className="top-label">{colorText(state.top.color)} {displayValue(state.top.value)}</span>
        </div>
        <h3>{t('turn')}: {state.players.find(p => p.id === state.current)?.name}</h3>
        {spectator ? (
          <>
            <h3>{t('viewing')}: {viewingPlayer?.name}</h3>
            {!follow && <button onClick={() => setFollow(true)}>{t('follow')}</button>}
          </>
        ) : (
          <h3>{t('yourHand')} {myTurn ? t('yourTurn') : ''}</h3>
        )}
        <div className="hand">
          {displayHand.map((c, idx) => (
            <button
              key={idx}
              className={`card ${c.color} ${playingIndex === idx ? 'playing' : ''}`}
              onClick={spectator ? undefined : () => play(c, idx)}
              disabled={spectator || !myTurn || actionPending}
              draggable={!spectator}
              onDragStart={spectator ? undefined : () => onDragStart(idx)}
              onDragOver={spectator ? undefined : e => e.preventDefault()}
              onDrop={spectator ? undefined : () => onDrop(idx)}
              aria-label={`${colorText(c.color)} ${valueText(c.value)}`}
            >
              {cardIcons[c.value] || c.value}
              <span className="tooltip">{`${colorText(c.color)} ${displayValue(c.value)}`}</span>
            </button>
          ))}
        </div>
        {!spectator && (
          <div className="game-actions">
            <button className="draw-btn" onClick={draw} disabled={!myTurn || actionPending}>{t('draw')}</button>
            <button className="sort-btn" onClick={sortHand}>{t('sort')}</button>
            <button className="leave-btn" onClick={leaveGame}>{t('leave')}</button>
          </div>
        )}
        <h3>{t('players')}</h3>
        <ul className="players">
          {state.players.map(p => (
            <li
              key={p.id}
              className={`${state.current === p.id ? 'current' : ''} ${spectator && watching === p.id ? 'watching' : ''}`}
              onClick={spectator ? () => { setWatching(p.id); setFollow(false); } : undefined}
            >
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
        <h1 className="app-title" data-version={pkg.version} title={pkg.version}>{lang === 'tr' ? 'Uno Oyunu' : 'Uno Game'}</h1>
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
      {swapPicker && (
        <div className="color-picker player-picker">
          <p>{t('choosePlayer')}</p>
          <div className="player-options">
            {state.players.filter(p => p.id !== id).map(p => (
              <button key={p.id} onClick={() => chooseSwapTarget(p.id)}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
      {state?.winner && (
        <div className="winner-banner">
          {state.players.find(p => p.id === state.winner)?.name} {t('wins')}
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      <footer className="app-footer">{t('developedBy')}</footer>
    </>
  );
}

export default App;
