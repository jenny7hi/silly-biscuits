// Rules engine for Silly Biscuits, ported from the Python version (Game.py, Player.py).
// Every function is pure: it takes a GameState and returns a new one.

export type Suit = '♠' | '♥' | '♦' | '♣'
export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

// rank runs from 1 (A) to 13 (K). Suits are cosmetic: the rules only look at rank.
export interface Card {
  id: number
  rank: number
  suit: Suit
}

// a card on the pile, with an ace resolved to 14 (going up) or 1 (going down)
export interface PileCard extends Card {
  value: number
}

// a reserved slot: a face-up public card sitting on top of a face-down hidden card
export interface Slot {
  public: Card | null
  hidden: Card | null
}

export interface Player {
  name: string
  isComputer: boolean
  hand: Card[]
  slots: Slot[]
}

export type Source =
  | { from: 'hand'; cardId: number }
  | { from: 'public'; slot: number }
  | { from: 'hidden'; slot: number }

// the last time someone had to pick up the pile, so the UI can animate it
export interface Pickup {
  // increases with every pickup in a game
  id: number
  player: number
  // the pile cards picked up, bottom first
  cards: Card[]
  // the hidden card that was flipped and couldn't be played, if that caused the pickup
  flipped: Card | null
  slot: number | null
}

// the last time someone drew from the deck after a play, so the UI can animate it
// the last card played onto the pile, so the UI can animate it
export interface LastPlay {
  id: number
  player: number
  card: Card
  from: Source['from']
  slot: number | null
  // how many cards were on the pile once it landed (a 10 then blows them away)
  pileSize: number
}

export interface Draw {
  id: number
  player: number
  cards: Card[]
}

export interface GameState {
  players: Player[]
  deck: Card[]
  pile: PileCard[]
  // cards blown off the pile by a 10
  discard: PileCard[]
  goingUp: boolean
  current: number
  message: string
  // set when the last attempted play was rejected; the turn does not change
  error: string | null
  winner: number | null
  pickup: Pickup | null
  draw: Draw | null
  lastPlay: LastPlay | null
}

export const HAND_SIZE = 5
export const SPECIAL_RANKS = [2, 8, 10]

export const isSpecial = (card: Card) => SPECIAL_RANKS.includes(card.rank)
export const isRed = (card: Card) => card.suit === '♥' || card.suit === '♦'

export function rankLabel(rank: number): string {
  return { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[rank] ?? String(rank)
}

export const cardLabel = (card: Card) => rankLabel(card.rank) + card.suit

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const byRank = (a: Card, b: Card) => a.rank - b.rank

interface NewGameOptions {
  players?: { name: string; isComputer: boolean }[]
  rng?: () => number
}

export function newGame({
  players = [
    { name: 'You', isComputer: false },
    { name: 'Computer', isComputer: true },
  ],
  rng = Math.random,
}: NewGameOptions = {}): GameState {
  // more players = more decks, one per three players
  const numDecks = Math.ceil(players.length / 3)
  const cards: Card[] = []
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ id: cards.length, rank, suit })
      }
    }
  }
  const deck = shuffle(cards, rng)

  const seated: Player[] = players.map((p) => {
    const dealt = deck.splice(0, 11)
    const hidden = dealt.slice(5, 8)
    const pub = dealt.slice(8, 11)
    return {
      ...p,
      hand: dealt.slice(0, 5).sort(byRank),
      slots: hidden.map((card, i) => ({ hidden: card, public: pub[i] })),
    }
  })

  const start = deck.shift()!
  return {
    players: seated,
    deck,
    pile: [{ ...start, value: start.rank }],
    discard: [],
    goingUp: start.rank !== 2,
    current: 0,
    message: `${seated[0].name === 'You' ? 'You go' : `${seated[0].name} goes`} first.`,
    error: null,
    winner: null,
    pickup: null,
    draw: null,
    lastPlay: null,
  }
}

