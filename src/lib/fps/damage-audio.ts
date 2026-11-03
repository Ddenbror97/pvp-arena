export type DamageImpact = "body" | "armor" | "head";

/** Only the victim's confirmed damage is voiced; grenades/knife have no helmet ping. */
export function damageImpact(zone?: string, armored = false): DamageImpact {
  if (zone === "head") return "head";
  return armored && (zone === "chest" || zone === "stomach") ? "armor" : "body";
}

/** Original dry impacts: fast broadband contact, damped body thud and fabric/plate rattle.
 * Generated once on audio-context creation, never on the render or simulation loop.
 */
export function damageSamples(
  rate: number,
  kind: DamageImpact,
  variation: number,
): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.ceil(rate * 0.19));
  let seed = 7919 + variation * 104729;
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const noise = (seed >>> 0) / 2147483648 - 1;
    low += (1 - Math.exp((-2 * Math.PI * 850) / rate)) * (noise - low);
    const t = i / rate;
    const attack = Math.min(1, t / 0.0008);
    const thud = Math.sin(2 * Math.PI * (145 * t - 160 * t * t)) * Math.exp(-t * 42);
    const contact = noise * Math.exp(-t * (kind === "head" ? 95 : 145));
    const fabric = low * Math.exp(-t * 32);
    const plate =
      kind === "armor"
        ? (Math.sin(2 * Math.PI * 1730 * t) + 0.4 * Math.sin(2 * Math.PI * 2810 * t)) *
          Math.exp(-t * 75)
        : 0;
    samples[i] =
      attack *
      (0.38 * thud + (kind === "head" ? 0.62 : 0.38) * contact + 0.32 * fabric + 0.18 * plate);
  }
  return samples;
}
