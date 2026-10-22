import { useState } from 'react'
import { DIFFICULTIES, type Difficulty } from './ai'
import { MessageBox } from './Xp'

// each difficulty is a biscuit, from one that's been left in the tea to one that bites back
export const BISCUITS: Record<Difficulty, { name: string; chinese: string; pinyin: string; meaning: string; joke: string }> = {
  easy: {
    name: 'Soggy',
    chinese: '软趴趴',
    pinyin: 'ruǎn pā pā',
    meaning: 'limp, floppy',
    joke: 'Left in the tea too long. Barely plays.',
  },
  medium: {
    name: 'Crumbly',
    chinese: '一碰就碎',
    pinyin: 'yí pèng jiù suì',
    meaning: 'breaks at a touch',
    joke: 'Means well. Falls apart under pressure.',
  },
  hard: {
    name: 'Crunchy',
    chinese: '嘎嘣脆',
    pinyin: 'gā bēng cuì',
    meaning: 'the sound of a hard crunch',
    joke: 'It has never lost. It will not start now.',
  },
}

// the English name with the Chinese underneath, or beside it when there's only one line
export function BiscuitName({ difficulty, inline = false }: { difficulty: Difficulty; inline?: boolean }) {
  const b = BISCUITS[difficulty]
  return (
    <span className={`biscuit-name ${inline ? 'biscuit-name--inline' : ''}`}>
      <span className="biscuit-name__en">{b.name}</span>
      <span className="biscuit-name__zh" lang="zh">
        {b.chinese}
      </span>
    </span>
  )
}

// dunked in tea and drooping over the rim of the cup, dripping
function SoggyArt() {
  return (
    <svg viewBox="0 0 80 64" aria-hidden="true">
      <ellipse cx="34" cy="59" rx="26" ry="4" fill="#e9e4d6" stroke="#8c8573" />
      <path d="M50 37q11 0 11 7.5T50 52" fill="none" stroke="#8c8573" strokeWidth="3" />
      <path d="M14 34h40v5q0 17-20 17T14 39z" fill="#fbf8f0" stroke="#8c8573" strokeWidth="1.5" />
      <path d="M20 46q14 4 28 0" fill="none" stroke="#7aa7d6" strokeWidth="2" />
      <ellipse cx="34" cy="34" rx="20" ry="3.5" fill="#a0602c" stroke="#8c8573" />
      {/* the biscuit: dry at the top, dark and wet where it went in the tea */}
      <path d="M31 34C30 20 37 10 49 11s16 9 15 20" fill="none" stroke="#dcaa5e" strokeWidth="11" strokeLinecap="round" />
      <path d="M31 34c-.4-5 .2-9 1.5-12.5M64 31c.2-3-.3-6-1.4-8.6" fill="none" stroke="#a9733a" strokeWidth="11" strokeLinecap="round" />
      <circle cx="40" cy="15" r="1" fill="#a9733a" />
      <circle cx="56" cy="14" r="1" fill="#a9733a" />
      {/* droopy eyes and a wobbly mouth */}
      <path d="M43 16.5q2 2 4 0M51 16.5q2 2 4 0" fill="none" stroke="#5b3a1a" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M45 21q2-1.5 4 0t4 0" fill="none" stroke="#5b3a1a" strokeWidth="1.3" strokeLinecap="round" />
      <path className="biscuit-art__drip" d="M64 38q-2 3 0 4.5 2-1.5 0-4.5z" fill="#a0602c" />
      <path className="biscuit-art__drip biscuit-art__drip--late" d="M64 45q-1.6 2.4 0 3.6 1.6-1.2 0-3.6z" fill="#a0602c" />
    </svg>
  )
}

