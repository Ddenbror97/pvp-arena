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
    expect(share.stats()).toEqual({ images: 3, shared: 1, skipped: 0 });
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
    expect(share.stats()).toEqual({ images: 0, shared: 0, skipped: 0 });
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
    expect(share.stats()).toEqual({ images: 1, shared: 5, skipped: 0 });
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

/**
 * Final performance audit 2026-11-24, item 3: an image an earlier file brought is not decoded
 * at all (the plugin), rather than decoded and then dropped (share). A stand-in parser with
 * GLTFLoader's own caching: the first request for an image decodes it, later ones clone it.
 */
function parser(images: Array<ArrayBuffer | null>) {
  const decodes: number[] = [];
  const p = {
    json: { images: images.map((b, i) => (b ? { bufferView: i } : { uri: `x${i}.png` })) },
    sourceCache: {} as Record<number, Promise<THREE.Texture> | undefined>,
    getDependency: async (_type: "bufferView", index: number) => images[index]!,
    loadImageSource(index: number, _loader: unknown): Promise<THREE.Texture> {
      if (this.sourceCache[index] !== undefined)
        return this.sourceCache[index]!.then((t) => t.clone());
      const promise = Promise.resolve().then(() => {
        decodes.push(index);
        return new THREE.Texture(bitmap() as unknown as HTMLImageElement);
      });
      this.sourceCache[index] = promise;
      return promise;
    },
  };
  return { p, decodes };
}

describe("an image another file already brought is not decoded again", () => {
  it("decodes the first copy only; the later file's texture shares its picture", async () => {
    const share = createTextureShare();
    const a = parser([bytes(1, 2, 3), bytes(4)]);
    const b = parser([bytes(9), bytes(1, 2, 3)]);
    share.plugin(a.p);
    share.plugin(b.p);
    const a0 = await a.p.loadImageSource(0, null);
    const b1 = await b.p.loadImageSource(1, null);
    const b0 = await b.p.loadImageSource(0, null);
    expect(a.decodes).toEqual([0]);
    expect(b.decodes).toEqual([0]);
    expect(b1.source).toBe(a0.source);
    expect(b1).not.toBe(a0);
    expect(b0.source).not.toBe(a0.source);
    expect(share.stats().skipped).toBe(1);
  });

  it("a file's second use of an image clones what it got, as GLTFLoader does", async () => {
    const share = createTextureShare();
    const a = parser([bytes(5, 5)]);
    share.plugin(a.p);
    const [x, y] = await Promise.all([a.p.loadImageSource(0, null), a.p.loadImageSource(0, null)]);
    expect(a.decodes).toEqual([0]);
    expect(x.source).toBe(y.source);
    expect(x).not.toBe(y);
  });

  it("files asking at the same time still decode the image once", async () => {
    const share = createTextureShare();
    const files = Array.from({ length: 5 }, () => parser([bytes(7, 7, 7)]));
    for (const f of files) share.plugin(f.p);
    const got = await Promise.all(files.map((f) => f.p.loadImageSource(0, null)));
    expect(files.flatMap((f) => f.decodes)).toEqual([0]);
    expect(new Set(got.map((t) => t.source)).size).toBe(1);
  });

  it("an image from a URL, a file it cannot read, or a failed first decode: decoded as before", async () => {
    const share = createTextureShare();
    const url = parser([null]);
    share.plugin(url.p);
    await url.p.loadImageSource(0, null);
    expect(url.decodes).toEqual([0]);
    const unreadable = parser([bytes(1)]);
    unreadable.p.getDependency = async () => {
      throw new Error("no such buffer view");
    };
    share.plugin(unreadable.p);
    await unreadable.p.loadImageSource(0, null);
    expect(unreadable.decodes).toEqual([0]);
    // The first file's decode fails: the next file with that image decodes its own.
    const broken = parser([bytes(2, 2)]);
    const real = broken.p.loadImageSource.bind(broken.p);
    broken.p.loadImageSource = (i, l) => {
      void real(i, l);
      broken.p.sourceCache[i] = Promise.reject(new Error("decode failed"));
      return broken.p.sourceCache[i]!;
    };
    share.plugin(broken.p);
    await expect(broken.p.loadImageSource(0, null)).rejects.toThrow("decode failed");
    const next = parser([bytes(2, 2)]);
    share.plugin(next.p);
    const t = await next.p.loadImageSource(0, null);
    expect(next.decodes).toEqual([0]);
    expect(t.image).toBeTruthy();
  });

  it("after the island goes, nothing is shared from it", async () => {
    const share = createTextureShare();
    const a = parser([bytes(3)]);
    share.plugin(a.p);
    const t = await a.p.loadImageSource(0, null);
    share.clear();
    const b = parser([bytes(3)]);
    share.plugin(b.p);
    expect((await b.p.loadImageSource(0, null)).source).not.toBe(t.source);
    expect(b.decodes).toEqual([0]);
  });
});

describe("the low tier's half-size pictures, shared between files", () => {
  it("halves a shared picture once, however many files' textures show it", async () => {
    const { setTextureQuality, shrinkModelTextures } = await import("@/lib/fps/br/texture-quality");
    const made: Array<{ width: number; height: number }> = [];
    const g = globalThis as { createImageBitmap?: unknown };
    const before = g.createImageBitmap;
    g.createImageBitmap = async (
      _img: unknown,
      o: { resizeWidth: number; resizeHeight: number },
    ) => {
      const b = { width: o.resizeWidth, height: o.resizeHeight, close() {} };
      made.push(b);
      return b;
    };
    try {
      setTextureQuality(
        { capabilities: { getMaxAnisotropy: () => 16 } } as unknown as THREE.WebGLRenderer,
        "low",
      );
      const big = { width: 1024, height: 512, close() {} };
      const first = new THREE.Texture(big as unknown as HTMLImageElement);
      const copy = first.clone();
      const root = (t: THREE.Texture) =>
        new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: t }));
      // Two files resized at the same time, then a third later: one half-size copy, never a quarter.
      await Promise.all([shrinkModelTextures(root(first)), shrinkModelTextures(root(copy))]);
      await shrinkModelTextures(root(first.clone()));
      expect(made).toHaveLength(1);
      expect(first.image).toBe(made[0]);
      expect(copy.image).toBe(made[0]);
      expect([made[0]!.width, made[0]!.height]).toEqual([512, 256]);
    } finally {
      g.createImageBitmap = before;
      setTextureQuality(
        { capabilities: { getMaxAnisotropy: () => 16 } } as unknown as THREE.WebGLRenderer,
        "standard",
      );
    }
  });
});
