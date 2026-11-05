import * as THREE from "three";
import type { OpticDef } from "./items";

/**
 * Reflex-sight reticles drawn on the optic's own reticle quad (owner, 2026-11-04: "a more
 * realistic red dot"): light from an LED, so a near-white core with a coloured glow falling
 * off around it, not a flat red mark. The red dot is a single dot; the holographic sight an
 * EOTech-style ring with a centre dot; the reflex sight a green chevron with its tip on the
 * aim point. Seen only from behind (the shooter's side), like the real emitters, and drawn on
 * top of the faintly tinted lens.
 */
type Kind = Extract<OpticDef["reticle"], "dot" | "holo" | "chevron">;
const SIZE = 256;
const COLOURS: Record<Kind, [number, number, number]> = {
  dot: [255, 38, 28],
  holo: [255, 46, 36],
  chevron: [70, 255, 110],
};

function glowStroke(
  g: CanvasRenderingContext2D,
  draw: () => void,
  rgb: readonly [number, number, number],
  w: number,
) {
  // Wide, faint passes for the bloom, then the bright line, then its hot centre.
  const [r, gg, b] = rgb;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const [width, alpha] of [
    [w * 7, 0.07],
    [w * 4, 0.14],
    [w * 2.2, 0.32],
  ] as const) {
    g.strokeStyle = `rgba(${r},${gg},${b},${alpha})`;
    g.lineWidth = width;
    draw();
    g.stroke();
  }
  g.strokeStyle = `rgba(${r},${gg},${b},1)`;
  g.lineWidth = w;
  draw();
  g.stroke();
  g.strokeStyle = `rgba(255,${Math.min(255, gg + 170)},${Math.min(255, b + 160)},0.85)`;
  g.lineWidth = w * 0.4;
  draw();
  g.stroke();
}

function glowDot(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  core: number,
  rgb: readonly [number, number, number],
) {
  const [r, gg, b] = rgb;
  const halo = g.createRadialGradient(x, y, 0, x, y, core * 6);
  halo.addColorStop(0, `rgba(${r},${gg},${b},0.55)`);
  halo.addColorStop(0.18, `rgba(${r},${gg},${b},0.28)`);
  halo.addColorStop(0.45, `rgba(${r},${gg},${b},0.08)`);
  halo.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = halo;
  g.fillRect(x - core * 6, y - core * 6, core * 12, core * 12);
  const dot = g.createRadialGradient(x, y, 0, x, y, core);
  dot.addColorStop(0, "rgba(255,246,240,1)");
  dot.addColorStop(0.45, `rgba(255,${Math.min(255, gg + 120)},${Math.min(255, b + 110)},1)`);
  dot.addColorStop(0.8, `rgba(${r},${gg},${b},1)`);
  dot.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = dot;
  g.beginPath();
  g.arc(x, y, core, 0, Math.PI * 2);
  g.fill();
}

const textures = new Map<Kind, THREE.Texture>();
function reticleTexture(kind: Kind) {
  const cached = textures.get(kind);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext("2d")!;
  const c = SIZE / 2,
    rgb = COLOURS[kind];
  if (kind === "dot") glowDot(g, c, c, 19, rgb);
  else if (kind === "holo") {
    // 68 MOA-style ring (a little under half the quad) with four short gaps, and the 1 MOA dot.
    const R = 96;
    for (let q = 0; q < 4; q++)
      glowStroke(
        g,
        () => {
          g.beginPath();
          g.arc(c, c, R, q * (Math.PI / 2) + 0.12, (q + 1) * (Math.PI / 2) - 0.12);
        },
        rgb,
        9,
      );
    glowDot(g, c, c, 13, rgb);
  } else {
    // Chevron: tip on the aim point, arms down and out.
    glowStroke(
      g,
      () => {
        g.beginPath();
        g.moveTo(c - 62, c + 54);
        g.lineTo(c, c);
        g.lineTo(c + 62, c + 54);
      },
      rgb,
      11,
    );
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(kind, t);
  return t;
}

const glass = new THREE.MeshBasicMaterial({
  color: 0x9ec9e8,
  transparent: true,
  opacity: 0.07,
  depthWrite: false,
  toneMapped: false,
});

/**
 * Each sight's see-through window (mapped by rays along its axis, 2026-11-05), in multiples of
 * its reticle quad: width, height, centre height above the quad's centre.
 */
const WINDOWS: Record<Kind, [number, number, number]> = {
  dot: [2.1, 1.6, 0.1],
  holo: [2.9, 1.25, 0.27],
  chevron: [2.2, 1.15, 0.05],
};

/** Reticle size against the quad: an EOTech ring takes a good part of its window. */
const RETICLE_SCALE: Record<Kind, number> = { dot: 1, holo: 1.7, chevron: 1.35 };

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ShapeGeometry(s, 6);
}

/**
 * Put the reticle on an optic's reticle quad `aim` (a mesh with its quad facing ±z in its own
 * space): a lit reticle plane facing the shooter (+z) over a faint lens filling the sight's
 * window. The original quad (an opaque red square) is hidden.
 */
export function mountReticle(aim: THREE.Mesh, kind: Kind) {
  if (typeof document === "undefined" || !aim.parent) return;
  aim.geometry.computeBoundingBox();
  const box = aim.geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3()),
    centre = box.getCenter(new THREE.Vector3());
  const place = (mesh: THREE.Mesh, dz: number, dy = 0) => {
    mesh.position
      .copy(centre)
      .setZ(centre.z + dz)
      .setY(centre.y + dy)
      .applyMatrix4(aim.matrix);
    mesh.quaternion.copy(aim.quaternion);
    mesh.scale.copy(aim.scale);
    mesh.layers.mask = aim.layers.mask;
    mesh.renderOrder = 2;
    aim.parent!.add(mesh);
  };
  const q = Math.max(size.x, size.y);
  const [w, h, dy] = WINDOWS[kind];
  const lens = new THREE.Mesh(roundedRect(w * q, h * q, Math.min(w, h) * q * 0.22), glass);
  place(lens, -q * 0.04, dy * q);
  const material = new THREE.MeshBasicMaterial({
    map: reticleTexture(kind),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const r = q * RETICLE_SCALE[kind];
  const reticle = new THREE.Mesh(new THREE.PlaneGeometry(r, r), material);
  reticle.renderOrder = 3;
  place(reticle, 0);
  aim.visible = false;
}
