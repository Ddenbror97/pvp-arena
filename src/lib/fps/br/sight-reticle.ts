import * as THREE from "three";
import type { OpticDef } from "./items";

/**
 * Reflex-sight reticles drawn on the optic's own reticle quad (owner, 2026-11-04: "a more
 * realistic red dot"): light from an LED, so a near-white core with a coloured glow falling
 * off around it, not a flat red mark. The red dot is a single dot; the holographic sight a
 * three-prong mark round a centre dot; the reflex sight a green chevron with its tip on the
 * aim point. Seen only from behind (the shooter's side), like the real emitters, and drawn on
 * top of the faintly tinted lens.
 */
type Kind = Extract<OpticDef["reticle"], "dot" | "holo" | "chevron">;
/**
 * Texture size. The reticle covers a few dozen screen pixels when aimed: drawn large and
 * mipmapped (with anisotropy) it stays a sharp mark instead of a soft blob.
 */
const SIZE = 512;
const COLOURS: Record<Kind, [number, number, number]> = {
  dot: [255, 30, 24],
  holo: [255, 36, 30],
  chevron: [70, 255, 110],
};

/**
 * The sights' look (owner, 2026-11-11: "the glass and the crosshair should look more realistic
 * and clear/clean, look at Warzone to make it crisp"). Modern shooters draw the emitter as a
 * saturated, hard-edged mark with only a tight bloom (an LED seen through coated glass, not a
 * glowing smudge), behind glass that is clear in the middle and tinted towards its frame.
 */
