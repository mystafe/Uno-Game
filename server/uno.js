const COLORS = ['red', 'yellow', 'green', 'blue'];
const NUMBERS = Array.from({ length: 10 }, (_, i) => i);
const SPECIALS = ['skip', 'reverse', 'draw2'];

function createDeck() {
  const deck = [];
  COLORS.forEach(color => {
    NUMBERS.forEach(num => deck.push({ color, value: num }));
    SPECIALS.forEach(type => deck.push({ color, value: type }));
  });
  // Add wild cards
  ['wild', 'wild4', 'swap'].forEach(type => {
    for (let i = 0; i < 4; i++) deck.push({ color: 'wild', value: type });
  });
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class Game {
  constructor(room) {
    this.room = room;
    this.players = [];
    this.spectators = [];
    this.turn = 0;
    this.direction = 1;
    this.started = false;
    this.discard = [];
    this.deck = [];
    this.ai = null;
    this.winner = null;
    this.pendingDraw = 0;
    this.options = { stacking: true, multi: true };
  }

  nextAIName() {
    const base = 'AI oyuncu';
    const names = this.players.map(p => p.name).filter(n => n.startsWith(base));
    if (!names.length) return base;
    let n = 2;
    while (names.includes(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  addPlayer(id, name) {
    const existing = this.players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.id = id;
      return true;
    }
    if (this.started || this.players.find(p => p.id === id)) return false;
    this.players.push({ id, name, hand: [] });
    return true;
  }

  disconnectPlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.players[idx].id = null;
      if (this.turn === idx) this.nextTurn();
    }
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
  }

  addSpectator(id, name) {
    if (this.spectators.find(s => s.id === id)) return;
    this.spectators.push({ id, name });
  }

  removeSpectator(id) {
    this.spectators = this.spectators.filter(s => s.id !== id);
  }

  isEmpty() {
    return this.players.every(p => !p.id) && this.spectators.length === 0;
  }

  start(aiCount = 0, options = {}) {
    if (this.players.length < 2 && aiCount === 0) return false;
    this.options = { stacking: true, multi: true, ...options };
    this.pendingDraw = 0;
    this.deck = createDeck();
    this.players.forEach(p => {
      p.hand = this.deck.splice(0, 7);
    });
    for (let i = 0; i < aiCount; i++) {
      const aiPlayer = {
        id: `AI-${Date.now()}-${i}`,
        name: this.nextAIName(),
        hand: this.deck.splice(0, 7),
        ai: true,
      };
      this.players.push(aiPlayer);
    }
    let first = this.drawCard();
    while (first.color === 'wild' || typeof first.value !== 'number') {
      this.deck.unshift(first);
      first = this.drawCard();
    }
    this.discard = [first];
    this.started = true;
    this.winner = null;
    return true;
  }

  currentPlayer() {
    return this.players[this.turn];
  }

  nextTurn() {
    this.turn = (this.turn + this.direction + this.players.length) % this.players.length;
  }

  canPlay(card) {
    if (!card) return false;
    const top = this.discard[this.discard.length - 1];
    if (this.pendingDraw > 0) {
      if (top.value === 'draw2') return card.value === 'draw2';
      if (top.value === 'wild4') return card.value === 'wild4';
    }
    return (
      card.color === 'wild' ||
      card.color === top.color ||
      card.value === top.value
    );
  }

  drawCard() {
    if (this.deck.length === 0) {
      const top = this.discard.pop();
      this.deck = shuffle(this.discard);
      this.discard = [top];
    }
    return this.deck.pop();
  }

  play(id, cards, target) {
    if (!this.started) return false;
    const player = this.currentPlayer();
    if (player.id !== id) return false;

    if (!Array.isArray(cards)) cards = [cards];
    if (!this.options.multi && cards.length > 1) return false;

    const first = cards[0];
    if (!this.canPlay(first)) return false;
    if (!cards.every(c => c.value === first.value)) return false;

    const indices = cards.map(card =>
      player.hand.findIndex(c => c.color === card.color && c.value === card.value)
    );
    if (indices.some(i => i === -1)) return false;

    const isSpecial = first.color === 'wild' || typeof first.value !== 'number';
    if (player.hand.length === cards.length && isSpecial) return 'specialFinish';

    // remove cards from hand
    indices.sort((a, b) => b - a).forEach(i => player.hand.splice(i, 1));

    cards.forEach((card, i) => {
      if (card.color === 'wild' && card.chosenColor && i === 0) {
        this.discard.push({ color: card.chosenColor, value: card.value });
      } else {
        this.discard.push(card);
      }
    });

    if (player.hand.length === 0) {
      this.started = false;
      this.winner = player.id;
      return true;
    }

    switch (first.value) {
      case 'reverse':
        this.direction *= -1;
        this.nextTurn();
        break;
      case 'skip':
        this.nextTurn();
        this.nextTurn();
        break;
      case 'draw2':
        this.nextTurn();
        if (this.options.stacking) {
          this.pendingDraw += 2 * cards.length;
        } else {
          for (let i = 0; i < 2 * cards.length; i++) {
            this.currentPlayer().hand.push(this.drawCard());
          }
          this.nextTurn();
        }
        break;
      case 'wild4':
        this.nextTurn();
        if (this.options.stacking) {
          this.pendingDraw += 4 * cards.length;
        } else {
          for (let i = 0; i < 4 * cards.length; i++) {
            this.currentPlayer().hand.push(this.drawCard());
          }
          this.nextTurn();
        }
        break;
      case 'swap':
        if (target) {
          const other = this.players.find(p => p.id === target);
          if (other) [player.hand, other.hand] = [other.hand, player.hand];
        }
        this.nextTurn();
        break;
      default:
        this.nextTurn();
    }

    return true;
  }

  draw(id) {
    if (!this.started) return false;
    const player = this.currentPlayer();
    if (player.id !== id) return false;
    const count = this.pendingDraw > 0 ? this.pendingDraw : 1;
    for (let i = 0; i < count; i++) {
      player.hand.push(this.drawCard());
    }
    this.pendingDraw = 0;
    this.nextTurn();
    return true;
  }

  replaceWithAI(id) {
    const player = this.players.find(p => p.id === id);
    if (!player) return false;
    player.id = `AI-${id}`;
    player.name = `${player.name} (AI)`;
    player.ai = true;
    return true;
  }

  checkAI(io, room) {
    const player = this.currentPlayer();
    if (!player || !player.ai) return;
    const priority = { wild4: 5, draw2: 4, skip: 3, reverse: 2, swap: 2, wild: 1 };
    const playable = player.hand.filter(c => c && this.canPlay(c));
    if (playable.length) {
      playable.sort((a, b) => (priority[b.value] || 0) - (priority[a.value] || 0));
      let card = playable[0];
      if (player.hand.length === 1 && (card.color === 'wild' || typeof card.value !== 'number')) {
        const numeric = playable.find(c => typeof c.value === 'number');
        if (numeric) card = numeric;
        else {
          this.draw(player.id);
          io.to(room).emit('state', this.getState());
          if (this.started) this.checkAI(io, room);
          return;
        }
      }
      if (card.color === 'wild') {
        const colorCounts = COLORS.map(color => ({
          color,
          count: player.hand.filter(c => c.color === color).length,
        })).sort((a, b) => b.count - a.count);
        card = { ...card, chosenColor: colorCounts[0].color };
      }
      this.play(player.id, card);
    } else {
      this.draw(player.id);
    }
    io.to(room).emit('state', this.getState());
    if (this.started) this.checkAI(io, room);
  }

  getState() {
    return {
      started: this.started,
      players: this.players.map(p => ({ id: p.id, name: p.name, hand: p.hand })),
      spectators: this.spectators.map(s => ({ id: s.id, name: s.name })),
      current: this.currentPlayer() ? this.currentPlayer().id : null,
      top: this.discard[this.discard.length - 1],
      winner: this.winner,
      pendingDraw: this.pendingDraw,
      options: this.options
    };
  }
}

module.exports = Game;
