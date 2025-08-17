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
    this.turn = 0;
    this.direction = 1;
    this.started = false;
    this.discard = [];
    this.deck = [];
    this.ai = null;
    this.winner = null;
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

  isEmpty() {
    return this.players.every(p => !p.id);
  }

  start(ai = false) {
    if (this.players.length < 2 && !ai) return false;
    this.deck = createDeck();
    this.players.forEach(p => {
      p.hand = this.deck.splice(0, 7);
    });
    if (ai) {
      const aiPlayer = { id: `AI-${Date.now()}`, name: 'Bilgisayar', hand: this.deck.splice(0, 7), ai: true };
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

  play(id, card, target) {
    if (!this.started) return false;
    const player = this.currentPlayer();
    if (player.id !== id) return false;
    const idx = player.hand.findIndex(c => c.color === card.color && c.value === card.value);
    if (idx === -1 || !this.canPlay(card)) return false;

    player.hand.splice(idx, 1);
    if (card.color === 'wild' && card.chosenColor) {
      this.discard.push({ color: card.chosenColor, value: card.value });
    } else {
      this.discard.push(card);
    }

    if (player.hand.length === 0) {
      this.started = false;
      this.winner = player.id;
      return true;
    }

    switch (card.value) {
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
        this.currentPlayer().hand.push(this.drawCard(), this.drawCard());
        this.nextTurn();
        break;
      case 'wild4':
        this.nextTurn();
        this.currentPlayer().hand.push(this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard());
        this.nextTurn();
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
    player.hand.push(this.drawCard());
    this.nextTurn();
    return true;
  }

  replaceWithAI(id) {
    const player = this.players.find(p => p.id === id);
    if (!player) return false;
    player.id = `AI-${id}`;
    player.name = `${player.name} (pc)`;
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
      const card = playable[0];
      const idx = player.hand.findIndex(c => c === card);
      player.hand.splice(idx, 1);
      if (card.color === 'wild') {
        const colorCounts = COLORS.map(color => ({
          color,
          count: player.hand.filter(c => c.color === color).length,
        })).sort((a, b) => b.count - a.count);
        this.discard.push({ color: colorCounts[0].color, value: card.value });
      } else {
        this.discard.push(card);
      }
      if (player.hand.length === 0) {
        this.started = false;
        this.winner = player.id;
      } else {
        switch (card.value) {
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
            this.currentPlayer().hand.push(this.drawCard(), this.drawCard());
            this.nextTurn();
            break;
          case 'wild4':
            this.nextTurn();
            this.currentPlayer().hand.push(this.drawCard(), this.drawCard(), this.drawCard(), this.drawCard());
            this.nextTurn();
            break;
          case 'swap':
            const target = this.players.filter(p => p.id !== player.id).sort((a, b) => b.hand.length - a.hand.length)[0];
            if (target) [player.hand, target.hand] = [target.hand, player.hand];
            this.nextTurn();
            break;
          default:
            this.nextTurn();
        }
      }
    } else {
      player.hand.push(this.drawCard());
      this.nextTurn();
    }
    io.to(room).emit('state', this.getState());
    if (this.started) this.checkAI(io, room);
  }

  getState() {
    return {
      started: this.started,
      players: this.players.map(p => ({ id: p.id, name: p.name, hand: p.hand })),
      current: this.currentPlayer() ? this.currentPlayer().id : null,
      top: this.discard[this.discard.length - 1],
      winner: this.winner
    };
  }
}

module.exports = Game;
