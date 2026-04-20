type Props = {
  /** Single a–z (from config); shown to the player */
  wakeKey: string
}

export function StandbyScreen({ wakeKey }: Props) {
  const letter = wakeKey.toUpperCase()

  return (
    <div className="standby">
      <pre className="standby__title">{'>'} SYSTEM STANDBY</pre>
      <p className="standby__hint">
        PRESS{' '}
        <kbd className="standby__key" translate="no">
          {letter}
        </kbd>{' '}
        <span className="blink">TO ACTIVATE TERMINAL</span>
      </p>
      <p className="standby__sub">Mouse and other keys are ignored.</p>
      <div className="standby__pulse" aria-hidden />
    </div>
  )
}
