import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "meshoptimizer";
(window as unknown as { render: (ids: string[]) => Promise<unknown> }).render = async (
  ids: string[],
) => {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(1500, 900);
  document.body.appendChild(r.domElement);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(
    MeshoptDecoder as unknown as Parameters<GLTFLoader["setMeshoptDecoder"]>[0],
  );
  const cols = 6,
    cw = 250,
    ch = 450;
  r.setScissorTest(true);
  r.setClearColor(0x9fb4c8);
  for (let i = 0; i < ids.length; i++) {
    const g = await loader.loadAsync(`/fps/br/models/${ids[i]}.lod0.glb`);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(5, 10, 7);
    scene.add(d);
    scene.add(g.scene);
    const box = new THREE.Box3().setFromObject(g.scene);
    const s = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const R = Math.max(s.x, s.y, s.z);
    const cam = new THREE.PerspectiveCamera(35, (cw / ch) * 0 + cw / (ch / 1), 0.01, 1e4);
    cam.aspect = cw / ch;
    cam.position.set(c.x + R * 1.2, c.y + R * 0.7, c.z + R * 1.6);
    cam.lookAt(c);
    cam.updateProjectionMatrix();
    const x = (i % cols) * cw,
      y = 900 - (Math.floor(i / cols) + 1) * ch;
    r.setViewport(x, y, cw, ch);
    r.setScissor(x, y, cw, ch);
    r.render(scene, cam);
  }
  return true;
};
