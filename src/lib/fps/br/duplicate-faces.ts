import * as THREE from "three";

/**
 * Many downloaded models ship each double-sided surface twice: the same triangle (same three
 * positions) once per side, often with opposite winding and normals. With a double-sided
 * material both copies are drawn at exactly the same depth, so which one wins each pixel
 * depends on rounding in the rasteriser: the surface flickers between the two copies' shading
 * as the camera turns (seen on tree foliage and bark, vehicles, aircraft and some buildings).
 *
 * A double-sided material already draws both sides of one copy, so the second copy only adds
 * that fight (and its triangles). This drops every triangle whose three positions repeat an
 * earlier triangle's, in place, for indexed geometry. Single-sided materials are left alone:
 * there the two copies face opposite ways and only one is ever drawn.
 *
 * Returns the number of triangles removed.
 */
export function dropDuplicateFaces(geometry: THREE.BufferGeometry, material: THREE.Material) {
  if (material.side !== THREE.DoubleSide || !geometry.index || geometry.groups.length) return 0;
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return 0;
  // Vertices split for normals or UVs share a position: give each position one id. Positions
  // are compared as stored (equal stored values are equal positions, quantised or not), through
  // a hash table of vertex indices: a text key per vertex made this the slowest step of loading
  // the island's models.
  const interleaved = pos as unknown as THREE.InterleavedBufferAttribute;
  const data = interleaved.isInterleavedBufferAttribute ? interleaved.data.array : pos.array;
  const stride = interleaved.isInterleavedBufferAttribute ? interleaved.data.stride : pos.itemSize;
  const offset = interleaved.isInterleavedBufferAttribute ? interleaved.offset : 0;
  const ids = new Int32Array(pos.count);
  let slots = 2;
  while (slots < pos.count * 2) slots *= 2;
  const first = new Int32Array(slots).fill(-1);
  let positions = 0;
  for (let i = 0; i < pos.count; i++) {
    const o = i * stride + offset;
    const x = data[o]!,
      y = data[o + 1]!,
      z = data[o + 2]!;
    let h =
      (Math.imul((x * 4096) | 0, 73856093) ^
        Math.imul((y * 4096) | 0, 19349663) ^
        Math.imul((z * 4096) | 0, 83492791)) &
      (slots - 1);
    for (;;) {
      const j = first[h]!;
      if (j < 0) {
        first[h] = i;
        ids[i] = positions++;
        break;
      }
      const q = j * stride + offset;
      if (data[q] === x && data[q + 1] === y && data[q + 2] === z) {
        ids[i] = ids[j]!;
        break;
      }
      h = (h + 1) & (slots - 1);
    }
  }
  const index = geometry.index;
  const src = index.array;
  const packed = positions < 1 << 17;
  const seen = new Set<number | string>();
  const keep: number[] = [];
  for (let t = 0; t + 2 < index.count; t += 3) {
    let a = ids[src[t]!]!,
      b = ids[src[t + 1]!]!,
      c = ids[src[t + 2]!]!;
    // Sort the three ids (winding does not matter: both windings are the same surface).
    if (a > b) [a, b] = [b, a];
    if (b > c) [b, c] = [c, b];
    if (a > b) [a, b] = [b, a];
    const key = packed ? a * 2 ** 34 + b * 2 ** 17 + c : `${a},${b},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keep.push(src[t]!, src[t + 1]!, src[t + 2]!);
  }
  const removed = (index.count - keep.length) / 3;
  if (removed === 0) return 0;
  const Ctor = src instanceof Uint32Array ? Uint32Array : Uint16Array;
  geometry.setIndex(new THREE.BufferAttribute(new Ctor(keep), 1));
  geometry.setDrawRange(0, Infinity);
  return removed;
}
