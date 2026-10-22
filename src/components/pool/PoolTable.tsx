import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  BALL_R,
  cosMicro,
  POCKETS,
  sinMicro,
  TABLE_H,
  TABLE_W,
  type Ball,
} from "@/lib/pool/physics";
import { ballRadiusPx, spanPx, viewOf } from "@/lib/pool/view";

const SOLIDS = ["#f0c410", "#1d4ed8", "#dc2626", "#7c3aed", "#ea580c", "#15803d", "#7f1d1d"];

function colorOf(id: number): string {
  if (id === 0) return "#f7f4ee";
  if (id === 8) return "#141414";
  const n = id > 8 ? id - 9 : id - 1;
  return SOLIDS[n] ?? "#cccccc";
}

function mix(hex: string, toward: number, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const pick = (shift: number) => {
    const channel = (n >> shift) & 255;
    return Math.round(channel + (toward - channel) * amount);
  };
  return `rgb(${pick(16)}, ${pick(8)}, ${pick(0)})`;
}

type Pt = { x: number; y: number };

function tablePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const px = ((clientX - rect.left) / rect.width) * w;
  const py = ((clientY - rect.top) / rect.height) * h;
  const point = viewOf(w, h).unproject(px, py);
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function corners(
  project: (x: number, y: number) => { x: number; y: number; scale: number },
  outset: number,
): Pt[] {
  const nearLeft = project(0, 0);
  const farLeft = project(TABLE_W, 0);
  const farRight = project(TABLE_W, TABLE_H);
  const nearRight = project(0, TABLE_H);
  return [
    { x: nearLeft.x - outset, y: nearLeft.y + outset },
    { x: farLeft.x - outset, y: farLeft.y - outset },
    { x: farRight.x + outset, y: farRight.y - outset },
    { x: nearRight.x + outset, y: nearRight.y + outset },
  ];
}

function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], fresh = true) {
  const first = pts[0];
  if (!first) return;
  if (fresh) ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p) ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function addHoles(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number) => { x: number; y: number; scale: number },
  innerW: number,
  factor: number,
) {
  for (const pocket of POCKETS) {
    const p = project(pocket.x, pocket.y);
    const r = spanPx(innerW, p.scale, pocket.r) * factor;
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
  }
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.62, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.62, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - s, x, y + s);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.42, "#ece6da");
  g.addColorStop(1, "#b7ad9c");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.stroke();
}

function noiseLayer(w: number, h: number): HTMLCanvasElement {
  const sw = 220;
  const sh = 120;
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d");
  const cloth = document.createElement("canvas");
  cloth.width = w;
  cloth.height = h;
  if (!sctx) return cloth;
  const img = sctx.createImageData(sw, sh);
  const cell = 7;
  const hash = (ix: number, iy: number) => {
    let n = (ix * 374761393 + iy * 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const value = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0);
    const b = hash(x0 + 1, y0);
    const c = hash(x0, y0 + 1);
    const d = hash(x0 + 1, y0 + 1);
    return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
  };
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const coarse = value(x / cell, y / cell);
      const fine = value(x / 2.5, y / 2.5);
      const v = Math.round(118 + coarse * 42 + fine * 18);
      const i = (y * sw + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v - 8;
      img.data[i + 2] = v + 6;
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  const ctx = cloth.getContext("2d");
  if (!ctx) return cloth;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, w, h);
  return cloth;
}

