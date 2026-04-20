import type { Phase } from '../phase'
import { getMissionConfig } from '../config/mission'
import { useLiveClock } from '../hooks/useLiveClock'
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

function KvRow({ k, v, dim }: { k: string; v: string; dim?: boolean }) {
  return (
    <div className={`module-kv ${dim ? 'module-kv--dim' : ''}`}>
      <span className="module-kv__k">{k}</span>
      <span className="module-kv__v">{v}</span>
    </div>
  )
}

function randomHex(byteLen: number): string {
  const u = new Uint8Array(byteLen)
  crypto.getRandomValues(u)
  return Array.from(u, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function crc32HexFromString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i)
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

type CryptoDigest = { groups: string[]; crc: string; epoch: number }

function makeCryptoDigest(): CryptoDigest {
  const raw = randomHex(16)
  const groups = [0, 4, 8, 12].map((i) => raw.slice(i, i + 4))
  return {
    groups,
    crc: crc32HexFromString(raw),
    epoch: Date.now(),
  }
}

function useCryptoDigest(rotateMinutes: number) {
  const [d, setD] = useState<CryptoDigest>(() => makeCryptoDigest())
  useEffect(() => {
    const ms = rotateMinutes * 60 * 1000
    const id = window.setInterval(() => setD(makeCryptoDigest()), ms)
    return () => window.clearInterval(id)
  }, [rotateMinutes])
  return d
}

/** Isometric-ish projection for 3D yield curve (x,y,z in ~0…1) */
function isoProject(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  scale: number,
): [number, number] {
  const px = cx + (x - z) * scale * 0.9
  const py = cy - y * scale * 1.08 + (x + z) * scale * 0.24
  return [px, py]
}

function formatUptime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600) % 100
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** LED colour + animation mode (each row should feel distinct) */
export type LampColor =
  | 'green'
  | 'amber'
  | 'red'
  | 'cyan'
  | 'magenta'
  | 'blue'
  | 'white'
  | 'dim'

export type LampMode = 'pulse' | 'flicker' | 'solid' | 'scan' | 'strobe'

function StatusLamp({
  color,
  mode,
  delayMs = 0,
}: {
  color: LampColor
  mode: LampMode
  delayMs?: number
}) {
  return (
    <span
      className={`led led--c-${color} led--m-${mode}`}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-hidden
    />
  )
}

function StatusRow({
  label,
  color,
  mode,
  delayMs,
  suffix,
}: {
  label: string
  color: LampColor
  mode: LampMode
  delayMs?: number
  suffix?: string
}) {
  return (
    <div className="module-row">
      <StatusLamp color={color} mode={mode} delayMs={delayMs} />
      <span className="module-row__label">{label}</span>
      {suffix != null && suffix !== '' && (
        <span className="module-row__suffix">{suffix}</span>
      )}
    </div>
  )
}

function ModulePanel({
  title,
  children,
  compact,
}: {
  title: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <section
      className={`module-panel ${compact ? 'module-panel--compact' : ''}`}
      aria-label={title}
    >
      <h2 className="module-panel__title">{title}</h2>
      <div className="module-panel__body">{children}</div>
    </section>
  )
}

