import * as THREE from "three";

/**
 * Ejected cases for the first-person rifles: a bounded pool drawn as one InstancedMesh in the
 * weapon pass. Purely visual: positions are integrated per frame with gravity and tumble, no
 * collision; each case lives LIFETIME_MS then its slot is reused (oldest first). The pool never
 * grows and nothing is allocated per shot or per frame.
 *
 * Each case is a turned (lathe) profile like the real thing: extractor rim and groove, tapered
 * body, shoulder, neck and an open mouth with a sooty interior; the primer and the fouled neck
 * are vertex colours, and every shot gets a slightly different tone so a burst never looks
 * stamped out of one mould.
 *
 * Units are the viewmodel scene's (≈ metres), drawn at the viewmodel's scale (×0.8).
 */
export const CASING_POOL = 16;
export const CASING_LIFETIME_MS = 900;
const GRAVITY = -9.8;

type CasingSpec = {
  name: string;
  /** Rim/base radius, body radius at the shoulder, overall length (scene units). */
  radius: number;
  topRadius: number;
  length: number;
  /** Where the body ends and the shoulder cone starts, and where the neck starts (fractions of length). */
  shoulder: number;
  neckStart: number;
  /** Neck radius as a fraction of the body's top radius. */
  neck: number;
  /** Extractor groove radius as a fraction of the rim radius. */
  groove: number;
  /** Case colour (sRGB), primer cup and its sealant ring, and how dark the powder fouling makes the neck (0–1). */
  color: number;
  primer: number;
  sealant: number;
  soot: number;
  metalness: number;
  roughness: number;
  /** Ejection speeds (m/s): out to the right, up, and backward (negative: forward). */
  speed: { out: number; up: number; back: number };
  /** Tumble (rad/s): end over end about the weapon's up axis, plus a slower roll along the case. */
  tumble: { yaw: number; roll: number };
  /**
   * A shotgun shell: above `from` (fraction of the length) the case is a plastic hull of this
   * colour (sRGB) instead of the head's brass.
   */
  hull?: { color: number; from: number };
};
/** M4A1: 5.56×45 brass, 45 mm case, 9.6 mm rim; up, right and a little rearward. */
export const M4_CASING: CasingSpec = {
  name: "brass",
  radius: 0.0048,
  topRadius: 0.0045,
  length: 0.045,
  shoulder: 0.82,
  neckStart: 0.89,
  neck: 0.71,
  groove: 0.86,
  // Fired cartridge brass (not new-jewellery gold), copper primer with the military red seal.
  color: 0xc9a35a,
  primer: 0xb27a52,
  sealant: 0x8a2a24,
  soot: 0.6,
  metalness: 1,
  roughness: 0.28,
  speed: { out: 2.1, up: 1.3, back: 0.55 },
  tumble: { yaw: 24, roll: 7 },
};
/**
 * AK-47: 7.62×39 brass, 39 mm long and 11.3 mm at the base with a strong taper and a
 * short neck; the AK throws its cases hard to the right and slightly forward.
 */
export const AK_CASING: CasingSpec = {
  name: "brass-762",
  radius: 0.0057,
  topRadius: 0.005,
  length: 0.031,
  shoulder: 0.79,
  neckStart: 0.85,
  neck: 0.86,
  groove: 0.85,
  // Brass like the M4's, a touch warmer and more weathered (military surplus), copper primer
  // with its red sealant ring.
  color: 0xc49a52,
  primer: 0xa86e46,
  sealant: 0x9a2c22,
  soot: 0.6,
  metalness: 1,
  roughness: 0.3,
  speed: { out: 2.6, up: 1.1, back: -0.25 },
  tumble: { yaw: 28, roll: 9 },
};

/**
 * MP5: 9×19 mm Parabellum, a short straight-walled brass case (19 mm, 9.9 mm rim) with a slight
 * taper and no shoulder; the roller-delayed MP5 flings its cases hard to the right and forward.
 */
