import { useId, useState } from 'react'
import { checkLogin } from '../lib/login'
import { terminalAudio } from '../audio/terminalAudio'

type Props = {
  expectedPassword: string
  onSuccess: () => void
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LoginScreen({ expectedPassword, onSuccess }: Props) {
  const [value, setValue] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  const unlockAudio = () => {
    terminalAudio.resume()
  }

  const onPassphraseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Enter') return
    const editsField =
      e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete'
    if (!editsField || reducedMotion()) return
    unlockAudio()
    terminalAudio.playKeypress()
  }

  const submit = () => {
    unlockAudio()
    if (checkLogin(value, expectedPassword)) {
      terminalAudio.playSuccess()
      onSuccess()
    } else {
      terminalAudio.playError()
      setError('ACCESS DENIED — INVALID CREDENTIAL')
      setValue('')
    }
  }

  return (
    <div className="login">
      <h1 className="login__title">SECURE SESSION</h1>
      <p className="login__sub">Enter network passphrase</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor={id} className="sr-only">
          Password
        </label>
        <div className="login__pass-wrap">
          <input
            id={id}
            className="login__input"
            type={showPassphrase ? 'text' : 'password'}
            name="covert-passphrase"
            autoComplete="new-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setError(null)
              setValue(e.target.value)
            }}
            onFocus={unlockAudio}
            onPointerDown={unlockAudio}
            onKeyDown={onPassphraseKeyDown}
            autoFocus
          />
          <button
            type="button"
            className="login__toggle-pass"
            onClick={() => {
              unlockAudio()
              setShowPassphrase((v) => !v)
            }}
            aria-pressed={showPassphrase}
            aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
          >
            {showPassphrase ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        {error && <p className="login__err">{error}</p>}
        <button type="submit" className="btn">
          AUTHENTICATE
        </button>
      </form>
    </div>
  )
}
