// Computer players for Silly Biscuits at three difficulty levels. None of them looks at
// anything a real player couldn't see: their own hand and public cards, the pile, other
// players' public cards and how many cards everyone holds.

import {
  type Card,
  type GameState,
  type Source,
  SUITS,
  cardsLeft,
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

// the other cards of the same rank in the hand, for playing several together
function copiesOf(state: GameState, source: Source): Card[] {
  if (source.from !== 'hand') return []
  const hand = state.players[state.current].hand
  const card = hand.find((c) => c.id === source.cardId)!
  return hand.filter((c) => c.rank === card.rank && c.id !== card.id)
}

// the same hand play, with `extra` more cards of its rank played alongside it
function withCopies(state: GameState, source: Source, extra: number): Source {
  if (source.from !== 'hand' || extra <= 0) return source
  return { ...source, with: copiesOf(state, source).slice(0, extra).map((c) => c.id) }
}

// Easy: any card that can be played, at random, along with a random number of its copies.
// Hidden cards only when nothing else will do.
function easyMove(state: GameState, rng: Rng): Source | null {
  const opts = options(state)
  const visible = opts.filter((o) => o.card)
  const chosen = (visible.length ? pick(visible, rng) : pick(opts, rng))?.source ?? null
  if (!chosen) return null
  return withCopies(state, chosen, Math.floor(rng() * (copiesOf(state, chosen).length + 1)))
}

// Medium: keep specials and aces for later and play the card that keeps the most options
// open. Once the deck is empty, clear public cards that sit on hidden ones first: a hidden
// card you can reach is always a move, so it stops you getting stuck. Hidden cards
// themselves are kept until nothing else will do. An ordinary card goes down with all its
// copies, to empty the hand faster; specials and aces go one at a time, to save the rest.
function mediumMove(state: GameState): Source | null {
  const chosen = mediumSingle(state)
  if (!chosen || chosen.from !== 'hand') return chosen
  const card = state.players[state.current].hand.find((c) => c.id === chosen.cardId)!
  return isSpecial(card) || card.rank === 1 ? chosen : withCopies(state, chosen, 3)
}

function mediumSingle(state: GameState): Source | null {
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
// every public card on the table, the pile and the discard. These are somewhere in the deck,
// in other players' hands, or face down in a reserved slot (the player's own hidden cards
// included). Cards another player picked up from the pile count as unseen: remembering them
// made no difference in testing.
export function unseenCards(state: GameState, me: number): Card[] {
  const decks = Math.ceil(state.players.length / 3)
  const counts = Array(14).fill(4 * decks)
  counts[0] = 0
  const seen = [
    ...state.pile,
    ...state.discard,
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

// plays on with Medium on every side for up to DEPTH turns and scores the result for
// player me: 1 for a win, 0 for a loss, and in between by how far ahead they are on cards
function playOut(state: GameState, me: number): number {
  let s = state
  for (let turns = 0; s.winner === null && turns < DEPTH; turns++) {
    const move = hasPlays(s, s.current) ? mediumMove(s) : null
    s = move ? play(s, move) : noMove(s)
  }
  if (s.winner !== null) return s.winner === me ? 1 : 0
  const mine = cardsLeft(s.players[me])
  const theirs = Math.min(...s.players.filter((_, i) => i !== me).map(cardsLeft))
  return 0.5 + 0.5 * Math.tanh((theirs - mine) / SPREAD)
}

// Hard looks ahead once the deck is down to this many cards. Earlier than that, Medium's
// choices did as well in testing and are much faster.
const ENDGAME_DECK = 10
// guesses at the hidden cards per move
const SAMPLES = 16
// how many turns each guess is played on for, and how far ahead on cards counts as
// nearly won when the game hasn't finished by then
const DEPTH = 40
const SPREAD = 6

// cards of the same rank from the hand play the same whichever copies they are (but not
// however many), and every hidden card is equally unknown, so only one move of each kind
// needs to be weighed
function kind(state: GameState, source: Source): string {
  const p = state.players[state.current]
  if (source.from === 'hand') return `hand-${p.hand.find((c) => c.id === source.cardId)!.rank}x${1 + (source.with?.length ?? 0)}`
  const slot = p.slots[source.slot]
  if (source.from === 'public') return `public-${slot.public!.rank}-${slot.hidden ? 'covering' : 'alone'}`
  return 'hidden'
}

// Hard: near the end of the deck, imagine many ways the unseen cards could be laid out,
// play each candidate move on in every one of them (including playing a card with some or
// all of its copies), and pick the move that does best. Ties go to the move Medium would make.
function hardMove(state: GameState, rng: Rng): Source | null {
  const usual = mediumMove(state)
  if (!usual || state.deck.length > ENDGAME_DECK) return usual
  // every way to play each card: on its own, or with one or more of its copies
  const candidates = options(state).flatMap((o) =>
    Array.from({ length: copiesOf(state, o.source).length + 1 }, (_, extra) => withCopies(state, o.source, extra)),
  )
  const kinds = new Map(candidates.map((source) => [kind(state, source), source]))
  kinds.set(kind(state, usual), usual)
  const moves = [...kinds.values()]
  if (moves.length === 1) return usual

  const me = state.current
  const scores = moves.map(() => 0)
  for (let i = 0; i < SAMPLES; i++) {
    const world = determinize(state, me, rng)
    moves.forEach((move, j) => {
      scores[j] += playOut(play(world, move), me)
    })
  }
  let best = moves.indexOf(usual)
  scores.forEach((n, j) => {
    if (n > scores[best]) best = j
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