export const MP5_CASING: CasingSpec = {
  name: "brass-9mm",
  radius: 0.0049,
  topRadius: 0.0048,
  length: 0.019,
  shoulder: 0.96,
  neckStart: 0.97,
  neck: 0.98,
  groove: 0.86,
  color: 0xcaa35c,
  primer: 0xb07650,
  sealant: 0x8a2a24,
  soot: 0.5,
  metalness: 1,
  roughness: 0.3,
  speed: { out: 3.0, up: 1.2, back: -0.3 },
  tumble: { yaw: 30, roll: 8 },
};
/**
 * Desert Eagle: .50 Action Express, a fat straight-walled case (32.6 mm, 13.4 mm rim) with a
 * rebated rim; thrown up and to the right by the long slide stroke.
 */
export const DEAGLE_CASING: CasingSpec = {
  name: "brass-50ae",
  radius: 0.0067,
  topRadius: 0.0068,
  length: 0.0326,
  shoulder: 0.96,
  neckStart: 0.97,
  neck: 0.98,
  groove: 0.82,
  color: 0xc9a258,
  primer: 0xae7a54,
  sealant: 0x9a2c22,
  soot: 0.55,
  metalness: 1,
  roughness: 0.28,
  speed: { out: 2.2, up: 1.9, back: 0.35 },
  tumble: { yaw: 18, roll: 6 },
};

/**
 * SPAS-12: a fired 12 gauge 2¾" shell (70 mm opened out, 22.5 mm rim): a red plastic hull on a
 * brass head, its crimp blown open. The gas action throws it out to the right and a little up;
 * it is heavy and tumbles slowly.
 */
export const SPAS12_CASING: CasingSpec = {
  name: "hull-12g",
  radius: 0.0112,
  topRadius: 0.0101,
  length: 0.068,
  shoulder: 0.975,
  neckStart: 0.985,
  neck: 0.99,
  groove: 0.9,
  color: 0xc9a258,
  primer: 0xae7a54,
  sealant: 0x8a2a24,
  soot: 0.45,
  // (One material for the whole case: between brass and plastic.)
  metalness: 0.55,
  roughness: 0.42,
  hull: { color: 0xb3261e, from: 0.24 },
  // (Out fast: at 22 mm across it would otherwise hang in front of an aimed sight.)
  speed: { out: 3.1, up: 1.3, back: 0.25 },
  tumble: { yaw: 15, roll: 5 },
};

/** The case a gun ejects (by viewmodel variant): the AWP and the AK share the 7.62 pool. */
export const casingPoolOf = (variant: string): "m4" | "ak" | "mp5" | "deagle" =>
  variant === "m4" || variant === "mp5" || variant === "deagle" ? variant : "ak";

/** Profile points (radius, height) from the base centre up the outside, then down the inside. */
function caseProfile(spec: CasingSpec) {
  const R = spec.radius,
    L = spec.length,
    groove = R * spec.groove,
    neck = spec.topRadius * spec.neck,
    wall = Math.min(neck * 0.18, R * 0.08),
    primer = R * 0.42;
  // [r, y, tint]: tint 0 = case, 1 = primer, 2 = groove grime, 3 = sooty neck, 4 = interior,
  // 5 = primer sealant ring, 6 = plastic hull, 7 = the hull's sooty mouth.
  const hull = spec.hull;
  // Where the brass head ends and the hull begins (two rings, so the colours do not blend).
  const wallAt = (k: number) =>
    R * 0.985 + (spec.topRadius - R * 0.985) * ((k - 0.1) / (spec.shoulder - 0.1));
  const points: Array<[number, number, number]> = [
    // Primer cup, seated a hair below the case head.
    [0, L * 0.004, 1],
    [primer * 0.72, L * 0.004, 1],
    [primer * 0.86, L * 0.004, 5],
    [primer, 0, 0],
    [R * 0.93, 0, 0],
    [R, L * 0.012, 0],
    [R, L * 0.028, 0],
    [groove, L * 0.045, 2],
    [groove, L * 0.065, 2],
    [R * 0.985, L * 0.1, 0],
    ...(hull
      ? ([
          [wallAt(hull.from), L * hull.from, 0],
          [wallAt(hull.from) * 0.985, L * (hull.from + 0.004), 6],
        ] as Array<[number, number, number]>)
      : []),
    [spec.topRadius, L * spec.shoulder, hull ? 6 : 0],
    [neck, L * spec.neckStart, hull ? 7 : 3],
    [neck, L, hull ? 7 : 3],
    [neck - wall, L, 4],
    [neck - wall, L * spec.neckStart, 4],
    [spec.topRadius - wall, L * 0.7, 4],
    [0, L * 0.68, 4],
  ];
  return points;
}

