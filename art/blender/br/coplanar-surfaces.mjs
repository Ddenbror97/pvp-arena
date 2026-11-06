/** Offline planar surface ownership. Keep trim, cut only the covered part of its backing face. */
const EPS = 1e-7;
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = (poly, axes) =>
  Math.abs(
    poly.reduce((sum, v, i) => {
      const next = poly[(i + 1) % poly.length];
      return (
        sum +
        v.POSITION[axes[0]] * next.POSITION[axes[1]] -
        v.POSITION[axes[1]] * next.POSITION[axes[0]]
      );
    }, 0),
  ) / 2;
const project = (v, axes) => axes.map((a) => v.POSITION[a]);
const mix = (a, b, t) =>
  Object.fromEntries(Object.keys(a).map((k) => [k, a[k].map((n, i) => n + (b[k][i] - n) * t)]));

function partition(poly, a, b, sign, axes) {
  const inside = [],
    outside = [];
  for (let i = 0; i < poly.length; i++) {
    const u = poly[i],
      v = poly[(i + 1) % poly.length],
      du = cross(a, b, project(u, axes)) * sign,
      dv = cross(a, b, project(v, axes)) * sign;
    // Shared boundary vertices belong to both halves. Dropping them from the outside
    // polygon removes valid wall corners when a trim triangle shares a wall edge.
    if (du >= -1e-10) inside.push(u);
    if (du <= 1e-10) outside.push(u);
    if ((du < 0 && dv > 0) || (du > 0 && dv < 0)) {
      const p = mix(u, v, du / (du - dv));
      inside.push(p);
      outside.push(p);
    }
  }
  return [inside, outside];
}
function subtract(poly, cover, axes) {
  const points = cover.map((v) => project(v, axes));
  const sign = Math.sign(cross(...points));
  let remaining = poly;
  const outside = [];
  for (let edge = 0; edge < 3 && remaining.length >= 3; edge++) {
    const [inside, out] = partition(remaining, points[edge], points[(edge + 1) % 3], sign, axes);
    if (out.length >= 3 && area(out, axes) > EPS) outside.push(out);
    remaining = inside;
  }
  // Touching triangles share an edge; do not retessellate either one.
  if (remaining.length < 3 || area(remaining, axes) <= EPS) return { pieces: [poly], removed: 0 };
  const originalArea = area(poly, axes),
    removed = area(remaining, axes);
  const keptArea = outside.reduce((sum, p) => sum + area(p, axes), 0);
  if (Math.abs(originalArea - keptArea - removed) > Math.max(1e-6, originalArea * 1e-6))
    throw Error("Coplanar repair lost surface area");
  return { pieces: outside, removed };
}
const overlaps = (a, b) =>
  a[0] < b[2] - EPS && a[2] > b[0] + EPS && a[1] < b[3] - EPS && a[3] > b[1] + EPS;
const bounds = (v, axes) => [
  Math.min(...v.map((p) => p.POSITION[axes[0]])),
  Math.min(...v.map((p) => p.POSITION[axes[1]])),
  Math.max(...v.map((p) => p.POSITION[axes[0]])),
  Math.max(...v.map((p) => p.POSITION[axes[1]])),
];

/** Faces have `vertices` with POSITION/UV/etc arrays, material identity and doubleSided. */
export function resolveCoplanarSurfaces(faces) {
  const groups = new Map(),
    output = [];
  let overlapsResolved = 0,
    coveredArea = 0;
  for (const [index, face] of faces.entries()) {
    // Cutout/transparent materials do not cover the full triangle behind them.
    if (face.opaque === false) {
      output.push(face);
      continue;
    }
    const v = face.vertices.map((p) => p.POSITION),
      a = v[1].map((x, i) => x - v[0][i]),
      b = v[2].map((x, i) => x - v[0][i]);
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
      len = Math.hypot(...n);
    if (len < EPS) continue;
    const normal = n.map((x) => x / len),
      dominant = normal.reduce(
        (best, x, i) => (Math.abs(x) > Math.abs(normal[best]) ? i : best),
        0,
      );
    const axes = [0, 1, 2].filter((i) => i !== dominant),
      canonical = normal[dominant] < 0 ? normal.map((x) => -x) : normal;
    const plane = canonical.reduce((s, x, i) => s + x * v[0][i], 0);
    // Only coincident planes; no depth bias or merging nearby but distinct thin walls.
    const key = canonical.map((x) => Math.round(x * 1e6)).join(",") + ":" + Math.round(plane * 1e5);
    let group = groups.get(key);
    if (!group) groups.set(key, (group = []));
    group.push({
      ...face,
      index,
      normal,
      plane,
      axes,
      area: len / 2,
      bounds: bounds(face.vertices, axes),
    });
  }
  for (const group of groups.values()) {
    // Small architectural details own the visible surface rather than a whole backing wall.
    group.sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.area - b.area || a.index - b.index,
    );
    const owners = [];
    for (const face of group) {
      let pieces = [face.vertices];
      for (const owner of owners) {
        // A one-sided owner cannot replace the other visible side of a two-sided face.
        if (face.doubleSided && !owner.doubleSided) continue;
        if (!overlaps(face.bounds, owner.bounds) || Math.abs(face.plane - owner.plane) > 1e-5)
          continue;
        const sameFacing = face.normal.reduce((s, x, i) => s + x * owner.normal[i], 0) > 0;
        if (!sameFacing && !face.doubleSided && !owner.doubleSided) continue;
        const next = [];
        for (const poly of pieces) {
          const result = subtract(poly, owner.vertices, face.axes);
          next.push(...result.pieces);
          if (result.removed > EPS) {
            coveredArea += result.removed;
            overlapsResolved++;
          }
        }
        pieces = next;
        if (!pieces.length) break;
      }
      for (const poly of pieces)
        for (let i = 1; i + 1 < poly.length; i++) {
          const tri = [poly[0], poly[i], poly[i + 1]];
          if (area(tri, face.axes) > EPS) output.push({ ...faces[face.index], vertices: tri });
        }
      owners.push(face);
    }
  }
  return { faces: output, overlapsResolved, coveredArea };
}
