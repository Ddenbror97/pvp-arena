import type { GrenadeCue } from "../grenades/grenade-audio";
import * as THREE from "three";
import { GRENADES } from "../grenades/rules";
import { puffRadius, smokePhase } from "../grenades/effects";
import { makeNoiseTexture, makeSprites, softMaterial } from "../grenades/grenade-world-view";
import { brNadeAdvance, brNadeStart, nadeSteps, type BrNadeSim } from "./grenades";
import type { StaticWorld } from "./static-world";
import { brSmokePuffs } from "./smoke";

/**
 * Grenades on the island, drawn from the server's events: each throw is flown here with the
 * same deterministic flight as the server (grenades.ts), so it lands exactly where it bursts;
 * HE flashes, smoke grows into a cloud of soft puffs for its duration, flames flicker over the
 * floor. Instanced and capped (cheap at any count).
 *
 * Smoke is the 1v1/5v5 smoke (owner, 2026-11-11: "the smoke grenade effect is not correct in
 * battle royale, should be smoke like 1v1/5v5"): the same puff grid flooding out from the can
 * (kept out of walls), the same growth, swell and fade (effects.ts smokePhase, puffRadius), and
 * the same churning noise sprites, with the grey veil when the eye is inside the cloud. It
 * replaces 18 solid grey balls.
 */
const MAX_NADES = 24,
  MAX_CLOUDS = 12,
  SMOKE_SPRITES = 2 * GRENADES.smoke.maxPuffs * MAX_CLOUDS + MAX_CLOUDS,
  FLAMES = 14,
  MAX_FIRES = 10;

