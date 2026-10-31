import { describe, it, expect } from "vitest";
import { CameraCorrection, RemotePresentation, RenderBudget } from "../src/lib/fps/presentation";
import { createMatch, predictMovement, TICK_MS } from "../src/lib/fps/simulation";
import type { Input } from "../src/lib/fps/protocol";
import { REMOTE_DELAY_MS } from "../src/lib/fps/network";
const player = () => createMatch({ A: "a", B: "b" }, 5, 1).players.A;
describe("render presentation independent of server physics", () => {
  it.each([60, 144])(
    "keeps approaching opponents moving between quantized 20 Hz snapshots at %i Hz",
    (hz) => {
      const remote = new RemotePresentation(),
        p = player();
      const out = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
      let nextTick = 0,
        lastSent = -50,
        previous = 0,
        stalls = 0;
      for (let now = 0; now < 2000; now += 1000 / hz) {
        while (nextTick <= now) {
          if (nextTick - lastSent >= 50) {
            remote.push({ ...p, x: nextTick / 1000, z: 0 }, nextTick);
            lastSent += 50;
          }
          nextTick += 34;
        }
        remote.sample(now - REMOTE_DELAY_MS, out, 1000 / hz);
        if (now > 200 && out.x - previous < 0.00001) stalls++;
        previous = out.x;
      }
      expect(stalls).toBe(0);
    },
  );
  it("does not reverse the visible opponent when a packet updates the clock estimate", () => {
    const remote = new RemotePresentation(),
      p = player();
    const out = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
    for (let at = 0; at <= 300; at += 34) remote.push({ ...p, x: at / 1000 }, at);
    remote.sample(150, out, 7);
    const before = out.x;
    remote.sample(140, out, 7);
    expect(out.x).toBeGreaterThan(before);
    expect(out.at).toBeCloseTo(156.65);
    remote.clear();
    remote.push({ ...p, x: 10 }, 1000);
    remote.sample(1000, out, 7);
    expect(out.x).toBe(10);
  });
  it("moves between network ticks without altering the predicted authority pose", () => {
    const authority = player();
    authority.x = 9;
    authority.z = 12;
    authority.yaw = 0;
    const original = { ...authority };
    const input: Input = {
      v: 1,
      type: "input",
      seq: 1,
      yaw: 0,
      pitch: 0,
      forward: 1,
      strafe: 0,
      fire: false,
      reload: false,
      weapon: "rifle",
      jump: false,
      sprint: false,
    };
    const positions = [0, 7, 14, 21, 28].map((ms) => {
      const render = { ...authority };
      predictMovement(render, input, ms);
      return render.z;
    });
    expect(positions.every((z, i) => i === 0 || z < positions[i - 1]!)).toBe(true);
    expect(authority).toEqual(original);
    const whole = { ...authority };
    predictMovement(whole, input, TICK_MS);
    expect(positions.at(-1)).toBeGreaterThan(whole.z);
  });
  it("preserves visual position across a small correction and decays identically at different refresh rates", () => {
    const a = player(),
      b = { ...a, z: a.z - 0.2 };
    const slow = new CameraCorrection(),
      fast = new CameraCorrection();
    slow.reconcile(a, b);
    fast.reconcile(a, b);
    expect(b.z + slow.z).toBeCloseTo(a.z);
    for (let i = 0; i < 30; i++) slow.update(1000 / 30);
    for (let i = 0; i < 144; i++) fast.update(1000 / 144);
    expect(slow.z).toBeCloseTo(fast.z, 10);
    expect(slow.z).toBeLessThan(0.00001);
  });
  it("snaps teleports instead of dragging the camera through cover", () => {
    const a = player(),
      c = new CameraCorrection();
    c.reconcile(a, { ...a, x: a.x + 5 });
    expect(c.x).toBe(0);
  });
  it("buffers visible poses, interpolates wrapped angles, and clears hidden history", () => {
    const p = player(),
      m = new RemotePresentation(),
      out = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
    m.push({ ...p, x: 0, yaw: Math.PI - 0.1 }, 100);
    m.push({ ...p, x: 1, yaw: -Math.PI + 0.1 }, 150);
    m.push({ ...p, x: 99 }, 140); // out of order cannot rewind state
    expect(m.sample(125, out)).toBe(true);
    expect(out.x).toBeCloseTo(0.5);
    expect(out.yaw).toBeCloseTo(Math.PI);
    m.sample(999, out);
    expect(out.x).toBe(1); // never extrapolate
    m.clear();
    expect(m.sample(125, out)).toBe(false);
  });
  it("does not interpolate across a respawn", () => {
    const p = player(),
      m = new RemotePresentation(),
      out = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
    m.push({ ...p, x: 0 }, 100);
    m.push({ ...p, x: 10 }, 150);
    m.sample(125, out);
    expect(out.x).toBe(10);
  });
  it("keeps ordered interpolation through repeated buffer wraparound and clear", () => {
    const p = player(),
      m = new RemotePresentation(),
      out = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
    for (let i = 0; i < 100; i++) m.push({ ...p, x: i * 0.01 }, i * 50);
    m.push({ ...p, x: 9 }, 4900); // delayed old snapshot must not replace newest
    expect(m.sample(4925, out)).toBe(true);
    expect(out.x).toBeCloseTo(0.985);
    m.sample(0, out);
    expect(out.x).toBeCloseTo(0.92); // oldest retained pose
    m.clear();
    m.push({ ...p, x: 2 }, 20);
    m.sample(10, out);
    expect(out.x).toBe(2);
  });
  it("bounds high DPI framebuffer size and adapts only after sustained slow frames", () => {
    const b = new RenderBudget();
    const stalled = new RenderBudget();
    for (let i = 0; i < 30; i++) stalled.update(200);
    expect(stalled.scale).toBeLessThan(1);
    expect(3840 * 2160 * b.ratio(3840, 2160, 2) ** 2).toBeLessThanOrEqual(1500001);
    b.update(80);
    expect(b.scale).toBe(1);
    for (let i = 0; i < 250; i++) b.update(30);
    expect(b.scale).toBeLessThan(0.9);
    expect(b.scale).toBeGreaterThanOrEqual(0.6);
    const lower = b.scale;
    for (let i = 0; i < 100; i++) b.update(7);
    expect(b.scale).toBe(lower);
    for (let i = 0; i < 2000; i++) b.update(7);
    expect(b.scale).toBeGreaterThan(lower);
    expect(b.scale).toBeLessThanOrEqual(1);
  });
});
