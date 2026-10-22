import { useEffect, useRef } from 'react'
import { type Card, isRed, rankLabel } from './game'

const W = 71
const H = 96

function drawCard(ctx: CanvasRenderingContext2D, card: Card, x: number, y: number) {
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x + 0.5, y + 0.5, W - 1, H - 1, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = isRed(card) ? '#e00000' : '#000'
  ctx.textAlign = 'center'
  ctx.font = 'bold 14px Tahoma, Verdana, sans-serif'
  ctx.fillText(rankLabel(card.rank), x + 11, y + 17)
  ctx.font = '13px Tahoma, Verdana, sans-serif'
  ctx.fillText(card.suit, x + 11, y + 31)
  ctx.font = card.rank > 10 ? 'bold 30px Georgia, serif' : '34px Georgia, serif'
  ctx.fillText(card.rank > 10 ? rankLabel(card.rank) : card.suit, x + W / 2, y + H / 2 + 12)
}

// the Windows XP Solitaire victory animation: cards launch one at a time, bounce along
// the bottom and leave a trail behind them. Click or press a key to skip.
export function WinCascade({ cards, onDone }: { cards: Card[]; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const queue = cards.length ? cards.slice(-52) : []
    let index = 0
    let frame = 0
    let x = 0
    let y = 0
    let vx = 0
    let vy = 0

    const launch = () => {
      const card = queue[index]
      // launch from one of four "foundation" spots along the top right
      const spot = index % 4
      x = width - (4 - spot) * (W + 10)
      y = 12
      vx = (Math.random() * 6 + 2) * (Math.random() < 0.5 ? -1 : 1)
      vy = -Math.random() * 8
      drawCard(ctx, card, x, y)
    }

    // one physics tick; returns false once every card has left the table
    const tick = () => {
      vy += 0.5
      x += vx
      y += vy
      if (y + H > height) {
        y = height - H
        vy = -vy * 0.75
      }
      drawCard(ctx, queue[index], x, y)
      if (x + W < 0 || x > width) {
        index++
        if (index >= queue.length) return false
        launch()
      }
      return true
    }

    // run at a fixed 60 ticks per second whatever the frame rate, drawing every tick
    // so the trail stays continuous when frames are slow
    let last = performance.now()
    let pending = 0
    const step = (now: number) => {
      pending = Math.min(pending + (now - last) / (1000 / 60), 60)
      last = now
      for (; pending >= 1; pending--) {
        if (!tick()) return onDone()
      }
      frame = requestAnimationFrame(step)
    }

    if (!queue.length) {
      onDone()
      return
    }
    launch()
    frame = requestAnimationFrame(step)

    const skip = () => onDone()
    window.addEventListener('keydown', skip)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', skip)
    }
  }, [cards, onDone])

  return <canvas ref={canvasRef} className="win-cascade" onClick={onDone} aria-label="You won! Click to continue." />
}
