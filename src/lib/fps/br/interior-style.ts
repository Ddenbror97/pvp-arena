import type * as THREE from "three";

/**
 * Interiors that differ from house to house (owner, 2026-11-15: "audit all buildings that dont
 * have any color/design inside the house? example colors on the walls and wood on the floor?
 * many houses looks the same in the interior. use diffrent colors or design"). Hundreds of
 * placements share one model each (467 houses, 447 bungalows), so their rooms were identical:
 * pale walls, one flat brown floor, dark ceilings. The near LOD's interior surfaces (prepared
 * by art/blender/br/interior_style.mjs: materials "Interior walls and ceiling" and "Access
 * floor and steps") are painted here per placement, from a hash of where it stands: a wall
 * colour (some homes papered in stripes), a floor of planks in one of several woods, tiles or
 * carpet, a light ceiling, Deterministic, no textures, no extra draws.
 */
export const INTERIOR_WALLS = "Interior walls and ceiling";
export const INTERIOR_FLOORS = "Access floor and steps";

export type InteriorKind = "home" | "shop" | "office";

/** The buildings whose rooms are painted, and how. */
export const INTERIOR_STYLE: Record<string, InteriorKind> = {
  house: "home",
  "rural-house": "home",
  cabin: "home",
  "rural-wood-1": "home",
  "rural-wood-4": "home",
  "rural-mobile-home": "home",
  "rural-trailer": "home",
  bungalow: "home",
  townhouse: "home",
  apartment: "home",
  "brick-shop": "shop",
  "rural-store-1": "shop",
  "rural-store-3": "shop",
  "rural-store-5": "shop",
  "rural-diner": "shop",
  "burger-joint": "shop",
  "strip-mall": "shop",
  "car-showroom": "shop",
  "fire-station": "office",
  "police-station": "office",
  "ind-office-trailer": "office",
};

/** sRGB palettes (converted to linear in the shader), picked by the placement's hash. */
const WALLS: Record<InteriorKind, number[][]> = {
  home: [
    [0.96, 0.9, 0.76], // cream
    [0.66, 0.78, 0.66], // sage
    [0.7, 0.8, 0.92], // sky blue
    [0.97, 0.78, 0.64], // peach
    [0.86, 0.62, 0.6], // dusty rose
    [0.8, 0.74, 0.9], // lavender
    [0.96, 0.86, 0.56], // ochre
    [0.56, 0.66, 0.76], // slate blue
    [0.84, 0.9, 0.68], // pistachio
    [0.93, 0.93, 0.9], // white
    [0.72, 0.6, 0.5], // tan
    [0.6, 0.74, 0.74], // teal grey
  ],
  shop: [
    [0.95, 0.95, 0.93],
    [0.86, 0.88, 0.88],
    [0.95, 0.9, 0.78],
    [0.76, 0.88, 0.8],
    [0.9, 0.82, 0.7],
    [0.82, 0.86, 0.92],
  ],
  office: [
    [0.9, 0.9, 0.88],
    [0.78, 0.82, 0.86],
    [0.86, 0.84, 0.78],
    [0.74, 0.8, 0.76],
  ],
};
/** Floor woods (planks), tile colours, carpets. */
const WOODS = [
  [0.66, 0.46, 0.28], // oak
  [0.42, 0.28, 0.18], // walnut
  [0.8, 0.62, 0.42], // pine
  [0.6, 0.56, 0.5], // grey-washed
  [0.58, 0.33, 0.22], // cherry
  [0.74, 0.58, 0.4], // ash
];
const TILES = [
  [0.92, 0.91, 0.88],
  [0.78, 0.5, 0.38], // terracotta
  [0.7, 0.72, 0.74],
  [0.86, 0.8, 0.66],
];
const CARPETS = [
  [0.48, 0.16, 0.18], // burgundy
  [0.2, 0.26, 0.42], // navy
  [0.76, 0.7, 0.58], // beige
  [0.3, 0.42, 0.3], // green
  [0.5, 0.48, 0.46], // grey
];
/** Share of floors that are planks, tiles (the rest carpet), by kind. */
const FLOOR_MIX: Record<InteriorKind, [number, number]> = {
  home: [0.6, 0.82],
  shop: [0.25, 0.9],
  office: [0.2, 0.5],
};

const glslList = (name: string, list: number[][]) =>
  `vec3 ${name}(float i) {\n` +
  list
    .map(
      (c, k) =>
        `  ${k ? "else " : ""}${k < list.length - 1 ? `if (i < ${(k + 0.5).toFixed(1)}) ` : ""}return pow(vec3(${c.map((v) => v.toFixed(3)).join(", ")}), vec3(2.2));`,
    )
    .join("\n") +
  "\n}\n";

const patched = new WeakSet<THREE.Material>();

