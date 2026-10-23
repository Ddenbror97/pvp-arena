import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  BALL_R,
  PHYSICS_V5,
  cushionLimit,
  cosMicro,
  POCKETS,
  sinMicro,
  TABLE_H,
  TABLE_W,
  type Ball,
  type Pocket,
} from "@/lib/pool/physics";
import {
  createBallLayer,
  identityOrientation,
  rollOrientation,
  type BallLayer,
  type BallSprite,
} from "@/lib/pool/spheres";
import { buildTable, whenTableArt } from "@/lib/pool/table-paint";
import { ballRadiusPx, spanPx, viewOf } from "@/lib/pool/view";
import {
  aimStep,
  pointerIntent,
  powerFromPull,
  startAim,
  type AimGesture,
} from "@/lib/pool/aim-gesture";

const SOLIDS = ["#f0c410", "#1d4ed8", "#dc2626", "#7c3aed", "#ea580c", "#15803d", "#7f1d1d"];

function colorOf(id: number): string {
  if (id === 0) return "#f7f4ee";
  if (id === 8) return "#141414";
  const n = id > 8 ? id - 9 : id - 1;
  return SOLIDS[n] ?? "#cccccc";
}

function colorRgb(id: number): [number, number, number] {
  const n = Number.parseInt(colorOf(id).slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
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

/** Screen pixels the pointer has moved opposite the shot. Positive is a pull-back. */
function pullBackPx(
  canvas: HTMLCanvasElement,
  originX: number,
  originY: number,
  clientX: number,
  clientY: number,
  cue: { x: number; y: number },
  angleMilli: number,
): number {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return 0;
  const view = viewOf(canvas.clientWidth, canvas.clientHeight);
  const span = BALL_R * 4;
  const dirX = cosMicro(angleMilli) / 1_000_000;
  const dirY = sinMicro(angleMilli) / 1_000_000;
  const from = view.project(cue.x, cue.y);
  const to = view.project(cue.x + dirX * span, cue.y + dirY * span);
  const sx = to.x - from.x;
  const sy = to.y - from.y;
  const len = Math.hypot(sx, sy);
  if (len < 1) return 0;
  const dx = ((clientX - originX) / rect.width) * canvas.clientWidth;
  const dy = ((clientY - originY) / rect.height) * canvas.clientHeight;
  return -((dx * sx + dy * sy) / len);
}

/** Screen pixels from the cue ball to the pointer. A longer gap is a harder pull. */
function cueScreenDist(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  cue: { x: number; y: number },
): number {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return 0;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const px = ((clientX - rect.left) / rect.width) * w;
  const py = ((clientY - rect.top) / rect.height) * h;
  const at = viewOf(w, h).project(cue.x, cue.y);
  return Math.hypot(px - at.x, py - at.y);
}

function tablePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const px = ((clientX - rect.left) / rect.width) * w;
  const py = ((clientY - rect.top) / rect.height) * h;
  const point = viewOf(w, h).unproject(px, py);
  return { x: Math.round(point.x), y: Math.round(point.y) };
}


type Motion = {
  x: number;
  y: number;
  roll: number;
  heading: number;
  rot: number[];
  falling: number | null;
  done: boolean;
};

type Pose = { x: number; y: number; angle: number; power: number };

type PlayHead = {
  key: readonly Ball[][] | null;
  i: number;
  stamp: number;
  done: boolean;
};

function aimDir(angleMilli: number) {
  return { x: cosMicro(angleMilli) / 1_000_000, y: sinMicro(angleMilli) / 1_000_000 };
}

function blendBalls(a: readonly Ball[], b: readonly Ball[], t: number, into: Ball[]): Ball[] {
  const span = Math.min(a.length, b.length);
  if (into.length !== span) into.length = span;
  const k = Math.max(0, Math.min(1, t));
  for (let i = 0; i < span; i++) {
    const from = a[i];
    const to = b[i];
    if (!from || !to) continue;
    const pocketed = k > 0.35 ? to.pocketed : from.pocketed;
    let row = into[i];
    if (!row) {
      row = { ...from };
      into[i] = row;
    }
    row.id = to.id;
    row.pocketed = pocketed;
    row.spin = to.spin;
    row.vx = to.vx;
    row.vy = to.vy;
    if (from.pocketed || to.pocketed) {
      const held = to.pocketed ? to : from;
      row.x = held.x;
      row.y = held.y;
    } else {
      row.x = from.x + (to.x - from.x) * k;
      row.y = from.y + (to.y - from.y) * k;
    }
  }
  return into;
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
  const atDist = (dist: number) => projectOpen(from.x - dir.x * dist, from.y - dir.y * dist);
  const tip = atDist(gap);
  const tipScale = tip.scale;
  const length = BALL_R * 46;
  const butt = atDist(gap + length);
  const along = (t: number): Pt => ({
    x: tip.x + (butt.x - tip.x) * t,
    y: tip.y + (butt.y - tip.y) * t,
  });
  const width = Math.max(3.2, ballRadiusPx(innerW, tipScale) * 0.42);
  const shift = (p: Pt, amount: number): Pt => {
    const dx = butt.x - tip.x;
    const dy = butt.y - tip.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (-dy / len) * amount, y: p.y + (dx / len) * amount };
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = "round";
  stick(ctx, shift(tip, width * 0.55), shift(butt, width * 0.7), width * 0.7, width * 1.05, "rgba(0,0,0,0.32)");

  const shaft = ctx.createLinearGradient(tip.x, tip.y, along(0.62).x, along(0.62).y);
  shaft.addColorStop(0, "#f3d7a4");
  shaft.addColorStop(0.45, "#e2b56a");
  shaft.addColorStop(1, "#c48945");
  stick(ctx, along(0.07), along(0.62), width * 0.62, width * 0.92, shaft);
  for (const band of [-0.22, -0.06, 0.1, 0.24]) {
    stick(
      ctx,
      shift(along(0.12), width * band),
      shift(along(0.58), width * band),
      0.35,
      0.45,
      "rgba(92, 48, 18, 0.28)",
    );
  }
  stick(
    ctx,
    shift(along(0.1), -width * 0.22),
    shift(along(0.58), -width * 0.28),
    width * 0.08,
    width * 0.1,
    "rgba(255,236,210,0.42)",
  );

  stick(ctx, along(0.615), along(0.645), width * 0.94, width * 1.02, "#d7b56a");
  stick(ctx, along(0.64), along(0.655), width * 0.9, width * 0.96, "#1c140e");

  const wrap = ctx.createLinearGradient(along(0.66).x, along(0.66).y, along(0.9).x, along(0.9).y);
  wrap.addColorStop(0, "#3a2a1c");
  wrap.addColorStop(0.5, "#24180f");
  wrap.addColorStop(1, "#4a3422");
  stick(ctx, along(0.655), along(0.9), width * 1.02, width * 1.22, wrap);
  stick(
    ctx,
    shift(along(0.68), -width * 0.28),
    shift(along(0.88), -width * 0.32),
    width * 0.06,
    width * 0.07,
    "rgba(255, 220, 170, 0.22)",
  );

  const buttWood = ctx.createLinearGradient(along(0.9).x, along(0.9).y, butt.x, butt.y);
  buttWood.addColorStop(0, "#8d5a2e");
  buttWood.addColorStop(1, "#4a2c16");
  stick(ctx, along(0.9), along(0.975), width * 1.18, width * 1.34, buttWood);
  stick(ctx, along(0.97), butt, width * 1.28, width * 1.22, "#14110e");
  stick(ctx, along(0.985), butt, width * 0.7, width * 0.55, "#c4a574");

  stick(ctx, along(0.018), along(0.072), width * 0.58, width * 0.66, "#f6f3ec");
  stick(ctx, along(0.068), along(0.084), width * 0.66, width * 0.7, "#1a120c");
  stick(ctx, tip, along(0.02), width * 0.5, width * 0.56, "#3a2c22");
  stick(ctx, tip, along(0.008), width * 0.36, width * 0.4, "#6a5040");
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

type Stroke = { x: number; y: number; angle: number; power: number };

type Props = {
  balls: readonly Ball[];
  angleMilli: number;
  power: number;
  ghost: { x: number; y: number } | null;
  kitchenOnly: boolean;
  calledPocket: number | null;
  showCue: boolean;
  replay: readonly Ball[][] | null;
  stroke: Stroke | null;
  onAim: (angleMilli: number) => void;
  onPower?: (power: number) => void;
  onShoot?: (power: number, angleMilli: number) => void;
  onPlace: (x: number, y: number) => void;
  onSample: (prev: readonly Ball[], next: readonly Ball[]) => void;
  onReplayDone: (finished: readonly Ball[][]) => void;
  onAimHint?: (text: string) => void;
  placing: boolean;
  legalAt: (x: number, y: number) => boolean;
};

/** A drag aims or places the cue ball. Dragging back charges power, and releasing shoots. */
export function PoolTable({
  balls,
  angleMilli,
  power,
  ghost,
  kitchenOnly,
  calledPocket,
  showCue,
  replay,
  stroke,
  onAim,
  onPower,
  onShoot,
  onPlace,
  onSample,
  onReplayDone,
  onAimHint,
  placing,
  legalAt,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cueRef = useRef<HTMLCanvasElement>(null);
  const cueBox = useRef({ ox: 0, oy: 0, w: 0, h: 0 });
  const cacheRef = useRef<{ w: number; h: number; canvas: HTMLCanvasElement } | null>(null);
  const motionRef = useRef(new Map<number, Motion>());
  const strikeRef = useRef<(Pose & { t0: number }) | null>(null);
  const pointerRef = useRef<number | null>(null);
  const legalRef = useRef(legalAt);
  legalRef.current = legalAt;
  const aimRef = useRef(onAim);
  aimRef.current = onAim;
  const powerCb = useRef(onPower);
  powerCb.current = onPower;
  const shootRef = useRef(onShoot);
  shootRef.current = onShoot;
  const pullRef = useRef(0);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const placeRef = useRef(onPlace);
  placeRef.current = onPlace;
  const hintRef = useRef(onAimHint);
  hintRef.current = onAimHint;
  const ballsRef = useRef(balls);
  ballsRef.current = balls;
  const ghostRef = useRef(ghost);
  ghostRef.current = ghost;
  const angleRef = useRef(angleMilli);
  const powerRef = useRef(power);
  const kickRef = useRef<() => void>(() => {});
  const restDistRef = useRef(0);
  const showCueRef = useRef(showCue);
  showCueRef.current = showCue;
  const replayRef = useRef(replay);
  replayRef.current = replay;
  const gestureRef = useRef<AimGesture | { kind: "place" } | null>(null);
  const sampleRef = useRef(onSample);
  sampleRef.current = onSample;
  const doneRef = useRef(onReplayDone);
  doneRef.current = onReplayDone;
  const playRef = useRef<PlayHead>({ key: null, i: 0, stamp: 0, done: false });
  const blendRef = useRef<Ball[]>([]);
  const layerRef = useRef<BallLayer | null | undefined>(undefined);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const cueIn = useRef(0);
  const cueWas = useRef(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  if (gestureRef.current == null) {
    angleRef.current = angleMilli;
    powerRef.current = power;
  }

  useEffect(() => {
    if (!placing) setDraft(null);
  }, [placing]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const syncCue = () => {
      const cue = cueRef.current;
      const screen = canvas.closest(".pool-screen");
      if (!cue || !(screen instanceof HTMLElement)) return;
      const screenBox = screen.getBoundingClientRect();
      const tableBox = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const left = screenBox.left - tableBox.left;
      const top = screenBox.top - tableBox.top;
      cue.style.left = `${left}px`;
      cue.style.top = `${top}px`;
      cue.style.width = `${screenBox.width}px`;
      cue.style.height = `${screenBox.height}px`;
      const bitmapW = Math.max(1, Math.round(screenBox.width * dpr));
      const bitmapH = Math.max(1, Math.round(screenBox.height * dpr));
      if (cue.width !== bitmapW || cue.height !== bitmapH) {
        cue.width = bitmapW;
        cue.height = bitmapH;
      }
      cueBox.current = { ox: (tableBox.left - screenBox.left) * dpr, oy: (tableBox.top - screenBox.top) * dpr, w: bitmapW, h: bitmapH };
    };
    let frame = 0;
    let stop = false;
    const paint = () => {
      const angleMilli = angleRef.current;
      const power = powerRef.current;
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
        const painted = buildTable(w, h);
        if (painted) cacheRef.current = { w, h, canvas: painted };
      }
      const view = viewOf(w, h);
      const { project, innerW } = view;
      ctx.clearRect(0, 0, w, h);
      if (cacheRef.current) ctx.drawImage(cacheRef.current.canvas, 0, 0);

      const felt = cushionLimit(PHYSICS_V5);
      if (kitchenOnly && placing) {
        const a = project(TABLE_W / 4, felt.minY);
        const b = project(felt.maxX, felt.minY);
        const c = project(felt.maxX, felt.maxY);
        const d = project(TABLE_W / 4, felt.maxY);
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
        const left = project(TABLE_W / 4, felt.minY);
        const right = project(TABLE_W / 4, felt.maxY);
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

      const now = performance.now();

      const head = playRef.current;
      let shown: readonly Ball[] = balls;
      if (replay && replay.length > 0) {
        if (head.key !== replay) {
          head.key = replay;
          head.i = 0;
          head.stamp = now;
          head.done = false;
          if (stroke) {
            strikeRef.current = {
              x: stroke.x,
              y: stroke.y,
              angle: stroke.angle,
              power: stroke.power,
              t0: now,
            };
          }
        }
        const release = head.stamp + (stroke ? 90 : 0);
        const opening = replay[0] ?? balls;
        if (now < release) {
          shown = opening;
          again = true;
        } else {
          const elapsed = now - release;
          const target = Math.min(replay.length - 1, Math.floor(elapsed / 10));
          const stepTo = Math.min(target, head.i + 6);
          while (head.i < stepTo) {
            const prev = replay[head.i];
            const next = replay[head.i + 1];
            if (prev && next) sampleRef.current(prev, next);
            head.i += 1;
          }
          const curr = replay[head.i] ?? opening;
          const upcoming = replay[Math.min(replay.length - 1, head.i + 1)] ?? curr;
          const frac = head.i >= replay.length - 1 ? 1 : Math.min(1, (elapsed - head.i * 10) / 10);
          shown = blendBalls(curr, upcoming, frac, blendRef.current);
          if (head.i < replay.length - 1) again = true;
          else if (!head.done) {
            head.done = true;
            doneRef.current(replay);
          }
        }
      } else if (head.key) {
        head.key = null;
      }

      const cueBall = shown.find((ball) => ball.id === 0);
      const from = ghost ?? (cueBall && !cueBall.pocketed ? { x: cueBall.x, y: cueBall.y } : null);

      const motion = motionRef.current;
      const replaying = !!(replay && replay.length > 0);
      const sprites: { ball: Ball; x: number; y: number; fade: number; scale: number }[] = [];
      for (const ball of shown) {
        let m = motion.get(ball.id);
        if (!m) {
          m = {
            x: ball.x,
            y: ball.y,
            roll: 0,
            heading: 0,
            rot: identityOrientation(),
            falling: null,
            done: false,
          };
          motion.set(ball.id, m);
        }
        if (ball.pocketed) {
          if (m.falling == null && !m.done) m.falling = now;
          if (m.falling != null && !m.done) {
            const age = now - m.falling;
            if (age < 190) {
              const k = 1 - age / 190;
              sprites.push({
                ball,
                x: m.x,
                y: m.y,
                fade: 0.2 + k * 0.8,
                scale: 0.22 + k * 0.78,
              });
              again = true;
            } else m.done = true;
          }
          continue;
        }
        m.falling = null;
        m.done = false;
        const drawX = !replaying && ball.id === 0 && ghost ? ghost.x : ball.x;
        const drawY = !replaying && ball.id === 0 && ghost ? ghost.y : ball.y;
        const dx = drawX - m.x;
        const dy = drawY - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist > BALL_R * 3) {
          m.x = drawX;
          m.y = drawY;
        } else if (dist > 80) {
          const before = project(m.x, m.y);
          const after = project(drawX, drawY);
          const sdx = after.x - before.x;
          const sdy = after.y - before.y;
          m.rot = rollOrientation(m.rot, sdx, sdy, dist);
          m.roll += dist / BALL_R;
          if (sdx * sdx + sdy * sdy > 0.2) m.heading = Math.atan2(sdy, sdx);
          m.x = drawX;
          m.y = drawY;
        }
        sprites.push({ ball, x: drawX, y: drawY, fade: 1, scale: 1 });
      }
      sprites.sort((a, b) => project(a.x, a.y).y - project(b.x, b.y).y);
      for (const sprite of sprites) {
        const p = project(sprite.x, sprite.y);
        const radius = ballRadiusPx(innerW, p.scale) * sprite.scale;
        const shadow = ctx.createRadialGradient(
          p.x,
          p.y + radius * 0.72,
          radius * 0.1,
          p.x,
          p.y + radius * 0.72,
          radius * 1.2,
        );
        shadow.addColorStop(0, `rgba(6, 0, 16, ${0.45 * sprite.fade})`);
        shadow.addColorStop(1, "rgba(6, 0, 16, 0)");
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.ellipse(
          p.x + radius * 0.06,
          p.y + radius * 0.72,
          radius * 0.92,
          radius * 0.36,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      const cueCanvas = cueRef.current;
      const cueCtx = cueCanvas?.getContext("2d");
      if (cueCanvas && cueCtx) {
        cueCtx.setTransform(1, 0, 0, 1, 0, 0);
        cueCtx.clearRect(0, 0, cueCanvas.width, cueCanvas.height);
      }
      const projectCue = (x: number, y: number) => {
        const p = view.projectOpen(x, y);
        return { x: p.x + cueBox.current.ox, y: p.y + cueBox.current.oy, scale: p.scale };
      };
      const strike = strikeRef.current;
      if (showCue && !cueWas.current) cueIn.current = now;
      cueWas.current = showCue;
      if (strike) {
        const t = (now - strike.t0) / 160;
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
          if (cueCtx) {
            drawCue(cueCtx, projectCue, innerW, strike, strike.angle, gap, Math.max(0, alpha));
          }
          again = true;
        }
      } else if (showCue && from && cueCtx) {
        const gap = 1.28 + (power / 10_000) * 4.4;
        const alpha = Math.min(1, (now - cueIn.current) / 140);
        if (alpha < 1) again = true;
        drawCue(cueCtx, projectCue, innerW, from, angleMilli, gap, alpha);
      }

      if (!layerRef.current || layerRef.current.disposed) {
        const off = document.createElement("canvas");
        offscreenRef.current = off;
        layerRef.current = createBallLayer(off);
      }
      const layer = layerRef.current;
      const offscreen = offscreenRef.current;
      let usedGl = false;
      if (layer && offscreen) {
        const glSprites: BallSprite[] = sprites.map((sprite) => {
          const p = project(sprite.x, sprite.y);
          const radius = ballRadiusPx(innerW, p.scale) * sprite.scale;
          const sink = sprite.fade < 1 ? (1 - sprite.fade) * radius * 0.65 : 0;
          const moved = motion.get(sprite.ball.id);
          return {
            id: sprite.ball.id,
            x: p.x,
            y: p.y + sink,
            radius,
            fade: sprite.fade,
            color: colorRgb(sprite.ball.id),
            stripe: sprite.ball.id > 8,
            rot: moved?.rot ?? identityOrientation(),
          };
        });
        layer.resize(w, h);
        usedGl = layer.draw(glSprites);
        if (usedGl) ctx.drawImage(offscreen, 0, 0);
      }
      if (!usedGl) {
        for (const sprite of sprites) {
          const p = project(sprite.x, sprite.y);
          const moved = motion.get(sprite.ball.id);
          const moving = sprite.fade === 1 && Math.hypot(sprite.ball.vx, sprite.ball.vy) > 40;
          const sink =
            sprite.fade < 1 ? (1 - sprite.fade) * ballRadiusPx(innerW, p.scale) * 0.4 : 0;
          paintBall(
            ctx,
            sprite.ball.id,
            p.x,
            p.y + sink,
            ballRadiusPx(innerW, p.scale) * sprite.scale,
            moving ? (moved?.roll ?? 0) : 0,
            moved?.heading ?? 0,
            moving,
            sprite.fade,
          );
        }
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
    kickRef.current = () => {
      if (!stop) loop();
    };
    void whenTableArt().then(() => {
      if (!stop) kickRef.current();
    });
    syncCue();
    loop();
    const observer = new ResizeObserver(() => {
      cacheRef.current = null;
      syncCue();
      loop();
    });
    observer.observe(canvas);
    const screen = canvas.closest(".pool-screen");
    if (screen) observer.observe(screen);
    return () => {
      stop = true;
      kickRef.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    balls,
    ghost,
    kitchenOnly,
    calledPocket,
    showCue,
    replay,
    stroke,
    placing,
    draft,
  ]);

  useEffect(() => {
    kickRef.current();
  }, [
    angleMilli,
    power,
    balls,
    ghost,
    kitchenOnly,
    calledPocket,
    showCue,
    replay,
    stroke,
    placing,
    draft,
  ]);

  useEffect(() => {
    return () => layerRef.current?.dispose();
  }, []);

  const cuePoint = () => {
    const placed = ghostRef.current;
    if (placed) return placed;
    return ballsRef.current.find((ball) => ball.id === 0) ?? null;
  };

  const charge = (event: PointerEvent<HTMLCanvasElement>, cue: { x: number; y: number }) => {
    const canvas = ref.current;
    const origin = originRef.current;
    if (!canvas || !origin || gestureRef.current?.kind === "place") return;
    const dragged =
      gestureRef.current?.kind === "cue-stick"
        ? cueScreenDist(canvas, event.clientX, event.clientY, cue) - restDistRef.current
        : pullBackPx(canvas, origin.x, origin.y, event.clientX, event.clientY, cue, angleRef.current);
    const next = powerFromPull(dragged);
    if (next === pullRef.current) return;
    pullRef.current = next;
    powerRef.current = next === 0 ? 1 : next;
    powerCb.current?.(powerRef.current);
  };

  const aimAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    const gesture = gestureRef.current;
    const cue = cuePoint();
    if (!canvas || !gesture || gesture.kind === "place" || !cue) return;
    const point = tablePoint(canvas, event.clientX, event.clientY);
    const step = aimStep(gesture, point, cue, angleRef.current, event.shiftKey);
    gestureRef.current = step.gesture;
    if (step.angle != null) {
      angleRef.current = step.angle;
      aimRef.current(step.angle);
    }
    charge(event, cue);
    kickRef.current();
  };

  const endGesture = (shoot: boolean) => {
    const gesture = gestureRef.current;
    const pulled = pullRef.current;
    gestureRef.current = null;
    pullRef.current = 0;
    originRef.current = null;
    setDraft(null);
    if (!gesture || gesture.kind === "place") return;
    if (shoot && pulled > 0 && showCueRef.current) {
      shootRef.current?.(pulled, angleRef.current);
      return;
    }
    if (gesture.kind === "from-cue" && !gesture.armed) hintRef.current?.("Drag to aim.");
    else hintRef.current?.("Drag back and release to shoot.");
  };

  return (
    <>
    <canvas ref={cueRef} className="pool-cue" aria-hidden />
    <canvas
      ref={ref}
      className="pool-canvas"
      aria-label="Pool table. Drag to aim. Drag back and release to shoot. On a phone, drag with your finger. Drag the cue ball when it is ball in hand."
      onPointerDown={(event) => {
        if (pointerRef.current != null) return;
        pointerRef.current = event.pointerId;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Capture fails for a pointer that was already released. Aim still applies.
        }
        originRef.current = { x: event.clientX, y: event.clientY };
        pullRef.current = 0;
        const point = tablePoint(event.currentTarget, event.clientX, event.clientY);
        const cue = cuePoint();
        if (cue) restDistRef.current = cueScreenDist(event.currentTarget, event.clientX, event.clientY, cue);
        if (!showCueRef.current && !placing) {
          hintRef.current?.(replayRef.current ? "Balls are still moving." : "It is not your shot.");
          return;
        }
        if (placing && pointerIntent(true, point, cue) === "place") {
          gestureRef.current = { kind: "place" };
          setDraft(point);
          if (legalRef.current(point.x, point.y)) placeRef.current(point.x, point.y);
          else hintRef.current?.("That spot is not open.");
          return;
        }
        if (!cue) return;
        const started = startAim(point, cue, angleRef.current);
        gestureRef.current = started;
        if (started.kind === "absolute" || started.kind === "cue-stick") aimAt(event);
      }}
      onPointerMove={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        const captured = event.currentTarget.hasPointerCapture(event.pointerId);
        if (!captured && event.buttons === 0) return;
        if (gestureRef.current?.kind === "place") {
          const point = tablePoint(event.currentTarget, event.clientX, event.clientY);
          setDraft(point);
          if (legalRef.current(point.x, point.y)) placeRef.current(point.x, point.y);
          return;
        }
        aimAt(event);
      }}
      onPointerUp={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        aimAt(event);
        endGesture(true);
      }}
      onPointerCancel={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        endGesture(false);
      }}
    />
    </>
  );
}
