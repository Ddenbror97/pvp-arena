import * as THREE from "three";
import { OWN_MATRICES } from "./scene-transforms";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  floorPassing,
  LIFT,
  rideMs,
  ridePoint,
  stopLabel,
  type Lift,
  type LiftState,
} from "./lifts";

/**
 * The Skyline Residences lifts drawn (lifts.ts; owner, 2026-11-13: "upgrade the elevator
 * design, it looks like a empty room … there should be a elevator door, user clicks E and he
 * enters and the elevator goes up"). Per lift: on each stop's landing a pair of brushed-steel
 * doors that slide into the wall, the hall's call buttons beside them and a floor display over
 * them; and the cab, which runs in the shaft (build_condo.mjs leaves it open between the lobby
 * and the roof): walnut walls, a chrome handrail, a stone floor, a lit ceiling, its button
 * panel and its own pair of doors.
 *
 * The cab's look is the owner's download "Elevator with Animation LOWPOLY" by EFX (CC BY 4.0;
 * art/blender/br/build_lift_model.mjs → lift-cab.efx-v1.glb): its materials and textures, its
 * button panel, call buttons, display housing and door leaf, fitted here to the condo's shaft.
 *
 * Where the cab is and how far its doors are open is drawn from what this client knows: your
 * own ride (the ride's clock: the doors close, it travels, they open) and where you stand (at a
 * landing's door, the cab is there and opens for you). Draw cost: one lift in reach at a time,
 * a few dozen meshes, nothing beyond REACH.
 */

/** Cab interior half-width and depth (m: inside the 2.8 m shaft), height. */
const CAB = { half: 1.35, h: 2.5 } as const;
/** The landing door: 1.6 m wide (two 0.8 m leaves), 2.3 m tall; the shaft's front wall. */
const DOOR = { half: 0.8, h: 2.3, wall0: 1.4, wall1: 1.7 } as const;
/** Lifts beyond this (m) are not drawn. */
const REACH = 70;

type Rig = {
  lift: Lift;
  root: THREE.Group;
  cab: THREE.Group;
  cabLeaves: [THREE.Object3D, THREE.Object3D];
  landings: { group: THREE.Group; leaves: [THREE.Object3D, THREE.Object3D] }[];
  /** Where the cab rests (stop index), its doors' opening (0 shut … 1 open). */
  stop: number;
  open: number;
  display: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; key: string };
};

