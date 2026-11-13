import * as THREE from "three";
import { PERK_EFFECT } from "./perks";

/**
 * The Tracker perk's footprints (owner, 2026-11-13: "Reveal recent enemy footprints within 20
 * meters … subtle ground indicators. Avoid excessive particle effects and draw calls"): the
 * prints the server sends (match.ts trackerPrints: only to a carrier with the perk on, only
 * within its radius, never younger than a second) as one instanced draw of flat boot marks on
 * the ground, fading with age. Depth-tested like anything else on the ground: nothing shows
 * through a wall or a floor. No particles, no per-frame allocation, nothing drawn without prints.
 */
export function createTrackerRenderer(scene: THREE.Object3D) {
  const T = PERK_EFFECT.tracker;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 64;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff";
  // A boot print, toe up the texture: the sole, the gap of the arch, the heel.
  g.beginPath();
  g.ellipse(16, 22, 10, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.clearRect(0, 40, 32, 5);
  g.beginPath();
  g.ellipse(16, 53, 8, 8, 0, 0, Math.PI * 2);
  g.fill();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(0.16, 0.34).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    // Additive: a print's colour scales with its age (black adds nothing), so one material and
    // the instance colours do the fade.
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    fog: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, T.max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.name = "tracker-footprints";
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    up = new THREE.Vector3(0, 1, 0),
    color = new THREE.Color();
  /** The latest list: x, y, z, yaw, age in tenths of a second when it was sent. */
  let prints: readonly number[] = [];
  let at = 0;
  return {
    mesh,
    /** A new list from the server (it replaces the last; empty clears the marks). */
    apply(list: readonly number[], now: number) {
      prints = list;
      at = now;
      const n = Math.min(T.max, Math.floor(list.length / 5));
      mesh.count = n;
      mesh.visible = n > 0;
      for (let i = 0; i < n; i++) {
        const x = list[i * 5]!,
          y = list[i * 5 + 1]!,
          z = list[i * 5 + 2]!,
          yaw = list[i * 5 + 3]!;
        // Left and right boots either side of the line walked (the side from where it is).
        const side = (Math.round(x * 7 + z * 13) & 1 ? 1 : -1) * 0.11;
        p.set(x + Math.cos(yaw) * side, y + 0.03, z - Math.sin(yaw) * side);
        q.setFromAxisAngle(up, yaw);
        mesh.setMatrixAt(i, m.compose(p, q, one));
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    /** The fade, each frame while any print shows (colours only). */
    update(now: number) {
      if (!mesh.count) return;
      for (let i = 0; i < mesh.count; i++) {
        const age = prints[i * 5 + 4]! * 100 + (now - at);
        const k = Math.max(0, 1 - age / T.lifeMs);
        mesh.setColorAt(i, color.setRGB(1.0 * k, 0.55 * k, 0.12 * k));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      map.dispose();
    },
  };
}
