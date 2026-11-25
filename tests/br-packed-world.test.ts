import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "../src/lib/fps/br/heightfield";
import { drawnGround } from "../src/lib/fps/br/paved";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
import { CollisionCoordinates } from "../src/lib/fps/br/collision-coordinates";
import { packCollisionModels } from "../workers/fps/br";

describe("BR server packed world", () => {
  it("preserves float bits across narrow, wide, raw and partial pages", () => {
    const raw = Float32Array.from({ length: 3 * 4096 + 19 }, (_, i) =>
      i < 4096 ? (i % 3 === 0 ? -0 : i % 2) : i < 8192 ? i % 601 : i / 7,
    );
    const packed = new CollisionCoordinates(raw.length);
    for (const coordinate of raw) packed.append(coordinate);
    expect(packed.byteLength).toBeLessThan(raw.byteLength);
    expect(Array.from(raw, (_, i) => packed.get(i))).toEqual(Array.from(raw));
  });
  it("preserves terrain samples, slopes and road support exactly", async () => {
    const file = readFileSync("public" + WORLD_ASSETS.height);
    const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const normal = await decodeHeightfield(bytes);
    const compact = await decodeHeightfield(bytes, true);
    for (let j = 0; j < normal.height; j += 17)
      for (let i = 0; i < normal.width; i += 19)
        expect(compact.sample(i, j)).toBe(normal.sample(i, j));
    const a = drawnGround(normal),
      b = drawnGround(compact);
    for (let i = 0; i < 100; i++) {
      const x = -4900 + i * 97.31,
        z = 4800 - i * 93.13;
      expect(compact.heightAt(x, z)).toBe(normal.heightAt(x, z));
      expect(compact.meshAt(x, z)).toEqual(normal.meshAt(x, z));
      expect(b(x, z)).toBe(a(x, z));
    }
  });
  it("preserves collision rows and array operations without retaining row arrays", () => {
    const rows = [
      [-1.125, 0, 2.42, 3, 4.1, 5],
      [6, 7, 8, 9, 10, 11],
    ];
    const collision = { voxel: 0.1, models: { a: rows, empty: [] } };
    packCollisionModels(collision);
    expect([...collision.models.a]).toEqual(rows);
    expect(collision.models.a.map((row) => row[0])).toEqual([-1.125, 6]);
    expect(collision.models.a.reduce((sum, row) => sum + row[1]!, 0)).toBe(7);
    expect(collision.models.a[2]).toBeUndefined();
    expect(collision.models.empty.length).toBe(0);
  });
});