function SignalMeter({ level }: { level: number }) {
  const bars = [1, 2, 3, 4, 5]
  return (
    <div className="signal-meter" aria-hidden>
      {bars.map((i) => (
        <span
          key={i}
          className={`signal-meter__bar ${i <= level ? `signal-meter__bar--n${i}` : ''}`}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

/* ——— Status modules (compact) ——— */

export function ModuleSystemStatus({ phase }: { phase: Phase }) {
  const on = phase !== 'standby'
  const [load, setLoad] = useState(7.2)
  const [ecc, setEcc] = useState(0)
  const [uptSec, setUptSec] = useState(4 * 3600 + 17 * 60 + 33)
  const [dramUsed, setDramUsed] = useState(2847)
  const [busMhz, setBusMhz] = useState(66)
  const [thermC, setThermC] = useState(39.4)
  const [irqPerS, setIrqPerS] = useState(8420)

  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => setUptSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [on])

  useEffect(() => {
    const id = window.setInterval(() => {
      setLoad((v) => Math.min(99, Math.max(1, v + (Math.random() - 0.48) * 2)))
      setEcc((e) => (e + 1) % 4)
      setDramUsed((v) =>
        Math.min(4090, Math.max(512, v + Math.floor((Math.random() - 0.45) * 24))),
      )
      setBusMhz((v) =>
        Math.min(72, Math.max(58, Math.round(v + (Math.random() - 0.5) * 2))),
      )
      setThermC((v) =>
        Math.min(
          44,
          Math.max(34, +(v + (Math.random() - 0.5) * 0.35).toFixed(1)),
        ),
      )
      setIrqPerS((v) =>
        Math.min(11200, Math.max(6200, v + Math.floor((Math.random() - 0.5) * 420))),
      )
    }, 3100)
    return () => window.clearInterval(id)
  }, [])

  return (
    <ModulePanel title="SUBSYSTEMS" compact>
      <StatusRow
        label="CORE"
        color={on ? 'green' : 'dim'}
        mode={on ? 'pulse' : 'solid'}
        delayMs={0}
        suffix={on ? 'run' : 'idle'}
      />
      <StatusRow
        label="MEM"
        color={on ? 'cyan' : 'dim'}
        mode={on ? 'flicker' : 'solid'}
        delayMs={40}
        suffix="ok"
      />
      <StatusRow
        label="PWR"
        color="amber"
        mode="scan"
        delayMs={80}
        suffix="stab"
      />
      <StatusRow
        label="THERM"
        color="blue"
        mode="solid"
        suffix={on ? `${thermC.toFixed(1)}°C` : '—'}
      />
      <div className="module-block module-block--tight">
        <KvRow k="LOAD" v={`${load.toFixed(1)}%`} />
        <KvRow k="BUS" v={on ? `${busMhz} MHz` : '—'} dim={!on} />
        <KvRow
          k="DRAM"
          v={on ? `${dramUsed} / 4096 MB` : '0 / 4096 MB'}
          dim={!on}
        />
        <KvRow k="ECC" v={on ? `CHK ${ecc}/4` : '—'} dim={!on} />
        <KvRow k="UPT" v={on ? formatUptime(uptSec) : '00:00:00'} dim={!on} />
        <KvRow k="IRQ/s" v={on ? irqPerS.toLocaleString() : '—'} dim={!on} />
        <KvRow k="PID" v="0x8A2F" />
      </div>
    </ModulePanel>
  )
}

export function ModuleNetwork({ phase }: { phase: Phase }) {
  const [ms, setMs] = useState(42)
  const [jitter, setJitter] = useState(1.2)
  const [pps, setPps] = useState(12840)
  const [drops, setDrops] = useState(0)
  const [rxMb, setRxMb] = useState(482.3)

  useEffect(() => {
    const id = window.setInterval(() => {
      setMs(38 + Math.floor(Math.random() * 18))
      setJitter(0.8 + Math.random() * 1.4)
      setPps(12000 + Math.floor(Math.random() * 2400))
      setDrops((d) => Math.max(0, Math.min(12, d + (Math.random() < 0.12 ? 1 : 0) - (Math.random() < 0.35 ? 1 : 0))))
      setRxMb((v) => +(v + (Math.random() - 0.48) * 0.07).toFixed(1))
    }, 2200)
    return () => window.clearInterval(id)
  }, [])

  const secured = phase === 'main' || phase === 'classified' || phase === 'login'
  const uplink =
    phase === 'main' ? 'hs' : phase === 'classified' ? 'fl' : 'rx'
  const lvl =
    phase === 'classified' ? 5 : phase === 'main' ? 4 : phase === 'standby' ? 2 : 3

  return (
    <ModulePanel title="NETWORK" compact>
      <StatusRow
        label="TLS"
        color={secured ? 'green' : 'amber'}
        mode={secured ? 'strobe' : 'pulse'}
        suffix={secured ? 'on' : 'arm'}
      />
      <StatusRow
        label="UP"
        color={phase === 'main' || phase === 'classified' ? 'cyan' : 'magenta'}
        mode="flicker"
        delayMs={60}
        suffix={uplink}
      />
      <div className="module-row module-row--meter">
        <span className="module-row__label">SIG</span>
        <SignalMeter level={lvl} />
      </div>
      <StatusRow
        label="RTT"
        color="white"
        mode="solid"
        suffix={`${ms}ms`}
      />
      <div className="module-block module-block--tight">
        <KvRow k="IFACE" v="eth0.7" />
        <KvRow k="GW" v="10.77.0.1" />
        <KvRow k="JIT" v={`±${jitter.toFixed(2)} ms`} />
        <KvRow k="PKT/s" v={pps.toLocaleString()} />
        <KvRow k="RX" v={`${rxMb.toFixed(1)} MB`} />
        <KvRow k="DROP" v={`${drops}`} />
      </div>
    </ModulePanel>
  )
}

export function ModuleSecurity({ phase }: { phase: Phase }) {
  const [nonce, setNonce] = useState(0x6f91c2e4)
  const [ttl, setTtl] = useState(64)
  const [fail, setFail] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setNonce((n) => (n + Math.floor(Math.random() * 0x10000) + 0x3a) >>> 0)
      setTtl((t) => Math.max(32, Math.min(128, t + Math.floor((Math.random() - 0.5) * 4))))
      setFail((f) => Math.max(0, Math.min(99, f + (Math.random() < 0.08 ? 1 : 0) - (Math.random() < 0.2 ? 1 : 0))))
    }, 2800)
    return () => window.clearInterval(id)
  }, [])

  return (
    <ModulePanel title="SECURITY" compact>
      <StatusRow
        label="FW"
        color="green"
        mode="pulse"
        suffix="ok"
      />
      <StatusRow
        label="ENC"
        color={phase === 'login' ? 'red' : 'cyan'}
        mode={phase === 'login' ? 'strobe' : 'scan'}
        suffix={phase === 'login' ? '!' : '256'}
      />
      <StatusRow
        label="SESS"
        color={phase === 'classified' ? 'magenta' : 'amber'}
        mode={phase === 'classified' ? 'flicker' : 'solid'}
        suffix={phase === 'classified' ? 'vault' : 'sig'}
      />
      <div className="module-block module-block--tight">
        <KvRow k="POLICY" v="RX-7749-A" />
        <KvRow k="HMAC" v="SHA-256" />
        <KvRow k="NONCE" v={`0x${nonce.toString(16).toUpperCase().padStart(8, '0')}`} />
        <KvRow k="TTL" v={`${ttl}`} />
        <KvRow k="FAIL" v={`${fail}`} />
        <KvRow k="SIG" v={phase === 'classified' ? 'VALID' : 'PENDING'} />
      </div>
    </ModulePanel>
  )
}