// the card the next play is compared against: the last non-special card since
// the pile was last reset by an 8 or a 10. null means anything can be played.
export function reference(pile: PileCard[]): PileCard | null {
  for (let i = pile.length - 1; i >= 0; i--) {
    const card = pile[i]
    if (card.rank === 8 || card.rank === 10) return null
    if (card.rank !== 2) return card
  }
  return null
}

export function isLegal(state: GameState, card: Card): boolean {
  if (isSpecial(card)) return true
  const ref = reference(state.pile)
  if (!ref) return true
  // an ace is the biggest card going up and the smallest going down,
  // so it can go on anything except another ace
  if (card.rank === 1) return ref.rank !== 1
  return state.goingUp ? card.rank > ref.value : card.rank < ref.value
}

// a short description of what the next card must beat, e.g. "Higher than 7♥"
export function requirement(state: GameState): string {
  const ref = reference(state.pile)
  if (!ref) return 'Anything goes'
  return `${state.goingUp ? 'Higher' : 'Lower'} than ${cardLabel(ref)}`
}

const reservedLocked = (state: GameState) => state.deck.length > 0

// finds the card a source refers to, or explains why it cannot be played
export function resolve(state: GameState, player: number, source: Source): { card: Card } | { error: string } {
  const p = state.players[player]
  if (source.from === 'hand') {
    const card = p.hand.find((c) => c.id === source.cardId)
    return card ? { card } : { error: "You don't have that card." }
  }
  const slot = p.slots[source.slot]
  if (!slot) return { error: 'There is no such reserved card.' }
  if (source.from === 'public') {
    if (reservedLocked(state)) return { error: "Reserved cards can't be played until the deck is empty." }
    return slot.public ? { card: slot.public } : { error: 'That card has already been played.' }
  }
  if (slot.public) return { error: 'Play the face-up card on top of it first.' }
  return slot.hidden ? { card: slot.hidden } : { error: 'That card has already been played.' }
}

export function hasPlays(state: GameState, player: number): boolean {
  const p = state.players[player]
  if (p.hand.some((c) => isLegal(state, c))) return true
  if (reservedLocked(state)) return false
  return p.slots.some((s) => (s.public ? isLegal(state, s.public) : s.hidden !== null))
}

const hasWon = (p: Player) => p.hand.length === 0 && p.slots.every((s) => !s.public && !s.hidden)

const playedVerb = (p: Player) => `${p.name} played`

// moves the whole pile (and a failed hidden card, if any) into the current player's hand
function pickUpPile(state: GameState, flipped: Card | null = null, slot: number | null = null) {
  const p = state.players[state.current]
  const cards = state.pile.map(({ id, rank, suit }) => ({ id, rank, suit }))
  p.hand.push(...cards, ...(flipped ? [flipped] : []))
  p.hand.sort(byRank)
  state.pile = []
  state.pickup = { id: (state.pickup?.id ?? 0) + 1, player: state.current, cards, flipped, slot }
  return cards.length
}

function advance(state: GameState) {
  state.current = (state.current + 1) % state.players.length
}

