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
  ['wild', 'wild4'].forEach(type => {
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
  }

  addPlayer(id, name) {
    if (this.started || this.players.find(p => p.id === id)) return false;
    if (this.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return false;
    this.players.push({ id, name, hand: [] });
    return true;
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
  }

  isEmpty() {
    return this.players.length === 0;
  }

  start(ai = false) {
    if (this.players.length < 2 && !ai) return false;
    this.deck = createDeck();
    this.players.forEach(p => {
      p.hand = this.deck.splice(0, 7);
    });
    if (ai) {
      this.ai = { id: 'AI', name: 'Bilgisayar', hand: this.deck.splice(0, 7) };
      this.players.push(this.ai);
    }
    this.discard = [this.deck.pop()];
    this.started = true;
    return true;
  }

  currentPlayer() {
    return this.players[this.turn];
  }

  nextTurn() {
    this.turn = (this.turn + this.direction + this.players.length) % this.players.length;
  }

  canPlay(card) {
    const top = this.discard[this.discard.length - 1];
    return (
      card.color === 'wild' ||
      card.color === top.color ||
      card.value === top.value
    );
  }

  play(id, card) {
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
        this.currentPlayer().hand.push(...this.deck.splice(0, 2));
        this.nextTurn();
        break;
      case 'wild4':
        this.nextTurn();
        this.currentPlayer().hand.push(...this.deck.splice(0, 4));
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
    player.hand.push(this.deck.pop());
    this.nextTurn();
    return true;
  }

  checkAI(io, room) {
    if (!this.ai) return;
    const player = this.currentPlayer();
    if (player.id === 'AI') {
      // Simple AI: play first valid card else draw
      let played = false;
      for (let i = 0; i < player.hand.length; i++) {
        if (this.canPlay(player.hand[i])) {
          const card = player.hand.splice(i, 1)[0];
          if (card.color === 'wild') {
            card.color = COLORS[Math.floor(Math.random() * COLORS.length)];
          }
          this.discard.push(card);
          played = true;
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
              this.currentPlayer().hand.push(...this.deck.splice(0, 2));
              this.nextTurn();
              break;
            case 'wild4':
              this.nextTurn();
              this.currentPlayer().hand.push(...this.deck.splice(0, 4));
              this.nextTurn();
              break;
            default:
              this.nextTurn();
          }
          break;
        }
      }
      if (!played) {
        player.hand.push(this.deck.pop());
        this.nextTurn();
      }
      io.to(room).emit('state', this.getState());
      this.checkAI(io, room);
    }
  }

  getState() {
    return {
      started: this.started,
      players: this.players.map(p => ({ id: p.id, name: p.name, hand: p.hand })),
      current: this.currentPlayer() ? this.currentPlayer().id : null,
      top: this.discard[this.discard.length - 1]
    };
  }
}

module.exports = Game;
