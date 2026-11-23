import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { islandPanes, paneOwners } from "@/lib/fps/br/panes";
import { createPaneRenderer } from "@/lib/fps/br/pane-renderer";
import type { Placement } from "@/lib/fps/br/layout";

/**
 * Owner, 2026-11-23: "the glass in the windows we built to buildings is spinning and not
 * sitting correctly". The shards of a broken pane and the whole panes shared one scratch
 * rotation and size: after a break every window drawn took the last shard's spin.
 */
describe("window glass after a pane breaks", () => {
  const places = [
    { model: "house", x: 0, y: 0, z: 0, turn: 0, poi: "t" },
    { model: "condo-floor", x: 60, y: 0, z: 0, turn: 1, poi: "t" },
    { model: "bauhaus-block", x: -60, y: 2, z: 30, turn: 3, poi: "t" },
  ] as Placement[];
  const set = islandPanes(places);

  it("keeps every pane square and in its opening while the shards fly", () => {
    expect(set.count).toBeGreaterThan(30);
    const scene = new THREE.Scene();
    const panes = createPaneRenderer(scene, set, () => true, {
      owner: paneOwners(places),
      drawn: () => true,
    });
    const meshes = scene.children.filter(
      (o) => (o as THREE.InstancedMesh).isInstancedMesh,
    ) as THREE.InstancedMesh[];
    // A window of the house and a planned pane of the storey, with shards.
    const window = set.placement.findIndex((p) => p === 0);
    const planned = set.placement.findIndex((p, i) => p < 0 && paneOwners(places)[i] === 1);
    expect(window).toBeGreaterThanOrEqual(0);
    expect(planned).toBeGreaterThanOrEqual(0);
    panes.update(16);
    panes.apply([window, planned], true);
    const m = new THREE.Matrix4(),
      pos = new THREE.Vector3(),
      turn = new THREE.Quaternion(),
      size = new THREE.Vector3();
    let checked = 0,
      shards = 0;
    // Half a second of shards in flight, the windows rewritten every few frames.
    for (let f = 0; f < 30; f++) {
      panes.update(16);
      for (const mesh of meshes) {
        if (mesh.geometry.type === "PlaneGeometry") {
          shards = Math.max(shards, mesh.count);
          continue;
        }
        for (let k = 0; k < mesh.count; k++) {
          mesh.getMatrixAt(k, m);
          if (m.determinant() === 0) continue; // a hidden (broken) pane
          m.decompose(pos, turn, size);
          expect(turn.angleTo(new THREE.Quaternion()), `frame ${f}`).toBeLessThan(1e-6);
          // Somewhere a pane is: its box' centre and extent.
          let match = false;
          for (let id = 0; id < set.count && !match; id++) {
            const b = set.boxes.subarray(id * 6, id * 6 + 6);
            if (
              Math.abs((b[0]! + b[3]!) / 2 - pos.x) < 1e-3 &&
              Math.abs((b[1]! + b[4]!) / 2 - pos.y) < 1e-3 &&
              Math.abs((b[2]! + b[5]!) / 2 - pos.z) < 1e-3
            ) {
              match =
                Math.abs(b[4]! - b[1]! - size.y) < 1e-3 &&
                size.x <= b[3]! - b[0]! + 1e-3 &&
                size.z <= b[5]! - b[2]! + 1e-3 &&
                Math.max(size.x, size.z) > 0.2;
            }
          }
          expect(match, `frame ${f}: a pane that is not where any pane is`).toBe(true);
          checked++;
        }
      }
    }
    expect(shards).toBeGreaterThan(20);
    expect(checked).toBeGreaterThan(set.count * 20);
    panes.dispose();
  });
});
