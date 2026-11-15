import * as THREE from "three";
import { dropDuplicateFaces } from "./duplicate-faces";
import { prepareFoliageMaterial } from "./foliage-material";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  CELL_SIZE,
  CELLS,
  cellOf,
  cellTrees,
  SPECIES,
  TREE_STRIDE,
  type VegetationWorld,
} from "./vegetation";
import { WORLD_HALF } from "./world";

/**
 * Instanced trees for Project Island. Placement comes from vegetation.ts (shared with the
 * server's trunk collision), so the client only decides how each tree is DRAWN, never whether
 * it exists: every tree within VEGETATION_VIEW.viewDistance is drawn on every machine (fairness
 * invariant, docs/battle-royale/PLAN.md §10), and the distances below are the same for everyone.
 *
 * A tree has three forms, chosen by its distance from the camera:
 *  - Detail (within detailDistance): the real CC BY tree model (LOD0, alpha-tested foliage).
 *  - Light (out to nearDistance): the same model simplified (LOD1), with the detail form's own
 *    textures, so the leaves and bark do not change, only how many triangles carry them.
 *  - Far (out to viewDistance): crossed-quad impostors (4 triangles) textured with a rendered
 *    side view of the same model, one draw per species. Built from the 250 m cells in a view
 *    wider and a little deeper than the camera's, and rebuilt only when the camera's own view
 *    takes in a cell that is not in it: once per several degrees of a turn, not every frame
 *    of one (ten thousand trees written and uploaded again each time).
 *
 * No tree ever switches form in one frame (owner, 2026-11-15: trees "shift/change style/design
 * while Walking/driving"; before, a whole 3 m ring of trees turned from model to flat impostor
 * at once, 60 m away, ten times a second in a car). Over a band past each distance (`fade` of
 * it) both forms are drawn: through the first half the farther form fills in behind the nearer
 * one, pixel by pixel on a screen dither weighted by the tree's own distance, and through the
 * second half the nearer one thins out the same way. One of the two is whole at every
 * distance, so a tree is never see-through on the way (two forms each half drawn showed the
 * sky through a birch wherever their outlines differ).
 *
 * The models are selected per tree every frame, by distance and by the view frustum, from the
 * trees gathered round the camera every few metres: a few hundred distance tests, and only the
 * trees on screen are drawn.
 *  - Per-instance data is 2 attributes (position + scale, yaw + tint): 6 floats, not a matrix,
 *    shared by a form's materials (bark and leaves).
 *
 * Without tree assets (tools, tests) the forms fall back to procedural low-poly shapes.
 */
export const VEGETATION_VIEW = {
  /** Trees are drawn out to here (m), identical for everyone; must cover the 1 km fight range. */
  viewDistance: 1500,
  /** The full model within this distance of the camera (m). */
  detailDistance: 45,
  /** The light model out to here (m); the impostor beyond. */
  nearDistance: 110,
  /** Each change of form is cross-faded over this share of its distance, past it. */
  fade: 0.2,
  /** The trees round the camera are gathered again after moving this far (m). */
  nearRebuild: 8,
  /** The far cells are taken from a view this much wider (the projection scaled by it) … */
  farWiden: 0.6,
  /** … and this much deeper (m) than the camera's, so a turn or a step does not rebuild them. */
  farDeeper: 150,
} as const;

/** Where a change of form at `distance` ends (m): both forms are drawn from there to here. */
export const fadeEnd = (distance: number) => distance * (1 + VEGETATION_VIEW.fade);
/** The middle of that band: the farther form is whole from here, the nearer one starts to go. */
const fadeMiddle = (distance: number) => distance * (1 + VEGETATION_VIEW.fade / 2);

/** Distances (m) over which a form appears and disappears; null: it does not. */
export type TreeFade = { in: [number, number] | null; out: [number, number] | null };

/**
 * The share of a form's pixels drawn at a distance: [from, to) of the dither's 0..1. Of a
 * tree's forms one always has all of it (tests/br-vegetation-rings).
 */
export function fadeShare(fade: TreeFade, distance: number): [number, number] {
  const ramp = (band: [number, number]) =>
    Math.min(1, Math.max(0, (distance - band[0]) / (band[1] - band[0])));
  return [fade.out ? ramp(fade.out) : 0, fade.in ? ramp(fade.in) : 1];
}

