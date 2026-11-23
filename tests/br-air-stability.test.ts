import { readFileSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DROP } from "@/lib/fps/br/drop";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { createProps, RINGS, type ModelManifest } from "@/lib/fps/br/props-renderer";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Buildings from the plane and the parachute (owner, 2026-11-23: "main issue … is
 * blinking/flicker buildings on distance/diffrent attitudes in the airplane/parachute"; "the
 * render should be like call of duty no matter of what distance or attitude").
 *
 * The real island and its manifest, each model a box of its size, flown frame by frame at the
 * game's speeds with the LOD pass spread over frames as the game spreads it. Every frame, every
 * building is drawn exactly once: as its model or as its far proxy, never neither (a blink) and
 * never both (one through the other); a building of stacked parts is one LOD; and no building
 * goes back and forth between two states.
 */
describe("buildings from the air", async () => {
  const buffer = (path: string) => {
    const b = readFileSync(path);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  const manifest = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.models}`, "utf8"),
  ) as ModelManifest;
  const island = buildIsland(hf, cover, meta, collision);
  const layout = island.layout;
  /** Every model a box of its own size, standing on its origin. */
  const loader = {
    loadAsync: async (file: string) => {
      const id = file.split("/").pop()!.split(".")[0]!;
      const [w, h, d] = manifest.models[id]!.size as [number, number, number];
      const scene = new THREE.Group();
      const g = new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1));
      g.translate(0, h / 2, 0);
      scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ name: id })));
      return { scene };
    },
  } as unknown as GLTFLoader;
  const downtown = meta.pois.find((p) => p.id === "downtown")!;
  const northstar = meta.pois.find((p) => p.id === "northstar-town")!;
  const hospital = meta.pois.find((p) => p.id === "central-hospital")!;
  const works = meta.pois.find((p) => p.id === "east-works")!;

  /** Stacked buildings (a tower's lobby, storeys and roof): placement indices per stack. */
  const FAR = new Set(["building", "dwelling", "shop", "outbuilding", "hero", "structure"]);
  const ringOf = (model: string) => manifest.models[model]!.ring ?? manifest.models[model]!.class;
  const stacks: number[][] = [];
  {
    const by = new Map<string, number[]>();
    layout.forEach((p, i) => {
      if (!FAR.has(ringOf(p.model))) return;
      const k = `${p.x}:${p.z}`;
      by.set(k, [...(by.get(k) ?? []), i]);
    });
    for (const m of by.values())
      if (m.length > 2 && Math.max(...m.map((i) => layout[i]!.y)) - layout[m[0]!]!.y > 6)
        stacks.push(m);
  }

  // The pass is spread over frames by the clock (1 ms a frame): here every look at the clock
  // costs a fixed time, so a pass takes the same number of frames on every machine.
  let clock = 0;
  let tick = 0.006;
  beforeAll(() => {
    vi.spyOn(performance, "now").mockImplementation(() => (clock += tick));
  });
  afterAll(() => vi.restoreAllMocks());

  type Flight = (t: number) => [number, number, number];
  /** Fly `seconds` at 60 frames a second; what each building did, frame by frame. */
  const fly = async (path: Flight, seconds: number, perPassTick = 0.006) => {
    tick = perPassTick;
    const props = createProps(layout, manifest, loader, {
      preload: true,
      ground: (x, z) => hf.heightAt(x, z),
    });
    await props.ready;
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 14000);
    const proxied: number[] = [];
    const set = (t: number) => {
      camera.position.set(...path(t));
      camera.updateMatrixWorld(true);
    };
    set(0);
    props.update(camera, true);
    for (let i = 0; i < layout.length; i++) if (props.proxyShown(i) !== null) proxied.push(i);
    // The far ring as the shader of old tested it, against this frame's camera.
    const ring = proxied.map((i) => Math.max(1500, RINGS[ringOf(layout[i]!.model)]![2]));
    const last = new Int8Array(layout.length).fill(-2),
      before = new Int8Array(layout.length).fill(-2),
      since = new Int32Array(layout.length);
    const out = {
      frames: 0,
      passFrames: 0,
      proxied: proxied.length,
      neither: 0,
      both: 0,
      oldNeither: 0,
      oldBoth: 0,
      oldNeitherMaxFrames: 0,
      flips: 0,
      nearGrazes: 0,
      mixedStackFrames: 0,
      mixedFarStackFrames: 0,
      changes: 0,
    };
    const gone = new Int32Array(layout.length);
    let passes = 0,
      started = 0;
    for (let f = 1; f <= seconds * 60; f++) {
      set(f / 60);
      const calls = clock;
      props.update(camera);
      if (clock - calls > tick * 1.5) started++;
      else if (started) {
        passes++;
        out.passFrames += started;
        started = 0;
      }
      out.frames++;
      const c = camera.position;
      for (let k = 0; k < proxied.length; k++) {
        const i = proxied[k]!,
          p = layout[i]!;
        const level = props.levelOf(i);
        const shown = props.proxyShown(i)!;
        if (level < 0 && !shown) out.neither++;
        if (level >= 0 && shown) out.both++;
        // As it was: the proxy by this frame's distance, the model by the pass.
        const oldShown = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) > ring[k]!;
        if (level < 0 && !oldShown) {
          out.oldNeither++;
          out.oldNeitherMaxFrames = Math.max(out.oldNeitherMaxFrames, ++gone[i]!);
        } else gone[i] = 0;
        if (level >= 0 && oldShown) out.oldBoth++;
        // A change that undoes the one before it within two seconds: a flip.
        if (level !== last[i]) {
          if (last[i] !== -2) {
            out.changes++;
            if (level === before[i] && f - since[i]! < 90 && (level === 0 || last[i] === 0))
              // Grazing a near ring (in at the ring, out 8 % past it): both LODs are textured.
              out.nearGrazes++;
            else if (level === before[i] && f - since[i]! < 90) {
              out.flips++;
              if (process.env["AIR_DEBUG"])
                console.log(
                  `flip ${p.model} ${before[i]}→${last[i]}→${level} d=${Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z).toFixed(0)} agl=${(c.y - hf.heightAt(c.x, c.z)).toFixed(0)} f=${f}`,
                );
            }
          }
          before[i] = last[i]!;
          last[i] = level;
          since[i] = f;
        }
      }
      for (const m of stacks) {
        let lo = 9,
          hi = -9,
          far = 0;
        for (const i of m) {
          // (A tower's roof keeps its middle LOD from the air: its pool deck and helipad are
          // what you look for. Its lobby and storeys go as one.)
          if (manifest.models[layout[i]!.model]!.air !== "far") continue;
          const l = props.levelOf(i);
          if (l === 0) continue; // the near ring is each part's own (its panes go with it)
          lo = Math.min(lo, l);
          hi = Math.max(hi, l);
          if (l === 2) far++;
        }
        if (hi > lo) {
          out.mixedStackFrames++;
          if (lo < 0 || far) out.mixedFarStackFrames++;
        }
      }
    }
    props.dispose();
    return { ...out, passFrames: passes ? +(out.passFrames / passes).toFixed(1) : 0 };
  };

  // The plane: 800 m up, a route across the island in 50 s, passing 900 m west of Downtown.
  const routeLength = 2 * (5000 + DROP.routeMargin);
  const planeSpeed = routeLength / (DROP.planeDurationMs / 1000);
  const plane: Flight = (t) => [downtown.x - 900, DROP.planeAltitude, 5600 - planeSpeed * t];
  // The canopy from the plane's height: a glide to Downtown from 3.6 km, then a spiral over it.
  const P = DROP.parachute;
  const glide: Flight = (t) => {
    const ground = 20;
    const y = Math.max(ground + 60, DROP.planeAltitude - P.glideDown * t);
    const far = Math.max(0, 3600 - P.glideForward * t);
    if (far > 0) return [downtown.x - far * 0.8, y, downtown.z + far * 0.6];
    const a = ((t - 3600 / P.glideForward) * P.glideForward) / 150;
    return [downtown.x + Math.sin(a) * 150, y, downtown.z + (1 - Math.cos(a)) * 150];
  };
  // A turn round a town at its houses' far ring, where they hand over to their proxies.
  const orbit =
    (poi: { x: number; z: number }, radius: number, height: number, speed: number): Flight =>
    (t) => {
      const a = (t * speed) / radius;
      return [poi.x + Math.cos(a) * radius, height, poi.z + Math.sin(a) * radius];
    };
  // A real glide over the hills to a town: the ground below rises and falls under the canopy,
  // so its height over it goes down, up and down again.
  const hills = (from: [number, number], to: { x: number; z: number }): Flight => {
    const length = Math.hypot(to.x - from[0], to.z - from[1]);
    const y0 = hf.heightAt(from[0], from[1]) + 340;
    return (t) => {
      const k = Math.min(1, (P.glideForward * t) / length);
      const x = from[0] + (to.x - from[0]) * k,
        z = from[1] + (to.z - from[1]) * k;
      return [x, Math.max(hf.heightAt(x, z) + 50, y0 - P.glideDown * t), z];
    };
  };
  const results: Record<string, Awaited<ReturnType<typeof fly>>> = {};
  const flights: Array<[string, Flight, number, number?]> = [
    ["plane", plane, 30],
    ["plane, slow machine", plane, 30, 0.02],
    ["canopy glide and spiral over Downtown", glide, 170],
    ["turn round Northstar at 3.9 km", orbit(northstar, 3900, 500, P.glideForward), 60],
    ["turn round the hospital at 2.4 km", orbit(hospital, 2400, 400, P.glideForward), 60],
    ["turn round East Works at 3.95 km", orbit(works, 3950, 600, planeSpeed / 3), 60],
    [
      "glide over the hills to Northstar",
      hills([northstar.x + 1500, northstar.z + 1300], northstar),
      70,
    ],
    [
      "glide over the hills to Downtown",
      hills([downtown.x - 1700, downtown.z - 1100], downtown),
      70,
    ],
  ];

  for (const [name, path, seconds, cost] of flights)
    it(`${name}: every building drawn once, whole, and steady`, async () => {
      const r = await fly(path, seconds, cost);
      results[name] = r;
      // Never neither (a blink), never both (two surfaces fighting).
      expect(r.neither, "missing building-frames").toBe(0);
      expect(r.both, "doubled building-frames").toBe(0);
      // A tower is one LOD past its near ring.
      expect(r.mixedStackFrames, "towers in mixed LODs").toBe(0);
      // Nothing goes there and back.
      expect(r.flips, "there-and-back LOD changes").toBe(0);
    }, 600_000);

  afterAll(() => {
    if (process.env["AIR_REPORT"])
      writeFileSync(process.env["AIR_REPORT"], JSON.stringify(results, null, 1));
  });

  it("has towers to check, and a plane as fast as the game's", () => {
    expect(stacks.length).toBeGreaterThan(30);
    expect(planeSpeed).toBeGreaterThan(200);
  });
});
