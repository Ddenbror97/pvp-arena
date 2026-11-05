import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { MeshStandardMaterial, Texture } from "three";
import { expect, test } from "vitest";
import { prepareFoliageMaterial } from "../src/lib/fps/br/foliage-material";
import { GROUND_LAYERS, LAYER_TARGET, PALETTE_PULL } from "../src/lib/fps/br/ground-style";

test("aerial surface matches the published land cover, palette and credited source textures", async () => {
  const manifest = JSON.parse(readFileSync("public/fps/br/ground/surface-v1.json", "utf8"));
  const sha = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
  expect(manifest.palette).toBe(sha(JSON.stringify({ GROUND_LAYERS, LAYER_TARGET, PALETTE_PULL })));
  for (const [file, hash] of Object.entries(manifest.sources))
    expect(sha(readFileSync(file)), file).toBe(hash);
  const image = readFileSync("public/fps/br/ground/surface-v1.webp");
  expect(sha(image)).toBe(manifest.output);
  const info = await sharp(image).metadata();
  expect([info.width, info.height, manifest.worldSize, manifest.flipY]).toEqual([
    2048,
    2048,
    10000,
    false,
  ]);
  expect(image.length).toBeLessThan(2_000_000);
});

test("transparent leaf cards become matte cutouts; opaque bark stays unchanged", () => {
  const leaf = new MeshStandardMaterial({ map: new Texture(), transparent: true, roughness: 0 });
  prepareFoliageMaterial(leaf);
  expect(leaf.transparent).toBe(false);
  expect(leaf.depthWrite).toBe(true);
  expect(leaf.alphaTest).toBe(0.35);
  expect(leaf.alphaToCoverage).toBe(true);
  expect(leaf.roughness).toBe(0.85);
  const bark = new MeshStandardMaterial({ map: new Texture(), roughness: 0.9 });
  prepareFoliageMaterial(bark);
  expect(bark.roughness).toBe(0.9);
  expect(bark.alphaTest).toBe(0);
  expect(bark.userData["brFoliage"]).toBeUndefined();
  leaf.map!.dispose();
  leaf.dispose();
  bark.map!.dispose();
  bark.dispose();
});
