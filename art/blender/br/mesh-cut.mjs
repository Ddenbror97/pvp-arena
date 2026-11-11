/**
 * Cutting boxes out of glTF primitives, every vertex attribute interpolated (UVs included).
 * Shared by repair_building_access.mjs (doorways, floors, stairs) and restore_stair_sides.mjs.
 */
// Partition a convex polygon at a plane, interpolating every vertex attribute (UVs included).
function split(poly, axis, edge, sign) {
  const inside = [],
    outside = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const da = (a.POSITION[axis] - edge) * sign,
      db = (b.POSITION[axis] - edge) * sign;
    (da <= 0 ? inside : outside).push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db),
        v = {};
      for (const sem of Object.keys(a)) v[sem] = a[sem].map((n, k) => n + (b[sem][k] - n) * t);
      inside.push(v);
      outside.push(v);
    }
  }
  return [inside, outside];
}

function subtract(poly, box) {
  if (
    [0, 1, 2].some(
      (k) =>
        Math.max(...poly.map((v) => v.POSITION[k])) <= box[k] ||
        Math.min(...poly.map((v) => v.POSITION[k])) >= box[k + 3],
    )
  )
    return [poly];
  const result = [];
  for (let axis = 0; axis < 3 && poly.length >= 3; axis++) {
    for (const [edge, sign] of [
      [box[axis], -1],
      [box[axis + 3], 1],
    ]) {
      const [inside, outside] = split(poly, axis, edge, sign);
      if (outside.length >= 3) result.push(outside);
      poly = inside;
      if (poly.length < 3) break;
    }
  }
  return result;
}

export function cutPrimitive(doc, p, boxes, removeGround) {
  const attrs = Object.fromEntries(p.listSemantics().map((s) => [s, p.getAttribute(s)]));
  const arrays = Object.fromEntries(Object.keys(attrs).map((s) => [s, []]));
  const index = p.getIndices(),
    count = index?.getCount() ?? attrs.POSITION.getCount();
  const emit = (poly) => {
    for (let k = 1; k < poly.length - 1; k++) {
      const tri = [poly[0], poly[k], poly[k + 1]];
      const [a, b, c] = tri.map((v) => v.POSITION);
      const ab = b.map((n, i) => n - a[i]),
        ac = c.map((n, i) => n - a[i]);
      if (
        Math.hypot(
          ab[1] * ac[2] - ab[2] * ac[1],
          ab[2] * ac[0] - ab[0] * ac[2],
          ab[0] * ac[1] - ab[1] * ac[0],
        ) < 1e-8
      )
        continue;
      for (const v of tri)
        for (const sem of Object.keys(attrs)) {
          const values = v[sem];
          if (sem === "NORMAL") {
            const len = Math.hypot(...values) || 1;
            arrays[sem].push(...values.map((n) => n / len));
          } else arrays[sem].push(...values);
        }
    }
  };
  for (let i = 0; i < count; i += 3) {
    const tri = [0, 1, 2].map((k) =>
      Object.fromEntries(
        Object.entries(attrs).map(([s, a]) => [
          s,
          a.getElement(index ? index.getScalar(i + k) : i + k, []),
        ]),
      ),
    );
    // The island owns the ground. Embedded exterior dirt sheets at y=0 otherwise compete
    // with terrain at every camera angle. Keep raised decks and all building surfaces.
    if (removeGround && tri.every((v) => Math.abs(v.POSITION[1]) < 0.035)) continue;
    let pieces = [tri];
    for (const box of boxes) pieces = pieces.flatMap((poly) => subtract(poly, box));
    pieces.forEach(emit);
  }
  p.setIndices(null);
  for (const [sem, a] of Object.entries(attrs))
    p.setAttribute(
      sem,
      doc.createAccessor().setType(a.getType()).setArray(new Float32Array(arrays[sem])),
    );
}
