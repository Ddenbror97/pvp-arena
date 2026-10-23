import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  BALL_R,
  cosMicro,
  POCKETS,
  sinMicro,
  TABLE_H,
  TABLE_W,
  traceAim,
  type AimTrace,
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

function tablePoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const px = ((clientX - rect.left) / rect.width) * w;
  const py = ((clientY - rect.top) / rect.height) * h;
  const point = viewOf(w, h).unproject(px, py);
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
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
  ctx.save();
  ctx.shadowColor = "rgba(167, 109, 255, 0.9)";
  ctx.shadowBlur = s * 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.62, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.62, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - s, x, y + s);
  g.addColorStop(0, "#f4e9ff");
  g.addColorStop(0.45, "#c084fc");
  g.addColorStop(1, "#7e22ce");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = Math.max(0.6, s * 0.1);
  ctx.stroke();
  ctx.restore();
}

function weaveHash(ix: number, iy: number): number {
  let n = (ix * 374761393 + iy * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Tileable wool nap. Built once and repeated, so the cloth is not a stretched stain. */
let clothWeave: HTMLCanvasElement | null = null;
function feltWeave(): HTMLCanvasElement {
  if (clothWeave) return clothWeave;
  const w = 256;
  const h = 256;
  const tile = document.createElement("canvas");
  tile.width = w;
  tile.height = h;
  const ctx = tile.getContext("2d");
  clothWeave = tile;
  if (!ctx) return tile;
  const img = ctx.createImageData(w, h);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const fine = weaveHash(x, y);
      const nap = weaveHash(x >> 2, y);
      const grain = (fine - 0.5) * 14 + (nap - 0.5) * 16;
      const i = (y * w + x) * 4;
      img.data[i] = clamp(96 + grain * 0.85);
      img.data[i + 1] = clamp(38 + grain * 0.28);
      img.data[i + 2] = clamp(158 + grain * 0.55);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 46; i++) {
    const y = weaveHash(i, 11) * h;
    const x0 = weaveHash(i, 12) * w;
    const len = 22 + weaveHash(i, 13) * 54;
    ctx.strokeStyle =
      i % 2 === 0 ? "rgba(244, 228, 255, 0.13)" : "rgba(36, 8, 64, 0.16)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + len, y + (weaveHash(i, 14) - 0.5) * 1.4);
    ctx.stroke();
  }
  return tile;
}

function paintPocket(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number) => { x: number; y: number; scale: number },
  innerW: number,
  pocket: Pocket,
) {
  const p = project(pocket.x, pocket.y);
  const mouth = spanPx(innerW, p.scale, pocket.r);
  const cloth = project(TABLE_W / 2, TABLE_H / 2);
  const dx = cloth.x - p.x;
  const dy = cloth.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  ctx.beginPath();
  ctx.arc(p.x, p.y, mouth * 1.14, 0, Math.PI * 2);
  const metal = ctx.createLinearGradient(p.x - mouth, p.y - mouth, p.x + mouth, p.y + mouth);
  metal.addColorStop(0, "#f7edd8");
  metal.addColorStop(0.38, "#d4b483");
  metal.addColorStop(0.72, "#8d6b3f");
  metal.addColorStop(1, "#2c2116");
  ctx.fillStyle = metal;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, mouth, 0, Math.PI * 2);
  const hole = ctx.createRadialGradient(
    p.x - ux * mouth * 0.18,
    p.y - uy * mouth * 0.22,
    mouth * 0.05,
    p.x,
    p.y,
    mouth,
  );
  hole.addColorStop(0, "#000000");
  hole.addColorStop(0.5, "#05060a");
  hole.addColorStop(0.82, "#121018");
  hole.addColorStop(1, "#241c2c");
  ctx.fillStyle = hole;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, mouth * 0.96, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = Math.max(1, mouth * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x - ux * mouth * 0.28, p.y - uy * mouth * 0.28, mouth * 0.34, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = Math.max(1, mouth * 0.04);
  ctx.stroke();
}

function bronzeCorners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rail: number,
  radius: number,
) {
  const span = rail * 1.05;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, span, span);
  ctx.rect(x + w - span, y, span, span);
  ctx.rect(x, y + h - span, span, span);
  ctx.rect(x + w - span, y + h - span, span, span);
  ctx.clip();
  const metal = ctx.createLinearGradient(x, y, x + span, y + span);
  metal.addColorStop(0, "#f3e4c4");
  metal.addColorStop(0.4, "#c49a58");
  metal.addColorStop(1, "#5c3e22");
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 244, 220, 0.55)";
  ctx.lineWidth = Math.max(1.1, rail * 0.055);
  ctx.stroke();
  ctx.restore();
}

