import { expect, test } from "vitest";
import { CanopyLook } from "@/lib/fps/br/canopy-look";

test("normal mouse sets course while right-drag changes only the view", () => {
  const c = new CanopyLook();
  c.sync(true, 0.7, -0.2);
  c.mouse(100, 20, 0.002);
  expect(c.course).toBeCloseTo(0.5);
  expect(c.pitch).toBeCloseTo(-0.24);
  c.dragging = true;
  c.mouse(300, -100, 0.002);
  expect(c.course).toBeCloseTo(0.5);
  expect(c.pitch).toBeCloseTo(-0.24);
  expect(c.view(16).yaw).toBeCloseTo(-0.1);
  expect(c.view(16).pitch).toBeCloseTo(-0.04);
});
test("release recentres smoothly by the shortest arc without steering the canopy", () => {
  const c = new CanopyLook();
  c.sync(true, Math.PI - 0.1, 0);
  c.dragging = true;
  c.mouse(-1000, 0, 0.002);
  const before = c.view(0).yaw;
  c.release();
  const first = c.view(16).yaw;
  expect(Math.abs(Math.atan2(Math.sin(first - before), Math.cos(first - before)))).toBeLessThan(
    0.2,
  );
  c.view(1800);
  expect(c.view(0).yaw).toBeCloseTo(c.course, 3);
  expect(c.course).toBeCloseTo(Math.PI - 0.1);
});
test("keyboard turns update the mouse course and leaving the canopy clears drag", () => {
  const c = new CanopyLook();
  c.sync(true, 0, 0);
  c.keyboard(1.1, true);
  expect(c.course).toBeCloseTo(1.1);
  c.keyboard(1.2, false);
  expect(c.course).toBeCloseTo(1.2);
  c.dragging = true;
  c.sync(false, 2, 0);
  expect(c.dragging).toBe(false);
  c.mouse(300, 0, 0.002);
  expect(c.course).toBeCloseTo(1.2);
  c.sync(true, -2, 0.3);
  expect(c.view(0)).toEqual({ yaw: -2, pitch: 0.3 });
});
test("pitch stays bounded and malformed local mouse values do not poison controls", () => {
  const c = new CanopyLook();
  c.sync(true, 0, 0);
  c.mouse(0, 100000, 0.002);
  expect(c.view(0).pitch).toBe(-1.25);
  c.mouse(Infinity, NaN, 0.002);
  expect(c.course).toBe(0);
  c.dragging = true;
  c.mouse(0, -100000, 0.002);
  expect(c.view(0).pitch).toBe(1.25);
  c.point(0.7, -0.3);
  expect(c.view(0)).toEqual({ yaw: 0.7, pitch: -0.3 });
});
