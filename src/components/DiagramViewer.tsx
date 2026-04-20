import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { terminalAudio } from '../audio/terminalAudio'

/** Noise burst → fade to black → black hold → spotlight “light” reveals diagram (see SpotlightStage). */
const STATIC_MS = 1500
/** Full black over static + CRT stack (must match `.diagram__intro-blackout` animation duration). */
const FADE_TO_BLACK_MS = 750
/** Radial “light” radius grows at cursor, then live tracking. */
const RADIUS_GROW_MS = 900
/** Brief beat after black before uniform sheet + diagram (ms; 0 = next task). */
const SPOTLIGHT_DELAY_AFTER_READY_MS = 0

type IntroPhase = 'static' | 'fadeToBlack' | 'ready'

/** idle: black, diagram not mounted · radiusGrow: dim base + bright core animates in · live */
type SpotlightStage = 'idle' | 'radiusGrow' | 'live'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Props = {
  src: string
  title?: string
}

/** Root `#root` uses `transform: scale(--ui-scale)`; pointer/rect are in viewport px, gradient `at` is in element local px — divide by scale. */
function readUiScale(): number {
  if (typeof window === 'undefined') return 1
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-scale')
    .trim()
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function DiagramViewer({ src, title = 'CLASSIFIED DIAGRAM' }: Props) {
  const [broken, setBroken] = useState(false)
  /** Base `<img>` finished load — defer lit duplicate to avoid parallel decode of the same huge PNG. */
  const [baseDecoded, setBaseDecoded] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const staticLoopRef = useRef<number>(0)
  /** Spotlight center in local px (matches `radial-gradient` `at`; viewport deltas ÷ `--ui-scale` because `#root` is scaled). */
  const [spotPx, setSpotPx] = useState<{ x: number; y: number } | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const playedRef = useRef(false)
  const [intro, setIntro] = useState<IntroPhase>(() =>
    prefersReducedMotion() ? 'ready' : 'static',
  )
  const [spotlightStage, setSpotlightStage] = useState<SpotlightStage>(() =>
    prefersReducedMotion() ? 'live' : 'idle',
  )
  const stampedRef = useRef(false)

  useEffect(() => {
    setBroken(false)
    setBaseDecoded(false)
    setIntro(prefersReducedMotion() ? 'ready' : 'static')
    setSpotlightStage(prefersReducedMotion() ? 'live' : 'idle')
    setSpotPx(null)
    stampedRef.current = false
    playedRef.current = false
  }, [src])

  /** Map viewport coords to overlay-local px (same box as `.diagram__spotlight` inset:0). */
  const syncSpotFromClient = useCallback((clientX: number, clientY: number) => {
    const el = captureRef.current
    if (!el) return
    const s = readUiScale()
    const r = el.getBoundingClientRect()
    const w = r.width / s
    const h = r.height / s
    const x = (clientX - r.left) / s
    const y = (clientY - r.top) / s
    setSpotPx({
      x: Math.max(0, Math.min(w, x)),
      y: Math.max(0, Math.min(h, y)),
    })
  }, [])

  const updatePos = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, playTick: boolean) => {
      syncSpotFromClient(e.clientX, e.clientY)
      if (playTick && !playedRef.current) {
        playedRef.current = true
        terminalAudio.playTick()
      }
    },
    [syncSpotFromClient],
  )

  const onPointerMoveCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (intro !== 'ready') return
    updatePos(e, true)
  }

  const onPointerEnterCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (intro !== 'ready') return
    updatePos(e, true)
  }

  /** Seed spotlight center once when the capture layer first lays out (do not reset on spotlight stage changes). */
  useLayoutEffect(() => {
    if (intro !== 'ready' || broken) return
    const el = captureRef.current
    if (!el) return
    setSpotPx((prev) => {
      if (prev !== null) return prev
      const s = readUiScale()
      const r = el.getBoundingClientRect()
      return { x: r.width / (2 * s), y: r.height / (2 * s) }
    })
  }, [intro, broken])

  /** Track pointer vs overlay while the diagram is up (same math as on the capture layer). */
  useEffect(() => {
    if (intro !== 'ready' || broken) return
    const onWinMove = (e: PointerEvent) => {
      syncSpotFromClient(e.clientX, e.clientY)
    }
    window.addEventListener('pointermove', onWinMove, { passive: true })
    return () => window.removeEventListener('pointermove', onWinMove)
  }, [intro, broken, syncSpotFromClient])

  useEffect(() => {
    if (intro !== 'ready' || broken) return
    let t1: ReturnType<typeof setTimeout> | undefined
    const t0 = window.setTimeout(() => {
      if (prefersReducedMotion()) {
        setSpotlightStage('live')
        return
      }
      setSpotlightStage('radiusGrow')
      t1 = window.setTimeout(() => setSpotlightStage('live'), RADIUS_GROW_MS)
    }, SPOTLIGHT_DELAY_AFTER_READY_MS)
    return () => {
      window.clearTimeout(t0)
      if (t1 !== undefined) window.clearTimeout(t1)
    }
  }, [intro, broken])

  useEffect(() => {
    if (intro !== 'static') return
    const t = window.setTimeout(() => setIntro('fadeToBlack'), STATIC_MS)
    return () => window.clearTimeout(t)
  }, [intro])

  useEffect(() => {
    if (intro !== 'fadeToBlack') return
    const t = window.setTimeout(() => setIntro('ready'), FADE_TO_BLACK_MS)
    return () => window.clearTimeout(t)
  }, [intro])

  useEffect(() => {
    if (intro === 'ready' && !stampedRef.current) {
      stampedRef.current = true
      terminalAudio.playStamp()
    }
  }, [intro])

  useEffect(() => {
    if (intro !== 'static' && intro !== 'fadeToBlack') {
      if (staticLoopRef.current) {
        cancelAnimationFrame(staticLoopRef.current)
        staticLoopRef.current = 0
      }
      return
    }

    const canvas = staticCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const r = parent.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(r.width))
      canvas.height = Math.max(1, Math.floor(r.height))
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    const tick = () => {
      const w = canvas.width
      const h = canvas.height
      const imageData = ctx.createImageData(w, h)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const n = Math.random() * 255
        d[i] = n * 0.12 + Math.random() * 30
        d[i + 1] = n * 0.75 + Math.random() * 40
        d[i + 2] = n * 0.18 + Math.random() * 25
        d[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)

      if (intro === 'static' || intro === 'fadeToBlack') {
        staticLoopRef.current = requestAnimationFrame(tick)
      }
    }

    staticLoopRef.current = requestAnimationFrame(tick)
    return () => {
      ro.disconnect()
      if (staticLoopRef.current) cancelAnimationFrame(staticLoopRef.current)
    }
  }, [intro])

  const spotlightStyle = (
    spotPx
      ? {
          '--mx': `${spotPx.x}px`,
          '--my': `${spotPx.y}px`,
        }
      : {}
  ) as CSSProperties

  /**
   * Invisible in-flow image during static / fade / idle so the frame matches the bomb PNG’s box.
   * Dim base only once the spotlight leaves idle (reduced motion skips idle).
   */
  const isLayoutOnlyBase =
    !broken &&
    (intro === 'static' ||
      intro === 'fadeToBlack' ||
      (intro === 'ready' && !prefersReducedMotion() && spotlightStage === 'idle'))

  /** Lit duplicate decodes after base (saves memory); reduced-motion skips idle so show lit immediately. */
  const showLitDuplicate =
    intro === 'ready' &&
    (prefersReducedMotion() || baseDecoded) &&
    (spotlightStage === 'radiusGrow' || spotlightStage === 'live')

  const frameClass =
    `diagram__frame diagram__frame--reveal${intro === 'ready' ? ' diagram__frame--reveal-ready' : ''}`

  return (
    <div className="diagram">
      <header className="diagram__bar">
        <span>{title}</span>
        {intro !== 'ready' && (
          <span className="diagram__bar-tag" aria-hidden>
            UPLINK · DECODING
          </span>
        )}
      </header>

      <div
        ref={frameRef}
        className={frameClass}
        role="region"
        aria-label={
          intro === 'ready'
            ? 'Classified diagram; move the pointer — the scan circle stays bright, edges dim'
            : 'Establishing secure video channel'
        }
      >
        {broken ? (
          <p className="diagram__missing">
            Could not load diagram at <code>{src}</code>. Add <code>public/mission/diagram.png</code>, commit,
            redeploy, and hard-refresh. If the URL works in a new tab but fails here, the PNG may be too large for
            this device to decode — try exporting under ~2000px wide.
          </p>
        ) : (
          <>
            <img
              key={`diagram-base:${src}`}
              src={src}
              alt=""
              decoding="async"
              aria-hidden={isLayoutOnlyBase ? true : undefined}
              className={`diagram__img diagram__img--full ${isLayoutOnlyBase ? 'diagram__img--layout-sizer' : 'diagram__img--dim'}`}
              onLoad={() => setBaseDecoded(true)}
              onError={() => {
                setBroken(true)
                setIntro('ready')
              }}
              draggable={false}
            />
            {showLitDuplicate && (
                <div
                  className={`diagram__img-lit-shell ${spotlightStage === 'radiusGrow' ? 'diagram__spotlight--grow' : ''}`}
                  style={spotlightStyle}
                  aria-hidden
                >
                  <img
                    key={`diagram-lit:${src}`}
                    src={src}
                    alt=""
                    decoding="async"
                    className="diagram__img-lit-inner"
                    onError={() => {
                      setBroken(true)
                      setIntro('ready')
                    }}
                    draggable={false}
                  />
                </div>
              )}
          </>
        )}

        {intro === 'ready' && !broken && (
          <div
            ref={captureRef}
            className="diagram__pointer-capture"
            onPointerEnter={onPointerEnterCapture}
            onPointerMove={onPointerMoveCapture}
            aria-hidden
          />
        )}

        {intro === 'ready' &&
          !broken &&
          (spotlightStage === 'radiusGrow' || spotlightStage === 'live') && (
            <div
              className={`diagram__spotlight ${spotlightStage === 'radiusGrow' ? 'diagram__spotlight--grow' : ''}`}
              style={spotlightStyle}
              aria-hidden
            />
          )}

        {(intro === 'static' || intro === 'fadeToBlack') && !broken && (
          <div className="diagram__intro-stack" aria-hidden>
            <canvas ref={staticCanvasRef} className="diagram__static-canvas" />
            <div className="diagram__intro-vhs" />
            <div className="diagram__intro-scan" />
            {intro === 'fadeToBlack' && (
              <div className="diagram__intro-blackout" aria-hidden />
            )}
          </div>
        )}
      </div>

      <p className="diagram__footer">
        {intro === 'ready'
          ? spotlightStage === 'idle'
            ? 'Channel black — standby for scan…'
            : spotlightStage === 'radiusGrow'
              ? 'Opening scan radius…'
              : 'ACTIVE · POINTER-LOCKED ROI · PERIPHERAL VIGNETTE · EDGE LUMINANCE SUPPRESSED'
          : intro === 'fadeToBlack'
            ? 'Carrier lost — fading to black…'
            : 'Carrier locked — clearing interference…'}
      </p>
    </div>
  )
}
