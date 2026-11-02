import { test, expect } from "@playwright/test";

/**
 * The shipped aim-arena GLB (meshopt, as the game loads it): no two same-facing triangles share
 * a plane and overlap (z-fighting), and the rendered surface of every gameplay box sits on its
 * collision face (no invisible walls, no visual-only cover) — probed by rays at chest height.
 */
test("aim arena GLB has no coplanar overlaps and its surfaces sit on the collision faces", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await page.route("**/__surface_depth__", (r) =>
    r.fulfill({ contentType: "text/html", body: "<!doctype html><body></body>" }),
  );
  await page.goto("/__surface_depth__");
  const result = await page.evaluate(async () => {
    const THREE: typeof import("three") = await import(
      "/node_modules/three/build/three.module.js" as string
    );
    const { createArenaEnvironment } = await import("/src/lib/fps/arena-environment.ts" as string);
    const { BOXES, ARENA } = await import("/src/lib/fps/map.ts" as string);
    const { DEFAULT_MAP_ID } = await import("/src/lib/fps/maps/registry.ts" as string);
    const scene = new THREE.Scene();
    const env = createArenaEnvironment(scene);
    await env.ready;
    scene.updateMatrixWorld(true);
    // The registry names the authored scene after the map id (arena-environment.ts).
    const map = scene.getObjectByName(DEFAULT_MAP_ID);
    if (!map) return { loaded: false };
    const meshes: import("three").Mesh[] = [];
    map.traverse((o: import("three").Object3D) => {
      if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh)) meshes.push(o);
    });
    // Coplanar same-facing overlap scan (plane buckets, then 2D separating-axis test).
    type Tri = { p: number[][]; mesh: string };
    const planes = new Map<string, Tri[]>();
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      n = new THREE.Vector3();
    let triangles = 0;
    for (const mesh of meshes) {
      const g = mesh.geometry,
        pos = g.getAttribute("position"),
        index = g.getIndex();
      const count = index ? index.count : pos.count;
      for (let i = 0; i < count; i += 3) {
        const ia = index ? index.getX(i) : i,
          ib = index ? index.getX(i + 1) : i + 1,
          ic = index ? index.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
        n.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        if (n.length() < 1e-9) continue;
        n.normalize();
        triangles++;
        // Quantized positions round to ~1 mm, so bucket planes at 2 mm.
        const key =
          [n.x, n.y, n.z].map((v) => Math.round(v * 200)).join(",") +
          "|" +
          Math.round(n.dot(a) * 500);
        const list = planes.get(key) ?? [];
        list.push({ p: [a.toArray(), b.toArray(), c.toArray()], mesh: mesh.name });
        planes.set(key, list);
      }
    }
    const project = (t: Tri, axis: number) => t.p.map((v) => v.filter((_, i) => i !== axis));
    const separated = (s: number[][], t: number[][]) => {
      for (const tri of [s, t])
        for (let i = 0; i < 3; i++) {
          const p = tri[i]!,
            q = tri[(i + 1) % 3]!;
          const ax = [p[1]! - q[1]!, q[0]! - p[0]!];
          const len = Math.hypot(ax[0]!, ax[1]!);
          if (len < 1e-12) continue;
          const proj = (u: number[][]) => u.map((v) => (v[0]! * ax[0]! + v[1]! * ax[1]!) / len);
          const ps = proj(s),
            pt = proj(t);
          if (
            Math.max(...ps) <= Math.min(...pt) + 2e-3 ||
            Math.max(...pt) <= Math.min(...ps) + 2e-3
          )
            return true;
        }
      return false;
    };
    const overlaps: string[] = [];
    for (const [key, list] of planes) {
      if (list.length < 2 || list.length > 4000) continue;
      const normal = key.split("|")[0]!.split(",").map(Number);
      const mags = normal.map(Math.abs);
      const axis = mags.indexOf(Math.max(...mags));
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++)
          if (!separated(project(list[i]!, axis), project(list[j]!, axis)))
            overlaps.push(
              `${list[i]!.mesh} / ${list[j]!.mesh} @ ${list[i]!.p[0]!.map((v) => v.toFixed(2))}`,
            );
    }
    // Visual/collision agreement: rays toward each free face of every gameplay box at 1.0 m.
    const raycaster = new THREE.Raycaster();
    const misses: string[] = [];
    let probes = 0;
    const { isMovementBlocked } = await import("/src/lib/fps/simulation.ts" as string);
    for (const box of BOXES) {
      const top = box.y + box.h / 2;
      const y = Math.min(1.0, top - 0.15);
      if (y < 0.2 || box.y - box.h / 2 > y) continue;
      for (const [nx, nz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const half = nx ? box.w / 2 : box.d / 2;
        const ox = box.x + nx * (half + 0.6),
          oz = box.z + nz * (half + 0.6);
        if (Math.abs(ox) > ARENA.width / 2 || Math.abs(oz) > ARENA.depth / 2) continue;
        if (isMovementBlocked(ox, 0, oz)) continue;
        raycaster.set(new THREE.Vector3(ox, y, oz), new THREE.Vector3(-nx, 0, -nz));
        raycaster.far = 0.8;
        const hit = raycaster.intersectObjects(meshes, false)[0];
        probes++;
        const offset = hit ? 0.6 - hit.distance : Infinity;
        if (!(Math.abs(offset) <= 0.065)) misses.push(`${box.id} ${nx},${nz} offset ${offset}`);
      }
    }
    env.dispose();
    return { loaded: true, meshes: meshes.length, triangles, overlaps, probes, misses };
  });
  await info.attach("arena-surface-depth", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(result.loaded).toBe(true);
  expect(result.overlaps).toEqual([]);
  expect(result.probes).toBeGreaterThan(100);
  expect(result.misses).toEqual([]);
});
