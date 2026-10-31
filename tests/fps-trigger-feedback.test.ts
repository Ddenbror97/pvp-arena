import { it, expect } from "vitest";
import { TriggerFeedback, consumeShotPrediction } from "../src/lib/fps/trigger-feedback";
import { createMatch } from "../src/lib/fps/simulation";
it("starts first-shot feedback without waiting for authority and deduplicates its acknowledgement", () => {
  const p = createMatch({ A: "a", B: "b" }, 5, 0).players.A,
    original = { ...p },
    f = new TriggerFeedback();
  expect(f.request(p, "rifle", 1, 0, 0, 100)).toBe(true);
  expect(p).toEqual(original);
  expect(f.request(p, "rifle", 2, 20, 20, 100)).toBe(false);
  expect(f.confirm(1)).toBe(true);
  expect(f.confirm(1)).toBe(false);
});
it("matches delayed server fire with at most one command of presentation lead", () => {
  const pending = new Map([
    [1, 0],
    [3, 102],
    [6, 204],
  ]);
  expect(consumeShotPrediction(pending, 1)).toBe(true);
  expect(consumeShotPrediction(pending, 1)).toBe(false);
  expect(consumeShotPrediction(pending, 4)).toBe(true);
  expect([...pending.keys()]).toEqual([6]);
  expect(consumeShotPrediction(pending, 4)).toBe(false);
  expect(consumeShotPrediction(pending, 5)).toBe(true);
  expect(consumeShotPrediction(pending, 5)).toBe(false);
});
it("deduplicates the captured 24/28/31 local cadence against 24/27/30 authority", () => {
  const pending = new Map([
    [24, 0],
    [28, 110],
    [31, 213],
  ]);
  for (const ack of [24, 27, 30]) expect(consumeShotPrediction(pending, ack)).toBe(true);
  expect(pending.size).toBe(0);
});
it("continues local automatic cadence while its previous server acknowledgement is still recent", () => {
  const p = createMatch({ A: "a", B: "b" }, 5, 0).players.A,
    f = new TriggerFeedback();
  expect(f.request(p, "rifle", 1, 0, 0, 100)).toBe(true);
  expect(f.request(p, "rifle", 1, 102, 102, 100)).toBe(false);
  expect(f.request({ ...p, lastShotAt: 80 }, "rifle", 3, 102, 102, 100)).toBe(true);
});
it("does not predict empty, reloading, dead, cooling-down or mismatched weapons", () => {
  const p = createMatch({ A: "a", B: "b" }, 5, 0).players.A;
  for (const patch of [{ ammo: 0 }, { hp: 0 }, { reloadUntil: 1000 }, { lastShotAt: 950 }]) {
    expect(new TriggerFeedback().request({ ...p, ...patch }, "rifle", 1, 1000, 1000, 100)).toBe(
      false,
    );
  }
  const f = new TriggerFeedback();
  expect(f.request(p, "pistol", 1, 0, 0, 100)).toBe(false);
  expect(f.request({ ...p, ammo: 1 }, "rifle", 1, 0, 0, 100)).toBe(true);
  expect(f.request({ ...p, ammo: 1 }, "rifle", 2, 150, 150, 100)).toBe(false);
  f.reset();
  expect(f.request(p, "rifle", 3, 0, 0, 100)).toBe(true);
});