export function ModuleCryptoCycle() {
  const { cryptoRotateMinutes } = getMissionConfig()
  const digest = useCryptoDigest(cryptoRotateMinutes)
  const line = digest.groups.join(' · ')
  const [tick, setTick] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now())
      setTick((t) => (t + 1) % 10000)
    }, 500)
    return () => window.clearInterval(id)
  }, [digest.epoch])

  const ageSec = Math.floor((nowMs - digest.epoch) / 1000)

  return (
    <ModulePanel title="CRYPTO HANDSHAKE" compact>
      <KvRow k="INT" v={`${cryptoRotateMinutes} min`} />
      <KvRow k="AGE" v={`${ageSec}s`} />
      <KvRow k="ROT" v={`0x${digest.crc.slice(0, 4)}`} />
      <div className="module-crypto-digest" aria-label="Rotating digest">
        {line}
      </div>
      <KvRow k="CRC-32" v={`0x${digest.crc}`} />
      <KvRow k="TICK" v={`${tick.toString().padStart(4, '0')}`} />
      <div className="module-ascii" aria-hidden>
        {digest.epoch.toString(36).toUpperCase().slice(-6)} · SYNC
      </div>
    </ModulePanel>
  )
}

export function ModuleOrbitalTelemetry({ phase }: { phase: Phase }) {
  const [az, setAz] = useState(142.6)
  const [el, setEl] = useState(38.2)
  const [snr, setSnr] = useState(18.4)
  const [tleEpoch, setTleEpoch] = useState(2461023.441)
  const [tempC, setTempC] = useState(18.2)
  const [rh, setRh] = useState(41)
  const [hop, setHop] = useState(3)
  const [doppler, setDoppler] = useState(-842.0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setAz((v) => +(v + (Math.random() - 0.5) * 0.15).toFixed(2))
      setEl((v) => +(v + (Math.random() - 0.5) * 0.08).toFixed(2))
      setSnr((v) => +(v + (Math.random() - 0.5) * 0.3).toFixed(1))
      setTleEpoch((v) =>
        Math.min(
          2461024.999,
          Math.max(2461022.0, +(v + (Math.random() - 0.5) * 0.004).toFixed(3)),
        ),
      )
      setTempC((v) => Math.min(24, Math.max(14, +(v + (Math.random() - 0.5) * 0.12).toFixed(1))))
      setRh((v) => Math.min(65, Math.max(28, Math.round(v + (Math.random() - 0.5) * 2))))
      setHop((h) => ((h + Math.floor(Math.random() * 3)) % 8) + 1)
      setDoppler((d) => +(d + (Math.random() - 0.5) * 18).toFixed(1))
    }, 4000)
    return () => window.clearInterval(id)
  }, [])

  const track = phase !== 'standby'

  return (
    <ModulePanel title="SAT / RF" compact>
      <KvRow k="ORB" v={track ? 'LEO-9A' : '—'} dim={!track} />
      <KvRow k="AZ / EL" v={`${az.toFixed(1)}° / ${el.toFixed(1)}°`} dim={!track} />
      <KvRow k="SNR" v={track ? `${snr.toFixed(1)} dB` : '—'} dim={!track} />
      <KvRow
        k="TLE EPOCH"
        v={track ? tleEpoch.toFixed(3) : '—'}
        dim={!track}
      />
      <KvRow k="DOPPLER" v={track ? `${doppler.toFixed(1)} Hz` : '—'} dim={!track} />
      <KvRow k="ENV" v={`${tempC.toFixed(1)}°C · ${rh}%RH`} />
      <KvRow k="RF" v={track ? `2.412 GHz · H${hop}` : 'mute'} dim={!track} />
      <div className="module-radio__note" aria-hidden>
        HOP SEQ · 8 CH · DSSS
      </div>
    </ModulePanel>
  )
}

