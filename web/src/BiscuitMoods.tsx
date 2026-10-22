// Little drawings for the three difficulty levels, all built on the crimped square biscuit
// from the card back (same crimp, docking holes and palette) so they read as a set:
// Soggy sags sleepily into a cup of tea, Crumbly has lost a bite and is shedding crumbs, and
// Crunchy is burnt, cracked and furious. Each is drawn on a 100 x 100 grid centred on 0,0.

const BISCUIT = '#e9b866'
const CRIMP = '#c88a3c'
const HOLE = '#8e531c'
const INK = '#5a3210'
const RED = '#c8102e'
const GOLD = '#f2c14e'

export type BiscuitMood = 'soggy' | 'crumbly' | 'crunchy'

function Soggy() {
  return (
    <g transform="translate(0 -2)">
      <circle cx="44" cy="22" r="9" fill="none" stroke={RED} strokeWidth="5" />
      <ellipse cx="0" cy="8" rx="40" ry="6" fill={GOLD} />
      <ellipse cx="0" cy="8" rx="35" ry="4.2" fill="#8b5a2b" />
      <path
        d="M-24 -34H24Q30 -34 30 -28L32 4Q33 14 26 16Q24 26 20 18Q14 12 6 16Q0 30 -4 16Q-12 10 -20 16Q-32 18 -32 4L-30 -28Q-30 -34 -24 -34Z"
        fill="#e2ae5c"
        stroke={CRIMP}
        strokeWidth="3"
        strokeDasharray="4 3"
        strokeLinejoin="round"
      />
      <path
        d="M-31 -4Q-14 2 0 -2Q16 -6 31 -2L32 4Q33 14 26 16Q24 26 20 18Q14 12 6 16Q0 30 -4 16Q-12 10 -20 16Q-32 18 -32 4Z"
        fill="#9a6a2c"
        opacity="0.35"
      />
      <g fill={HOLE}>
        <circle cx="-14" cy="-26" r="1.8" />
        <circle cx="0" cy="-26" r="1.8" />
        <circle cx="14" cy="-26" r="1.8" />
      </g>
      {/* sleepy eyes and a wobbly mouth */}
      <path d="M-15 -14Q-10 -10 -5 -14M5 -14Q10 -10 15 -14" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M-8 -2Q-4 -5 0 -2Q4 1 8 -2" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* the front of the teacup, over the soggy bottom of the biscuit */}
      <path d="M-40 8A40 6 0 0 0 40 8L32 46Q30 52 24 52H-24Q-30 52 -32 46Z" fill={RED} />
      <path d="M-40 8A40 6 0 0 0 40 8" fill="none" stroke={GOLD} strokeWidth="2.2" />
      <path d="M-34 24Q0 30 34 24" fill="none" stroke={GOLD} strokeWidth="1" />
      <path d="M-18 34Q-15 38 -18 41Q-21 38 -18 34Z" fill={GOLD} />
      <path
        d="M14 -40Q18 -46 14 -52M22 -38Q26 -44 22 -50"
        fill="none"
        stroke={CRIMP}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
    </g>
  )
}