/** How far a crown can reach sideways from its trunk (m): the widest impostor at full scale. */
export const CROWN_REACH = 10;

/** Model ids per species (index = vegetation species id). */
export const TREE_MODELS = ["tree-pine", "tree-oak", "tree-birch"] as const;

export type TreeAssets = {
  /** LOD0 glTF per species (TREE_MODELS order). */
  models: GLTF[];
  /** LOD1 glTF per species: the same meshes and UVs, fewer triangles. Absent: LOD0 again. */
  light?: GLTF[];
  /** Impostor texture and its size (m) per species. */
  impostors: Array<{ texture: THREE.Texture; width: number; height: number }>;
};

/** One form of one species: its materials' meshes over one set of instances. */
type Batch = {
  parts: Array<{ mesh: THREE.Mesh; geometry: THREE.InstancedBufferGeometry; triangles: number }>;
  a: THREE.InstancedBufferAttribute;
  b: THREE.InstancedBufferAttribute;
  count: number;
  /** What was last uploaded (the instances in order): unchanged, nothing is uploaded again. */
  hash: number;
  uploaded: number;
};

export type VegetationControls = {
  root: THREE.Object3D;
  update: (camera: THREE.PerspectiveCamera) => void;
  /** Trees drawn out to here (m; never under VEGETATION_VIEW.viewDistance, the cover range). */
  setViewDistance: (m: number) => void;
  stats: () => {
    trees: number;
    /** Trees drawn as models this frame (in view), and of those the full models. */
    near: number;
    detail: number;
    triangles: number;
    draws: number;
    rebuilds: number;
    farBySpecies: number[];
  };
  dispose: () => void;
};