function buildTable(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const view = viewOf(w, h);
  const { project, innerW, padX, padY } = view;
  const sidePocket = POCKETS[1];
  const overhang = sidePocket ? spanPx(innerW, 1, sidePocket.r - sidePocket.y) : 24;
  const rail = Math.min(Math.min(padX, padY) - 3, Math.max(overhang + 16, Math.min(w, h) * 0.078));
  const bevel = rail * 0.62;
  const cushion = rail * 0.34;
  const woodPts = corners(project, rail);
  const bevelPts = corners(project, bevel);
  const nosePts = corners(project, cushion);
  const feltPts = corners(project, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.filter = "blur(16px)";
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  trace(
    ctx,
    corners(project, rail * 0.72).map((p) => ({ x: p.x, y: p.y + rail * 0.28 })),
  );
  ctx.fill();
  ctx.restore();

  const wood = ctx.createLinearGradient(0, h, w, 0);
  wood.addColorStop(0, "#1a120e");
  wood.addColorStop(0.45, "#3a2a22");
  wood.addColorStop(1, "#100c0a");
  ctx.fillStyle = wood;
  trace(ctx, woodPts);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 228, 196, 0.34)";
  ctx.lineWidth = Math.max(1.5, rail * 0.035);
  ctx.stroke();

  ctx.fillStyle = "#5a4334";
  trace(ctx, woodPts);
  trace(ctx, bevelPts, false);
  ctx.fill("evenodd");
  ctx.strokeStyle = "rgba(255, 236, 214, 0.2)";
  ctx.lineWidth = Math.max(1, rail * 0.03);
  trace(ctx, bevelPts);
  ctx.stroke();

  ctx.save();
  trace(ctx, feltPts);
  addHoles(ctx, project, innerW, 1.14);
  ctx.clip("evenodd");
  const cloth = ctx.createRadialGradient(
    w * 0.5,
    h * 0.46,
    innerW * 0.04,
    w * 0.5,
    h * 0.5,
    innerW * 0.72,
  );
  cloth.addColorStop(0, "#6e3eae");
  cloth.addColorStop(0.62, "#5b3296");
  cloth.addColorStop(1, "#3d206e");
  ctx.fillStyle = cloth;
  ctx.fillRect(0, 0, w, h);
  const shade = ctx.createRadialGradient(
    w * 0.5,
    h * 0.48,
    innerW * 0.08,
    w * 0.5,
    h * 0.5,
    innerW * 0.62,
  );
  shade.addColorStop(0, "rgba(255,255,255,0.05)");
  shade.addColorStop(0.55, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(10,0,20,0.4)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(noiseLayer(w, h), 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(18, 0, 32, 0.55)";
  ctx.lineWidth = Math.max(10, rail * 0.55);
  trace(ctx, feltPts);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  trace(ctx, nosePts);
  trace(ctx, feltPts, false);
  addHoles(ctx, project, innerW, 1.35);
  ctx.fillStyle = "#241433";
  ctx.fill("evenodd");
  ctx.restore();
  ctx.save();
  trace(ctx, feltPts);
  addHoles(ctx, project, innerW, 1.35);
  ctx.clip("evenodd");
  ctx.strokeStyle = "rgba(214, 186, 255, 0.28)";
  ctx.lineWidth = Math.max(1.25, rail * 0.045);
  trace(ctx, feltPts);
  ctx.stroke();
  ctx.restore();

  for (const pocket of POCKETS) {
    const p = project(pocket.x, pocket.y);
    const mouth = spanPx(innerW, p.scale, pocket.r);
    ctx.beginPath();
    ctx.arc(p.x, p.y, mouth * 1.22, 0, Math.PI * 2);
    const leather = ctx.createRadialGradient(
      p.x,
      p.y - mouth * 0.2,
      mouth * 0.4,
      p.x,
      p.y,
      mouth * 1.22,
    );
    leather.addColorStop(0, "#1a0c08");
    leather.addColorStop(0.72, "#1a0c08");
    leather.addColorStop(0.84, "#5a3a28");
    leather.addColorStop(1, "#2a1812");
    ctx.fillStyle = leather;
    ctx.fill();
    const hole = ctx.createRadialGradient(
      p.x - mouth * 0.15,
      p.y - mouth * 0.2,
      mouth * 0.05,
      p.x,
      p.y,
      mouth,
    );
    hole.addColorStop(0, "#020103");
    hole.addColorStop(0.7, "#0a0709");
    hole.addColorStop(1, "#140e0c");
    ctx.beginPath();
    ctx.arc(p.x, p.y, mouth * 0.96, 0, Math.PI * 2);
    ctx.fillStyle = hole;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, mouth * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(90, 58, 40, 0.9)";
    ctx.lineWidth = Math.max(1.5, mouth * 0.1);
    ctx.stroke();
  }

  const mark = (tableX: number, tableY: number, ox: number, oy: number) => {
    const p = project(tableX, tableY);
    diamond(ctx, p.x + ox, p.y + oy, Math.max(5, innerW * 0.0075 * p.scale));
  };
  const inset = rail * 0.52;
  for (const t of [0.18, 0.34, 0.66, 0.82]) {
    mark(t * TABLE_W, 0, -inset, 0);
    mark(t * TABLE_W, TABLE_H, inset, 0);
  }
  for (const t of [0.3, 0.5, 0.7]) {
    mark(0, t * TABLE_H, 0, inset);
    mark(TABLE_W, t * TABLE_H, 0, -inset);
  }
  return canvas;
}

type Motion = {
  x: number;
  y: number;
  roll: number;
  heading: number;
  falling: number | null;
  done: boolean;
};

type Pose = { x: number; y: number; angle: number; power: number };

function aimDir(angleMilli: number) {
  return { x: cosMicro(angleMilli) / 1_000_000, y: sinMicro(angleMilli) / 1_000_000 };
}

function firstBall(
  from: { x: number; y: number },
  angleMilli: number,
  balls: readonly Ball[],
): { x: number; y: number } | null {
  const dir = aimDir(angleMilli);
  let bestT = Infinity;
  let best: { x: number; y: number } | null = null;
  for (const ball of balls) {
    if (ball.pocketed || ball.id === 0) continue;
    const fx = ball.x - from.x;
    const fy = ball.y - from.y;
    const along = fx * dir.x + fy * dir.y;
    if (along <= 0) continue;
    const dx = ball.x - (from.x + dir.x * along);
    const dy = ball.y - (from.y + dir.y * along);
    const rad = BALL_R * 2;
    const miss = dx * dx + dy * dy;
    if (miss > rad * rad) continue;
    const t = along - Math.sqrt(rad * rad - miss);
    if (t > BALL_R && t < bestT) {
      bestT = t;
      best = { x: from.x + dir.x * t, y: from.y + dir.y * t };
    }
  }
  return best;
}

function stick(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  wa: number,
  wb: number,
  fill: string | CanvasGradient,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(a.x + nx * wa, a.y + ny * wa);
  ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
  ctx.lineTo(b.x - nx * wb, b.y - ny * wb);
  ctx.lineTo(a.x - nx * wa, a.y - ny * wa);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCue(
  ctx: CanvasRenderingContext2D,
  projectOpen: (x: number, y: number) => { x: number; y: number; scale: number },
  innerW: number,
  from: { x: number; y: number },
  angleMilli: number,
  gapBalls: number,
  alpha: number,
) {
  const dir = aimDir(angleMilli);
  const gap = BALL_R * gapBalls;
  const length = BALL_R * 52;
  const at = (dist: number) => projectOpen(from.x - dir.x * dist, from.y - dir.y * dist);
  const tip = at(gap);
  const ferrule = at(gap + BALL_R * 1.7);
  const grip = at(gap + length * 0.74);
  const butt = at(gap + length);
  const width = Math.max(2.4, ballRadiusPx(innerW, tip.scale) * 0.15);
  ctx.save();
  ctx.globalAlpha = alpha;
  const shaft = ctx.createLinearGradient(tip.x, tip.y, butt.x, butt.y);
  shaft.addColorStop(0, "#f3ddb8");
  shaft.addColorStop(0.4, "#e0b56d");
  shaft.addColorStop(1, "#b88848");
  stick(ctx, tip, butt, width, width * 1.35, shaft);
  stick(
    ctx,
    { x: (tip.x + butt.x) / 2, y: (tip.y + butt.y) / 2 },
    butt,
    width * 0.28,
    width * 0.34,
    "rgba(255,236,210,0.35)",
  );
  stick(ctx, grip, butt, width * 1.2, width * 1.45, "#1c1614");
  stick(ctx, tip, ferrule, width * 0.95, width, "#f6f3ec");
  stick(ctx, tip, at(gap + BALL_R * 0.48), width * 0.78, width * 0.86, "#8d6b45");
  ctx.restore();
}

function paintBall(
  ctx: CanvasRenderingContext2D,
  id: number,
  sx: number,
  sy: number,
  radius: number,
  roll: number,
  heading: number,
  moving: boolean,
  fade: number,
) {
  if (radius < 1) return;
  ctx.save();
  ctx.globalAlpha = fade;
  const shadow = ctx.createRadialGradient(
    sx,
    sy + radius * 0.72,
    radius * 0.1,
    sx,
    sy + radius * 0.72,
    radius * 1.15,
  );
  shadow.addColorStop(0, "rgba(6, 0, 16, 0.5)");
  shadow.addColorStop(1, "rgba(6, 0, 16, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(
    sx + radius * 0.06,
    sy + radius * 0.72,
    radius * 0.92,
    radius * 0.38,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.clip();

  const stripe = id > 8;
  const base = colorOf(id);
  const light = id === 0 ? "#ffffff" : mix(base, 255, stripe ? 0 : 0.42);
  const dark = id === 0 ? "#c9c2b4" : mix(base, 0, 0.45);
  const body = ctx.createRadialGradient(
    sx - radius * 0.34,
    sy - radius * 0.4,
    radius * 0.08,
    sx + radius * 0.1,
    sy + radius * 0.15,
    radius * 1.05,
  );
  body.addColorStop(0, light);
  body.addColorStop(0.16, stripe || id === 0 ? "#f7f4ee" : base);
  body.addColorStop(0.72, stripe || id === 0 ? "#efeae0" : base);
  body.addColorStop(1, dark);
  ctx.fillStyle = body;
  ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);

  const face = Math.cos(roll);
  const shift = Math.sin(roll) * radius * 0.82;
  if (id !== 0) {
    ctx.save();
    ctx.translate(sx, sy);
    if (stripe) {
      ctx.fillStyle = base;
      if (moving) {
        ctx.rotate(heading);
        const half = (Math.abs(face) * 0.38 + 0.08) * radius;
        ctx.fillRect(shift - half, -radius * 1.35, half * 2, radius * 2.7);
      } else {
        const half = radius * 0.46;
        ctx.fillRect(-radius * 1.35, -half, radius * 2.7, half * 2);
      }
    }
    ctx.restore();
  }

  ctx.globalCompositeOperation = "soft-light";
  const wrap = ctx.createRadialGradient(
    sx - radius * 0.2,
    sy - radius * 0.25,
    radius * 0.2,
    sx,
    sy,
    radius,
  );
  wrap.addColorStop(0, "rgba(255,255,255,0.85)");
  wrap.addColorStop(0.55, "rgba(255,255,255,0.15)");
  wrap.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = wrap;
  ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
  ctx.globalCompositeOperation = "source-over";
  const spec = ctx.createRadialGradient(
    sx - radius * 0.36,
    sy - radius * 0.42,
    0,
    sx - radius * 0.28,
    sy - radius * 0.34,
    radius * 0.48,
  );
  spec.addColorStop(0, "rgba(255,255,255,0.95)");
  spec.addColorStop(0.22, "rgba(255,255,255,0.35)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.ellipse(
    sx - radius * 0.32,
    sy - radius * 0.38,
    radius * 0.22,
    radius * 0.14,
    -0.6,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  if (id !== 0 && (!moving || face > 0.22)) {
    ctx.save();
    ctx.translate(sx, sy);
    if (moving) ctx.rotate(heading);
    const disc = radius * (moving ? 0.34 + Math.max(0, face) * 0.16 : 0.46);
    const nx = moving ? shift * 0.92 : 0;
    ctx.fillStyle = "#f7f4ee";
    ctx.beginPath();
    ctx.arc(nx, 0, disc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#161616";
    ctx.font = `700 ${Math.max(8, disc * 1.15)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(id), nx, disc * 0.06);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(sx, sy, radius - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = Math.max(1, radius * 0.045);
  ctx.stroke();
  ctx.restore();
}

type Props = {
  balls: readonly Ball[];
  angleMilli: number;
  power: number;
  ghost: { x: number; y: number } | null;
  kitchenOnly: boolean;
  calledPocket: number | null;
  showAim: boolean;
  showCue: boolean;
  rolling: boolean;
  onAim: (angleMilli: number) => void;
  onPlace: (x: number, y: number) => void;
  placing: boolean;
  legalAt: (x: number, y: number) => boolean;
};

/** The cloth is a view. A drag sets aim or the cue-ball spot. It never takes the shot. */
export function PoolTable({
  balls,
  angleMilli,
  power,
  ghost,
  kitchenOnly,
  calledPocket,
  showAim,
  showCue,
  rolling,
  onAim,
  onPlace,
  placing,
  legalAt,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<{ w: number; h: number; canvas: HTMLCanvasElement } | null>(null);
  const motionRef = useRef(new Map<number, Motion>());
  const poseRef = useRef<Pose | null>(null);
  const strikeRef = useRef<(Pose & { t0: number }) | null>(null);
  const rollingRef = useRef(false);
  const legalRef = useRef(legalAt);
  legalRef.current = legalAt;
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!placing) setDraft(null);
  }, [placing]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let stop = false;
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = Math.max(1, canvas.clientWidth);
      const cssH = Math.max(1, canvas.clientHeight);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        cacheRef.current = null;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      let again = false;
      if (!cacheRef.current || cacheRef.current.w !== w || cacheRef.current.h !== h) {
        cacheRef.current = { w, h, canvas: buildTable(w, h) };
      }
      const view = viewOf(w, h);
      const { project, innerW } = view;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(cacheRef.current.canvas, 0, 0);

      if (kitchenOnly && placing) {
        const a = project(TABLE_W / 4, 0);
        const b = project(TABLE_W, 0);
        const c = project(TABLE_W, TABLE_H);
        const d = project(TABLE_W / 4, TABLE_H);
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fill();
      }
      if (kitchenOnly) {
        const left = project(TABLE_W / 4, BALL_R);
        const right = project(TABLE_W / 4, TABLE_H - BALL_R);
        ctx.strokeStyle = "rgba(255,255,255,0.32)";
        ctx.lineWidth = Math.max(1, dpr);
        ctx.setLineDash([5 * dpr, 7 * dpr]);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (calledPocket != null) {
        const pocket = POCKETS.find((item) => item.id === calledPocket);
        if (pocket) {
          const p = project(pocket.x, pocket.y);
          ctx.beginPath();
          ctx.arc(p.x, p.y, spanPx(innerW, p.scale, pocket.r) * 1.14, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(244, 211, 94, 0.9)";
          ctx.lineWidth = Math.max(2, dpr * 1.6);
          ctx.stroke();
        }
      }

      const cue = balls.find((ball) => ball.id === 0);
      const from = ghost ?? (cue && !cue.pocketed ? { x: cue.x, y: cue.y } : null);
      if (showCue && from) poseRef.current = { x: from.x, y: from.y, angle: angleMilli, power };
      if (rolling && !rollingRef.current && poseRef.current) {
        strikeRef.current = { ...poseRef.current, t0: performance.now() };
      }
      rollingRef.current = rolling;

      if (showAim && from) {
        const dir = aimDir(angleMilli);
        const hit = firstBall(from, angleMilli, balls);
        const reach = TABLE_W * 0.36;
        const end = hit ?? { x: from.x + dir.x * reach, y: from.y + dir.y * reach };
        const start = project(from.x + dir.x * BALL_R * 1.15, from.y + dir.y * BALL_R * 1.15);
        const tip = project(end.x, end.y);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(1, dpr * 1.05);
        ctx.lineCap = "round";
        ctx.setLineDash([2.5 * dpr, 7 * dpr]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (hit) {
          const ghostP = project(hit.x, hit.y);
          const ghostR = ballRadiusPx(innerW, ghostP.scale);
          ctx.beginPath();
          ctx.arc(ghostP.x, ghostP.y, ghostR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.lineWidth = Math.max(1, dpr);
          ctx.stroke();
        }
      }

      const strike = strikeRef.current;
      if (strike) {
        const t = (performance.now() - strike.t0) / 150;
        if (t >= 1) strikeRef.current = null;
        else {
          const pulled = 1.28 + (strike.power / 10_000) * 4.4;
          let gap = pulled;
          let alpha = 1;
          if (t < 0.28) gap = pulled + 1.15 * (t / 0.28);
          else if (t < 0.62) gap = pulled + 1.15 + (1.05 - (pulled + 1.15)) * ((t - 0.28) / 0.34);
          else {
            gap = 1.05;
            alpha = 1 - (t - 0.62) / 0.38;
          }
          drawCue(ctx, view.projectOpen, innerW, strike, strike.angle, gap, Math.max(0, alpha));
          again = true;
        }
      } else if (showCue && from) {
        const gap = 1.28 + (power / 10_000) * 4.4;
        drawCue(ctx, view.projectOpen, innerW, from, angleMilli, gap, 1);
      }

      const motion = motionRef.current;
      const sprites: { ball: Ball; x: number; y: number; fade: number; scale: number }[] = [];
      for (const ball of balls) {
        let m = motion.get(ball.id);
        if (!m) {
          m = { x: ball.x, y: ball.y, roll: 0, heading: 0, falling: null, done: false };
          motion.set(ball.id, m);
        }
        if (ball.pocketed) {
          if (m.falling == null && !m.done) m.falling = performance.now();
          if (m.falling != null && !m.done) {
            const age = performance.now() - m.falling;
            if (age < 190) {
              const k = 1 - age / 190;
              sprites.push({ ball, x: m.x, y: m.y, fade: 0.35 + k * 0.65, scale: 0.28 + k * 0.72 });
              again = true;
            } else m.done = true;
          }
          continue;
        }
        const dx = ball.x - m.x;
        const dy = ball.y - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 80) {
          const before = project(m.x, m.y);
          const after = project(ball.x, ball.y);
          const sdx = after.x - before.x;
          const sdy = after.y - before.y;
          if (sdx * sdx + sdy * sdy > 0.2) m.heading = Math.atan2(sdy, sdx);
          m.roll += dist / BALL_R;
          m.x = ball.x;
          m.y = ball.y;
        }
        const drawX = ball.id === 0 && ghost ? ghost.x : ball.x;
        const drawY = ball.id === 0 && ghost ? ghost.y : ball.y;
        sprites.push({ ball, x: drawX, y: drawY, fade: 1, scale: 1 });
      }
      sprites.sort((a, b) => project(a.x, a.y).y - project(b.x, b.y).y);
      for (const sprite of sprites) {
        const p = project(sprite.x, sprite.y);
        const moved = motion.get(sprite.ball.id);
        const moving = sprite.fade === 1 && Math.hypot(sprite.ball.vx, sprite.ball.vy) > 40;
        paintBall(
          ctx,
          sprite.ball.id,
          p.x,
          p.y,
          ballRadiusPx(innerW, p.scale) * sprite.scale,
          moving ? (moved?.roll ?? 0) : 0,
          moved?.heading ?? 0,
          moving,
          sprite.fade,
        );
      }

      if (placing && from) {
        const spot = draft ?? from;
        const legal = draft == null || legalRef.current(draft.x, draft.y);
        const p = project(spot.x, spot.y);
        const radius = ballRadiusPx(innerW, p.scale);
        if (draft && !legal) {
          ctx.globalAlpha = 0.45;
          paintBall(ctx, 0, p.x, p.y, radius, 0, 0, false, 0.45);
          ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + Math.max(2, dpr * 1.4), 0, Math.PI * 2);
        ctx.strokeStyle = legal ? "rgba(134, 239, 172, 0.9)" : "rgba(248, 113, 113, 0.95)";
        ctx.lineWidth = Math.max(1.5, dpr * 1.4);
        ctx.stroke();
      }
      return again;
    };

    const loop = () => {
      if (stop) return;
      cancelAnimationFrame(frame);
      if (paint()) frame = requestAnimationFrame(loop);
    };
    loop();
    const observer = new ResizeObserver(() => {
      cacheRef.current = null;
      loop();
    });
    observer.observe(canvas);
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    balls,
    angleMilli,
    power,
    ghost,
    kitchenOnly,
    calledPocket,
    showAim,
    showCue,
    rolling,
    placing,
    draft,
  ]);

  const aimAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const point = tablePoint(canvas, event.clientX, event.clientY);
    const cue = balls.find((ball) => ball.id === 0);
    const from = ghost ?? cue;
    if (!from) return;
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    if (dx * dx + dy * dy < BALL_R * BALL_R) return;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const next = Math.round(deg * 1000) % 360_000;
    if (event.shiftKey) {
      let delta = next - angleMilli;
      if (delta > 180_000) delta -= 360_000;
      if (delta < -180_000) delta += 360_000;
      onAim((angleMilli + Math.round(delta * 0.22) + 360_000) % 360_000);
      return;
    }
    onAim(next);
  };

  return (
    <canvas
      ref={ref}
      className="pool-canvas"
      aria-label="Pool table"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        if (placing) {
          const point = tablePoint(event.currentTarget, event.clientX, event.clientY);
          setDraft(point);
          if (legalAt(point.x, point.y)) onPlace(point.x, point.y);
          return;
        }
        aimAt(event);
      }}
      onPointerMove={(event) => {
        const captured = event.currentTarget.hasPointerCapture(event.pointerId);
        if (!captured && event.buttons === 0) return;
        if (placing) {
          const point = tablePoint(event.currentTarget, event.clientX, event.clientY);
          setDraft(point);
          if (legalAt(point.x, point.y)) onPlace(point.x, point.y);
          return;
        }
        aimAt(event);
      }}
      onPointerUp={() => setDraft(null)}
      onPointerCancel={() => setDraft(null)}
    />
  );
}
