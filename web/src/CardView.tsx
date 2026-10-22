import { type Card, cardLabel, isRed, rankLabel } from './game'
import { Suit } from './Suit'

interface CardViewProps {
  card?: Card | null
  faceDown?: boolean
  onClick?: () => void
  label?: string
  disabled?: boolean
  flash?: boolean
  className?: string
}

// a single card in the style of the Windows XP card set: white face, rank and suit in
// the corners, and a blue patterned back
export function CardView({ card, faceDown, onClick, label, disabled, flash, className = '' }: CardViewProps) {
  const classes = ['card', faceDown || !card ? 'card--back' : 'card--face', className]
  if (card && !faceDown && isRed(card)) classes.push('card--red')
  if (flash) classes.push('card--flash')
  if (onClick && !disabled) classes.push('card--clickable')

  const content =
    faceDown || !card ? (
      <CardBack />
    ) : (
      <>
        <span className="card__corner card__corner--top">
          {rankLabel(card.rank)}
          <Suit suit={card.suit} className="card__corner-suit" />
        </span>
        <span className={`card__center ${card.rank > 10 ? 'card__center--face' : ''}`}>
          {card.rank > 10 ? rankLabel(card.rank) : <Suit suit={card.suit} className="card__pip" />}
        </span>
        <span className="card__corner card__corner--bottom">
          {rankLabel(card.rank)}
          <Suit suit={card.suit} className="card__corner-suit" />
        </span>
      </>
    )

  const name = label ?? (card && !faceDown ? cardLabel(card) : 'Face-down card')
  if (!onClick) {
    return (
      <div className={classes.join(' ')} role="img" aria-label={name}>
        {content}
      </div>
    )
  }
  return (
    <button type="button" className={classes.join(' ')} onClick={onClick} aria-label={name} disabled={disabled}>
      {content}
    </button>
  )
}

// the card back, a nod to a chilli crisp jar label: a red field with faint sunburst rays,
// gold bands, an oval cameo (holding a chilli) and 饼干 ("biscuits") in yellow
const BACK_W = 65
const BACK_H = 90
const CAMEO = { x: 32.5, y: 37, rx: 15, ry: 18.5 }

const RAYS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2
  const b = ((i + 0.5) / 18) * Math.PI * 2
  const r = 80
  const { x, y } = CAMEO
  return `M${x} ${y}L${x + r * Math.cos(a)} ${y + r * Math.sin(a)}L${x + r * Math.cos(b)} ${y + r * Math.sin(b)}Z`
}).join('')

const BAND_DIAMONDS = (y: number) =>
  Array.from({ length: 13 }, (_, i) => {
    const x = 2.5 + i * 5
    return `M${x} ${y - 1.6}L${x + 1.6} ${y}L${x} ${y + 1.6}L${x - 1.6} ${y}Z`
  }).join('')

function Band({ y }: { y: number }) {
  return (
    <g>
      <rect x="0" y={y} width={BACK_W} height="6" fill="#e9b640" />
      <path d={BAND_DIAMONDS(y + 3)} fill="#b3261e" />
      <rect x="0" y={y - 0.6} width={BACK_W} height="0.6" fill="#fbe08a" />
      <rect x="0" y={y + 6} width={BACK_W} height="0.6" fill="#fbe08a" />
    </g>
  )
}

function CardBack() {
  const { x, y, rx, ry } = CAMEO
  return (
    <svg className="card__back-art" viewBox={`0 0 ${BACK_W} ${BACK_H}`} preserveAspectRatio="none" aria-hidden="true">
      <rect width={BACK_W} height={BACK_H} fill="#c8161b" />
      <path d={RAYS} fill="#ff6a45" opacity="0.16" />
      <Band y={3} />
      <Band y={BACK_H - 9} />
      {/* the cameo: a gold ring around a cream oval */}
      <ellipse cx={x} cy={y} rx={rx + 1.2} ry={ry + 1.2} fill="#7a1408" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#f2be3d" />
      <ellipse cx={x} cy={y} rx={rx - 2.4} ry={ry - 2.4} fill="#fff1d2" />
      {/* a chilli */}
      <path
        d="M27 28.5C23.8 35 26 45.5 37.5 50.5C33.8 44.5 32.8 38 33.4 30.6C31.4 28.4 29 28 27 28.5Z"
        fill="#d81e1e"
        stroke="#7a0b0b"
        strokeWidth="0.6"
      />
      <path d="M28 31.5C27 36.5 28.8 42 32 45.5" fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.55" strokeLinecap="round" />
      <ellipse cx="30.2" cy="28.9" rx="3.4" ry="1.7" fill="#3c9a2a" transform="rotate(-14 30.2 28.9)" />
      <path d="M30 28.4C29.6 26 31.2 24 33.8 23.6" fill="none" stroke="#2f7d1f" strokeWidth="1.5" strokeLinecap="round" />
      <text x={x} y="71.5" textAnchor="middle" className="card__back-text">
        饼干
      </text>
    </svg>
  )
}

export function EmptySpot({ label, onClick }: { label?: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" className="card card--empty card--clickable" onClick={onClick} aria-label={label}>
        {label && <span className="card__empty-label">{label}</span>}
      </button>
    )
  }
  return <div className="card card--empty">{label && <span className="card__empty-label">{label}</span>}</div>
}