/** Shader: per-instance yaw/scale/translate, tint, and the cross-fade between a tree's forms. */
function instanceShader(
  material: THREE.Material,
  key: string,
  fade: TreeFade,
  camera: { value: THREE.Vector3 },
  o: {
    /** Keep alpha-tested foliage solid in distant mips (B. Golus' mip-level alpha scaling). */
    alphaMipScale?: number;
    /** The cutout texture's size in texels (for the mip level of alphaMipScale). */
    alphaTexSize?: number;
    /**
     * Impostor cards: light them with an up-facing normal on both faces. Three flips a
     * double-sided material's normal on back faces, which turned the up normal of every card
     * seen from behind (half of them, and most from the air) into a down normal: black forests.
     */
    upNormal?: boolean;
    /** Leaf recolour (LEAF_COLOUR), for foliage only. */
    leaf?: (typeof LEAF_COLOUR)[keyof typeof LEAF_COLOUR] | null;
    /**
     * Foliage only (owner, 2026-11-05: realistic trees across the map): the crown darkens
     * toward its base and inside (light reaches the top first), tips lighter; `height` is the
     * model's height (m), `strength` how much darker the lowest leaves are.
     */
    crown?: { height: number; strength: number } | null;
  } = {},
) {
  const { alphaMipScale = 0, alphaTexSize = 256, upNormal = false, leaf = null, crown = null } = o;
  // The form's fade, readable by tests (the shader does the same sums: fadeShare).
  material.userData["treeFade"] = { centre: camera, fade };
  const band = (b: [number, number] | null, none: string) =>
    b ? `clamp((treeDistance - ${b[0].toFixed(2)}) / ${(b[1] - b[0]).toFixed(2)}, 0.0, 1.0)` : none;
  material.onBeforeCompile = (shader) => {
    shader.uniforms["uTreeCamera"] = camera;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 aTreeA; // x, ground y, z, scale
        attribute vec2 aTreeB; // yaw (0..1), tint
        uniform vec3 uTreeCamera;
        // The share of the dither this form draws: [x, y) (fadeShare).
        flat varying vec2 vTreeFade;
        varying float vTreeTint;
        varying float vTreeH;
        varying vec3 vTreeHue;
        vec3 treeTurn(vec3 v) {
          float a = aTreeB.x * 6.2831853;
          float c = cos(a), s = sin(a);
          return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `vec3 objectNormal = treeTurn(normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = treeTurn(position) * aTreeA.w + aTreeA.xyz;
        vTreeTint = aTreeB.y;
        vTreeH = position.y;
        // Each tree its own shade of green: a little yellower or bluer, seeded by its position.
        {
          float h1 = fract(sin(dot(aTreeA.xz, vec2(12.9898, 78.233))) * 43758.5453);
          float h2 = fract(h1 * 7.31 + 0.13);
          vTreeHue = vec3(1.0 + (h1 - 0.5) * 0.16, 1.0 + (h2 - 0.5) * 0.08, 1.0 - (h1 - 0.5) * 0.18);
        }
        // From the camera to the tree's foot: from the air a forest is impostors, as it should be.
        float treeDistance = distance(aTreeA.xyz, uTreeCamera);
        vTreeFade = vec2(${band(fade.out, "0.0")}, ${band(fade.in, "1.0")});
        // Nothing of it to draw at this distance: no triangles either.
        if (vTreeFade.x >= vTreeFade.y) transformed = vec3(0.0);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        flat varying vec2 vTreeFade;
        varying float vTreeTint;
        varying float vTreeH;
        varying vec3 vTreeHue;`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        {
          // Interleaved gradient noise (Jimenez): an even, fine-grained 0..1 per pixel.
          float treeDither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (treeDither < vTreeFade.x || treeDither >= vTreeFade.y) discard;
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= vTreeTint;${
          leaf && leaf.k > 0
            ? `
        {
          float leafLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, leafLum * vec3(${leaf.hue.map((v) => v.toFixed(3)).join(", ")}), ${leaf.k.toFixed(3)}) * ${leaf.lift.toFixed(3)};
        }`
            : ""
        }${
          crown
            ? `
        diffuseColor.rgb *= vTreeHue * mix(${(1 - crown.strength).toFixed(3)}, ${(1 + crown.strength * 0.3).toFixed(3)}, smoothstep(0.12, 0.95, vTreeH / ${crown.height.toFixed(2)}));`
            : ""
        }`,
      );
    if (material.userData["brFoliage"])
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        // Thin leaf cards receive broad skylight rather than turning black on their backs.
        vec3 canopyUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        normal = normalize(mix(normal, canopyUp, 0.65));`,
      );
    if (leaf)
      // Leaves are rough and translucent: the default Fresnel turns sun-facing and edge-on
      // cards white (pale beige pines toward the sun). Keep a trace of the sheen only.
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <aomap_fragment>",
        `reflectedLight.directSpecular *= 0.15;
        reflectedLight.indirectSpecular *= 0.15;
        #include <aomap_fragment>`,
      );
    if (upNormal)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);`,
      );
    if (alphaMipScale > 0)
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphatest_fragment>",
        `{
          vec2 texel = vMapUv * ${alphaTexSize.toFixed(1)};
          vec2 dx = dFdx(texel), dy = dFdy(texel);
          float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
          diffuseColor.a *= 1.0 + mip * ${alphaMipScale.toFixed(2)};
        }
        #include <alphatest_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `br-trees-${key}`;
}

const instanced = (
  base: THREE.BufferGeometry,
  a: THREE.InstancedBufferAttribute,
  b: THREE.InstancedBufferAttribute,
) => {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  for (const [name, attr] of Object.entries(base.attributes))
    if (name !== "aTreeA" && name !== "aTreeB") geometry.setAttribute(name, attr);
  geometry.setAttribute("aTreeA", a);
  geometry.setAttribute("aTreeB", b);
  geometry.instanceCount = 0;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2 * WORLD_HALF);
  return geometry;
};
const instanceAttributes = (size: number) => {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(4 * size), 4);
  const b = new THREE.InstancedBufferAttribute(new Float32Array(2 * size), 2);
  a.setUsage(THREE.DynamicDrawUsage);
  b.setUsage(THREE.DynamicDrawUsage);
  return [a, b] as const;
};

/** One form of one species: a mesh per material, all over the same instances. */
function makeBatch(
  root: THREE.Object3D,
  parts: Array<{ base: THREE.BufferGeometry; material: THREE.Material }>,
  name: string,
): Batch {
  const [a, b] = instanceAttributes(1024);
  return {
    parts: parts.map(({ base, material }, i) => {
      const geometry = instanced(base, a, b);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = parts.length > 1 ? `${name}-${i}` : name;
      mesh.frustumCulled = false;
      root.add(mesh);
      const triangles = (base.index ? base.index.count : base.getAttribute("position").count) / 3;
      return { mesh, geometry, triangles };
    }),
    a,
    b,
    count: 0,
    hash: 0,
    uploaded: -1,
  };
}

