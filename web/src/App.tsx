import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CardView, EmptySpot } from './CardView'
import {
  type GameState,
  type PileCard,
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
import { Kaboom } from './Kaboom'
import {
  Deal,
  type DealAnimation,
  PLAY_FLIGHT,
  PlayFlight,
  type PlayFlightAnimation,
  type Point,
  Swoosh,
  type SwooshAnimation,
  dealDuration,
  swooshDuration,
} from './Swoosh'
import { WinCascade } from './WinCascade'
import { MenuBar, MessageBox, StatusBar, TitleBar } from './Xp'

const HUMAN = 0
const COMPUTER_DELAY = 900
const KABOOM_DURATION = 1100

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
  // the cards flying out of an exploding pile, and how big the discard was before
  // `delay` lets a 10 land before it explodes; `landing` is that 10
  const [kaboom, setKaboom] = useState<{ cards: PileCard[]; before: number; delay: number; landing?: number } | null>(
    null,
  )
  const [flight, setFlight] = useState<PlayFlightAnimation | null>(null)
  const [swoosh, setSwoosh] = useState<SwooshAnimation | null>(null)
  const [drawing, setDrawing] = useState<DealAnimation | null>(null)
  const feltRef = useRef<HTMLElement>(null)

  const deal = useCallback(() => {
    setGame(newGame())
    setDialog(null)
    setCelebrating(false)
  }, [])

  const humanTurn = game.winner === null && game.current === HUMAN
  const humanStuck = humanTurn && !hasPlays(game, HUMAN)

  // computer turns, waiting for a pickup animation to finish first
  useEffect(() => {
    if (game.winner !== null || !game.players[game.current].isComputer || swoosh) return
    const timer = setTimeout(() => setGame(computerTurn), COMPUTER_DELAY)
    return () => clearTimeout(timer)
  }, [game, swoosh])

  // someone had to pick up the pile: swoosh it into their hand. This measures where the
  // pile, the hand and the flipped hidden card sit on the table, before the browser paints.
  const seenPickup = useRef(game.pickup?.id)
  useLayoutEffect(() => {
    const pickup = game.pickup
    if (!pickup || pickup.id === seenPickup.current) return
    seenPickup.current = pickup.id
    const felt = feltRef.current
    if (!felt) return
    const origin = felt.getBoundingClientRect()
    const at = (selector: string): Point | null => {
      const rect = felt.querySelector(selector)?.getBoundingClientRect()
      return rect ? { x: rect.left - origin.left, y: rect.top - origin.top } : null
    }
    const flipped = pickup.flipped
    const cards = pickup.cards.slice(-4)
    setSwoosh({
      id: pickup.id,
      cards,
      pile: at('.pile')!,
      hand: handTarget(felt, pickup.player),
      flipped,
      flippedAt: flipped ? at(`[data-seat="${pickup.player}"][data-slot="${pickup.slot}"]`) : null,
      duration: prefersReducedMotion() ? 900 : swooshDuration(cards.length + (flipped ? 1 : 0), flipped !== null),
      hiddenIds: new Set([...pickup.cards, ...(flipped ? [flipped] : [])].map((c) => c.id)),
      player: pickup.player,
    })
  }, [game.pickup])

  useEffect(() => {
    if (!swoosh) return
    const timer = setTimeout(() => setSwoosh(null), swoosh.duration)
    return () => clearTimeout(timer)
  }, [swoosh])

  // cards drawn from the deck after a play fly into the hand
  const seenDraw = useRef(game.draw?.id)
  useLayoutEffect(() => {
    const draw = game.draw
    if (!draw || draw.id === seenDraw.current) return
    seenDraw.current = draw.id
    const felt = feltRef.current
    if (!felt || prefersReducedMotion()) return
    const origin = felt.getBoundingClientRect()
    const deckRect = felt.querySelector('[data-deck]')!.getBoundingClientRect()
    setDrawing({
      id: draw.id,
      player: draw.player,
      cards: draw.cards,
      deck: { x: deckRect.left - origin.left, y: deckRect.top - origin.top },
      hand: handTarget(felt, draw.player),
      reveal: draw.player === HUMAN,
      duration: dealDuration(draw.cards.length),
      hiddenIds: new Set(draw.cards.map((c) => c.id)),
    })
  }, [game.draw])

  useEffect(() => {
    if (!drawing) return
    const timer = setTimeout(() => setDrawing(null), drawing.duration)
    return () => clearTimeout(timer)
  }, [drawing])

  // a card was played: fly it from where it was onto the pile. Where it was comes from the
  // positions recorded after the previous render, since it has already left the hand.
  const cardPositions = useRef(new Map<number, Point>())
  const seenPlay = useRef(game.lastPlay?.id)
  useLayoutEffect(() => {
    const played = game.lastPlay
    if (!played || played.id === seenPlay.current) return
    seenPlay.current = played.id
    const felt = feltRef.current
    if (!felt || prefersReducedMotion()) return
    const origin = felt.getBoundingClientRect()
    let from = cardPositions.current.get(played.card.id) ?? null
    if (played.from === 'hidden') {
      const slot = felt.querySelector(`[data-seat="${played.player}"][data-slot="${played.slot}"]`)?.getBoundingClientRect()
      from = slot ? { x: slot.left - origin.left, y: slot.top - origin.top } : null
    }
    const pile = felt.querySelector('.pile')?.getBoundingClientRect()
    if (!from || !pile) return
    setFlight({
      id: played.id,
      card: played.card,
      from,
      to: { x: pile.left - origin.left + (Math.min(played.pileSize, 4) - 1) * 16, y: pile.top - origin.top },
      faceDown: played.from === 'hidden' || (played.from === 'hand' && game.players[played.player].isComputer),
    })
  }, [game.lastPlay])

  useEffect(() => {
    if (!flight) return
    const timer = setTimeout(() => setFlight(null), PLAY_FLIGHT)
    return () => clearTimeout(timer)
  }, [flight])

  // after every render, note where each card in a hand or reserved slot sits on the felt
  useLayoutEffect(() => {
    const felt = feltRef.current
    if (!felt) return
    const origin = felt.getBoundingClientRect()
    const positions = new Map<number, Point>()
    felt.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
      const rect = el.getBoundingClientRect()
      positions.set(Number(el.dataset.cardId), { x: rect.left - origin.left, y: rect.top - origin.top })
    })
    cardPositions.current = positions
  })

  // in development, expose the game so animations can be checked from the console
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __silly: { game, setGame, play, noMove } })
  }, [game])

  // a 10 just blew the pile into the discard: play the explosion over the pile
  const discardCount = game.discard.length
  const seenDiscard = useRef(discardCount)
  useEffect(() => {
    const before = seenDiscard.current
    seenDiscard.current = discardCount
    if (discardCount <= before) return
    const ten = game.lastPlay?.card.rank === 10 && !prefersReducedMotion() ? game.lastPlay.card : null
    const delay = ten ? PLAY_FLIGHT : 0
    setKaboom({ cards: game.discard.slice(before).slice(-4), before, delay, landing: ten?.id })
    const timer = setTimeout(() => setKaboom(null), (prefersReducedMotion() ? 600 : KABOOM_DURATION) + delay)
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
  // the card still flying onto the pile isn't on it yet
  const visiblePile = game.pile.filter((c) => c.id !== flight?.card.id).slice(-4)
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

        <main
          className={`felt ${kaboom && !prefersReducedMotion() ? 'felt--shake' : ''}`}
          style={{ '--kaboom-delay': `${kaboom?.delay ?? 0}ms` } as CSSProperties}
          ref={feltRef}
        >
          <Seat
            player={computer}
            active={game.winner === null && game.current === 1}
            opponent
            incoming={incomingFor(1, swoosh, drawing)}
          />

          <section className="table-center" aria-label="Table">
            {/* deck, pile and direction in the middle; the discard out on the far right */}
            <div className="table-center__main">
              <div className="table-center__stack" data-deck>
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
                  {kaboom && <Kaboom cards={kaboom.cards} delay={kaboom.delay} landing={kaboom.landing} key={discardCount} />}
                </div>
                <span className="felt-label">{requirement(game)}</span>
              </div>

              <div className="direction" aria-label={`Direction: ${game.goingUp ? 'up' : 'down'}`}>
                <span className={`direction__arrow ${game.goingUp ? '' : 'direction__arrow--down'}`}>▲</span>
                <span className="felt-label">Going {game.goingUp ? 'up' : 'down'}</span>
              </div>
            </div>

            <div className="table-center__stack table-center__discard">
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
          </section>

          <Seat
            player={you}
            active={humanTurn}
            reservedLocked={game.deck.length > 0}
            onPlay={humanTurn ? attempt : undefined}
            flash={flash}
            incoming={incomingFor(HUMAN, swoosh, drawing)}
          />

          {swoosh && <Swoosh animation={swoosh} key={`swoosh-${swoosh.id}`} />}
          {drawing && <Deal animation={drawing} key={`deal-${drawing.id}`} />}
          {flight && <PlayFlight animation={flight} key={`play-${flight.id}`} />}

          {celebrating && <WinCascade cards={[...game.discard, ...game.pile]} onDone={endCelebration} />}
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

// where a card flying into a player's hand should land: the middle of the cards they hold,
// relative to the felt
function handTarget(felt: HTMLElement, player: number): Point {
  const origin = felt.getBoundingClientRect()
  const hand = felt.querySelector(player === HUMAN ? '.seat--you .hand' : '.seat--opponent .hand')!
  const cardWidth = parseFloat(getComputedStyle(felt).getPropertyValue('--card-w')) || 71
  const first = hand.firstElementChild?.getBoundingClientRect()
  const last = hand.lastElementChild?.getBoundingClientRect()
  const area = hand.getBoundingClientRect()
  const centre = first && last ? (first.left + last.right) / 2 : area.left + area.width / 2
  return { x: centre - cardWidth / 2 - origin.left, y: area.top + (area.height - cardWidth * 1.35) / 2 - origin.top }
}

// the ids of cards still flying into a player's hand
function incomingFor(player: number, ...animations: ({ player: number; hiddenIds: Set<number> } | null)[]) {
  const ids = animations.flatMap((a) => (a && a.player === player ? [...a.hiddenIds] : []))
  return ids.length ? new Set(ids) : undefined
}

interface SeatProps {
  player: Player
  active: boolean
  opponent?: boolean
  reservedLocked?: boolean
  onPlay?: (source: Source) => void
  flash?: string | null
  // cards still flying into this hand, kept out of it until they land
  incoming?: Set<number>
}

function Seat({ player, active, opponent, reservedLocked, onPlay, flash, incoming }: SeatProps) {
  const handCards = incoming ? player.hand.filter((c) => !incoming.has(c.id)) : player.hand
  const hand = (
    <div className={`hand ${opponent ? 'hand--opponent' : ''}`} aria-label={`${player.name} hand`}>
      {handCards.length === 0 && <EmptySpot />}
      {/* each card sits in a slot that shrinks when the hand gets big, so the cards overlap more */}
      {handCards.map((card) => (
        <div className="hand__slot" key={card.id} data-card-id={card.id}>
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
        <div className="slot" key={i} data-seat={opponent ? 1 : HUMAN} data-slot={i}>
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
            <div className={`slot__public ${slot.hidden ? '' : 'slot__public--alone'}`} data-card-id={slot.public.id}>
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
