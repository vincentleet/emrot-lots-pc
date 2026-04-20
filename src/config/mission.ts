/**
 * Operator / build-time configuration (Vite env).
 *
 * VITE_LOGIN_PASSWORD — session login (default dieanotherday)
 * VITE_SECURE_CHANNELS — three comma-separated integers 0–9 for the secure-channel dials (e.g. 7,2,4)
 * VITE_DIAGRAM_PATH — path under public/ (default /mission/diagram.png)
 * VITE_WAKE_SKIPS_BOOT — "true" = standby wakes straight to login
 * VITE_RESET_TARGET — standby | boot | login | main (where staff reset lands)
 * VITE_STAFF_PIN — optional; if set, staff must enter PIN after five rapid clock clicks before reset runs
 * VITE_WAKE_KEY — single letter a–z; only this key exits standby (default w)
 * VITE_CRYPTO_ROTATE_MINUTES — decorative side-panel crypto digest rotates every N minutes (default 5)
 */

import type { Phase } from '../phase'

export type ResetTarget = Extract<Phase, 'standby' | 'boot' | 'login' | 'main'>

function parseResetTarget(raw: string | undefined): ResetTarget {
  const v = (raw ?? 'standby').toLowerCase().trim()
  if (v === 'standby' || v === 'boot' || v === 'login' || v === 'main') return v
  return 'standby'
}

/** Parse "7,2,4" → [7,2,4], each clamped 0–9 */
export function parseSecureChannels(raw: string | undefined): [number, number, number] {
  const fallback = '7,2,4'
  const parts = (raw ?? fallback).split(',').map((s) => parseInt(s.trim(), 10))
  const a = Number.isFinite(parts[0]) ? clampDigit(parts[0]) : 7
  const b = Number.isFinite(parts[1]) ? clampDigit(parts[1]) : 2
  const c = Number.isFinite(parts[2]) ? clampDigit(parts[2]) : 4
  return [a, b, c]
}

function clampDigit(n: number): number {
  return Math.max(0, Math.min(9, n))
}

/** Vite inlines env at build time; empty `VITE_LOGIN_PASSWORD=` becomes "" — `??` does not fall back for "". */
function envLoginPassword(): string {
  const v = import.meta.env.VITE_LOGIN_PASSWORD
  if (v === undefined || v === null) return 'dieanotherday'
  const s = String(v).trim()
  return s === '' ? 'dieanotherday' : s
}

/** Single a–z letter required to leave standby; default w */
function envWakeKey(): string {
  const v = import.meta.env.VITE_WAKE_KEY
  const raw =
    v === undefined || v === null || String(v).trim() === ''
      ? 'w'
      : String(v).trim().charAt(0)
  const ch = raw.toLowerCase()
  return /^[a-z]$/.test(ch) ? ch : 'w'
}

/** Decorative crypto block rotation interval (minutes), clamped 1–120 */
function envCryptoRotateMinutes(): number {
  const v = import.meta.env.VITE_CRYPTO_ROTATE_MINUTES
  const n = parseInt(String(v ?? '5').trim(), 10)
  if (!Number.isFinite(n)) return 5
  return Math.max(1, Math.min(120, n))
}

export function getMissionConfig() {
  return {
    loginPassword: envLoginPassword(),
    wakeKey: envWakeKey(),
    secureChannels: parseSecureChannels(import.meta.env.VITE_SECURE_CHANNELS),
    diagramPath: import.meta.env.VITE_DIAGRAM_PATH ?? '/mission/diagram.png',
    wakeSkipsBoot: import.meta.env.VITE_WAKE_SKIPS_BOOT === 'true',
    resetTarget: parseResetTarget(import.meta.env.VITE_RESET_TARGET),
    staffPin: (import.meta.env.VITE_STAFF_PIN ?? '').trim(),
    cryptoRotateMinutes: envCryptoRotateMinutes(),
  } as const
}
