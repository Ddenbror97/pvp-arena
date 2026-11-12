/**
 * The waves' loop (s) and where in it a wave comes in (two a loop, `WAVES_SWELL_S` apart): the
 * water's shader runs the wash on the shore on the same clock (water.ts), and br-audio.ts starts
 * the loop at that clock's place in it, so the sound of a wave
 * arriving and the foam coming up the bank go together.
 */
export const WAVES_LOOP_S = 16;
export const WAVES_SWELL_S = 8;
export const WAVES_SWELL_AT_S = 2;
/** The water's clock (s): water.ts's uTime and the waves' loop both read it. */
export const waterClock = () => (performance.now() / 1000) % 3600;
