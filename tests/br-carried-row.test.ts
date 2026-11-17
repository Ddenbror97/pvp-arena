import { describe, expect, it } from "vitest";
import { carriedRow } from "../src/lib/fps/br/match";
import { newLoadout, pickUp } from "../src/lib/fps/br/inventory";
import { itemCode, itemFromCode } from "../src/lib/fps/br/loot-world";

/** What the client reads back (br-arena carriedFor): [right of the pack, left of it]. */
const worn = (code: number) =>
  [code % 256, Math.floor(code / 256)].map((c) => (c > 0 ? itemFromCode(c - 1) : null));

describe("guns worn on the back (player row index 12)", () => {
  it("carries the main gun not in hand, on its own slot's side", () => {
    const kit = newLoadout();
    pickUp(kit, { item: "awp", qty: 1, mag: 5 });
    pickUp(kit, { item: "spas12", qty: 1, mag: 8 });
    expect(kit.guns[0]?.item).toBe("awp");
    expect(kit.guns[1]?.item).toBe("spas12");
    kit.active = 0;
    expect(worn(carriedRow(kit))).toEqual([null, "spas12"]);
    kit.active = 1;
    expect(worn(carriedRow(kit))).toEqual(["awp", null]);
  });

  it("wears both with the knife or the pistol out, and none with empty slots", () => {
    const kit = newLoadout();
    expect(carriedRow(kit)).toBe(0);
    pickUp(kit, { item: "ak47", qty: 1, mag: 30 });
    pickUp(kit, { item: "mp5", qty: 1, mag: 30 });
    kit.active = -1;
    expect(worn(carriedRow(kit))).toEqual(["ak47", "mp5"]);
    pickUp(kit, { item: "deagle", qty: 1, mag: 7 });
    kit.active = 2;
    expect(worn(carriedRow(kit))).toEqual(["ak47", "mp5"]);
  });

  it("round-trips every item code it can hold", () => {
    const kit = newLoadout();
    pickUp(kit, { item: "hunting", qty: 1, mag: 10 });
    pickUp(kit, { item: "m4", qty: 1, mag: 30 });
    kit.active = -1;
    const code = carriedRow(kit);
    expect(code % 256).toBe(itemCode("hunting") + 1);
    expect(Math.floor(code / 256)).toBe(itemCode("m4") + 1);
  });
});
