import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Suit } from './Suit'

// Windows XP "Luna" window pieces: title bar, menu bar, status bar and message box

export function TitleBar({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="xp-titlebar">
      <span className="xp-titlebar__icon" aria-hidden="true">
        <span className="xp-titlebar__icon-card" />
        <span className="xp-titlebar__icon-card xp-titlebar__icon-card--front">
          <Suit suit="♥" />
        </span>
      </span>
      <span className="xp-titlebar__title">{title}</span>
      <span className="xp-titlebar__buttons">
        <span className="xp-button xp-button--min" aria-hidden="true" />
        <span className="xp-button xp-button--max" aria-hidden="true" />
        {onClose ? (
          <button type="button" className="xp-button xp-button--close" onClick={onClose} aria-label="Close" />
        ) : (
          <span className="xp-button xp-button--close" aria-hidden="true" />
        )}
      </span>
    </div>
  )
}

export interface MenuItem {
  label: string
  shortcut?: string
  onSelect?: () => void
  separator?: boolean
}

export function MenuBar({ menus }: { menus: { label: string; items: MenuItem[] }[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null)
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="xp-menubar" ref={barRef} role="menubar">
      {menus.map((menu) => (
        <div className="xp-menu" key={menu.label}>
          <button
            type="button"
            role="menuitem"
            aria-label={menu.label}
            aria-haspopup="true"
            aria-expanded={open === menu.label}
            className={`xp-menu__title ${open === menu.label ? 'xp-menu__title--open' : ''}`}
            onClick={() => setOpen(open === menu.label ? null : menu.label)}
            onMouseEnter={() => open && setOpen(menu.label)}
          >
            <u>{menu.label[0]}</u>
            {menu.label.slice(1)}
          </button>
          {open === menu.label && (
            <div className="xp-menu__dropdown" role="menu">
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div className="xp-menu__separator" key={i} role="separator" />
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="xp-menu__item"
                    key={item.label}
                    onClick={() => {
                      setOpen(null)
                      item.onSelect?.()
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="xp-menu__shortcut">{item.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function StatusBar({ panels }: { panels: { content: ReactNode; grow?: boolean; live?: boolean }[] }) {
  return (
    <div className="xp-statusbar">
      {panels.map((panel, i) => (
        <div
          key={i}
          className={`xp-statusbar__panel ${panel.grow ? 'xp-statusbar__panel--grow' : ''}`}
          aria-live={panel.live ? 'polite' : undefined}
        >
          {panel.content}
        </div>
      ))}
    </div>
  )
}

export interface DialogButton {
  label: string
  onClick: () => void
}

export function MessageBox({
  title,
  icon = 'info',
  children,
  buttons,
  onClose,
}: {
  title: string
  icon?: 'info' | 'question' | null
  children: ReactNode
  buttons: DialogButton[]
  onClose: () => void
}) {
  const firstButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstButton.current?.focus()
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  return (
    <div className="xp-dialog-backdrop">
      <div className="xp-window xp-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="xp-titlebar xp-titlebar--small">
          <span className="xp-titlebar__title">{title}</span>
          <span className="xp-titlebar__buttons">
            <button type="button" className="xp-button xp-button--close" onClick={onClose} aria-label="Close" />
          </span>
        </div>
        <div className="xp-dialog__body">
          <div className="xp-dialog__content">
            {icon && <span className={`xp-icon xp-icon--${icon}`} aria-hidden="true" />}
            <div className="xp-dialog__text">{children}</div>
          </div>
          <div className="xp-dialog__buttons">
            {buttons.map((b, i) => (
              <button type="button" className="xp-push-button" key={b.label} onClick={b.onClick} ref={i === 0 ? firstButton : undefined}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
