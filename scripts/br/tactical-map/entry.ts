/**
 * The tactical map's picture and the minimap's, built in a page from the world files
 * (tactical-map.ts), for review: window.out = { map, mini } data URLs.
 */
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import type { CollisionData } from "../../../src/lib/fps/br/static-world";
import { tacticalMapBuilder } from "../../../src/lib/fps/br/tactical-map";
import { WORLD_ASSETS, type WorldMeta } from "../../../src/lib/fps/br/world";
import type { ModelManifest } from "../../../src/lib/fps/br/props-renderer";

declare global {
  interface Window {
    out: Promise<{ map: string; mini: string; ms: number }>;
  }
}
const get = (p: string) => fetch(p);
window.out = (async () => {
  const [hfBuf, lcBuf, meta, collision, manifest] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
    get(WORLD_ASSETS.models).then((r) => r.json() as Promise<ModelManifest>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const island = buildIsland(hf, cover, meta, collision);
  const t = performance.now();
  const b = tacticalMapBuilder(
    {
      hf,
      cover: island.vegetation.cover,
      meta,
      layout: island.layout,
      manifest,
    },
    Number(new URLSearchParams(location.search).get("size") ?? 4096),
  );
  while (!b.step(64));
  return {
    map: b.canvas.toDataURL("image/jpeg", 0.9),
    mini: b.minimap()!.toDataURL("image/jpeg", 0.9),
    ms: performance.now() - t,
  };
})();
