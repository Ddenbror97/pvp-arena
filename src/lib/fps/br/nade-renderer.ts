import * as THREE from "three";
import { GRENADES } from "../grenades/rules";
import { brNadeAdvance, brNadeStart, nadeSteps, type BrNadeSim } from "./grenades";
import type { StaticWorld } from "./static-world";

/**
 * Grenades on the island, drawn from the server's events: each throw is flown here with the
 * same deterministic flight as the server (grenades.ts), so it lands exactly where it bursts;
 * HE flashes, smoke grows into a cloud of soft puffs for its duration, flames flicker over the
 * floor. Instanced and capped (cheap at any count).
 */
const MAX_NADES = 24,
  PUFFS = 18,
  MAX_CLOUDS = 12,
  FLAMES = 14,
  MAX_FIRES = 10;

export function createNadeRenderer(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const ballColors = { he: 0x4b5a36, smoke: 0x7b8287, fire: 0x8a3a2c } as const;
  const balls = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 }),
    MAX_NADES,
  );
  balls.frustumCulled = false;
  balls.count = 0;
  root.add(balls);
  const puffs = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshLambertMaterial({
      color: 0xc9ccc8,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    }),
    PUFFS * MAX_CLOUDS,
  );
  puffs.frustumCulled = false;
  puffs.count = 0;
  root.add(puffs);
  const flames = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.28, 0.9, 6, 1, true).translate(0, 0.45, 0),
    new THREE.MeshBasicMaterial({
      color: 0xff8a2a,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    FLAMES * MAX_FIRES,
  );
  flames.frustumCulled = false;
  flames.count = 0;
  root.add(flames);
  const flash = new THREE.PointLight(0xffb060, 0, 18);
  root.add(flash);
  const flashBall = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffd08a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  root.add(flashBall);
  let flashAt = -1e9;

  const flying = new Map<number, { sim: BrNadeSim; at: number; type: "he" | "smoke" | "fire" }>();
  const areas = new Map<
    number,
    { type: "smoke" | "fire"; x: number; y: number; z: number; from: number; until: number }
  >();
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    s = new THREE.Vector3(),
    c = new THREE.Color();
  const jitter = (i: number, k: number) => {
    const h = Math.imul(i * 7919 + k * 104729, 2654435761) >>> 0;
    return (h / 2 ** 32) * 2 - 1;
  };
  return {
    /** A throw: the start the server used, and its server time. */
    thrown(id: number, type: "he" | "smoke" | "fire", o: number[], vel: number[], at: number) {
      flying.set(id, {
        sim: brNadeStart({ x: o[0]!, y: o[1]!, z: o[2]! }, { x: vel[0]!, y: vel[1]!, z: vel[2]! }),
        at,
        type,
      });
    },
    boom(id: number, x: number, y: number, z: number, now: number) {
      flying.delete(id);
      flash.position.set(x, y + 0.3, z);
      flashBall.position.copy(flash.position);
      flashAt = now;
    },
    area(
      id: number,
      type: "smoke" | "fire",
      x: number,
      y: number,
      z: number,
      from: number,
      until: number,
    ) {
      flying.delete(id);
      if (!areas.has(id)) areas.set(id, { type, x, y, z, from, until });
    },
    update(world: StaticWorld, server: number, now: number) {
      // Flights.
      balls.count = 0;
      for (const [id, n] of flying) {
        const steps = nadeSteps((server - n.at) / 1000) - n.sim.n;
        if (steps > 0) brNadeAdvance(n.sim, world, Math.min(steps, 1024));
        if (server - n.at > 6000) flying.delete(id);
        if (balls.count >= MAX_NADES) continue;
        m.makeTranslation(n.sim.x, n.sim.y, n.sim.z);
        balls.setMatrixAt(balls.count, m);
        balls.setColorAt(balls.count++, c.set(ballColors[n.type]));
      }
      balls.instanceMatrix.needsUpdate = true;
      if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
      // HE flash.
      const f = (now - flashAt) / 260;
      flash.intensity = f < 1 ? (1 - f) * 60 : 0;
      (flashBall.material as THREE.MeshBasicMaterial).opacity = f < 1 ? (1 - f) * 0.9 : 0;
      flashBall.scale.setScalar(0.5 + Math.min(1, f) * 3.5);
      // Smoke clouds and flames.
      puffs.count = 0;
      flames.count = 0;
      const S = GRENADES.smoke;
      for (const [id, a] of areas) {
        if (server > a.until) {
          areas.delete(id);
          continue;
        }
        const age = server - a.from,
          left = a.until - server;
        if (a.type === "smoke") {
          const grow = Math.min(1, age / S.expandMs),
            fade = Math.min(1, left / S.fadeMs);
          for (let i = 0; i < PUFFS && puffs.count < puffs.instanceMatrix.count; i++) {
            const r = S.radius * (0.25 + 0.75 * grow);
            v.set(
              a.x + jitter(id, i) * r * 0.75,
              a.y + 0.4 + Math.abs(jitter(id, i + 50)) * S.height * grow,
              a.z + jitter(id, i + 99) * r * 0.75,
            );
            s.setScalar(
              (0.9 + 0.5 * Math.abs(jitter(id, i + 7))) *
                (0.4 + 0.6 * grow) *
                (0.6 + 0.4 * fade) *
                1.4,
            );
            m.compose(v, q.identity(), s);
            puffs.setMatrixAt(puffs.count++, m);
          }
        } else {
          for (let i = 0; i < FLAMES && flames.count < flames.instanceMatrix.count; i++) {
            const r =
              GRENADES.fire.radius * Math.min(1, age / 600) * Math.sqrt(Math.abs(jitter(id, i)));
            const ang = jitter(id, i + 31) * Math.PI;
            const flick = 0.6 + 0.4 * Math.sin(now / 70 + i * 1.7);
            v.set(a.x + Math.cos(ang) * r, a.y - 0.05, a.z + Math.sin(ang) * r);
            s.set(1, flick * Math.min(1, left / 800 + 0.2), 1);
            m.compose(v, q.identity(), s);
            flames.setMatrixAt(flames.count++, m);
          }
        }
      }
      puffs.instanceMatrix.needsUpdate = true;
      flames.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const o of [balls, puffs, flames]) o.dispose();
      flashBall.geometry.dispose();
      root.removeFromParent();
    },
  };
}
