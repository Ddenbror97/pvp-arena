import * as THREE from "three";

/**
 * A fitted shemagh / balaclava around the character's own head mesh (head-local space,
 * face toward −Z), the way CS/COD terrorist head-wear reads: one continuous cloth layer over
 * crown, ears, cheeks and jaw with an eye slit, instead of a separate cap, tube and cone.
 *
 * Cloth drapes rather than shrink-wraps: around a head centre, the outermost skin radius in
 * each direction is found, dilated over neighbouring directions (so the cloth tents from the
 * nose to the chin and swallows the ears instead of showing lips or sockets), smoothed, and
 * kept at least one fabric thickness outside every skin point.
 */
export type WrapOptions = {
  eyeCenter: THREE.Vector3;
  /** Lowest point of the wrap before the neck drape takes over. */
  neckY?: number;
  thickness?: number;
};

export function buildHeadWrap(skin: THREE.BufferGeometry, options: WrapOptions) {
  const { eyeCenter } = options,
    neckY = options.neckY ?? -0.15,
    thickness = options.thickness ?? 0.006;
  const positions = skin.getAttribute("position");
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    if (point.y > neckY) box.expandByPoint(point);
  }
  const center = box.getCenter(new THREE.Vector3());
  center.y = Math.max(center.y, eyeCenter.y - 0.015);
  // Longitude 0 faces forward (−Z); latitude runs from the crown (0) to below the neck (π).
  const LON = 128,
    LAT = 72;
  const lonOf = (v: THREE.Vector3) => Math.atan2(v.x, -v.z);
  const raw = new Float32Array(LON * LAT);
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).sub(center);
    const r = point.length();
    if (r < 1e-6) continue;
    const lat = Math.acos(THREE.MathUtils.clamp(point.y / r, -1, 1));
    const lon = lonOf(point);
    const li = Math.min(LAT - 1, Math.floor((lat / Math.PI) * LAT)),
      lj = ((Math.floor(((lon + Math.PI) / (Math.PI * 2)) * LON) % LON) + LON) % LON;
    raw[li * LON + lj] = Math.max(raw[li * LON + lj]!, r);
  }
  const at = (field: Float32Array, i: number, j: number) =>
    field[THREE.MathUtils.clamp(i, 0, LAT - 1) * LON + (((j % LON) + LON) % LON)]!;
  // Fill directions no vertex landed in (crown pole, sparse areas) from their neighbours.
  for (let pass = 0; pass < 6; pass++)
    for (let i = 0; i < LAT; i++)
      for (let j = 0; j < LON; j++)
        if (!raw[i * LON + j]) {
          let sum = 0,
            n = 0;
          for (const [di, dj] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const v = at(raw, i + di, j + dj);
            if (v) {
              sum += v;
              n++;
            }
          }
          if (n) raw[i * LON + j] = sum / n;
        }
  // Dilate: wider sideways on the lower face so cloth spans nose → cheeks → chin.
  const dilated = new Float32Array(LON * LAT);
  for (let i = 0; i < LAT; i++)
    for (let j = 0; j < LON; j++) {
      const lat = ((i + 0.5) / LAT) * Math.PI;
      const lower = THREE.MathUtils.smoothstep(lat, 1.35, 1.9);
      const ri = 2 + Math.round(lower * 3),
        rj = 3 + Math.round(lower * 4);
      let m = 0;
      for (let di = -ri; di <= ri; di++)
        for (let dj = -rj; dj <= rj; dj++) {
          // Elliptical kernel; spans fall off so dilation rounds instead of squaring off.
          const k = (di / (ri + 0.5)) ** 2 + (dj / (rj + 0.5)) ** 2;
          if (k > 1) continue;
          m = Math.max(m, at(raw, i + di, j + dj) * (1 - k * 0.04));
        }
      dilated[i * LON + j] = m;
    }
  // Smooth the drape, then never let it fall inside skin + fabric thickness.
  let field = dilated;
  for (let pass = 0; pass < 5; pass++) {
    const next = new Float32Array(LON * LAT);
    for (let i = 0; i < LAT; i++)
      for (let j = 0; j < LON; j++)
        next[i * LON + j] =
          (at(field, i, j) * 4 +
            at(field, i + 1, j) +
            at(field, i - 1, j) +
            at(field, i, j + 1) +
            at(field, i, j - 1)) /
          8;
    field = next;
  }
  for (let k = 0; k < field.length; k++) field[k] = Math.max(field[k]!, raw[k]! + thickness);

  const lastRow = LAT - 1,
    columns = LON + 1;
  const dir = new THREE.Vector3();
  const slitHalfWidth = 0.066,
    slitHalfHeight = 0.0165;
  /**
   * One cloth layer from the drape field. `extra(lat, lon, y)` adds layer thickness/looseness;
   * `keepCell(y)` selects the band of the head the layer covers. Vertices below the neck line
   * are tucked flat into it (hidden inside the neck drape) so the hem never shows stair steps.
   */
  const layer = (
    extra: (lat: number, lon: number, y: number) => number,
    top: ((lon: number) => number) | undefined,
    slit: boolean,
  ) => {
    const folded: boolean[] = [];
    const vertices: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= lastRow; i++) {
      const lat = (i / lastRow) * Math.PI;
      for (let j = 0; j <= LON; j++) {
        const lon = (j / LON) * Math.PI * 2 - Math.PI;
        dir.set(Math.sin(lat) * Math.sin(lon), Math.cos(lat), -Math.sin(lat) * Math.cos(lon));
        const r = at(field, Math.min(lastRow, Math.round((lat / Math.PI) * LAT - 0.5)), j);
        const base = center.y + dir.y * r;
        const p = dir
          .clone()
          .multiplyScalar(r + extra(lat, lon, base))
          .add(center);
        if (p.y < neckY) p.y = neckY;
        // Cloth above the wrap line folds down onto it: a clean, thick hem, no stair steps.
        const limit = top?.(lon);
        const over = limit !== undefined && p.y > limit;
        if (over) p.y = limit;
        folded.push(over || p.y === neckY);
        vertices.push(p.x, p.y, p.z);
        uvs.push((j / LON) * 6, p.y * 10);
      }
    }
    for (let i = 0; i < lastRow; i++)
      for (let j = 0; j < LON; j++) {
        const a = i * columns + j,
          b = a + 1,
          c = a + columns,
          d = c + 1;
        const cy = (vertices[a * 3 + 1]! + vertices[d * 3 + 1]!) / 2,
          cx = (vertices[a * 3]! + vertices[d * 3]!) / 2,
          cz = (vertices[a * 3 + 2]! + vertices[d * 3 + 2]!) / 2;
        // Fully folded/tucked cells add nothing visible.
        if (folded[a] && folded[b] && folded[c] && folded[d]) continue;
        const across = (cx - eyeCenter.x) / slitHalfWidth;
        if (
          slit &&
          cz < center.z - 0.02 &&
          Math.abs(across) < 1 &&
          Math.abs(cy - eyeCenter.y - 0.003) < slitHalfHeight * (1 - across ** 4 * 0.5)
        )
          continue;
        indices.push(a, c, b, b, c, d);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  };
  // Knit balaclava: close-fitting, faint ribbing, eye slit.
  const balaclava = layer(
    (lat, lon) => Math.sin(lon * 40) * 0.0004 + Math.sin(lon * 7 + lat * 9) * 0.0008,
    undefined,
    true,
  );
  // Shemagh over nose, mouth and neck: looser at the front and lower down, with wrap folds and
  // a wavy top edge just under the eyes.
  // The wrapped edge dips over the nose bridge, rises across the cheeks and drops behind.
  const edge = (lon: number) =>
    eyeCenter.y -
    0.027 -
    0.008 * Math.max(0, Math.cos(lon)) ** 6 +
    0.006 * Math.sin(Math.abs(lon) * 1.6) -
    0.03 * THREE.MathUtils.smoothstep(Math.abs(lon), 1.9, 3.1) +
    0.0025 * Math.sin(lon * 9);
  const scarf = layer(
    (lat, lon, y) => {
      const front = Math.max(0, Math.cos(lon));
      const below = THREE.MathUtils.clamp((edge(lon) - y) / 0.12, 0, 1);
      // Rolled hem: the cloth folds back on itself along the top edge.
      const hem = Math.exp(-(((edge(lon) - y) / 0.006) ** 2)) * 0.0045;
      return (
        0.0055 +
        hem +
        below * (0.006 + front * 0.012) +
        (Math.sin(lon * 6 + y * 70) * 0.5 + 0.5) * 0.004 +
        Math.sin(lon * 13 - y * 120) * 0.0012
      );
    },
    edge,
    false,
  );
  return { balaclava, scarf };
}