function caseGeometry(spec: CasingSpec) {
  const profile = caseProfile(spec);
  const segments = 18;
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y - spec.length / 2)),
    segments,
  );
  const body = new THREE.Color(spec.color),
    primer = new THREE.Color(spec.primer),
    sealant = new THREE.Color(spec.sealant);
  const tints = profile.map(([, , tint]) => {
    if (tint === 1) return primer;
    if (tint === 2) return body.clone().multiplyScalar(0.62);
    if (tint === 3) return body.clone().multiplyScalar(1 - spec.soot);
    if (tint === 4) return body.clone().multiplyScalar(0.05);
    if (tint === 5) return sealant;
    if (tint === 6) return new THREE.Color(spec.hull!.color);
    if (tint === 7) return new THREE.Color(spec.hull!.color).multiplyScalar(1 - spec.soot);
    return body;
  });
  // Light that reaches each ring: none down inside the case, little in the extractor groove.
  const reach = profile.map(([, , tint]) => (tint === 4 ? 0.06 : tint === 2 ? 0.7 : 1));
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3),
    occlusion = new Float32Array(count);
  // LatheGeometry lays vertices out segment by segment, each a full copy of the profile.
  for (let j = 0; j <= segments; j++)
    tints.forEach((tint, i) => {
      tint.toArray(colors, (j * profile.length + i) * 3);
      occlusion[j * profile.length + i] = reach[i]!;
    });
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("caseOcclusion", new THREE.BufferAttribute(occlusion, 1));
  return geometry;
}

