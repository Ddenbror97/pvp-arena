import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BrAimRecoil } from "../src/lib/fps/br/aim-recoil";
import { alignedSightPosition } from "../src/lib/fps/br/sight-alignment";
import { grenadeSamples, GRENADE_CUES } from "../src/lib/fps/grenades/grenade-audio";
import { createNadeRenderer } from "../src/lib/fps/br/nade-renderer";
import { Heightfield } from "../src/lib/fps/br/heightfield";
import { StaticWorld } from "../src/lib/fps/br/static-world";

it("all six BR gun reports have audible PCM, including the unsuppressed M4", () => {
  for (const name of [
    "ak47-reference-v1.wav",
    "br-ak47-silenced-v2.wav",
    "br-m4-v2.wav",
    "m4a1-suppressed-v1.wav",
    "awp-shot-v2.wav",
    "br-awp-silenced-v2.wav",
  ]) {
    const b = readFileSync("public/fps/audio/" + name);
    let data: Buffer | undefined;
    for (let p = 12; p + 8 <= b.length;) {
      const n = b.readUInt32LE(p + 4);
      if (b.toString("ascii", p, p + 4) === "data") data = b.subarray(p + 8, p + 8 + n);
      p += 8 + n + (n % 2);
    }
    expect(data, name).toBeDefined();
    let sum = 0,
      peak = 0;
    for (let i = 0; i < data!.length / 2; i++) {
      const v = data!.readInt16LE(i * 2) / 32768;
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak, name).toBeGreaterThan(0.1);
    expect(Math.sqrt(sum / (data!.length / 2)), name).toBeGreaterThan(0.01);
  }
});

it("the shared grenade bank produces finite audible handling, blast, smoke and fire samples", () => {
  const context = {
    sampleRate: 8000,
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data } as unknown as AudioBuffer;
    },
  };
  const bank = grenadeSamples(context as Pick<AudioContext, "sampleRate" | "createBuffer">);
  for (const cue of Object.values(GRENADE_CUES)) {
    const samples = bank.get(cue.sample)!.getChannelData(0);
    expect(samples.length).toBeGreaterThan(100);
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(samples.reduce((s, v) => s + v * v, 0) / samples.length).toBeGreaterThan(0.00001);
  }
});

it("smoke/fire play one pop, continuing nearby beds and stop on expiry without replaying old pops", () => {
  const calls: string[] = [];
  const fx = createNadeRenderer(new THREE.Scene(), (cue) => calls.push(cue));
  const world = new StaticWorld(new Heightfield(2, 2, 1000, new Float32Array(4)), [], {
    voxel: 1,
    models: {},
  });
  fx.area(1, "smoke", 0, 0, 0, 0, 18000, 0);
  fx.area(1, "smoke", 0, 0, 0, 0, 18000, 0);
  fx.area(2, "fire", 10, 0, 0, 0, 7000, 4000);
  expect(calls).toEqual(["smoke"]);
  fx.update(world, 5300, 5300);
  expect(calls).toContain("smoke-hiss");
  expect(calls).toContain("fire-crackle");
  const count = calls.length;
  fx.update(world, 20000, 20000);
  expect(calls).toHaveLength(count);
  fx.dispose();
});

describe("BR aim presentation", () => {
  it("keeps the visible sight on the firing ray after rotation and animated weapon offsets", () => {
    const point = new THREE.Vector3(0.03, 0.12, -0.35);
    for (const pitch of [-0.2, 0, 0.2])
      for (const yaw of [-0.1, 0, 0.1]) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0.03));
        const position = alignedSightPosition(new THREE.Vector3(), point, q, 0.13);
        const actual = point.clone().applyQuaternion(q).add(position);
        expect(actual.x).toBeCloseTo(0, 12);
        expect(actual.y).toBeCloseTo(0, 12);
        expect(actual.z).toBeCloseTo(-0.13, 12);
      }
  });
  it("shows recoil immediately and replays only unacknowledged shots after a delayed snapshot", () => {
    const r = new BrAimRecoil();
    r.shot(1000, true, 1);
    r.sample(1000, 100);
    r.shot(1100, true, 1);
    const before = r.sample(1100, 100);
    expect(before.pitch).toBeCloseTo((1.4 * Math.PI) / 180, 3);
    r.sync({
      pitch: (0.65 * Math.PI) / 180,
      yaw: (0.03 * Math.PI) / 180,
      spray: 1,
      shotAt: 1000,
      updatedAt: 1033,
      shots: 1,
    });
    const after = r.sample(1100, 100);
    expect(after.pitch).toBeCloseTo((1.4 * Math.PI) / 180, 4);
    r.sync({
      pitch: (1.4 * Math.PI) / 180,
      yaw: (0.03 * Math.PI) / 180,
      spray: 2,
      shotAt: 1100,
      updatedAt: 1100,
      shots: 2,
    });
    expect(r.sample(1100, 100).pitch).toBeCloseTo((1.4 * Math.PI) / 180, 5);
    for (let at = 1116; at < 2000; at += 16) r.sample(at, 16);
    expect(r.sample(2000, 16).pitch).toBeLessThan(0.000001);
  });
  it("clears rejected prediction and rebases after warm-up resets the server shot counter", () => {
    const r = new BrAimRecoil();
    r.sync({ pitch: 0.1, yaw: 0, spray: 8, shotAt: 1000, updatedAt: 1000, shots: 8 });
    r.shot(1100, true, 1);
    r.sample(2000, 100);
    r.sync({ pitch: 0, yaw: 0, spray: 0, shotAt: -1e9, updatedAt: 2100, shots: 0 });
    r.shot(2200, true, 1);
    r.shot(2300, true, 1);
    expect(r.sample(2300, 100).pitch).toBeCloseTo((1.4 * Math.PI) / 180, 3);
  });
});
