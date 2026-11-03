import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { BOMB_RULES } from "../src/lib/fps/bomb/rules";
import {
  c4Up,
  defuseClipTime,
  initialC4State,
  stepC4,
  c4Raised,
  C4_EXIT_SECONDS,
  initialC4PlantState,
  KEY_RADIUS,
  keyDepressions,
  plantDisplay,
  pressesBefore,
  readC4Metadata,
  stepC4Plant,
  type C4Metadata,
  type C4PlantInput,
} from "../src/lib/fps/c4/c4-timeline";

/**
 * The shipped C4 (public/fps/models/c4.glb, built by art/blender/c4): its plant clip is timed to
 * the room's plantMs, the right index fingertip reaches each key the cues name when they name
 * it, and the first-person plant follows the room's state (Terrorist carrier only).
 */
type Gltf = {
  scenes: { extras?: unknown }[];
  nodes: { name?: string }[];
  accessors: {
    bufferView: number;
    count: number;
    type: string;
    componentType: number;
    byteOffset?: number;
    normalized?: boolean;
  }[];
  bufferViews: {
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    extensions?: Record<
      string,
      {
        buffer: number;
        byteOffset?: number;
        byteLength: number;
        byteStride: number;
        count: number;
        mode: string;
        filter?: string;
      }
    >;
  }[];
  animations: {
    name: string;
    channels: { sampler: number; target: { node: number; path: string } }[];
    samplers: { input: number; output: number }[];
  }[];
};
const glb = fs.readFileSync(path.join(__dirname, "../public/fps/models/c4.glb"));
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8")) as Gltf;
const binStart = 20 + jsonLength + 8;
const bin = glb.subarray(binStart);
const meta: C4Metadata = readC4Metadata(gltf.scenes[0]!.extras);
const SIZE: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

async function readAccessor(index: number) {
  await MeshoptDecoder.ready;
  const a = gltf.accessors[index]!;
  const view = gltf.bufferViews[a.bufferView]!;
  const meshopt = view.extensions?.["EXT_meshopt_compression"];
  let bytes: Uint8Array;
  let stride: number;
  if (meshopt) {
    stride = meshopt.byteStride;
    bytes = new Uint8Array(meshopt.count * stride);
    const source = new Uint8Array(
      bin.buffer,
      bin.byteOffset + (meshopt.byteOffset ?? 0),
      meshopt.byteLength,
    );
    MeshoptDecoder.decodeGltfBuffer(
      bytes,
      meshopt.count,
      stride,
      source,
      meshopt.mode,
      meshopt.filter ?? "NONE",
    );
  } else {
    stride = view.byteStride ?? 0;
    bytes = new Uint8Array(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0), view.byteLength);
  }
  const n = SIZE[a.type]!;
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = { 5126: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 }[a.componentType]!;
  stride ||= n * width;
  const out: number[][] = [];
  for (let i = 0; i < a.count; i++) {
    const row: number[] = [];
    for (let k = 0; k < n; k++) {
      const at = (a.byteOffset ?? 0) + i * stride + k * width;
      let v =
        a.componentType === 5126
          ? data.getFloat32(at, true)
          : a.componentType === 5123
            ? data.getUint16(at, true)
            : a.componentType === 5122
              ? data.getInt16(at, true)
              : a.componentType === 5121
                ? data.getUint8(at)
                : data.getInt8(at);
      if (a.normalized)
        v =
          a.componentType === 5123
            ? v / 65535
            : a.componentType === 5122
              ? Math.max(-1, v / 32767)
              : a.componentType === 5121
                ? v / 255
                : Math.max(-1, v / 127);
      row.push(v);
    }
    out.push(row);
  }
  return out;
}
async function track(clip: string, node: string, pathName: string) {
  const anim = gltf.animations.find((a) => a.name === clip)!;
  const nodeIndex = gltf.nodes.findIndex((n) => n.name === node);
  const channel = anim.channels.find(
    (c) => c.target.node === nodeIndex && c.target.path === pathName,
  )!;
  const sampler = anim.samplers[channel.sampler]!;
  const times = (await readAccessor(sampler.input)).map((r) => r[0]!);
  const values = await readAccessor(sampler.output);
  return (t: number) => {
    const i = times.findIndex((x) => x >= t);
    if (i <= 0) return values[Math.max(0, i)]!;
    const u = (t - times[i - 1]!) / (times[i]! - times[i - 1]!);
    return values[i]!.map((v, k) => values[i - 1]![k]! + (v - values[i - 1]![k]!) * u);
  };
}

