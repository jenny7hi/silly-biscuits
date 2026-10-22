import { describe, expect, it } from 'vitest'
import { type Difficulty, computerMove, computerTurn, unseenCards } from './ai'
import {
  type Card,
  type GameState,
  type PileCard,
  SUITS,
  cloneState,
  isLegal,
  newGame,
  noMove,
  play,
  reference,
  shuffle,
} from './game'
import { mulberry32, twoComputers } from './testing'


let nextId = 1000
const card = (rank: number): Card => ({ id: nextId++, rank, suit: '♠' })
const onPile = (rank: number, value = rank): PileCard => ({ ...card(rank), value })

function withPile(pile: PileCard[], goingUp = true): GameState {
  return { ...newGame({ rng: mulberry32(1) }), pile, goingUp }
}

describe('newGame', () => {
  it('deals 5 hand cards and 3 reserved slots to each player', () => {
    const g = newGame({ rng: mulberry32(7) })
    for (const p of g.players) {
      expect(p.hand).toHaveLength(5)
      expect(p.slots).toHaveLength(3)
      expect(p.slots.every((s) => s.public && s.hidden)).toBe(true)
    }
    expect(g.pile).toHaveLength(1)
    expect(g.deck).toHaveLength(52 - 22 - 1)
  })

  it('uses one deck per three players', () => {
    const players = Array.from({ length: 4 }, (_, i) => ({ name: `P${i}`, isComputer: true }))
    const g = newGame({ players, rng: mulberry32(7) })
    expect(g.deck.length + g.pile.length + 4 * 11).toBe(104)
  })
})

describe('isLegal', () => {
  it('needs a strictly higher card going up and lower going down', () => {
    expect(isLegal(withPile([onPile(7)]), card(9))).toBe(true)
    expect(isLegal(withPile([onPile(7)]), card(7))).toBe(false)
    expect(isLegal(withPile([onPile(7)], false), card(5))).toBe(true)
    expect(isLegal(withPile([onPile(7)], false), card(9))).toBe(false)
  })

  it('always allows special cards', () => {
    for (const rank of [2, 8, 10]) expect(isLegal(withPile([onPile(13)]), card(rank))).toBe(true)
  })

  it('allows anything after an 8 or a 10', () => {
    expect(isLegal(withPile([onPile(13), onPile(8)]), card(3))).toBe(true)
    expect(isLegal(withPile([onPile(13), onPile(10)]), card(3))).toBe(true)
  })

  it('compares against the last non-special card after a 2', () => {
    const pile = [onPile(9), onPile(2)]
    expect(reference(pile)?.rank).toBe(9)
    expect(isLegal(withPile(pile, false), card(4))).toBe(true)
    expect(isLegal(withPile(pile, false), card(11))).toBe(false)
  })

  it('lets an ace go on anything but another ace', () => {
    expect(isLegal(withPile([onPile(13)]), card(1))).toBe(true)
    expect(isLegal(withPile([onPile(1, 14)]), card(1))).toBe(false)
  })
})

describe('play', () => {
  it('rejects an illegal hand card without changing the turn', () => {
    const g = withPile([onPile(13)])
    const low = card(4)
    g.players[0].hand = [low]
    const next = play(g, { from: 'hand', cardId: low.id })
    expect(next.error).toBeTruthy()
    expect(next.current).toBe(0)
  })

  it('keeps the turn after a 10 and passes it after an 8', () => {
    const ten = card(10)
    const eight = card(8)
    const g = withPile([onPile(5)])
    g.players[0].hand = [ten, eight]
    g.deck = []
    let next = play(g, { from: 'hand', cardId: ten.id })
    expect(next.current).toBe(0)
    expect(next.pile).toEqual([])
    expect(next.discard.map((c) => c.rank)).toEqual([5, 10])
    expect(next.lastPlay).toMatchObject({ id: 1, player: 0, card: ten, from: 'hand', slot: null, pileSize: 2 })
    next = play(next, { from: 'hand', cardId: eight.id })
    expect(next.current).toBe(1)
  })

  it('flips direction on a 2', () => {
    const two = card(2)
    const g = withPile([onPile(5)])
    g.players[0].hand.push(two)
    expect(play(g, { from: 'hand', cardId: two.id }).goingUp).toBe(false)
  })

  it('locks reserved cards until the deck is empty', () => {
    const g = withPile([onPile(3)])
    expect(play(g, { from: 'public', slot: 0 }).error).toMatch(/deck is empty/)
  })

  it('picks up an illegal hidden card along with the pile, then plays again', () => {
    const g = withPile([onPile(9), onPile(12)])
    const hidden = card(4)
    g.deck = []
    g.players[0].hand = []
    g.players[0].slots[0] = { public: null, hidden }
    const next = play(g, { from: 'hidden', slot: 0 })
    expect(next.players[0].slots[0]).toEqual({ public: null, hidden: null })
    expect(next.players[0].hand.map((c) => c.rank)).toEqual([4, 9, 12])
    expect(next.pickup).toMatchObject({ player: 0, flipped: hidden, slot: 0 })
    expect(next.pile).toEqual([])
    expect(next.current).toBe(0)
  })

  it('refills the hand to five from the deck', () => {
    const g = withPile([onPile(8)])
    const next = play(g, { from: 'hand', cardId: g.players[0].hand[0].id })
    expect(next.players[0].hand).toHaveLength(5)
    expect(next.draw).toMatchObject({ id: 1, player: 0, cards: [g.deck[0]] })
  })

  it('declares a winner when the last card is played', () => {
    const g = withPile([onPile(3)])
    const last = card(9)
    g.deck = []
    g.players[0].hand = [last]
    g.players[0].slots = [0, 1, 2].map(() => ({ public: null, hidden: null }))
    expect(play(g, { from: 'hand', cardId: last.id }).winner).toBe(0)
  })
})