/* ——— Diagram-style modules (no scroll; flex-shrinks inside aside) ——— */

const SPEC_HEIGHTS = [
  35, 52, 28, 61, 44, 70, 33, 55, 48, 62, 30, 58, 41, 66, 37, 50, 44, 59, 32, 54, 47, 63,
  39, 56,
]

export function ModuleDiagramYield3Axis({ phase }: { phase: Phase }) {
  const gid = useId().replace(/:/g, '')
  const cx = 56
  const cy = 71
  const sc = 36
  const [sampleN, setSampleN] = useState(847)
  const [cohPct, setCohPct] = useState(99.2)
  const [err, setErr] = useState(0.0031)

  useEffect(() => {
    const id = window.setInterval(() => {
      setSampleN((n) => n + Math.floor(Math.random() * 18) + 4)
      setCohPct((c) =>
        Math.min(99.9, Math.max(96.5, +(c + (Math.random() - 0.5) * 0.15).toFixed(1))),
      )
      setErr((e) =>
        Math.max(0.0005, +(e + (Math.random() - 0.48) * 0.0004).toFixed(4)),
      )
    }, 3400)
    return () => window.clearInterval(id)
  }, [])

  const { axisPath, gridPaths, curvePath, axisTicks } = useMemo(() => {
    const O = isoProject(0, 0, 0, cx, cy, sc)
    const X = isoProject(1, 0, 0, cx, cy, sc)
    const Y = isoProject(0, 1, 0, cx, cy, sc)
    const Z = isoProject(0, 0, 1, cx, cy, sc)
    const axisPath = `M ${O[0]} ${O[1]} L ${X[0]} ${X[1]} M ${O[0]} ${O[1]} L ${Y[0]} ${Y[1]} M ${O[0]} ${O[1]} L ${Z[0]} ${Z[1]}`

    const grid: string[] = []
    for (let i = 1; i <= 3; i++) {
      const t = i / 4
      const a = isoProject(t, 0, 0, cx, cy, sc)
      const b = isoProject(t, 0, 1, cx, cy, sc)
      grid.push(`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`)
      const c = isoProject(0, 0, t, cx, cy, sc)
      const d = isoProject(1, 0, t, cx, cy, sc)
      grid.push(`M ${c[0]} ${c[1]} L ${d[0]} ${d[1]}`)
    }

    const pts: [number, number][] = []
    const boost = phase === 'main' ? 0.06 : phase === 'classified' ? 0.1 : 0
    for (let i = 0; i <= 56; i++) {
      const u = (i / 56) * Math.PI * 2
      const x = 0.42 + 0.26 * Math.cos(u * 1.2) + boost * 0.5
      const y = 0.28 + 0.32 * Math.sin(u * 0.85 + 0.4)
      const z = 0.15 + (i / 56) * 0.72
      pts.push(isoProject(x, y, z, cx, cy, sc))
    }
    const curvePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
      .join(' ')

    const tick = (ax: 'x' | 'y' | 'z', v: number) => {
      if (ax === 'x') {
        const p = isoProject(v, -0.04, 0, cx, cy, sc)
        return { x: p[0], y: p[1], t: v.toFixed(1) }
      }
      if (ax === 'y') {
        const p = isoProject(0, v, 0, cx, cy, sc)
        return { x: p[0], y: p[1] - 4, t: v.toFixed(1) }
      }
      const p = isoProject(0, -0.04, v, cx, cy, sc)
      return { x: p[0], y: p[1], t: v.toFixed(1) }
    }

    const axisTicks = [
      tick('x', 0.25),
      tick('x', 0.75),
      tick('y', 0.33),
      tick('y', 0.66),
      tick('z', 0.35),
      tick('z', 0.85),
    ]

    return {
      axisPath,
      gridPaths: grid,
      curvePath,
      axisTicks,
    }
  }, [phase])

  return (
    <ModulePanel title="YIELD · 3-AXIS PROJECTION" compact>
      <div className="module-block module-block--tight module-block--yield3d-stats">
        <KvRow k="N" v={`${sampleN.toLocaleString()}`} />
        <KvRow k="COH" v={`${cohPct.toFixed(1)}%`} />
        <KvRow k="ERR" v={`±${err.toFixed(4)}`} />
      </div>
      <div className="diagram-mod diagram-mod--yield3d">
        <svg
          className="diagram-mod__yield3d-svg"
          /* Full drawing extends to ~y≈88 (origin/axes floor); older viewBox ended at 82 and clipped the bottom */
          viewBox="0 32 118 64"
          preserveAspectRatio="xMidYMax meet"
          aria-hidden
        >
          <defs>
            <linearGradient id={`${gid}-curve`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7fffbb" stopOpacity="1" />
              <stop offset="55%" stopColor="#33ff88" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#1a9955" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          {gridPaths.map((d, i) => (
            <path
              key={`g-${i}`}
              d={d}
              fill="none"
              stroke="rgba(120,255,160,0.38)"
              strokeWidth="0.55"
            />
          ))}
          <path
            d={axisPath}
            fill="none"
            stroke="rgba(220,255,235,0.92)"
            strokeWidth="1.05"
          />
          <path
            d={curvePath}
            fill="none"
            stroke={`url(#${gid}-curve)`}
            strokeWidth="1.55"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="96" y="76" fill="#66ff99" fontSize="6.2" fontFamily="inherit">
            X
          </text>
          <text x="18" y="36" fill="#66ffee" fontSize="6.2" fontFamily="inherit">
            Y
          </text>
          <text x="8" y="74" fill="#ffdd66" fontSize="6.2" fontFamily="inherit">
            Z
          </text>
          {axisTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={t.y}
              fill="rgba(200,255,215,0.82)"
              fontSize="5.1"
              fontFamily="inherit"
              textAnchor="middle"
            >
              {t.t}
            </text>
          ))}
        </svg>
        <div className="diagram-mod__caption">
          ISO · X,Y,Z ∈ [0,1] · PROJ v1
        </div>
      </div>
    </ModulePanel>
  )
}

