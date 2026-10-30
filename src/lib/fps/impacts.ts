import * as THREE from "three";
import type { WorldHit } from "./collision";

const MARKS = 96,
  PARTICLES = 96;
/** Fixed pools: continuous automatic fire never allocates new meshes or listeners. */
export function createImpactEffects(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const pen = canvas.getContext("2d")!,
    gradient = pen.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, "rgba(12,12,10,.95)");
  gradient.addColorStop(0.3, "rgba(26,23,19,.75)");
  gradient.addColorStop(1, "rgba(38,34,29,0)");
  pen.fillStyle = gradient;
  pen.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const particleCanvas = document.createElement("canvas");
  particleCanvas.width = particleCanvas.height = 32;
  const particlePen = particleCanvas.getContext("2d")!,
    fade = particlePen.createRadialGradient(16, 16, 0, 16, 16, 16);
  fade.addColorStop(0, "rgba(255,255,255,.9)");
  fade.addColorStop(0.3, "rgba(255,255,255,.5)");
  fade.addColorStop(1, "rgba(255,255,255,0)");
  particlePen.fillStyle = fade;
  particlePen.fillRect(0, 0, 32, 32);
  const particleTexture = new THREE.CanvasTexture(particleCanvas);
  const marks = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    MARKS,
  );
  marks.count = 0;
  marks.frustumCulled = false;
  scene.add(marks);
  const positions = new Float32Array(PARTICLES * 3).fill(100000),
    tails = new Float32Array(PARTICLES * 6).fill(100000),
    colors = new Float32Array(PARTICLES * 3),
    lineColors = new Float32Array(PARTICLES * 6);
  const velocity = new Float32Array(PARTICLES * 3),
    birth = new Float64Array(PARTICLES),
    kind = new Uint8Array(PARTICLES);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const dust = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.045,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);
  const linesGeometry = new THREE.BufferGeometry();
  linesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(tails, 3).setUsage(THREE.DynamicDrawUsage),
  );
  linesGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
  const lines = new THREE.LineSegments(
    linesGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  lines.frustumCulled = false;
  scene.add(lines);
  let markIndex = 0,
    particleIndex = 0;
  const dummy = new THREE.Object3D(),
    axis = new THREE.Vector3(0, 0, 1),
    normal = new THREE.Vector3();
  return {
    emit(hit: WorldHit, now: number) {
      normal.set(hit.normal.x, hit.normal.y, hit.normal.z);
      dummy.position.set(
        hit.point.x + normal.x * 0.008,
        hit.point.y + normal.y * 0.008,
        hit.point.z + normal.z * 0.008,
      );
      dummy.quaternion.setFromUnitVectors(axis, normal);
      dummy.scale.setScalar(hit.surface === "metal" ? 0.055 : 0.085);
      dummy.updateMatrix();
      marks.setMatrixAt(markIndex++ % MARKS, dummy.matrix);
      marks.count = Math.min(MARKS, markIndex);
      marks.instanceMatrix.needsUpdate = true;
      for (let n = 0; n < 4; n++) {
        const i = particleIndex++ % PARTICLES,
          j = i * 3;
        birth[i] = now;
        kind[i] = hit.surface === "concrete" ? 0 : 1;
        positions[j] = dummy.position.x;
        positions[j + 1] = dummy.position.y;
        positions[j + 2] = dummy.position.z;
        velocity[j] = (normal.x * 0.6 + (Math.random() - 0.5)) * 1.6;
        velocity[j + 1] = normal.y * 0.8 + Math.random() * 1.4;
        velocity[j + 2] = (normal.z * 0.6 + Math.random() - 0.5) * 1.6;
        const color =
          hit.surface === "metal"
            ? [1, 0.66, 0.24]
            : hit.surface === "wood"
              ? [0.55, 0.36, 0.18]
              : [0.6, 0.59, 0.54];
        for (let c = 0; c < 3; c++) {
          colors[j + c] = color[c]!;
          lineColors[i * 6 + c] = color[c]!;
          lineColors[i * 6 + 3 + c] = color[c]!;
        }
      }
      geometry.getAttribute("color").needsUpdate = true;
      linesGeometry.getAttribute("color").needsUpdate = true;
    },
    update(dt: number, now: number) {
      const seconds = Math.min(dt, 50) / 1000;
      for (let i = 0; i < PARTICLES; i++) {
        const j = i * 3,
          k = i * 6,
          alive = birth[i]! > 0 && now - birth[i]! < (kind[i] ? 180 : 350);
        if (!alive) {
          positions[j] = 100000;
          tails[k] = tails[k + 3] = 100000;
          continue;
        }
        velocity[j + 1] = velocity[j + 1]! - 7 * seconds;
        for (let c = 0; c < 3; c++) {
          positions[j + c] = positions[j + c]! + velocity[j + c]! * seconds;
          tails[k + c] = kind[i] ? positions[j + c]! : 100000;
          tails[k + 3 + c] = kind[i] ? positions[j + c]! - velocity[j + c]! * 0.025 : 100000;
        }
      }
      geometry.getAttribute("position").needsUpdate = true;
      linesGeometry.getAttribute("position").needsUpdate = true;
    },
    reset() {
      marks.count = 0;
      markIndex = 0;
      birth.fill(0);
      positions.fill(100000);
      tails.fill(100000);
    },
    dispose() {
      texture.dispose();
      particleTexture.dispose();
    },
  };
}
