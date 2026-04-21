import { useCallback, useState } from 'react'
import { channelsMatch, getChannelFeedback, type ChannelFeedback } from '../lib/puzzle'
import { terminalAudio } from '../audio/terminalAudio'

type Props = {
  target: readonly [number, number, number]
  onSolved: () => void
}

type DialProps = {
  label: string
  value: number
  idx: 0 | 1 | 2
  onBump: (which: 0 | 1 | 2, delta: number) => void
}

function ChannelDial({ label, value, idx, onBump }: DialProps) {
  return (
    <div className="dial">
      <span className="dial__label">{label}</span>
      <div className="dial__row">
        <button
          type="button"
          className="dial__btn"
          aria-label={`${label} decrease`}
          onClick={() => onBump(idx, -1)}
        >
          −
        </button>
        <span className="dial__value" tabIndex={0}>
          {value}
        </span>
        <button
          type="button"
          className="dial__btn"
          aria-label={`${label} increase`}
          onClick={() => onBump(idx, 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

function hintChar(h: ChannelFeedback['hints'][0]): string {
  if (h === 'match') return '●'
  if (h === 'higher') return '↑'
  return '↓'
}

function hintLabel(h: ChannelFeedback['hints'][0]): string {
  if (h === 'match') return 'locked'
  if (h === 'higher') return 'increase'
  return 'decrease'
}

export function GateMiniGame({ target, onSolved }: Props) {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [c, setC] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<ChannelFeedback | null>(null)
  const [feedbackStale, setFeedbackStale] = useState(false)

  const bump = useCallback(
    (which: 0 | 1 | 2, delta: number) => {
      terminalAudio.playDialTick()
      setMsg(null)
      if (feedback) setFeedbackStale(true)
      if (which === 0) setA((v) => (v + delta + 10) % 10)
      if (which === 1) setB((v) => (v + delta + 10) % 10)
      if (which === 2) setC((v) => (v + delta + 10) % 10)
    },
    [feedback],
  )

  const verify = () => {
    const cur: [number, number, number] = [a, b, c]
    if (channelsMatch(cur, target)) {
      terminalAudio.playSuccess()
      setFeedback(null)
      onSolved()
    } else {
      terminalAudio.playError()
      setFeedback(getChannelFeedback(cur, target))
      setFeedbackStale(false)
      setMsg('E03 HANDSHAKE FAILED — ANALYSIS BELOW')
    }
  }

  return (
    <div className="gate">
      <h2 className="gate__title">E03 MODULE — SECURE CHANNEL</h2>
      <p className="gate__copy">
        Agent E03&apos;s uplink: align digits with the broadcast schedule from
        the field kit. E03 is not on voice or data — position unknown — so you
        are matching the schedule cold. Range 0–9 per channel. Each attempt
        returns a signal scan: how many channels match, overall coherence, and
        whether each channel needs a higher or lower digit.
      </p>
      <div className="gate__dials">
        <ChannelDial label="CHANNEL A" value={a} idx={0} onBump={bump} />
        <ChannelDial label="CHANNEL B" value={b} idx={1} onBump={bump} />
        <ChannelDial label="CHANNEL C" value={c} idx={2} onBump={bump} />
      </div>

      {msg && <p className="gate__msg">{msg}</p>}

      {feedback && (
        <div
          className={`gate__feedback ${feedbackStale ? 'gate__feedback--stale' : ''}`}
          aria-live="polite"
        >
          {feedbackStale && (
            <p className="gate__feedback-stale">
              Dials changed — prior scan outdated. Transmit again to refresh
              analysis.
            </p>
          )}
          <div className="gate__feedback-grid">
            <div className="gate__feedback-stat">
              <span className="gate__feedback-label">CHANNELS LOCKED</span>
              <span className="gate__feedback-value">
                {feedback.exactCount} / 3
              </span>
            </div>
            <div className="gate__feedback-stat">
              <span className="gate__feedback-label">SIGNAL COHERENCE</span>
              <span className="gate__feedback-value">
                {feedback.coherencePercent}%
              </span>
            </div>
            <div className="gate__feedback-stat gate__feedback-stat--wide">
              <span className="gate__feedback-label">TOTAL DRIFT</span>
              <span className="gate__feedback-value">
                {feedback.manhattanSum} / {27}
              </span>
            </div>
          </div>
          <div
            className="gate__coherence-bar"
            role="meter"
            aria-valuenow={feedback.coherencePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Signal coherence"
          >
            <div
              className="gate__coherence-bar-fill"
              style={{ width: `${feedback.coherencePercent}%` }}
            />
          </div>
          <div className="gate__hints">
            {(['A', 'B', 'C'] as const).map((name, i) => (
              <div key={name} className="gate__hint">
                <span className="gate__hint-name">{name}</span>
                <span
                  className={`gate__hint-arrow gate__hint-arrow--${feedback.hints[i]}`}
                  title={hintLabel(feedback.hints[i])}
                >
                  {hintChar(feedback.hints[i])}
                </span>
                <span className="gate__hint-caption">
                  {hintLabel(feedback.hints[i])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="btn gate__verify" onClick={verify}>
        ESTABLISH E03 UPLINK
      </button>
    </div>
  )
}
