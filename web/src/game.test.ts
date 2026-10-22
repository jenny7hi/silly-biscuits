import { describe, expect, it } from 'vitest'
import {
  type Card,
  type GameState,
  type PileCard,
  cardsLeft,
  computerTurn,
  isLegal,
  newGame,
  noMove,
  play,
  reference,
} from './game'

// small seeded generator so games are reproducible
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

  it('picks up an illegal hidden card along with the pile and ends the turn', () => {
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
    expect(next.current).toBe(1)
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
  it('picks up the whole pile and passes the turn', () => {
    const g = withPile([onPile(4), onPile(9), onPile(13)])
    const next = noMove(g)
    expect(next.players[0].hand).toHaveLength(8)
    expect(next.players[0].hand.some((c) => 'value' in c)).toBe(false)
    expect(next.pile).toEqual([])
    expect(next.deck).toHaveLength(g.deck.length)
    expect(next.current).toBe(1)
    expect(next.pickup).toMatchObject({ id: 1, player: 0, flipped: null })
    expect(next.pickup?.cards.map((c) => c.rank)).toEqual([4, 9, 13])
  })

  it('does not end the game when the deck is empty', () => {
    const g = { ...withPile([onPile(13)]), deck: [] }
    expect(noMove(g).winner).toBeNull()
  })
})

describe('computer vs computer', () => {
  it('finishes almost every game, always by a player running out of cards', () => {
    let hiddenPlays = 0
    let unfinished = 0
    for (let seed = 0; seed < 300; seed++) {
      let g = newGame({
        players: [
          { name: 'A', isComputer: true },
          { name: 'B', isComputer: true },
        ],
        rng: mulberry32(seed),
      })
      let turns = 0
      while (g.winner === null && turns < 3000) {
        const before = g.players.map((p) => p.slots.filter((s) => s.hidden).length)
        g = computerTurn(g)
        expect(g.error).toBeNull()
        hiddenPlays += before.reduce((n, h, i) => n + h - g.players[i].slots.filter((s) => s.hidden).length, 0)
        turns++
      }
      // once every 10 is in the discard, no cards leave play, and two deterministic
      // computers can pass the same cards back and forth forever. That is rare.
      if (g.winner === null) {
        unfinished++
        continue
      }
      // the only way to win is to play every card
      expect(cardsLeft(g.players[g.winner])).toBe(0)
    }
    expect(unfinished).toBeLessThan(10)
    expect(hiddenPlays).toBeGreaterThan(0)
  })
})
