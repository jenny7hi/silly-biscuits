import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DIFFICULTIES, type Difficulty, computerTurn } from './ai'
import { BiscuitName, DifficultyDialog } from './Biscuits'
import { CardView, EmptySpot } from './CardView'
import {
  type Card,
  type GameState,
  type PileCard,
  type Player,
  type Source,
  cardLabel,
  cardsLeft,
  hasPlays,
  isLegal,
  newGame,
  noMove,
  play,
  requirement,
} from './game'
import { Kaboom } from './Kaboom'
import { type FanState, MultiFan } from './MultiFan'
import {
  Deal,
  type DealAnimation,
  PlayFlight,
  type PlayFlightAnimation,
  type Point,
  Swoosh,
  type SwooshAnimation,
  dealDuration,
  playFlightDuration,
  swooshDuration,
} from './Swoosh'
import { WinCascade } from './WinCascade'
import { MenuBar, MessageBox, StatusBar, TitleBar } from './Xp'

const HUMAN = 0
const COMPUTER_DELAY = 900
const KABOOM_DURATION = 1100
const DIFFICULTY_KEY = 'silly-biscuits-difficulty'

function savedDifficulty(): Difficulty | null {
  try {
    const saved = localStorage.getItem(DIFFICULTY_KEY)
    if (DIFFICULTIES.includes(saved as Difficulty)) return saved as Difficulty
  } catch {
    // storage can be unavailable, e.g. in a private window
  }
  return null
}

function rememberDifficulty(d: Difficulty) {
  try {
    localStorage.setItem(DIFFICULTY_KEY, d)
  } catch {
    // the choice just won't be remembered
  }
}