function buildTable(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const view = viewOf(w, h);
  const { project, innerW, innerH, padX, padY, rail } = view;
  const clothX = padX;
  const clothY = padY;
  const outerX = clothX - rail;
  const outerY = clothY - rail;
  const outerW = innerW + rail * 2;
  const outerH = innerH + rail * 2;
  const outerR = rail * 0.92;
  const cushion = rail * 0.36;
  const midX = clothX + innerW / 2;
  const midY = clothY + innerH / 2;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.filter = "blur(18px)";
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  roundedRect(ctx, outerX + rail * 0.15, outerY + rail * 0.42, outerW, outerH, outerR);
  ctx.fill();
  ctx.restore();

  const cabinet = ctx.createLinearGradient(outerX, outerY, outerX, outerY + outerH);
  cabinet.addColorStop(0, "#3a3a40");
  cabinet.addColorStop(0.045, "#1c1c22");
  cabinet.addColorStop(0.18, "#0c0c10");
  cabinet.addColorStop(0.82, "#07070a");
  cabinet.addColorStop(0.96, "#16161c");
  cabinet.addColorStop(1, "#2a2a30");
  roundedRect(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.fillStyle = cabinet;
  ctx.fill();

  ctx.save();
  roundedRect(ctx, outerX, outerY, outerW, outerH * 0.48, outerR);
  ctx.clip();
  const gloss = ctx.createLinearGradient(outerX, outerY, outerX + outerW, outerY + outerH * 0.4);
  gloss.addColorStop(0, "rgba(255,255,255,0.16)");
  gloss.addColorStop(0.35, "rgba(255,255,255,0.04)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(outerX, outerY, outerW, outerH * 0.48);
  ctx.restore();

  ctx.save();
  const led = Math.max(1.25, rail * 0.055);
  roundedRect(
    ctx,
    outerX + led,
    outerY + led,
    outerW - led * 2,
    outerH - led * 2,
    Math.max(0, outerR - led),
  );
  ctx.strokeStyle = "rgba(186, 140, 255, 0.78)";
  ctx.lineWidth = led;
  ctx.shadowColor = "rgba(140, 70, 255, 0.55)";
  ctx.shadowBlur = rail * 0.28;
  ctx.stroke();
  ctx.restore();

  bronzeCorners(ctx, outerX, outerY, outerW, outerH, rail, outerR);

  roundedRect(
    ctx,
    clothX - cushion,
    clothY - cushion,
    innerW + cushion * 2,
    innerH + cushion * 2,
    cushion * 0.85,
  );
  const rubber = ctx.createLinearGradient(clothX, clothY - cushion, clothX, clothY + cushion);
  rubber.addColorStop(0, "#2a2238");
  rubber.addColorStop(0.45, "#120e18");
  rubber.addColorStop(1, "#241c30");
  ctx.fillStyle = rubber;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.rect(clothX, clothY, innerW, innerH);
  addHoles(ctx, project, innerW, 1);
  ctx.clip("evenodd");
  const weave = ctx.createPattern(feltWeave(), "repeat");
  ctx.fillStyle = weave ?? "#5a218f";
  ctx.fillRect(clothX, clothY, innerW, innerH);
  const light = ctx.createRadialGradient(
    midX,
    midY - innerH * 0.12,
    innerH * 0.04,
    midX,
    midY,
    innerW * 0.55,
  );
  light.addColorStop(0, "rgba(255,255,255,0.07)");
  light.addColorStop(0.5, "rgba(255,255,255,0)");
  light.addColorStop(1, "rgba(16,0,28,0.22)");
  ctx.fillStyle = light;
  ctx.fillRect(clothX, clothY, innerW, innerH);
  ctx.strokeStyle = "rgba(20, 0, 36, 0.45)";
  ctx.lineWidth = Math.max(8, rail * 0.28);
  ctx.strokeRect(clothX, clothY, innerW, innerH);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(clothX, clothY, innerW, innerH);
  addHoles(ctx, project, innerW, 1);
  ctx.clip("evenodd");
  ctx.strokeStyle = "rgba(232, 206, 160, 0.42)";
  ctx.lineWidth = Math.max(1.25, rail * 0.045);
  ctx.strokeRect(clothX, clothY, innerW, innerH);
  ctx.restore();

  for (const pocket of POCKETS) paintPocket(ctx, project, innerW, pocket);

  const sight = Math.max(3.2, innerW * 0.0042);
  const out = rail * 0.46;
  for (const n of [1, 2, 3, 5, 6, 7]) {
    const top = project((n / 8) * TABLE_W, TABLE_H);
    const bottom = project((n / 8) * TABLE_W, 0);
    diamond(ctx, top.x, top.y - out, sight);
    diamond(ctx, bottom.x, bottom.y + out, sight);
  }
  for (const t of [0.25, 0.5, 0.75]) {
    const left = project(0, t * TABLE_H);
    const right = project(TABLE_W, t * TABLE_H);
    diamond(ctx, left.x - out, left.y, sight);
    diamond(ctx, right.x + out, right.y, sight);
  }
  return canvas;
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

function insideFrame(p: Pt, w: number, h: number, margin: number) {
  return p.x >= margin && p.y >= margin && p.x <= w - margin && p.y <= h - margin;
}

function containedButt(tip: Pt, butt: Pt, w: number, h: number, margin: number): Pt {
  let t = 1;
  for (let i = 0; i < 12; i++) {
    const at = { x: tip.x + (butt.x - tip.x) * t, y: tip.y + (butt.y - tip.y) * t };
    if (insideFrame(at, w, h, margin) || t < 0.08) return at;
    t *= 0.72;
  }
  return tip;
}

function drawCue(
  ctx: CanvasRenderingContext2D,
  projectOpen: (x: number, y: number) => { x: number; y: number; scale: number },
  innerW: number,
  from: { x: number; y: number },
  angleMilli: number,
  gapBalls: number,
  alpha: number,
  w: number,
  h: number,
) {
  const dir = aimDir(angleMilli);
  const gap = BALL_R * gapBalls;
  const atDist = (dist: number) => projectOpen(from.x - dir.x * dist, from.y - dir.y * dist);
  const tip = atDist(gap);
  const tipScale = tip.scale;
  const margin = Math.max(8, Math.min(w, h) * 0.015);
  let length = BALL_R * 46;
  let butt: Pt = atDist(gap + length);
  for (let i = 0; i < 6 && !insideFrame(butt, w, h, margin); i++) {
    length *= 0.8;
    butt = atDist(gap + length);
  }
  butt = containedButt(tip, butt, w, h, margin);
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

function drawGuide(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number) => { x: number; y: number; scale: number },
  innerW: number,
  dpr: number,
  guide: AimTrace,
) {
  const strokeTo = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const p = project(a.x, a.y);
    const q = project(b.x, b.y);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  };
  const start = {
    x: guide.from.x + guide.dir.x * BALL_R * 1.15,
    y: guide.from.y + guide.dir.y * BALL_R * 1.15,
  };
  const reach = Math.hypot(guide.cueStop.x - start.x, guide.cueStop.y - start.y);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, dpr * 1.05);
  if (reach > BALL_R * 0.4) {
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.setLineDash([2.5 * dpr, 7 * dpr]);
    strokeTo(start, guide.cueStop);
    ctx.setLineDash([]);
  }
  if (guide.cueBank) {
    const end = {
      x: guide.cueBank.at.x + guide.cueBank.dir.x * TABLE_W * 0.16,
      y: guide.cueBank.at.y + guide.cueBank.dir.y * TABLE_W * 0.16,
    };
    ctx.strokeStyle = "rgba(244, 211, 94, 0.8)";
    ctx.setLineDash([2 * dpr, 6 * dpr]);
    strokeTo(guide.cueBank.at, end);
    ctx.setLineDash([]);
  }
  const hit = guide.contact;
  if (!hit) return "open";
  const ghost = project(hit.cue.x, hit.cue.y);
  ctx.beginPath();
  ctx.arc(ghost.x, ghost.y, ballRadiusPx(innerW, ghost.scale), 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1, dpr);
  ctx.stroke();
  if (guide.objectStop) {
    const span = Math.hypot(guide.objectStop.x - hit.object.x, guide.objectStop.y - hit.object.y);
    if (span > BALL_R * 0.6) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(1, dpr);
      ctx.setLineDash([]);
      strokeTo(hit.object, guide.objectStop);
    }
  }
  if (guide.objectBank) {
    const end = {
      x: guide.objectBank.at.x + guide.objectBank.dir.x * TABLE_W * 0.14,
      y: guide.objectBank.at.y + guide.objectBank.dir.y * TABLE_W * 0.14,
    };
    ctx.strokeStyle = "rgba(244, 211, 94, 0.75)";
    ctx.setLineDash([2 * dpr, 5 * dpr]);
    strokeTo(guide.objectBank.at, end);
    ctx.setLineDash([]);
  }
  return "ball";
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
  spinX: number;
  spinY: number;
  ghost: { x: number; y: number } | null;
  kitchenOnly: boolean;
  calledPocket: number | null;
  showAim: boolean;
  showCue: boolean;
  replay: readonly Ball[][] | null;
  stroke: Stroke | null;
  onAim: (angleMilli: number) => void;
  onPower?: (power: number) => void;
  onShoot?: (power: number) => void;
  onPlace: (x: number, y: number) => void;
  onSample: (prev: readonly Ball[], next: readonly Ball[]) => void;
  onReplayDone: () => void;
  onAimHint?: (text: string) => void;
  placing: boolean;
  legalAt: (x: number, y: number) => boolean;
};

