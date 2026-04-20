import { useEffect, useState } from 'react'

const LINES = [
  '[ OK ] MEMORY CHECK — 640K ALLOCATED',
  '[ OK ] SECURE STORE — READ/WRITE',
  '[ OK ] COVERT NODE — HANDSHAKE PENDING',
  '[ .. ] LOADING FIELD MANUAL…………… DONE',
  '[ OK ] DISPLAY SUBSYSTEM — 72% SIGNAL',
  'TERMINAL ID  RX-7749-DELTA  //  CLASSIFIED',
  'AWAITING OPERATOR CREDENTIALS —',
]

type Props = {
  onComplete: () => void
}

export function BootSequence({ onComplete }: Props) {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (visible >= LINES.length) {
      const t = setTimeout(onComplete, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 520)
    return () => clearTimeout(t)
  }, [visible, onComplete])

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

  return (
    <div className="boot">
      <pre className="boot__header">COVERT TERMINAL v3.1 — BIOS</pre>
      <ul className="boot__lines">
        {LINES.slice(0, visible).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
        {visible < LINES.length && <li className="boot__cursor">▌</li>}
      </ul>
      <p className="boot__skip">[ SPACE / ESC — SKIP ]</p>
    </div>
  )
}
