import { describe, expect, it } from "vitest";
import { simulate } from "../src/lib/pool/physics";
import { confirmedWinner, playShot } from "../src/lib/pool/play";
import { freshTable, seedHash, stateHash } from "../src/lib/pool/rules";
import { replayMatch } from "../src/lib/pool/verify";

const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 1);

function breakShot() {
  const table = freshTable(seed);
  const cue = table.balls.find((ball) => ball.id === 0);
  if (!cue) throw new Error("missing cue");
  return {
    table,
    shot: {
      angleMilli: 0,
      power: 7000,
      spinX: 120,
      spinY: -80,
      placeX: cue.x,
      placeY: cue.y,
      calledPocket: null,
    },
  };
}

describe("pool replay", () => {
  it("confirms a break and rejects one changed input", async () => {
    const { table, shot } = breakShot();
    const played = playShot(table, shot);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const published = await seedHash(seed);
    const steps = [{ kind: "shot" as const, input: shot, hash: played.hash }];
    const replay = await replayMatch(seed, published, steps);
    expect(replay.ok).toBe(true);
    expect(replay.seedOk).toBe(true);
    expect(replay.finalHash).toBe(played.hash);
    expect(replay.winner).toBe(played.state.winner);

    const confirmed = await confirmedWinner(seed, published, steps);
    expect(confirmed.ok).toBe(true);

    const tampered = await replayMatch(seed, published, [
      { kind: "shot", input: { ...shot, power: shot.power - 1 }, hash: played.hash },
    ]);
    expect(tampered.ok).toBe(false);
    expect(tampered.finalHash).not.toBe(played.hash);

    const wrongHash = await replayMatch(seed, published, [
      { kind: "shot", input: shot, hash: "0".repeat(16) },
    ]);
    expect(wrongHash.ok).toBe(false);

    const wrongSeed = await replayMatch(seed, "ab".repeat(32), steps);
    expect(wrongSeed.seedOk).toBe(false);
    expect(wrongSeed.ok).toBe(false);
  });

  it("keeps the 8 in the centre slot for every seed byte", () => {
    for (let i = 0; i < 32; i++) {
      const rack = freshTable(Uint8Array.from({ length: 32 }, () => i));
      const eight = rack.balls.find((ball) => ball.id === 8);
      expect(eight?.pocketed).toBe(false);
      expect(rack.balls).toHaveLength(16);
      expect(new Set(rack.balls.map((ball) => ball.id)).size).toBe(16);
    }
  });

  it("simulates a full-rack break quickly enough to stay inside a shot", () => {
    const { table, shot } = breakShot();
    const runs = 20;
    const started = performance.now();
    let sim = simulate(table.balls, shot, false);
    for (let i = 1; i < runs; i++) sim = simulate(table.balls, shot, i === runs - 1);
    const ms = (performance.now() - started) / runs;
    expect(sim.balls).toHaveLength(16);
    expect(sim.frames.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(50);
    expect(stateHash(table)).toBe(stateHash(freshTable(seed)));
  });
});
