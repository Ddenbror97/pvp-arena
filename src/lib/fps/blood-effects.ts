import * as THREE from "three";
import { decalDepthOffset } from "./maps/depth-layers";
import { DEFAULT_MAP, type GameMap } from "./maps/registry";
import type { FleshHit } from "./impacts";
import type { MatchState } from "./protocol";
type Hit = NonNullable<MatchState["events"][number]["hit"]>;
const MARKS = 48;
/** The shared particle pool's part (impacts.ts `flesh`): the mist, the burst and the drops. */
export type FleshParticles = { flesh(hit: FleshHit, now: number): void };
/**
 * A hit on a body, 1v1 and 5v5: the stain on a wall behind (a bounded pool of its own) and the
 * red mist at the wound, which is drawn from the bullet impacts' particle pool (owner,
 * 2026-11-27; until then eight 2.5 cm points from a pool here, gone in 0.23 s). Server hit
 * records choose the place and the surface; no client damage calculation.
 */
export function createBloodEffects(
  scene: THREE.Scene,
  map: GameMap = DEFAULT_MAP,
  particles?: FleshParticles,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const pen = canvas.getContext("2d")!;
  let seed = 93;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let n = 0; n < 42; n++) {
    const angle = random() * Math.PI * 2,
      radius = Math.pow(random(), 1.7) * 49,
      r = 2 + random() * 9;
    pen.fillStyle = n % 3 ? "rgba(91,6,12,.8)" : "rgba(127,12,19,.75)";
    pen.beginPath();
    pen.ellipse(
      64 + Math.cos(angle) * radius,
      64 + Math.sin(angle) * radius,
      r,
      r * (0.4 + random()),
      angle,
      0,
      Math.PI * 2,
    );
    pen.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    ...decalDepthOffset(2),
    side: THREE.FrontSide,
  });
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MARKS);
  marks.name = "confirmed-blood-splatter";
  marks.count = 0;
  marks.frustumCulled = false;
  scene.add(marks);
  const dummy = new THREE.Object3D(),
    axis = new THREE.Vector3(0, 0, 1),
    normal = new THREE.Vector3();
  let mark = 0;
  const flesh: FleshHit = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 0 } };
  return {
    /**
     * `mist: false` for a hit on the body the camera is in (your own, or the player you watch
     * through): the cloud would be in the lens. `at`: where the wound is drawn, when the body
     * on screen is not where the server's record has it (`anchorHit`).
     */
    emit(
      hit: Hit,
      now: number,
      options?: { mist?: boolean | undefined; at?: Hit["point"] | undefined },
    ) {
      if (hit.splatter) {
        const surface = hit.splatter;
        normal.set(surface.normal.x, surface.normal.y, surface.normal.z);
        dummy.position.set(
          surface.point.x + normal.x * 0.012,
          surface.point.y + normal.y * 0.012,
          surface.point.z + normal.z * 0.012,
        );
        dummy.quaternion.setFromUnitVectors(axis, normal);
        dummy.rotateZ(random() * Math.PI * 2);
        const solid = map.worldSolids.find((s) => s.id === surface.solidId);
        const axes =
          Math.abs(normal.y) > 0.5
            ? ([
                ["x", "w"],
                ["z", "d"],
              ] as const)
            : Math.abs(normal.x) > 0.5
              ? ([
                  ["y", "h"],
                  ["z", "d"],
                ] as const)
              : ([
                  ["x", "w"],
                  ["y", "h"],
                ] as const);
        const edge = solid
          ? Math.min(
              ...axes.map(
                ([axis, size]) => solid[size] / 2 - Math.abs(surface.point[axis] - solid[axis]),
              ),
            )
          : 0.25;
        dummy.scale.setScalar(
          Math.max(0.01, Math.min(hit.zone === "head" ? 0.32 : 0.25, edge * 1.4)),
        );
        dummy.updateMatrix();
        marks.setMatrixAt(mark++ % MARKS, dummy.matrix);
        marks.count = Math.min(MARKS, mark);
        marks.instanceMatrix.needsUpdate = true;
      }
      if (particles && options?.mist !== false) {
        flesh.point = options?.at ?? hit.point;
        flesh.direction = hit.direction;
        flesh.zone = hit.zone;
        particles.flesh(flesh, now);
      }
    },
    reset() {
      marks.count = 0;
      mark = 0;
    },
    dispose() {
      scene.remove(marks);
      marks.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
