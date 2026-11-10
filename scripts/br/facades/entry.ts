/**
 * Facade atlas bake (scripts/br/facades/bake.mjs drives this): every model in the layout
 * written by art/blender/br/build_facades.mjs, rendered from its five views into its
 * rectangles — unlit base colour, 2× supersampled, edges dilated into the gutters.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

type View = { id: string; u: [number, number]; v: [number, number]; toward: [number, number] };
type Layout = {
  width: number;
  height: number;
  gutter: number;
  views: View[];
  models: Record<string, { file: string; min: number[]; max: number[]; rects: number[][] }>;
};
const SS = 2;

async function bake(layout: Layout) {
  const atlas = document.createElement("canvas");
  atlas.width = layout.width;
  atlas.height = layout.height;
  const g = atlas.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  let side = 16;
  for (const m of Object.values(layout.models))
    for (const r of m.rects) side = Math.max(side, r[2]!, r[3]!);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(side * SS, side * SS, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  const G = layout.gutter;

  for (const [id, m] of Object.entries(layout.models)) {
    const gltf = await loader.loadAsync(m.file);
    const owned: Array<{ dispose(): void }> = [];
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const convert = (src: THREE.Material) => {
        const s = src as THREE.MeshStandardMaterial;
        // Fitted interiors are unlit white here but sit in shade in the game: seen through
        // doorways and windows they should read as dark openings.
        const inside = /interior|access floor/i.test(s.name);
        const basic = new THREE.MeshBasicMaterial({
          map: s.map ?? null,
          color: inside ? s.color.clone().multiplyScalar(0.3) : s.color,
          vertexColors: s.vertexColors,
          side: THREE.DoubleSide,
          alphaTest: s.alphaTest || (s.transparent ? 0.5 : 0),
          toneMapped: false,
        });
        if (s.map) {
          s.map.anisotropy = 8;
          owned.push(s.map);
        }
        owned.push(basic, src);
        return basic;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(convert)
        : convert(mesh.material);
      owned.push(mesh.geometry);
    });
    scene.add(gltf.scene);
    scene.updateMatrixWorld(true);
    const size = [0, 1, 2].map((a) => Math.max(0.05, m.max[a]! - m.min[a]!));
    layout.views.forEach((view, vi) => {
      const [rx, ry, rw, rh] = m.rects[vi] as [number, number, number, number];
      const w = rw - 2 * G,
        h = rh - 2 * G;
      // World → clip by hand, the same projection build_facades.mjs used for the UVs:
      // x along `u`, y along `v`, depth toward the camera (nearer = smaller).
      const row = ([axis, sign]: [number, number], k = 1) => {
        const r = [0, 0, 0, 0];
        r[axis] = (k * sign * 2) / size[axis]!;
        r[3] = -k * sign * ((2 * m.min[axis]!) / size[axis]! + 1);
        return r;
      };
      const X = row(view.u),
        Y = row(view.v),
        Z = row(view.toward, -0.98);
      camera.projectionMatrix.set(
        X[0]!,
        X[1]!,
        X[2]!,
        X[3]!,
        Y[0]!,
        Y[1]!,
        Y[2]!,
        Y[3]!,
        Z[0]!,
        Z[1]!,
        Z[2]!,
        Z[3]!,
        0,
        0,
        0,
        1,
      );
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      renderer.setViewport(0, 0, w * SS, h * SS);
      renderer.setScissor(0, 0, w * SS, h * SS);
      renderer.setScissorTest(true);
      renderer.clear();
      renderer.render(scene, camera);
      // The canvas' bottom-left w×h block, down to the rectangle (inside its gutter).
      g.clearRect(rx, ry, rw, rh);
      g.drawImage(renderer.domElement, 0, side * SS - h * SS, w * SS, h * SS, rx + G, ry + G, w, h);
      dilate(g, rx, ry, rw, rh);
    });
    scene.remove(gltf.scene);
    for (const o of owned) o.dispose();
    (window as unknown as { facadeProgress: string }).facadeProgress = id;
  }
  renderer.dispose();
  const blob = await new Promise<Blob>((r) => atlas.toBlob((b) => r(b!), "image/webp", 0.9));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Make a rectangle opaque: empty texels take the mean of their filled neighbours, pass after
 * pass, so the model's edge colours run into the gutter (and under a silhouette that pokes a
 * little outside the near model); what is still empty takes the rectangle's mean colour.
 */
function dilate(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const image = g.getImageData(x, y, w, h);
  const d = image.data;
  const filled = new Uint8Array(w * h);
  let n = 0;
  const mean = [0, 0, 0];
  for (let i = 0; i < w * h; i++)
    if (d[i * 4 + 3]! >= 128) {
      filled[i] = 1;
      n++;
      for (let c = 0; c < 3; c++) mean[c]! += d[i * 4 + c]!;
    }
  for (let c = 0; c < 3; c++) mean[c] = n ? mean[c]! / n : 128;
  for (let pass = 0; pass < 8; pass++) {
    const next = filled.slice();
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        const i = py * w + px;
        if (filled[i]) continue;
        let k = 0;
        const sum = [0, 0, 0];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const qx = px + dx,
              qy = py + dy;
            if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
            const j = qy * w + qx;
            if (!filled[j]) continue;
            k++;
            for (let c = 0; c < 3; c++) sum[c]! += d[j * 4 + c]!;
          }
        if (!k) continue;
        for (let c = 0; c < 3; c++) d[i * 4 + c] = sum[c]! / k;
        next[i] = 1;
      }
    filled.set(next);
  }
  for (let i = 0; i < w * h; i++) {
    if (!filled[i]) for (let c = 0; c < 3; c++) d[i * 4 + c] = mean[c]!;
    d[i * 4 + 3] = 255;
  }
  g.putImageData(image, x, y);
}

Object.assign(window, { facades: { bake } });
