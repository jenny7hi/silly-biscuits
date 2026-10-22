// Computer players for Silly Biscuits at three difficulty levels. None of them looks at
// anything a real player couldn't see: their own hand and public cards, the pile, other
// players' public cards and how many cards everyone holds.

import {
  type Card,
  type GameState,
  type Source,
  SUITS,
  cloneState,
  hasPlays,
  isLegal,
  isSpecial,
  noMove,
  play,
  shuffle,
} from './game'

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

type Rng = () => number

// a move the current player can make. card is null for a hidden card, which is played blind.
interface Option {
  source: Source
  card: Card | null
}

function options(state: GameState): Option[] {
  const p = state.players[state.current]
  const result: Option[] = p.hand
    .filter((c) => isLegal(state, c))
    .map((c) => ({ source: { from: 'hand', cardId: c.id }, card: c }))
  if (state.deck.length > 0) return result
  p.slots.forEach((s, slot) => {
    if (s.public) {
      if (isLegal(state, s.public)) result.push({ source: { from: 'public', slot }, card: s.public })
    } else if (s.hidden) {
      result.push({ source: { from: 'hidden', slot }, card: null })
    }
  })
  return result
}

const pick = <T>(items: T[], rng: Rng) => items[Math.floor(rng() * items.length)]

// Easy: any card that can be played, at random. Hidden cards only when nothing else will do.
function easyMove(state: GameState, rng: Rng): Source | null {
  const opts = options(state)
  const visible = opts.filter((o) => o.card)
  return (visible.length ? pick(visible, rng) : pick(opts, rng))?.source ?? null
}

// Medium: keep specials and aces for later and play the card that keeps the most options
// open. Once the deck is empty, clear public cards that sit on hidden ones first: a hidden
// card you can reach is always a move, so it stops you getting stuck. Hidden cards
// themselves are kept until nothing else will do.
function mediumMove(state: GameState): Source | null {
  const cost = (card: Card) => {
    if (isSpecial(card)) return 100 + card.rank
    if (card.rank === 1) return 50
    return state.goingUp ? card.rank : 14 - card.rank
  }
  const slots = state.players[state.current].slots
  const coversHidden = (o: Option) => o.source.from === 'public' && slots[o.source.slot].hidden !== null
  const opts = options(state)
  const cheapest = (keep: (o: Option) => boolean) =>
    opts.filter((o) => o.card && keep(o)).sort((a, b) => cost(a.card!) - cost(b.card!))[0]
  return (cheapest(coversHidden) ?? cheapest((o) => o.source.from === 'hand') ?? cheapest(() => true) ?? opts[0])?.source ?? null
}

// ---- Hard ----

// the cards this player hasn't seen: everything except their own hand and public cards,
// every public card on the table and the pile. These are somewhere in the deck, in other
// players' hands, or face down in a reserved slot (the player's own hidden cards included).
export function unseenCards(state: GameState, me: number): Card[] {
  const decks = Math.ceil(state.players.length / 3)
  const counts = Array(14).fill(4 * decks)
  counts[0] = 0
  const seen = [
    ...state.pile,
    ...state.players[me].hand,
    ...state.players.flatMap((p) => p.slots.flatMap((s) => (s.public ? [s.public] : []))),
  ]
  for (const card of seen) counts[card.rank]--
  const cards: Card[] = []
  counts.forEach((n, rank) => {
    for (let i = 0; i < n; i++) cards.push({ id: 100000 + cards.length, rank, suit: SUITS[i % 4] })
  })
  return cards
}

// one guess at the hidden information: deal the unseen cards out at random to every place
// they could be. The guess has the right number of cards everywhere.
function determinize(state: GameState, me: number, rng: Rng): GameState {
  const pool = shuffle(unseenCards(state, me), rng)
  const s = cloneState(state)
  s.players.forEach((p, i) => {
    if (i !== me) p.hand = pool.splice(0, p.hand.length).sort((a, b) => a.rank - b.rank)
    for (const slot of p.slots) if (slot.hidden) slot.hidden = pool.pop()!
  })
  s.deck = pool.splice(0, s.deck.length)
  return s
}

// plays a game to the end with Medium on every side and returns the winner
function playOut(state: GameState): number | null {
  let s = state
  for (let turns = 0; s.winner === null && turns < 400; turns++) {
    const move = hasPlays(s, s.current) ? mediumMove(s) : null
    s = move ? play(s, move) : noMove(s)
  }
  return s.winner
}

// Hard looks ahead once the deck is down to this many cards. Before then Medium's choices
// are as good as lookahead in testing, and much faster.
const ENDGAME_DECK = 4
// guesses at the hidden cards per move; more is slower but stronger (24 wins about 70% of
// games against Medium, 64 about 76%)
const SAMPLES = 64

// the same card from the hand plays the same however many copies there are, and every
// hidden card is equally unknown, so only one move of each kind needs to be weighed
function kind(state: GameState, source: Source): string {
  const p = state.players[state.current]
  if (source.from === 'hand') return `hand-${p.hand.find((c) => c.id === source.cardId)!.rank}`
  const slot = p.slots[source.slot]
  if (source.from === 'public') return `public-${slot.public!.rank}-${slot.hidden ? 'covering' : 'alone'}`
  return 'hidden'
}

// Hard: near the end of the deck, imagine many ways the unseen cards could be laid out,
// play each candidate move out to the end of the game in every one of them, and pick the
// move that wins most often. Ties go to the move Medium would make.
function hardMove(state: GameState, rng: Rng): Source | null {
  const usual = mediumMove(state)
  if (!usual || state.deck.length > ENDGAME_DECK) return usual
  const kinds = new Map(options(state).map((o) => [kind(state, o.source), o.source]))
  kinds.set(kind(state, usual), usual)
  const moves = [...kinds.values()]
  if (moves.length === 1) return usual

  const me = state.current
  const wins = moves.map(() => 0)
  for (let i = 0; i < SAMPLES; i++) {
    const world = determinize(state, me, rng)
    moves.forEach((move, j) => {
      if (playOut(play(world, move)) === me) wins[j]++
    })
  }
  let best = moves.indexOf(usual)
  wins.forEach((n, j) => {
    if (n > wins[best]) best = j
  })
  return moves[best]
}

export function computerMove(state: GameState, difficulty: Difficulty = 'medium', rng: Rng = Math.random): Source | null {
  if (difficulty === 'easy') return easyMove(state, rng)
  if (difficulty === 'hard') return hardMove(state, rng)
  return mediumMove(state)
}

export function computerTurn(state: GameState, difficulty: Difficulty = 'medium', rng: Rng = Math.random): GameState {
  const move = hasPlays(state, state.current) ? computerMove(state, difficulty, rng) : null
  return move ? play(state, move) : noMove(state)
}