describe('noMove', () => {
  it('picks up the whole pile, then plays again', () => {
    const g = withPile([onPile(4), onPile(9), onPile(13)])
    const next = noMove(g)
    expect(next.players[0].hand).toHaveLength(8)
    expect(next.players[0].hand.some((c) => 'value' in c)).toBe(false)
    expect(next.pile).toEqual([])
    expect(next.deck).toHaveLength(g.deck.length)
    expect(next.current).toBe(0)
    expect(next.pickup).toMatchObject({ id: 1, player: 0, flipped: null })
    expect(next.pickup?.cards.map((c) => c.rank)).toEqual([4, 9, 13])
  })

  it('does not end the game when the deck is empty', () => {
    const g = { ...withPile([onPile(13)]), deck: [] }
    expect(noMove(g).winner).toBeNull()
  })
})

// an endgame with the deck empty where every card not listed is already on the pile, so
// the computer (player 0) can work out exactly what the opponent is holding. offTable
// lists ranks that are in play somewhere else, e.g. in a reserved slot set up by the test.
function endgame(opts: { mine: number[]; theirs: number[]; top: number; goingUp?: boolean; offTable?: number[] }) {
  const { mine, theirs, top, goingUp = true, offTable = [] } = opts
  const g = withPile([], goingUp)
  const counts = Array(14).fill(4)
  for (const rank of [...mine, ...theirs, ...offTable, top]) counts[rank]--
  g.pile = counts.flatMap((n, rank) => Array.from({ length: rank ? n : 0 }, () => onPile(rank)))
  g.pile.push(onPile(top))
  g.deck = []
  const empty = () => [0, 1, 2].map(() => ({ public: null, hidden: null }))
  g.players[0].hand = mine.map(card)
  g.players[0].slots = empty()
  g.players[1].hand = theirs.map(card)
  g.players[1].slots = empty()
  return g
}

const played = (g: GameState, difficulty: Difficulty) => {
  const move = computerMove(g, difficulty, mulberry32(5))
  return move?.from === 'hand' ? g.players[0].hand.find((c) => c.id === move.cardId)?.rank : move
}

describe('computerMove', () => {
  it('only ever picks a legal card on easy', () => {
    const g = endgame({ mine: [3, 5, 9, 12], theirs: [4], top: 7 })
    const picks = new Set<number>()
    for (let seed = 0; seed < 20; seed++) {
      const move = computerMove(g, 'easy', mulberry32(seed))
      picks.add(move?.from === 'hand' ? g.players[0].hand.find((c) => c.id === move.cardId)!.rank : 0)
    }
    expect([...picks].sort()).toEqual([12, 9])
  })

  it('plays the lowest useful card on medium', () => {
    expect(played(endgame({ mine: [8, 1, 9, 12], theirs: [4], top: 7 }), 'medium')).toBe(9)
    expect(played(endgame({ mine: [8, 1, 3, 5], theirs: [4], top: 7, goingUp: false }), 'medium')).toBe(5)
  })

  it('clears a public card covering a hidden one before playing from the hand', () => {
    const g = endgame({ mine: [9], theirs: [10], top: 3, offTable: [11, 6] })
    g.players[0].slots[1] = { public: card(11), hidden: card(6) }
    for (const difficulty of ['medium', 'hard'] as const) {
      expect(computerMove(g, difficulty, mulberry32(1))).toEqual({ from: 'public', slot: 1 })
    }
  })

  it('leaves the opponent stuck on hard when that wins the game', () => {
    // the opponent's last card is a 5: a 4 lets them win, but after a king they have to
    // pick up the pile and the 4 then wins
    const g = endgame({ mine: [4, 13], theirs: [5], top: 3 })
    expect(played(g, 'medium')).toBe(4)
    expect(played(g, 'hard')).toBe(13)
  })

  it('flips the direction on hard when the opponent cannot follow it', () => {
    // going up from a 3 the opponent's queen would follow and win, but after a 2 they
    // need something lower
    const g = endgame({ mine: [2, 4], theirs: [12], top: 3 })
    expect(played(g, 'hard')).toBe(2)
  })

  it('never uses hidden information on hard', () => {
    // shuffling the cards hard can't see must not change what it plays
    for (let seed = 0; seed < 30; seed++) {
      let g = twoComputers(seed)
      const rng = mulberry32(seed)
      while (g.winner === null && g.deck.length > 2) g = computerTurn(g, 'medium', rng)
      if (g.winner !== null) continue
      const me = g.current
      const scrambled = cloneState(g)
      const pool = shuffle(unseenCards(g, me), mulberry32(seed + 1)).map((c, i) => ({ ...c, id: 5000 + i, suit: SUITS[i % 4] }))
      scrambled.players.forEach((p, i) => {
        if (i !== me) p.hand = pool.splice(0, p.hand.length)
        for (const slot of p.slots) if (slot.hidden) slot.hidden = pool.pop()!
      })
      scrambled.deck = pool.splice(0, g.deck.length)
      expect(computerMove(scrambled, 'hard', mulberry32(9))).toEqual(computerMove(g, 'hard', mulberry32(9)))
    }
  })
})
