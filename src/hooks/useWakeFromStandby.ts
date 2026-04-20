import { useEffect } from 'react'

/**
 * Standby clears only when the operator presses the configured wake letter (a–z).
 * Mouse and other keys are ignored.
 */
export function useWakeFromStandby(
  active: boolean,
  onWake: () => void,
  wakeKey: string,
): void {
  useEffect(() => {
    if (!active) return

    const key = wakeKey.toLowerCase()
    let done = false

    const onKeyDown = (e: KeyboardEvent) => {
      if (done) return
      if (e.repeat) return
      if (e.key.length !== 1) return
      if (e.key.toLowerCase() !== key) return
      done = true
      window.removeEventListener('keydown', onKeyDown, true)
      onWake()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active, onWake, wakeKey])
}
