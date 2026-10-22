import type { CSSProperties } from 'react'
import { CardView } from './CardView'
import type { PileCard } from './game'

// a comic-book starburst: points alternate between an outer and inner radius
const BURST_POINTS = Array.from({ length: 28 }, (_, i) => {
  const radius = i % 2 ? 26 : i % 4 ? 46 : 50
  const angle = (i / 28) * Math.PI * 2
  return `${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`
}).join(' ')

// the explosion when a 10 blows up the pile: a starburst, 轰！ ("hōng", Chinese for
// kaboom), and the pile's top cards flying apart. With a delay, the pile waits while the
// 10 (`landing`) is still flying in, and that card only appears once it lands.
export function Kaboom({ cards, delay = 0, landing }: { cards: PileCard[]; delay?: number; landing?: number }) {
  return (
    <div className="kaboom" aria-hidden="true" style={{ '--kaboom-delay': `${delay}ms` } as CSSProperties}>
      {cards.map((card, i) => {
        // spread the shards in different directions, stable per card
        const angle = ((card.id * 137.5 + i * 90) % 360) * (Math.PI / 180)
        const style = {
          left: i * 16,
          '--dx': `${Math.round(Math.cos(angle) * 170)}px`,
          '--dy': `${Math.round(Math.sin(angle) * 110 - 40)}px`,
          '--rot': `${((card.id * 53) % 240) - 120}deg`,
        } as CSSProperties
        return (
          <div className={`kaboom__shard ${card.id === landing ? 'kaboom__shard--landing' : ''}`} style={style} key={card.id}>
            <CardView card={card} />
          </div>
        )
      })}
      <div className="kaboom__boom">
        <svg className="kaboom__burst" viewBox="0 0 100 100">
          <polygon points={BURST_POINTS} className="kaboom__burst-outer" />
          <circle cx="50" cy="50" r="22" className="kaboom__burst-inner" />
        </svg>
        <span className="kaboom__text" lang="zh-Hans">
          轰！
        </span>
      </div>
    </div>
  )
}
