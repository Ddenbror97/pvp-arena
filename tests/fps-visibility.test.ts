import { describe, it, expect } from "vitest";
import { createMatch } from "../src/lib/fps/simulation";
import { canSeeOpponent, snapshotForPlayer } from "../src/lib/fps/visibility";
function live() {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  s.phase = "live";
  return s;
}
describe("authoritative opponent visibility", () => {
  it("redacts a live opponent behind solid cover without changing the simulation", () => {
    const s = live(),
      before = structuredClone(s),
      a = snapshotForPlayer({ state: s }, "A"),
      b = snapshotForPlayer({ state: s }, "B");
    expect(a.visibility).toEqual({ A: true, B: false });
    expect(b.visibility).toEqual({ A: false, B: true });
    expect(a.state.players.B.x).toBe(0);
    expect(a.state.players.B.z).toBe(0);
    expect(a.state.players.A).toEqual(s.players.A);
    expect(b.state.players.B).toEqual(s.players.B);
    expect(s).toEqual(before);
  });
  it("reveals standing and crouched targets down an unobstructed lane", () => {
    const s = live();
    Object.assign(s.players.A, { x: 9, z: 3 });
    Object.assign(s.players.B, { x: 9, z: -3 });
    for (const crouched of [false, true]) {
      s.players.B.crouched = crouched;
      expect(canSeeOpponent(s, "A")).toBe(true);
      expect(snapshotForPlayer({ state: s }, "A").state.players.B).toEqual(s.players.B);
    }
  });
  it("does not reveal targets on the far side of a container", () => {
    const s = live();
    Object.assign(s.players.A, { x: 5, z: 5 });
    Object.assign(s.players.B, { x: 5, z: -5 });
    expect(canSeeOpponent(s, "A")).toBe(false);
    expect(canSeeOpponent(s, "B")).toBe(false);
  });
  it("allows a head exposed over low cover while hiding a crouched target", () => {
    const s = live();
    Object.assign(s.players.A, { x: 2.6, z: 4 });
    Object.assign(s.players.B, { x: 2.6, z: 0 });
    expect(canSeeOpponent(s, "A")).toBe(true);
    s.players.B.crouched = true;
    expect(canSeeOpponent(s, "A")).toBe(false);
  });
  it("keeps completed results visible and never copies private server state into the projection", () => {
    const s = live();
    s.phase = "completed";
    expect(canSeeOpponent(s, "A")).toBe(true);
    const { server: _, ...publicState } = s;
    expect(snapshotForPlayer({ state: publicState }, "A").state).not.toHaveProperty("server");
  });
});