const TERRAIN_RIDGE_PATH =
  'M 4 56 Q 26 12 58 34 Q 84 42 118 22'
const TERRAIN_SPUR_PATH =
  'M 14 58 Q 36 38 54 52 Q 74 46 96 38'
const TERRAIN_VALLEY_PATH =
  'M 8 66 Q 42 60 68 62 Q 94 58 114 54'
const TERRAIN_ROUTE_D =
  'M 18 60 L 42 49 L 64 57 L 88 46 L 104 42'

export function ModuleDiagramTerrainMap({ phase }: { phase: Phase }) {
  const active = phase !== 'standby'
  const gid = useId().replace(/:/g, '')
  const [elvM, setElvM] = useState(287)
  const [sats, setSats] = useState(12)
  const [hdop, setHdop] = useState(0.82)
  const [bearing, setBearing] = useState(312)
  const [slopePct, setSlopePct] = useState(6.2)
  const [vAccM, setVAccM] = useState(1.8)

  useEffect(() => {
    const id = window.setInterval(() => {
      setElvM((v) => Math.min(310, Math.max(260, v + Math.floor((Math.random() - 0.5) * 5))))
      setSats((s) => Math.min(14, Math.max(8, s + Math.floor((Math.random() - 0.45) * 2))))
      setHdop((h) => Math.min(1.4, Math.max(0.45, +(h + (Math.random() - 0.5) * 0.06).toFixed(2))))
      setBearing((b) => (b + Math.floor((Math.random() - 0.5) * 4) + 360) % 360)
      setSlopePct((s) =>
        Math.min(11, Math.max(3.5, +(s + (Math.random() - 0.5) * 0.35).toFixed(1))),
      )
      setVAccM((v) => Math.min(2.4, Math.max(1.1, +(v + (Math.random() - 0.5) * 0.1).toFixed(1))))
    }, 3600)
    return () => window.clearInterval(id)
  }, [])

  const contourRidge = useMemo(
    () => [0, 3.2, 6.4, 9.6, 12.8, 15.5],
    [],
  )
  const contourSpur = useMemo(() => [0, 4, 8], [])
  const contourValley = useMemo(() => [0, 2.5, 5], [])

  const elvHi = elvM + 9
  const elvLo = elvM - 14
  const elvMid = elvM - 4

  return (
    <ModulePanel title="TERRAIN OVERLAY" compact>
      <div className="module-block module-block--tight">
        <KvRow k="GRID" v="S38°42′ E176°18′" />
        <KvRow k="DATUM" v="NZGD2000 · NZTM" />
        <KvRow k="DEM" v="10 m · bilinear" />
        <KvRow k="ELV" v={`${elvM} m ASL`} />
        <KvRow k="BRG" v={`${bearing}° mag`} />
        <KvRow k="SLP" v={`${slopePct.toFixed(1)} %`} />
        <KvRow k="HDOP" v={`${hdop.toFixed(2)} · σᵥ ${vAccM.toFixed(1)} m`} />
        <KvRow
          k="LOCK"
          v={active ? `DGPS · ${sats} SV` : 'cold'}
          dim={!active}
        />
      </div>
      <div className="diagram-mod diagram-mod--map">
        <svg
          className="diagram-mod__mapsvg"
          viewBox="0 0 120 86"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <pattern
              id={`${gid}-dmgrid`}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="rgba(51,255,102,0.11)"
                strokeWidth="0.45"
              />
            </pattern>
            <pattern
              id={`${gid}-dmgrid-fine`}
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 4 0 L 0 0 0 4"
                fill="none"
                stroke="rgba(51,255,102,0.06)"
                strokeWidth="0.35"
              />
            </pattern>
            <linearGradient
              id={`${gid}-hill`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#0a1810" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#050805" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0c1410" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id={`${gid}-ridge`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a6640" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#33ff88" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#228855" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          <rect width="120" height="86" fill="#040604" />
          <rect width="120" height="86" fill={`url(#${gid}-dmgrid)`} />
          <rect width="120" height="86" fill={`url(#${gid}-dmgrid-fine)`} />
          <rect width="120" height="86" fill={`url(#${gid}-hill)`} />

          {/* Data frame */}
          <rect
            x="3"
            y="3"
            width="114"
            height="68"
            fill="none"
            stroke="rgba(51,255,102,0.22)"
            strokeWidth="0.55"
            strokeDasharray="4 3"
          />
          {/* Axis ticks */}
          {[0, 30, 60, 90, 120].map((x) => (
            <line
              key={`tx-${x}`}
              x1={x}
              y1="71"
              x2={x}
              y2="73"
              stroke="rgba(160,220,180,0.35)"
              strokeWidth="0.4"
            />
          ))}
          <text
            x="6"
            y="80"
            fill="rgba(160,220,180,0.5)"
            fontSize="4.2"
            fontFamily="inherit"
          >
            0
          </text>
          <text
            x="56"
            y="80"
            fill="rgba(160,220,180,0.5)"
            fontSize="4.2"
            fontFamily="inherit"
            textAnchor="middle"
          >
            E
          </text>
          <text
            x="114"
            y="80"
            fill="rgba(160,220,180,0.5)"
            fontSize="4.2"
            fontFamily="inherit"
            textAnchor="end"
          >
            1.2km
          </text>

          {/* Valley / lower contours */}
          {contourValley.map((dy, i) => (
            <path
              key={`v-${dy}`}
              transform={`translate(0, ${dy})`}
              d={TERRAIN_VALLEY_PATH}
              fill="none"
              stroke="rgba(80, 160, 110,0.35)"
              strokeWidth="0.45"
              opacity={(active ? 0.55 : 0.2) - i * 0.08}
            />
          ))}

          {/* Spur ridges */}
          {contourSpur.map((dy, i) => (
            <path
              key={`s-${dy}`}
              transform={`translate(0, ${dy})`}
              d={TERRAIN_SPUR_PATH}
              fill="none"
              stroke="rgba(100, 220, 140,0.55)"
              strokeWidth="0.65"
              opacity={(active ? 0.75 : 0.28) - i * 0.12}
            />
          ))}

          {/* Primary ridge stack (contours) */}
          {contourRidge.map((dy, i) => (
            <path
              key={`r-${dy}`}
              transform={`translate(0, ${dy})`}
              d={TERRAIN_RIDGE_PATH}
              fill="none"
              stroke={i === 0 ? `url(#${gid}-ridge)` : active ? '#44dd77' : '#1a5530'}
              strokeWidth={i === 0 ? 1.35 : 0.75}
              opacity={(active ? 0.92 : 0.32) - i * 0.1}
            />
          ))}

          {/* Elevation callouts */}
          <text
            x="22"
            y="19"
            fill="rgba(180,255,200,0.65)"
            fontSize="4.5"
            fontFamily="inherit"
          >
            {elvHi}m
          </text>
          <text
            x="48"
            y="40"
            fill="rgba(140,200,160,0.45)"
            fontSize="4"
            fontFamily="inherit"
          >
            {elvMid}m
          </text>
          <text
            x="72"
            y="58"
            fill="rgba(120,180,140,0.4)"
            fontSize="3.8"
            fontFamily="inherit"
          >
            {elvLo}m
          </text>

          {/* Route + waypoints */}
          <path
            d={TERRAIN_ROUTE_D}
            fill="none"
            stroke="#ffcc33"
            strokeWidth="0.65"
            strokeDasharray="3.5 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? 0.82 : 0.22}
          />
          {[
            [18, 60],
            [42, 49],
            [64, 57],
            [88, 46],
            [104, 42],
          ].map(([cx, cy], i) => (
            <circle
              key={`wp-${i}`}
              cx={cx}
              cy={cy}
              r="1.6"
              fill="#0a120c"
              stroke="#ffcc44"
              strokeWidth="0.55"
              opacity={active ? 0.95 : 0.3}
            />
          ))}

          {/* Operator fix */}
          <g opacity={active ? 1 : 0.35}>
            <circle cx="78" cy="30" r="5" fill="none" stroke="#44ccff" strokeWidth="0.5" />
            <circle cx="78" cy="30" r="3.2" fill="none" stroke="#44ccff" strokeWidth="0.85" />
            <line
              x1="78"
              y1="24"
              x2="78"
              y2="36"
              stroke="#66ddff"
              strokeWidth="0.45"
            />
            <line
              x1="72"
              y1="30"
              x2="84"
              y2="30"
              stroke="#66ddff"
              strokeWidth="0.45"
            />
          </g>
          <text
            x="78"
            y="24"
            fill="rgba(120, 220, 255,0.85)"
            fontSize="3.8"
            fontFamily="inherit"
            textAnchor="middle"
          >
            FIX
          </text>

          {/* North arrow */}
          <g transform="translate(100, 10)" opacity={active ? 0.9 : 0.35}>
            <polygon
              points="0,-5 3.5,4 -3.5,4"
              fill="none"
              stroke="rgba(200,230,210,0.7)"
              strokeWidth="0.55"
            />
            <text
              x="0"
              y="-7"
              fill="rgba(200,230,210,0.65)"
              fontSize="4.5"
              fontFamily="inherit"
              textAnchor="middle"
            >
              N
            </text>
          </g>

          {/* Scale bar */}
          <g opacity={active ? 0.85 : 0.35}>
            <line
              x1="8"
              y1="76.5"
              x2="32"
              y2="76.5"
              stroke="rgba(220,240,225,0.55)"
              strokeWidth="1.1"
            />
            <line x1="8" y1="75" x2="8" y2="78" stroke="rgba(220,240,225,0.55)" strokeWidth="0.6" />
            <line
              x1="32"
              y1="75"
              x2="32"
              y2="78"
              stroke="rgba(220,240,225,0.55)"
              strokeWidth="0.6"
            />
            <text
              x="20"
              y="74"
              fill="rgba(180,210,190,0.55)"
              fontSize="3.6"
              fontFamily="inherit"
              textAnchor="middle"
            >
              500 m
            </text>
          </g>

          {/* Legend */}
          <text
            x="60"
            y="84"
            fill="rgba(120,160,140,0.45)"
            fontSize="3.5"
            fontFamily="inherit"
            textAnchor="middle"
          >
            CONTOUR 20 m · route · op fix
          </text>
        </svg>
        <div className="diagram-mod__caption diagram-mod__caption--terrain">
          LIDAR FUSE · slope {slopePct.toFixed(1)}% · BRG {bearing}°
        </div>
      </div>
    </ModulePanel>
  )
}

export function ModuleDiagramSpectral({ phase }: { phase: Phase }) {
  const [heights, setHeights] = useState(() => [...SPEC_HEIGHTS])
  const [nfDbm, setNfDbm] = useState(-94.2)
  const [binW, setBinW] = useState(30)

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeights((prev) =>
        prev.map((v) =>
          Math.min(78, Math.max(18, v + Math.floor((Math.random() - 0.5) * 14))),
        ),
      )
      setNfDbm((n) => Math.min(-88, Math.max(-99, +(n + (Math.random() - 0.5) * 0.35).toFixed(1))))
      setBinW((b) => Math.min(42, Math.max(22, b + Math.floor((Math.random() - 0.5) * 4))))
    }, 1900)
    return () => window.clearInterval(id)
  }, [])

  const peak = useMemo(() => {
    let max = 0
    let ix = 0
    heights.forEach((v, i) => {
      if (v > max) {
        max = v
        ix = i
      }
    })
    return { ix, max }
  }, [heights])

  const fMHz = (2.402 + peak.ix * 0.0015).toFixed(3)
  const binStr = String(peak.ix + 1).padStart(2, '0')

  return (
    <ModulePanel title="SPECTRAL TRACE" compact>
      <div className="module-block module-block--tight">
        <KvRow k="FFT" v="2048 · HANN" />
        <KvRow k="PEAK" v={`BIN ${binStr} · ${fMHz} MHz`} />
        <KvRow k="NF" v={`${nfDbm.toFixed(1)} dBm`} />
        <KvRow k="RBW" v={`${binW} kHz`} />
      </div>
      <div className="diagram-mod diagram-mod--spectral">
        <div className="diagram-mod__spectral-bars">
          {heights.map((pct, i) => (
            <span
              key={i}
              className={`diagram-mod__spectral-bar ${i === peak.ix ? 'diagram-mod__spectral-bar--peak' : ''}`}
              style={{
                height: `${pct * (phase === 'classified' ? 0.95 : 0.85)}%`,
                animationDelay: `${i * 35}ms`,
              }}
            />
          ))}
        </div>
        <div className="diagram-mod__caption">24 BINS · RBW {binW} kHz</div>
      </div>
    </ModulePanel>
  )
}

