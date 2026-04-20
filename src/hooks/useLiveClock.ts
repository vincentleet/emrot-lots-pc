import { useEffect, useState } from 'react'

export function useLiveClock(): string {
  const [t, setT] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => setT(formatClock(new Date())), 1000)
    return () => window.clearInterval(id)
  }, [])

  return t
}

function formatClock(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} LOCAL`
}
