import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Format = "courtyard" | "pennant" | "metal";
/** Surveyed facade positions, above playable cover and clear of site letters and entrances. */
export const SANDGATE_SIGNS: ReadonlyArray<{
  name: string;
  format: Format;
  at: [number, number, number];
  normal: [number, number, number];
  size: [number, number];
}> = [
  {
    name: "mid-pennant",
    format: "pennant",
    at: [-10.040802, 5.85, -6.7],
    normal: [1, 0, 0],
    size: [1.5, 3],
  },
  {
    name: "a-courtyard",
    format: "courtyard",
    at: [-34.7, 7, -37.040956],
    normal: [0, 0, 1],
    size: [3.25, 1.3],
  },
  {
    name: "a-pennant",
    format: "pennant",
    at: [-38.040715, 5.65, -22.2],
    normal: [1, 0, 0],
    size: [1.5, 3],
  },
  {
    name: "b-metal",
    format: "metal",
    at: [19.96099, 6.45, -27.9],
    normal: [1, 0, 0],
    size: [2.75, 1.1],
  },
  {
    name: "police-courtyard",
    format: "courtyard",
    at: [-2.7, 7, -42.238605],
    normal: [0, 0, 1],
    size: [3.25, 1.3],
  },
  {
    name: "terrorist-courtyard",
    format: "courtyard",
    at: [4.7, 7, 42.2395],
    normal: [0, 0, -1],
    size: [2.5, 1],
  },
  {
    name: "long-metal",
    format: "metal",
    at: [-29.959731, 5, 18.2],
    normal: [-1, 0, 0],
    size: [3.125, 1.25],
  },
];

const CELLS = {
  courtyard: [0, 0, 1280, 512],
  pennant: [1280, 0, 512, 1024],
  metal: [0, 512, 1280, 512],
} as const;

/** Existing brand artwork, new map-specific layouts. One atlas, no animated or emissive ads. */
function makeAtlas(logo: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const c = canvas.getContext("2d")!;
  for (const [format, [x, y, w, h]] of Object.entries(CELLS)) {
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    c.fillStyle = format === "metal" ? "#171322" : "#1b102a";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#912eff";
    c.beginPath();
    c.moveTo(w * 0.68, 0);
    c.lineTo(w * 0.89, 0);
    c.lineTo(w * 0.36, h);
    c.lineTo(w * 0.15, h);
    c.fill();
    c.fillStyle = "#cf39ff";
    c.beginPath();
    c.moveTo(w * 0.93, 0);
    c.lineTo(w, 0);
    c.lineTo(w * 0.47, h);
    c.lineTo(w * 0.4, h);
    c.fill();
    // Deterministic weave / worn paint. Drawn once, never in the frame loop.
    c.fillStyle = "rgba(225,208,190,0.06)";
    for (let i = 0; i < 1100; i++) {
      const px = (i * 149 + i * i * 7) % w,
        py = (i * 263 + 31) % h;
      c.fillRect(px, py, format === "metal" ? 9 : 2, 1);
    }
    if (format !== "metal") {
      c.strokeStyle = "#806c8d";
      c.lineWidth = 2;
      c.setLineDash([7, 6]);
      c.strokeRect(16, 16, w - 32, h - 32);
      c.setLineDash([]);
    } else {
      c.strokeStyle = "#706879";
      c.lineWidth = 9;
      c.strokeRect(9, 9, w - 18, h - 18);
      for (const px of [29, w - 29])
        for (const py of [29, h - 29]) {
          c.fillStyle = "#a49ca8";
          c.beginPath();
          c.arc(px, py, 7, 0, Math.PI * 2);
          c.fill();
        }
    }
    const vertical = format === "pennant";
    const logoWidth = vertical ? 420 : 540;
    const logoHeight = (logoWidth * logo.height) / logo.width;
    c.drawImage(
      logo,
      vertical ? (w - logoWidth) / 2 : 72,
      vertical ? 190 : 80,
      logoWidth,
      logoHeight,
    );
    if (!vertical) {
      c.fillStyle = "rgba(17,10,29,0.78)";
      c.fillRect(665, 72, 555, 320);
      c.fillStyle = "#cf39ff";
      c.fillRect(665, 72, 5, 320);
      c.textAlign = "left";
      c.fillStyle = "#eee6ff";
      c.font = "italic 800 57px sans-serif";
      const games =
        format === "courtyard" ? ["POKER", "SLOTS", "ROULETTE"] : ["JACKPOT", "COINFLIP"];
      games.forEach((game, i) => c.fillText(game, 712, 157 + i * 91));
      if (format === "metal") {
        c.font = "600 27px sans-serif";
        c.fillStyle = "#cfb2ef";
        c.fillText("8-BALL  /  PvPSTRIKE", 712, 341);
      }
    }
    c.textAlign = "center";
    c.font = `600 ${vertical ? 28 : 30}px sans-serif`;
    c.fillStyle = "#eee6ff";
    c.fillText("PVPSPINARENA.COM", w / 2, vertical ? h - 125 : h - 34);
    c.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createSandgateBranding(scene: THREE.Scene, mapReady: Promise<void>) {
  let disposed = false,
    geometry: THREE.BufferGeometry | undefined,
    material: THREE.MeshStandardMaterial | undefined,
    texture: THREE.Texture | undefined;
  const group = new THREE.Group();
  group.name = "sandgate-sponsor-displays";
  scene.add(group);
  const ready = Promise.all([
    mapReady,
    new THREE.ImageLoader().loadAsync("/brand/arena-logo-email.png"),
  ])
    .then(([, logo]) => {
      if (disposed || !scene.getObjectByName("sandgate")) return;
      texture = makeAtlas(logo);
      material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96, metalness: 0 });
      const parts: THREE.BufferGeometry[] = [];
      for (const sign of SANDGATE_SIGNS) {
        const [w, h] = sign.size;
        const cloth = sign.format === "pennant";
        const plane = new THREE.PlaneGeometry(w, h, cloth ? 4 : 1, cloth ? 8 : 1);
        const p = plane.getAttribute("position"),
          uv = plane.getAttribute("uv");
        const [cx, cy, cw, ch] = CELLS[sign.format];
        for (let i = 0; i < p.count; i++) {
          const u = uv.getX(i),
            v = uv.getY(i);
          if (cloth) {
            // Tail notch and a shallow permanent drape; no wind updates or collision changes.
            const notch = v === 0 ? (1 - Math.abs(2 * u - 1)) * 0.23 : 0;
            p.setY(i, p.getY(i) + notch);
            p.setZ(i, Math.sin(u * Math.PI * 2) * 0.018 + Math.sin(v * Math.PI) * 0.025);
          }
          uv.setXY(i, (cx + 3 + u * (cw - 6)) / 2048, 1 - (cy + 3 + (1 - v) * (ch - 6)) / 1024);
        }
        plane.computeVertexNormals();
        const normal = new THREE.Vector3(...sign.normal);
        plane.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
        );
        const center = new THREE.Vector3(...sign.at).addScaledVector(normal, 0.075);
        plane.translate(center.x, center.y, center.z);
        parts.push(plane);
      }
      geometry = mergeGeometries(parts)!;
      parts.forEach((p) => p.dispose());
      const display = new THREE.Mesh(geometry, material);
      display.name = "sandgate-static-branded-signs";
      display.receiveShadow = true;
      display.castShadow = false;
      display.matrixAutoUpdate = false;
      group.add(display);
    })
    .catch((error) => console.warn("Sandgate sponsor artwork unavailable", error));
  return {
    ready,
    dispose() {
      disposed = true;
      group.removeFromParent();
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
    },
  };
}
