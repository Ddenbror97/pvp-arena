"""
PBR texture set for the tactical gloves (called from build_gloves.py inside Blender).

1. Cycles bakes the game mesh's rest-pose surface position and normal into the UV atlas, the
   high-poly (finer SDF polygonisation, crisp guard / strap / tab edges) into a tangent-space
   normal map, and high-poly ambient occlusion.
2. Every texel is then classified on the 3D glove (glove_sdf.py field + finger/hand frames)
   into the panels of a modern tactical glove, with micro-relief computed per texel:
     palm / fingertip caps    synthetic suede (nap noise), padded palm patch with quilting
     back of hand / fingers   stretch knit (piqué weave)
     finger sides             fourchette gussets
     knuckle guard            moulded TPR with knurl and flex channels
     finger strips            raised TPR bars
     thumb crotch             perforated reinforcement
     cuff                     neoprene, bound edge, elastic strap with a moulded pull tab
   plus seams (groove + lock-stitch dashes), joint wrinkles and dust on raised areas.
3. Height -> tangent normals in UV space, blended over the baked macro normals; AO into ORM.
"""
import os, math
import numpy as np
import bpy

import glove_sdf as G

SENTINEL = -1e4


# ------------------------------------------------------------------------------------ noise
def _hash(ix, iy, iz, seed):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) & 0xFFFFFF).astype(np.float32) / float(0xFFFFFF)