/**
 * Room for `n` instances. Growing makes new geometries, never new attributes on the old ones:
 * three.js remembers how many instances a geometry's attributes held the first time it was
 * drawn and never draws more than that from it again (WebGLBindingStates sets
 * `_maxInstanceCount` once; renderBufferDirect clamps to it). Swapping in larger attributes
 * therefore kept drawing only the first batch's worth of trees: whenever more were in view
 * than at that first draw, the ones written last were missing, and which those were changed
 * with the direction of view (owner, 2026-11-10 and 11-11: trees vanish at some camera angles,
 * same spot).
 */
function ensure(batch: Batch, n: number) {
  if (batch.a.count >= n) return;
  let size = batch.a.count;
  while (size < n) size *= 2;
  const [a, b] = instanceAttributes(size);
  // What is already written this frame moves over (a batch can grow while it is being filled).
  (a.array as Float32Array).set((batch.a.array as Float32Array).subarray(0, batch.count * 4));
  (b.array as Float32Array).set((batch.b.array as Float32Array).subarray(0, batch.count * 2));
  batch.a = a;
  batch.b = b;
  batch.uploaded = -1;
  for (const part of batch.parts) {
    const old = part.geometry;
    part.geometry = instanced(old, a, b);
    part.geometry.boundingSphere = old.boundingSphere;
    part.mesh.geometry = part.geometry;
    // Frees the old instance buffers. The shared model attributes are uploaded again on the
    // next draw (growth is rare: the size doubles).
    old.dispose();
  }
}

function write(batch: Batch, t: ArrayLike<number>, k: number) {
  const n = batch.count++;
  const a = batch.a.array as Float32Array,
    b = batch.b.array as Float32Array;
  a[n * 4] = t[k]!;
  a[n * 4 + 1] = t[k + 1]!;
  a[n * 4 + 2] = t[k + 2]!;
  a[n * 4 + 3] = t[k + 3]!;
  b[n * 2] = t[k + 4]!;
  b[n * 2 + 1] = 0.86 + 0.24 * ((t[k + 4]! * 7.31) % 1);
}

/** Draw what was written. `hash` names the instances in order: the same again is not uploaded. */
function commit(batch: Batch, hash = NaN) {
  for (const part of batch.parts) part.geometry.instanceCount = batch.count;
  if (hash === batch.hash && batch.count === batch.uploaded) return;
  batch.hash = hash;
  batch.uploaded = batch.count;
  for (const attr of [batch.a, batch.b]) {
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, batch.count * attr.itemSize);
    attr.needsUpdate = true;
  }
}

/** A glTF mesh as plain float geometry in model space (dequantised, node matrix applied). */
function modelGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const attr = src.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!attr) continue;
    const out = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++)
      for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c);
    g.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize));
  }
  if (src.index) g.setIndex(Array.from(src.index.array as ArrayLike<number>));
  g.applyMatrix4(mesh.matrixWorld);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  return g;
}