/** Patch an interior material of a near LOD (once, before its first use). */
export function applyInteriorStyle(material: THREE.MeshStandardMaterial, kind: InteriorKind) {
  if (patched.has(material)) return;
  const floors = material.name === INTERIOR_FLOORS;
  if (!floors && material.name !== INTERIOR_WALLS) return;
  patched.add(material);
  const walls = WALLS[kind];
  const [planks, tiles] = FLOOR_MIX[kind];
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vBrInWorld;\nvarying vec4 vBrInSeed;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        {
          vec4 brW = vec4(transformed, 1.0);
          vec4 brO = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            brW = instanceMatrix * brW;
            brO = instanceMatrix * brO;
          #endif
          vBrInWorld = (modelMatrix * brW).xyz;
          vec3 o = (modelMatrix * brO).xyz;
          // Four independent picks from where the building stands.
          vBrInSeed = fract(sin(vec4(dot(floor(o.xz), vec2(12.9898, 78.233)), dot(floor(o.xz), vec2(39.346, 11.135)), dot(floor(o.xz), vec2(73.156, 52.235)), dot(floor(o.xz), vec2(27.42, 91.71)))) * 43758.5453);
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vBrInWorld;
        varying vec4 vBrInSeed;
        ${glslList("brWall", walls)}
        ${glslList("brWood", WOODS)}
        ${glslList("brTile", TILES)}
        ${glslList("brCarpet", CARPETS)}
        float brHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          // (A little light of its own: the rooms' bounce light, so a wall turned from the sun
          // keeps its colour instead of going near black.)
          vec3 n = normalize(cross(dFdx(vBrInWorld), dFdy(vBrInWorld)));
          vec4 s = vBrInSeed;
          bool isFlat = abs(n.y) > 0.7;
          bool below = vBrInWorld.y < cameraPosition.y;
          ${
            floors
              ? `
          if (isFlat && below) {
            // Along x or along z.
            vec2 uv = s.y < 0.5 ? vBrInWorld.xz : vBrInWorld.zx;
            if (s.x < ${planks.toFixed(2)}) {
              float row = floor(uv.y / 0.17);
              float u = uv.x + brHash(vec2(row, 3.1)) * 4.0;
              float seg = floor(u / 1.35);
              vec3 wood = brWood(floor(s.z * ${WOODS.length}.0));
              float shade = 0.82 + 0.3 * brHash(vec2(row, seg));
              float grain = 0.94 + 0.06 * sin(u * 37.0 + brHash(vec2(row, seg + 7.0)) * 6.0);
              float gv = fract(uv.y / 0.17), gu = fract(u / 1.35);
              float seam = step(0.04, gv) * step(0.012, gu);
              diffuseColor.rgb = wood * shade * grain * mix(0.45, 1.0, seam);
            } else if (s.x < ${tiles.toFixed(2)}) {
              vec2 t = uv / 0.45;
              vec2 f = fract(t);
              float grout = step(0.03, f.x) * step(0.03, f.y) * step(f.x, 0.97) * step(f.y, 0.97);
              vec3 a = brTile(floor(s.z * ${TILES.length}.0));
              // Some floors chequered black and white.
              vec3 b = s.w < 0.35 ? pow(vec3(0.16), vec3(2.2)) : a * 0.9;
              float chk = mod(floor(t.x) + floor(t.y), 2.0);
              vec3 tile = s.w < 0.35 && mod(floor(s.z * 7.0), 2.0) < 1.0 ? mix(pow(vec3(0.92), vec3(2.2)), b, chk) : mix(a, a * 0.93, chk);
              diffuseColor.rgb = mix(pow(vec3(0.5), vec3(2.2)), tile * (0.95 + 0.05 * brHash(floor(t))), grout);
            } else {
              vec3 c = brCarpet(floor(s.z * ${CARPETS.length}.0));
              diffuseColor.rgb = c * (0.9 + 0.1 * brHash(floor(vBrInWorld.xz * 40.0)));
            }
          } else if (isFlat) {
            diffuseColor.rgb = pow(vec3(0.92, 0.91, 0.88), vec3(2.2));
          } else {
            // Stair risers and slab edges: dark wood.
            diffuseColor.rgb = brWood(floor(s.z * ${WOODS.length}.0)) * 0.6;
          }`
              : `
          if (isFlat && !below) {
            diffuseColor.rgb = pow(vec3(0.93, 0.92, 0.9), vec3(2.2));
          } else if (!isFlat) {
            vec3 wall = brWall(floor(s.w * ${walls.length}.0));
            // Some homes papered: soft vertical stripes along the wall.
            ${
              kind === "home"
                ? `if (s.y > 0.72) {
              float along = abs(n.x) > abs(n.z) ? vBrInWorld.z : vBrInWorld.x;
              wall *= 0.9 + 0.1 * step(0.5, fract(along / 0.22));
            }`
                : ""
            }
            diffuseColor.rgb = wall;
          }`
          }
          totalEmissiveRadiance += diffuseColor.rgb * 0.14;
        }`,
      );
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () =>
    `${key.call(material)}|br-interior-v1-${floors ? "f" : "w"}-${kind}`;
  material.needsUpdate = true;
}
