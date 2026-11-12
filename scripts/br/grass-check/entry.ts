import * as THREE from "three";
import { GRASS_ASSETS, parseGrassKit } from "@/lib/fps/br/grass";

/**
 * Grass kit check: every clump of the kit on its own, as the game maps it (atlas uv in the glTF
 * convention, flipY off), in a row on a plain ground, seen from the side at eye height. Driven by
 * capture.mjs.
 */
const W = 1600,
  H = 900;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7c6d4);
scene.add(new THREE.HemisphereLight(0xe4eaff, 0x40382c, 1.6));
const sun = new THREE.DirectionalLight(0xfff0d8, 2);
sun.position.set(-3, 5, 4);
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 10).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x5b6b3c }),
);
scene.add(ground);
declare global {
  interface Window {
    ready: Promise<number>;
  }
}
window.ready = (async () => {
  const [m, bin] = await Promise.all([
    fetch(GRASS_ASSETS.manifest).then((r) => r.json()),
    fetch(GRASS_ASSETS.bin).then((r) => r.arrayBuffer()),
  ]);
  const atlas = await new THREE.TextureLoader().loadAsync(GRASS_ASSETS.atlas);
  atlas.flipY = false;
  atlas.colorSpace = THREE.SRGBColorSpace;
  const kit = parseGrassKit(m, bin, atlas);
  const mat = new THREE.MeshStandardMaterial({
    map: atlas,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  kit.clumps.forEach((c, k) => {
    const g = new THREE.BufferGeometry();
    const v = kit.vertices.subarray(c.vertex * 8, (c.vertex + c.vertices) * 8);
    const pos: number[] = [],
      uv: number[] = [];
    for (let i = 0; i < c.vertices; i++) {
      pos.push(v[i * 8]!, v[i * 8 + 1]!, v[i * 8 + 2]!);
      uv.push(v[i * 8 + 6]!, v[i * 8 + 7]!);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(Array.from(kit.indices.subarray(c.index, c.index + c.indices)));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(((k % 8) - 3.5) * 0.95, 0, 0);
    mesh.userData["row"] = Math.floor(k / 8);
    scene.add(mesh);
  });
  // A 4 × 4 grid: each clump framed on its own, side on from a little above its foot.
  const cam = new THREE.PerspectiveCamera(30, W / 4 / (H / 4), 0.01, 100);
  renderer.autoClear = false;
  renderer.setScissorTest(true);
  renderer.clear();
  const meshes = scene.children.filter((o) => o.userData["row"] !== undefined);
  meshes.forEach((m, k) => {
    for (const o of meshes) o.visible = o === m;
    const c = kit.clumps[k]!;
    const size = Math.max(c.height, c.radius * 1.4);
    cam.position.set(m.position.x, c.height * 0.45, size * 2.6);
    cam.lookAt(m.position.x, c.height * 0.42, 0);
    const x = (k % 4) * (W / 4),
      y = H - (Math.floor(k / 4) + 1) * (H / 4);
    renderer.setViewport(x, y, W / 4, H / 4);
    renderer.setScissor(x, y, W / 4, H / 4);
    renderer.render(scene, cam);
  });
  return kit.clumps.length;
})();
