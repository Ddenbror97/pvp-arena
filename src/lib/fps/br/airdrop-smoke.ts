import * as THREE from "three";
import { makeNoiseTexture, makeSprites, softMaterial } from "../grenades/grenade-world-view";

/**
 * The marker smoke of a landed supply crate (owner, 2026-11-13: "alot of smoke effects from the
 * airdrop when it lands untill someone loots it … green color"): a thick green signal-flare
 * plume pouring from the crate and leaning down the wind, tall enough to be seen across the
 * island, from the landing until the server says someone took something from the crate.
 *
 * The grenade smoke's churning noise sprites (one instanced draw for every crate), each puff
 * on its own loop: born small at the crate, rising, swelling and thinning out.
 */
const PUFFS = 130,
  MAX_CRATES = 4,
  LIFE_MS = 9000,
  RISE_M = 46,
  /** The wind the plume leans with (m over a puff's life). */
  WIND: [number, number] = [9, 4];

const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export function createAirdropSmoke(scene: THREE.Scene) {
  const uniforms = {
    uTime: { value: 0 },
    uNoise: { value: makeNoiseTexture() },
    uCamera: { value: new THREE.Vector3() },
  };
  const sprites = makeSprites(PUFFS * MAX_CRATES + MAX_CRATES, softMaterial(uniforms));
  sprites.mesh.name = "br-airdrop-smoke";
  scene.add(sprites.mesh);
  return {
    /**
     * One frame. `crates`: the landed, unlooted ones ([x, ground, z, landed at (server ms)]);
     * `server` the server clock (so every client's plume is the same age).
     */
    update(
      crates: ReadonlyArray<[number, number, number, number]>,
      server: number,
      eye: THREE.Vector3,
    ) {
      uniforms.uTime.value = (server % 3_600_000) / 1000; // (a float32 keeps its precision)
      uniforms.uCamera.value.copy(eye);
      sprites.begin();
      for (let c = 0; c < Math.min(MAX_CRATES, crates.length); c++) {
        const [x, ground, z, landAt] = crates[c]!;
        const since = server - landAt;
        if (since < 0) continue;
        // The flare catches over the first two seconds.
        const lit = Math.min(1, since / 2000);
        for (let i = 0; i < PUFFS; i++) {
          const offset = (i / PUFFS) * LIFE_MS;
          // A puff is only out once the plume has had time to put it there.
          if (since < offset * 0.25) continue;
          const t = ((server + offset + c * 1777) % LIFE_MS) / LIFE_MS;
          const seed = c * 101 + i * 7.31;
          const spread = 1 + t * 7;
          const a = hash(seed) * Math.PI * 2;
          const r = Math.sqrt(hash(seed + 1.7)) * spread;
          const rise = RISE_M * (1 - (1 - t) * (1 - t)) + 1.1;
          const size = 2.6 + t * 11;
          // Dense near the crate, thinning out as it climbs.
          const alpha = lit * Math.min(1, t * 10) * (1 - t) ** 1.1;
          const g = 0.82 - t * 0.3;
          sprites.push(
            x + Math.cos(a) * r + WIND[0] * t * t,
            ground + rise,
            z + Math.sin(a) * r + WIND[1] * t * t,
            size,
            alpha,
            seed % 97,
            0,
            0.16 + t * 0.12,
            g,
            0.22 + t * 0.1,
          );
        }
        // The bright core at the crate where the flare burns.
        sprites.push(x, ground + 1.2, z, 3, lit, c * 13, 0, 0.45, 1, 0.4);
      }
      sprites.end();
    },
    dispose() {
      scene.remove(sprites.mesh);
      sprites.dispose();
      uniforms.uNoise.value.dispose();
    },
  };
}
