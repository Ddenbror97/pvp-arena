import * as THREE from "three";
import type { Solid } from "./map";
import { retainAuthoredAsset } from "./authored-assets";
import { DEFAULT_MAP, type GameMap } from "./maps/registry";

/** Dustfront's Blender-built render scene (art/blender/map); dresses exactly its solids. */
export const ARENA_MAP_URL = DEFAULT_MAP.presentation.modelUrl;

/** What the renderer needs from a map's render scene. */
export type MapEnvironment = {
  /** Resolves once the authored scene replaced the blockout (or failed and kept it). */
  ready: Promise<void>;
  /** Bounds of the playable rectangle, for shadow framing. */
  bounds: { width: number; depth: number };
  /**
   * Optional per-drawn-frame update for animated scenery (water, wind), with the same arguments
   * as the impact pools: frame delta (ms, capped at 100) and the frame timestamp (ms). Prefer shader uniforms:
   * the world scene does not auto-update matrices. Omit it for static maps (no idle work).
   */
  update?: (dt: number, now: number) => void;
  /**
   * Optional scenery quality. "low" may thin distant decoration (never gameplay solids or
   * anything that changes what players can see of each other); maps without it ignore it.
   */
  setQuality?: (quality: "high" | "low") => void;
  dispose: () => void;
};

/**
 * A map's render scene. A plain blockout built from the map's gameplay solids is visible at once
 * (and remains as the fallback if the GLB cannot load); the authored scene replaces it when
 * `ready` resolves. Gameplay never reads these meshes: movement, bullets and visibility use the
 * map's solids. Static: the renderer freezes matrices, captures reflections and renders the
 * shadow map once after `ready`.
 */
export function createArenaEnvironment(
  scene: THREE.Scene,
  map: GameMap = DEFAULT_MAP,
): MapEnvironment {
  const { lighting, sky: skyColours, blockout: tints } = map.presentation;
  let disposed = false;
  const owned = {
    geometries: new Set<THREE.BufferGeometry>(),
    materials: new Set<THREE.Material>(),
    textures: new Set<THREE.Texture>(),
  };
  // A cheap gradient dome (zenith to hazy horizon) with a soft glow around the sun, in display
  // range so it neither blows out under ACES nor over-brightens the reflection capture.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        zenith: { value: new THREE.Color(skyColours.zenith) },
        horizon: { value: new THREE.Color(skyColours.horizon) },
        haze: { value: new THREE.Color(skyColours.haze) },
        sunDirection: { value: new THREE.Vector3(...lighting.sun.position).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 zenith, horizon, haze, sunDirection;
        varying vec3 vDirection;
        void main() {
          vec3 d = normalize(vDirection);
          float up = clamp(d.y, 0.0, 1.0);
          vec3 color = mix(horizon, zenith, pow(up, 0.55));
          color = mix(haze, color, smoothstep(-0.05, 0.12, d.y));
          float sun = max(dot(d, sunDirection), 0.0);
          color += vec3(1.0, 0.86, 0.62) * (pow(sun, 600.0) * 1.2 + pow(sun, 12.0) * 0.18);
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.frustumCulled = false;
  sky.castShadow = false;
  sky.receiveShadow = false;
  sky.renderOrder = -1;
  sky.name = "sky";
  scene.add(sky);
  owned.geometries.add(sky.geometry);
  owned.materials.add(sky.material);

  // Blockout: one merged mesh per surface, from the same solids the server simulates.
  const blockout = new THREE.Group();
  blockout.name = "arena-blockout";
  const tint: Record<Solid["surface"], number> = tints;
  const unit = new THREE.BoxGeometry(1, 1, 1);
  owned.geometries.add(unit);
  for (const surface of ["concrete", "metal", "wood"] as const) {
    const solids = [...map.boxes, ...map.structures, ...map.walls].filter(
      (s) => s.surface === surface,
    );
    const material = new THREE.MeshStandardMaterial({ color: tint[surface], roughness: 0.85 });
    owned.materials.add(material);
    const mesh = new THREE.InstancedMesh(unit, material, solids.length);
    const matrix = new THREE.Matrix4();
    solids.forEach((s, i) =>
      mesh.setMatrixAt(
        i,
        matrix.compose(
          new THREE.Vector3(s.x, s.y, s.z),
          new THREE.Quaternion(),
          new THREE.Vector3(s.w, s.h, s.d),
        ),
      ),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `blockout-${surface}`;
    blockout.add(mesh);
  }
  const floorMaterial = new THREE.MeshStandardMaterial({ color: tints.floor, roughness: 0.9 });
  owned.materials.add(floorMaterial);
  const floor = new THREE.Mesh(unit, floorMaterial);
  floor.position.set(map.floor.x, map.floor.y, map.floor.z);
  floor.scale.set(map.floor.w + 12, map.floor.h, map.floor.d + 12);
  floor.receiveShadow = true;
  blockout.add(floor);
  scene.add(blockout);

  const asset = retainAuthoredAsset(map.presentation.modelUrl);
  let authored: THREE.Object3D | undefined;
  const ready = asset.ready
    .then((gltf) => {
      if (disposed) return;
      // Clone the node tree only: geometry, materials and textures stay shared with the cached
      // source (released by `asset.release()`), and frustum culling stays on per section.
      authored = gltf.scene.clone(true);
      authored.name = map.id;
      authored.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const extras = object.userData as { castShadow?: boolean; noShadow?: boolean };
        object.receiveShadow = true;
        // Big static masses cast; foliage cards, decals and banners only receive.
        object.castShadow = !extras.noShadow;
        object.matrixAutoUpdate = false;
      });
      scene.add(authored);
      blockout.removeFromParent();
    })
    .catch((error) => console.warn(`${map.name} scene unavailable; keeping the blockout.`, error));

  return {
    ready,
    /** Bounds of the playable rectangle, for shadow framing. */
    bounds: { width: map.arena.width, depth: map.arena.depth },
    dispose() {
      disposed = true;
      authored?.removeFromParent();
      blockout.removeFromParent();
      sky.removeFromParent();
      for (const g of owned.geometries) g.dispose();
      for (const m of owned.materials) m.dispose();
      for (const t of owned.textures) t.dispose();
      for (const child of blockout.children)
        if (child instanceof THREE.InstancedMesh) child.dispose();
      asset.release();
    },
  };
}
