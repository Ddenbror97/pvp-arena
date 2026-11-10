import type * as THREE from "three";
import type { BrTier } from "./quality-tier";

/**
 * Anisotropic filtering for the island's textures (owner, 2026-11-08: the map looked blurry from
 * the plane). Seen at a slant — the ground and the buildings from the air — plain mipmapping
 * smears a texture to its coarse levels; anisotropic filtering keeps it sharp along the slant
 * for a few extra texture taps, which desktop and laptop GPUs do in hardware at little cost.
 * The renderer sets the GPU's limit (capped at 16) before the island loads.
 *
 * Low tier (quality-tier.ts): 4× anisotropy, and world textures uploaded at half size — the
 * models' textures alone are about 490 MB at full size, more than an old laptop's shared
 * graphics memory holds without swapping.
 */
let max = 8;
let scale = 1;

export function setTextureQuality(renderer: THREE.WebGLRenderer, tier: BrTier = "standard") {
  const limit = tier === "low" ? 4 : 16;
  max = Math.max(1, Math.min(limit, renderer.capabilities.getMaxAnisotropy()));
  scale = tier === "low" ? 0.5 : 1;
}

/** The anisotropy for world textures (ground, aerial surface, buildings and props). */
export const worldAnisotropy = () => max;

/** Linear size factor for world textures: 1, or 0.5 on the low tier. */
export const worldTextureScale = () => scale;

/** Textures never shrink below this (px): small ones cost little and blur badly. */
const MIN_SIZE = 256;

/** The size a `width` × `height` world texture uploads at on this tier. */
export function worldTextureSize(width: number, height: number): [number, number] {
  if (scale >= 1 || Math.max(width, height) <= MIN_SIZE) return [width, height];
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

type Sized = { width: number; height: number; close?: () => void };

/**
 * A bitmap at the tier's size (the same object at full size). The source is closed when a
 * smaller copy replaces it. Falls back to the source where createImageBitmap cannot resize.
 */
export async function worldBitmap<T extends Sized>(image: T): Promise<T | ImageBitmap> {
  const [w, h] = worldTextureSize(image.width, image.height);
  if (w === image.width && h === image.height) return image;
  if (typeof createImageBitmap === "undefined") return image;
  try {
    const small = await createImageBitmap(image as unknown as ImageBitmapSource, {
      resizeWidth: w,
      resizeHeight: h,
      // An exact 2:1 reduction: bilinear is then a 2 × 2 box filter, and several times faster
      // than "high" (500 textures: 26 s of loading on an RTX laptop with "high").
      resizeQuality: "low",
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
    image.close?.();
    return small;
  } catch {
    return image;
  }
}

const materialsOf = (root: THREE.Object3D) => {
  const out = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) out.add(m);
  });
  return out;
};
const texturesOf = (root: THREE.Object3D) => {
  const out = new Set<THREE.Texture>();
  for (const m of materialsOf(root))
    for (const v of Object.values(m))
      if (v && (v as THREE.Texture).isTexture) out.add(v as THREE.Texture);
  return out;
};

/** Raise every texture on a loaded model's materials to the world anisotropy. */
export function sharpenMaterials(root: THREE.Object3D) {
  for (const t of texturesOf(root)) t.anisotropy = max;
}

/**
 * Low tier: replace a freshly parsed model's textures by half-size copies, before anything is
 * uploaded. A no-op at full size.
 */
export async function shrinkModelTextures(root: THREE.Object3D) {
  if (scale >= 1) return;
  await Promise.all(
    [...texturesOf(root)].map(async (t) => {
      const image = t.image as Sized | undefined;
      if (!image || !image.width || !image.height) return;
      // Compressed and data textures have no bitmap to resize.
      if (
        (t as THREE.DataTexture).isDataTexture ||
        (t as THREE.CompressedTexture).isCompressedTexture
      )
        return;
      const small = await worldBitmap(image);
      if (small !== image) {
        t.image = small;
        t.needsUpdate = true;
      }
    }),
  );
}

/**
 * Low tier: a TextureLoader texture (an <img>, flipped on upload) at half size, through a
 * canvas so its orientation handling is unchanged. A no-op at full size.
 */
export function shrinkImageTexture<T extends THREE.Texture>(texture: T): T {
  const image = texture.image as (CanvasImageSource & Sized) | undefined;
  if (!image || typeof document === "undefined") return texture;
  const [w, h] = worldTextureSize(image.width, image.height);
  if (w === image.width && h === image.height) return texture;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) return texture;
  g.imageSmoothingQuality = "high";
  g.drawImage(image, 0, 0, w, h);
  texture.image = canvas;
  texture.needsUpdate = true;
  return texture;
}
