import { useState } from 'react'
import { DIFFICULTIES, type Difficulty } from './ai'
import { type BiscuitMood, BiscuitMoodArt } from './BiscuitMoods'
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
      <span className="biscuit-name__zh" lang="zh-Hans">
        {b.chinese}
      </span>
    </span>
  )
}

const MOODS: Record<Difficulty, BiscuitMood> = { easy: 'soggy', medium: 'crumbly', hard: 'crunchy' }

// pick a biscuit: this opens at the start of every new game (launch, Deal, F2, Game > Difficulty…)
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
          return (
            <label key={d} className={`biscuit-tile biscuit-tile--${d} ${picked === d ? 'biscuit-tile--picked' : ''}`}>
              <input type="radio" name="biscuit" value={d} checked={picked === d} onChange={() => setPicked(d)} />
              <span className="biscuit-tile__art">
                <BiscuitMoodArt mood={MOODS[d]} size={88} />
                {d === 'hard' && picked === 'hard' && (
                  <span className="biscuit-tile__stamp" lang="zh-Hans" aria-hidden="true">
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
