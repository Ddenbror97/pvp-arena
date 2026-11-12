import { Heightfield } from "./heightfield";
import { LandCoverMap } from "./landcover";
import { terrainRasteriser } from "./tactical-map-terrain";

/**
 * The tactical map's terrain, rasterised off the main thread (tactical-map-terrain.ts) and
 * handed back as an ImageBitmap (transferred, not copied).
 */
export type TerrainRequest = {
  size: number;
  hf: { width: number; height: number; spacing: number; data: Float32Array };
  cover: { width: number; height: number; data: Uint8Array };
  waterBodies: Array<{ level: number; bounds: [number, number, number, number] }>;
};
export type TerrainReply = { bitmap: ImageBitmap };

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<TerrainRequest>) => void) | null;
  postMessage(message: TerrainReply, transfer: Transferable[]): void;
};
scope.onmessage = async (e) => {
  const { size, hf, cover, waterBodies } = e.data;
  const rows = terrainRasteriser(
    {
      hf: new Heightfield(hf.width, hf.height, hf.spacing, hf.data),
      cover: new LandCoverMap(cover.width, cover.height, cover.data),
      waterBodies,
    },
    size,
  );
  const data = new Uint8ClampedArray(size * size * 4);
  rows(0, size, data);
  const bitmap = await createImageBitmap(new ImageData(data, size, size));
  scope.postMessage({ bitmap }, [bitmap]);
};
