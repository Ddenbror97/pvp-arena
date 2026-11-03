import { WORLD_HALF, WORLD_SIZE, LAND_COVER, type LandCover } from "./world";

/**
 * Project Island land cover: one class per 7.8 m texel (water, sand, grass, field, forest,
 * rock, urban, road), shared by the terrain shading, vegetation placement (client) and tree
 * collision (server), so both sides place exactly the same trees.
 *
 * File format (art/br/build_world.py): 8-byte header — "PIC1", u16 width, u16 height — then
 * zlib-wrapped deflate of one class id per byte, row-major (z rows, x columns).
 */
export class LandCoverMap {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  constructor(width: number, height: number, data: Uint8Array) {
    if (data.length !== width * height) throw new Error("Land cover size mismatch");
    this.width = width;
    this.height = height;
    this.data = data;
  }

  /** Class id of the texel containing world x/z (clamped to the map). */
  classIdAt(x: number, z: number): number {
    const i = Math.min(
      this.width - 1,
      Math.max(0, Math.floor(((x + WORLD_HALF) / WORLD_SIZE) * this.width)),
    );
    const j = Math.min(
      this.height - 1,
      Math.max(0, Math.floor(((z + WORLD_HALF) / WORLD_SIZE) * this.height)),
    );
    return this.data[j * this.width + i]!;
  }

  classAt(x: number, z: number): LandCover {
    return LAND_COVER[this.classIdAt(x, z)] ?? "grass";
  }
}

export async function decodeLandCover(buffer: ArrayBuffer): Promise<LandCoverMap> {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== "PIC1") throw new Error(`Unknown land cover format ${magic}`);
  const width = view.getUint16(4, true),
    height = view.getUint16(6, true);
  const inflated = await new Response(
    new Blob([buffer.slice(8)]).stream().pipeThrough(new DecompressionStream("deflate")),
  ).arrayBuffer();
  if (inflated.byteLength !== width * height) throw new Error("Land cover payload size");
  return new LandCoverMap(width, height, new Uint8Array(inflated));
}
