/**
 * Cosmetic table. Pocket centres stay on the physics pockets. The cloth
 * rectangle stays on the view, so aim and ball positions do not move.
 */

import { POCKETS, TABLE_H, TABLE_W, type Pocket } from "./physics";
import { spanPx, viewOf } from "./view";

type Project = (x: number, y: number) => { x: number; y: number; scale: number };

function addRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hash(ix: number, iy: number): number {
  let n = (ix * 374761393 + iy * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

let clothWeave: HTMLCanvasElement | null = null;
function feltWeave(): HTMLCanvasElement {
  if (clothWeave) return clothWeave;
  const w = 256;
  const h = 128;
  const tile = document.createElement("canvas");
  tile.width = w;
  tile.height = h;
  const ctx = tile.getContext("2d");
  clothWeave = tile;
  if (!ctx) return tile;
  const img = ctx.createImageData(w, h);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  for (let y = 0; y < h; y++) {
    const row = (hash(0, y) - 0.5) * 10;
    const thread = y % 2 === 0 ? 5 : -3;
    for (let x = 0; x < w; x++) {
      const fine = (hash(x, y) - 0.5) * 12;
      const fiber = x % 3 === 0 ? 4 : 0;
      const i = (y * w + x) * 4;
      img.data[i] = clamp(118 + row + thread + fine * 0.55 + fiber);
      img.data[i + 1] = clamp(36 + row * 0.28 + fine * 0.12);
      img.data[i + 2] = clamp(198 + row * 0.45 + thread * 0.4 + fine * 0.2);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(255, 236, 255, 0.045)";
  ctx.lineWidth = 1;
  for (let y = 1; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  return tile;
}

let railTile: HTMLCanvasElement | null = null;
function railBrush(): HTMLCanvasElement {
  if (railTile) return railTile;
  const s = 128;
  const tile = document.createElement("canvas");
  tile.width = s;
  tile.height = s;
  const ctx = tile.getContext("2d");
  railTile = tile;
  if (!ctx) return tile;
  ctx.fillStyle = "#141218";
  ctx.fillRect(0, 0, s, s);
  const gap = 8;
  const shift = 24;
  for (let i = -6; i < s / gap + 8; i++) {
    const y = i * gap;
    const light = i % 4 === 0;
    ctx.strokeStyle = light ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.45)";
    ctx.lineWidth = light ? 1.15 : 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y + shift);
    ctx.stroke();
  }
  return tile;
}

function mouths(
  project: Project,
  innerW: number,
): { pocket: Pocket; x: number; y: number; mouth: number }[] {
  return POCKETS.map((pocket) => {
    const p = project(pocket.x, pocket.y);
    return { pocket, x: p.x, y: p.y, mouth: spanPx(innerW, p.scale, pocket.r) };
  });
}

function addMouths(
  ctx: CanvasRenderingContext2D,
  holes: readonly { x: number; y: number; mouth: number }[],
  scale: number,
) {
  for (const hole of holes) {
    const r = Math.max(1, hole.mouth * scale);
    ctx.moveTo(hole.x + r, hole.y);
    ctx.arc(hole.x, hole.y, r, 0, Math.PI * 2);
  }
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.shadowColor = "rgba(214, 176, 255, 0.95)";
  ctx.shadowBlur = s * 2.6;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.7, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.7, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y - s, x, y + s);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.42, "#f4e8ff");
  g.addColorStop(1, "#b06cff");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(0.7, s * 0.14);
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.stroke();
  ctx.restore();
}

function goldPaint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.9, y + h);
  g.addColorStop(0, "#fff7d6");
  g.addColorStop(0.16, "#ffe08a");
  g.addColorStop(0.4, "#e0a43a");
  g.addColorStop(0.68, "#b47624");
  g.addColorStop(1, "#5c3812");
  return g;
}

function paintPocketHole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mouth: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, mouth * 0.98, 0, Math.PI * 2);
  const hole = ctx.createRadialGradient(x - mouth * 0.2, y - mouth * 0.28, mouth * 0.05, x, y, mouth);
  hole.addColorStop(0, "#050505");
  hole.addColorStop(0.55, "#010101");
  hole.addColorStop(1, "#1a1410");
  ctx.fillStyle = hole;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = Math.max(0.6, mouth * 0.035);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x - mouth, y + i * mouth * 0.28);
    ctx.quadraticCurveTo(x, y + i * mouth * 0.28 + mouth * 0.18, x + mouth, y + i * mouth * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + i * mouth * 0.28, y - mouth);
    ctx.quadraticCurveTo(x + i * mouth * 0.1, y, x + i * mouth * 0.22, y + mouth);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, mouth * 0.98, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = Math.max(1, mouth * 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - mouth * 0.22, y - mouth * 0.26, mouth * 0.42, Math.PI * 1.05, Math.PI * 1.75);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(0.8, mouth * 0.045);
  ctx.stroke();
}

function paintGoldRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mouth: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, mouth * 1.7, 0, Math.PI * 2);
  ctx.arc(x, y, mouth * 0.98, 0, Math.PI * 2, true);
  const metal = ctx.createLinearGradient(x - mouth, y - mouth, x + mouth, y + mouth * 1.2);
  metal.addColorStop(0, "#fff6d0");
  metal.addColorStop(0.28, "#f0c45a");
  metal.addColorStop(0.62, "#c4842a");
  metal.addColorStop(1, "#6a4014");
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.lineWidth = Math.max(1, mouth * 0.07);
  ctx.strokeStyle = "rgba(255, 244, 214, 0.55)";
  ctx.beginPath();
  ctx.arc(x, y, mouth * 1.62, Math.PI * 1.05, Math.PI * 1.85);
  ctx.stroke();
  ctx.strokeStyle = "rgba(70, 38, 10, 0.7)";
  ctx.beginPath();
  ctx.arc(x, y, mouth * 1.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Draw the cabinet, cloth, and pockets into a bitmap the match caches. */
export function buildTable(w: number, h: number): HTMLCanvasElement {
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
  const outerR = rail * 0.78;
  const lip = Math.max(2.4, rail * 0.09);
  const cushion = Math.max(7, rail * 0.3);
  const holes = mouths(project, innerW);
  const midX = clothX + innerW / 2;
  const midY = clothY + innerH / 2;

  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = rail * 0.55;
  ctx.shadowOffsetY = rail * 0.16;
  ctx.beginPath();
  addRound(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.fillStyle = "#07060c";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  addRound(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.fillStyle = "#09080d";
  ctx.fill();

  const body = ctx.createLinearGradient(outerX, outerY, outerX + outerW * 0.2, outerY + outerH);
  body.addColorStop(0, "rgba(255,255,255,0.05)");
  body.addColorStop(0.4, "rgba(255,255,255,0)");
  body.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  addRound(
    ctx,
    outerX + lip * 0.35,
    outerY + lip * 0.35,
    outerW - lip * 0.7,
    outerH - lip * 0.7,
    Math.max(1, outerR - lip * 0.35),
  );
  ctx.lineWidth = lip;
  const lipTone = ctx.createLinearGradient(outerX, outerY, outerX, outerY + outerH);
  lipTone.addColorStop(0, "#b8883a");
  lipTone.addColorStop(0.12, "#f6e2a4");
  lipTone.addColorStop(0.48, "#c8923c");
  lipTone.addColorStop(0.78, "#f3d78a");
  lipTone.addColorStop(1, "#7a4e18");
  ctx.strokeStyle = lipTone;
  ctx.stroke();

  const neonInset = lip * 1.65;
  ctx.save();
  ctx.beginPath();
  addRound(
    ctx,
    outerX + neonInset,
    outerY + neonInset,
    outerW - neonInset * 2,
    outerH - neonInset * 2,
    Math.max(1, outerR - neonInset),
  );
  ctx.strokeStyle = "rgba(198, 130, 255, 0.92)";
  ctx.lineWidth = Math.max(1.15, rail * 0.026);
  ctx.shadowColor = "rgba(168, 80, 255, 0.9)";
  ctx.shadowBlur = rail * 0.2;
  ctx.stroke();
  ctx.restore();

  for (const hole of holes) {
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.mouth * 1.78, 0, Math.PI * 2);
    ctx.fillStyle = "#050505";
    ctx.fill();
  }

  const faceIn = cushion * 0.92;
  ctx.save();
  ctx.beginPath();
  addRound(
    ctx,
    outerX + lip * 1.15,
    outerY + lip * 1.15,
    outerW - lip * 2.3,
    outerH - lip * 2.3,
    Math.max(1, outerR - lip),
  );
  addRound(ctx, clothX - faceIn, clothY - faceIn, innerW + faceIn * 2, innerH + faceIn * 2, faceIn * 0.65);
  ctx.clip("evenodd");
  const brush = ctx.createPattern(railBrush(), "repeat");
  ctx.fillStyle = brush ?? "#16141a";
  ctx.fillRect(outerX, outerY, outerW, outerH);
  const sheen = ctx.createLinearGradient(outerX, outerY, outerX, outerY + outerH);
  sheen.addColorStop(0, "rgba(255,255,255,0.07)");
  sheen.addColorStop(0.18, "rgba(255,255,255,0)");
  sheen.addColorStop(0.8, "rgba(0,0,0,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = sheen;
  ctx.fillRect(outerX, outerY, outerW, outerH);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  addMouths(ctx, holes, 1.62);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  addRound(ctx, clothX - cushion, clothY - cushion, innerW + cushion * 2, innerH + cushion * 2, cushion * 0.72);
  addRound(ctx, clothX, clothY, innerW, innerH, 1);
  ctx.clip("evenodd");
  const rubber = ctx.createLinearGradient(clothX, clothY - cushion, clothX, clothY + innerH + cushion);
  rubber.addColorStop(0, "#3a3344");
  rubber.addColorStop(0.18, "#221c2a");
  rubber.addColorStop(0.55, "#141118");
  rubber.addColorStop(1, "#2a2432");
  ctx.fillStyle = rubber;
  ctx.fillRect(clothX - cushion, clothY - cushion, innerW + cushion * 2, innerH + cushion * 2);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  addMouths(ctx, holes, 1.58);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  addRound(
    ctx,
    clothX - cushion * 0.98,
    clothY - cushion * 0.98,
    innerW + cushion * 1.96,
    innerH + cushion * 1.96,
    cushion * 0.7,
  );
  ctx.clip();
  ctx.strokeStyle = "rgba(214, 160, 255, 0.88)";
  ctx.lineWidth = Math.max(1.1, rail * 0.022);
  ctx.shadowColor = "rgba(176, 90, 255, 0.75)";
  ctx.shadowBlur = rail * 0.14;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  addMouths(ctx, holes, 1.72);
  ctx.fill();
  ctx.restore();

  const caps = holes.filter((hole) => hole.pocket.id !== 1 && hole.pocket.id !== 4);
  for (const hole of caps) {
    const left = hole.x < midX;
    const top = hole.y < midY;
    const reach = Math.max(
      Math.abs(hole.x - (left ? clothX : clothX + innerW)),
      Math.abs(hole.y - (top ? clothY : clothY + innerH)),
    );
    const cap = rail + reach + hole.mouth * 1.08;
    const ox = left ? outerX : outerX + outerW - cap;
    const oy = top ? outerY : outerY + outerH - cap;
    ctx.save();
    ctx.beginPath();
    addRound(ctx, ox, oy, cap, cap, outerR);
    ctx.arc(hole.x, hole.y, hole.mouth * 1.72, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = goldPaint(ctx, ox, oy, cap, cap);
    ctx.fillRect(ox - hole.mouth, oy - hole.mouth, cap + hole.mouth * 2, cap + hole.mouth * 2);
    const shine = ctx.createLinearGradient(ox, oy, ox + cap * 0.8, oy + cap * 0.45);
    shine.addColorStop(0, "rgba(255,255,255,0.42)");
    shine.addColorStop(0.35, "rgba(255,255,255,0.05)");
    shine.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = shine;
    ctx.fillRect(ox, oy, cap, cap);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.mouth * 0.98, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    addRound(ctx, ox, oy, cap, cap, outerR);
    ctx.clip();
    ctx.strokeStyle = "rgba(255, 248, 220, 0.55)";
    ctx.lineWidth = Math.max(1.1, rail * 0.035);
    ctx.beginPath();
    ctx.moveTo(ox + outerR, oy + lip * 0.2);
    ctx.lineTo(ox + cap - outerR * 0.2, oy + lip * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  for (const hole of holes) {
    if (hole.pocket.id === 1 || hole.pocket.id === 4) paintGoldRing(ctx, hole.x, hole.y, hole.mouth);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(clothX, clothY, innerW, innerH);
  addMouths(ctx, holes, 1.16);
  ctx.clip("evenodd");
  const weave = ctx.createPattern(feltWeave(), "repeat");
  ctx.fillStyle = weave ?? "#7228c4";
  ctx.fillRect(clothX, clothY, innerW, innerH);
  const light = ctx.createLinearGradient(clothX, clothY, clothX, clothY + innerH);
  light.addColorStop(0, "rgba(255,255,255,0.1)");
  light.addColorStop(0.28, "rgba(255,255,255,0.02)");
  light.addColorStop(0.7, "rgba(0,0,0,0)");
  light.addColorStop(1, "rgba(12,0,24,0.2)");
  ctx.fillStyle = light;
  ctx.fillRect(clothX, clothY, innerW, innerH);
  ctx.strokeStyle = "rgba(28, 0, 48, 0.28)";
  ctx.lineWidth = Math.max(8, rail * 0.16);
  ctx.strokeRect(clothX + 1, clothY + 1, innerW - 2, innerH - 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(clothX, clothY + 1, innerW, 2);
  addMouths(ctx, holes, 1.3);
  ctx.clip("evenodd");
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(clothX, clothY, innerW, 1.4);
  ctx.restore();

  for (const hole of holes) paintPocketHole(ctx, hole.x, hole.y, hole.mouth);

  const sight = Math.max(3.4, rail * 0.105);
  const faceMid = (lip * 1.7 + (rail - faceIn)) / 2;
  for (const n of [1, 2, 3, 5, 6, 7]) {
    const top = project((n / 8) * TABLE_W, TABLE_H);
    const bottom = project((n / 8) * TABLE_W, 0);
    diamond(ctx, top.x, top.y - faceMid, sight);
    diamond(ctx, bottom.x, bottom.y + faceMid, sight);
  }
  for (const t of [0.25, 0.5, 0.75]) {
    const left = project(0, t * TABLE_H);
    const right = project(TABLE_W, t * TABLE_H);
    diamond(ctx, left.x - faceMid, left.y, sight);
    diamond(ctx, right.x + faceMid, right.y, sight);
  }

  return canvas;
}