type Dialog = 'difficulty' | 'rules' | 'about' | 'gameOver' | null

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function sourceKey(source: Source) {
  return source.from === 'hand' ? `hand-${source.cardId}` : `${source.from}-${source.slot}`
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => newGame())
  const [difficulty, setDifficulty] = useState<Difficulty>(() => savedDifficulty() ?? 'medium')
  // every game starts by asking which biscuit to play against, including the first
  const [dialog, setDialog] = useState<Dialog>('difficulty')
  const [celebrating, setCelebrating] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  // the cards flying out of an exploding pile, and how big the discard was before
  // `delay` lets the 10s land before they explode; `landing` is those 10s
  const [kaboom, setKaboom] = useState<{ cards: PileCard[]; before: number; delay: number; landing?: number[] } | null>(
    null,
  )
  const [flight, setFlight] = useState<PlayFlightAnimation | null>(null)
  const [swoosh, setSwoosh] = useState<SwooshAnimation | null>(null)
  const [drawing, setDrawing] = useState<DealAnimation | null>(null)
  const feltRef = useRef<HTMLElement>(null)
  // counts deals, so the computer's hand order starts afresh with each new game
  const [dealt, setDealt] = useState(0)
  // which end of the computer's hand is nearer the deck and the pile, measured after each render
  const opponentEnds = useRef<HandEnds>({ deck: 'end', pile: 'end' })

  const deal = useCallback(() => {
    setGame(newGame())
    setDealt((n) => n + 1)
    setDialog(null)
    setCelebrating(false)
  }, [])

  // a new game always begins with the biscuit picker; the deal happens once one is chosen
  const askForNewGame = useCallback(() => {
    setCelebrating(false)
    setDialog('difficulty')
  }, [])

  const chooseDifficulty = (d: Difficulty) => {
    rememberDifficulty(d)
    setDifficulty(d)
    deal()
  }

  // cancelling keeps the game in progress, or deals a fresh one if that game is over
  const closeDifficulty = useCallback(() => {
    rememberDifficulty(difficulty)
    if (game.winner !== null) deal()
    else setDialog(null)
  }, [difficulty, game.winner, deal])

  const humanTurn = game.winner === null && game.current === HUMAN
  const humanStuck = humanTurn && !hasPlays(game, HUMAN)

  // computer turns, waiting for a pickup animation to finish, and for any dialog to close
  useEffect(() => {
    if (game.winner !== null || !game.players[game.current].isComputer || swoosh || dialog) return
    const timer = setTimeout(() => setGame((g) => computerTurn(g, difficulty)), COMPUTER_DELAY)
    return () => clearTimeout(timer)
  }, [game, swoosh, difficulty, dialog])

  // someone had to pick up the pile: swoosh it into their hand. This measures where the
  // pile, the hand and the flipped hidden card sit on the table, before the browser paints.
  const seenPickup = useRef(game.pickup?.id)
  useLayoutEffect(() => {
    const pickup = game.pickup
    if (!pickup || pickup.id === seenPickup.current) return
    seenPickup.current = pickup.id
    const felt = feltRef.current
    if (!felt) return
    const at = (selector: string) => {
      const el = felt.querySelector<HTMLElement>(selector)
      return el ? feltPosition(felt, el) : null
    }
    const flipped = pickup.flipped
    const cards = pickup.cards.slice(-4)
    setSwoosh({
      id: pickup.id,
      cards,
      pile: at('.pile')!,
      targets: cardTargets(felt, [...cards, ...(flipped ? [flipped] : [])]),
      flipped,
      flippedAt: flipped ? at(`[data-seat="${pickup.player}"][data-slot="${pickup.slot}"]`) : null,
      intoHiddenHand: game.players[pickup.player].isComputer,
      duration: prefersReducedMotion() ? 900 : swooshDuration(cards.length + (flipped ? 1 : 0), flipped !== null),
      hiddenIds: new Set([...pickup.cards, ...(flipped ? [flipped] : [])].map((c) => c.id)),
      player: pickup.player,
    })
  }, [game.pickup])

  useEffect(() => {
    if (!swoosh) return
    const timer = setTimeout(() => setSwoosh(null), swoosh.duration + 30)
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
    setDrawing({
      id: draw.id,
      player: draw.player,
      cards: draw.cards,
      deck: feltPosition(felt, felt.querySelector<HTMLElement>('[data-deck]')!),
      targets: cardTargets(felt, draw.cards),
      reveal: draw.player === HUMAN,
      duration: dealDuration(draw.cards.length),
      hiddenIds: new Set(draw.cards.map((c) => c.id)),
    })
  }, [game.draw])

  useEffect(() => {
    if (!drawing) return
    const timer = setTimeout(() => setDrawing(null), drawing.duration + 30)
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
    const pileEl = felt.querySelector<HTMLElement>('.pile')
    if (!pileEl) return
    const pile = feltPosition(felt, pileEl)
    const all = [played.card, ...played.extras]
    // the pile shows its last four cards fanned out; each played card lands on its own spot
    const firstShown = Math.max(0, played.pileSize - 4)
    const cards = all.flatMap((card, i) => {
      let from = cardPositions.current.get(card.id) ?? null
      if (played.from === 'hidden') {
        const slot = felt.querySelector<HTMLElement>(`[data-seat="${played.player}"][data-slot="${played.slot}"]`)
        from = slot ? feltPosition(felt, slot) : null
      }
      const shown = Math.max(0, played.pileSize - all.length + i - firstShown)
      return from ? [{ card, from, to: { x: pile.x + shown * 16, y: pile.y } }] : []
    })
    if (!cards.length) return
    setFlight({
      id: played.id,
      cards,
      faceDown: played.from === 'hidden' || (played.from === 'hand' && game.players[played.player].isComputer),
    })
  }, [game.lastPlay])

  useEffect(() => {
    if (!flight) return
    const timer = setTimeout(() => setFlight(null), playFlightDuration(flight.cards.length) + 30)
    return () => clearTimeout(timer)
  }, [flight])

  // after every render, note where each card in a hand or reserved slot sits on the felt,
  // and glide any hand card that moved (a card left, or room was made for new ones) from
  // where it was to where it is now, instead of letting it snap
  useLayoutEffect(() => {
    const felt = feltRef.current
    if (!felt) return
    const before = cardPositions.current
    const positions = new Map<number, Point>()
    const glide = !prefersReducedMotion()
    felt.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
      const id = Number(el.dataset.cardId)
      const now = feltPosition(felt, el)
      positions.set(id, now)
      const was = before.get(id)
      if (!glide || !was || !el.classList.contains('hand__slot')) return
      const dx = was.x - now.x
      const dy = was.y - now.y
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 280,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      })
    })
    cardPositions.current = positions

    // which end of the computer's hand is nearer the deck and the pile
    const slots = felt.querySelectorAll<HTMLElement>('.seat--opponent .hand__slot')
    if (slots.length) {
      const first = feltPosition(felt, slots[0])
      const last = slots[slots.length - 1]
      const middle = (first.x + feltPosition(felt, last).x + last.offsetWidth) / 2
      const endNearest = (selector: string): HandEnd => {
        const el = felt.querySelector<HTMLElement>(selector)
        return el && feltPosition(felt, el).x + el.offsetWidth / 2 < middle ? 'start' : 'end'
      }
      opponentEnds.current = { deck: endNearest('[data-deck]'), pile: endNearest('.pile') }
    }
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
    const tens =
      game.lastPlay?.card.rank === 10 && !prefersReducedMotion() ? [game.lastPlay.card, ...game.lastPlay.extras] : []
    const delay = tens.length ? playFlightDuration(tens.length) : 0
    setKaboom({ cards: game.discard.slice(before).slice(-4), before, delay, landing: tens.map((c) => c.id) })
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
        askForNewGame()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [askForNewGame])

  // ---- playing several cards of the same rank together ----
  const [fan, setFan] = useState<FanState | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>()
  // a press-and-hold that opened the fan, or a tap that closed it, mustn't also play a card
  const ignoreClicksUntil = useRef(0)
  const MOUSE_HOLD = 1000
  const TOUCH_HOLD = 450

  const matching = (card: Card) => game.players[HUMAN].hand.filter((c) => c.rank === card.rank)
  const canFan = (card: Card) => humanTurn && matching(card).length > 1 && isLegal(game, card)

  const openFan = (card: Card, touch: boolean) => {
    const felt = feltRef.current
    const slot = felt?.querySelector<HTMLElement>(`.seat--you .hand__slot[data-card-id="${card.id}"]`)
    if (!felt || !slot || !canFan(card)) return
    const others = matching(card).filter((c) => c.id !== card.id)
    setFan({ cards: [card, ...others], anchor: feltPosition(felt, slot), touch })
  }

  const holdStart = (card: Card, pointerType: string) => {
    clearTimeout(holdTimer.current)
    if (!canFan(card)) return
    const touch = pointerType !== 'mouse'
    holdTimer.current = setTimeout(() => {
      openFan(card, touch)
      if (touch) ignoreClicksUntil.current = Date.now() + 700
    }, touch ? TOUCH_HOLD : MOUSE_HOLD)
  }
  const holdCancel = () => clearTimeout(holdTimer.current)

  const closeFan = useCallback(() => {
    setFan((open) => {
      // the tap that closes a fan shouldn't land on a card underneath
      if (open) ignoreClicksUntil.current = Date.now() + 350
      return null
    })
  }, [])

  // a new turn or a new game closes the fan and any pending hold
  useEffect(() => {
    clearTimeout(holdTimer.current)
    setFan(null)
  }, [game.current, game.players[HUMAN].hand.length, dealt])

  const playFanned = (count: number) => {
    if (!fan) return
    const [first, ...rest] = fan.cards
    setFan(null)
    attempt({ from: 'hand', cardId: first.id, with: rest.slice(0, count - 1).map((c) => c.id) }, true)
  }

  const attempt = (source: Source, fromFan = false) => {
    if (!humanTurn) return
    if (!fromFan && Date.now() < ignoreClicksUntil.current) return
    clearTimeout(holdTimer.current)
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
  const computerHand = useHiddenHandOrder(computer.hand, dealt, game, opponentEnds)
  // the card still flying onto the pile isn't on it yet
  const flying = new Set(flight?.cards.map((f) => f.card.id))
  const visiblePile = game.pile.filter((c) => !flying.has(c.id)).slice(-4)
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
                { label: 'Deal', shortcut: 'F2', onSelect: askForNewGame },
                { label: '', separator: true },
                {
                  label: 'Difficulty…',
                  detail: <BiscuitName difficulty={difficulty} />,
                  onSelect: askForNewGame,
                },
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
            hand={computerHand}
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
            onHoldStart={holdStart}
            onHoldCancel={holdCancel}
            onFanKey={(card) => openFan(card, false)}
            flash={flash}
            incoming={incomingFor(HUMAN, swoosh, drawing)}
          />

          {swoosh && <Swoosh animation={swoosh} key={`swoosh-${swoosh.id}`} />}
          {drawing && <Deal animation={drawing} key={`deal-${drawing.id}`} />}
          {flight && <PlayFlight animation={flight} key={`play-${flight.id}`} />}
          {fan && (
            <MultiFan fan={fan} feltWidth={feltRef.current?.clientWidth ?? 600} onPlay={playFanned} onClose={closeFan} />
          )}

          {celebrating && <WinCascade cards={[...game.discard, ...game.pile]} onDone={endCelebration} />}
        </main>

        <StatusBar
          panels={[
            { content: status, grow: true, live: true },
            { content: turnText },
            { content: <BiscuitName difficulty={difficulty} inline /> },
            { content: `Cards left: ${cardsLeft(you)} vs ${cardsLeft(computer)}` },
          ]}
        />
      </div>

      {dialog === 'difficulty' && (
        <DifficultyDialog current={difficulty} onChoose={chooseDifficulty} onClose={closeDifficulty} />
      )}

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
            pile, then play again.
          </p>
          <p>
            <b>Playing several at once:</b> got more than one card of the same rank? Hover over one for a second (or press
            and hold it on a touch screen) and they fan out, so you can play two, three or all of them together. They count
            as one play.
          </p>
          <p>
            If you can't play, click the pile to pick it all up, then start the empty pile with any card. After each play
            you draw back up to five cards while the deck lasts. Press F2 to deal a new game.
          </p>
          <p>
            Every new game starts by asking which biscuit you're up against: Soggy is easy, Crumbly is in between,
            and Crunchy is hard.
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
            { label: 'Yes', onClick: askForNewGame },
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

// where an element sits on the felt, from layout alone: unlike getBoundingClientRect this
// ignores transforms, so cards mid-animation (or the felt mid-shake) don't throw it off
function feltPosition(felt: HTMLElement, el: HTMLElement): Point {
  let x = 0
  let y = 0
  for (let node: HTMLElement | null = el; node && node !== felt; node = node.offsetParent as HTMLElement | null) {
    x += node.offsetLeft
    y += node.offsetTop
  }
  return { x, y }
}

// where each of these cards sits in its hand. Cards on their way in keep an invisible place
// there, so a flying card can land exactly on it.
function cardTargets(felt: HTMLElement, cards: Card[]) {
  const targets = new Map<number, Point>()
  for (const card of cards) {
    const el = felt.querySelector<HTMLElement>(`.hand__slot[data-card-id="${card.id}"]`)
    if (el) targets.set(card.id, feltPosition(felt, el))
  }
  return targets
}

// the ids of cards still flying into a player's hand
function incomingFor(player: number, ...animations: ({ player: number; hiddenIds: Set<number> } | null)[]) {
  const ids = animations.flatMap((a) => (a && a.player === player ? [...a.hiddenIds] : []))
  return ids.length ? new Set(ids) : undefined
}

type HandEnd = 'start' | 'end'
interface HandEnds {
  deck: HandEnd
  pile: HandEnd
}

// The computer's cards are shown in the order it got them, never sorted, so where a card
// sits in its hand (or lands, or leaves from) says nothing about its rank. New cards join
// whichever end of the hand is nearer to where they came from: the deck or the pile.
function nextHiddenOrder(previous: number[], hand: Card[], game: GameState, ends: HandEnds) {
  const inHand = new Set(hand.map((c) => c.id))
  const kept = previous.filter((id) => inHand.has(id))
  const keptIds = new Set(kept)
  const drawOrder = game.draw?.cards.map((c) => c.id) ?? []
  // picked-up cards keep the order they had on the pile, then any failed hidden card
  const pileOrder = [...(game.pickup?.cards ?? []), ...(game.pickup?.flipped ? [game.pickup.flipped] : [])].map((c) => c.id)
  const fresh = hand.filter((c) => !keptIds.has(c.id)).map((c) => c.id)
  const byOrder = (list: number[]) => (a: number, b: number) => list.indexOf(a) - list.indexOf(b)
  const fromDeck = fresh.filter((id) => drawOrder.includes(id)).sort(byOrder(drawOrder))
  const fromPile = fresh.filter((id) => !drawOrder.includes(id)).sort(byOrder(pileOrder))
  let ids = kept
  const join = (newIds: number[], end: HandEnd) => {
    if (newIds.length) ids = end === 'start' ? [...newIds.reverse(), ...ids] : [...ids, ...newIds]
  }
  join(fromPile, ends.pile)
  join(fromDeck, ends.deck)
  return ids
}

// Keeps that order as state. When the hand changes, the next order is worked out during the
// render (React's pattern for state derived from props), so what's on screen and what the
// next change builds on are always the same.
function useHiddenHandOrder(hand: Card[], dealt: number, game: GameState, ends: { current: HandEnds }) {
  const [order, setOrder] = useState(() => ({ hand, dealt, ids: hand.map((c) => c.id) }))
  let current = order
  if (order.hand !== hand || order.dealt !== dealt) {
    // a fresh deal starts from the dealt order: nothing has moved yet, so it gives nothing away
    const ids = order.dealt !== dealt ? hand.map((c) => c.id) : nextHiddenOrder(order.ids, hand, game, ends.current)
    current = { hand, dealt, ids }
    setOrder(current)
  }
  const byId = new Map(hand.map((c) => [c.id, c]))
  return current.ids.map((id) => byId.get(id)!)
}

interface SeatProps {
  player: Player
  // the order to show the hand in, when it isn't the player's own sorted order
  hand?: Card[]
  active: boolean
  opponent?: boolean
  reservedLocked?: boolean
  onPlay?: (source: Source) => void
  flash?: string | null
  // cards still flying into this hand, kept invisible until they land
  incoming?: Set<number>
  // holding a card (hover with a mouse, press with a finger) to fan out its matches
  onHoldStart?: (card: Card, pointerType: string) => void
  onHoldCancel?: () => void
  onFanKey?: (card: Card) => void
}

function Seat({
  player,
  hand: cards = player.hand,
  active,
  opponent,
  reservedLocked,
  onPlay,
  flash,
  incoming,
  onHoldStart,
  onHoldCancel,
  onFanKey,
}: SeatProps) {
  const hand = (
    <div className={`hand ${opponent ? 'hand--opponent' : ''}`} aria-label={`${player.name} hand`}>
      {cards.length === 0 && <EmptySpot />}
      {/* each card sits in a slot that shrinks when the hand gets big, so the cards overlap more.
          A card still flying in keeps its slot, invisible, until it lands. */}
      {cards.map((card) => (
        <div
          className={`hand__slot ${incoming?.has(card.id) ? 'hand__slot--incoming' : ''}`}
          key={card.id}
          data-card-id={card.id}
          // hover (mouse) or press and hold (touch) to fan out matching cards
          onPointerEnter={(e) => e.pointerType === 'mouse' && onHoldStart?.(card, 'mouse')}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onHoldCancel?.()}
          onPointerDown={(e) => e.pointerType !== 'mouse' && onHoldStart?.(card, e.pointerType)}
          onPointerUp={(e) => e.pointerType !== 'mouse' && onHoldCancel?.()}
          onPointerCancel={() => onHoldCancel?.()}
          onContextMenu={(e) => onHoldStart && e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && onFanKey) {
              e.preventDefault()
              onFanKey(card)
            }
          }}
        >
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