// plays a card for the current player. A rejected play sets `error` and keeps the turn.
export function play(state: GameState, source: Source): GameState {
  if (state.winner !== null) return state
  const s = structuredClone(state)
  s.error = null
  const p = s.players[s.current]
  const found = resolve(s, s.current, source)
  if ('error' in found) return { ...s, error: found.error }
  const { card } = found

  if (!isLegal(s, card)) {
    if (source.from !== 'hidden') {
      return { ...s, error: `${cardLabel(card)} can't be played. ${requirement(s)}.` }
    }
    // a hidden card that turns out to be illegal goes into the hand along with the whole pile
    p.slots[source.slot].hidden = null
    const count = pickUpPile(s, card, source.slot)
    s.message = `${p.name} turned over a hidden ${cardLabel(card)}, but it can't be played, so ${p.name === 'You' ? 'you pick' : `${p.name} picks`} it up with ${count === 1 ? 'the card' : `all ${count} cards`} on the pile.`
    advance(s)
    return s
  }

  if (source.from === 'hand') p.hand = p.hand.filter((c) => c.id !== card.id)
  else if (source.from === 'public') p.slots[source.slot].public = null
  else p.slots[source.slot].hidden = null

  const value = card.rank === 1 ? (s.goingUp ? 14 : 1) : card.rank
  s.pile.push({ ...card, value })
  s.lastPlay = {
    id: (s.lastPlay?.id ?? 0) + 1,
    player: s.current,
    card,
    from: source.from,
    slot: source.from === 'hand' ? null : source.slot,
    pileSize: s.pile.length,
  }

  const drawn: Card[] = []
  while (p.hand.length + drawn.length < HAND_SIZE && s.deck.length > 0) drawn.push(s.deck.shift()!)
  if (drawn.length) {
    p.hand.push(...drawn)
    s.draw = { id: (s.draw?.id ?? 0) + 1, player: s.current, cards: drawn }
  }
  p.hand.sort(byRank)

  const label = cardLabel(card)
  if (hasWon(p)) {
    s.winner = s.current
    s.message = `${playedVerb(p)} ${label} and ${p.name === 'You' ? 'win' : 'wins'}!`
    return s
  }

  if (card.rank === 2) {
    s.goingUp = !s.goingUp
    s.message = `${playedVerb(p)} ${label}. The direction is now ${s.goingUp ? 'up' : 'down'}.`
    advance(s)
  } else if (card.rank === 8) {
    s.message = `${playedVerb(p)} ${label}. Pile reset: the next player can play anything.`
    advance(s)
  } else if (card.rank === 10) {
    // a 10 blows the whole pile into the discard
    s.discard.push(...s.pile)
    s.pile = []
    s.message = `${playedVerb(p)} ${label}. Kaboom! The pile is blown away and ${p.name === 'You' ? 'you go' : `${p.name} goes`} again.`
  } else {
    s.message = `${playedVerb(p)} ${label}.`
    advance(s)
  }
  return s
}

// the current player has no legal play: they pick up the whole pile and lose the turn.
// The pile is then empty, so the next player can play anything.
export function noMove(state: GameState): GameState {
  if (state.winner !== null) return state
  const s = structuredClone(state)
  s.error = null
  const p = s.players[s.current]
  const count = pickUpPile(s)
  s.message = `${p.name} couldn't play and picked up ${count === 1 ? 'the card' : `all ${count} cards`} on the pile.`
  advance(s)
  return s
}

// a simple computer strategy: keep specials and aces for later, and play the card
// that keeps the most options open. Hidden cards are played blind.
export function computerMove(state: GameState): Source | null {
  const p = state.players[state.current]
  const cost = (card: Card) => {
    if (isSpecial(card)) return 100 + card.rank
    if (card.rank === 1) return 50
    return state.goingUp ? card.rank : 14 - card.rank
  }
  const best = (cards: Card[]) =>
    cards.filter((c) => isLegal(state, c)).sort((a, b) => cost(a) - cost(b))[0]

  const fromHand = best(p.hand)
  if (fromHand) return { from: 'hand', cardId: fromHand.id }
  if (reservedLocked(state)) return null

  const fromPublic = best(p.slots.flatMap((s) => (s.public ? [s.public] : [])))
  if (fromPublic) return { from: 'public', slot: p.slots.findIndex((s) => s.public?.id === fromPublic.id) }

  const hiddenSlot = p.slots.findIndex((s) => !s.public && s.hidden)
  return hiddenSlot >= 0 ? { from: 'hidden', slot: hiddenSlot } : null
}

export function computerTurn(state: GameState): GameState {
  const move = hasPlays(state, state.current) ? computerMove(state) : null
  return move ? play(state, move) : noMove(state)
}

export const cardsLeft = (p: Player) =>
  p.hand.length + p.slots.reduce((n, s) => n + (s.public ? 1 : 0) + (s.hidden ? 1 : 0), 0)
