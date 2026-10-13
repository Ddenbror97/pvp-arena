import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { AvatarCrop } from "@/lib/avatar-upload/limits";
import { cn } from "@/lib/utils";

const MAX_ZOOM = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type View = { zoom: number; cx: number; cy: number };

/** Square crop around a centre point, in source pixels, kept inside the image. */
function toCrop(w: number, h: number, v: View): AvatarCrop {
  const side = Math.min(w, h) / v.zoom;
  const left = clamp(v.cx - side / 2, 0, w - side);
  const top = clamp(v.cy - side / 2, 0, h - side);
  return { x: left / w, y: top / h, size: 1 / v.zoom };
}

function settle(w: number, h: number, v: View): View {
  const zoom = clamp(v.zoom, 1, MAX_ZOOM);
  const half = Math.min(w, h) / zoom / 2;
  return { zoom, cx: clamp(v.cx, half, w - half), cy: clamp(v.cy, half, h - half) };
}

/**
 * Drag (mouse, touch or pen), pinch, wheel, slider or keyboard to position a
 * square avatar. The square shows exactly what other players will see.
 */
export function AvatarCropper({
  src,
  width,
  height,
  disabled,
  onChange,
}: {
  src: string;
  width: number;
  height: number;
  disabled?: boolean | undefined;
  onChange: (crop: AvatarCrop) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(288);
  const [view, setView] = useState<View>(() => ({ zoom: 1, cx: width / 2, cy: height / 2 }));
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const update = useCallback(
    (fn: (v: View) => View) => setView((v) => settle(width, height, fn(v))),
    [width, height],
  );

  useEffect(() => onChange(toCrop(width, height, view)), [view, width, height, onChange]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSide(el.clientWidth));
    ro.observe(el);
    setSide(el.clientWidth);
    const wheel = (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      update((v) => ({ ...v, zoom: v.zoom * Math.exp(-e.deltaY * 0.0015) }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", wheel);
    };
  }, [update, disabled]);

  const base = side / Math.min(width, height);
  const scale = base * view.zoom;
  const crop = toCrop(width, height, view);
  const tx = -crop.x * width * scale;
  const ty = -crop.y * height * scale;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom: view.zoom };
    }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || disabled) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const start = pinch.current;
      update((v) => ({ ...v, zoom: start.zoom * (dist / Math.max(1, start.dist)) }));
      return;
    }
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    update((v) => ({ ...v, cx: v.cx - dx / (base * v.zoom), cy: v.cy - dy / (base * v.zoom) }));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = (e.shiftKey ? 48 : 12) / scale;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      update((v) => ({ ...v, cx: v.cx + move[0], cy: v.cy + move[1] }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      update((v) => ({ ...v, zoom: v.zoom * 1.15 }));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      update((v) => ({ ...v, zoom: v.zoom / 1.15 }));
    }
  }

  const iconBtn =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition hover:bg-secondary/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100";

  return (
    <div className="flex flex-col items-center">
      <div
        ref={box}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label="Avatar position. Drag to move. Use the arrow keys to move and plus or minus to zoom."
        aria-roledescription="image cropper"
        className={cn(
          "relative aspect-square w-full max-w-[18rem] touch-none select-none overflow-hidden rounded-2xl bg-[#0f0f16] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled ? "cursor-default opacity-80" : "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
          style={{ width, height, transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[8%] shadow-[0_0_0_9999px_rgba(8,8,14,0.62)] ring-2 ring-white/80"
        />
      </div>

      <div className="mt-4 flex w-full max-w-[18rem] items-center gap-2">
        <button
          type="button"
          className={iconBtn}
          disabled={disabled || view.zoom <= 1}
          onClick={() => update((v) => ({ ...v, zoom: v.zoom / 1.25 }))}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <SliderPrimitive.Root
          className="relative flex h-11 flex-1 touch-none select-none items-center"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={[view.zoom]}
          disabled={!!disabled}
          onValueChange={([z]) => update((v) => ({ ...v, zoom: z ?? v.zoom }))}
          aria-label="Zoom"
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="Zoom"
            aria-valuetext={`${Math.round(view.zoom * 100)}%`}
            className="block h-6 w-6 rounded-full border-2 border-primary bg-background shadow transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 motion-reduce:transition-none"
          />
        </SliderPrimitive.Root>
        <button
          type="button"
          className={iconBtn}
          disabled={disabled || view.zoom >= MAX_ZOOM}
          onClick={() => update((v) => ({ ...v, zoom: v.zoom * 1.25 }))}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconBtn}
          disabled={disabled}
          onClick={() => setView({ zoom: 1, cx: width / 2, cy: height / 2 })}
          aria-label="Reset position"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
