import { useEffect, useRef, type PointerEvent } from "react";
import { BALL_R, POCKETS, TABLE_H, TABLE_W, type Ball } from "@/lib/pool/physics";

const PAD = 0.045;
const COLORS = ["#f4d35e", "#3a86ff", "#e63946", "#9b5de5", "#f77f00", "#2a9d8f", "#9b2226"];

function colorOf(id: number): string {
  if (id === 0) return "#f6f3ea";
  if (id === 8) return "#161616";
  const n = id > 8 ? id - 9 : id - 1;
  return COLORS[n] ?? "#cccccc";
}

function tablePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const x = Math.round(((fx - PAD) / (1 - PAD * 2)) * TABLE_W);
  const y = Math.round(((fy - PAD) / (1 - PAD * 2)) * TABLE_H);
  return { x, y };
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
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const padX = w * PAD;
      const padY = h * PAD;
      const innerW = w - padX * 2;
      const innerH = h - padY * 2;
      const px = (x: number) => padX + (x / TABLE_W) * innerW;
      const py = (y: number) => padY + (y / TABLE_H) * innerH;
      const r = (BALL_R / TABLE_W) * innerW;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#3a2414";
      ctx.beginPath();
      ctx.roundRect(padX * 0.35, padY * 0.35, w - padX * 0.7, h - padY * 0.7, 18 * dpr);
      ctx.fill();
      ctx.fillStyle = "#0e6b45";
      ctx.fillRect(padX, padY, innerW, innerH);

      if (kitchenOnly) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.setLineDash([6 * dpr, 6 * dpr]);
        ctx.beginPath();
        ctx.moveTo(px(TABLE_W / 4), py(0));
        ctx.lineTo(px(TABLE_W / 4), py(TABLE_H));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const pocket of POCKETS) {
        ctx.beginPath();
        ctx.fillStyle = pocket.id === calledPocket ? "#f4d35e" : "#070707";
        ctx.arc(px(pocket.x), py(pocket.y), (pocket.r / TABLE_W) * innerW, 0, Math.PI * 2);
        ctx.fill();
      }

      const cue = balls.find((b) => b.id === 0);
      const from = ghost ?? (cue && !cue.pocketed ? cue : null);
      if (showAim && from) {
        const reach = innerW * (0.08 + (power / 10_000) * 0.28);
        const rad = (angleMilli / 1000) * (Math.PI / 180);
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(px(from.x), py(from.y));
        ctx.lineTo(px(from.x) + Math.cos(rad) * reach, py(from.y) + Math.sin(rad) * reach);
        ctx.stroke();
      }

      const paint = (b: Ball, x: number, y: number) => {
        ctx.beginPath();
        ctx.fillStyle = colorOf(b.id);
        ctx.arc(px(x), py(y), r, 0, Math.PI * 2);
        ctx.fill();
        if (b.id > 8) {
          ctx.fillStyle = "#f6f3ea";
          ctx.beginPath();
          ctx.arc(px(x), py(y), r * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colorOf(b.id);
          ctx.fillRect(px(x) - r, py(y) - r * 0.38, r * 2, r * 0.76);
        }
        if (b.id !== 0) {
          ctx.fillStyle = b.id === 8 ? "#f6f3ea" : "#111";
          ctx.beginPath();
          ctx.arc(px(x), py(y), r * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = b.id === 8 ? "#111" : "#f6f3ea";
          ctx.font = `${Math.max(8, r * 0.7)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.id), px(x), py(y) + 0.5);
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
      className="h-full w-full touch-none rounded-xl"
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
