import * as THREE from "three";

/** Baked microdetail: no per-frame procedural texture generation. */
export function createFloorDetail() {
  const rough = document.createElement("canvas"),
    bump = document.createElement("canvas");
  rough.width = rough.height = bump.width = bump.height = 256;
  const rc = rough.getContext("2d")!,
    bc = bump.getContext("2d")!;
  const r = rc.createImageData(256, 256),
    b = bc.createImageData(256, 256);
  let seed = 7331;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4,
        noise = random(),
        patch =
          0.5 +
          Math.sin(x * 0.027) * Math.cos(y * 0.031) * 0.25 +
          Math.sin(x * 0.063 + y * 0.019) * 0.12;
      const joint = x < 1 || y < 1 || x > 254 || y > 254;
      const roughness = joint ? 225 : 78 + patch * 120 + noise * 12,
        height = joint ? 50 : 128 + (noise - 0.5) * 22;
      for (let c = 0; c < 3; c++) {
        r.data[i + c] = roughness;
        b.data[i + c] = height;
      }
      r.data[i + 3] = b.data[i + 3] = 255;
    }
  rc.putImageData(r, 0, 0);
  bc.putImageData(b, 0, 0);
  const roughness = new THREE.CanvasTexture(rough),
    relief = new THREE.CanvasTexture(bump);
  for (const map of [roughness, relief]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.NoColorSpace;
    map.anisotropy = 4;
  }
  return {
    roughness,
    relief,
    dispose() {
      roughness.dispose();
      relief.dispose();
    },
  };
}