/* ——— Header / ticker ——— */

export function DecorativeHeader({
  phase,
  onClockRapidClick,
}: {
  phase: Phase
  onClockRapidClick: () => void
}) {
  const clock = useLiveClock()
  const banner =
    phase === 'standby'
      ? 'STANDBY'
      : phase === 'boot'
        ? 'POST'
        : phase === 'login'
          ? 'AUTH GATE'
          : phase === 'main'
            ? 'SECURE DESKTOP'
            : phase === 'classified'
              ? 'VAULT CHANNEL'
              : ''

  return (
    <div className="deco-header">
      <div className="deco-header__brand">
        <span className="deco-header__glyph">◆</span>
        <span>FIELD OPS TERMINAL</span>
        <span className="deco-header__sep">//</span>
        <span className="deco-header__node">NODE RX-7749</span>
      </div>
      <div className="deco-header__meta">
        <span className={`deco-header__badge deco-header__badge--${phase}`}>
          {banner}
        </span>
        <button
          type="button"
          className="deco-header__clock"
          onClick={onClockRapidClick}
          title="Staff reset: activate five times within 2s (PIN if configured)"
          aria-label="Local time — staff reset: five rapid activations"
        >
          {clock}
        </button>
      </div>
      <div className="deco-header__rails" aria-hidden>
        <span className="deco-header__rail" />
        <span className="deco-header__rail" />
        <span className="deco-header__rail" />
      </div>
    </div>
  )
}

export function DecorativeTicker({ phase }: { phase: Phase }) {
  const msg =
    phase === 'classified'
      ? 'VAULT ASSET UNLOCKED // VERIFY PHYSICAL HANDLING // NO EXTERNAL INTERFACE // '
      : 'NO NETWORK EGRESS // AIR-GAPPED INSTANCE // AUTHORIZED OPERATORS ONLY // '

  return (
    <div className="ticker" role="presentation">
      <div className="ticker__viewport">
        <div className="ticker__track" key={msg}>
          <span className="ticker__text">{msg}</span>
          <span className="ticker__text" aria-hidden>
            {msg}
          </span>
        </div>
      </div>
    </div>
  )
}