/**
 * Tan cotton shemagh: fine plain weave, thin woven olive/brown stripes and a small
 * low-contrast lattice — reads as cloth at play distance instead of a loud pattern.
 * Alpha carries fold/weave relief for the bump map.
 */
export function createShemaghTextures() {
  const W = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = W;
  const pen = canvas.getContext("2d")!;
  pen.fillStyle = "#a48d68";
  pen.fillRect(0, 0, W, W);
  const image = pen.getImageData(0, 0, W, W),
    data = image.data;
  let seed = 991;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const rowTone = Array.from({ length: W }, () => random() * 14 - 7),
    colTone = Array.from({ length: W }, () => random() * 14 - 7);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      // Plain weave: warp over weft alternately, each thread its own slight shade.
      const over = (x >> 1) % 2 === (y >> 1) % 2;
      const tone = (over ? colTone[x]! : rowTone[y]!) + (over ? 6 : -6) + (random() - 0.5) * 8;
      // Woven stripes and lattice in olive brown, as in a traditional shemagh.
      const gx = x % 128,
        gy = y % 128;
      const stripe = gx < 2 || (gx > 5 && gx < 7) || gy < 2 || (gy > 5 && gy < 7);
      const dye = stripe ? 0.72 : 1;
      // Field dirt: low-frequency darkening so the cloth looks worn, not new.
      const grime =
        0.86 + 0.14 * Math.sin(x * 0.019 + Math.sin(y * 0.013) * 2) * Math.sin(y * 0.017);
      data[o] = Math.max(0, Math.min(255, ((166 + tone) * dye - (stripe ? 18 : 0)) * grime));
      data[o + 1] = Math.max(0, Math.min(255, ((145 + tone) * dye - (stripe ? 10 : 0)) * grime));
      data[o + 2] = Math.max(0, Math.min(255, ((108 + tone) * dye - (stripe ? 18 : 0)) * grime));
      data[o + 3] = 255;
    }
  pen.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  // Relief: thread bumps plus long soft wrap folds.
  const reliefCanvas = document.createElement("canvas");
  reliefCanvas.width = reliefCanvas.height = W;
  const r = reliefCanvas.getContext("2d")!,
    relief = r.createImageData(W, W);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const thread = (x >> 1) % 2 === (y >> 1) % 2 ? 160 : 100;
      const fold = Math.sin((x * 0.6 + y) * 0.035) * 40 + Math.sin((x - y * 0.3) * 0.021) * 25;
      const v = Math.max(0, Math.min(255, thread * 0.55 + 70 + fold));
      relief.data[o] = relief.data[o + 1] = relief.data[o + 2] = v;
      relief.data[o + 3] = 255;
    }
  r.putImageData(relief, 0, 0);
  const bump = new THREE.CanvasTexture(reliefCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
}

/** Charcoal knit for the balaclava: fine ribs and stitch noise; alpha unused. */
export function createKnitTexture() {
  const W = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = W;
  const pen = canvas.getContext("2d")!,
    image = pen.createImageData(W, W);
  let seed = 4242;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const rib = Math.sin((x / W) * Math.PI * 2 * 48) * 0.5 + 0.5;
      const stitch = Math.sin((y / W) * Math.PI * 2 * 96 + (x % 6 < 3 ? 1.5 : 0)) * 0.5 + 0.5;
      const v = 38 + rib * 12 + stitch * 6 + (random() - 0.5) * 6;
      image.data[o] = v;
      image.data[o + 1] = v * 0.98;
      image.data[o + 2] = v * 0.94;
      image.data[o + 3] = 255;
    }
  pen.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}
