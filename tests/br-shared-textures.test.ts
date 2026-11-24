import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createTextureShare } from "@/lib/fps/br/shared-textures";

/**
 * Cleanup 2026-11-23: the same picture in several model files is decoded and uploaded once
 * (shared-textures.ts). The kit buildings each carried their own copy of the kit's textures:
 * 663 of the 1,959 textures a match loads were copies.
 */
type Bitmap = { width: number; height: number; closed: boolean; close(): void };
const bitmap = (): Bitmap => ({
  width: 4,
  height: 4,
  closed: false,
  close() {
    this.closed = true;
  },
});
const bytes = (...values: number[]) => new Uint8Array(values).buffer;

/**
 * A parsed file as GLTFLoader leaves it: `images` are the bytes of its pictures, `textures`
 * name the picture each shows ([image] or, as EXT_texture_webp does, { webp: image }), and
 * `clones` are further textures of the same glTF texture (a second sampler or transform).
 */
function file(
  images: Array<ArrayBuffer | null>,
  textures: Array<number | { webp: number }>,
  clones: number[] = [],
) {
  const made = textures.map(() => new THREE.Texture(bitmap() as unknown as HTMLImageElement));
  const associations = new Map<unknown, { textures?: number } | undefined>();
  made.forEach((t, i) => associations.set(t, { textures: i }));
  const cloned = clones.map((i) => {
    const t = made[i]!.clone();
    associations.set(t, { textures: i });
    return t;
  });
  // (GLTFLoader also records meshes and materials there.)
  associations.set(new THREE.Object3D(), undefined);
  const gltf = {
    parser: {
      json: {
        textures: textures.map((t) =>
          typeof t === "number"
            ? { source: t }
            : { source: 99, extensions: { EXT_texture_webp: { source: t.webp } } },
        ),
        images: images.map((b, i) => (b ? { bufferView: i } : {})),
      },
      associations,
      getDependency: async (_type: "bufferView", index: number) => images[index]!,
    },
  };
  return { gltf, textures: made, clones: cloned };
}
const image = (t: THREE.Texture) => t.image as unknown as Bitmap;

describe("one picture for every copy of the same image in the model files", () => {
  it("gives a later file's copy the first file's picture, and closes the copy", async () => {
    const share = createTextureShare();
    const stone = [1, 2, 3, 4, 5];
    const a = file([bytes(...stone), bytes(9, 9)], [0, 1]);
    const b = file([bytes(7), bytes(...stone)], [0, 1]);
    const own = image(b.textures[1]!);
    await share.share(a.gltf);
    await share.share(b.gltf);
    expect(b.textures[1]!.source).toBe(a.textures[0]!.source);
    expect(own.closed).toBe(true);
    // The kept picture and the ones no other file has stay as they were.
    expect(image(a.textures[0]!).closed).toBe(false);
    expect(b.textures[0]!.source).not.toBe(a.textures[1]!.source);
    expect(image(b.textures[0]!).closed).toBe(false);
    expect(share.stats()).toEqual({ images: 3, shared: 1 });
  });

  it("keeps each texture its own object: sampling state and disposal stay per material", async () => {
    const share = createTextureShare();
    const a = file([bytes(1, 2, 3)], [0]);
    const b = file([bytes(1, 2, 3)], [0]);
    b.textures[0]!.wrapS = THREE.RepeatWrapping;
    b.textures[0]!.colorSpace = THREE.SRGBColorSpace;
    await share.share(a.gltf);
    await share.share(b.gltf);
    expect(b.textures[0]).not.toBe(a.textures[0]);
    expect(b.textures[0]!.source).toBe(a.textures[0]!.source);
    expect(b.textures[0]!.wrapS).toBe(THREE.RepeatWrapping);
    expect(a.textures[0]!.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(b.textures[0]!.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("moves a file's cloned textures along with the one they were cloned from", async () => {
    const share = createTextureShare();
    const a = file([bytes(5, 5, 5)], [0]);
    const b = file([bytes(5, 5, 5)], [0], [0, 0]);
    await share.share(a.gltf);
    await share.share(b.gltf);
    for (const t of [...b.textures, ...b.clones]) expect(t.source).toBe(a.textures[0]!.source);
    expect(share.stats().shared).toBe(3);
  });

  it("reads the picture a WebP texture names, and the same picture twice in one file", async () => {
    const share = createTextureShare();
    const a = file([bytes(1), bytes(2), bytes(2)], [{ webp: 1 }, { webp: 2 }]);
    await share.share(a.gltf);
    // Image 2 repeats image 1 within the file.
    expect(a.textures[1]!.source).toBe(a.textures[0]!.source);
    const b = file([bytes(2)], [0]);
    await share.share(b.gltf);
    expect(b.textures[0]!.source).toBe(a.textures[0]!.source);
  });

  it("does not take pictures of different bytes for one, whatever their length", async () => {
    const share = createTextureShare();
    const a = file([bytes(1, 2, 3)], [0]);
    const b = file([bytes(1, 2, 4)], [0]);
    await share.share(a.gltf);
    await share.share(b.gltf);
    expect(b.textures[0]!.source).not.toBe(a.textures[0]!.source);
    expect(image(b.textures[0]!).closed).toBe(false);
  });

  it("leaves a picture loaded from a URL, and a file it cannot read, as they were", async () => {
    const share = createTextureShare();
    const a = file([null], [0]);
    const before = a.textures[0]!.source;
    await share.share(a.gltf);
    expect(a.textures[0]!.source).toBe(before);
    expect(share.stats()).toEqual({ images: 0, shared: 0 });
    const b = file([bytes(1)], [0]);
    b.gltf.parser.getDependency = async () => {
      throw new Error("no such buffer view");
    };
    await expect(share.share(b.gltf)).resolves.toBeUndefined();
    expect(image(b.textures[0]!).closed).toBe(false);
  });

  it("two files finishing together still end with one picture between them", async () => {
    const share = createTextureShare();
    const files = Array.from({ length: 6 }, () => file([bytes(8, 8, 8, 8)], [0]));
    const own = files.map((f) => image(f.textures[0]!));
    await Promise.all(files.map((f) => share.share(f.gltf)));
    const sources = new Set(files.map((f) => f.textures[0]!.source));
    expect(sources.size).toBe(1);
    // Exactly the kept one's bitmap is open, and it is the one every texture shows.
    expect(own.filter((b) => !b.closed)).toHaveLength(1);
    expect(image(files[3]!.textures[0]!).closed).toBe(false);
    expect(share.stats()).toEqual({ images: 1, shared: 5 });
  });

  it("forgets the kept pictures when the island goes", async () => {
    const share = createTextureShare();
    const a = file([bytes(3)], [0]);
    await share.share(a.gltf);
    share.clear();
    const b = file([bytes(3)], [0]);
    await share.share(b.gltf);
    expect(b.textures[0]!.source).not.toBe(a.textures[0]!.source);
  });
});
