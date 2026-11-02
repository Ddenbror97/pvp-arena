import type { FootstepSurface } from "./footstep-surfaces";

/** Positive yaw looks left in the simulation. Stereo pan is positive on the right. */
export function footstepPan(bearing: number, listenerYaw: number): number {
  return Math.max(-1, Math.min(1, Math.sin(bearing + listenerYaw)));
}

/** Bake distinct boot/sole responses once at decode time, never in the render loop.
 * Keep the recorded impact/grit, with a damped wood cavity or metal plate resonance.
 */
export function materialFootstep(
  source: Float32Array,
  rate: number,
  surface: FootstepSurface,
): Float32Array<ArrayBuffer> {
  if (surface === "concrete") return source.slice();
  const output = new Float32Array(source.length);
  let seed = 0x91e10da5;
  let low = 0,
    peak = 0;
  const wood = surface === "wood";
  for (let i = 0; i < source.length; i++) {
    const t = i / rate;
    low +=
      (source[i]! - low) *
      (surface === "snow" ? 0.06 : surface === "dirt" ? 0.15 : wood ? 0.2 : 0.65);
    if (surface === "snow" || surface === "dirt") {
      // Absorptive snow crunch / soil scuff: no tonal hard-surface ring.
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain =
        (seed / 2 ** 31 - 1) *
        Math.exp(-t * (surface === "snow" ? 17 : 30)) *
        Math.min(1, t / 0.004);
      output[i] =
        low * (surface === "snow" ? 0.65 : 0.9) + grain * (surface === "snow" ? 0.14 : 0.055);
      peak = Math.max(peak, Math.abs(output[i]!));
      continue;
    }
    const resonance = wood
      ? (Math.sin(t * 2 * Math.PI * 155) + 0.45 * Math.sin(t * 2 * Math.PI * 285)) *
        Math.exp(-t * 30)
      : (Math.sin(t * 2 * Math.PI * 740) +
          0.6 * Math.sin(t * 2 * Math.PI * 1373) +
          0.3 * Math.sin(t * 2 * Math.PI * 2249)) *
        Math.exp(-t * 21);
    output[i] = (wood ? low * 1.15 : source[i]! * 0.7) + resonance * 0.17 * Math.min(1, t / 0.002);
    peak = Math.max(peak, Math.abs(output[i]!));
  }
  if (peak > 0.9) for (let i = 0; i < output.length; i++) output[i]! *= 0.9 / peak;
  return output;
}
