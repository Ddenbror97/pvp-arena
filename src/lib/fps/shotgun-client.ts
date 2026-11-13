import { SPAS12 } from "./primary";
import { SPAS12_RELOAD, spas12ClipTime } from "./spas12-animation";

/**
 * The SPAS-12's shell-by-shell reload on a client (1v1 / 5v5; the battle royale has its own
 * stage source, the kit view): where the server's stage puts the first-person clip, and when
 * each of its sounds lands. Pure, so both renderers and the audio share one timing.
 */

/**
 * The reload's cues in br-spas12-reload-v1.wav (scripts/fps/build-br-spas12-audio.mjs): six in
 * 0.42 s slots after a 0.05 s lead-in: the gun rolled over, four shells, the bolt running home.
 */
export const SPAS12_CUES = {
  pad: 0.05,
  slot: 0.42,
  start: 0,
  shells: [1, 2, 3, 4],
  bolt: 5,
} as const;
/** From a shell cue's start to its click, and from the bolt cue's start to its hit (ms). */
export const SPAS12_CUE_LEAD_MS = { shell: 50, bolt: 70 } as const;

export type ShellCue = "start" | "shell" | "bolt";
type Stage = 0 | 1 | 2;
const stageMs = (stage: Stage) =>
  stage === 0 ? SPAS12.shells.startMs : stage === 1 ? SPAS12.shells.insertMs : SPAS12.shells.endMs;

/** The first-person clip time (0 at rest) for a stage ending at `until`, server clock. */
export function shellReloadClip(stage: Stage | undefined, until: number, serverNow: number) {
  if (stage === undefined || !until) return 0;
  const ms = stageMs(stage);
  return spas12ClipTime(stage, Math.min(1, Math.max(0, 1 - (until - serverNow) / ms)));
}

/**
 * The sound a stage makes and how long after `serverNow` it starts (ms; never negative): the
 * roll-over as the reload begins, a shell's click as the rim passes the shell stop, and on an
 * empty gun the bolt running home in the end stage. Null: this stage is silent.
 */
export function shellReloadCue(
  stage: Stage,
  empty: boolean,
  until: number,
  serverNow: number,
): { cue: ShellCue; delayMs: number } | null {
  const ms = stageMs(stage),
    from = until - ms;
  const at =
    stage === 0
      ? from
      : stage === 1
        ? from + SPAS12_RELOAD.seatAt * ms - SPAS12_CUE_LEAD_MS.shell
        : empty
          ? from + SPAS12_RELOAD.boltHomeAt * ms - SPAS12_CUE_LEAD_MS.bolt
          : null;
  if (at === null) return null;
  return {
    cue: stage === 0 ? "start" : stage === 1 ? "shell" : "bolt",
    delayMs: Math.max(0, at - serverNow),
  };
}
