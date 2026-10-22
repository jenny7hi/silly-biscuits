import { useCallback, useEffect, useRef, useState } from 'react'
import { DIFFICULTIES, type Difficulty, computerTurn } from './ai'
import { CardView, EmptySpot } from './CardView'
import {
  type GameState,
  type PileCard,
  type Player,
  type Source,
  cardLabel,
  cardsLeft,
  hasPlays,
  newGame,
  noMove,
  play,
  requirement,
} from './game'
import { Kaboom } from './Kaboom'
import { WinCascade } from './WinCascade'
import { MenuBar, MessageBox, StatusBar, TitleBar } from './Xp'

const HUMAN = 0
const COMPUTER_DELAY = 900
const KABOOM_DURATION = 1100
const DIFFICULTY_KEY = 'silly-biscuits-difficulty'

const difficultyName = (d: Difficulty) => d[0].toUpperCase() + d.slice(1)

function savedDifficulty(): Difficulty {
  try {
    const saved = localStorage.getItem(DIFFICULTY_KEY)
    if (DIFFICULTIES.includes(saved as Difficulty)) return saved as Difficulty
  } catch {
    // storage can be unavailable, e.g. in a private window
  }
  return 'medium'
}

type Dialog = 'rules' | 'about' | 'gameOver' | null

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function sourceKey(source: Source) {
  return source.from === 'hand' ? `hand-${source.cardId}` : `${source.from}-${source.slot}`
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => newGame())
  const [difficulty, setDifficulty] = useState<Difficulty>(savedDifficulty)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  // the cards flying out of an exploding pile, and how big the discard was before
  const [kaboom, setKaboom] = useState<{ cards: PileCard[]; before: number } | null>(null)

  const deal = useCallback(() => {
    setGame(newGame())
    setDialog(null)
    setCelebrating(false)
  }, [])

  const chooseDifficulty = (d: Difficulty) => {
    if (d === difficulty) return
    setDifficulty(d)
    try {
      localStorage.setItem(DIFFICULTY_KEY, d)
    } catch {
      // the choice just won't be remembered
    }
    deal()
  }

  const humanTurn = game.winner === null && game.current === HUMAN
  const humanStuck = humanTurn && !hasPlays(game, HUMAN)

  // computer turns
  useEffect(() => {
    if (game.winner !== null || !game.players[game.current].isComputer) return
    const timer = setTimeout(() => setGame((g) => computerTurn(g, difficulty)), COMPUTER_DELAY)
    return () => clearTimeout(timer)
  }, [game, difficulty])

  // a 10 just blew the pile into the discard: play the explosion over the pile
  const discardCount = game.discard.length
  const seenDiscard = useRef(discardCount)
  useEffect(() => {
    const before = seenDiscard.current
    seenDiscard.current = discardCount
    if (discardCount <= before) return
    setKaboom({ cards: game.discard.slice(before).slice(-4), before })
    const timer = setTimeout(() => setKaboom(null), prefersReducedMotion() ? 600 : KABOOM_DURATION)
    return () => clearTimeout(timer)
    // only a growing discard matters, not every change to the game
  }, [discardCount])

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

  const pickUp = () => {
    if (!humanTurn) return
    if (humanStuck) setGame(noMove(game))
    else setGame({ ...game, error: 'You have a card you can play.' })
  }

  const you = game.players[HUMAN]
  const computer = game.players[1]
  const visiblePile = game.pile.slice(-4)
  // the blown-up cards land on the discard once the explosion is over
  const discardShown = kaboom ? game.discard.slice(0, kaboom.before) : game.discard

  let turnText = 'Your turn'
  if (game.winner !== null) turnText = 'Game over'
  else if (!humanTurn) turnText = 'Computer is thinking…'

  let status = game.error ?? game.message
  if (!game.error && humanStuck) status = `${game.message} You can't play: click the pile to pick it up.`

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
                ...DIFFICULTIES.map((d) => ({
                  label: difficultyName(d),
                  checked: d === difficulty,
                  onSelect: () => chooseDifficulty(d),
                })),
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

        <main className={`felt ${kaboom && !prefersReducedMotion() ? 'felt--shake' : ''}`}>
          <Seat player={computer} active={game.winner === null && game.current === 1} opponent />

          <section className="table-center" aria-label="Table">
            <div className="table-center__stack">
              {game.deck.length > 0 ? (
                <CardView faceDown className="deck" label={`Deck, ${game.deck.length} cards`} />
              ) : (
                <EmptySpot label="Empty" />
              )}
              <span className="felt-label">Deck · {game.deck.length}</span>
            </div>

            <div className="table-center__stack">
              <div className="pile">
                {visiblePile.length === 0 && <EmptySpot />}
                {visiblePile.map((card, i) => (
                  <div className="pile__card" style={{ left: i * 16 }} key={card.id}>
                    <CardView card={card} />
                  </div>
                ))}
                {humanStuck && (
                  <button
                    type="button"
                    className="pile__pick-up"
                    onClick={pickUp}
                    aria-label={`Pick up the pile, ${game.pile.length} cards`}
                  />
                )}
                {kaboom && <Kaboom cards={kaboom.cards} key={discardCount} />}
              </div>
              <span className="felt-label">{requirement(game)}</span>
            </div>

            <div className="table-center__stack">
              <div className={`discard ${discardShown.length ? 'discard--land' : ''}`} key={discardShown.length}>
                {discardShown.length === 0 ? (
                  <EmptySpot label="Discard" />
                ) : (
                  discardShown.slice(-3).map((card, i, shown) => (
                    <div
                      className="discard__card"
                      style={{ transform: `rotate(${((card.id * 47) % 20) - 10}deg)` }}
                      key={card.id}
                      aria-hidden={i < shown.length - 1}
                    >
                      <CardView card={card} />
                    </div>
                  ))
                )}
              </div>
              <span className="felt-label">Discard · {discardShown.length}</span>
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

          {celebrating && <WinCascade cards={[...game.discard, ...game.pile]} onDone={endCelebration} />}
        </main>

        <StatusBar
          panels={[
            { content: status, grow: true, live: true },
            { content: turnText },
            { content: difficultyName(difficulty) },
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
            the next player, and <b>10</b> blows the pile up into the discard and you go again.
          </p>
          <p>
            <b>Reserved cards</b> unlock once the deck is empty. Hidden cards unlock when the card on top is gone, and you
            don't know what they are until you play them. If a hidden card can't be played, you pick it up along with the
            pile.
          </p>
          <p>
            If you can't play, click the pile to pick it all up, and you lose your turn. After each play you draw back up to
            five cards while the deck lasts. Press F2 to deal a new game.
          </p>
          <p>Choose how well the computer plays from the Game menu: Easy, Medium or Hard.</p>
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
      {/* each card sits in a slot that shrinks when the hand gets big, so the cards overlap more */}
      {player.hand.map((card) => (
        <div className="hand__slot" key={card.id}>
          {opponent ? (
            <CardView faceDown />
          ) : (
            <CardView
              card={card}
              onClick={onPlay ? () => onPlay({ from: 'hand', cardId: card.id }) : undefined}
              label={`Play ${cardLabel(card)} from hand`}
              flash={flash === `hand-${card.id}`}
            />
          )}
        </div>
      ))}
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
