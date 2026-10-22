import type { CSSProperties } from 'react'
import { CardView } from './CardView'
import type { Card } from './game'

export interface Point {
  x: number
  y: number
}

// Every flying card lands exactly on the spot it will occupy (the hand keeps an invisible
// place for it), so nothing jumps when the animation ends. Cards flip the way they did in
// games from the Windows XP days: they squash flat and spring back as the other side.
const EASE = 'cubic-bezier(0.45, 0.05, 0.25, 1)'

type Side = 'front' | 'back'

// an old-school card flip from one side to the other. Front to front squashes and springs
// back face up, which reads as a flick.
export function RetroFlip({
  card,
  from,
  to,
  duration,
  delay,
}: {
  card: Card
  from: Side
  to: Side
  duration: number
  delay: number
}) {
  const squash = `retro-squash ${duration}ms ease-in-out ${delay}ms both`
  const face = (side: Side) => (side === 'front' ? <CardView card={card} /> : <CardView faceDown />)
  return (
    <div className="retro-flip" style={{ animation: squash }}>
      {from === to ? (
        face(from)
      ) : (
        <>
          <div className="retro-flip__face" style={{ animation: `retro-first-half ${duration}ms step-end ${delay}ms both` }}>
            {face(from)}
          </div>
          <div className="retro-flip__face" style={{ animation: `retro-second-half ${duration}ms step-end ${delay}ms both` }}>
            {face(to)}
          </div>
        </>
      )}
    </div>
  )
}

// a card moving from one point to another on the felt, optionally flipping on the way
function Flyer({
  card,
  from,
  to,
  duration,
  delay,
  flip,
  appearAt,
}: {
  card: Card
  from: Point
  to: Point
  duration: number
  delay: number
  flip?: { from: Side; to: Side }
  // keeps the card invisible until then (a failed hidden card waits for its reveal)
  appearAt?: number
}) {
  const animations = [`fly ${duration}ms ${EASE} ${delay}ms both`]
  if (appearAt !== undefined) animations.push(`swoosh-appear 0s linear ${appearAt}ms both`)
  const style = {
    left: from.x,
    top: from.y,
    '--dx': `${to.x - from.x}px`,
    '--dy': `${to.y - from.y}px`,
    animation: animations.join(', '),
  } as CSSProperties
  return (
    <div className="flyer" style={style}>
      {flip ? <RetroFlip card={card} from={flip.from} to={flip.to} duration={duration} delay={delay} /> : <CardView card={card} />}
    </div>
  )
}

export interface SwooshAnimation {
  id: number
  // the top of the picked-up pile, laid out the way the pile showed them
  cards: Card[]
  pile: Point
  // where each card lands in the picker's hand
  targets: Map<number, Point>
  // a failed hidden card, shown where it was flipped before it joins the swoosh
  flipped: Card | null
  flippedAt: Point | null
  // the computer's cards turn face down as they arrive
  intoHiddenHand: boolean
  duration: number
  // who is picking up, and the ids of every card on its way into their hand
  player: number
  hiddenIds: Set<number>
}

// how long a failed flip sits on the table, stamped 错！, before it swooshes away
export const WRONG_HOLD = 750
const SWOOSH = 560
const STAGGER = 60

export function swooshDuration(cardCount: number, flipped: boolean) {
  return (flipped ? WRONG_HOLD : 0) + SWOOSH + cardCount * STAGGER + 40
}

// the pile flying into the hand of whoever had to pick it up. When the pickup came from a
// hidden card that couldn't be played, that card is revealed first under a big 错！ ("wrong!")
export function Swoosh({ animation }: { animation: SwooshAnimation }) {
  const { cards, pile, targets, flipped, flippedAt, intoHiddenHand } = animation
  const start = flipped ? WRONG_HOLD : 0
  const movers: { card: Card; from: Point; late?: boolean }[] = cards.map((card, i) => ({
    card,
    from: { x: pile.x + i * 16, y: pile.y },
  }))
  if (flipped && flippedAt) movers.push({ card: flipped, from: flippedAt, late: true })

  return (
    <div className="swoosh" aria-hidden="true">
      {movers.map(({ card, from, late }, i) => (
        <Flyer
          key={card.id}
          card={card}
          from={from}
          to={targets.get(card.id) ?? from}
          duration={SWOOSH}
          delay={start + i * STAGGER}
          flip={intoHiddenHand ? { from: 'front', to: 'back' } : undefined}
          appearAt={late ? start : undefined}
        />
      ))}
      {flipped && flippedAt && (
        <>
          <div
            className="swoosh__reveal"
            style={{ left: flippedAt.x, top: flippedAt.y, '--hold': `${WRONG_HOLD}ms` } as CSSProperties}
          >
            <RetroFlip card={flipped} from="back" to="front" duration={320} delay={0} />
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
  // where each drawn card lands in the hand
  targets: Map<number, Point>
  // only your own cards turn face up as they arrive
  reveal: boolean
  duration: number
  hiddenIds: Set<number>
}

// let the played card get on its way first, then draw
const DEAL_DELAY = 280
const DEAL_FLIGHT = 480
const DEAL_STAGGER = 120

export function dealDuration(cardCount: number) {
  return DEAL_DELAY + DEAL_FLIGHT + (cardCount - 1) * DEAL_STAGGER + 40
}

// cards drawn after a play fly from the deck into the hand, flipping face up on the way
// when they are yours
export function Deal({ animation }: { animation: DealAnimation }) {
  const { cards, deck, targets, reveal } = animation
  return (
    <div className="swoosh" aria-hidden="true">
      {cards.map((card, i) => (
        <Flyer
          key={card.id}
          card={card}
          from={deck}
          to={targets.get(card.id) ?? deck}
          duration={DEAL_FLIGHT}
          delay={DEAL_DELAY + i * DEAL_STAGGER}
          flip={{ from: 'back', to: reveal ? 'front' : 'back' }}
        />
      ))}
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

export const PLAY_FLIGHT = 520

// a played card flips out of the hand and arcs onto the pile: one smooth move across, with
// a separate rise and fall layered on top so the arc never stalls at its peak
export function PlayFlight({ animation }: { animation: PlayFlightAnimation }) {
  const { card, from, to, faceDown } = animation
  const style = {
    left: from.x,
    top: from.y,
    '--dx': `${to.x - from.x}px`,
    '--dy': `${to.y - from.y}px`,
    animation: `fly ${PLAY_FLIGHT}ms ${EASE} both`,
  } as CSSProperties
  return (
    <div className="swoosh" aria-hidden="true">
      <div className="flyer play__card" style={style}>
        <div style={{ animation: `hop ${PLAY_FLIGHT}ms linear both` }}>
          <RetroFlip card={card} from={faceDown ? 'back' : 'front'} to="front" duration={PLAY_FLIGHT} delay={0} />
        </div>
      </div>
    </div>
  )
}
