import { useCallback, useEffect, useState } from 'react'
import { CardView, EmptySpot } from './CardView'
import {
  type GameState,
  type Player,
  type Source,
  cardLabel,
  cardsLeft,
  computerTurn,
  hasPlays,
  newGame,
  noMove,
  play,
  requirement,
} from './game'
import { WinCascade } from './WinCascade'
import { MenuBar, MessageBox, StatusBar, TitleBar } from './Xp'

const HUMAN = 0
const COMPUTER_DELAY = 900

type Dialog = 'rules' | 'about' | 'gameOver' | null

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function sourceKey(source: Source) {
  return source.from === 'hand' ? `hand-${source.cardId}` : `${source.from}-${source.slot}`
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => newGame())
  const [dialog, setDialog] = useState<Dialog>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const deal = useCallback(() => {
    setGame(newGame())
    setDialog(null)
    setCelebrating(false)
  }, [])

  const humanTurn = game.winner === null && game.current === HUMAN
  const humanStuck = humanTurn && !hasPlays(game, HUMAN)

  // computer turns
  useEffect(() => {
    if (game.winner !== null || !game.players[game.current].isComputer) return
    const timer = setTimeout(() => setGame(computerTurn), COMPUTER_DELAY)
    return () => clearTimeout(timer)
  }, [game])

  // you are stuck and the deck is empty: the game ends. Rejected clicks in the meantime
  // must not restart the timer, so this only depends on whether you are stuck.
  const humanOutOfMoves = humanStuck && game.deck.length === 0
  useEffect(() => {
    if (!humanOutOfMoves) return
    const timer = setTimeout(() => setGame(noMove), COMPUTER_DELAY)
    return () => clearTimeout(timer)
  }, [humanOutOfMoves])

  // game over: celebrate a win, then offer another deal
  useEffect(() => {
    if (game.winner === null) return
    if (game.winner === HUMAN && !prefersReducedMotion()) setCelebrating(true)
    else setDialog('gameOver')
  }, [game.winner])

  const endCelebration = useCallback(() => {
    setCelebrating(false)
    setDialog('gameOver')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        deal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deal])

  const attempt = (source: Source) => {
    if (!humanTurn) return
    const next = play(game, source)
    if (next.error) {
      setFlash(sourceKey(source))
      setTimeout(() => setFlash(null), 250)
    }
    setGame(next)
  }

  const clickDeck = () => {
    if (!humanTurn) return
    if (humanStuck) setGame(noMove(game))
    else setGame({ ...game, error: 'You have a card you can play.' })
  }

  const you = game.players[HUMAN]
  const computer = game.players[1]
  const visiblePile = game.pile.slice(-4)

  let turnText = 'Your turn'
  if (game.winner !== null) turnText = 'Game over'
  else if (!humanTurn) turnText = 'Computer is thinking…'

  let status = game.error ?? game.message
  if (!game.error && humanStuck && game.deck.length > 0) status = `${game.message} No playable cards: click the deck to draw.`

  return (
    <div className="desktop">
      <div className="xp-window app-window">
        <TitleBar title="Silly Biscuits" />
        <MenuBar
          menus={[
            {
              label: 'Game',
              items: [
                { label: 'Deal', shortcut: 'F2', onSelect: deal },
                { label: '', separator: true },
                { label: 'Rules…', onSelect: () => setDialog('rules') },
              ],
            },
            {
              label: 'Help',
              items: [
                { label: 'How to Play', onSelect: () => setDialog('rules') },
                { label: '', separator: true },
                { label: 'About Silly Biscuits', onSelect: () => setDialog('about') },
              ],
            },
          ]}
        />

        <main className="felt">
          <Seat player={computer} active={game.winner === null && game.current === 1} opponent />

          <section className="table-center" aria-label="Table">
            <div className="table-center__stack">
              {game.deck.length > 0 ? (
                <CardView
                  faceDown
                  onClick={humanTurn ? clickDeck : undefined}
                  className={`deck ${humanStuck ? 'deck--prompt' : ''}`}
                  label={`Deck, ${game.deck.length} cards. ${humanStuck ? 'Click to draw.' : ''}`}
                />
              ) : (
                <EmptySpot label="Empty" />
              )}
              <span className="felt-label">Deck · {game.deck.length}</span>
            </div>

            <div className="table-center__stack">
              <div className="pile" aria-label={`Pile, top card ${cardLabel(game.pile[game.pile.length - 1])}`}>
                {visiblePile.map((card, i) => (
                  <div className="pile__card" style={{ left: i * 16 }} key={card.id}>
                    <CardView card={card} />
                  </div>
                ))}
              </div>
              <span className="felt-label">{requirement(game)}</span>
            </div>

            <div className="direction" aria-label={`Direction: ${game.goingUp ? 'up' : 'down'}`}>
              <span className={`direction__arrow ${game.goingUp ? '' : 'direction__arrow--down'}`}>▲</span>
              <span className="felt-label">Going {game.goingUp ? 'up' : 'down'}</span>
            </div>
          </section>

          <Seat
            player={you}
            active={humanTurn}
            reservedLocked={game.deck.length > 0}
            onPlay={humanTurn ? attempt : undefined}
            flash={flash}
          />

          {celebrating && <WinCascade cards={game.pile} onDone={endCelebration} />}
        </main>

        <StatusBar
          panels={[
            { content: status, grow: true, live: true },
            { content: turnText },
            { content: `Cards left: ${cardsLeft(you)} vs ${cardsLeft(computer)}` },
          ]}
        />
      </div>

      {dialog === 'rules' && (
        <MessageBox title="How to Play" onClose={() => setDialog(null)} buttons={[{ label: 'OK', onClick: () => setDialog(null) }]}>
          <p>
            <b>Goal:</b> play all of your hand and reserved cards before the computer does.
          </p>
          <p>
            Each card must be <b>higher</b> than the last one when the direction is up, or <b>lower</b> when it's down. An
            ace is the biggest card going up and the smallest going down.
          </p>
          <p>
            <b>Special cards</b> can be played on anything: <b>2</b> reverses the direction, <b>8</b> resets the pile for
            the next player, and <b>10</b> resets the pile and you go again.
          </p>
          <p>
            <b>Reserved cards</b> unlock once the deck is empty. Hidden cards unlock when the card on top is gone, and you
            don't know what they are until you play them. If a hidden card can't be played, it's turned face up and you
            lose your turn.
          </p>
          <p>If you can't play, click the deck to draw a card and lose your turn. Press F2 to deal a new game.</p>
        </MessageBox>
      )}

      {dialog === 'about' && (
        <MessageBox title="About Silly Biscuits" onClose={() => setDialog(null)} buttons={[{ label: 'OK', onClick: () => setDialog(null) }]}>
          <p>
            <b>Silly Biscuits</b>
            <br />A strategy card game for two or more players.
          </p>
          <p>Why is it called Silly Biscuits? Nobody knows.</p>
        </MessageBox>
      )}

      {dialog === 'gameOver' && (
        <MessageBox
          title="Game Over"
          icon="question"
          onClose={() => setDialog(null)}
          buttons={[
            { label: 'Yes', onClick: deal },
            { label: 'No', onClick: () => setDialog(null) },
          ]}
        >
          <p>{game.winner === HUMAN ? 'Congratulations, you won!' : game.message}</p>
          <p>Deal again?</p>
        </MessageBox>
      )}
    </div>
  )
}

