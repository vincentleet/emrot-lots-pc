type Props = {
  /** Single a–z (from config); shown to the player */
  wakeKey: string
}

export function StandbyScreen({ wakeKey }: Props) {
  const letter = wakeKey.toUpperCase()

  return (
    <div className="standby">
      <pre className="standby__title">{'>'} AGENT E03 · STANDBY</pre>
      <p className="standby__hint">
        PRESS{' '}
        <kbd className="standby__key" translate="no">
          {letter}
        </kbd>{' '}
        <span className="blink">TO WAKE E03&apos;S MACHINE</span>
      </p>
      <p className="standby__sub">
        E03&apos;s Second Lake terminal — last personnel fix unknown. Other keys ignored.
      </p>
      <div className="standby__pulse" aria-hidden />
    </div>
  )
}
