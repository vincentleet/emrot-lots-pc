export function channelsMatch(
  current: readonly [number, number, number],
  target: readonly [number, number, number],
): boolean {
  return current[0] === target[0] && current[1] === target[1] && current[2] === target[2]
}

/** Per-dial hint without revealing the target digit */
export type DialHint = 'match' | 'higher' | 'lower'

export type ChannelFeedback = {
  /** How many dials exactly match the schedule */
  exactCount: number
  /** Sum of absolute errors (max 27 for 0–9 dials) */
  manhattanSum: number
  /** 0 = worst tested combo, 100 = solved (or use as “signal strength”) */
  coherencePercent: number
  hints: readonly [DialHint, DialHint, DialHint]
}

const MAX_MANHATTAN = 27

/**
 * Feedback after a failed uplink attempt: count of exact channels, overall
 * “closeness”, and whether each wrong dial needs to go higher or lower.
 */
export function getChannelFeedback(
  current: readonly [number, number, number],
  target: readonly [number, number, number],
): ChannelFeedback {
  let exactCount = 0
  let manhattanSum = 0
  const hints: [DialHint, DialHint, DialHint] = ['match', 'match', 'match']

  for (let i = 0; i < 3; i++) {
    const c = current[i]
    const t = target[i]
    if (c === t) {
      exactCount++
      hints[i] = 'match'
    } else {
      manhattanSum += Math.abs(c - t)
      hints[i] = c < t ? 'higher' : 'lower'
    }
  }

  const coherencePercent = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - manhattanSum / MAX_MANHATTAN))),
  )

  return { exactCount, manhattanSum, coherencePercent, hints }
}