interface SeatProps {
  player: Player
  active: boolean
  opponent?: boolean
  reservedLocked?: boolean
  onPlay?: (source: Source) => void
  flash?: string | null
}

function Seat({ player, active, opponent, reservedLocked, onPlay, flash }: SeatProps) {
  const hand = (
    <div className={`hand ${opponent ? 'hand--opponent' : ''}`} aria-label={`${player.name} hand`}>
      {player.hand.length === 0 && <EmptySpot />}
      {player.hand.map((card) =>
        opponent ? (
          <CardView faceDown key={card.id} />
        ) : (
          <CardView
            key={card.id}
            card={card}
            onClick={onPlay ? () => onPlay({ from: 'hand', cardId: card.id }) : undefined}
            label={`Play ${cardLabel(card)} from hand`}
            flash={flash === `hand-${card.id}`}
          />
        ),
      )}
    </div>
  )

  const reserved = (
    <div className="reserved" aria-label={`${player.name} reserved cards`}>
      {player.slots.map((slot, i) => (
        <div className="slot" key={i}>
          {slot.hidden ? (
            <CardView
              faceDown
              onClick={onPlay && !slot.public ? () => onPlay({ from: 'hidden', slot: i }) : undefined}
              label={`Play hidden card ${i + 1}`}
              flash={flash === `hidden-${i}`}
            />
          ) : (
            !slot.public && <EmptySpot />
          )}
          {slot.public && (
            <div className={`slot__public ${slot.hidden ? '' : 'slot__public--alone'}`}>
              <CardView
                card={slot.public}
                onClick={onPlay ? () => onPlay({ from: 'public', slot: i }) : undefined}
                label={`Play ${cardLabel(slot.public)} from reserved`}
                flash={flash === `public-${i}`}
                className={reservedLocked ? 'card--locked' : ''}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <section className={`seat ${opponent ? 'seat--opponent' : 'seat--you'}`} aria-label={player.name}>
      <span className={`seat__name ${active ? 'seat__name--active' : ''}`}>{player.name}</span>
      <div className="seat__cards">
        {opponent ? (
          <>
            {hand}
            {reserved}
          </>
        ) : (
          <>
            {reserved}
            {hand}
          </>
        )}
      </div>
    </section>
  )
}
