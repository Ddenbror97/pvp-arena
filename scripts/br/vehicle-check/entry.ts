import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * The drivable vehicles (public/fps/br/models/vehicles.glb) side by side, from a three-quarter
 * front and a side view, wheels tinted on request (`?wheels=1`) to check the hubs. capture.mjs.
 */
const W = 1600,
  H = 900;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fa3b3);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
  new RoomEnvironment(),
  0.04,
).texture;
scene.environmentIntensity = 0.6;
const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
sun.position.set(-5, 8, 4);
scene.add(sun, new THREE.HemisphereLight(0xe4eaff, 0x40382c, 0.8));
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x6b6a62, roughness: 1 }),
);
scene.add(ground);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const w = window as unknown as Record<string, unknown>;
w.ready = loader.loadAsync("/vehicles.glb").then((g) => {
  const kinds = ["sedan", "suv", "pickup", "bike"];
  kinds.forEach((k, i) => {
    const o = g.scene.getObjectByName(k)!;
    o.position.set((i - 1.5) * 3.2, 0, 0);
    if (location.search.includes("wheels"))
      o.traverse((m) => {
        if (m instanceof THREE.Mesh && /wheel/.test(m.name))
          m.material = new THREE.MeshBasicMaterial({ color: 0xff3366 });
      });
    scene.add(o);
  });
  return true;
});
w.shot = (view: string) => {
  const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
  // Close-ups of the first vehicle (the police car) from its left and right, and the front.
  const first = -1.5 * 3.2;
  if (view === "left" || view === "right" || view === "nose") {
    if (view === "nose") cam.position.set(first + 3, 2.2, -6.5);
    else cam.position.set(first + (view === "left" ? -6.5 : 6.5), 1.6, -1.2);
    cam.lookAt(first, 0.75, 0);
    renderer.render(scene, cam);
    return renderer.domElement.toDataURL("image/png");
  }
  if (view === "front") cam.position.set(6, 4.5, -12);
  else if (view === "side") cam.position.set(0, 2.2, 16);
  else cam.position.set(-7, 5, 11);
  cam.lookAt(0, 0.9, 0);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
};