/** Two crossed vertical quads, base at y = 0, normals up (lit like a canopy from the sky). */
function crossedQuads(width: number, height: number) {
  const parts = [0, Math.PI / 2].map((angle) => {
    const g = new THREE.PlaneGeometry(width, height);
    g.translate(0, height / 2, 0);
    g.rotateY(angle);
    const n = g.getAttribute("normal");
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

/**
 * Leaf colour per species, on near models and impostors alike so the LOD switch keeps the
 * colour (owner's H1Z1 reference, 2026-11-05). The pine's needle texture is a dark brownish
 * olive, so forests read as brown-black blots from the air: its colour is pulled `k` of the way
 * to `hue` at the same luminance (linear RGB / luminance), then brightened by `lift`. The oak's
 * yellow cast is cooled a little; the birch is left as it is.
 */
export const LEAF_COLOUR: Record<
  (typeof SPECIES)[number],
  { hue: [number, number, number]; k: number; lift: number }
> = {
  pine: { hue: [0.72, 1.3, 0.45], k: 0.8, lift: 1.0 },
  broadleaf: { hue: [0.8, 1.22, 0.5], k: 0.45, lift: 1.05 },
  birch: { hue: [1, 1, 1], k: 0, lift: 1 },
};

export function createVegetation(
  world: VegetationWorld,
  assets: TreeAssets | null = null,
): VegetationControls {
  const root = new THREE.Group();
  root.name = "br-vegetation";
  // Where the camera is this frame: every form fades by its trees' distance from here.
  const cameraUniform = { value: new THREE.Vector3(Infinity, 0, Infinity) };
  const owned: THREE.Material[] = [];
  const ownedGeometry: THREE.BufferGeometry[] = [];
  const { detailDistance, nearDistance } = VEGETATION_VIEW;
  const FADES: Record<"detail" | "light" | "far", TreeFade> = {
    detail: { in: null, out: [fadeMiddle(detailDistance), fadeEnd(detailDistance)] },
    light: {
      in: [detailDistance, fadeMiddle(detailDistance)],
      out: [fadeMiddle(nearDistance), fadeEnd(nearDistance)],
    },
    far: { in: [nearDistance, fadeMiddle(nearDistance)], out: null },
  };
  /** Per species: the middle of a full-size tree above its foot and how far it reaches (m). */
  const reach: Array<[number, number]> = SPECIES.map(() => [9, 12]);

  // Model batches: per form and species, a mesh per material of the model (or the procedural
  // shape). The light form wears the detail form's materials: the same textures, so nothing
  // about the leaves or the bark changes with the form, and no second set is kept in memory.
  const models = (form: "detail" | "light"): Batch[] =>
    SPECIES.map((species, s) => {
      if (!assets) {
        const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
        instanceShader(material, `${form}-procedural`, FADES[form], cameraUniform);
        owned.push(material);
        const base = placeholderTree(species, 0);
        ownedGeometry.push(base);
        return makeBatch(root, [{ base, material }], `br-trees-${species}-${form}`);
      }
      const full = assets.models[s]!.scene,
        light = assets.light?.[s]?.scene;
      full.updateMatrixWorld(true);
      light?.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(full);
      const modelHeight = box.max.y;
      reach[s] = [
        (box.max.y + box.min.y) / 2,
        Math.hypot(
          (box.max.y - box.min.y) / 2,
          Math.max(box.max.x, -box.min.x, box.max.z, -box.min.z),
        ),
      ];
      const meshes = (scene: THREE.Object3D) => {
        const out: THREE.Mesh[] = [];
        scene.traverse((o) => void ((o as THREE.Mesh).isMesh && out.push(o as THREE.Mesh)));
        return out;
      };
      const fullMeshes = meshes(full);
      // The simplified meshes, when they are the same meshes (name for name).
      const lightMeshes = light ? meshes(light) : [];
      const simplified =
        form === "light" &&
        lightMeshes.length === fullMeshes.length &&
        lightMeshes.every((m, i) => m.name === fullMeshes[i]!.name);
      const parts = fullMeshes.map((mesh, i) => {
        const material = (mesh.material as THREE.MeshStandardMaterial).clone();
        prepareFoliageMaterial(material);
        const foliage = !!material.userData["brFoliage"];
        const mapSize = (material.map?.image as { width?: number } | undefined)?.width ?? 1024;
        instanceShader(material, `${form}-${species}-${i}`, FADES[form], cameraUniform, {
          // The leaf cards keep their coverage as their mips shrink, as the impostors do:
          // without it a tree thinned to bare twigs a few dozen metres out and filled in again
          // as the impostor (owner, 2026-11-13: trees change look with distance).
          alphaMipScale: foliage ? 0.35 : 0,
          alphaTexSize: mapSize,
          leaf: foliage ? LEAF_COLOUR[species] : null,
          crown: foliage ? { height: modelHeight, strength: 0.38 } : null,
        });
        owned.push(material);
        const base = modelGeometry(simplified ? lightMeshes[i]! : mesh);
        // The pine's needle cards and the birch's bark are stored twice (z-fight flicker).
        dropDuplicateFaces(base, material);
        ownedGeometry.push(base);
        return { base, material };
      });
      return makeBatch(root, parts, `br-trees-${species}-${form}`);
    });
  const detail = models("detail"),
    light = models("light");
  // The simplified models' own textures are never drawn (the full models' are worn instead).
  for (const gltf of assets?.light ?? [])
    gltf.scene.traverse((o) => {
      const material = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!material) return;
      for (const v of Object.values(material)) if (v instanceof THREE.Texture) v.dispose();
      material.dispose();
    });

  // Far batches: one per species.
  const far: Batch[] = SPECIES.map((species, s) => {
    let base: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;
    if (assets) {
      const imp = assets.impostors[s]!;
      base = crossedQuads(imp.width, imp.height);
      material = new THREE.MeshStandardMaterial({
        map: imp.texture,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.95,
      });
      // The side view is lit softly in the bake and again here with an up-facing normal:
      // lift it to match the real models' brightness.
      material.color.setScalar(1.45);
    } else {
      base = placeholderTree(species, 1);
      material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    }
    instanceShader(
      material,
      `far-${species}-${assets ? "impostor" : "procedural"}`,
      FADES.far,
      cameraUniform,
      assets
        ? {
            alphaMipScale: 0.35,
            upNormal: true,
            leaf: LEAF_COLOUR[species],
            // The bake already carries some of the crown's shading: half as strong.
            crown: { height: assets.impostors[s]!.height, strength: 0.2 },
          }
        : {},
    );
    owned.push(material);
    ownedGeometry.push(base);
    return makeBatch(root, [{ base, material }], `br-trees-${species}-far`);
  });

  const cellBounds = new Map<number, [number, number]>();
  const boundsOf = (ci: number, cj: number) => {
    const key = cj * CELLS + ci;
    let b = cellBounds.get(key);
    if (!b) {
      const t = cellTrees(world, ci, cj);
      let lo = Infinity,
        hi = -Infinity;
      for (let k = 1; k < t.length; k += TREE_STRIDE) {
        lo = Math.min(lo, t[k]!);
        hi = Math.max(hi, t[k]!);
      }
      b = t.length ? [lo - 1, hi + 30] : [0, 0];
      cellBounds.set(key, b);
    }
    return b;
  };

  const frustum = new THREE.Frustum(),
    wide = new THREE.Frustum(),
    wideProjection = new THREE.Matrix4(),
    viewProjection = new THREE.Matrix4(),
    box = new THREE.Box3(),
    cam = new THREE.Vector3();
  /** The cells the far batches hold; `stale`: build them again whatever the view. */
  const built = new Set<number>();
  let stale = true;
  let rebuilds = 0;
  const visible: Array<[number, number]> = [];

  // The trees that can be a model before the camera has moved nearRebuild metres: those within
  // the light form's reach of where they were gathered, plus that move.
  let gatherX = Infinity,
    gatherZ = Infinity,
    gathered = 0,
    generation = 0;
  let near = new Float32Array(TREE_STRIDE * 1024);
  const gather = () => {
    gatherX = cam.x;
    gatherZ = cam.z;
    generation++;
    gathered = 0;
    const r = fadeEnd(nearDistance) + VEGETATION_VIEW.nearRebuild + 1;
    for (let cj = cellOf(cam.z - r); cj <= cellOf(cam.z + r); cj++)
      for (let ci = cellOf(cam.x - r); ci <= cellOf(cam.x + r); ci++) {
        const t = cellTrees(world, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE) {
          if (Math.hypot(t[k]! - cam.x, t[k + 2]! - cam.z) >= r) continue;
          if ((gathered + 1) * TREE_STRIDE > near.length) {
            const grown = new Float32Array(near.length * 2);
            grown.set(near);
            near = grown;
          }
          for (let c = 0; c < TREE_STRIDE; c++) near[gathered * TREE_STRIDE + c] = t[k + c]!;
          gathered++;
        }
      }
  };
  const sphere = new THREE.Sphere();
  let inView = 0,
    inDetail = 0;
  /** This frame's models: each gathered tree in view, in the form (or two) its distance asks. */
  const selectModels = () => {
    const detailEnd = fadeEnd(detailDistance),
      lightEnd = fadeEnd(nearDistance);
    for (const batch of detail) batch.count = 0;
    for (const batch of light) batch.count = 0;
    const hashes = SPECIES.map(() => [generation, generation]);
    inView = inDetail = 0;
    for (let i = 0; i < gathered; i++) {
      const k = i * TREE_STRIDE;
      const d = Math.hypot(near[k]! - cam.x, near[k + 1]! - cam.y, near[k + 2]! - cam.z);
      if (d >= lightEnd) continue;
      const s = near[k + 5]!,
        scale = near[k + 3]!;
      sphere.center.set(near[k]!, near[k + 1]! + reach[s]![0] * scale, near[k + 2]!);
      sphere.radius = reach[s]![1] * scale;
      if (!frustum.intersectsSphere(sphere)) continue;
      inView++;
      if (d < detailEnd) {
        inDetail++;
        ensure(detail[s]!, detail[s]!.count + 1);
        write(detail[s]!, near, k);
        hashes[s]![0] = (Math.imul(hashes[s]![0]!, 31) + i) | 0;
      }
      if (d > detailDistance) {
        ensure(light[s]!, light[s]!.count + 1);
        write(light[s]!, near, k);
        hashes[s]![1] = (Math.imul(hashes[s]![1]!, 31) + i) | 0;
      }
    }
    detail.forEach((batch, s) => commit(batch, hashes[s]![0]));
    light.forEach((batch, s) => commit(batch, hashes[s]![1]));
  };

  let treeView: number = VEGETATION_VIEW.viewDistance;
  return {
    root,
    setViewDistance(m) {
      treeView = Math.max(VEGETATION_VIEW.viewDistance, Math.min(4000, m));
      stale = true;
      // Every cell the view can reach stays generated: with fewer kept than a long view
      // holds, walking made the same cells over and over (30 to 40 ms frames at the longest).
      world.cacheCells = Math.max(
        400,
        Math.ceil(((2 * (treeView + VEGETATION_VIEW.farDeeper)) / CELL_SIZE + 3) ** 2 * 1.15),
      );
    },
    update(camera) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      wideProjection.copy(camera.projectionMatrix);
      wideProjection.elements[0]! *= VEGETATION_VIEW.farWiden;
      wideProjection.elements[5]! *= VEGETATION_VIEW.farWiden;
      wide.setFromProjectionMatrix(wideProjection.multiply(camera.matrixWorldInverse));
      cam.setFromMatrixPosition(camera.matrixWorld);
      cameraUniform.value.copy(cam);
      if (Math.hypot(cam.x - gatherX, cam.z - gatherZ) >= VEGETATION_VIEW.nearRebuild) gather();
      selectModels();
      const view = treeView,
        deep = view + VEGETATION_VIEW.farDeeper;
      const i0 = Math.max(0, Math.floor((cam.x - deep + WORLD_HALF) / CELL_SIZE)),
        i1 = Math.min(CELLS - 1, Math.floor((cam.x + deep + WORLD_HALF) / CELL_SIZE)),
        j0 = Math.max(0, Math.floor((cam.z - deep + WORLD_HALF) / CELL_SIZE)),
        j1 = Math.min(CELLS - 1, Math.floor((cam.z + deep + WORLD_HALF) / CELL_SIZE));
      visible.length = 0;
      let missing = stale;
      for (let cj = j0; cj <= j1; cj++)
        for (let ci = i0; ci <= i1; ci++) {
          const [lo, hi] = boundsOf(ci, cj);
          if (hi <= lo) continue;
          // The box holds the trunks; a crown reaches up to CROWN_REACH m past it. Without the
          // margin a tree by a cell's edge vanished at the side of the screen while its crown
          // was still in view, whenever the rest of its cell had left the frustum (owner,
          // 2026-11-10: "dragging around you see some trees and they vanish").
          box.min.set(
            ci * CELL_SIZE - WORLD_HALF - CROWN_REACH,
            lo,
            cj * CELL_SIZE - WORLD_HALF - CROWN_REACH,
          );
          box.max.set(
            (ci + 1) * CELL_SIZE - WORLD_HALF + CROWN_REACH,
            hi,
            (cj + 1) * CELL_SIZE - WORLD_HALF + CROWN_REACH,
          );
          const d = box.distanceToPoint(cam);
          if (d > deep || !wide.intersectsBox(box)) continue;
          visible.push([ci, cj]);
          // In the camera's own view and not in the batches: they are built again.
          if (!missing && d <= view && !built.has(cj * CELLS + ci) && frustum.intersectsBox(box))
            missing = true;
        }
      if (!missing) return;
      stale = false;
      built.clear();
      for (const [ci, cj] of visible) built.add(cj * CELLS + ci);
      rebuilds++;
      const counts = SPECIES.map(() => 0);
      for (const [ci, cj] of visible) {
        const t = cellTrees(world, ci, cj);
        for (let k = 5; k < t.length; k += TREE_STRIDE) counts[t[k]!]!++;
      }
      far.forEach((batch, s) => {
        ensure(batch, counts[s]!);
        batch.count = 0;
      });
      for (const [ci, cj] of visible) {
        const t = cellTrees(world, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE) write(far[t[k + 5]!]!, t, k);
      }
      for (const batch of far) commit(batch);
    },
    stats() {
      let trees = 0,
        triangles = 0,
        draws = 0;
      for (const batch of far) trees += batch.count;
      for (const batch of [...far, ...detail, ...light])
        for (const part of batch.parts) {
          triangles += batch.count * part.triangles;
          if (batch.count) draws++;
        }
      return {
        trees,
        near: inView,
        detail: inDetail,
        triangles,
        draws,
        rebuilds,
        farBySpecies: far.map((b) => b.count),
      };
    },
    dispose() {
      for (const batch of [...far, ...detail, ...light])
        for (const part of batch.parts) part.geometry.dispose();
      for (const g of ownedGeometry) g.dispose();
      for (const m of owned) {
        // The near trees' materials carry the models' leaf and bark textures: a material's
        // dispose does not dispose its maps (leak check, 2026-11-09).
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
      if (assets) for (const imp of assets.impostors) imp.texture.dispose();
    },
  };
}

/** Procedural placeholder trees (metres, base at y = 0), vertex-coloured, one geometry each. */
function placeholderTree(species: (typeof SPECIES)[number], ring: number): THREE.BufferGeometry {
  const bark = new THREE.Color(0x4a3a2a),
    birchBark = new THREE.Color(0xd8d4c8);
  const needles = new THREE.Color(0x2c4a26),
    leaves = new THREE.Color(0x4b6a2a),
    birchLeaves = new THREE.Color(0x7a9a3c);
  const paint = (g: THREE.BufferGeometry, c: THREE.Color) => {
    const g2 = g.index ? g.toNonIndexed() : g;
    g2.deleteAttribute("uv");
    const n = g2.getAttribute("position").count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
    g2.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g2;
  };
  const at = (g: THREE.BufferGeometry, y: number, sy = 1) => g.scale(1, sy, 1).translate(0, y, 0);
  const parts: THREE.BufferGeometry[] = [];
  if (species === "pine") {
    if (ring === 0) {
      parts.push(paint(at(new THREE.CylinderGeometry(0.22, 0.34, 6, 6, 1, true), 3), bark));
      parts.push(paint(at(new THREE.ConeGeometry(3.4, 7, 8, 1, true), 6.5), needles));
      parts.push(paint(at(new THREE.ConeGeometry(2.7, 6, 8, 1, true), 10.5), needles));
      parts.push(paint(at(new THREE.ConeGeometry(1.8, 5, 7, 1, true), 14.5), needles));
    } else parts.push(paint(at(new THREE.ConeGeometry(3.2, 15, 5, 1, true), 9.5), needles));
  } else if (species === "broadleaf") {
    if (ring === 0) {
      parts.push(paint(at(new THREE.CylinderGeometry(0.3, 0.48, 6, 6, 1, true), 3), bark));
      parts.push(paint(at(new THREE.IcosahedronGeometry(4.2, 1), 9.5, 0.8), leaves));
    } else parts.push(paint(at(new THREE.IcosahedronGeometry(4.2, 0), 9, 0.85), leaves));
  } else {
    if (ring === 0) {
      parts.push(paint(at(new THREE.CylinderGeometry(0.16, 0.24, 9, 5, 1, true), 4.5), birchBark));
      parts.push(paint(at(new THREE.IcosahedronGeometry(2.6, 1), 11, 1.35), birchLeaves));
    } else parts.push(paint(at(new THREE.IcosahedronGeometry(2.6, 0), 10.5, 1.4), birchLeaves));
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", merged.getAttribute("position"));
  indexed.setAttribute("normal", merged.getAttribute("normal"));
  indexed.setAttribute("color", merged.getAttribute("color"));
  indexed.setIndex([...Array(merged.getAttribute("position").count).keys()]);
  merged.dispose();
  return indexed;
}
