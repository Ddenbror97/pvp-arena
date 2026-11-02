/**
 * LOST TRAIL forest backdrop bake: the full-forest scene, through the game's own map loader and
 * lighting (as scripts/fps/map-capture/entry.ts), seen from the arena centre through the four
 * horizontal faces of a cube. A clipping plane on each face keeps only what lies beyond that
 * face's backdrop wall, so the wall shows exactly the forest it replaces (from the centre).
 * The sky dome is hidden: the sky stays transparent and the game's own sky shows through.
 */
import * as THREE from "three";
import { getMap } from "../../../../src/lib/fps/maps/registry";
import { createMapEnvironment } from "../../../../src/lib/fps/maps/environments";

type Face = { dir: [number, number, number]; image: string; corners: number[][] };
declare global {
  interface Window {
    bake: (half: number, eye: number, bottom: number, size: number) => Promise<Face[]>;
  }
}

window.bake = async (half, eye, bottom, size) => {
  const map = getMap("lost-trail");
  const lighting = map.presentation.lighting;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far);
  scene.add(
    new THREE.HemisphereLight(
      lighting.hemisphere.sky,
      lighting.hemisphere.ground,
      lighting.hemisphere.intensity,
    ),
  );
  const sun = new THREE.DirectionalLight(lighting.sun.color, lighting.sun.intensity);
  sun.position.set(...lighting.sun.position);
  sun.castShadow = true;
  const shadow = map.presentation.shadow;
  sun.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);
  Object.assign(sun.shadow.camera, {
    near: 1,
    far: shadow.far,
    left: -shadow.extent,
    right: shadow.extent,
    top: shadow.extent,
    bottom: -shadow.extent,
  });
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const env = createMapEnvironment(scene, map);
  await env.ready;
  scene.background = null;
  // The ground's wetness vertex colours carry an alpha channel the opaque game canvas ignores;
  // on this transparent canvas it would punch the terrain out. Keep RGB only.
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const color = mesh.isMesh ? mesh.geometry.getAttribute("color") : undefined;
    if (!color || color.itemSize !== 4) return;
    const rgb = new Float32Array(color.count * 3);
    for (let i = 0; i < color.count; i++)
      rgb.set([color.getX(i), color.getY(i), color.getZ(i)], i * 3);
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
  });
  const sky = scene.getObjectByName("sky");
  if (sky) sky.visible = false;
  scene.updateMatrixWorld(true);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(scene, 0.04, 0.1, 100);
  pmrem.dispose();
  scene.environment = reflections.texture;
  scene.environmentIntensity = lighting.environmentIntensity;
  renderer.shadowMap.needsUpdate = true;
  renderer.setClearColor(0x000000, 0);
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, map.presentation.viewDistance);
  scene.add(camera);
  const faces: Face[] = [];
  const dirs: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const dir of dirs) {
    const d = new THREE.Vector3(...dir);
    camera.position.set(0, eye, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(d.x, eye, d.z);
    camera.updateMatrixWorld(true);
    renderer.clippingPlanes = [new THREE.Plane(d.clone(), -half)];
    renderer.render(scene, camera);
    renderer.render(scene, camera);
    // The wall: the face's plane at `half`, laterally ±half (the cube's corners), from `bottom`
    // to the top of the face's view. Corner UVs from the camera's own projection.
    const side = new THREE.Vector3(-d.z, 0, d.x);
    const top = eye + half;
    const corners = [
      [-half, bottom],
      [half, bottom],
      [half, top],
      [-half, top],
    ].map(([s, y]) => {
      const p = d.clone().multiplyScalar(half).addScaledVector(side, s!).setY(y!);
      const ndc = p.clone().project(camera);
      return [p.x, p.y, p.z, ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5];
    });
    faces.push({ dir, image: renderer.domElement.toDataURL("image/png"), corners });
  }
  return faces;
};
