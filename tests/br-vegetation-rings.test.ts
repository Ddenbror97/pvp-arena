import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { CELL_SIZE, CELLS, cellTrees, TREE_STRIDE, vegetationWorld } from "@/lib/fps/br/vegetation";
import {
  createVegetation,
  fadeEnd,
  fadeShare,
  VEGETATION_VIEW,
  type TreeFade,
} from "@/lib/fps/br/vegetation-renderer";
import { WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};

let world: ReturnType<typeof vegetationWorld>;
beforeAll(async () => {
  const hf = await decodeHeightfield(buffer("public/fps/br/height.v2.hf"));
  const cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
  world = vegetationWorld(hf, cover, meta);
});

type Fade = { centre: { value: THREE.Vector3 }; fade: TreeFade };
/** The trees an instanced batch draws: position → the share of the dither it draws of each. */
function drawn(mesh: THREE.Mesh) {
  const g = mesh.geometry as THREE.InstancedBufferGeometry;
  const a = g.getAttribute("aTreeA").array as Float32Array;
  const { centre, fade } = (mesh.material as THREE.Material).userData["treeFade"] as Fade;
  const out = new Map<string, [number, number]>();
  for (let i = 0; i < g.instanceCount; i++) {
    const x = a[i * 4]!,
      z = a[i * 4 + 2]!;
    const share = fadeShare(
      fade,
      Math.hypot(x - centre.value.x, a[i * 4 + 1]! - centre.value.y, z - centre.value.z),
    );
    // As the shader: nothing of it at this distance, no triangles.
    if (share[0] < share[1]) out.set(`${x.toFixed(2)},${z.toFixed(2)}`, share);
  }
  return out;
}

