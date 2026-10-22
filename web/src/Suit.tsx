import type { Suit as SuitName } from './game'

// flat, slightly chunky suit shapes on a 100 x 100 grid. Drawn as paths rather than text so
// the browser can't swap in its glossy emoji hearts and diamonds.
const circle = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`

export const SUIT_PATHS: Record<SuitName, string> = {
  '♥': 'M50 90C31 73 5 58 5 33C5 17 17 6 31 6C40 6 46 11 50 19C54 11 60 6 69 6C83 6 95 17 95 33C95 58 69 73 50 90Z',
  '♦': 'M50 3Q61 31 87 50Q61 69 50 97Q39 69 13 50Q39 31 50 3Z',
  '♠':
    'M50 4C64 24 92 39 92 61C92 75 81 83 69 83C61 83 55 79 52 73C53 83 57 90 67 96H33C43 90 47 83 48 73C45 79 39 83 31 83C19 83 8 75 8 61C8 39 36 24 50 4Z',
  '♣': [circle(50, 27, 20), circle(27, 58, 20), circle(73, 58, 20), circle(50, 52, 12), 'M45 58C45 76 41 87 32 96H68C59 87 55 76 55 58Z'].join(
    '',
  ),
}

export function Suit({ suit, className }: { suit: SuitName; className?: string }) {
  return (
    <svg className={`suit ${className ?? ''}`} viewBox="0 0 100 100" aria-hidden="true">
      <path d={SUIT_PATHS[suit]} fill="currentColor" />
    </svg>
  )
}
