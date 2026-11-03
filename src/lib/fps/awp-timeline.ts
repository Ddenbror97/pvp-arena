import { AWP } from "./primary";

/**
 * AWP first-person timing (milliseconds), shared by the animation (awp-animation.ts) and the
 * sound build (scripts/fps/build-awp-audio.mjs), so every click lands on its frame. The server
 * owns the clocks these are played against: `lastShotAt` (bolt cycle, 1.463 s) and
 * `reloadUntil` (3.67 s).
 */
export const AWP_TIMELINE = {
  cycleMs: AWP.cycleMs,
  reloadMs: AWP.reloadMs,
  /** Bolt cycle after a shot. The right hand leaves the grip, works the bolt and returns. */
  bolt: {
    recoilEnd: 140,
    handToBolt: [170, 420],
    lift: [420, 520],
    back: [520, 700],
    /** The spent case leaves the port as the bolt reaches its rearmost point. */
    eject: 650,
    forward: [700, 880],
    lower: [880, 980],
    handToGrip: [990, 1290],
  },
  /** Magazine reload with a round still chambered. */
  tactical: {
    lower: [0, 350],
    handToMag: [350, 650],
    release: 650,
    magOut: [650, 1000],
    away: [1000, 1900],
    insert: [1900, 2350],
    seat: 2350,
    tap: [2350, 2650],
    handToGuard: [2650, 3200],
    settle: [3200, 3670],
  },
  /** Empty reload: magazine change, then the right hand cycles the bolt to chamber a round. */
  empty: {
    lower: [0, 300],
    handToMag: [300, 550],
    release: 550,
    magOut: [550, 900],
    away: [900, 1650],
    insert: [1650, 1950],
    seat: 1950,
    handToGuard: [1950, 2350],
    handToBolt: [2200, 2450],
    lift: [2450, 2550],
    back: [2550, 2720],
    forward: [2720, 2880],
    lower2: [2880, 2970],
    handToGrip: [2970, 3300],
    settle: [3300, 3670],
  },
  /** Zoom in / out transition (client only; the server's scope settle is AWP.scopeSettleMs). */
  adsMs: 260,
  /** Drawing the AWP (buy or weapon switch), cosmetic. */
  equipMs: 950,
  inspectMs: 4200,
} as const;
