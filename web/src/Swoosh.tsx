import type { CSSProperties } from 'react'
import { CardView } from './CardView'
import type { Card } from './game'

export interface Point {
  x: number
  y: number
}

export interface SwooshAnimation {
  id: number
  // the top of the picked-up pile, laid out the way the pile showed them
  cards: Card[]
  pile: Point
  hand: Point
  // a failed hidden card, shown where it was flipped before it joins the swoosh
  flipped: Card | null
  flippedAt: Point | null
  duration: number
  // who is picking up, and the ids of every card on its way into their hand
  player: number
  hiddenIds: Set<number>
}

// how long a failed flip sits on the table, stamped 错！, before it swooshes away
export const WRONG_HOLD = 750
const SWOOSH = 520
const STAGGER = 55
// faded copies that follow each card a moment behind, as a motion trail
const TRAIL = [0, 45, 90]

export function swooshDuration(cardCount: number, flipped: boolean) {
  return (flipped ? WRONG_HOLD : 0) + SWOOSH + cardCount * STAGGER + TRAIL[TRAIL.length - 1] + 60
}

// `appearAt` keeps a card invisible until then (the failed hidden card waits for its reveal)
function flying(card: Card, from: Point, to: Point, delay: number, key: string, ghost: number, appearAt?: number) {
  const animations = [`swoosh ${SWOOSH}ms cubic-bezier(0.55, 0, 0.8, 0.35) ${delay}ms both`]
  if (appearAt !== undefined) animations.push(`swoosh-appear 0s linear ${appearAt}ms both`)
  const style = {
    left: from.x,
    top: from.y,
    '--dx': `${to.x - from.x}px`,
    '--dy': `${to.y - from.y}px`,
    '--rot': `${((card.id * 37) % 50) - 25}deg`,
    animation: animations.join(', '),
  } as CSSProperties
  return (
    <div className={`swoosh__card ${ghost ? `swoosh__card--ghost-${ghost}` : ''}`} style={style} key={key}>
      <CardView card={card} />
    </div>
  )
}

// the pile flying into the hand of whoever had to pick it up. When the pickup came from a
// hidden card that couldn't be played, that card is revealed first under a big 错！ ("wrong!")
export function Swoosh({ animation }: { animation: SwooshAnimation }) {
  const { cards, pile, hand, flipped, flippedAt } = animation
  const start = flipped ? WRONG_HOLD : 0
  const movers: { card: Card; from: Point; late?: boolean }[] = cards.map((card, i) => ({
    card,
    from: { x: pile.x + i * 16, y: pile.y },
  }))
  if (flipped && flippedAt) movers.push({ card: flipped, from: flippedAt, late: true })

  return (
    <div className="swoosh" aria-hidden="true">
      {/* later trail copies first, so the leading card is drawn on top */}
      {[...TRAIL].reverse().map((lag, ghost) =>
        movers.map(({ card, from, late }, i) =>
          flying(
            card,
            from,
            hand,
            start + i * STAGGER + lag,
            `${card.id}-${lag}`,
            TRAIL.length - 1 - ghost,
            late ? start : undefined,
          ),
        ),
      )}
      {flipped && flippedAt && (
        <>
          <div
            className="swoosh__reveal"
            style={{ left: flippedAt.x, top: flippedAt.y, '--hold': `${WRONG_HOLD}ms` } as CSSProperties}
          >
            <CardView card={flipped} />
          </div>
          <span className="swoosh__wrong" lang="zh" style={{ left: flippedAt.x, top: flippedAt.y }}>
            错！
          </span>
        </>
      )}
    </div>
  )
}

export interface DealAnimation {
  id: number
  player: number
  cards: Card[]
  deck: Point
  hand: Point
  // only your own cards turn face up as they arrive
  reveal: boolean
  duration: number
  hiddenIds: Set<number>
}

// let the played card fly out first, then draw
const DEAL_DELAY = 300
const DEAL_FLIGHT = 420
const DEAL_STAGGER = 110

export function dealDuration(cardCount: number) {
  return DEAL_DELAY + DEAL_FLIGHT + (cardCount - 1) * DEAL_STAGGER + 30
}

// cards drawn after a play fly from the deck into the hand, flipping face up on the way
// when they are yours
export function Deal({ animation }: { animation: DealAnimation }) {
  const { cards, deck, hand, reveal } = animation
  return (
    <div className="swoosh" aria-hidden="true">
      {cards.map((card, i) => {
        const delay = DEAL_DELAY + i * DEAL_STAGGER
        const style = {
          left: deck.x,
          top: deck.y,
          '--dx': `${hand.x - deck.x + i * 18}px`,
          '--dy': `${hand.y - deck.y}px`,
          animation: `deal ${DEAL_FLIGHT}ms cubic-bezier(0.25, 0.8, 0.35, 1) ${delay}ms both`,
        } as CSSProperties
        return (
          <div className="deal__card" style={style} key={card.id}>
            {reveal ? (
              <div className="deal__flipper" style={{ animation: `deal-flip ${DEAL_FLIGHT}ms ease-in-out ${delay}ms both` }}>
                <div className="deal__face">
                  <CardView card={card} />
                </div>
                <div className="deal__face deal__face--back">
                  <CardView faceDown />
                </div>
              </div>
            ) : (
              <CardView faceDown />
            )}
          </div>
        )
      })}
    </div>
  )
}

export interface PlayFlightAnimation {
  id: number
  card: Card
  from: Point
  to: Point
  // cards from the computer's hand or a hidden slot start face down and flip face up
  faceDown: boolean
}

export const PLAY_FLIGHT = 430

// a played card flips out of the hand and arcs onto the pile
export function PlayFlight({ animation }: { animation: PlayFlightAnimation }) {
  const { card, from, to, faceDown } = animation
  const style = {
    left: from.x,
    top: from.y,
    '--dx': `${to.x - from.x}px`,
    '--dy': `${to.y - from.y}px`,
    animation: `play-arc ${PLAY_FLIGHT}ms ease-in-out both`,
  } as CSSProperties
  const flip = {
    '--flip-from': faceDown ? '180deg' : '0deg',
    animation: `play-flip ${PLAY_FLIGHT}ms ease-in-out both`,
  } as CSSProperties
  return (
    <div className="swoosh" aria-hidden="true">
      <div className="deal__card play__card" style={style}>
        <div className="deal__flipper" style={flip}>
          <div className="deal__face">
            <CardView card={card} />
          </div>
          <div className="deal__face deal__face--back">
            <CardView faceDown />
          </div>
        </div>
      </div>
    </div>
  )
}
