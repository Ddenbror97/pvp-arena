/** Cosmetic correction only; collision, fuse and damage stay on the server's clock. */
export function flightCorrectionDecay(
  distance: number,
  speed: number,
  dt: number,
  resting: boolean,
) {
  // A fixed 90 ms decay can move a late-confirmed grenade backwards faster than it flies.
  // While airborne, spend at most 35% of flight speed closing the visual discrepancy.
  const seconds = resting ? 0.09 : Math.max(0.12, distance / (Math.max(0.05, speed) * 0.35));
  return Math.exp(-Math.max(0, Math.min(0.1, dt)) / seconds);
}
