import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './index.css'
import { getMissionConfig } from './config/mission'
import type { Phase } from './phase'
import { terminalAudio } from './audio/terminalAudio'
import { useWakeFromStandby } from './hooks/useWakeFromStandby'
import { useStaffReset } from './hooks/useStaffReset'
import { StandbyScreen } from './components/StandbyScreen'
import { BootSequence } from './components/BootSequence'
import { LoginScreen } from './components/LoginScreen'
import { MainWorkspace } from './components/MainWorkspace'
import { DiagramViewer } from './components/DiagramViewer'
import { TerminalFrame } from './components/TerminalFrame'

export default function App() {
  const RESET_NOTICE_MS = 2500
  const RESET_NOTICE_FADE_MS = 300
  const config = useMemo(() => getMissionConfig(), [])
  const [phase, setPhase] = useState<Phase>('standby')
  const [sessionKey, setSessionKey] = useState(0)
  const [showResetNotice, setShowResetNotice] = useState(false)
  const [resetNoticeFading, setResetNoticeFading] = useState(false)
  const resetHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyStaffPhase = useCallback(
    (p: Phase) => {
      if (resetHoldTimerRef.current) clearTimeout(resetHoldTimerRef.current)
      if (resetFadeTimerRef.current) clearTimeout(resetFadeTimerRef.current)
      setShowResetNotice(true)
      setResetNoticeFading(false)
      resetHoldTimerRef.current = setTimeout(() => {
        setSessionKey((k) => k + 1)
        setPhase(p)
        setResetNoticeFading(true)
        resetFadeTimerRef.current = setTimeout(() => {
          setShowResetNotice(false)
          setResetNoticeFading(false)
          resetFadeTimerRef.current = null
        }, RESET_NOTICE_FADE_MS)
        resetHoldTimerRef.current = null
      }, RESET_NOTICE_MS)
    },
    [RESET_NOTICE_MS, RESET_NOTICE_FADE_MS],
  )

  const staff = useStaffReset({
    resetTarget: config.resetTarget,
    staffPin: config.staffPin,
    onReset: applyStaffPhase,
  })

  const onWake = useCallback(() => {
    terminalAudio.resume()
    terminalAudio.playTick()
    setPhase(config.wakeSkipsBoot ? 'login' : 'boot')
  }, [config.wakeSkipsBoot])

  useWakeFromStandby(phase === 'standby', onWake, config.wakeKey)

  useEffect(() => {
    if (phase === 'boot') terminalAudio.startBootHum()
    else terminalAudio.stopBootHum()
  }, [phase])

  useEffect(() => {
    return () => {
      if (resetHoldTimerRef.current) clearTimeout(resetHoldTimerRef.current)
      if (resetFadeTimerRef.current) clearTimeout(resetFadeTimerRef.current)
    }
  }, [])

  const fixedLayer =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {!showResetNotice && (
              <>
                <div className="crt__scanlines" aria-hidden />
                <div className="crt__vignette" aria-hidden />
              </>
            )}
            {staff.pinOpen && (
              <div
                className="staff-pin"
                role="dialog"
                aria-label="Staff PIN"
              >
                <p>Staff override — resets E03&apos;s Second Lake station</p>
                <input
                  className="staff-pin__input"
                  type="password"
                  value={staff.pinValue}
                  onChange={(e) => staff.setPinValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') staff.submitPin()
                  }}
                  autoFocus
                />
                <button type="button" className="btn" onClick={staff.submitPin}>
                  CONFIRM
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    staff.setPinOpen(false)
                    staff.setPinValue('')
                  }}
                >
                  CANCEL
                </button>
              </div>
            )}
          </>,
          document.body,
        )
      : null

  return (
    <>
      {fixedLayer}
      <div className="app crt">
        {showResetNotice && (
          <section
            className={`reset-notice${resetNoticeFading ? ' reset-notice--fade-out' : ''}`}
            aria-live="polite"
          >
            <p>Legacy of the Spy terminal has now been reset.</p>
          </section>
        )}
        <TerminalFrame
          phase={phase}
          onClockRapidClick={staff.recordRapidClick}
        >
          {phase === 'standby' && <StandbyScreen wakeKey={config.wakeKey} />}

          {phase === 'boot' && (
            <BootSequence onComplete={() => setPhase('login')} />
          )}

          {phase === 'login' && (
            <LoginScreen
              expectedPassword={config.loginPassword}
              onSuccess={() => setPhase('main')}
            />
          )}

          {phase === 'main' && (
            <MainWorkspace
              key={sessionKey}
              secureChannels={config.secureChannels}
              onPuzzleSolved={() => setPhase('classified')}
            />
          )}

          {phase === 'classified' && (
            <DiagramViewer src={config.diagramPath} />
          )}
        </TerminalFrame>
      </div>
    </>
  )
}