describe("tree forms (full model, light model, far impostor)", () => {
  it("draws every tree in view while running, always one form of it whole, and none switching in one frame", () => {
    // The densest forest cell away from the map edge.
    let best = [0, 0, 0];
    for (let cj = 8; cj < CELLS - 8; cj += 3)
      for (let ci = 8; ci < CELLS - 8; ci += 3) {
        const n = cellTrees(world, ci, cj).length / TREE_STRIDE;
        if (n > best[0]!) best = [n, ci, cj];
      }
    const cx = (best[1]! + 0.5) * CELL_SIZE - WORLD_HALF,
      cz = (best[2]! + 0.5) * CELL_SIZE - WORLD_HALF;
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(80, 16 / 9, 0.1, 14000);
    const cam = new THREE.Vector3();
    let missing = 0,
      broken = 0,
      checked = 0,
      faded = 0,
      behind = 0,
      farModels = 0,
      jumped = 0;
    /** The detail form's share of each tree last frame. */
    let last = new Map<string, number>();
    // Run east at 5 m/s, one frame every 33 ms (0.165 m per frame), for 40 m.
    for (let step = 0; step < 240; step++) {
      const x = cx - 20 + step * 0.165;
      camera.position.set(x, world.hf.heightAt(x, cz) + 1.7, cz);
      camera.lookAt(x + 100, camera.position.y, cz);
      camera.updateMatrixWorld();
      veg.update(camera);
      cam.copy(camera.position);
      // Each tree's shares, form by form (a model is several meshes, one per material: they
      // share their instances, so one of them speaks for the form).
      const shares = new Map<string, Array<[number, number]>>();
      const detail = new Map<string, number>();
      for (const o of veg.root.children) {
        const mesh = o as THREE.Mesh;
        if (/-[1-9]$/.test(mesh.name)) continue;
        for (const [k, share] of drawn(mesh)) {
          (shares.get(k) ?? shares.set(k, []).get(k)!).push(share);
          if (mesh.name.includes("-detail")) detail.set(k, share[1] - share[0]);
        }
      }
      // A form's share of a tree changes by a few percent a frame at a run, never all at once
      // (a tree that has left the form had thinned to nothing first).
      for (const [k, share] of detail)
        if (last.has(k) && Math.abs(share - last.get(k)!) > 0.1) jumped++;
      for (const [k, share] of last) {
        if (detail.has(k) || share <= 0.1) continue;
        // Still in the picture (a tree that left it by the side went whole).
        const [tx, tz] = k.split(",").map(Number) as [number, number];
        if (tx - cam.x > Math.hypot(tx - cam.x, tz - cam.z) * 0.62) jumped++;
      }
      last = detail;
      for (let cj = best[2]! - 1; cj <= best[2]! + 1; cj++)
        for (let ci = best[1]! - 1; ci <= best[1]! + 1; ci++) {
          const t = cellTrees(world, ci, cj);
          for (let k = 0; k < t.length; k += TREE_STRIDE) {
            const dx = t[k]! - cam.x,
              dz = t[k + 2]! - cam.z;
            const d = Math.hypot(dx, dz);
            const key = `${t[k]!.toFixed(2)},${t[k + 2]!.toFixed(2)}`;
            const forms = shares.get(key) ?? [];
            // Models are for the trees on screen: none well behind the camera.
            if (d < 150 && dx < -d * 0.5 && d > 30 && forms.length > 1) behind++;
            // Every tree ahead within 160 m must be drawn, whole.
            if (d > 160 || dx < d * 0.62) continue;
            checked++;
            if (!forms.length) {
              missing++;
              continue;
            }
            // One form of the tree is whole (a tree is never see-through between two forms),
            // and at most two are drawn.
            const sorted = [...forms].sort((a, b) => a[0] - b[0]);
            if (!sorted.some(([from, to]) => from === 0 && to === 1) || sorted.length > 2) broken++;
            if (sorted.length > 1) faded++;
            // Beyond the light model's reach only the impostor is left.
            if (d > fadeEnd(VEGETATION_VIEW.nearDistance) && sorted.length !== 1) farModels++;
          }
        }
    }
    veg.dispose();
    expect(checked).toBeGreaterThan(1000);
    expect(missing).toBe(0);
    expect(broken).toBe(0);
    // The case is real here: trees were between two forms on the way.
    expect(faded).toBeGreaterThan(100);
    expect(jumped).toBe(0);
    expect(behind).toBe(0);
    expect(farModels).toBe(0);
  });

  it("draws a forest seen from the air as impostors only", () => {
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(80, 16 / 9, 0.1, 14000);
    camera.position.set(-1600, world.hf.heightAt(-1600, -3100) + 200, -3100);
    camera.lookAt(-1600, 0, -3101);
    camera.updateMatrixWorld();
    veg.update(camera);
    expect(veg.stats().trees).toBeGreaterThan(500);
    expect(veg.stats().near).toBe(0);
    veg.dispose();
  });

  it("holds every far cell in view through a turn without rebuilding on every frame of it", () => {
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 14000);
    const x = -1600,
      z = -3100,
      y = world.hf.heightAt(x, z) + 1.7;
    camera.position.set(x, y, z);
    const frustum = new THREE.Frustum(),
      box = new THREE.Box3(),
      m = new THREE.Matrix4();
    const before = () => veg.stats().rebuilds;
    let start = 0,
      checked = 0;
    // Right round in three seconds (2 degrees a frame).
    for (let f = 0; f <= 180; f++) {
      const a = (f * 2 * Math.PI) / 180;
      camera.lookAt(x + Math.sin(a) * 100, y, z + Math.cos(a) * 100);
      camera.updateMatrixWorld();
      veg.update(camera);
      if (f === 0) start = before();
      const far = new Set<string>();
      for (const o of veg.root.children) {
        const mesh = o as THREE.Mesh;
        if (!mesh.name.endsWith("-far")) continue;
        const g = mesh.geometry as THREE.InstancedBufferGeometry;
        const arr = g.getAttribute("aTreeA").array as Float32Array;
        for (let i = 0; i < g.instanceCount; i++)
          far.add(`${arr[i * 4]!.toFixed(2)},${arr[i * 4 + 2]!.toFixed(2)}`);
      }
      frustum.setFromProjectionMatrix(
        m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      );
      // Every cell whose trees stand in the camera's view, within the view distance.
      for (let cj = 0; cj < CELLS; cj += 1)
        for (let ci = 0; ci < CELLS; ci += 1) {
          const cx = (ci + 0.5) * CELL_SIZE - WORLD_HALF,
            cz = (cj + 0.5) * CELL_SIZE - WORLD_HALF;
          if (Math.hypot(cx - x, cz - z) > VEGETATION_VIEW.viewDistance - CELL_SIZE) continue;
          const t = cellTrees(world, ci, cj);
          if (!t.length) continue;
          box.min.set(cx - CELL_SIZE / 2, t[1]!, cz - CELL_SIZE / 2);
          box.max.set(cx + CELL_SIZE / 2, t[1]! + 20, cz + CELL_SIZE / 2);
          if (!frustum.intersectsBox(box)) continue;
          checked++;
          expect(far.has(`${t[0]!.toFixed(2)},${t[2]!.toFixed(2)}`), `cell ${ci},${cj}`).toBe(true);
        }
    }
    expect(checked).toBeGreaterThan(2000);
    // 180 frames of turning: the far batches were rebuilt a few times, not 180.
    expect(before() - start).toBeLessThan(40);
    veg.dispose();
  }, 120_000);

  it("keeps a tree whose trunk has left the view while its crown is still in it", () => {
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(80, 16 / 9, 0.1, 14000);
    // A tree 20 to 40 m away, seen just past the edge of the picture.
    let tree: [number, number, number] | null = null;
    for (let cj = 8; cj < CELLS - 8 && !tree; cj += 3)
      for (let ci = 8; ci < CELLS - 8 && !tree; ci += 3) {
        const t = cellTrees(world, ci, cj);
        if (t.length) tree = [t[0]!, t[1]!, t[2]!];
      }
    const [tx, ty, tz] = tree!;
    camera.position.set(tx - 30, ty + 1.7, tz);
    // Half the horizontal view is 56 degrees: the trunk at 59, its crown reaching back in.
    const off = (59 * Math.PI) / 180;
    camera.lookAt(camera.position.x + Math.cos(off), camera.position.y, tz + Math.sin(off));
    camera.updateMatrixWorld();
    veg.update(camera);
    const key = `${tx.toFixed(2)},${tz.toFixed(2)}`;
    const forms = veg.root.children.filter((o) => drawn(o as THREE.Mesh).has(key));
    expect(forms.map((o) => o.name).some((n) => n.includes("-detail"))).toBe(true);
    veg.dispose();
  });

  it("draws every tree it selected after the view grows (three.js caps a geometry at its first size)", () => {
    // Owner, 2026-11-10 and 11-11: "trees vanish in some specific camera angles", same spot.
    // three.js notes how many instances a geometry's attributes hold the first time it is drawn
    // (WebGLBindingStates: _maxInstanceCount) and never draws more from that geometry. This
    // mimics that rule: a batch that grew must be a geometry the renderer has not capped.
    const drawnBy = (mesh: THREE.Mesh) => {
      const g = mesh.geometry as THREE.InstancedBufferGeometry & { _maxInstanceCount?: number };
      g._maxInstanceCount ??= g.getAttribute("aTreeA").count;
      return Math.min(g.instanceCount, g._maxInstanceCount);
    };
    const veg = createVegetation(world, null);
    const camera = new THREE.PerspectiveCamera(88, 2.1, 0.1, 14000);
    // The southern island: out to sea first (few trees), then round the compass.
    const x = -300,
      z = 3300,
      y = world.hf.heightAt(x, z) + 3;
    camera.position.set(x, y, z);
    let grew = 0,
      most = 0;
    for (const [dx, dz] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
      [-0.7, -0.7],
      [0, 1],
    ]) {
      camera.lookAt(x + dx! * 100, y, z + dz! * 100);
      camera.updateMatrixWorld();
      const before = veg.root.children.map((o) => (o as THREE.Mesh).geometry);
      veg.update(camera);
      veg.root.children.forEach((o, i) => {
        const mesh = o as THREE.Mesh;
        const g = mesh.geometry as THREE.InstancedBufferGeometry;
        if (g !== before[i]) grew++;
        most = Math.max(most, g.instanceCount);
        expect(g.getAttribute("aTreeA").count).toBeGreaterThanOrEqual(g.instanceCount);
        expect(drawnBy(mesh), mesh.name).toBe(g.instanceCount);
      });
    }
    // The case is real here: batches outgrew their first size while turning.
    expect(grew).toBeGreaterThan(0);
    expect(most).toBeGreaterThan(1024);
  });
});
