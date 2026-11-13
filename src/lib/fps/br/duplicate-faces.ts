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
  // the island's models. The stored values are copied to one float array first (exact for
  // 8- and 16-bit and float storage; -0 becomes 0, as in the text key), so the loops below read
  // one kind of array whatever each model stores.
  const interleaved = pos as unknown as THREE.InterleavedBufferAttribute;
  const data = interleaved.isInterleavedBufferAttribute ? interleaved.data.array : pos.array;
  const stride = interleaved.isInterleavedBufferAttribute ? interleaved.data.stride : pos.itemSize;
  const offset = interleaved.isInterleavedBufferAttribute ? interleaved.offset : 0;
  const count = pos.count;
  const at = new Float32Array(count * 3);
  for (let i = 0, o = offset; i < count; i++, o += stride) {
    at[i * 3] = data[o]! + 0;
    at[i * 3 + 1] = data[o + 1]! + 0;
    at[i * 3 + 2] = data[o + 2]! + 0;
  }
  const bits = new Int32Array(at.buffer);
  const ids = new Int32Array(count);
  let slots = 2;
  while (slots < count * 2) slots *= 2;
  const first = new Int32Array(slots).fill(-1);
  let positions = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    // The three values' bits, mixed down to the table's size (small whole numbers differ only
    // in their high bits: without the final mixing every vertex landed in a few slots).
    let h =
      Math.imul(bits[o]!, 0x9e3779b1) ^
      Math.imul(bits[o + 1]!, 0x85ebca6b) ^
      Math.imul(bits[o + 2]!, 0xc2b2ae35);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h = (h ^ (h >>> 16)) & (slots - 1);
    for (;;) {
      const j = first[h]!;
      if (j < 0) {
        first[h] = i;
        ids[i] = positions++;
        break;
      }
      const q = j * 3;
      if (bits[q] === bits[o] && bits[q + 1] === bits[o + 1] && bits[q + 2] === bits[o + 2]) {
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
