import type { Team } from "./rules";
/** Keep teammates audible at 40% gain; preserve own/enemy steps and all spatial cues. */
export function bombStepGain(
  gain: number,
  own: boolean,
  actor: Team | undefined,
  mine: Team,
  soft = false,
) {
  return gain * (soft ? 0.15 : 1) * (!own && actor === mine ? 0.4 : 1);
}