export function createNadeRenderer(
  scene: THREE.Scene,
  sound?: (cue: GrenadeCue, at: [number, number, number]) => void,
) {
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
  const noise = makeNoiseTexture();
  const smokeUniforms = {
    uTime: { value: 0 },
    uNoise: { value: noise },
    uCamera: { value: new THREE.Vector3() },
  };
  const soft = makeSprites(SMOKE_SPRITES, softMaterial(smokeUniforms));
  soft.mesh.name = "br-smoke-sprites";
  root.add(soft.mesh);
  // In-smoke veil: when the eye is inside a cloud, a grey screen-filling quad (drawn last).
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xb4b8b6,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      fog: false,
    }),
  );
  veil.name = "br-smoke-veil";
  veil.renderOrder = 999;
  veil.frustumCulled = false;
  veil.visible = false;
  root.add(veil);
  const forward = new THREE.Vector3();
  const flames = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.28, 0.9, 6, 1, true).translate(0, 0.45, 0),
    new THREE.MeshBasicMaterial({
      color: 0xff8a2a,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      // Additive: the order of the two sides does not show, so one pass (blended-once.ts).
      forceSinglePass: true,
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

  const flying = new Map<
    number,
    { sim: BrNadeSim; at: number; type: "he" | "smoke" | "fire"; bounceAt?: number }
  >();
  const areas = new Map<
    number,
    {
      type: "smoke" | "fire";
      x: number;
      y: number;
      z: number;
      from: number;
      until: number;
      bedAt: number;
      /** Smoke: the cloud's puff centres in growth order (made on first draw). */
      puffs?: number[];
    }
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
      sound?.("spoon", [o[0]!, o[1]!, o[2]!]);
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
      serverNow = from,
    ) {
      flying.delete(id);
      if (!areas.has(id)) {
        areas.set(id, { type, x, y, z, from, until, bedAt: Math.max(serverNow, from) + 1300 });
        if (serverNow - from < 500) sound?.(type, [x, y, z]);
      }
    },
    update(world: StaticWorld, server: number, now: number, camera?: THREE.Camera) {
      // Flights.
      balls.count = 0;
      for (const [id, n] of flying) {
        const steps = nadeSteps((server - n.at) / 1000) - n.sim.n;
        if (steps > 0)
          brNadeAdvance(n.sim, world, Math.min(steps, 1024), (impact) => {
            const at = n.at + impact.t * 1000;
            if (server - at < 250 && at - (n.bounceAt ?? -Infinity) > 80) {
              n.bounceAt = at;
              sound?.(n.type === "he" ? "bounce" : "bounce-can", [impact.x, impact.y, impact.z]);
            }
          });
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
      flames.count = 0;
      soft.begin();
      smokeUniforms.uTime.value = now / 1000;
      const eye = smokeUniforms.uCamera.value;
      if (camera) eye.setFromMatrixPosition(camera.matrixWorld);
      let veilAlpha = 0;
      let clouds = 0;
      for (const [id, a] of areas) {
        if (server > a.until) {
          areas.delete(id);
          continue;
        }
        if (server >= a.bedAt) {
          sound?.(a.type === "smoke" ? "smoke-hiss" : "fire-crackle", [a.x, a.y, a.z]);
          a.bedAt = server + (a.type === "smoke" ? 2600 : 1300);
        }
        const age = server - a.from,
          left = a.until - server;
        if (a.type === "smoke") {
          if (clouds++ >= MAX_CLOUDS) continue;
          a.puffs ??= brSmokePuffs(a.x, a.y, a.z, world);
          // As in 1v1/5v5 (grenade-world-view.ts): two jittered sprites a puff, a little larger
          // than the puff, lighter towards the top; the can still pouring at the base.
          const phase = smokePhase({ at: a.from, puffs: a.puffs }, server);
          if (phase.age < 0 || phase.over) continue;
          const p = a.puffs;
          const ground = p[1]! - GRENADES.smoke.spacing * 0.55;
          for (let i = 0; i < phase.count; i++) {
            const r = puffRadius(i, phase.total, phase.age, phase.fade);
            if (r <= 0.02) continue;
            const x = p[i * 3]!,
              y = p[i * 3 + 1]!,
              z = p[i * 3 + 2]!;
            const alpha = phase.density * (1 - (i / phase.total) * 0.2);
            const shade =
              0.66 + 0.26 * Math.min(1, Math.max(0, (y - ground) / GRENADES.smoke.height));
            const seed = (id * 31 + i * 7.13) % 97;
            for (let k = 0; k < 2; k++)
              soft.push(
                x + (hash(seed + k * 3.1) - 0.5) * 0.35,
                y + (hash(seed + k * 5.7) - 0.5) * 0.25,
                z + (hash(seed + k * 9.3) - 0.5) * 0.35,
                r * 2.9,
                alpha * 0.72,
                seed + k,
                0,
                shade,
                shade,
                shade * 1.02,
              );
            const dx = eye.x - x,
              dy = eye.y - y,
              dz = eye.z - z;
            if (camera && dx * dx + dy * dy + dz * dz < r * r) veilAlpha += 0.5 * phase.density;
          }
          if (phase.fade < 0.5)
            soft.push(p[0]!, ground + 0.15, p[2]!, 0.6, 0.5, id, 0, 0.86, 0.86, 0.88);
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
      soft.end(veilAlpha >= 1);
      flames.instanceMatrix.needsUpdate = true;
      const veilMaterial = veil.material as THREE.MeshBasicMaterial;
      veilMaterial.opacity = Math.min(1, veilAlpha);
      veil.visible = !!camera && veilMaterial.opacity > 0.01;
      if (veil.visible && camera) {
        camera.getWorldDirection(forward);
        veil.position.copy(eye).addScaledVector(forward, 0.2);
        camera.getWorldQuaternion(veil.quaternion);
        veil.scale.setScalar(2);
        veil.updateMatrix();
        veil.updateMatrixWorld();
      }
    },
    dispose() {
      for (const o of [balls, flames]) o.dispose();
      soft.dispose();
      noise.dispose();
      veil.geometry.dispose();
      (veil.material as THREE.Material).dispose();
      flashBall.geometry.dispose();
      root.removeFromParent();
    },
  };
}

const hash = (x: number) => {
  const h = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return h - Math.floor(h);
};

export { brSmokePuffs };