/** A drag aims or places the cue ball. Dragging back charges power, and releasing shoots. */
export function PoolTable({
  balls,
  angleMilli,
  power,
  spinX,
  spinY,
  ghost,
  kitchenOnly,
  calledPocket,
  showAim,
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
  const cacheRef = useRef<{ w: number; h: number; canvas: HTMLCanvasElement } | null>(null);
  const motionRef = useRef(new Map<number, Motion>());
  const strikeRef = useRef<(Pose & { t0: number }) | null>(null);
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
  angleRef.current = angleMilli;
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
  const frameStamp = useRef(0);
  const cueIn = useRef(0);
  const cueWas = useRef(false);
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

      const now = performance.now();
      if (frameStamp.current) {
        canvas.dataset["frameMs"] = (now - frameStamp.current).toFixed(1);
      }
      frameStamp.current = now;

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
            doneRef.current();
          }
        }
      } else if (head.key) {
        head.key = null;
      }

      const cueBall = shown.find((ball) => ball.id === 0);
      const from = ghost ?? (cueBall && !cueBall.pocketed ? { x: cueBall.x, y: cueBall.y } : null);
      if (showAim && from) {
        const aimed = shown.map((ball) =>
          ball.id === 0 ? { ...ball, x: from.x, y: from.y, vx: 0, vy: 0, pocketed: false } : ball,
        );
        const guide = traceAim(aimed, {
          angleMilli,
          power,
          spinX,
          spinY,
          placeX: null,
          placeY: null,
          calledPocket: null,
        });
        canvas.dataset["guide"] = guide ? drawGuide(ctx, project, innerW, dpr, guide) : "";
      } else canvas.dataset["guide"] = "";

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
          drawCue(
            ctx,
            view.projectOpen,
            innerW,
            strike,
            strike.angle,
            gap,
            Math.max(0, alpha),
            w,
            h,
          );
          again = true;
        }
      } else if (showCue && from) {
        const gap = 1.28 + (power / 10_000) * 4.4;
        const alpha = Math.min(1, (now - cueIn.current) / 140);
        if (alpha < 1) again = true;
        drawCue(ctx, view.projectOpen, innerW, from, angleMilli, gap, alpha, w, h);
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
      canvas.dataset["renderer"] = usedGl ? "webgl" : "canvas";
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
    spinX,
    spinY,
    ghost,
    kitchenOnly,
    calledPocket,
    showAim,
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
    const next = powerFromPull(
      pullBackPx(canvas, origin.x, origin.y, event.clientX, event.clientY, cue, angleRef.current),
    );
    if (next === pullRef.current) return;
    pullRef.current = next;
    powerCb.current?.(next === 0 ? 1 : next);
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
  };

  const endGesture = (shoot: boolean) => {
    const gesture = gestureRef.current;
    const pulled = pullRef.current;
    gestureRef.current = null;
    pullRef.current = 0;
    originRef.current = null;
    setDraft(null);
    if (!gesture || gesture.kind === "place") return;
    if (shoot && pulled > 0) {
      shootRef.current?.(pulled);
      return;
    }
    if (gesture.kind === "from-cue" && !gesture.armed) hintRef.current?.("Drag to aim.");
    else hintRef.current?.("Drag back and release to shoot.");
  };

  return (
    <canvas
      ref={ref}
      className="pool-canvas"
      aria-label="Pool table. Drag to aim. Drag back and release to shoot. On a phone, drag with your finger. Drag the cue ball when it is ball in hand."
      onPointerDown={(event) => {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Capture fails for a pointer that was already released. Aim still applies.
        }
        originRef.current = { x: event.clientX, y: event.clientY };
        pullRef.current = 0;
        const point = tablePoint(event.currentTarget, event.clientX, event.clientY);
        const cue = cuePoint();
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
        const started = startAim(point, cue);
        gestureRef.current = started;
        if (started.kind === "absolute") aimAt(event);
      }}
      onPointerMove={(event) => {
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
      onPointerUp={() => endGesture(true)}
      onPointerCancel={() => endGesture(false)}
    />
  );
}
