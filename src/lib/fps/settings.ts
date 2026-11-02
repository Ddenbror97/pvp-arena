/**
 * Player settings. Rendering has one configuration (see RENDER_CAP in presentation.ts); a
 * stored `graphics` value from the former High/Low choice is ignored.
 */
export type StrikeSettings = {
  sensitivity: number;
  volume: number;
  crosshair: number;
  color: string;
  /** Smaller viewmodel camera choreography and weapon bob (also follows the OS setting). */
  reducedMotion: boolean;
};
export const DEFAULT_STRIKE_SETTINGS: StrikeSettings = {
  sensitivity: 1,
  volume: 1,
  crosshair: 0,
  color: "#ffffff",
  reducedMotion: false,
};
export function readStrikeSettings(): StrikeSettings {
  try {
    const value = JSON.parse(localStorage.getItem("strike-settings") ?? "{}");
    return {
      sensitivity: Number.isFinite(value?.sensitivity)
        ? Math.max(0.1, Math.min(3, value.sensitivity))
        : 1,
      volume: Number.isFinite(value?.volume) ? Math.max(0, Math.min(1, value.volume)) : 1,
      crosshair:
        Number.isInteger(value?.crosshair) && value.crosshair >= 0 && value.crosshair < 5
          ? value.crosshair
          : 0,
      color: /^#[0-9a-f]{6}$/i.test(value?.color) ? value.color : "#ffffff",
      reducedMotion: value?.reducedMotion === true,
    };
  } catch {
    return { ...DEFAULT_STRIKE_SETTINGS };
  }
}
export function saveStrikeSettings(value: StrikeSettings) {
  try {
    localStorage.setItem("strike-settings", JSON.stringify(value));
  } catch {
    /* Storage may be blocked. */
  }
}