function Crumbly() {
  const crumbs: [number, number, number, number, number][] = [
    [20, -34, 5, 4, 20],
    [30, -26, 4, 4, -15],
    [34, -12, 3.5, 3, 30],
    [-14, 38, 5, 4, 25],
    [2, 42, 4, 3.5, -20],
    [16, 37, 4.5, 4, 10],
    [-4, 50, 3.5, 3, 40],
    [24, 48, 3, 3, -30],
  ]
  return (
    <g transform="translate(0 -4)">
      <path
        d="M-26 -30Q-26 -34 -22 -34H4A7 7 0 0 0 14 -28A7 7 0 0 0 24 -20A7 7 0 0 0 30 -8V26Q30 30 26 30H-22Q-26 30 -26 26Z"
        fill={BISCUIT}
        stroke={CRIMP}
        strokeWidth="3"
        strokeDasharray="4 3"
        strokeLinejoin="round"
      />
      <path d="M14 -28L8 -18L12 -12M24 -20L18 -14" fill="none" stroke={HOLE} strokeWidth="1.4" strokeLinecap="round" />
      <g fill={HOLE}>
        <circle cx="-14" cy="-22" r="1.8" />
        <circle cx="-2" cy="-22" r="1.8" />
        <circle cx="-14" cy="18" r="1.8" />
        <circle cx="0" cy="18" r="1.8" />
        <circle cx="14" cy="18" r="1.8" />
      </g>
      {/* worried brows, wide eyes, a wobbly mouth and a bead of sweat */}
      <path d="M-16 -13L-8 -16M6 -16L14 -13" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="-11" cy="-7" r="2.6" fill={INK} />
      <circle cx="10" cy="-7" r="2.6" fill={INK} />
      <path d="M-8 6Q-4 2 0 6Q4 10 8 6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M-32 -20Q-29 -14 -32 -11Q-35 -14 -32 -20Z" fill="#6fa8dc" />
      <g fill={BISCUIT} stroke={CRIMP} strokeWidth="0.8">
        {crumbs.map(([x, y, w, h, turn]) => (
          <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} transform={`rotate(${turn} ${x + w / 2} ${y + h / 2})`} />
        ))}
      </g>
    </g>
  )
}

function Crunchy() {
  return (
    <g>
      {/* a red glow behind it */}
      <circle r="50" fill="#ff1a1a" opacity="0.07" />
      <circle r="42" fill="#ff1a1a" opacity="0.1" />
      <path
        d="M-28 -28L-19 -34L-9 -27L0 -35L9 -27L19 -34L28 -28L34 -19L27 -9L35 0L27 9L34 19L28 28L19 34L9 27L0 35L-9 27L-19 34L-28 28L-34 19L-27 9L-35 0L-27 -9L-34 -19Z"
        fill="#3b1d12"
        stroke="#0d0503"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* glowing cracks and embers where the docking holes were */}
      <path
        d="M-4 -31L2 -20L-3 -12M30 6L18 10L14 20M-30 -4L-20 -2"
        fill="none"
        stroke="#ff5a1f"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#ff7a2a">
        <circle cx="-16" cy="-22" r="1.4" />
        <circle cx="16" cy="-22" r="1.4" />
        <circle cx="-18" cy="24" r="1.4" />
        <circle cx="18" cy="24" r="1.4" />
      </g>
      {/* furious brows, glowing eyes and a mouthful of teeth */}
      <path d="M-23 -19L-5 -10M23 -19L5 -10" fill="none" stroke="#0d0503" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="-12" cy="-7" r="7" fill="#ff2a2a" opacity="0.28" />
      <circle cx="12" cy="-7" r="7" fill="#ff2a2a" opacity="0.28" />
      <path d="M-20 -11L-5 -6L-18 -2Z" fill="#ff2a2a" />
      <path d="M20 -11L5 -6L18 -2Z" fill="#ff2a2a" />
      <path d="M-11 -7L-10 -4M11 -7L10 -4" stroke="#ffe3c2" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M-16 7H16L12 18H-12Z" fill="#0d0503" />
      <path d="M-15 7L-11 13L-7 7ZM-7 7L-3 13L1 7ZM1 7L5 13L9 7ZM9 7L12.5 12L15.5 7Z" fill="#fff3e0" />
      <path d="M-11 18L-7 13L-3 18ZM1 18L5 13L9 18Z" fill="#fff3e0" />
      <g fill="#ff5a1f">
        <path d="M-40 -30L-36 -27L-41 -25Z" />
        <path d="M40 -32L37 -28L42 -27Z" />
        <path d="M42 30L38 33L43 35Z" />
        <path d="M-42 28L-38 31L-43 34Z" />
      </g>
    </g>
  )
}

const DRAWINGS = { soggy: Soggy, crumbly: Crumbly, crunchy: Crunchy }

export function BiscuitMoodArt({ mood, size = 96, className }: { mood: BiscuitMood; size?: number; className?: string }) {
  const Drawing = DRAWINGS[mood]
  return (
    <svg className={className} width={size} height={size} viewBox="-56 -56 112 112" aria-hidden="true">
      <Drawing />
    </svg>
  )
}
