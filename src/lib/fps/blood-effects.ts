import * as THREE from "three";
import { DEFAULT_MAP, type GameMap } from "./maps/registry";
import type { MatchState } from "./protocol";
type Hit = NonNullable<MatchState["events"][number]["hit"]>;
const MARKS = 48,
  DROPS = 96;
/** A bounded cosmetic pool. Server hit records choose the surface; no client damage calculation. */
export function createBloodEffects(scene: THREE.Scene, map: GameMap = DEFAULT_MAP) {
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
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: THREE.FrontSide,
  });
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MARKS);
  marks.name = "confirmed-blood-splatter";
  marks.count = 0;
  marks.frustumCulled = false;
  scene.add(marks);
  const positions = new Float32Array(DROPS * 3).fill(100000),
    velocity = new Float32Array(DROPS * 3),
    born = new Float64Array(DROPS),
    geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const particles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      map: texture,
      size: 0.025,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  particles.name = "confirmed-blood-drops";
  particles.frustumCulled = false;
  scene.add(particles);
  const dummy = new THREE.Object3D(),
    axis = new THREE.Vector3(0, 0, 1),
    normal = new THREE.Vector3();
  let mark = 0,
    drop = 0,
    activeUntil = 0;
  particles.visible = false;
  return {
    emit(hit: Hit, now: number) {
      activeUntil = now + 230;
      particles.visible = true;
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
      for (let n = 0; n < 8; n++) {
        const i = drop++ % DROPS,
          j = i * 3;
        born[i] = now;
        positions[j] = hit.point.x;
        positions[j + 1] = hit.point.y;
        positions[j + 2] = hit.point.z;
        velocity[j] = hit.direction.x * (0.8 + random()) + (random() - 0.5) * 0.8;
        velocity[j + 1] = hit.direction.y * 0.6 + random() * 0.6;
        velocity[j + 2] = hit.direction.z * (0.8 + random()) + (random() - 0.5) * 0.8;
      }
    },
    update(dt: number, now: number) {
      if (!particles.visible) return;
      if (now >= activeUntil) {
        particles.visible = false;
        return;
      }
      const seconds = Math.min(50, dt) / 1000;
      for (let i = 0; i < DROPS; i++) {
        const j = i * 3;
        if (born[i] === 0 || now - born[i]! > 230) {
          positions[j] = 100000;
          continue;
        }
        velocity[j + 1] = velocity[j + 1]! - 5 * seconds;
        for (let c = 0; c < 3; c++)
          positions[j + c] = positions[j + c]! + velocity[j + c]! * seconds;
      }
      geometry.getAttribute("position").needsUpdate = true;
    },
    reset() {
      marks.count = 0;
      mark = 0;
      born.fill(0);
      activeUntil = 0;
      particles.visible = false;
      positions.fill(100000);
      geometry.getAttribute("position").needsUpdate = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}
