import { useEffect, useRef, type PointerEvent } from "react";
import { BALL_R, POCKETS, TABLE_H, TABLE_W, type Ball } from "@/lib/pool/physics";

const COLORS = ["#f4d35e", "#3a86ff", "#e63946", "#9b5de5", "#f77f00", "#2a9d8f", "#9b2226"];
/** Far rail is this fraction of the near rail. The kitchen is the near edge. */
const FAR = 0.42;

function colorOf(id: number): string {
  if (id === 0) return "#f6f3ea";
  if (id === 8) return "#161616";
  const n = id > 8 ? id - 9 : id - 1;
  return COLORS[n] ?? "#cccccc";
}

type View = {
  project: (tableX: number, tableY: number) => { x: number; y: number; scale: number };
  unproject: (px: number, py: number) => { x: number; y: number };
};

/** Length runs up the screen. tableX 0 is the near rail, TABLE_W is the far rail. */
function viewOf(w: number, h: number): View {
  const padX = w * 0.04;
  const padY = h * 0.06;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const project = (tableX: number, tableY: number) => {
    const t = Math.min(1, Math.max(0, tableX / TABLE_W));
    const scale = 1 + (FAR - 1) * t;
    return {
      x: w / 2 + (tableY / TABLE_H - 0.5) * innerW * scale,
      y: padY + innerH * (1 - t),
      scale,
    };
  };
  const unproject = (px: number, py: number) => {
    const t = 1 - (py - padY) / innerH;
    const scale = 1 + (FAR - 1) * t;
    return {
      x: t * TABLE_W,
      y: ((px - w / 2) / (innerW * scale) + 0.5) * TABLE_H,
    };
  };
  return { project, unproject };
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

type Props = {
  balls: readonly Ball[];
  angleMilli: number;
  power: number;
  ghost: { x: number; y: number } | null;
  kitchenOnly: boolean;
  calledPocket: number | null;
  showAim: boolean;
  onAim: (angleMilli: number) => void;
  onPlace: (x: number, y: number) => void;
  placing: boolean;
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
  onAim,
  onPlace,
  placing,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = Math.max(1, canvas.clientWidth);
      const cssH = Math.max(1, canvas.clientHeight);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { project } = viewOf(w, h);
      const corner = (tableX: number, tableY: number, grow: number) => {
        const p = project(tableX, tableY);
        const mid = w / 2;
        return { x: mid + (p.x - mid) * grow, y: p.y };
      };
      const trap = (grow: number) => {
        const a = corner(0, 0, grow);
        const b = corner(TABLE_W, 0, grow);
        const c = corner(TABLE_W, TABLE_H, grow);
        const d = corner(0, TABLE_H, grow);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
      };

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121018";
      trap(1.08);
      ctx.fill();
      ctx.strokeStyle = "rgba(210, 186, 255, 0.28)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      const felt = ctx.createLinearGradient(0, 0, 0, h);
      felt.addColorStop(0, "#6a38c4");
      felt.addColorStop(1, "#7d4ad8");
      ctx.fillStyle = felt;
      trap(1);
      ctx.fill();

      ctx.fillStyle = "#f4f1ff";
      const diamond = (tableX: number, tableY: number) => {
        const p = project(tableX, tableY);
        const s = 5 * dpr * p.scale;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.7, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.7, p.y);
        ctx.closePath();
        ctx.fill();
      };
      for (const t of [0.22, 0.5, 0.78]) diamond(t * TABLE_W, -TABLE_H * 0.02);
      for (const t of [0.22, 0.5, 0.78]) diamond(t * TABLE_W, TABLE_H * 1.02);

      if (kitchenOnly) {
        const left = project(TABLE_W / 4, 0);
        const right = project(TABLE_W / 4, TABLE_H);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.setLineDash([6 * dpr, 6 * dpr]);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const pocket of POCKETS) {
        const p = project(pocket.x, pocket.y);
        ctx.beginPath();
        ctx.fillStyle = pocket.id === calledPocket ? "#f4d35e" : "#070707";
        ctx.arc(p.x, p.y, (pocket.r / TABLE_H) * (w * 0.92) * p.scale * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const cue = balls.find((b) => b.id === 0);
      const from = ghost ?? (cue && !cue.pocketed ? cue : null);
      if (showAim && from) {
        const reach = TABLE_W * (0.18 + (power / 10_000) * 0.46);
        const rad = (angleMilli / 1000) * (Math.PI / 180);
        const gap = BALL_R * 1.5;
        const start = project(from.x + Math.cos(rad) * gap, from.y + Math.sin(rad) * gap);
        const end = project(from.x + Math.cos(rad) * reach, from.y + Math.sin(rad) * reach);
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.lineWidth = Math.max(1.5, 1.6 * dpr);
        ctx.setLineDash([4 * dpr, 9 * dpr]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();
        const stick = BALL_R * (18 + (power / 10_000) * 8);
        const butt = project(from.x - Math.cos(rad) * stick, from.y - Math.sin(rad) * stick);
        const tip = project(from.x - Math.cos(rad) * gap, from.y - Math.sin(rad) * gap);
        ctx.strokeStyle = "#d7b48a";
        ctx.lineWidth = Math.max(4, 7 * dpr * start.scale);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(butt.x, butt.y);
        ctx.stroke();
      }

      const paint = (b: Ball, x: number, y: number) => {
        const p = project(x, y);
        const radius = (BALL_R / TABLE_H) * (w * 0.92) * p.scale * 0.5;
        ctx.beginPath();
        ctx.fillStyle = colorOf(b.id);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (b.id > 8) {
          ctx.fillStyle = "#f6f3ea";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colorOf(b.id);
          ctx.fillRect(p.x - radius, p.y - radius * 0.38, radius * 2, radius * 0.76);
        }
        if (b.id !== 0) {
          ctx.fillStyle = b.id === 8 ? "#f6f3ea" : "#111";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = b.id === 8 ? "#111" : "#f6f3ea";
          ctx.font = `${Math.max(8, radius * 0.7)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.id), p.x, p.y + 0.5);
        }
      };

      for (const b of balls) {
        if (b.pocketed || b.id === 0) continue;
        paint(b, b.x, b.y);
      }
      if (cue && !cue.pocketed) paint(cue, ghost?.x ?? cue.x, ghost?.y ?? cue.y);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [balls, angleMilli, power, ghost, kitchenOnly, calledPocket, showAim]);

  const aimAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const point = tablePoint(canvas, event.clientX, event.clientY);
    const cue = balls.find((b) => b.id === 0);
    const from = ghost ?? cue;
    if (!from) return;
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    if (dx * dx + dy * dy < BALL_R * BALL_R) return;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    onAim(Math.round(deg * 1000) % 360_000);
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
          onPlace(point.x, point.y);
        }
        aimAt(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 0 && event.pointerType !== "touch") return;
        aimAt(event);
      }}
    />
  );
}
