import type * as THREE from "three";

/**
 * One decoded picture for every copy of the same image in the island's model files (cleanup
 * 2026-11-23).
 *
 * A model file carries its own textures, and the buildings made from a kit (the Old Fortress,
 * Forgotten Ruins, East Works, the military base, the coast towns, Blackwater) each carry
 * their own copy of the kit's walls, roofs and floors: the fortress's stone is in 18 files,
 * a works wall in 50. Of the 1,959 textures in the 2,735 files a match loads, 663 are a
 * byte-for-byte copy of one already loaded. Each was decoded into a bitmap of its own (kept
 * for the whole match: a lost graphics context is restored from them) and, once drawn, put on
 * the GPU as a texture of its own: about 260 MB of bitmaps and up to 350 MB of video memory
 * for pictures the game already had, most of it in exactly the places built last.
 *
 * Here every texture whose image bytes match an earlier one takes that one's `source`. three
 * keeps one GPU texture per source and sampling state, so the copies' textures become one
 * upload, and the copy's own bitmap is closed. The textures themselves stay separate objects:
 * each material keeps its own wrap, filter, transform and colour space, and disposing one
 * releases only its share. Nothing drawn changes: the pictures are identical.
 *
 * One share per island load (island-scene.ts): the kept sources go with the match.
 */

/** The parts of a parsed glTF this reads (GLTFLoader's parser). */
type ParsedGltf = {
  parser: {
    json: {
      textures?: Array<{ source?: number; extensions?: Record<string, { source?: number }> }>;
      images?: Array<{ bufferView?: number }>;
    };
    /** GLTFLoader records every texture it creates here, clones included. */
    associations: Map<unknown, { textures?: number } | undefined>;
    getDependency(type: "bufferView", index: number): Promise<ArrayBuffer>;
  };
};

/** The parts of GLTFLoader's parser the decode-time sharing uses (one parser per file). */
export type ImageParser = {
  json: { images?: Array<{ bufferView?: number }> };
  sourceCache: Record<number, Promise<THREE.Texture> | undefined>;
  loadImageSource(sourceIndex: number, loader: unknown): Promise<THREE.Texture>;
  getDependency(type: "bufferView", index: number): Promise<ArrayBuffer>;
};