def value_noise(p, scale, seed=0):
    """Smooth 3D value noise in [0,1] at points p (N,3) with feature size `scale` (m)."""
    q = p / scale
    i = np.floor(q).astype(np.int64)
    f = q - i
    u = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0]) * (u[:, 1] if dy else 1 - u[:, 1]) * (u[:, 2] if dz else 1 - u[:, 2])
                out = out + w * _hash(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
    return out


def fbm(p, scale, octaves=4, seed=0):
    total, amp, norm = 0, 1.0, 0
    for o in range(octaves):
        total = total + amp * value_noise(p, scale / 2 ** o, seed + o)
        norm += amp
        amp *= 0.5
    return total / norm


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def round_rect(u, v, hu, hv, r):
    """Signed distance to a rounded rectangle centred at 0."""
    du = np.abs(u) - hu + r
    dv = np.abs(v) - hv + r
    return np.hypot(np.maximum(du, 0), np.maximum(dv, 0)) + np.minimum(np.maximum(du, dv), 0) - r


# ------------------------------------------------------------------------------------ panels
KNIT, GUSSET, SUEDE, PATCH, GUARD, STRIP, PERF, CUFF, BINDING, STRAP, TAB = range(11)
# Linear albedo, roughness per panel. Everything is black; the panels read by sheen, roughness
# and relief, as on a real glove.
ALBEDO = {KNIT: (0.021, 0.021, 0.023), GUSSET: (0.017, 0.017, 0.019), SUEDE: (0.029, 0.029, 0.030),
          PATCH: (0.026, 0.026, 0.027), GUARD: (0.028, 0.028, 0.030), STRIP: (0.085, 0.085, 0.09),
          PERF: (0.026, 0.026, 0.027), CUFF: (0.019, 0.019, 0.021), BINDING: (0.014, 0.014, 0.015),
          STRAP: (0.020, 0.020, 0.022), TAB: (0.033, 0.033, 0.035)}
ROUGH = {KNIT: 0.78, GUSSET: 0.72, SUEDE: 0.92, PATCH: 0.9, GUARD: 0.5, STRIP: 0.44, PERF: 0.9,
         CUFF: 0.84, BINDING: 0.62, STRAP: 0.7, TAB: 0.55}
THREAD = np.array([0.04, 0.04, 0.042])


class Surface:
    """Per-texel accumulators."""

    def __init__(self, n):
        self.zone = np.full(n, KNIT, np.int8)
        self.height = np.zeros(n, np.float32)  # metres
        self.albedo = np.zeros((n, 3), np.float32)
        self.rough = np.zeros(n, np.float32)
        self.seam = np.full(n, 1.0, np.float32)  # distance to nearest seam (m)
        self.phase = np.zeros(n, np.float32)  # coordinate along that seam (m)
        self.thread = np.zeros(n, np.float32)

    def add_seam(self, mask, dist, phase):
        """Record a seam candidate: keep the nearest one per texel."""
        closer = mask & (dist < self.seam)
        self.seam[closer] = dist[closer]
        self.phase[closer] = phase[closer]


def finger_frames(h, finger):
    """Per-segment axis, dorsal and side directions for a finger (or the thumb)."""
    j = h.joints[finger]
    dirs = [G._norm(j[k + 1] - j[k]) for k in range(3)]
    lengths = [np.linalg.norm(j[k + 1] - j[k]) for k in range(3)]
    if finger == "thumb":
        ref = h.across * 0.8 - h.palmar * 0.6
        dorsals = [G._norm(ref - (ref @ d) * d) for d in dirs]
    else:
        curl = np.cross(dirs[0], dirs[2])
        if np.linalg.norm(curl) < 0.2:
            curl = h.across
        curl = G._norm(curl)
        dorsals = [G._norm(np.cross(curl, d)) for d in dirs]
        if dorsals[0] @ -h.palmar < 0:
            dorsals = [-d for d in dorsals]
    sides = [np.cross(d, o) for d, o in zip(dirs, dorsals)]
    return j, dirs, lengths, dorsals, sides


def classify(h, parts, info, P, N, seed):
    """Panels, relief and colour for texels at rest positions P / normals N (metres, hand frame)."""
    n = len(P)
    s = Surface(n)
    d_total, d_parts = G.evaluate(h, parts, info, P, want_parts=True)
    names = [p.name for p in parts]
    D = G.part_distances(parts, d_parts)
    nearest = np.array(names)[np.argmin(D, -1)]
    l = h.local(P)
    a, y, pp = l[:, 0], l[:, 1], l[:, 2]
    dorsal_n = -(N @ h.palmar)

    # ---------------------------------------------------------------- fingers and thumb
    finger_mask = np.zeros(n, bool)
    for finger in list(G.FINGERS) + ["thumb"]:
        m = np.isin(nearest, [f"{finger}{k}" for k in range(3)])
        if finger == "thumb":
            m &= ~np.isin(nearest, ["thenar", "web"])
        if not m.any():
            continue
        idx = np.where(m)[0]
        j, dirs, lengths, dorsals, sides = finger_frames(h, finger)
        seg = np.array([int(nearest[i][-1]) for i in idx])
        p = P[idx]
        A0 = np.stack([j[k] for k in seg])
        Dk = np.stack([dirs[k] for k in seg])
        Ok = np.stack([dorsals[k] for k in seg])
        Sk = np.stack([sides[k] for k in seg])
        Lk = np.array(lengths)[seg]
        v = p - A0
        t = np.clip(np.einsum("ij,ij->i", v, Dk) / Lk, -0.3, 1.3)
        cum = np.concatenate([[0], np.cumsum(lengths)])
        along = cum[seg] + t * Lk  # metres from the knuckle along the finger
        perp = v - np.einsum("ij,ij->i", v, Dk)[:, None] * Dk
        r = np.linalg.norm(perp, axis=-1) + 1e-6
        theta = np.arctan2(np.einsum("ij,ij->i", perp, Sk), np.einsum("ij,ij->i", perp, Ok))
        arc = theta * r  # metres round the finger from the dorsal centreline
        total = cum[-1]
        th = np.abs(theta)
        zone = np.where(th < 1.15, KNIT, np.where(th < 1.85, GUSSET, SUEDE))
        # Fingertip cap: suede wraps over the end of the finger, further down the pad side.
        cap_start = total - 0.016 - 0.006 * (th / np.pi)
        zone = np.where(along > cap_start, SUEDE, zone)
        s.zone[idx] = zone
        sub = np.zeros(n, bool)
        sub[idx] = True
        for edge in (1.15, 1.85):
            dist = np.full(n, 1.0, np.float32)
            dist[idx] = np.where(along <= cap_start, np.abs(th - edge) * r, 1.0)
            ph = np.zeros(n, np.float32)
            ph[idx] = along
            s.add_seam(sub, dist, ph)
        dist = np.full(n, 1.0, np.float32)
        dist[idx] = np.abs(along - cap_start)
        ph = np.zeros(n, np.float32)
        ph[idx] = arc
        s.add_seam(sub, dist, ph)

        hgt = np.zeros(len(idx), np.float32)
        # Knit relief follows the finger.
        # Raised TPR strips across the back of the fingers (two on the first phalanx, one on the
        # second), as on the reference glove; one on the thumb.
        bars = [(0, 0.47), (0, 0.70), (1, 0.48)] if finger != "thumb" else [(1, 0.45)]
        for k, centre in bars:
            mk = seg == k
            u = (t - centre) * lengths[k]
            d = round_rect(u, arc, 0.0026, 0.62 * np.median(r), 0.0022)
            on = mk & (d < 0)
            zone_strip = np.where(on, STRIP, s.zone[idx])
            s.zone[idx] = zone_strip
            hgt += np.where(mk, 0.00045 * smooth(0.0004, -0.0003, d), 0)
        # Joint wrinkles: compressed fabric on the back of the knuckle and finger joints, a
        # single crease on the pad side.
        for k in (1, 2):
            jt = cum[k]
            rel = along - jt
            jitter = 0.0007 * np.sin(arc * 900 + k * 2.1 + seed)
            for off, depth in ((-0.0032, 0.6), (0.0, 1.0), (0.0031, 0.7), (0.006, 0.35)):
                crease = np.exp(-(((rel - off - 0.0022 * (theta / 1.2) ** 2 + jitter) / 0.00055) ** 2))
                hgt -= 0.00022 * depth * crease * smooth(1.25, 0.5, th)
            pad = np.exp(-(((rel + 0.0005 * np.sin(arc * 600)) / 0.0006) ** 2)) * smooth(2.1, 2.6, th)
            hgt -= 0.0003 * pad
        # Knit / gusset / suede micro relief in finger coordinates.
        zf = s.zone[idx]
        rib = 0.5 * (np.sin(2 * np.pi * (along + arc) / 0.0011) + np.sin(2 * np.pi * (along - arc) / 0.0011))
        hgt += np.where(zf == KNIT, 0.00006 * rib, 0)
        hgt += np.where(zf == GUSSET, 0.00005 * np.sin(2 * np.pi * along / 0.0008), 0)
        s.height[idx] += hgt
        finger_mask |= m

    # ---------------------------------------------------------------- hand body
    body = ~finger_mask & (nearest != "cuff")
    body &= ~((y < -0.002) & (nearest == "palm"))
    cuff = ~finger_mask & ~body
    mcp_y, a_lo, a_hi = info["mcp_y"], info["a_lo"], info["a_hi"]
    centre_a = (a_lo + a_hi) / 2
    # Back vs palm: the side seam runs round the little-finger edge and the thumb base.
    back = dorsal_n > 0.12
    s.zone[body] = np.where(back[body], KNIT, SUEDE)
    dist = np.abs(dorsal_n - 0.12) * 0.016
    s.add_seam(body, dist, y.astype(np.float32))
    # Knuckle guard: the moulded pad is the outer surface wherever the bare body lies inside.
    d_body = G.smin(G.smin(d_parts["palm"], d_parts["hypothenar"], G.K_PALM), d_parts["thenar"], G.K_PALM)
    guard = body & back & (y > mcp_y - 0.04) & (d_total < d_body - 0.0016)
    for f in G.FINGERS:
        guard |= (nearest == f"knuckle-{f}") & (d_total < d_parts[f"knuckle-{f}"] - 0.0016) & back
    s.zone[guard] = GUARD
    gh = np.zeros(n, np.float32)
    # Knurl: fine moulded diamonds; flex channels between the knuckles; smooth rim.
    ku, kv = (a + y) / 0.0019, (a - y) / 0.0019
    knurl = (np.abs(np.sin(np.pi * ku)) * np.abs(np.sin(np.pi * kv))) ** 0.5
    mcps = sorted(h.mcp[f] @ h.across for f in G.FINGERS)
    channel = np.zeros(n, np.float32)
    for c in [(mcps[i] + mcps[i + 1]) / 2 for i in range(3)]:
        channel = np.maximum(channel, np.exp(-(((a - c) / 0.0009) ** 2)))
    rim = smooth(0.0016, 0.0035, d_body - d_total)  # 0 at the guard's bevelled edge
    gh += np.where(guard, 0.00016 * knurl * rim - 0.0006 * channel, 0)
    # Palm patch: padded, quilted, double-stitched.
    patch_d = round_rect(a - centre_a, y - (0.024 + mcp_y - 0.016) / 2, (a_hi - a_lo) / 2 - 0.004, (mcp_y - 0.016 - 0.024) / 2, 0.006)
    patch = body & ~back & (patch_d < 0) & (dorsal_n < -0.4)
    s.zone[patch] = PATCH
    gh += np.where(patch, 0.0006 * smooth(0.0, -0.0025, patch_d), 0)
    for off in (0.0019, 0.0042):
        s.add_seam(patch | (body & ~back & (patch_d < 0.004) & (dorsal_n < -0.3)), np.abs(patch_d + off), (a + y).astype(np.float32))
    quilt = np.minimum(np.abs(((a + y) / 0.012) % 1 - 0.5), np.abs(((a - y) / 0.012) % 1 - 0.5)) * 0.012
    quilt_line = np.exp(-((quilt / 0.00045) ** 2))
    gh -= np.where(patch & (patch_d < -0.005), 0.00035 * quilt_line, 0)
    s.thread = np.where(patch & (patch_d < -0.005) & (quilt < 0.00028) & ((np.abs(a + y) % 0.0028 < 0.0019) | (np.abs(a - y) % 0.0028 < 0.0019)), 1.0, s.thread)
    # Perforated reinforcement over the thumb crotch and thenar (palm side).
    perf = (np.isin(nearest, ["thenar", "web", "thumb0"]) | (finger_mask & np.isin(nearest, ["thumb0", "thumb1"]))) & (dorsal_n < -0.15)
    s.zone[perf & (s.zone != STRIP)] = PERF
    hx, hy = a / 0.0024, y / (0.0024 * 0.866)
    row = np.floor(hy)
    hx = hx + 0.5 * (row % 2)
    cell = np.hypot((hx - np.round(hx)) * 0.0024, (hy - np.round(hy)) * 0.0024 * 0.866)
    hole = smooth(0.00055, 0.00035, cell)
    gh -= np.where(perf, 0.0004 * hole, 0)
    s.perf_hole = np.where(perf, hole, 0)
    s.add_seam(body & ~back & ~perf & (dorsal_n < -0.1), np.abs(dorsal_n + 0.15) * 0.012 + 1.0 * ~np.isin(nearest, ["thenar", "web"]), (a - y).astype(np.float32))
    # Knit on the back of the hand.
    rib = 0.5 * (np.sin(2 * np.pi * (a + y) / 0.0011) + np.sin(2 * np.pi * (a - y) / 0.0011))
    gh += np.where(body & (s.zone == KNIT), 0.00006 * rib, 0)
    # Wrist seam where the hand meets the cuff.
    s.add_seam(body | cuff, np.abs(y - 0.0) + 0.0, (np.arctan2(pp, a) * 0.03).astype(np.float32))
    s.height += gh

    # ---------------------------------------------------------------- cuff
    phi = np.arctan2(pp, a)  # 0 thumb side, -pi/2 back of the wrist
    arcc = phi * 0.032
    s.zone[cuff] = CUFF
    ch = np.zeros(n, np.float32)
    end = -G.CUFF_LENGTH
    binding = cuff & (y < end + 0.004)
    s.zone[binding] = BINDING
    s.add_seam(cuff, np.abs(y - (end + 0.0052)), arcc.astype(np.float32))
    ch += np.where(binding, 0.00006 * np.sin(2 * np.pi * arcc / 0.0009), 0)
    # Strap and tab are separate moulded layers in the field: find where they are the surface.
    l_cuff = d_parts["cuff"]
    strap = cuff & False
    tab_centre = np.array([-G.CUFF_HALF_WIDTH * 0.62, -0.026, -G.CUFF_HALF_DEPTH * 0.68])
    tab_e = np.linalg.norm((l - tab_centre) / np.array([0.009, 0.013, 0.009]), axis=-1)
    tab = strap & (tab_e < 1.05)
    s.zone[strap] = STRAP
    s.zone[tab] = TAB
    strap_edge = np.abs(np.abs(y + 0.026) - 0.014)
    s.add_seam(strap & ~tab, strap_edge + 0.0018, arcc.astype(np.float32))
    s.add_seam(strap & ~tab, np.abs(strap_edge - 0.0035) + 0.0, arcc.astype(np.float32))
    ch += np.where(strap & ~tab, 0.00008 * np.sin(2 * np.pi * y / 0.0012), 0)
    # Tab: raised rim, moulded ridges and a recessed plate.
    ridge = np.sin(2 * np.pi * (y + 0.4 * arcc) / 0.0016)
    tab_rim = smooth(0.80, 0.92, tab_e)
    plate = round_rect(arcc - (np.median(arcc[tab]) if tab.any() else 0), y + 0.026, 0.004, 0.007, 0.0015)
    ch += np.where(tab, 0.00025 * tab_rim + np.where(plate < 0, -0.0003, 0.00008 * ridge) * (1 - tab_rim), 0)
    s.tab_plate = np.where(tab & (plate < 0), 1.0, 0.0)
    # Neoprene jersey.
    jersey = np.abs(np.sin(2 * np.pi * arcc / 0.0008)) * 0.5 + 0.5 * np.sin(2 * np.pi * y / 0.0006)
    ch += np.where(cuff & (s.zone == CUFF), 0.00003 * jersey, 0)
    s.height += ch
    return s, d_total


def stitches(s, P):
    """Seam groove + lock-stitch dashes beside it, into s.height / s.thread."""
    groove = np.exp(-((s.seam / 0.00045) ** 2))
    s.height -= 0.00028 * groove
    # Stitch line 1.6 mm beside the seam: 2.2 mm dashes, 0.9 mm gaps.
    lane = np.exp(-(((s.seam - 0.0016) / 0.00028) ** 2))
    dash = ((s.phase % 0.0031) < 0.0022).astype(np.float32)
    dash_shape = np.clip(np.sin(np.pi * np.clip((s.phase % 0.0031) / 0.0022, 0, 1)), 0, 1) ** 0.5
    thread = lane * dash * dash_shape
    s.height += 0.00014 * thread - 0.00008 * lane * (1 - dash)
    s.thread = np.maximum(s.thread, thread)


def shade(s, P, N, ao, seed):
    zone = s.zone
    albedo = np.zeros((len(zone), 3), np.float32)
    rough = np.zeros(len(zone), np.float32)
    for z in ALBEDO:
        m = zone == z
        albedo[m] = np.array(ALBEDO[z]) * 0.72  # tactical black under bright arena light
        rough[m] = ROUGH[z]
    # Material variation: suede nap and mottling, faded knit, rubber sheen variation.
    var = fbm(P, 0.006, 4, seed)
    nap = fbm(P * np.array([1, 3, 1]), 0.002, 3, seed + 7)
    albedo *= (0.86 + 0.28 * var)[:, None]
    suede = np.isin(zone, [SUEDE, PATCH, PERF])
    albedo[suede] *= (0.9 + 0.2 * nap[suede])[:, None]
    rough = rough + 0.05 * (var - 0.5)
    s.height += np.where(suede, 0.00004 * (nap - 0.5) + 0.00002 * (value_noise(P, 0.0003, seed + 3) - 0.5), 0)
    # Perforations show the dark liner.
    if hasattr(s, "perf_hole"):
        albedo *= (1 - 0.7 * s.perf_hole)[:, None]
    if hasattr(s, "tab_plate"):
        albedo[s.tab_plate > 0] *= 0.75
    # Thread: slightly lighter, a little sheen.
    t = s.thread[:, None]
    albedo = albedo * (1 - t) + THREAD * t
    rough = rough * (1 - s.thread) + 0.62 * s.thread
    # Dust and wear: field glove grime collects on raised, unoccluded areas; fibres in suede.
    convex = np.clip((s.height - np.median(s.height)) / 0.0003, 0, 1)
    dust_n = fbm(P, 0.012, 4, seed + 11)
    dust = np.clip((dust_n - 0.45) * 2.2, 0, 1) * (0.35 + 0.65 * ao) * (0.4 + 0.6 * convex)
    lint = (value_noise(P, 0.00045, seed + 13) > 0.94) * (value_noise(P, 0.003, seed + 17) > 0.55)
    dust = np.clip(dust * 0.4 + lint * 0.35, 0, 1)
    dust_col = np.array([0.1, 0.097, 0.092], np.float32)
    albedo = albedo * (1 - 0.25 * dust[:, None]) + dust_col * 0.25 * dust[:, None]
    rough = np.clip(rough + 0.12 * dust, 0.3, 1.0)
    # Contact shadow in crevices (AO also goes to the ORM map; albedo gets a hint for cavities).
    albedo *= (0.65 + 0.35 * ao)[:, None]
    return albedo, rough


# ------------------------------------------------------------------------------------ baking
def _image(name, size, value, float_buffer=True, alpha=True):
    img = bpy.data.images.new(name, size, size, alpha=alpha, float_buffer=float_buffer)
    img.colorspace_settings.name = "Non-Color"
    img.generated_color = value
    img.pixels.foreach_set(np.tile(np.array(value, np.float32), size * size))
    return img


def _bake_material(img, kind):
    m = bpy.data.materials.new(f"bake-{img.name}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.nodes.active = tex
    if kind in ("position", "normal"):
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        emit = nt.nodes.new("ShaderNodeEmission")
        nt.links.new(geo.outputs["Position" if kind == "position" else "Normal"], emit.inputs["Color"])
        nt.links.new(emit.outputs[0], out.inputs["Surface"])
    else:
        bsdf = nt.nodes.new("ShaderNodeBsdfDiffuse")
        nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return m


def _pixels(img):
    s = img.size[0]
    return np.array(img.pixels[:], np.float32).reshape(s, s, 4)


def _select(objs, active):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.hide_render = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = active


def dilate(rgb, valid, passes=24):
    """Push texels outward from islands so mip-maps never pull in empty atlas."""
    out = rgb.copy()
    v = valid.copy()
    for _ in range(passes):
        acc = np.zeros_like(out)
        cnt = np.zeros(v.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            sv = np.roll(np.roll(v, dy, 0), dx, 1)
            so = np.roll(np.roll(out, dy, 0), dx, 1)
            acc += so * sv[..., None]
            cnt += sv
        grow = ~v & (cnt > 0)
        out[grow] = acc[grow] / cnt[grow][:, None]
        v = v | grow
    if not v.all():
        out[~v] = out[v].mean(0)
    return out


def build(hands, outdir, size, hp_voxel, to_blender, from_blender, reuse=False):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.render.bake.use_clear = False
    sc.render.bake.margin = 0
    world = bpy.data.worlds.new("bake-world")
    sc.world = world
    world.light_settings.distance = 0.035 / G.HAND_SCALE  # AO reach ≈ 3.5 cm on the glove

    cache = os.path.join(outdir, "bakes.npz")
    if reuse and os.path.exists(cache):
        z = np.load(cache)
        data = {(k.split("|")[0], k.split("|")[1]): z[k] for k in z.files if "|" in k}
        macro, ao_full = z["macro"], z["ao"]
        print("reusing bakes")
    else:
        data, macro, ao_full = _bake(hands, size, hp_voxel, to_blender, sc)
        np.savez(cache, macro=macro, ao=ao_full, **{f"{k}|{s_}": v for (k, s_), v in data.items()})
    _finish(hands, outdir, size, data, macro, ao_full, from_blender)


def _bake(hands, size, hp_voxel, to_blender, sc):
    # High-poly per hand.
    hps = {}
    for side, (h, lp, parts, info) in hands.items():
        import time

        t0 = time.time()
        v, f, _, _ = G.surface(h, hp_voxel)
        me = bpy.data.meshes.new(f"glove_hp_{side}")
        me.from_pydata(to_blender(h.to_world(v)).tolist(), [], f[:, ::-1].tolist())
        me.update()
        me.shade_smooth()
        hp = bpy.data.objects.new(f"glove_hp_{side}", me)
        sc.collection.objects.link(hp)
        hp.hide_render = True
        hps[side] = hp
        print(side, "high-poly", len(f), "tris", f"{time.time() - t0:.0f}s")

    lps = [lp for _, lp, _, _ in hands.values()]
    data = {}
    for kind in ("position", "normal"):
        for side, (h, lp, _, _) in hands.items():
            img = _image(f"{kind}-{side}", size, (SENTINEL, SENTINEL, SENTINEL, 0.0))
            mat = _bake_material(img, kind)
            lp.data.materials.clear()
            lp.data.materials.append(mat)
            for o in bpy.data.objects:
                o.hide_render = o is not lp
            _select([lp], lp)
            sc.cycles.samples = 1
            bpy.ops.object.bake(type="EMIT", margin=0, use_clear=False)
            data[kind, side] = _pixels(img)
            print("baked", kind, side)

    # Macro normals and AO from the high-poly, into one atlas.
    normal_img = _image("macro-normal", size, (0.5, 0.5, 1.0, 1.0))
    ao_size = size // 2
    ao_img = _image("ao", ao_size, (1.0, 1.0, 1.0, 1.0))
    for kind, img in (("NORMAL", normal_img), ("AO", ao_img)):
        mat = _bake_material(img, "target")
        for side, (h, lp, _, _) in hands.items():
            lp.data.materials.clear()
            lp.data.materials.append(mat)
            hp = hps[side]
            hp.data.materials.clear()
            hp.data.materials.append(bpy.data.materials.get("hp-grey") or bpy.data.materials.new("hp-grey"))
            for o in bpy.data.objects:
                o.hide_render = o not in (lp, hp)
            _select([hp, lp], lp)
            sc.cycles.samples = 1 if kind == "NORMAL" else 48
            bpy.ops.object.bake(type=kind, use_selected_to_active=True, cage_extrusion=0.003 / G.HAND_SCALE,
                                max_ray_distance=0.008 / G.HAND_SCALE, normal_space="TANGENT", margin=0, use_clear=False)
            print("baked", kind, side)
    macro = _pixels(normal_img)[..., :3]
    ao_small = _pixels(ao_img)[..., 0]
    ao_full = np.kron(ao_small, np.ones((2, 2), np.float32))[:size, :size]
    return data, macro, ao_full


def _finish(hands, outdir, size, data, macro, ao_full, from_blender):
    lps = [lp for _, lp, _, _ in hands.values()]

    # Per-texel panels and relief.
    albedo = np.zeros((size, size, 3), np.float32)
    rough = np.ones((size, size), np.float32)
    height = np.zeros((size, size), np.float32)
    valid = np.zeros((size, size), bool)
    for k, (side, (h, lp, parts, info)) in enumerate(hands.items()):
        pos = data["position", side]
        nrm = data["normal", side]
        m = pos[..., 0] > SENTINEL / 2
        world_pos = from_blender(pos[m][:, :3])
        P = (world_pos - h.wrist_world) * G.HAND_SCALE
        N = from_blender(nrm[m][:, :3])
        N /= np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9
        s, _ = classify(h, parts, info, P, N, seed=11 + k)
        stitches(s, P)
        ao = np.clip(ao_full[m], 0, 1)
        a_, r_ = shade(s, P, N, ao, seed=31 + k)
        albedo[m] = a_
        rough[m] = r_
        height[m] = s.height
        valid |= m
        print("classified", side, int(m.sum()), "texels")

    # Height -> tangent-space normal (OpenGL / Blender: +X along +u, +Y along +v; rows are v).
    world_u = np.zeros((size, size), np.float32)
    texel = None
    for side in hands:
        pos = data["position", side][..., :3]
        ok = (pos[..., 0] > SENTINEL / 2)
        both = ok[:, 1:] & ok[:, :-1]
        dd = np.linalg.norm(pos[:, 1:] - pos[:, :-1], axis=-1)[both]
        t = np.median(dd) * G.HAND_SCALE
        texel = t if texel is None else (texel + t) / 2
    hv = np.where(valid, height, 0)
    hv = dilate(hv[..., None], valid, 4)[..., 0]
    du = (np.roll(hv, -1, 1) - np.roll(hv, 1, 1)) / (2 * texel)
    dv = (np.roll(hv, -1, 0) - np.roll(hv, 1, 0)) / (2 * texel)
    micro = np.stack([-du, -dv, np.ones_like(du)], -1)
    micro /= np.linalg.norm(micro, axis=-1, keepdims=True)
    base = macro * 2 - 1
    base /= np.linalg.norm(base, axis=-1, keepdims=True) + 1e-9
    # Whiteout blend.
    n = np.stack([base[..., 0] + micro[..., 0], base[..., 1] + micro[..., 1], base[..., 2] * micro[..., 2]], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    normal = n * 0.5 + 0.5

    ao_tex = np.where(valid, np.clip(ao_full, 0, 1) ** 0.8, 1.0)
    orm = np.stack([ao_tex, np.clip(rough, 0.05, 1), np.zeros_like(rough)], -1)
    srgb = np.where(albedo <= 0.0031308, albedo * 12.92, 1.055 * np.power(np.clip(albedo, 0.0031308, None), 1 / 2.4) - 0.055)
    outputs = {"glove_basecolor.png": srgb, "glove_normal.png": normal, "glove_orm.png": orm}
    for name, rgb in outputs.items():
        rgb = dilate(rgb.astype(np.float32), valid)
        img = bpy.data.images.new(name, size, size, alpha=False)
        img.colorspace_settings.name = "sRGB" if "basecolor" in name else "Non-Color"
        img.pixels.foreach_set(np.concatenate([np.clip(rgb, 0, 1), np.ones((size, size, 1), np.float32)], -1).ravel())
        img.filepath_raw = os.path.join(outdir, name)
        img.file_format = "PNG"
        img.save()
        print("wrote", name)
    np.save(os.path.join(outdir, "zones.npy"), np.where(valid, 0, -1).astype(np.int8))

    # Leave a viewable material on the game meshes in the .blend.
    mat = bpy.data.materials.new("glove")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    for name, socket, cs in (("glove_basecolor.png", "Base Color", "sRGB"), ("glove_normal.png", None, "Non-Color")):
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(os.path.join(outdir, name))
        tex.image.colorspace_settings.name = cs
        if socket:
            nt.links.new(tex.outputs[0], bsdf.inputs[socket])
        else:
            nm = nt.nodes.new("ShaderNodeNormalMap")
            nt.links.new(tex.outputs[0], nm.inputs["Color"])
            nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.8
    for lp in lps:
        lp.data.materials.clear()
        lp.data.materials.append(mat)
