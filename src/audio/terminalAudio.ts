/** Web Audio–only SFX; no external files. */

const MASTER = 0.35

export class TerminalAudio {
  private ctx: AudioContext | null = null
  private humOsc: OscillatorNode | null = null
  private muted = false

  isMuted(): boolean {
    return this.muted
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (m) this.stopBootHum()
  }

  /** Must run after a user gesture for autoplay policies */
  resume(): void {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private ensure(): AudioContext | null {
    if (this.muted) return null
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  startBootHum(): void {
    const ctx = this.ensure()
    if (!ctx) return
    this.stopBootHum()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 62
    gain.gain.value = 0.012 * MASTER
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    this.humOsc = osc
  }

  stopBootHum(): void {
    try {
      this.humOsc?.stop()
    } catch {
      /* already stopped */
    }
    this.humOsc = null
  }

  playTick(): void {
    this.beep(880, 0.04, 'square', 0.06)
  }

  playDialTick(): void {
    this.beep(520, 0.035, 'triangle', 0.05)
  }

  /** Short keystroke — login / text fields (quieter than playTick). */
  playKeypress(): void {
    this.beep(640, 0.022, 'square', 0.028)
  }

  playSuccess(): void {
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.12 * MASTER, t + i * 0.06)
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(t + i * 0.06)
      o.stop(t + i * 0.06 + 0.22)
    })
  }

  playError(): void {
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.value = 140
    g.gain.setValueAtTime(0.1 * MASTER, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t)
    o.stop(t + 0.28)
  }

  playStamp(): void {
    this.beep(220, 0.08, 'sine', 0.1)
    setTimeout(() => this.beep(330, 0.06, 'sine', 0.07), 70)
  }

  private beep(
    freq: number,
    dur: number,
    type: OscillatorType,
    gainAmt: number,
  ): void {
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(gainAmt * MASTER, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
}

export const terminalAudio = new TerminalAudio()
