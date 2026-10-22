import { afterAll, describe, expect, it } from 'vitest'
import { type Difficulty, computerTurn } from './ai'
import { cardsLeft } from './game'
import { mulberry32, twoComputers } from './testing'

// `npm test` plays a short tournament and `npm run test:tournament` plays the full one
const FULL = import.meta.env.MODE === 'tournament'

interface Matchup {
  a: Difficulty
  b: Difficulty
  // deals in the short and full tournaments. Between different levels each deal is played
  // twice, once with each side going first.
  deals: [number, number]
  // turns before a game counts as unfinished. Computers that don't play at random can pass
  // the same cards back and forth forever once every 10 is gone, while Easy's random games
  // just run long.
  maxTurns: number
}

interface Result {
  games: number
  aWins: number
  bWins: number
  // wins for whoever moved first: seat 0 always does
  firstWins: number
  unfinished: number
  hiddenPlays: number
}

function playMatch({ a, b, deals, maxTurns }: Matchup): Result {
  const rng = mulberry32(2024)
  const r: Result = { games: 0, aWins: 0, bWins: 0, firstWins: 0, unfinished: 0, hiddenPlays: 0 }
  const mirror = a === b
  for (let deal = 0; deal < deals[FULL ? 1 : 0]; deal++) {
    for (const aSeat of mirror ? [0] : [0, 1]) {
      const seats = aSeat === 0 ? [a, b] : [b, a]
      let g = twoComputers(1000 + deal)
      r.games++
      for (let turns = 0; g.winner === null && turns < maxTurns; turns++) {
        const hidden = g.players.map((p) => p.slots.filter((s) => s.hidden).length)
        g = computerTurn(g, seats[g.current], rng)
        expect(g.error).toBeNull()
        r.hiddenPlays += hidden.reduce((n, h, i) => n + h - g.players[i].slots.filter((s) => s.hidden).length, 0)
      }
      if (g.winner === null) {
        r.unfinished++
        continue
      }
      // the only way to win is to play every card
      expect(cardsLeft(g.players[g.winner])).toBe(0)
      if (g.winner === aSeat) r.aWins++
      else r.bWins++
      if (g.winner === 0) r.firstWins++
    }
  }
  return r
}

const percent = (n: number, of: number) => `${Math.round((100 * n) / of)}%`
const table: string[] = []

function report({ a, b }: Matchup, r: Result) {
  const finished = r.games - r.unfinished
  const share = a === b ? `first player ${percent(r.firstWins, finished)}` : `${a} ${percent(r.aWins, finished)}`
  table.push(`${`${a} vs ${b}`.padEnd(16)} ${String(r.games).padStart(4)} games  ${share.padEnd(18)} unfinished ${r.unfinished}`)
}

afterAll(() => console.log(`${FULL ? 'Full' : 'Short'} tournament\n${table.join('\n')}`))

const timeout = FULL ? 3_600_000 : 120_000

describe('stronger levels beat weaker ones', () => {
  const pairings: [Matchup, number][] = [
    [{ a: 'medium', b: 'easy', deals: [150, 500], maxTurns: 10_000 }, 0.6],
    [{ a: 'hard', b: 'medium', deals: [30, 200], maxTurns: 600 }, 0.65],
    [{ a: 'hard', b: 'easy', deals: [6, 100], maxTurns: 2000 }, 0.8],
  ]
  for (const [m, rate] of pairings) {
    it(`${m.a} beats ${m.b} more than ${rate * 100}% of the time`, () => {
      const r = playMatch(m)
      report(m, r)
      expect(r.aWins / (r.games - r.unfinished)).toBeGreaterThan(rate)
      expect(r.unfinished / r.games).toBeLessThan(0.06)
      expect(r.hiddenPlays).toBeGreaterThan(0)
    }, timeout)
  }
})

describe('neither seat has an edge when a level plays itself', () => {
  const mirrors: Matchup[] = [
    { a: 'easy', b: 'easy', deals: [300, 1000], maxTurns: 10_000 },
    { a: 'medium', b: 'medium', deals: [300, 1000], maxTurns: 600 },
    { a: 'hard', b: 'hard', deals: [8, 100], maxTurns: 600 },
  ]
  for (const m of mirrors) {
    it(`${m.a} vs ${m.a}`, () => {
      const r = playMatch(m)
      report(m, r)
      const finished = r.games - r.unfinished
      // a handful of games says nothing about seat bias, so the short Hard run skips this
      if (finished >= 100) {
        expect(r.firstWins / finished).toBeGreaterThan(0.35)
        expect(r.firstWins / finished).toBeLessThan(0.65)
      }
      expect(r.unfinished / r.games).toBeLessThan(0.06)
      expect(r.hiddenPlays).toBeGreaterThan(0)
    }, timeout)
  }
})
