import * as THREE from "three";
import { buttonRect, PANEL, stopLabel, type Lift } from "./lifts";

/**
 * The button panel in the lift cab you stand in (lifts.ts): a lit panel of floor buttons on the
 * cab's wall, the floor you are on lit amber, the one in your crosshair outlined. One panel at
 * a time (only the cab you are in needs its buttons readable), redrawn when what it shows
 * changes. The cabs themselves are part of the building (build_condo.mjs).
 */
export function createLiftRenderer(scene: THREE.Scene) {
  const W = 512,
    H = 288;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL.w, PANEL.h),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  mesh.visible = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  let key = "";

  function draw(l: Lift, stop: number, hover: number) {
    ctx.fillStyle = "#1c1b1a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#8a7552";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    const sx = W / PANEL.w,
      sy = H / PANEL.h;
    for (let i = 0; i < l.stops.length; i++) {
      const r = buttonRect(l, i);
      const cx = (r.u + PANEL.w / 2) * sx,
        cy = H - (r.v + PANEL.h / 2) * sy;
      const rad = Math.min(r.w * sx, r.h * sy) * 0.36;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = i === stop ? "#f2b84b" : i === hover ? "#e9e4da" : "#3a3835";
      ctx.fill();
      ctx.lineWidth = i === hover ? 5 : 3;
      ctx.strokeStyle = i === hover ? "#ffffff" : "#a68b5c";
      ctx.stroke();
      ctx.fillStyle = i === stop || i === hover ? "#1c1b1a" : "#e8e1d2";
      ctx.font = `bold ${Math.round(rad * 1.05)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stopLabel(l, i), cx, cy + 1);
    }
    texture.needsUpdate = true;
  }

  return {
    /** Show the panel of `lift` at `stop` (null: none), `hover` the button aimed at (−1). */
    show(lift: Lift | null, stop: number, hover: number) {
      if (!lift) {
        mesh.visible = false;
        key = "";
        return;
      }
      const k = `${lift.id}:${stop}:${hover}`;
      if (k === key) return;
      key = k;
      draw(lift, stop, hover);
      const p = lift.panel;
      mesh.position.set(p.x + p.nx * 0.01, lift.stops[stop]! + PANEL.y, p.z + p.nz * 0.01);
      // The plane's front (+z local) along the panel's normal.
      mesh.rotation.set(0, Math.atan2(p.nx, p.nz), 0);
      mesh.visible = true;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      texture.dispose();
    },
  };
}
