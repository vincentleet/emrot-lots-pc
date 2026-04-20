import { useCallback, useRef, useState } from 'react'
import type { Phase } from '../phase'
import type { ResetTarget } from '../config/mission'
import { terminalAudio } from '../audio/terminalAudio'

export type StaffResetApi = {
  /** Call when staff chord is confirmed (after PIN if required) */
  executeReset: () => void
  /** True when waiting for PIN entry after chord */
  pinOpen: boolean
  setPinOpen: (v: boolean) => void
  pinValue: string
  setPinValue: (v: string) => void
  submitPin: () => void
  /** One activation — five within ~2s triggers reset (spam-click header local time) */
  recordRapidClick: () => void
}

type Props = {
  resetTarget: ResetTarget
  staffPin: string
  onReset: (phase: Phase) => void
}

/**
 * Staff reset: five rapid activations on the header local-time display (~2s window).
 * Optional PIN modal when `VITE_STAFF_PIN` is set. Keyboard shortcut removed (conflicts with browser chords).
 */
export function useStaffReset({
  resetTarget,
  staffPin,
  onReset,
}: Props): StaffResetApi {
  const [pinOpen, setPinOpen] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const clicksRef = useRef<number[]>([])

  const mapTarget = useCallback((): Phase => {
    if (resetTarget === 'main') return 'main'
    return resetTarget
  }, [resetTarget])

  const runReset = useCallback(() => {
    terminalAudio.stopBootHum()
    setPinOpen(false)
    setPinValue('')
    onReset(mapTarget())
  }, [mapTarget, onReset])

  const executeReset = useCallback(() => {
    if (staffPin && staffPin.length > 0) {
      setPinOpen(true)
      return
    }
    runReset()
  }, [staffPin, runReset])

  const submitPin = useCallback(() => {
    if (pinValue.trim() === staffPin.trim()) runReset()
    else {
      setPinValue('')
      setPinOpen(false)
    }
  }, [pinValue, staffPin, runReset])

  const recordRapidClick = useCallback(() => {
    const now = Date.now()
    const arr = clicksRef.current.filter((t) => now - t < 2000)
    arr.push(now)
    clicksRef.current = arr
    if (arr.length >= 5) {
      clicksRef.current = []
      executeReset()
    }
  }, [executeReset])

  return {
    executeReset,
    pinOpen,
    setPinOpen,
    pinValue,
    setPinValue,
    submitPin,
    recordRapidClick,
  }
}
