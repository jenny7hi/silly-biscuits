import { type Card, cardLabel, isRed, rankLabel } from './game'

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
      <span className="card__back-pattern" />
    ) : (
      <>
        <span className="card__corner card__corner--top">
          {rankLabel(card.rank)}
          <br />
          {card.suit}
        </span>
        <span className={`card__center ${card.rank > 10 ? 'card__center--face' : ''}`}>
          {card.rank > 10 ? rankLabel(card.rank) : card.suit}
        </span>
        <span className="card__corner card__corner--bottom">
          {rankLabel(card.rank)}
          <br />
          {card.suit}
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