function glowStroke(
  g: CanvasRenderingContext2D,
  draw: () => void,
  rgb: readonly [number, number, number],
  w: number,
) {
  // A tight bloom, the line with a hard edge, then a lighter centre line.
  const [r, gg, b] = rgb;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const [width, alpha] of [
    [w * 3.2, 0.06],
    [w * 1.9, 0.16],
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
  g.strokeStyle = `rgba(255,${Math.min(255, gg + 110)},${Math.min(255, b + 100)},0.9)`;
  g.lineWidth = w * 0.35;
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
  // Tight bloom: gone within three radii.
  const halo = g.createRadialGradient(x, y, core * 0.8, x, y, core * 3);
  halo.addColorStop(0, `rgba(${r},${gg},${b},0.22)`);
  halo.addColorStop(0.35, `rgba(${r},${gg},${b},0.07)`);
  halo.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = halo;
  g.fillRect(x - core * 3, y - core * 3, core * 6, core * 6);
  // A saturated disc with a hard rim and a hot centre.
  const dot = g.createRadialGradient(x, y, 0, x, y, core);
  dot.addColorStop(0, "rgba(255,170,150,1)");
  dot.addColorStop(0.35, `rgba(255,${Math.min(255, gg + 70)},${Math.min(255, b + 60)},1)`);
  dot.addColorStop(0.7, `rgba(${r},${gg},${b},1)`);
  dot.addColorStop(0.92, `rgba(${r},${gg},${b},1)`);
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
    k = SIZE / 256,
    rgb = COLOURS[kind];
  if (kind === "dot") glowDot(g, c, c, 15 * k, rgb);
  else if (kind === "holo") {
    // Owner, 2026-11-11 ("more like this instead of a big circle"): the three-prong holographic
    // mark of modern shooters, three short tapered bars pointing at a small centre dot, one from
    // above and two from below left and right, the gap between them framing the target.
    const [r, gg, b] = rgb;
    const prong = (a: number) => {
      const inner = 15 * k,
        outer = 52 * k,
        tip = 2.2 * k,
        base = 6.5 * k;
      const ux = Math.cos(a),
        uy = Math.sin(a),
        px = -uy,
        py = ux;
      g.beginPath();
      g.moveTo(c + ux * inner + px * tip, c + uy * inner + py * tip);
      g.lineTo(c + ux * outer + px * base, c + uy * outer + py * base);
      g.lineTo(c + ux * outer - px * base, c + uy * outer - py * base);
      g.lineTo(c + ux * inner - px * tip, c + uy * inner - py * tip);
      g.closePath();
    };
    // (Canvas y runs down: −90° is up.)
    const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    g.lineJoin = "round";
    for (const [width, alpha] of [
      [9 * k, 0.07],
      [4.5 * k, 0.16],
    ] as const) {
      g.strokeStyle = `rgba(${r},${gg},${b},${alpha})`;
      g.lineWidth = width;
      for (const a of angles) {
        prong(a);
        g.stroke();
      }
    }
    g.fillStyle = `rgba(${r},${gg},${b},1)`;
    for (const a of angles) {
      prong(a);
      g.fill();
    }
    glowDot(g, c, c, 5 * k, rgb);
  } else {
    // Chevron: tip on the aim point, arms down and out.
    glowStroke(
      g,
      () => {
        g.beginPath();
        g.moveTo(c - 58 * k, c + 50 * k);
        g.lineTo(c, c);
        g.lineTo(c + 58 * k, c + 50 * k);
      },
      rgb,
      7 * k,
    );
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  textures.set(kind, t);
  return t;
}

/**
 * Coated glass: a clean, near-clear view through the middle, a faint blue-green coating that
 * deepens only in the last tenth towards the frame (mostly under it), and one soft reflection
 * across the top corner.
 */
let lensTexture: THREE.Texture | null = null;
function glassTexture() {
  if (lensTexture) return lensTexture;
  const n = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "rgba(190,225,240,0.018)";
  g.fillRect(0, 0, n, n);
  const edge = n * 0.11;
  for (const [x0, y0, x1, y1] of [
    [0, 0, edge, 0],
    [n, 0, n - edge, 0],
    [0, 0, 0, edge],
    [0, n, 0, n - edge],
  ] as const) {
    const l = g.createLinearGradient(x0, y0, x1, y1);
    l.addColorStop(0, "rgba(30,70,85,0.2)");
    l.addColorStop(1, "rgba(40,90,105,0)");
    g.fillStyle = l;
    g.fillRect(0, 0, n, n);
  }
  // The reflection: a soft diagonal band near the top left.
  g.save();
  g.translate(n * 0.3, n * 0.22);
  g.rotate(-0.6);
  const band = g.createLinearGradient(0, -n * 0.09, 0, n * 0.09);
  band.addColorStop(0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, "rgba(235,245,255,0.055)");
  band.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = band;
  g.fillRect(-n, -n * 0.09, n * 2, n * 0.18);
  g.restore();
  lensTexture = new THREE.CanvasTexture(canvas);
  lensTexture.colorSpace = THREE.SRGBColorSpace;
  return lensTexture;
}

const glass = new THREE.MeshBasicMaterial({
  transparent: true,
  depthWrite: false,
  toneMapped: false,
});

/**
 * Each sight's glass, in multiples of its reticle quad: width, height, centre height above the
 * quad's centre, and its corner radii (top, bottom) as fractions of the width, and the flare. Measured on the
 * aimed view (2026-11-11) to fill the frame's whole opening, its edge tucked under the frame
 * (owner: "the glass should fit the entire frame"): the earlier panes (the front window found
 * by rays) floated as a smaller tinted card inside the frame.
 */
const WINDOWS: Record<Kind, [number, number, number, number, number, number]> = {
  // The open reflex sight: an arch over the base.
  dot: [2.84, 2.32, 0.03, 0.46, 0.04, 1],
  // The holographic and reflex hoods widen towards the base (last: bottom width / top width).
  holo: [2.98, 2.28, -0.04, 0.08, 0.05, 1.2],
  chevron: [3.3, 2.0, 0.0, 0.14, 0.14, 1.12],
};

/** Reticle size against the quad. */
const RETICLE_SCALE: Record<Kind, number> = { dot: 1, holo: 1.5, chevron: 1.35 };

/** The glass outline: `wb` wide at the bottom, `w` at the top (the frames flare outwards). */
function roundedRect(w: number, h: number, top: number, bottom: number, wb = w) {
  const s = new THREE.Shape();
  s.moveTo(-wb / 2 + bottom, -h / 2);
  s.lineTo(wb / 2 - bottom, -h / 2);
  s.quadraticCurveTo(wb / 2, -h / 2, wb / 2, -h / 2 + bottom);
  s.lineTo(w / 2, h / 2 - top);
  // (Elliptical quarter turns: a large top radius makes the reflex sight's arch.)
  s.absellipse(w / 2 - top, h / 2 - top, top, top, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + top, h / 2);
  s.absellipse(-w / 2 + top, h / 2 - top, top, top, Math.PI / 2, Math.PI, false);
  s.lineTo(-wb / 2, -h / 2 + bottom);
  s.quadraticCurveTo(-wb / 2, -h / 2, -wb / 2 + bottom, -h / 2);
  const geometry = new THREE.ShapeGeometry(s, 6);
  // (Shape UVs are the shape's own coordinates: 0..1 across the window for the glass texture.)
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) / Math.max(w, wb) + 0.5, uv.getY(i) / h + 0.5);
  return geometry;
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
  const [w, h, dy, top, bottom, flare] = WINDOWS[kind];
  glass.map ??= glassTexture();
  const lens = new THREE.Mesh(
    roundedRect(w * q, h * q, top * w * q, bottom * w * q, flare * w * q),
    glass,
  );
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
