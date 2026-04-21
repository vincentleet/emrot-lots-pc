import { useEffect, useState } from 'react'

const LINES = [
  '[ OK ] MEMORY CHECK — 640K ALLOCATED',
  '[ OK ] SECURE STORE — READ/WRITE',
  '[ OK ] AGENT E03 SECURE NODE — HANDSHAKE PENDING',
  '[ .. ] LOADING E03 · SECOND LAKE OPS MANUAL…………… DONE',
  '[ OK ] DISPLAY SUBSYSTEM — 72% SIGNAL',
  '[ !! ] E03 LOCATOR — NO FIX · WHEREABOUTS UNKNOWN',
  'TERMINAL ID  E03-SLK-01 · SECOND LAKE  //  CLASSIFIED',
  'AWAITING AGENT E03 CREDENTIALS —',
] as const

const LOADING_LINE_INDEX = 3
const LOADING_TICK_MS = 80
const LOADING_STEPS = 20
const LOADING_DONE_HOLD_MS = 420

/** Animated BIOS row: dots grow with percentage until the final static line is committed. */
function LoadingBootLine({ pct }: { pct: number }) {
  if (pct >= 100) {
    return <>{LINES[LOADING_LINE_INDEX]}</>
  }
  const maxDots = 14
  const dotCount = Math.min(maxDots, Math.round((pct / 100) * maxDots))
  const dots = '.'.repeat(dotCount)
  return (
    <>
      [ .. ] LOADING E03 · SECOND LAKE OPS MANUAL{dotCount > 0 ? ` ${dots} ` : ' '}
      {pct}%
    </>
  )
}

type Props = {
  onComplete: () => void
}

export function BootSequence({ onComplete }: Props) {
  const [shown, setShown] = useState(0)
  const [phaseLoading, setPhaseLoading] = useState(false)
  const [loadPct, setLoadPct] = useState(0)

  useEffect(() => {
    if (shown >= LINES.length) {
      const t = setTimeout(onComplete, 400)
      return () => clearTimeout(t)
    }
    if (phaseLoading) return

    const t = setTimeout(() => {
      if (shown === LOADING_LINE_INDEX) {
        setPhaseLoading(true)
      } else {
        setShown((v) => v + 1)
      }
    }, 520)
    return () => clearTimeout(t)
  }, [shown, phaseLoading, onComplete])

  useEffect(() => {
    if (!phaseLoading) return

    setLoadPct(0)
    let step = 0
    const id = setInterval(() => {
      step += 1
      const pct = Math.min(100, Math.round((step / LOADING_STEPS) * 100))
      setLoadPct(pct)
      if (step >= LOADING_STEPS) {
        clearInterval(id)
        setTimeout(() => {
          setPhaseLoading(false)
          setShown(LOADING_LINE_INDEX + 1)
        }, LOADING_DONE_HOLD_MS)
      }
    }, LOADING_TICK_MS)

    return () => clearInterval(id)
  }, [phaseLoading])

  useEffect(() => {
    const skip = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault()
        onComplete()
      }
    }
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [onComplete])

  const showCursor = shown < LINES.length || phaseLoading

  return (
    <div className="boot">
      <pre className="boot__header">AGENT E03 · SECOND LAKE WORKSTATION v3.1 — BIOS</pre>
      <ul className="boot__lines">
        {LINES.slice(0, phaseLoading ? LOADING_LINE_INDEX : shown).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
        {phaseLoading && (
          <li key="loading">
            <LoadingBootLine pct={loadPct} />
          </li>
        )}
        {showCursor && <li className="boot__cursor">▌</li>}
      </ul>
      <p className="boot__skip">[ SPACE / ESC — SKIP ]</p>
    </div>
  )
}
