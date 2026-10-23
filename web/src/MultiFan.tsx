import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { CardView } from './CardView'
import { type Card, rankLabel } from './game'
import type { Point } from './Swoosh'

export interface FanState {
  // the card that was held, then the others of the same rank
  cards: Card[]
  // where the held card sits on the felt
  anchor: Point
  // touch fans stay open until a choice or a tap elsewhere; mouse fans close when the
  // pointer leaves them
  touch: boolean
}

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four']

// Clicking a card you hold several of plays them all. To play fewer, hold one (hover for a
// second with a mouse, or press and hold on a touch screen): the matching cards fan out
// above it, with a button for each smaller number, "Only 1" up to one short of all of them.
export function MultiFan({
  fan,
  feltWidth,
  onPlay,
  onClose,
}: {
  fan: FanState
  feltWidth: number
  onPlay: (count: number) => void
  onClose: () => void
}) {
  const { cards, anchor, touch } = fan
  const [preview, setPreview] = useState(1)
  const ref = useRef<HTMLDivElement>(null)

  // close on Escape, or on a tap or click anywhere outside the fan
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape)
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', escape)
    }
  }, [onClose])

  // wide enough for the spread of cards and for a button per count
  const cardWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 71
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const width = Math.max(cardWidth + (cards.length - 1) * 26 + 40, (cards.length - 1) * (coarse ? 76 : 66) + 24)
  const left = Math.min(Math.max(anchor.x + cardWidth / 2 - width / 2, 4), Math.max(4, feltWidth - width - 4))
  const rank = rankLabel(cards[0].rank)

  return (
    <div
      ref={ref}
      className="multi-fan"
      style={{ left, top: anchor.y - 128, width }}
      role="dialog"
      aria-label={`Play your ${rank}s together`}
      onPointerLeave={(e) => !touch && e.pointerType === 'mouse' && onClose()}
    >
      <div className="multi-fan__cards" aria-hidden="true">
        {cards.map((card, i) => {
          const spread = i - (cards.length - 1) / 2
          const style = {
            '--fan-x': `${spread * 26}px`,
            '--fan-rot': `${spread * 9}deg`,
            '--fan-lift': i < preview ? '-8px' : '0px',
            zIndex: i,
          } as CSSProperties
          return (
            <div className={`multi-fan__card ${i < preview ? 'multi-fan__card--chosen' : ''}`} style={style} key={card.id}>
              <CardView card={card} />
            </div>
          )
        })}
      </div>
      <div className="multi-fan__buttons">
        {cards.slice(1).map((_, i) => {
          const count = i + 1
          return (
            <button
              type="button"
              className="xp-push-button multi-fan__button"
              key={count}
              onPointerEnter={() => setPreview(count)}
              onFocus={() => setPreview(count)}
              onClick={() => onPlay(count)}
              aria-label={`Play only ${NUMBER_WORDS[count]} ${rank}${count > 1 ? 's' : ''}`}
            >
              Only {count}
            </button>
          )
        })}
      </div>
    </div>
  )
}