export function createLiftRenderer(
  scene: THREE.Scene,
  loader: GLTFLoader,
  base: string,
  all: readonly Lift[],
) {
  const root = new THREE.Group();
  root.name = "lifts";
  // Its matrices are refreshed here, for the lifts in reach only (update, below): every lift on
  // the island is under this root, a cab, and doors, a call panel and a display per landing.
  root.userData[OWN_MATRICES] = true;
  scene.add(root);
  const rigs: Rig[] = [];
  const owned: { dispose(): void }[] = [];
  let ready = false;

  const url = new URL("fps/br/models/lift-cab.efx-v1.glb", base).href;
  void loader.loadAsync(url).then((gltf) => {
    const parts = new Map<string, THREE.Object3D>();
    gltf.scene.children.forEach((c) => parts.set(c.name.replace(/^lift-/, ""), c));
    const materials = new Map<string, THREE.Material>();
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.Material;
        materials.set(m.name, m);
        owned.push(o.geometry);
      }
    });
    for (const m of materials.values()) owned.push(m);
    const mat = (name: string, fallback: number) =>
      materials.get(name) ??
      (() => {
        const m = new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.4 });
        owned.push(m);
        return m;
      })();
    const wood = mat("WallsWood", 0x5a3a26);
    const floor = mat("ElevatorFloor", 0x2b2b2d);
    const steel = mat("ElevatorMetal", 0xb4b6b8);
    const dark = mat("MetalDark", 0x2a2b2d);
    const lamp = mat("LightEmis", 0xfff6e0);
    // The download is lit by its own bright ceiling; the game's indoor light is the sky's:
    // the walnut and the stone a little lighter so the cab does not read as a dark box.
    (wood as THREE.MeshStandardMaterial).color?.setScalar(1.7);
    (floor as THREE.MeshStandardMaterial).color?.setScalar(1.3);
    for (const m of [wood, floor]) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map) {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.needsUpdate = true;
      }
    }

    /** A box of `material` (local metres, a…b corners). */
    const box = (
      g: THREE.Object3D,
      a: [number, number, number],
      b: [number, number, number],
      material: THREE.Material,
    ) => {
      const geo = new THREE.BoxGeometry(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      owned.push(geo);
      const m = new THREE.Mesh(geo, material);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      g.add(m);
      return m;
    };
    /** A copy of a part from the download, scaled to `w` wide and `h` tall, its centre at `at`
     * (the part's own facing kept: the panels face −z in the source, the hall's +z). */
    const part = (name: string, w: number, h: number, at: [number, number, number]) => {
      const src = parts.get(name);
      if (!src) return null;
      const bb = new THREE.Box3().setFromObject(src);
      const size = bb.getSize(new THREE.Vector3()),
        c = bb.getCenter(new THREE.Vector3());
      const holder = new THREE.Group();
      const copy = src.clone(true);
      copy.position.sub(c);
      holder.add(copy);
      holder.scale.set(w / size.x, h / size.y, Math.min(w / size.x, h / size.y));
      holder.position.set(...at);
      return holder;
    };
    /** A door leaf (the download's, 0.8 × 2.3 m) whose closed edge meets the middle. */
    const leaf = (side: -1 | 1, z: number) => {
      const holder = new THREE.Group();
      const p = part("Door1", DOOR.half, DOOR.h, [(side * DOOR.half) / 2, DOOR.h / 2, z]);
      if (p) holder.add(p);
      else
        box(
          holder,
          [side < 0 ? -DOOR.half : 0, 0, z - 0.02],
          [side < 0 ? 0 : DOOR.half, DOOR.h, z + 0.02],
          steel,
        );
      return holder;
    };

    for (const l of all) {
      const rig = new THREE.Group();
      rig.position.set(l.x, 0, l.z);
      // Local +z out of the cab's door (three's yaw `l.yaw` looks along it).
      rig.rotation.y = l.yaw + Math.PI;
      // Hidden until update finds it in reach.
      rig.visible = false;
      root.add(rig);

      // The cab: floor, walnut walls, the front's steel returns either side of its door, the
      // ceiling and its light, the chrome handrail, its button panel, its doors.
      const cab = new THREE.Group();
      const H = CAB.half,
        T = 0.04;
      box(cab, [-H, -0.12, -H], [H, 0.03, H], floor);
      box(cab, [-H, 0.03, -H - T], [H, CAB.h, -H], wood);
      box(cab, [-H - T, 0.03, -H], [-H, CAB.h, H], wood);
      box(cab, [H, 0.03, -H], [H + T, CAB.h, H], wood);
      box(cab, [-H, 0.03, H - 0.02], [-DOOR.half, CAB.h, H + 0.02], steel);
      box(cab, [DOOR.half, 0.03, H - 0.02], [H, CAB.h, H + 0.02], steel);
      box(cab, [-DOOR.half, DOOR.h, H - 0.02], [DOOR.half, CAB.h, H + 0.02], steel);
      box(cab, [-H - T, CAB.h, -H - T], [H + T, CAB.h + 0.06, H + 0.02], dark);
      box(cab, [-0.8, CAB.h - 0.02, -0.8], [0.8, CAB.h, 0.8], lamp);
      // Skirting and the handrail (round, on stand-offs) along the back and the sides.
      box(cab, [-H, 0.03, -H], [H, 0.15, -H + 0.01], steel);
      box(cab, [-H, 0.03, -H], [-H + 0.01, 0.15, H], steel);
      box(cab, [H - 0.01, 0.03, -H], [H, 0.15, H], steel);
      const rail = new THREE.CylinderGeometry(0.022, 0.022, 1, 10);
      owned.push(rail);
      const railRun = (a: THREE.Vector3, b: THREE.Vector3) => {
        const m = new THREE.Mesh(rail, steel);
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.scale.y = a.distanceTo(b);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        cab.add(m);
      };
      railRun(
        new THREE.Vector3(-H + 0.25, 0.92, -H + 0.07),
        new THREE.Vector3(H - 0.25, 0.92, -H + 0.07),
      );
      railRun(
        new THREE.Vector3(-H + 0.07, 0.92, -H + 0.25),
        new THREE.Vector3(-H + 0.07, 0.92, H - 0.4),
      );
      railRun(
        new THREE.Vector3(H - 0.07, 0.92, -H + 0.25),
        new THREE.Vector3(H - 0.07, 0.92, H - 0.4),
      );
      // The cab's button panel on the right return (as you face the door from inside: −x).
      const panel = part("ButtonsPanel", 0.4, 0.82, [-(H + DOOR.half) / 2, 1.3, H - 0.03]);
      if (panel) cab.add(panel);
      const leftCab = leaf(-1, H + 0.05),
        rightCab = leaf(1, H + 0.05);
      cab.add(leftCab, rightCab);
      rig.add(cab);

      // The landings: the doors in the shaft's front wall (sliding into it), the call buttons
      // and the display.
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 96;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      owned.push(texture);
      const screen = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      const screenGeo = new THREE.PlaneGeometry(0.42, 0.16);
      owned.push(screen, screenGeo);
      const landings = l.stops.map((y) => {
        const g = new THREE.Group();
        g.position.y = y;
        const zMid = (DOOR.wall0 + DOOR.wall1) / 2;
        const left = leaf(-1, zMid),
          right = leaf(1, zMid);
        g.add(left, right);
        const call = part("OutsideButtons", 0.24, 0.4, [
          DOOR.half + 0.32,
          1.25,
          DOOR.wall1 + 0.015,
        ]);
        if (call) g.add(call);
        const housing = part("ScreenOutside", 0.5, 0.19, [0, DOOR.h + 0.3, DOOR.wall1 + 0.02]);
        if (housing) g.add(housing);
        const face = new THREE.Mesh(screenGeo, screen);
        face.position.set(0, DOOR.h + 0.3, DOOR.wall1 + 0.04);
        g.add(face);
        rig.add(g);
        return { group: g, leaves: [left, right] as [THREE.Object3D, THREE.Object3D] };
      });
      rigs.push({
        lift: l,
        root: rig,
        cab,
        cabLeaves: [leftCab, rightCab],
        landings,
        stop: 0,
        open: 0,
        display: { canvas, texture, key: "" },
      });
    }
    ready = true;
  });

  const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const setLeaves = (leaves: [THREE.Object3D, THREE.Object3D], open: number) => {
    const d = ease(open) * (DOOR.half - 0.04);
    leaves[0].position.x = -d;
    leaves[1].position.x = d;
  };
  function drawDisplay(r: Rig, label: string, dir: number) {
    const key = `${label}:${dir}`;
    if (key === r.display.key) return;
    r.display.key = key;
    const ctx = r.display.canvas.getContext("2d")!;
    ctx.fillStyle = "#07090c";
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = "#ff9f2e";
    ctx.font = "bold 64px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 150, 52);
    if (dir) {
      ctx.beginPath();
      const x = 62,
        y = 48;
      if (dir > 0) {
        ctx.moveTo(x - 22, y + 14);
        ctx.lineTo(x + 22, y + 14);
        ctx.lineTo(x, y - 18);
      } else {
        ctx.moveTo(x - 22, y - 14);
        ctx.lineTo(x + 22, y - 14);
        ctx.lineTo(x, y + 18);
      }
      ctx.fill();
    }
    r.display.texture.needsUpdate = true;
  }

  return {
    root,
    /**
     * Each frame: where the camera is, your own ride (null off a lift) and the lift you can take
     * from where you stand (its id and your stop: its doors open for you), the frame's length.
     */
    update(
      eye: THREE.Vector3,
      ride: LiftState | null,
      near: { id: number; stop: number } | null,
      dtMs: number,
    ) {
      if (!ready) return;
      for (const r of rigs) {
        const l = r.lift;
        const far = Math.hypot(eye.x - l.x, eye.z - l.z) > REACH;
        r.root.visible = !far;
        if (far) continue;
        let cabY: number;
        let landingOpen = -1;
        if (ride && ride.id === l.id) {
          const total = rideMs(l, ride.from, ride.to);
          cabY = ridePoint(l, ride).y;
          r.open =
            ride.ms < LIFT.closeMs
              ? 1 - ride.ms / LIFT.closeMs
              : ride.ms > total - LIFT.openMs
                ? (ride.ms - (total - LIFT.openMs)) / LIFT.openMs
                : 0;
          r.stop = ride.ms < LIFT.closeMs ? ride.from : ride.to;
          landingOpen = ride.ms < LIFT.closeMs || ride.ms > total - LIFT.openMs ? r.stop : -1;
          drawDisplay(
            r,
            ride.ms > total - LIFT.openMs ? stopLabel(l, ride.to) : floorPassing(l, cabY),
            ride.ms > LIFT.closeMs && ride.ms < total - LIFT.openMs
              ? Math.sign(ride.to - ride.from)
              : 0,
          );
        } else {
          const here = near && near.id === l.id;
          if (here) r.stop = near.stop;
          const target = here ? 1 : 0;
          const rate = dtMs / (target > r.open ? LIFT.openMs : LIFT.closeMs);
          r.open = target > r.open ? Math.min(1, r.open + rate) : Math.max(0, r.open - rate);
          cabY = l.stops[r.stop]!;
          landingOpen = r.stop;
          drawDisplay(r, stopLabel(l, r.stop), 0);
        }
        r.cab.position.y = cabY;
        setLeaves(r.cabLeaves, r.open);
        r.landings.forEach((g, i) => setLeaves(g.leaves, i === landingOpen ? r.open : 0));
        r.root.updateMatrixWorld();
      }
    },
    dispose() {
      scene.remove(root);
      for (const o of owned) o.dispose();
    },
  };
}
