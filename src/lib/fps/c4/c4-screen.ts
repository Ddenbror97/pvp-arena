import * as THREE from "three";
import type { C4DisplayState } from "./c4-timeline";

/**
 * The C4's LCD: a small canvas texture on the `C4_Screen` quad, drawn as a fictional status
 * readout (backlit yellow-green panel, dark segments). Repainted only when what it shows
 * changes, so an idle frame costs nothing. Unlit (MeshBasicMaterial): it reads as a backlit
 * panel without adding a light.
 */
const W = 256,
  H = 128;
const BACKLIT = "#b9cf3a",
  DIM = "#4d5a12",
  INK = "#1d2406";

export function createC4Screen() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const pen = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // glTF UVs have their origin top-left (the loader's textures use flipY = false too).
  texture.flipY = false;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  material.color.setScalar(0.82);
  let shown = "";

  function paint(state: C4DisplayState, blink: boolean, label = "ARMING") {
    const progress = Math.round((state.progress ?? 0) * 40);
    const key = `${state.mode}:${state.digits}:${state.length}:${blink}:${label}:${progress}`;
    if (key === shown) return;
    shown = key;
    pen.fillStyle = state.mode === "off" ? "#1a1f08" : BACKLIT;
    pen.fillRect(0, 0, W, H);
    if (state.mode === "off") {
      texture.needsUpdate = true;
      return;
    }
    // Faint backlight gradient and pixel grid, like a cheap character LCD.
    const glow = pen.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
    glow.addColorStop(0, "rgba(255,255,200,0.18)");
    glow.addColorStop(1, "rgba(40,50,0,0.25)");
    pen.fillStyle = glow;
    pen.fillRect(0, 0, W, H);
    pen.fillStyle = "rgba(0,0,0,0.05)";
    for (let x = 0; x < W; x += 4) pen.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 4) pen.fillRect(0, y, W, 1);
    pen.fillStyle = INK;
    pen.font = "bold 26px monospace";
    pen.textBaseline = "top";
    if (state.mode === "safe") {
      pen.fillText("DISARMED", 18, 14);
      pen.font = "bold 20px monospace";
      pen.fillText("DEVICE SAFE", 18, 56);
      pen.strokeStyle = INK;
      pen.lineWidth = 2;
      pen.strokeRect(18, 94, W - 36, 16);
    } else if (state.mode === "disarm") {
      pen.fillText(blink ? "DISARMING" : "DISARMING_", 18, 14);
      for (let i = 0; i < state.length; i++) {
        pen.fillStyle = i < state.digits ? INK : DIM;
        pen.fillText(i < state.digits ? "*" : "_", 24 + i * 27, 50);
      }
      pen.fillStyle = INK;
      pen.strokeStyle = INK;
      pen.lineWidth = 2;
      pen.strokeRect(18, 94, W - 36, 16);
      pen.fillRect(21, 97, ((W - 42) * progress) / 40, 10);
    } else if (state.mode === "armed") {
      pen.fillText(blink ? "** ARMED **" : "   ARMED", 18, 14);
      pen.font = "bold 20px monospace";
      pen.fillText("CODE ACCEPTED", 18, 56);
      pen.fillRect(18, 92, W - 36, 18);
    } else {
      pen.fillText(label, 18, 14);
      // Entered digits as stars, the rest as dim cells; cursor on the next one.
      for (let i = 0; i < state.length; i++) {
        const x = 18 + i * 31;
        pen.fillStyle = i < state.digits ? INK : DIM;
        pen.fillText(i < state.digits ? "*" : "_", x + 6, 50);
        if (i === state.digits && blink) {
          pen.fillStyle = INK;
          pen.fillRect(x + 4, 80, 18, 3);
        }
      }
      // Progress bar.
      pen.strokeStyle = INK;
      pen.lineWidth = 2;
      pen.strokeRect(18, 94, W - 36, 16);
      pen.fillStyle = INK;
      pen.fillRect(21, 97, ((W - 42) * state.digits) / Math.max(1, state.length), 10);
    }
    texture.needsUpdate = true;
  }
  return {
    material,
    paint,
    /** Forget what was drawn (next paint redraws). */
    reset() {
      shown = "";
    },
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}
