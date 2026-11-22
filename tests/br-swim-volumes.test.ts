import { describe, expect, it } from "vitest";
import { PoseHistory } from "@/lib/fps/br/combat";
import { combatVolumes, SWIM_VOLUME } from "@/lib/fps/player-volumes";
import { SWIM_EYE } from "@/lib/fps/swim-stroke";

describe("a swimmer's hit volumes", () => {
  const at = { x: 10, y: 3, z: -4 };
  it("lie in the water: the head just above the surface, the rest at and under it", () => {
    const v = combatVolumes({ ...at, swim: true });
    // The head is where the swimmer's own eyes (and the drawn head) are, not 1.6 m up.
    expect(v.head.center.y).toBeCloseTo(at.y + SWIM_EYE - 0.03);
    const top = (b: { center: { y: number }; size: { y: number } }) => b.center.y + b.size.y / 2;
    expect(top(v.head)).toBeLessThan(at.y + 0.5);
    expect(top(v.chest)).toBeLessThan(at.y + 0.2);
    expect(top(v.chest)).toBeGreaterThan(at.y);
    expect(top(v.stomach)).toBeLessThan(at.y);
    expect(top(v.legs)).toBeLessThan(top(v.stomach));
    expect(v.legs.center.y - v.legs.size.y / 2).toBeCloseTo(at.y + SWIM_VOLUME.legs[0]);
    // Nothing is left standing on the water.
    for (const zone of ["head", "chest", "stomach", "legs"] as const)
      expect(top(v[zone])).toBeLessThan(at.y + 0.6);
  });
  it("leave a standing or crouched player as before", () => {
    const stand = combatVolumes(at),
      crouch = combatVolumes({ ...at, crouched: true });
    expect(stand.head.center.y).toBeCloseTo(at.y + 1.6);
    expect(stand.legs.center.y - stand.legs.size.y / 2).toBeCloseTo(at.y);
    expect(crouch.head.center.y).toBeLessThan(stand.head.center.y);
  });
  it("are what a rewound shot meets: the pose history keeps who was swimming", () => {
    const history = new PoseHistory();
    const body = { ...at, crouched: false, phase: "swim" };
    const fighter = { seat: 0, body } as never;
    history.record(1000, [fighter]);
    body.phase = "ground";
    history.record(1050, [fighter]);
    expect(history.at(0, 1010, body as never).swim).toBe(true);
    expect(history.at(0, 1050, body as never).swim).toBe(false);
    // Older than everything kept, and with no history at all: the nearest known pose.
    expect(history.at(0, 500, body as never).swim).toBe(true);
    history.clear();
    body.phase = "swim";
    expect(history.at(0, 500, body as never).swim).toBe(true);
  });
});
