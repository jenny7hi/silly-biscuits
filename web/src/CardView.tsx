import { type Card, cardLabel, isRed, rankLabel } from './game'
import { BING, GAN } from './cardBackGlyphs'
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

// the card back: a plain hong bao red field inside an ornate gold border, and in the middle a
// medallion holding a crimped biscuit, ringed by 饼干 ("biscuits") in brush calligraphy. It
// looks the same either way up, like a real card back.
const BACK_W = 65
const BACK_H = 90
const GOLD = '#f2c14e'
const RED = '#c8102e'
const DEEP_RED = '#8e0a1d'

// the border band runs between these insets from the edge
const BAND_OUT = 2.4
const BAND_IN = 7.4
const BAND_MID = (BAND_OUT + BAND_IN) / 2

const round = (v: number) => Math.round(v * 100) / 100
const rectPath = (inset: number) =>
  `M${round(inset)} ${round(inset)}H${round(BACK_W - inset)}V${round(BACK_H - inset)}H${round(inset)}Z`

// beads along the band: diamonds alternating with dots, skipping the corner blocks
const BEADS = (() => {
  const beads: { x: number; y: number; diamond: boolean }[] = []
  const along = (from: number, to: number, place: (t: number) => { x: number; y: number }) => {
    const count = Math.round((to - from) / 4.2)
    for (let i = 0; i <= count; i++) {
      const { x, y } = place(from + ((to - from) * i) / count)
      beads.push({ x: round(x), y: round(y), diamond: i % 2 === 0 })
    }
  }
  const lo = BAND_IN + 3.4
  along(lo, BACK_W - lo, (x) => ({ x, y: BAND_MID }))
  along(lo, BACK_W - lo, (x) => ({ x, y: BACK_H - BAND_MID }))
  along(lo, BACK_H - lo, (y) => ({ x: BAND_MID, y }))
  along(lo, BACK_H - lo, (y) => ({ x: BACK_W - BAND_MID, y }))
  return beads
})()

const CORNERS = [
  [BAND_MID, BAND_MID],
  [BACK_W - BAND_MID, BAND_MID],
  [BAND_MID, BACK_H - BAND_MID],
  [BACK_W - BAND_MID, BACK_H - BAND_MID],
]

// little curls tucked into the inner corners, drawn for the top left and mirrored into the rest
const CURL = 'M9.6 16.4C9.6 12.4 12.4 9.6 16.4 9.6M11.8 13.6A1.8 1.8 0 1 1 13.6 11.8'

const MEDALLION = { x: BACK_W / 2, y: BACK_H / 2, r: 22 }
const GLYPH_SCALE = 0.135
const GLYPH_RADIUS = 14.6

function CardBack() {
  const { x, y, r } = MEDALLION
  return (
    <svg className="card__back-art" viewBox={`0 0 ${BACK_W} ${BACK_H}`} preserveAspectRatio="none" aria-hidden="true">
      <rect width={BACK_W} height={BACK_H} fill={RED} />

      {/* the ornate border: a dark band of gold beads between gold rules, with fret corners */}
      <path d={rectPath(BAND_OUT) + rectPath(BAND_IN)} fill={DEEP_RED} fillRule="evenodd" />
      <path d={rectPath(1.4)} fill="none" stroke={GOLD} strokeWidth="0.9" />
      <path d={rectPath(BAND_OUT)} fill="none" stroke={GOLD} strokeWidth="0.5" />
      <path d={rectPath(BAND_IN)} fill="none" stroke={GOLD} strokeWidth="0.8" />
      <path d={rectPath(BAND_IN + 1.3)} fill="none" stroke={GOLD} strokeWidth="0.35" />
      {BEADS.map((b, i) =>
        b.diamond ? (
          <path key={i} d={`M${b.x} ${round(b.y - 1.3)}L${round(b.x + 1.3)} ${b.y}L${b.x} ${round(b.y + 1.3)}L${round(b.x - 1.3)} ${b.y}Z`} fill={GOLD} />
        ) : (
          <circle key={i} cx={b.x} cy={b.y} r="0.55" fill={GOLD} />
        ),
      )}
      {CORNERS.map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx} ${cy})`}>
          <rect x="-3.4" y="-3.4" width="6.8" height="6.8" fill={GOLD} />
          <path d="M-2 -2H2V2H-0.6V-0.6" fill="none" stroke={DEEP_RED} strokeWidth="0.75" />
        </g>
      ))}
      {['', `translate(${BACK_W} 0) scale(-1 1)`, `translate(0 ${BACK_H}) scale(1 -1)`, `translate(${BACK_W} ${BACK_H}) scale(-1 -1)`].map(
        (mirror) => (
          <path key={mirror} d={CURL} fill="none" stroke={GOLD} strokeWidth="0.6" strokeLinecap="round" transform={mirror} />
        ),
      )}

      {/* the medallion */}
      <circle cx={x} cy={y} r={r} fill={DEEP_RED} stroke={GOLD} strokeWidth="1.1" />
      <circle cx={x} cy={y} r={r - 1.6} fill="none" stroke={GOLD} strokeWidth="0.35" />

      {/* a crimped square biscuit set on its point, docked with five holes */}
      <rect
        x={x - 4.6}
        y={y - 4.6}
        width="9.2"
        height="9.2"
        rx="0.8"
        transform={`rotate(45 ${x} ${y})`}
        fill="#e9b866"
        stroke="#c88a3c"
        strokeWidth="1.3"
        strokeDasharray="1.4 1"
      />
      {[
        [0, 0],
        [0, -3],
        [3, 0],
        [0, 3],
        [-3, 0],
      ].map(([dx, dy]) => (
        <circle key={`${dx},${dy}`} cx={x + dx} cy={y + dy} r="0.6" fill="#8e531c" />
      ))}

      {/* 饼 干 饼 干 on the diagonals, each facing outwards */}
      {[
        [-45, BING],
        [45, GAN],
        [135, BING],
        [225, GAN],
      ].map(([angle, d]) => (
        <path
          key={angle}
          d={d as string}
          fill={GOLD}
          transform={`translate(${x} ${y}) rotate(${angle}) translate(0 ${-GLYPH_RADIUS}) scale(${GLYPH_SCALE})`}
        />
      ))}
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
