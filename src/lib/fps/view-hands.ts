import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Fixed grip meshes in weapon-local space; no per-frame geometry allocation. */
export function createViewHands(glove: THREE.Material, cloth: THREE.Material) {
  const root = new THREE.Group();
  root.name = "first-person-grip";
  const support = new THREE.Group(),
    trigger = new THREE.Group();
  support.name = "support-hand";
  trigger.name = "trigger-hand";
  root.add(support, trigger);
  const ellipsoid = (parent: THREE.Group, name: string, position: number[], scale: number[]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), glove);
    mesh.name = name;
    mesh.position.set(position[0]!, position[1]!, position[2]!);
    mesh.scale.set(scale[0]!, scale[1]!, scale[2]!);
    parent.add(mesh);
  };
  const finger = (parent: THREE.Group, name: string, points: number[][], radius: number) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius, 7, false), glove);
    mesh.name = name;
    parent.add(mesh);
    ellipsoid(parent, `${name}-tip`, points[points.length - 1]!, [radius, radius, radius]);
  };
  const sleeve = (parent: THREE.Group, wrist: THREE.Vector3, elbow: THREE.Vector3) => {
    const direction = wrist.clone().sub(elbow),
      length = direction.length();
    const geometry = new THREE.CylinderGeometry(0.036, 0.075, length, 16, 20);
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i),
        angle = Math.atan2(positions.getZ(i), positions.getX(i));
      const fold = 1 + Math.sin(y * 135 + Math.sin(angle * 3) * 2) * 0.085;
      positions.setXYZ(i, positions.getX(i) * fold, y, positions.getZ(i) * fold);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, cloth);
    mesh.name = "folded-sleeve";
    mesh.position.copy(wrist).add(elbow).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(mesh);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.039, 0.028, 16), glove);
    cuff.position.copy(wrist).addScaledVector(direction, -0.012);
    cuff.quaternion.copy(mesh.quaternion);
    parent.add(cuff);
  };
  // Palm cups the left side; four separated fingers curl under and up the right side.
  sleeve(support, new THREE.Vector3(-0.065, -0.064, -0.235), new THREE.Vector3(-0.32, -0.43, 0.23));
  ellipsoid(support, "support-palm", [-0.047, -0.027, -0.267], [0.024, 0.036, 0.053]);
  for (let i = 0; i < 4; i++) {
    const z = -0.31 + i * 0.022;
    finger(
      support,
      `support-finger-${i}`,
      [
        [-0.049, -0.026, z],
        [-0.032, -0.05, z],
        [0.005, -0.054, z],
        [0.039, -0.035, z],
        [0.039, -0.005, z],
      ],
      0.009,
    );
    ellipsoid(support, `support-knuckle-${i}`, [-0.063, -0.018, z], [0.009, 0.014, 0.009]);
  }
  finger(
    support,
    "support-thumb",
    [
      [-0.061, -0.002, -0.231],
      [-0.05, 0.012, -0.243],
      [-0.025, 0.025, -0.26],
      [0.015, 0.026, -0.275],
    ],
    0.012,
  );
  sleeve(trigger, new THREE.Vector3(0.052, -0.145, 0.17), new THREE.Vector3(0.25, -0.44, 0.39));
  ellipsoid(trigger, "trigger-palm", [0.04, -0.102, 0.141], [0.025, 0.047, 0.033]);
  for (let i = 0; i < 3; i++) {
    const y = -0.083 - i * 0.024;
    finger(
      trigger,
      `trigger-finger-${i}`,
      [
        [0.047, y, 0.139],
        [0.031, y, 0.106],
        [-0.005, y, 0.103],
        [-0.031, y, 0.12],
      ],
      0.009,
    );
  }
  finger(
    trigger,
    "index-finger",
    [
      [0.05, -0.063, 0.131],
      [0.045, -0.05, 0.095],
      [0.022, -0.049, 0.065],
      [0.005, -0.052, 0.066],
    ],
    0.008,
  );
  finger(
    trigger,
    "trigger-thumb",
    [
      [0.035, -0.075, 0.159],
      [0.003, -0.059, 0.161],
      [-0.03, -0.065, 0.14],
    ],
    0.011,
  );
  // Bake fixed fingers/cuffs into four material draws; keep each hand movable for reload.
  for (const hand of [support, trigger])
    for (const material of [glove, cloth]) {
      const parts = hand.children.filter(
        (part): part is THREE.Mesh => part instanceof THREE.Mesh && part.material === material,
      );
      const baked = parts.map((part) => {
        part.updateMatrix();
        return part.geometry.clone().applyMatrix4(part.matrix);
      });
      const combined = mergeGeometries(baked)!;
      for (const part of parts) {
        part.removeFromParent();
        part.geometry.dispose();
      }
      for (const geometry of baked) geometry.dispose();
      const mesh = new THREE.Mesh(combined, material);
      mesh.name = `${hand.name}-${material === glove ? "glove" : "sleeve"}`;
      hand.add(mesh);
    }
  root.traverse((object) => object.layers.set(1));
  return {
    root,
    update(pistol: boolean, reload: number) {
      support.visible = !pistol;
      trigger.position.set(0, pistol ? 0.04 : 0, pistol ? -0.19 : 0);
      support.position.y = -reload * 0.06;
      support.rotation.x = reload * 0.12;
    },
  };
}