describe("C4 plant clip", () => {
  it("lasts the room's plant time and ships the plant, exit and phase clips", () => {
    expect(meta.plantSeconds * 1000).toBe(BOMB_RULES.plantMs);
    const names = gltf.animations.map((a) => a.name);
    for (const clip of [
      "c4_plant",
      "c4_equip",
      "c4_plant_start",
      "c4_keypad_entry",
      "c4_plant_confirm",
      "c4_place",
      "c4_plant_complete",
      "c4_plant_cancel",
    ])
      expect(names).toContain(clip);
  });

  it("enters the code in order, confirms, then places, all inside the plant time", () => {
    const cues = meta.cues["c4_plant"]!;
    const presses = pressesBefore(meta, "c4_plant", meta.plantSeconds);
    expect(presses).toEqual(meta.code);
    const at = (name: string) => cues.find(([, n]) => n === name)![0];
    const lastPress = cues.filter(([, n]) => n.startsWith("press:")).at(-1)![0];
    expect(at("power")).toBeLessThan(cues.find(([, n]) => n.startsWith("press:"))![0]);
    expect(at("armed")).toBeGreaterThan(lastPress);
    expect(at("place")).toBeGreaterThan(at("armed"));
    for (const [t] of cues) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(meta.plantSeconds);
    }
    // Presses are not robotically even.
    const pressTimes = cues.filter(([, n]) => n.startsWith("press:")).map(([t]) => t);
    const gaps = pressTimes.slice(1).map((t, i) => t - pressTimes[i]!);
    expect(new Set(gaps.map((g) => g.toFixed(3))).size).toBeGreaterThan(2);
  });

  it("puts the fingertip pad on the cued key at each press, and on no key between presses", async () => {
    const tip = await track("c4_plant", "C4_Tip", "translation");
    for (const [t, name] of meta.cues["c4_plant"]!) {
      if (!name.startsWith("press:")) continue;
      const key = name.slice(6);
      const [x, y, z] = tip(t);
      const pressed = Object.entries(keyDepressions(meta, { x: x!, y: y!, z: z! })).filter(
        ([, d]) => d > 0,
      );
      expect(pressed.map(([k]) => k)).toEqual([key]);
      // Never deeper than the key's travel (the pad stops on the depressed key).
      const [, , top] = meta.model.keys[key]!;
      expect(top - z!).toBeLessThanOrEqual(meta.model.keyTravel + 1e-4);
      // Lifted again before the next press.
      const [, , zUp] = tip(t + 0.14);
      expect(zUp).toBeGreaterThan(top);
    }
  });

  it("depresses only the key under the pad, by how far the pad is below its cap", () => {
    const [x, y, top] = meta.model.keys["5"]!;
    const half = keyDepressions(meta, { x, y, z: top - meta.model.keyTravel / 2 });
    expect(half["5"]).toBeCloseTo(0.5, 5);
    for (const k of Object.keys(half)) if (k !== "5") expect(half[k]).toBe(0);
    expect(keyDepressions(meta, { x, y, z: top + 0.01 })["5"]).toBe(0);
    expect(keyDepressions(meta, { x: x + KEY_RADIUS * 1.1, y, z: top - 0.001 })["5"]).toBe(0);
  });

  it("shows the code being entered on the LCD, then armed", () => {
    expect(plantDisplay(meta, 0).mode).toBe("off");
    let digits = 0;
    for (let t = 0.5; t < meta.plantSeconds; t += 0.05) {
      const d = plantDisplay(meta, t);
      expect(d.digits).toBeGreaterThanOrEqual(digits);
      digits = d.digits;
    }
    expect(plantDisplay(meta, meta.plantSeconds)).toEqual({
      mode: "armed",
      digits: meta.code.length - 1,
      length: meta.code.length - 1,
    });
  });
});

describe("first-person plant follows the room", () => {
  const base: C4PlantInput = {
    showWeapon: true,
    team: "terrorist",
    you: 6,
    bomb: { state: "planting", carrier: 6, plantStartedAt: 10_000 },
    serverNow: 11_000,
    now: 50_000,
  };
  it("plants only for the Terrorist carrier, on the room's clock", () => {
    const s = stepC4Plant(initialC4PlantState(), base);
    expect(s.presentation).toEqual({ kind: "plant", elapsed: 1 });
    expect(stepC4Plant(initialC4PlantState(), { ...base, team: "police" }).presentation.kind).toBe(
      "hidden",
    );
    expect(stepC4Plant(initialC4PlantState(), { ...base, you: 2 }).presentation.kind).toBe(
      "hidden",
    );
    expect(
      stepC4Plant(initialC4PlantState(), { ...base, bomb: { state: "carried", carrier: 6 } })
        .presentation.kind,
    ).toBe("hidden");
  });
  it("completes only when the room says planted; anything else cancels", () => {
    const planting = stepC4Plant(initialC4PlantState(), { ...base, serverNow: 13_150 });
    const done = stepC4Plant(planting, { ...base, bomb: { state: "planted" }, now: 50_100 });
    expect(done.presentation.kind).toBe("complete");
    const aborted = stepC4Plant(planting, { ...base, bomb: { state: "carried", carrier: 6 } });
    expect(aborted.presentation).toMatchObject({ kind: "cancel", at: 3.15 });
    const died = stepC4Plant(planting, { ...base, showWeapon: false });
    expect(died.presentation.kind).toBe("cancel");
    // A dead player's cancel hides at once; a living one plays the exit and hides after it.
    expect(
      stepC4Plant(died, { ...base, showWeapon: false, bomb: undefined }).presentation.kind,
    ).toBe("hidden");
    const later = stepC4Plant(aborted, {
      ...base,
      bomb: { state: "carried", carrier: 6 },
      now: 50_000 + (C4_EXIT_SECONDS + 0.2) * 1000,
    });
    expect(later.presentation.kind).toBe("hidden");
    expect(c4Raised(aborted.presentation)).toBe(true);
    expect(c4Raised(later.presentation)).toBe(false);
  });
});

