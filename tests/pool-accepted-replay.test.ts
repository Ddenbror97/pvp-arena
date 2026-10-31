import { describe, it, expect } from "vitest";
import { freshTable, stateHash } from "../src/lib/pool/rules";
import { playShot, recordAcceptedShot } from "../src/lib/pool/play";
import { PHYSICS_V7, PHYSICS_V8 } from "../src/lib/pool/physics";

describe("confirmed opponent-shot presentation", () => {
  for (const physics of [PHYSICS_V7, PHYSICS_V8]) {
    it(`uses the accepted hash and hands the completed break to the next player (${physics})`, () => {
      const table = freshTable(new Uint8Array(32).fill(42), physics);
      const before = stateHash(table);
      const input = {
        angleMilli: 359653,
        power: 6800,
        spinX: 0,
        spinY: 0,
        placeX: 635000,
        placeY: 635000,
      };
      const accepted = playShot(table, input);
      expect(accepted.ok).toBe(true);
      if (!accepted.ok) throw Error(accepted.error);
      const replay = recordAcceptedShot(table, input, accepted.hash);
      expect(replay?.hash).toBe(accepted.hash);
      expect(replay?.state.turn).toBe(accepted.state.turn);
      expect(replay?.sequence.at(-1)).toEqual(accepted.state.balls);
      expect(stateHash(table)).toBe(before);
      expect(recordAcceptedShot(table, input, "wrong-server-hash")).toBeNull();
    });
  }
});