export function createShellCasings(layer = 1, spec: CasingSpec = M4_CASING) {
  const geometry = caseGeometry(spec);
  const material = new THREE.MeshStandardMaterial({
    name: spec.name,
    vertexColors: true,
    metalness: spec.metalness,
    roughness: spec.roughness,
  });
  // Occlude reflections too, or the inside of the mouth mirrors the sky at grazing angles.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float caseOcclusion;\nvarying float vCaseOcclusion;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvCaseOcclusion = caseOcclusion;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCaseOcclusion;")
      .replace(
        "#include <aomap_fragment>",
        `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= vCaseOcclusion;
      reflectedLight.indirectSpecular *= vCaseOcclusion;
      reflectedLight.directSpecular *= vCaseOcclusion;
      reflectedLight.directDiffuse *= vCaseOcclusion;`,
      );
  };
  material.customProgramCacheKey = () => "shell-casing";
  const mesh = new THREE.InstancedMesh(geometry, material, CASING_POOL);
  mesh.name = "shell-casings";
  mesh.frustumCulled = false;
  mesh.layers.set(layer);
  // Per-instance tone exists from the start: creating instanceColor at the first shot changed
  // the shader (USE_INSTANCING_COLOR) and compiled it mid-fight (render audit 2026-11-03).
  {
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < CASING_POOL; i++) mesh.setColorAt(i, white);
  }
  mesh.count = 0;
  const born = new Float64Array(CASING_POOL).fill(-Infinity),
    p = new Float32Array(CASING_POOL * 3),
    v = new Float32Array(CASING_POOL * 3),
    spin = new Float32Array(CASING_POOL * 3),
    roll = new Float32Array(CASING_POOL),
    q = new Float32Array(CASING_POOL * 4);
  let next = 0,
    live = 0,
    shots = 0;
  const matrix = new THREE.Matrix4(),
    quaternion = new THREE.Quaternion(),
    step = new THREE.Quaternion(),
    axis = new THREE.Vector3(),
    scale = new THREE.Vector3(1, 1, 1),
    at = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    caseAxis = new THREE.Vector3(0, 1, 0),
    tone = new THREE.Color(),
    hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < CASING_POOL; i++) {
    mesh.setMatrixAt(i, hidden);
    mesh.setColorAt(i, tone.setScalar(1));
  }
  /** Deterministic per-shot variation in [-0.5, 0.5). */
  const jitter = (prime: number) => ((shots * prime) % 100) / 100 - 0.5;
  return {
    mesh,
    /**
     * Eject one case at `origin` (scene space) with `right`/`up`/`back` the weapon's axes in
     * scene space: out to the right, up and back, mouth first along the bore, tumbling end over
     * end.
     */
    emit(
      origin: THREE.Vector3,
      right: THREE.Vector3,
      up: THREE.Vector3,
      back: THREE.Vector3,
      now: number,
    ) {
      const i = next;
      next = (next + 1) % CASING_POOL;
      shots++;
      const a = jitter(7919),
        b = jitter(104729),
        c = jitter(1299709);
      born[i] = now;
      p.set([origin.x, origin.y, origin.z], i * 3);
      const speedOut = spec.speed.out + a * 0.4,
        speedUp = spec.speed.up + b * 0.35,
        speedBack = spec.speed.back + c * 0.15;
      for (let k = 0; k < 3; k++) {
        const key = k === 0 ? "x" : k === 1 ? "y" : "z";
        v[i * 3 + k] = right[key] * speedOut + up[key] * speedUp + back[key] * speedBack;
      }
      // Leaves the chamber pointing down the bore, then pinwheels: the ejector kicks the base
      // out to the right, so it spins about the weapon's up axis with a little roll and wobble.
      quaternion.setFromUnitVectors(caseAxis, forward.copy(back).negate().normalize());
      quaternion.toArray(q, i * 4);
      const yaw = spec.tumble.yaw * (1 + a * 0.3),
        wobble = 3 * c;
      for (let k = 0; k < 3; k++) {
        const key = k === 0 ? "x" : k === 1 ? "y" : "z";
        spin[i * 3 + k] = up[key] * yaw + right[key] * wobble;
      }
      // Roll is about the case's own length, so it turns with the case.
      roll[i] = spec.tumble.roll * (1 + b * 0.5);
      // Lot-to-lot tone: a touch lighter or darker per round.
      mesh.setColorAt(i, tone.setScalar(1 + a * 0.16 - c * 0.08));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.count = CASING_POOL;
    },
    update(dt: number, now: number) {
      if (!mesh.count) return;
      const seconds = Math.min(0.05, Math.max(0, dt / 1000));
      live = 0;
      for (let i = 0; i < CASING_POOL; i++) {
        if (now - born[i]! > CASING_LIFETIME_MS) {
          if (born[i] !== -Infinity) {
            born[i] = -Infinity;
            mesh.setMatrixAt(i, hidden);
          }
          continue;
        }
        live++;
        v[i * 3 + 1]! += GRAVITY * seconds;
        for (let k = 0; k < 3; k++) p[i * 3 + k]! += v[i * 3 + k]! * seconds;
        // Integrate the tumble: end over end in world space, roll about the case's own axis.
        axis.fromArray(spin, i * 3);
        const rate = axis.length();
        quaternion.fromArray(q, i * 4);
        if (rate > 0)
          quaternion.premultiply(step.setFromAxisAngle(axis.divideScalar(rate), rate * seconds));
        quaternion.multiply(step.setFromAxisAngle(caseAxis, roll[i]! * seconds)).normalize();
        quaternion.toArray(q, i * 4);
        matrix.compose(at.fromArray(p, i * 3), quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (!live) mesh.count = 0;
    },
    clear() {
      born.fill(-Infinity);
      for (let i = 0; i < CASING_POOL; i++) mesh.setMatrixAt(i, hidden);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = 0;
    },
    get live() {
      return live;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