describe("C4 defuse clip", () => {
  it("is authored for the 10 s defuse; a kit's 5 s squeezes only the keypad section", () => {
    expect(meta.defuseSeconds * 1000).toBe(BOMB_RULES.defuseMs);
    const [head, tail] = meta.defuseFixed;
    for (const t of [0, 0.5, head, 4, 8, 9.9, 10])
      expect(defuseClipTime(meta, t, 10)).toBeCloseTo(t, 9);
    const kit = BOMB_RULES.defuseKitMs / 1000;
    expect(defuseClipTime(meta, 0.4, kit)).toBeCloseTo(0.4, 9);
    expect(defuseClipTime(meta, head, kit)).toBeCloseTo(head, 9);
    expect(defuseClipTime(meta, kit - tail, kit)).toBeCloseTo(meta.defuseSeconds - tail, 9);
    expect(defuseClipTime(meta, kit, kit)).toBeCloseTo(meta.defuseSeconds, 9);
    let last = -1;
    for (let t = 0; t <= kit; t += 0.01) {
      const c = defuseClipTime(meta, t, kit);
      expect(c).toBeGreaterThanOrEqual(last);
      last = c;
    }
  });

  it("presses each cued key with the fingertip pad, then confirms with #", async () => {
    const tip = await track("c4_defuse", "C4_DTipKey", "translation");
    const mix = await track("c4_defuse", "C4_DMix", "translation");
    const presses = meta.cues["c4_defuse"]!.filter(([, n]) => n.startsWith("press:"));
    expect(presses.at(-1)![1]).toBe("press:hash");
    expect(presses.length).toBeGreaterThan(8);
    for (const [t, name] of presses) {
      const key = name.slice(6);
      const [x, y, z] = tip(t);
      expect(mix(t)[0]).toBeCloseTo(1, 3);
      const pressed = Object.entries(keyDepressions(meta, { x: x!, y: y!, z: z! })).filter(
        ([, d]) => d > 0,
      );
      expect(pressed.map(([k]) => k)).toEqual([key]);
      expect(t).toBeLessThan(meta.defuseSeconds);
    }
  });
});

describe("first-person defuse follows the room", () => {
  const base = {
    showWeapon: true,
    team: "police" as const,
    you: 1,
    bomb: { state: "planted", defuser: 1, defuseStartedAt: 20_000, defuseMs: 10_000 },
    serverNow: 23_000,
    now: 90_000,
  };
  it("defuses only for the Police defuser, on the room's clock and length", () => {
    expect(stepC4(initialC4State(), base).view).toEqual({ kind: "defuse", elapsed: 3, total: 10 });
    expect(
      stepC4(initialC4State(), { ...base, bomb: { ...base.bomb, defuseMs: 5_000 } }).view,
    ).toEqual({ kind: "defuse", elapsed: 3, total: 5 });
    expect(stepC4(initialC4State(), { ...base, team: "terrorist" }).view.kind).toBe("hidden");
    expect(stepC4(initialC4State(), { ...base, you: 2 }).view.kind).toBe("hidden");
  });
  it("shows the device safe only when the room says defused; anything else cancels", () => {
    const defusing = stepC4(initialC4State(), base);
    const done = stepC4(defusing, { ...base, bomb: { state: "defused" } });
    expect(done.view.kind).toBe("defused");
    const released = stepC4(defusing, { ...base, bomb: { state: "planted" } });
    expect(released.view.kind).toBe("defuse-cancel");
    expect(c4Up(released.view)).toBe(true);
    const later = stepC4(released, { ...base, bomb: { state: "planted" }, now: 91_000 });
    expect(later.view.kind).toBe("hidden");
    // The Police never plant: a Police "carrier" state cannot start the plant clip.
    expect(
      stepC4(initialC4State(), {
        ...base,
        bomb: { state: "planting", carrier: 1, plantStartedAt: 22_000 },
      }).view.kind,
    ).toBe("hidden");
  });
});