export type TextureShare = {
  /**
   * For GLTFLoader.register: an image whose bytes an earlier file already brought is not
   * decoded again (final audit 2026-11-24, item 3). The file gets a copy of the texture
   * decoded first (three's clone: the same source), as GLTFLoader itself does for an image a
   * file uses twice; its sampler, name and colour space are set on the copy as on any other.
   * On any failure the file decodes its own image, as before.
   */
  plugin(parser: ImageParser): { name: string };
  /**
   * Point every texture of a freshly parsed model whose image was loaded before at that
   * image; register the rest. Call before anything of the model is drawn (and after its
   * textures were resized for the tier). Never throws: on any failure the model keeps its
   * own textures, as before.
   */
  share(gltf: ParsedGltf): Promise<void>;
  /**
   * Distinct images kept, textures that took an earlier image instead of their own after
   * decoding it, and images not decoded at all because an earlier file had decoded them.
   */
  stats(): { images: number; shared: number; skipped: number };
  /** Forget the kept images (the island is going). */
  clear(): void;
};

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export function createTextureShare(): TextureShare {
  /** Image bytes' digest → the source every texture of that image uses. */
  const sources = new Map<string, THREE.Texture["source"]>();
  const kept = new Set<THREE.Texture["source"]>();
  let shared = 0;
  const subtle = typeof crypto === "undefined" ? undefined : crypto.subtle;

  /** A key for an image's bytes: equal keys are the same file, bit for bit. */
  async function keyOf(bytes: ArrayBuffer) {
    const digest = new Uint8Array(await subtle!.digest("SHA-1", bytes));
    let key = `${bytes.byteLength}:`;
    for (const b of digest) key += HEX[b];
    return key;
  }

  /** Image bytes' digest → the texture decoded for it first (its source is the one kept). */
  const decoded = new Map<string, Promise<THREE.Texture>>();
  let skipped = 0;

  return {
    plugin(parser) {
      const own = parser.loadImageSource.bind(parser);
      parser.loadImageSource = (sourceIndex, loader) => {
        const view = parser.json.images?.[sourceIndex]?.bufferView;
        // (An image the file already asked for: GLTFLoader's own cache makes the copy.)
        if (!subtle || view === undefined || parser.sourceCache[sourceIndex] !== undefined)
          return own(sourceIndex, loader);
        // Decoding it here after all: GLTFLoader's own path, past the cache entry set below
        // (which stays this file's: it settles with what that path returns).
        const decodeOwn = () => {
          delete parser.sourceCache[sourceIndex];
          const mine = own(sourceIndex, loader);
          parser.sourceCache[sourceIndex] = texture;
          return mine;
        };
        const texture: Promise<THREE.Texture> = parser
          .getDependency("bufferView", view)
          .then(keyOf)
          .then((key) => {
            const first = decoded.get(key);
            if (first)
              return first.then(
                (t) => {
                  skipped++;
                  return t.clone();
                },
                // (The first decode failed: this file tries its own.)
                decodeOwn,
              );
            // Decoded here first: kept for the files after (the file's cache entry is the one
            // GLTFLoader set, so its own reuse clones it as usual).
            const mine = decodeOwn();
            decoded.set(key, mine);
            mine.catch(() => {
              if (decoded.get(key) === mine) decoded.delete(key);
            });
            return mine;
          }, decodeOwn);
        // The file's later uses of this image clone what it got here.
        parser.sourceCache[sourceIndex] ??= texture;
        return texture;
      };
      return { name: "br-shared-images" };
    },
    async share(gltf) {
      // (No SubtleCrypto: a page not served over https. The models keep their own textures.)
      if (!subtle) return;
      try {
        const { json, associations } = gltf.parser;
        // Each texture with the image it shows (its index in the file).
        const textures: Array<[THREE.Texture, number]> = [];
        for (const [object, reference] of associations) {
          const texture = object as THREE.Texture;
          if (!texture?.isTexture || reference?.textures === undefined) continue;
          const def = json.textures?.[reference.textures];
          if (!def) continue;
          // (A WebP or other extension's picture stands in for the plain `source`.)
          let image = def.source;
          for (const extension of Object.values(def.extensions ?? {}))
            if (typeof extension?.source === "number") image = extension.source;
          if (image !== undefined && json.images?.[image]?.bufferView !== undefined)
            textures.push([texture, image]);
        }
        if (!textures.length) return;
        const keys = new Map<number, Promise<string>>();
        for (const [, image] of textures)
          if (!keys.has(image))
            keys.set(
              image,
              gltf.parser.getDependency("bufferView", json.images![image]!.bufferView!).then(keyOf),
            );
        const resolved = new Map<number, string>();
        for (const [image, key] of keys) resolved.set(image, await key);
        // From here on nothing waits: two files finishing together cannot both keep a copy.
        const dropped = new Set<THREE.Texture["source"]>();
        for (const [texture, image] of textures) {
          const key = resolved.get(image)!;
          const first = sources.get(key);
          if (!first) {
            sources.set(key, texture.source);
            kept.add(texture.source);
          } else if (first !== texture.source) {
            dropped.add(texture.source);
            texture.source = first;
            shared++;
          }
        }
        // Every texture of the file that showed a dropped picture now shows the kept one
        // (GLTFLoader's clones are in `associations` too): its bitmap can go at once.
        for (const source of dropped)
          if (!kept.has(source)) (source.data as { close?: () => void } | null)?.close?.();
      } catch {
        // The model draws with the textures it was parsed with.
      }
    },
    stats: () => ({ images: sources.size, shared, skipped }),
    clear() {
      sources.clear();
      kept.clear();
      decoded.clear();
    },
  };
}