// a round biscuit with a chunk gone, cracking, and shedding crumbs
function CrumblyArt() {
  return (
    <svg viewBox="0 0 80 64" aria-hidden="true">
      <path
        d="M40 6a24 24 0 1 1-23.6 28.5l6.1-2.4-3.4-5.6 5.6-3.3-3.8-4.9A24 24 0 0 1 40 6z"
        fill="#e2ad62"
        stroke="#a26b2c"
        strokeWidth="1.5"
      />
      <path d="M52 14l-4 7 3 4-5 6M30 46l5-5-1-5" fill="none" stroke="#a26b2c" strokeWidth="1.2" strokeLinejoin="round" />
      {[
        [33, 15],
        [45, 12],
        [56, 24],
        [58, 38],
        [47, 49],
        [36, 52],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="#a26b2c" />
      ))}
      {/* wide, worried eyes, a small "o" and a bead of sweat */}
      <circle cx="38" cy="27" r="3" fill="#fff" stroke="#5b3a1a" />
      <circle cx="48" cy="27" r="3" fill="#fff" stroke="#5b3a1a" />
      <circle cx="38.5" cy="27.5" r="1.2" fill="#2b1a0c" />
      <circle cx="48.5" cy="27.5" r="1.2" fill="#2b1a0c" />
      <ellipse cx="43" cy="36" rx="2" ry="2.6" fill="#5b3a1a" />
      <path d="M56 19q-2 3 0 4.4 2-1.4 0-4.4z" fill="#8fd0ff" stroke="#3a86c8" strokeWidth=".6" />
      <g className="biscuit-art__crumbs" fill="#d39a4e" stroke="#a26b2c" strokeWidth=".5">
        <path d="M15 40l3-1 1 3-3 1z" />
        <path d="M11 49l2-2 2 2-2 1.5z" />
        <path d="M20 56l3 0 0 2.5-3 .5z" />
        <path d="M27 60l2-1.5 1.5 2-2 1z" />
        <path d="M8 58l2 0 .5 2-2 .3z" />
      </g>
    </svg>
  )
}

// a scorched, cracked, jagged biscuit with glowing red eyes and a mouth full of teeth
function CrunchyArt() {
  return (
    <svg viewBox="0 0 80 64" aria-hidden="true">
      <defs>
        <filter id="crunchy-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M40 3l5 6 7-3 2 7 8 0-1 8 7 3-4 7 5 6-7 3 1 8-8-1-3 7-6-4-6 5-4-7-8 2 0-8-7-2 4-7-5-6 7-3-1-8 8 1 2-7 7 3z"
        fill="#2b1a12"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* glowing cracks */}
      <path
        className="biscuit-art__cracks"
        d="M40 3l-2 9 4 5M71 26l-9 3-3 6M17 48l8-6-1-6M50 55l-3-7 4-4"
        fill="none"
        stroke="#ff3b1f"
        strokeWidth="1.2"
        filter="url(#crunchy-glow)"
      />
      {/* angry brows over red eyes */}
      <path d="M26 20l12 6M54 20l-12 6" stroke="#000" strokeWidth="3" strokeLinecap="round" />
      <g className="biscuit-art__eyes" filter="url(#crunchy-glow)">
        <path d="M27 24l10 4-2 4-8-2z" fill="#ff1a0a" />
        <path d="M53 24l-10 4 2 4 8-2z" fill="#ff1a0a" />
        <circle cx="33" cy="28.5" r="1" fill="#fff6a8" />
        <circle cx="47" cy="28.5" r="1" fill="#fff6a8" />
      </g>
      {/* a grin of jagged teeth */}
      <path d="M24 38q16 14 32 0q-16 5-32 0z" fill="#120000" stroke="#000" />
      <path d="M25 38.4l3 5 2-4 3 5 2-4.4 3 5 2-5 3 5 2-4.6 3 4.4 2-4.8 3 4 2-4" fill="#f4eedc" stroke="#000" strokeWidth=".6" strokeLinejoin="round" />
    </svg>
  )
}

const ART: Record<Difficulty, () => JSX.Element> = { easy: SoggyArt, medium: CrumblyArt, hard: CrunchyArt }

// Game > Difficulty… : pick a biscuit. The first time the game is opened this comes up on its own.
export function DifficultyDialog({
  current,
  onChoose,
  onClose,
}: {
  current: Difficulty
  onChoose: (difficulty: Difficulty) => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState(current)
  return (
    <MessageBox
      title="Choose your biscuit"
      icon={null}
      className="biscuit-dialog"
      onClose={onClose}
      buttons={[
        { label: 'OK', onClick: () => onChoose(picked) },
        { label: 'Cancel', onClick: onClose },
      ]}
    >
      <p>How tough should the computer be?</p>
      <div className="biscuit-tiles" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => {
          const b = BISCUITS[d]
          const Art = ART[d]
          return (
            <label key={d} className={`biscuit-tile biscuit-tile--${d} ${picked === d ? 'biscuit-tile--picked' : ''}`}>
              <input type="radio" name="biscuit" value={d} checked={picked === d} onChange={() => setPicked(d)} />
              <span className="biscuit-tile__art">
                <Art />
                {d === 'hard' && picked === 'hard' && (
                  <span className="biscuit-tile__stamp" lang="zh" aria-hidden="true">
                    咔嚓！
                  </span>
                )}
              </span>
              <span className="biscuit-tile__text">
                <BiscuitName difficulty={d} />
                <span className="biscuit-tile__gloss">
                  {b.pinyin}, “{b.meaning}”
                </span>
                <span className="biscuit-tile__joke">{b.joke}</span>
              </span>
            </label>
          )
        })}
      </div>
    </MessageBox>
  )
}
