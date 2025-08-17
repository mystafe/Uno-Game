import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import pkg from '../package.json';

// Use a configurable server URL to support both local and deployed environments
const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const socket = io(serverUrl);

const colorOrder = ['red', 'yellow', 'green', 'blue', 'wild'];
const COLORS = ['red', 'yellow', 'green', 'blue'];

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
    spectators: 'Spectators',
    turn: 'Turn',
    cards: 'cards',
    roomExists: 'Room already exists',
    roomNotFound: 'Room not found',
    invalidMove: 'Invalid move',
    notYourTurn: 'Not your turn',
    nameTaken: 'Name already used',
    chooseColor: 'Choose a color',
    noSpecialFinish: 'You cannot finish with a special card',
    colors: { red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Blue', wild: 'Wild' },
    values: { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw 2', wild: 'Wild', wild4: 'Wild +4', swap: 'Swap Hands' },
    viewing: 'Viewing',
    follow: 'Follow turn',
    leave: 'Leave Game',
    leaveConfirm: 'Leave the game?',
    shareGame: 'Share Game',
    started: 'started',
    watch: 'Watch',
    newLobby: 'New Room',
    create: 'Create',
    developedBy: 'Developed by Mustafa Evleksiz',
    english: 'English',
    turkish: 'Turkish',
    winner: 'Winner',
    wins: 'wins!',
    choosePlayer: 'Choose a player',
    activeLobbies: 'Active Rooms',
    chat: 'Chat',
    emptyRooms: 'Empty All Rooms',
    new: 'New',
    stacking: 'Stacking',
    multiPlay: 'Multi Play',
  },
  tr: {
    joinGame: 'Oyuna Katıl',
    name: 'İsim',
    room: 'Oda',
    addComputer: 'Bilgisayar Ekle',
    join: 'Katıl',
    roomHeading: 'Oda',
    start: 'Başlat',
    topCard: 'Üstteki kart',
    yourHand: 'Eliniz',
    yourTurn: '(Sıra sizde)',
    draw: 'Kart Çek',
    players: 'Oyuncular',
    spectators: 'İzleyiciler',
    turn: 'Sıra',
    cards: 'kart',
    roomExists: 'Oda zaten mevcut',
    roomNotFound: 'Oda bulunamadı',
    invalidMove: 'Geçersiz hamle',
    notYourTurn: 'Sıra sizde değil',
    nameTaken: 'Bu isim zaten kullanılıyor',
    chooseColor: 'Renk seçiniz',
    noSpecialFinish: 'Özel kart ile oyunu bitiremezsiniz',
    colors: { red: 'Kırmızı', yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', wild: 'Özel' },
    values: { skip: 'Atla', reverse: 'Yön Değiştir', draw2: 'Çek 2', wild: 'Joker', wild4: 'Çek 4 Joker', swap: 'El Değiştir' },
    viewing: 'İzlenen',
    follow: 'Sıradakini izle',
    leave: 'Oyundan Ayrıl',
    leaveConfirm: 'Oyundan ayrılmak istediğinize emin misiniz?',
    shareGame: 'Oyunu Paylaş',
    started: 'başladı',
    watch: 'İzle',
    newLobby: 'Yeni Oda',
    create: 'Oluştur',
    developedBy: 'Mustafa Evleksiz tarafından geliştirilmiştir',
    english: 'İngilizce',
    turkish: 'Türkçe',
    winner: 'Kazanan',
    wins: 'kazandı!',
    choosePlayer: 'Bir oyuncu seçin',
    activeLobbies: 'Aktif Odalar',
    chat: 'Sohbet',
    emptyRooms: 'Tüm Odaları Boşalt',
    new: 'Yeni',
    stacking: 'Katlama',
    multiPlay: 'Çoklu Oynama',
  },
};

function App() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialRoom = params.get('room') || 'lobby';
  const [room, setRoom] = useState(initialRoom);
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
  const [colorPicker, setColorPicker] = useState(null);
  const [swapPicker, setSwapPicker] = useState(null);
  const [watching, setWatching] = useState(null);
  const [follow, setFollow] = useState(true);
  const [newCards, setNewCards] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [admin, setAdmin] = useState(false);
  const [, setTitleClicks] = useState(0);
  const chatBoxRef = useRef(null);
  const chatToggleRef = useRef(null);
  const [selected, setSelected] = useState([]);
  const [stacking, setStacking] = useState(true);
  const [multi, setMulti] = useState(true);

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
      if (!st.started && st.options) {
        setStacking(st.options.stacking);
        setMulti(st.options.multi);
      }
      setActionPending(false);
    });
    socket.on('lobbies', setLobbies);
    socket.on('joinError', joinErrorHandler);
    socket.on('chat', msg => {
      setMessages(m => [...m, msg]);
      showToast(`${msg.name}: ${msg.message}`);
    });
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
      socket.off('chat');
    };
  }, [lang, t]);

  useEffect(() => {
    if (spectator) {
      if (follow) setWatching(state?.current || null);
    } else {
      const me = state?.players.find(p => p.id === id);
      if (me) {
        setHand(prev => {
          const sortFn = (a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
          const sortedHand = [...me.hand].sort(sortFn);
          const prevCounts = prev.reduce((acc, c) => {
            const key = JSON.stringify(c);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          const newOnes = [];
          sortedHand.forEach(card => {
            const key = JSON.stringify(card);
            if (prevCounts[key]) {
              prevCounts[key]--;
            } else {
              newOnes.push(key);
            }
          });
          if (prev.length !== 0 && newOnes.length) {
            setNewCards(cards => [...cards, ...newOnes]);
          }
          return sortedHand;
        });
      }
    }
  }, [state, id, spectator, follow]);

  useEffect(() => {
    if (state?.current !== id) {
      setNewCards([]);
    }
  }, [state, id]);

  const joinLobby = (r) => {
    if (!name) return;
    setRoom(r);
    socket.emit('join', { room: r, name });
    localStorage.setItem('unoGame', JSON.stringify({ room: r, name }));
    setJoined(true);
  };

  const createLobby = () => {
    if (!name || !room) return;
    socket.emit('join', { room, name, create: true });
    localStorage.setItem('unoGame', JSON.stringify({ room, name }));
    setJoined(true);
  };

  const start = () => {
    socket.emit('start', { room, ai, options: { stacking, multi } });
  };

  const shareRoom = (r) => {
    const link = `${window.location.origin}?room=${r}`;
    if (navigator.share) {
      navigator.share({ url: link });
    } else {
      navigator.clipboard.writeText(link);
      showToast(link);
    }
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    socket.emit('chat', { room, name, message: chatMsg });
    setChatMsg('');
    setChatOpen(false);
  };

  useEffect(() => {
    if (!chatOpen) return;
    const handleClickOutside = (e) => {
      if (
        chatBoxRef.current &&
        !chatBoxRef.current.contains(e.target) &&
        chatToggleRef.current &&
        !chatToggleRef.current.contains(e.target)
      ) {
        setChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chatOpen]);

  useEffect(() => {
    const handleClearSelection = (e) => {
      if (!e.target.closest('.card')) {
        setSelected([]);
      }
    };
    document.addEventListener('mousedown', handleClearSelection);
    return () => document.removeEventListener('mousedown', handleClearSelection);
  }, []);

  const handleTitleClick = () => {
    setTitleClicks(c => {
      const nc = c + 1;
      if (nc >= 5) {
        setAdmin(a => !a);
        return 0;
      }
      return nc;
    });
  };

  const emptyRooms = () => {
    socket.emit('emptyRooms');
  };

  const performPlay = (cards, indices, target) => {
    setActionPending(true);
    setPlayingIndex(indices[0]);
    setSelected([]);
    setTimeout(() => {
      setHand(h => {
        const newHand = [...h];
        indices.sort((a, b) => b - a).forEach(i => newHand.splice(i, 1));
        return newHand;
      });
      setNewCards(cn => {
        const updated = [...cn];
        cards.forEach(card => {
          const key = JSON.stringify(card);
          const idx = updated.indexOf(key);
          if (idx !== -1) updated.splice(idx, 1);
        });
        return updated;
      });
      socket.emit('play', { room, cards, target });
      setPlayingIndex(null);
    }, 400);
  };

  const attemptPlay = () => {
    if (!myTurn) {
      showToast(t('notYourTurn'));
      return;
    }
    if (actionPending) return;
    if (!selected.length) return;
    const cardsToPlay = selected.map(i => hand[i]);
    const first = cardsToPlay[0];
    const top = state.top;
    const canPlay = first.color === 'wild' || first.color === top.color || first.value === top.value;
    if (!canPlay) {
      showToast(t('invalidMove'));
      setSelected([]);
      return;
    }
    if (!cardsToPlay.every(c => c.value === first.value)) {
      showToast(t('invalidMove'));
      setSelected([]);
      return;
    }
    if (!state?.options?.multi && cardsToPlay.length > 1) {
      showToast(t('invalidMove'));
      setSelected([]);
      return;
    }
    if (hand.length === cardsToPlay.length && cardsToPlay.some(c => typeof c.value !== 'number')) {
      showToast(t('noSpecialFinish'));
      setSelected([]);
      return;
    }
    if (first.color === 'wild') {
      setColorPicker({ cards: cardsToPlay, indices: selected });
      return;
    }
    performPlay(cardsToPlay, selected);
  };

  const handleCardClick = (card, idx) => {
    if (selected.includes(idx)) {
      attemptPlay();
    } else {
      setSelected(prev => {
        if (prev.length && (!state?.options?.multi || hand[prev[0]].value !== card.value)) {
          return [idx];
        }
        return [...prev, idx];
      });
    }
  };

  const chooseColor = (color) => {
    if (!colorPicker) return;
    const { cards, indices } = colorPicker;
    setColorPicker(null);
    const updated = cards.map((c, i) => i === 0 ? { ...c, chosenColor: color } : c);
    if (cards[0].value === 'swap') {
      setSwapPicker({ cards: updated, indices });
    } else {
      performPlay(updated, indices);
    }
  };

  const chooseSwapTarget = (targetId) => {
    if (!swapPicker) return;
    const { cards, indices } = swapPicker;
    setSwapPicker(null);
    performPlay(cards, indices, targetId);
  };

  const draw = () => {
    if (!myTurn) {
      showToast(t('notYourTurn'));
      return;
    }
    if (actionPending) return;
    setActionPending(true);
    setSelected([]);
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
    if (!window.confirm(t('leaveConfirm'))) return;
    socket.emit('leave', { room });
    localStorage.removeItem('unoGame');
    setJoined(false);
    setState(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('unoGame');
    const urlRoom = params.get('room');
    if (saved) {
      try {
        const { room: savedRoom, name: savedName } = JSON.parse(saved);
        setName(savedName);
        const joinRoom = urlRoom || savedRoom;
        if (joinRoom && savedName) {
          setRoom(joinRoom);
          socket.emit('join', { room: joinRoom, name: savedName });
          setJoined(true);
        }
      } catch {
        // ignore parsing errors
      }
    } else if (urlRoom) {
      setRoom(urlRoom);
    }
  }, [params]);

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
        <h2>
          {t('roomHeading')}: {room}{' '}
          <button
            className="share-btn"
            onClick={() => shareRoom(room)}
            title={t('shareGame')}
            aria-label={t('shareGame')}
          >
            📤
          </button>
        </h2>
        {state?.winner && <h3>{t('winner')}: {state.players.find(p => p.id === state.winner)?.name}</h3>}
        <ul>
          {state?.players.map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <label>
          <input type="checkbox" checked={ai} onChange={e => setAi(e.target.checked)} />
          {t('addComputer')}
        </label>
        {admin && (
          <>
            <label>
              <input type="checkbox" checked={stacking} onChange={e => setStacking(e.target.checked)} />
              {t('stacking')}
            </label>
            <label>
              <input type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} />
              {t('multiPlay')}
            </label>
          </>
        )}
        <button onClick={start}>{t('start')}</button>
      </div>
    );
  } else {
    const newCounts = {};
    newCards.forEach(k => {
      newCounts[k] = (newCounts[k] || 0) + 1;
    });
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
        </div>
        <h3>
          {t('turn')}: {state.players.find(p => p.id === state.current)?.name}
        </h3>
        {spectator ? (
          <>
            <h3>{t('viewing')}: {viewingPlayer?.name}</h3>
            {!follow && <button onClick={() => setFollow(true)}>{t('follow')}</button>}
          </>
        ) : (
          <h3>{t('yourHand')} {myTurn ? t('yourTurn') : ''}</h3>
        )}
        <div className="hand">
          {displayHand.map((c, idx) => {
            const key = JSON.stringify(c);
            const canPlayCard = (() => {
              const top = state.top;
              if (state.pendingDraw > 0) {
                if (top.value === 'draw2') return c.value === 'draw2';
                if (top.value === 'wild4') return c.value === 'wild4';
              }
              if (selected.length) {
                const first = hand[selected[0]];
                if (selected.includes(idx)) return true;
                if (!state?.options?.multi) return false;
                return c.value === first.value;
              }
              return c.color === 'wild' || c.color === state.top.color || c.value === state.top.value;
            })();
            const playClass = myTurn ? (canPlayCard ? 'playable' : 'unplayable') : '';
            const isNew = myTurn && newCounts[key] > 0;
            if (isNew) newCounts[key]--;
            return (
              <button
                key={idx}
                className={`card ${c.color} ${playingIndex === idx ? 'playing' : ''} ${playClass} ${selected.includes(idx) ? 'selected' : ''}`}
                onClick={spectator ? undefined : () => handleCardClick(c, idx)}
                disabled={spectator || !myTurn || actionPending}
                draggable={!spectator}
                onDragStart={spectator ? undefined : () => onDragStart(idx)}
                onDragOver={spectator ? undefined : e => e.preventDefault()}
                onDrop={spectator ? undefined : () => onDrop(idx)}
                aria-label={`${colorText(c.color)} ${valueText(c.value)}`}
              >
                {cardIcons[c.value] || c.value}
                {isNew && (
                  <span className="new-badge">{t('new')}</span>
                )}
                <span className="tooltip">{`${colorText(c.color)} ${displayValue(c.value)}`}</span>
              </button>
            );
          })}
        </div>
        {!spectator && (
          <div className="game-actions">
            <button className="draw-btn" onClick={draw} disabled={!myTurn || actionPending}>🃏 {t('draw')}</button>
            <button
              className="share-btn"
              onClick={() => shareRoom(room)}
              title={t('shareGame')}
              aria-label={t('shareGame')}
            >
              🔗
            </button>
            <button
              className="leave-btn"
              onClick={leaveGame}
              title={t('leave')}
              aria-label={t('leave')}
            >
              🚪
            </button>
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
        {state.spectators?.length > 0 && (
          <>
            <h3>{t('spectators')}</h3>
            <ul className="players spectators">
              {state.spectators.map(s => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }
  return (
    <>
      <header className="app-header">
        <h1 className="app-title" data-version={pkg.version} title={pkg.version} onClick={handleTitleClick}>{lang === 'tr' ? 'Uno Oyunu' : 'Uno Game'}</h1>
        {admin && <span className="admin-badge">ADMIN</span>}
        {admin && <button className="empty-btn" onClick={emptyRooms}>{t('emptyRooms')}</button>}
      </header>
      {content}
      {colorPicker && (
        <div className="color-picker">
          <p>{t('chooseColor')}</p>
          <div className="color-options">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-btn ${c}`}
                onClick={() => chooseColor(c)}
                aria-label={colorText(c)}
              />
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
      <button
        className="chat-toggle"
        onClick={() => setChatOpen(o => !o)}
        ref={chatToggleRef}
      >
        💬
      </button>
      {chatOpen && (
        <div className="chat-box" ref={chatBoxRef}>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i}><strong>{m.name}:</strong> {m.message}</div>
            ))}
          </div>
          <form onSubmit={sendChat} className="chat-input">
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} />
            <button type="submit" aria-label="Send">📨</button>
          </form>
        </div>
      )}
      <footer className="app-footer">{t('developedBy')}</footer>
    </>
  );
}

export default App;
