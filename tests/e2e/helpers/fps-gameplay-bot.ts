import type { Input, MatchState, Player } from "../../../src/lib/fps/protocol";
import { eyeHeight } from "../../../src/lib/fps/map";

/** Aim-arena main lane from the west spawn (x mirrored for the east spawn). */
export const BOT_LANE = [
  { x: -14.9, z: 2.5 },
  { x: -12.6, z: 2.5 },
  { x: -11.8, z: 0.6 },
  { x: -7, z: -0.6 },
  { x: -3, z: -2.4 },
];

/** Test transport only. This bot never writes health, transforms, ammo, score or phase. */
export function createGameplayBot() {
  let round = 0,
    stage = 0,
    sign = 1,
    seq = 0,
    enabled = false;
  return {
    arm(value: boolean) {
      enabled = value;
    },
    input(state: MatchState, now: number): Input {
      const p = state.players.B,
        target = state.players.A;
      if (round !== state.round) {
        round = state.round;
        stage = 0;
        sign = p.x < 0 ? 1 : -1;
        enabled = false;
      }
      // Walk the mirrored main lane to the centre corner (stage = waypoint index; the final
      // stage holds and fights).
      const lane = BOT_LANE.map((w) => ({ x: w.x * sign, z: w.z }));
      while (stage < lane.length && Math.hypot(lane[stage]!.x - p.x, lane[stage]!.z - p.z) < 0.25)
        stage++;
      const holding = stage >= lane.length;
      let vx = 0,
        vz = 0;
      if (!holding) {
        const w = lane[stage]!,
          d = Math.hypot(w.x - p.x, w.z - p.z) || 1;
        vx = (w.x - p.x) / d;
        vz = (w.z - p.z) / d;
      } else if (round === 6)
        vx = Math.sign(lane.at(-1)!.x + Math.sin(now / 650) * 0.22 - p.x) * 0.28;
      const dx = target.x - p.x,
        dz = target.z - p.z,
        distance = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dx, -dz) + (enabled && round !== 4 ? 0.6 : 0) - (p.recoilYaw ?? 0);
      const pitch =
        Math.atan2(target.y + 0.9 - (p.y + eyeHeight(p)), distance) - (p.recoilPitch ?? 0);
      return {
        v: 1,
        type: "input",
        combatVersion: 2,
        seq: ++seq,
        forward: -Math.sin(yaw) * vx - Math.cos(yaw) * vz,
        strafe: Math.cos(yaw) * vx - Math.sin(yaw) * vz,
        yaw,
        pitch,
        weapon: round === 5 ? "pistol" : "rifle",
        reload: p.ammo === 0,
        fire: enabled && holding && (round !== 5 || now % 360 < 150),
        jump: round === 3 && holding && now % 1700 < 60,
        sprint: false,
        crouch: round === 2 && holding,
      };
    },
  };
}

export type GameplayAudit = {
  damage: { round: number; seat: string; before: number; after: number; events: string[] }[];
  rounds: { round: number; winner: string | undefined; score: { A: number; B: number } }[];
  resets: { round: number; players: Record<string, Player> }[];
  positions: { round: number; at: number; players: Record<string, Player> }[];
  violations: string[];
};
