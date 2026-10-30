import type { Input, MatchState, Player } from "../../../src/lib/fps/protocol";
import { eyeHeight } from "../../../src/lib/fps/map";

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
        sign = Math.sign(p.z) || -1;
        enabled = false;
      }
      if (stage === 0 && p.x > 9.25) stage = 1;
      if (stage === 1 && Math.abs(p.z - sign * 3) < 0.25) stage = 2;
      let vx = 0,
        vz = 0;
      if (stage === 0) vx = 1;
      else if (stage === 1) vz = -sign;
      else if (round === 6) vx = Math.sign(9.5 + Math.sin(now / 650) * 0.22 - p.x) * 0.28;
      const dx = target.x - p.x,
        dz = target.z - p.z,
        distance = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dx, -dz) + (enabled && round !== 4 ? 0.6 : 0);
      const pitch = Math.atan2(target.y + 0.9 - (p.y + eyeHeight(p)), distance);
      return {
        v: 1,
        type: "input",
        seq: ++seq,
        forward: -Math.sin(yaw) * vx - Math.cos(yaw) * vz,
        strafe: Math.cos(yaw) * vx - Math.sin(yaw) * vz,
        yaw,
        pitch,
        weapon: round === 5 ? "pistol" : "rifle",
        reload: p.ammo === 0,
        fire: enabled && stage === 2,
        jump: round === 3 && stage === 2 && now % 1700 < 60,
        sprint: false,
        crouch: round === 2 && stage === 2,
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
