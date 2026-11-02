"""
FROSTLINE winter environment kit (Phase 4). Imported by build_frostline.py.

Built on the AIM ARENA's modular kit (art/blender/map/arena_kit.py), which it imports and reuses
unchanged: the same geometry buckets (one mesh per section x material), face/box/cylinder
primitives with world-space box UVs, neighbour-aware trims (no coplanar overlaps), linked
duplicates for instancing, baked vertex AO and the collision validation. This module adds the
winter material set and the FROSTLINE dressing kinds.

Rules (same as the AIM ARENA, plus snow):
* Below 2.9 m inside the playable rectangle, every dressing vertex stays within 6 cm of its
  gameplay solid (no invisible walls, no visual-only cover). Exception: ground snow (drifts at
  wall bases, y <= 0.16 m), which is never cover.
* Snow is real geometry, never a coplanar layer: caps sit on top of a solid (the solid's top
  face is dropped or hidden under the cap, the cap has no bottom), their sides overhang by
  3 cm so no face shares a plane with the solid's side; drifts are sloped ramps that meet
  walls and ground along lines only.
* Festive lights and lit windows are emissive materials; lamp light on the snow is baked into
  the ground's emissive light map (second UV set). No real-time lights are added.
"""
import json, math, os, random, sys
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "map"))
import arena_kit as K  # noqa: E402

K.TEX = os.path.join(HERE, "build", "tex")
R = random.Random(11)
K.R = R
box, face, cylinder, quad_on, faces_of, grow = K.box, K.face, K.cylinder, K.quad_on, K.faces_of, K.grow

# ------------------------------------------------------------------------------- materials
# name: (textures (albedo, normal, roughness), tile metres, tint, roughness, metallic, extra)
MATS = {
    "snow": (("snow", "snow_n", "snow_r"), 3.0, (1, 1, 1), 0.85, 0.0, {}),
    "snowpack": (("snowpack", "snowpack_n", "snowpack_r"), 5.0, (1, 1, 1), 0.85, 0.0, {"lightmap": True}),
    "soviet": (("soviet", "soviet_n", "soviet_r"), 3.0, (1, 1, 1), 0.9, 0.0, {}),
    "soviet_dark": (("soviet", "soviet_n", "soviet_r"), 2.0, (0.66, 0.66, 0.68), 0.9, 0.0, {}),
    "soviet_warm": (("soviet", "soviet_n", "soviet_r"), 3.0, (0.93, 0.88, 0.80), 0.9, 0.0, {}),
    "fence": (("fence", "fence_n", "fence_r"), 2.4, (1, 1, 1), 0.88, 0.0, {}),
    "ice": (("ice", "ice_n", "ice_r"), 2.0, (1, 1, 1), 0.5, 0.0, {}),
    "steel": (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.5, (0.24, 0.25, 0.26), 0.55, 0.6, {}),
    "steel_olive": (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.5, (0.36, 0.40, 0.27), 0.6, 0.3, {}),
    "steel_blue": (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.5, (0.30, 0.42, 0.55), 0.6, 0.3, {}),
    "steel_grey": (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.5, (0.58, 0.60, 0.60), 0.55, 0.4, {}),
    "steel_yellow": (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.0, (0.85, 0.62, 0.12), 0.55, 0.3, {}),
    "steel_red": (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.0, (0.60, 0.16, 0.12), 0.55, 0.3, {}),
    "tote_tank": ((None, None, None), 1, (0.84, 0.84, 0.78), 0.5, 0.0, {}),
    "rubber": ((None, None, None), 1, (0.05, 0.05, 0.055), 0.85, 0.0, {}),
    "container_red": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.58, 0.17, 0.11), 0.6, 0.35, {}),
    "container_green": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.24, 0.38, 0.27), 0.6, 0.35, {}),
    "container_blue": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.14, 0.27, 0.46), 0.6, 0.35, {}),
    "container_orange": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.72, 0.36, 0.12), 0.6, 0.35, {}),
    "cladding": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.55, 0.58, 0.60), 0.55, 0.4, {}),
    "roof_metal": (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (0.45, 0.46, 0.47), 0.5, 0.5, {}),
    "wood": (("wood", "wood_n", None), 1.2, (1, 1, 1), 0.8, 0.0, {}),
    "wood_dark": (("wood", "wood_n", None), 1.2, (0.62, 0.55, 0.48), 0.85, 0.0, {}),
    "canvas_olive": (("tarp", "tarp_n", None), 2.0, (0.42, 0.46, 0.31), 0.95, 0.0, {}),
    "hazard": (("hazard", None, None), 1.0, (1, 1, 1), 0.6, 0.1, {}),
    "banner": (("banner", None, None), 1, (1, 1, 1), 0.9, 0.0, {"mask": True, "double": True}),
    "banner_wide": (("banner_wide", None, None), 1, (1, 1, 1), 0.9, 0.0, {}),
    "windows": (("windows", None, None), 1, (1, 1, 1), 0.25, 0.0, {"emit_tex": 1.6}),
    "glass": ((None, None, None), 1, (0.05, 0.065, 0.075), 0.12, 0.6, {}),
    "lamp": ((None, None, None), 1, (1.0, 0.82, 0.55), 0.4, 0.0, {"emit": 3.0}),
    "bulbs": (("bulbs", None, None), 1, (1, 1, 1), 0.4, 0.0, {"emit_tex": 4.0}),
    "wire": ((None, None, None), 1, (0.03, 0.03, 0.03), 0.6, 0.0, {"double": True}),
    "padmarks": (("padmarks", None, None), 1, (1, 1, 1), 0.7, 0.0, {"mask": True}),
    "pine": (("pine", None, None), 1.2, (1, 1, 1), 0.9, 0.0, {}),
    "pine_bark": (("pine_bark", None, None), 1.0, (1, 1, 1), 0.9, 0.0, {}),
    "mountain": (("mountain", None, None), 60.0, (1, 1, 1), 0.9, 0.0, {}),
}
# Tint families: variants that differ only by colour share one material (one draw call per
# section instead of one per colour); the colour rides on the vertex colour with the baked AO.
MATS["paint"] = (("steel_paint", "steel_paint_n", "steel_paint_r"), 1.5, (1, 1, 1), 0.55, 0.45, {})
MATS["corrugated"] = (("corrugated", "corrugated_n", "corrugated_r"), 2.4, (1, 1, 1), 0.55, 0.4, {})
TINT_FAMILY = {
    **{m: "paint" for m in ("steel", "steel_olive", "steel_blue", "steel_grey", "steel_yellow", "steel_red")},
    **{m: "corrugated" for m in ("container_red", "container_green", "container_blue", "container_orange",
                                 "cladding", "roof_metal")},
    **{m: "soviet" for m in ("soviet_dark", "soviet_warm", "concrete_wall")},
    "wood_dark": "wood",
}
K.MATS.clear()
K.MATS.update(MATS)
# AIM ARENA kit pieces reused as-is reference these names; map them onto the winter set.
MATS["concrete_wall"] = MATS["soviet"]
K.MATS["concrete_wall"] = MATS["soviet"]


def make_material(name):
    """arena_kit.make_material plus texture-driven emission and the ground light map (UV 2)."""
    m = bpy.data.materials.get(name)
    if m and m.get("frost"):
        return m
    m = m or K.make_material(name)
    m["frost"] = True
    extra = MATS[name][5]
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    if extra.get("emit_tex"):
        tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image.name.startswith(MATS[name][0][0]))
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = extra["emit_tex"]
    if extra.get("lightmap"):
        lm = nt.nodes.new("ShaderNodeTexImage")
        lm.image = K.image("lightpool")
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVLight"
        nt.links.new(uv.outputs["UV"], lm.inputs["Vector"])
        nt.links.new(lm.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 1.0
    return m


# ------------------------------------------------------------------------------- shared helpers
LAMPS = []  # (x, z, radius, power, colour) for the baked ground light map
ARENA = {"width": 40.0, "depth": 32.0}


def uvq(u0, u1, v0=0.0, v1=1.0, axis="z", sign=1):
    """UVs for quad_on so images read unmirrored from the facing side."""
    if (axis == "z" and sign < 0) or (axis == "x" and sign > 0):
        return [(u1, v0), (u0, v0), (u0, v1), (u1, v1)]
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def flush_box(sec, mat, axis, plane, sign, a0, a1, y0, y1, depth, chamfer=0.0):
    """A box standing proud of a facade by `depth` (its back face on the facade is dropped)."""
    q = plane + sign * depth
    lo, hi = min(plane, q), max(plane, q)
    back = ("-z" if sign > 0 else "+z") if axis == "z" else ("-x" if sign > 0 else "+x")
    if axis == "z":
        box(sec, mat, a0, a1, y0, y1, lo, hi, skip=(back,), chamfer=chamfer)
    else:
        box(sec, mat, lo, hi, y0, y1, a0, a1, skip=(back,), chamfer=chamfer)


def snow_cap(sec, x0, x1, z0, z1, y, t=0.07, over=0.03, cell=0.7, sides=("-x", "+x", "-z", "+z")):
    """Pillowy snow slab on a top face: subdivided bulging top, rounded overhanging edge, no
    bottom. `sides` lists the edges that overhang (others stop flush against a neighbour)."""
    gx0 = x0 - (over if "-x" in sides else 0)
    gx1 = x1 + (over if "+x" in sides else 0)
    gz0 = z0 - (over if "-z" in sides else 0)
    gz1 = z1 + (over if "+z" in sides else 0)
    nx = max(2, int(math.ceil((gx1 - gx0) / cell)))
    nz = max(2, int(math.ceil((gz1 - gz0) / cell)))
    seed = R.random() * 10

    def h(i, k):
        u, v = i / nx, k / nz
        edge = min(u, 1 - u, v, 1 - v)
        bulge = min(1.0, edge * min(nx, nz) * 0.9) ** 0.6
        wobble = 0.12 * math.sin(u * 7.1 + seed) * math.sin(v * 5.3 + seed * 1.7)
        return y + t * (0.35 + 0.65 * bulge + wobble * bulge)

    P = [[(gx0 + (gx1 - gx0) * i / nx, h(i, k), gz0 + (gz1 - gz0) * k / nz) for k in range(nz + 1)] for i in range(nx + 1)]
    for i in range(nx):
        for k in range(nz):
            face(sec, "snow", [P[i][k], P[i + 1][k], P[i + 1][k + 1], P[i][k + 1]], out=(0, 1, 0))
    # Edge band down to the solid's top plane (vertical, offset `over` from the solid's sides).
    for i in range(nx):
        for k, zz, sgn, side in ((0, gz0, -1, "-z"), (nz, gz1, 1, "+z")):
            a, b = P[i][k], P[i + 1][k]
            face(sec, "snow", [(a[0], y, zz), (b[0], y, zz), b, a], out=(0, 0, sgn))
    for k in range(nz):
        for i, xx, sgn in ((0, gx0, -1), (nx, gx1, 1)):
            a, b = P[i][k], P[i][k + 1]
            face(sec, "snow", [(xx, y, a[2]), (xx, y, b[2]), b, a], out=(sgn, 0, 0))


def ledge_snow(sec, axis, plane, sign, a0, a1, y, depth, t=0.04):
    """Thin snow on a ledge/sill of `depth` projecting from a facade (top at y)."""
    q = plane + sign * depth
    lo, hi = min(plane, q), max(plane, q)
    if axis == "z":
        snow_cap(sec, a0 + 0.02, a1 - 0.02, lo, hi, y, t=t, over=0.0, cell=0.6)
    else:
        snow_cap(sec, lo, hi, a0 + 0.02, a1 - 0.02, y, t=t, over=0.0, cell=0.6)


DRIFT_MAX = 0.16


def drift(sec, x0, x1, z0, z1, sides, depth=0.5, h=0.13, seg=0.5):
    """Ground snow piled against a solid's base: a sloped ramp from height ~h on the face to the
    ground `depth` out, with a wavy outer edge. Meets face and ground along lines only."""
    for side in sides:
        if side in ("-z", "+z"):
            zf, sgn, a0, a1 = (z0, -1, x0, x1) if side == "-z" else (z1, 1, x0, x1)
        else:
            zf, sgn, a0, a1 = (x0, -1, z0, z1) if side == "-x" else (x1, 1, z0, z1)
        n = max(1, int(math.ceil((a1 - a0) / seg)))
        seed = R.random() * 10
        pts = []
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            end = 0.0 if i in (0, n) else 1.0
            hh = h * (0.55 + 0.45 * math.sin(a * 2.3 + seed) ** 2) * (0.35 + 0.65 * end)
            dd = depth * (0.6 + 0.4 * math.sin(a * 1.7 + seed * 2) ** 2) * (0.4 + 0.6 * end)
            pts.append((a, min(DRIFT_MAX, hh), dd))
        for i in range(n):
            (a, hh, dd), (b, h2, d2) = pts[i], pts[i + 1]
            if side in ("-z", "+z"):
                quad = [(a, hh, zf), (b, h2, zf), (b, 0.0, zf + sgn * d2), (a, 0.0, zf + sgn * dd)]
                out = (0, 1, sgn)
            else:
                quad = [(zf, hh, a), (zf, h2, b), (zf + sgn * d2, 0.0, b), (zf + sgn * dd, 0.0, a)]
                out = (sgn, 1, 0)
            face(sec, "snow", quad, out=out)
        # Close the ramp ends (small triangles against the face).
        for (a, hh, dd) in (pts[0], pts[-1]):
            if hh > 0.005:
                pass


def icicles(sec, axis, plane, sign, a0, a1, y, every=0.35, length=0.3):
    """Icicles hanging under an eave/edge at height y (above reach), along a facade edge."""
    n = int((a1 - a0) / every)
    for i in range(n):
        if R.random() < 0.35:
            continue
        a = a0 + (i + 0.5) * (a1 - a0) / n + R.uniform(-0.08, 0.08)
        L = length * R.uniform(0.3, 1.0)
        px, pz = (a, plane) if axis == "z" else (plane, a)
        if abs(px) < 20.1 and abs(pz) < 16.1:
            # Inside the playable rectangle icicles stay above reach (2.9 m).
            L = min(L, y - 2.92)
            if L < 0.06:
                continue
        r = 0.025 * R.uniform(0.6, 1.2)
        c = plane + sign * 0.03
        if axis == "z":
            cylinder(sec, "ice", a, c, y - L, y, 0.002, r, n=4, caps=(False, False), tile=0.5)
        else:
            cylinder(sec, "ice", c, a, y - L, y, 0.002, r, n=4, caps=(False, False), tile=0.5)


def lamp(sec, axis, plane, sign, a, y, power=0.55, radius=3.2):
    """Wall lamp (arena_kit style) that also lights the snow via the baked ground light map."""
    K.lamp(sec, axis, plane, sign, a, y)
    if axis == "z":
        LAMPS.append((a, plane + sign * 1.2, radius, power, (1.0, 0.72, 0.42)))
    else:
        LAMPS.append((plane + sign * 1.2, a, radius, power, (1.0, 0.72, 0.42)))


def window(sec, axis, plane, sign, a, y, w, h, lit=None, frame="steel", sill=True):
    """Metal-framed window: lit (warm, emissive) or dark from the atlas, frame and snowy sill."""
    lit = (R.random() < 0.45) if lit is None else lit
    u0, u1 = (0.0, 0.5) if lit else (0.5, 1.0)
    quad_on(sec, "windows", axis, plane + sign * 0.012, sign, a - w / 2, a + w / 2, y, y + h,
            uvs=uvq(u0, u1, 0, 1, axis, sign))
    fr = 0.06
    for (b0, b1, c0, c1) in ((a - w / 2 - fr, a + w / 2 + fr, y + h, y + h + fr),
                             (a - w / 2 - fr, a - w / 2, y, y + h), (a + w / 2, a + w / 2 + fr, y, y + h)):
        flush_box(sec, frame, axis, plane, sign, b0, b1, c0, c1, 0.035)
    if sill:
        flush_box(sec, "soviet_dark", axis, plane, sign, a - w / 2 - 0.1, a + w / 2 + 0.1, y - 0.07, y, 0.05)
        ledge_snow(sec, axis, plane, sign, a - w / 2 - 0.1, a + w / 2 + 0.1, y, 0.05, t=0.025)
    if lit:
        if axis == "z":
            LAMPS.append((a, plane + sign * 1.4, 2.2, 0.18, (1.0, 0.75, 0.45)))
        else:
            LAMPS.append((plane + sign * 1.4, a, 2.2, 0.18, (1.0, 0.75, 0.45)))


def door(sec, axis, plane, sign, a, y0, w=1.1, h=2.15, mat="steel_grey"):
    quad_on(sec, mat, axis, plane + sign * 0.012, sign, a - w / 2, a + w / 2, y0, y0 + h, uvs=uvq(0, w / 1.5, 0, h / 1.5, axis, sign))
    # Kick plate, horizontal brace and handle (proud 2-3 cm).
    flush_box(sec, "steel", axis, plane, sign, a - w / 2 + 0.04, a + w / 2 - 0.04, y0 + 0.02, y0 + 0.25, 0.022)
    flush_box(sec, "steel", axis, plane, sign, a - w / 2 + 0.04, a + w / 2 - 0.04, y0 + h * 0.48, y0 + h * 0.52, 0.02)
    hx = a + (w / 2 - 0.14) * (1 if sign > 0 else -1) * (1 if axis == "z" else -1)
    flush_box(sec, "steel_grey", axis, plane, sign, hx - 0.02, hx + 0.02, y0 + 0.95, y0 + 1.12, 0.045)
    for (b0, b1, c0, c1) in ((a - w / 2 - 0.08, a + w / 2 + 0.08, y0 + h, y0 + h + 0.08),
                             (a - w / 2 - 0.08, a - w / 2, y0, y0 + h), (a + w / 2, a + w / 2 + 0.08, y0, y0 + h)):
        flush_box(sec, "steel", axis, plane, sign, b0, b1, c0, c1, 0.055)


def banner(sec, axis, plane, sign, a, y0, w, h):
    K.banner(sec, axis, plane, sign, a, y0, w, h)


BULB_UV = {"warm": 0.125, "amber": 0.375, "red": 0.625, "green": 0.875}


def light_string(sec, p0, p1, sag=0.25, spacing=0.3, palette=("warm", "warm", "amber", "red", "warm", "green")):
    """Festive string: a dark wire on a catenary-like sag with small emissive bulbs."""
    (x0, y0, z0), (x1, y1, z1) = p0, p1
    L = math.dist(p0, p1)
    n = max(2, int(L / spacing))
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - sag * 4 * t * (1 - t), z0 + (z1 - z0) * t))
    w = 0.006
    for i in range(n):
        a, b = pts[i], pts[i + 1]
        face(sec, "wire", [(a[0], a[1] + w, a[2]), (b[0], b[1] + w, b[2]), (b[0], b[1] - w, b[2]), (a[0], a[1] - w, a[2])],
             uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])
    for i in range(1, n):
        x, y, z = pts[i]
        u = BULB_UV[palette[(i + int(x0 * 3)) % len(palette)]]
        # Small tetrahedral bulb (4 triangles), hanging just under the wire.
        r = 0.024
        c = y - 0.012 - r
        t0 = (x, c - r * 1.4, z)
        b0, b1, b2 = (x + r, c + r * 0.5, z), (x - r * 0.5, c + r * 0.5, z + r * 0.87), (x - r * 0.5, c + r * 0.5, z - r * 0.87)
        uv = [(u, 0.5)] * 3
        for q0, q1 in ((b0, b1), (b1, b2), (b2, b0)):
            face(sec, "bulbs", [t0, q1, q0], out=((q0[0] + q1[0]) / 2 - x, -0.2, (q0[2] + q1[2]) / 2 - z), uvs=uv)
        face(sec, "bulbs", [b0, b1, b2], out=(0, 1, 0), uvs=uv)


# ------------------------------------------------------------------------------- dressing kinds
def body(sec, mat, s, extra_skip=()):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, mat, x0, x1, y0, y1, z0, z1, skip=("-y", "+y") + K.hidden() + tuple(extra_skip))


def cap_sides():
    return tuple(sd for sd in ("-x", "+x", "-z", "+z") if sd not in K.TOUCH)


def free_sides():
    return tuple(sd for sd in ("-x", "+x", "-z", "+z") if sd not in K.HIDE)


def soviet_building(sec, s, face_sign, storeys=2, theme="west", door_at=None, lit_bias=0.5, banner_at=None,
                    lights=True, roof_extra=None):
    """Precast concrete block on a band edge: plinth, panel facade, two window rows, cornice,
    snowy flat roof with parapet, icicles, lamps and a festive string along the cornice."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    zf = z1 if face_sign > 0 else z0
    body(sec, "soviet" if theme != "warm" else "soviet_warm", s)
    K.plinth(sec, "soviet_dark", x0, x1, z0, z1, h=0.45, out=0.04)
    # Cornice band and parapet; roof snow inside the parapet.
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.12)
    box(sec, "soviet_dark", gx0, gx1, y1 - 0.35, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.10, over=0.02, cell=0.8)
    icicles(sec, "z", zf + face_sign * 0.12, face_sign, x0, x1, y1 - 0.35)
    # Facade bays.
    bays = max(1, int((x1 - x0) / 3.0))
    blockers = [o for o in ALL_SOLIDS if o is not s and abs((o["z"] - o["d"] / 2 * face_sign) - zf) < 0.06
                and o["x"] - o["w"] / 2 < x1 and o["x"] + o["w"] / 2 > x0]

    def blocked(a0, a1, y):
        return any(o["x"] - o["w"] / 2 - 0.4 < a1 and o["x"] + o["w"] / 2 + 0.4 > a0 and o["y"] + o["h"] / 2 > y for o in blockers)

    for i in range(bays):
        a = x0 + (x1 - x0) * (i + 0.5) / bays
        if banner_at is not None and abs(a - banner_at) < 2.2:
            continue
        if storeys >= 2 and not blocked(a - 0.8, a + 0.8, 3.6):
            window(sec, "z", zf, face_sign, a, 3.8, 1.2, 1.3, lit=R.random() < lit_bias)
        if door_at is not None and abs(a - door_at) < 1.5:
            continue
        if not blocked(a - 0.8, a + 0.8, 0.6):
            window(sec, "z", zf, face_sign, a, 1.2, 1.2, 1.25, lit=R.random() < lit_bias * 0.8)
    if door_at is not None and not blocked(door_at - 0.7, door_at + 0.7, 0.4):
        door(sec, "z", zf, face_sign, door_at, 0.0)
        # Concrete canopy above the door (above reach) with snow and icicles.
        zq0, zq1 = sorted((zf, zf + face_sign * 0.9))
        box(sec, "soviet_dark", door_at - 1.0, door_at + 1.0, 3.2, 3.35, zq0, zq1)
        snow_cap(sec, door_at - 1.0, door_at + 1.0, zq0, zq1, 3.35, t=0.06, over=0.02, cell=0.5)
        icicles(sec, "z", zf + face_sign * 0.9, face_sign, door_at - 1.0, door_at + 1.0, 3.2, length=0.25)
        lamp(sec, "z", zf, face_sign, door_at + 1.3, 2.5)
    if banner_at is not None:
        banner(sec, "z", zf, face_sign, banner_at, 3.4, 2.2, 3.0)
    if lights:
        light_string(sec, (x0 + 0.3, y1 - 0.42, zf + face_sign * 0.16), (x1 - 0.3, y1 - 0.42, zf + face_sign * 0.16),
                     sag=0.35, spacing=0.32)
    drift(sec, x0, x1, z0, z1, ["+z" if face_sign > 0 else "-z"], depth=0.6, h=0.15)
    # Roof units (above the roof, inside the footprint).
    if roof_extra:
        roof_extra(sec, x0, x1, z0, z1, y1)


def roof_vents(sec, x0, x1, z0, z1, y):
    for i in range(int((x1 - x0) / 5)):
        cx = x0 + 2.5 + i * 5 + R.uniform(-0.6, 0.6)
        cz = (z0 + z1) / 2 + R.uniform(-0.4, 0.4)
        box(sec, "steel_grey", cx - 0.45, cx + 0.45, y + 0.05, y + 0.75, cz - 0.4, cz + 0.4, skip=("-y",))
        snow_cap(sec, cx - 0.45, cx + 0.45, cz - 0.4, cz + 0.4, y + 0.75, t=0.06, cell=0.5)


def comms_roof(sec, x0, x1, z0, z1, y):
    """Antenna masts with crossbars, a satellite dish and cable trays on the comms roof."""
    for (mx, mh) in ((x0 + 2.0, 6.5), (x1 - 3.0, 9.0)):
        mz = (z0 + z1) / 2
        cylinder(sec, "steel_grey", mx, mz, y, y + mh, 0.06, 0.04, n=6, caps=(False, True))
        for k in range(3):
            yy = y + mh * (0.5 + 0.15 * k)
            box(sec, "steel_grey", mx - 0.5 + 0.1 * k, mx + 0.5 - 0.1 * k, yy, yy + 0.04, mz - 0.02, mz + 0.02)
        # Red aviation light on top.
        box(sec, "lamp", mx - 0.05, mx + 0.05, y + mh, y + mh + 0.1, mz - 0.05, mz + 0.05)
    # Dish: a shallow cone on a stub, tilted toward the sky (faces the courtyard side).
    cx, cz = (x0 + x1) / 2 + 3.0, (z0 + z1) / 2
    cylinder(sec, "steel_grey", cx, cz, y, y + 0.9, 0.12, n=8)
    n = 14
    rim, depth = 1.0, 0.35
    centre = (cx, y + 1.6, cz + 0.2)
    tilt = 0.6
    ring = []
    for i in range(n):
        ang = 2 * math.pi * i / n
        px, pz = math.cos(ang) * rim, math.sin(ang) * rim
        ring.append((centre[0] + px, centre[1] + pz * math.sin(tilt), centre[2] + pz * math.cos(tilt) * -1 + 0.0))
    apex = (centre[0], centre[1] - depth * math.cos(tilt), centre[2] - depth * math.sin(tilt) * -1)
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]
        face(sec, "steel_grey", [apex, a, b], out=(0, math.cos(tilt), math.sin(tilt)))
        face(sec, "steel_grey", [apex, b, a], out=(0, -math.cos(tilt), -math.sin(tilt)))
    roof_vents(sec, x0 + 4, x1 - 6, z0, z1, y)


def watchtower(sec, s):
    """East north band: the watchtower block. A tall shaft at the east end rising to a lit cabin
    with a PVPSPINARENA banner and an antenna; the rest is a concrete block like the barracks."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    soviet_building(sec, s, 1, theme="west", door_at=x0 + 2.0, lit_bias=0.5, roof_extra=roof_vents)
    tx0, tx1, tz0, tz1 = x1 - 4.2, x1 - 0.4, z0 + 0.2, z1 - 0.2
    top = 12.5
    box(sec, "soviet", tx0, tx1, y1, top, tz0, tz1, skip=("-y",))
    for yy in (8.0, 10.2):
        window(sec, "z", tz1, 1, (tx0 + tx1) / 2 - 0.9, yy, 1.0, 1.2, lit=True)
        window(sec, "z", tz1, 1, (tx0 + tx1) / 2 + 0.9, yy, 1.0, 1.2, lit=yy > 9)
    # Cabin: overhanging slab, glazed band, roof with snow and antenna.
    box(sec, "soviet_dark", tx0 - 0.4, tx1 + 0.4, top, top + 0.25, tz0 - 0.4, tz1 + 0.4)
    cy0 = top + 0.25
    box(sec, "steel", tx0 - 0.3, tx1 + 0.3, cy0, cy0 + 0.6, tz0 - 0.3, tz1 + 0.3)
    for ax, pl, sg, a0, a1 in (("z", tz1 + 0.3, 1, tx0 - 0.3, tx1 + 0.3), ("x", tx0 - 0.3, -1, tz0 - 0.3, tz1 + 0.3),
                               ("z", tz0 - 0.3, -1, tx0 - 0.3, tx1 + 0.3), ("x", tx1 + 0.3, 1, tz0 - 0.3, tz1 + 0.3)):
        quad_on(sec, "windows", ax, pl + sg * 0.005, sg, a0, a1, cy0 + 0.6, cy0 + 1.7, uvs=uvq(0, 0.5, 0, 1, ax, sg))
    box(sec, "steel", tx0 - 0.3, tx1 + 0.3, cy0 + 1.7, cy0 + 2.0, tz0 - 0.3, tz1 + 0.3)
    box(sec, "soviet_dark", tx0 - 0.6, tx1 + 0.6, cy0 + 2.0, cy0 + 2.2, tz0 - 0.6, tz1 + 0.6)
    snow_cap(sec, tx0 - 0.6, tx1 + 0.6, tz0 - 0.6, tz1 + 0.6, cy0 + 2.2, t=0.14, cell=0.8)
    icicles(sec, "z", tz1 + 0.6, 1, tx0 - 0.6, tx1 + 0.6, cy0 + 2.0)
    mx, mz = tx1 - 0.6, (tz0 + tz1) / 2
    cylinder(sec, "steel_grey", mx, mz, cy0 + 2.2, cy0 + 7.0, 0.05, 0.03, n=6)
    box(sec, "lamp", mx - 0.05, mx + 0.05, cy0 + 7.0, cy0 + 7.1, mz - 0.05, mz + 0.05)
    # Long vertical banner down the tower shaft's courtyard face.
    quad_on(sec, "banner", "z", tz1 + 0.02, 1, (tx0 + tx1) / 2 - 1.3, (tx0 + tx1) / 2 + 1.3, y1 + 0.4, 7.6,
            uvs=uvq(0, 1, 0, 1, "z", 1))
    # Floodlight on the cabin facing the courtyard.
    box(sec, "steel", tx0 + 0.4, tx0 + 0.8, cy0 + 0.1, cy0 + 0.5, tz1 + 0.3, tz1 + 0.6)
    quad_on(sec, "lamp", "z", tz1 + 0.61, 1, tx0 + 0.45, tx0 + 0.75, cy0 + 0.15, cy0 + 0.45)


def comms_building(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    zf = z1
    body(sec, "soviet", s)
    K.plinth(sec, "soviet_dark", x0, x1, z0, z1, h=0.45, out=0.04)
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.15)
    box(sec, "soviet_dark", gx0, gx1, y1 - 0.4, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.12, over=0.02, cell=0.8)
    icicles(sec, "z", zf + 0.15, 1, x0, x1, y1 - 0.4)
    # Walkway level: the steel door the walkway serves (deck at 1.5 m) and lit windows either side.
    door(sec, "z", zf, 1, 0.0, 1.5, w=1.4, h=2.2, mat="steel_blue")
    for a in (-3.2, 3.2):
        window(sec, "z", zf, 1, a, 2.2, 1.3, 1.1, lit=True)
    # Upper floor: hero banner centred, windows outside it.
    quad_on(sec, "banner_wide", "z", zf + 0.02, 1, -3.4, 3.4, 4.25, 5.95, uvs=uvq(0, 1, 0, 1, "z", 1))
    box(sec, "steel", -3.5, 3.5, 5.95, 6.02, zf, zf + 0.06)
    for a in (-6.4, 6.4):
        window(sec, "z", zf, 1, a, 4.4, 1.2, 1.3, lit=a < 0)
    for a in (-6.4, 6.4):
        window(sec, "z", zf, 1, a, 1.2, 1.1, 1.2, lit=False)
        # Electrical boxes on the ground floor (flush, 5 cm).
    for a in (-5.6, 5.6):
        flush_box(sec, "steel_grey", "z", zf, 1, a - 0.35, a + 0.35, 1.6, 2.5, 0.05)
        quad_on(sec, "hazard", "z", zf + 0.052, 1, a - 0.12, a + 0.12, 2.25, 2.42, uvs=uvq(0, 0.3, 0, 0.3, "z", 1))
    lamp(sec, "z", zf, 1, -1.3, 4.0, power=0.7)
    lamp(sec, "z", zf, 1, 1.3, 4.0, power=0.7)
    light_string(sec, (x0 + 0.3, y1 - 0.48, zf + 0.2), (0.0, y1 - 0.48, zf + 0.2), sag=0.4)
    light_string(sec, (0.0, y1 - 0.48, zf + 0.2), (x1 - 0.3, y1 - 0.48, zf + 0.2), sag=0.4)
    comms_roof(sec, x0, x1, z0, z1, y1)


def walkway(sec, s):
    """Concrete deck on a plinth, icy deck top with a steel nosing; snow piles in the corners."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "soviet_dark", x0, x1, y0, y1 - 0.08, z0, z1, skip=("-y", "+y") + K.hidden())
    box(sec, "ice", x0, x1, y1 - 0.08, y1, z0, z1, skip=("-y",) + K.hidden())
    # Steel nosing along the corridor edge (under the railing).
    box(sec, "steel_yellow", x0, x1, y1 - 0.12, y1 - 0.04, z1, z1 + 0.03, skip=("-z",))
    # Snow piled against the comms wall on the deck (not cover: 12 cm, inside the deck).
    drift_on_deck(sec, x0, x1, z0, y1)
    # Support columns visible on the corridor face (flush relief).
    for a in (x0 + 0.4, 0.0, x1 - 0.4):
        flush_box(sec, "soviet", "z", z1, 1, a - 0.2, a + 0.2, 0.0, y1 - 0.12, 0.04)


def drift_on_deck(sec, x0, x1, zwall, y):
    n = int((x1 - x0) / 0.5)
    for i in range(n):
        a, b = x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n
        h0 = 0.10 + 0.04 * math.sin(a * 1.9)
        h1 = 0.10 + 0.04 * math.sin(b * 1.9)
        face(sec, "snow", [(a, y + h0, zwall), (b, y + h1, zwall), (b, y, zwall + 0.35), (a, y, zwall + 0.35)], out=(0, 1, 1))


def stair(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "soviet_dark", x0, x1, y0, y1 - 0.05, z0, z1, skip=("-y", "+y") + K.hidden())
    box(sec, "soviet", x0, x1, y1 - 0.05, y1, z0, z1, skip=("-y",) + K.hidden())
    # Snow on the back of each tread (against the comms wall), leaving the walking line clear.
    snow_cap(sec, x0 + 0.02, x1 - 0.02, z0, z0 + 0.35, y1, t=0.05, over=0.0, cell=0.4)


def railing(sec, s):
    """Solid steel railing (the collision box is solid, so is the look): kick plate, mesh-look
    panels, posts and top rail, snow on the rail."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel_grey", x0, x1, y0, y1 - 0.08, z0 + 0.03, z1 - 0.03, skip=("-y",))
    box(sec, "steel_yellow", x0, x1, y1 - 0.08, y1, z0, z1, chamfer=0.01)
    n = int((x1 - x0) / 1.5)
    for i in range(n + 1):
        a = x0 + (x1 - x0) * i / n
        a0, a1 = max(x0 + 0.01, a - 0.04), min(x1 - 0.01, a + 0.04)
        box(sec, "steel", a0, a1, y0, y1 - 0.08, z0, z1, skip=("-y", "+y"))
    snow_cap(sec, x0, x1, z0, z1, y1, t=0.035, over=0.0, cell=0.6)
    for k in range(n):
        a = x0 + (x1 - x0) * (k + 0.5) / n
        quad_on(sec, "hazard", "z", z1 - 0.025, 1, a - 0.25, a + 0.25, y0 + 0.75, y0 + 0.88, uvs=uvq(0, 0.5, 0, 0.13, "z", 1))
    # Festive string along the rail's courtyard face (inside the 6 cm envelope).
    light_string(sec, (x0 + 0.1, y1 - 0.1, z1 + 0.02), (x1 - 0.1, y1 - 0.1, z1 + 0.02), sag=0.03, spacing=0.36)


def fence(sec, s):
    """PO-2 precast fence: panel faces, posts every 2.4 m, coping, snow and drifts."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "fence", x0, x1, y0, y1 - 0.1, z0, z1, skip=("-y", "+y") + K.hidden())
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.03)
    box(sec, "soviet_dark", gx0, gx1, y1 - 0.1, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.06, over=0.0, cell=0.6, sides=cap_sides())
    n = max(1, round((x1 - x0) / 2.4))
    for i in range(n + 1):
        a = x0 + (x1 - x0) * i / n
        a0, a1 = max(x0, a - 0.12), min(x1, a + 0.12)
        if a1 - a0 < 0.05:
            continue
        for zf, sg in ((z0, -1), (z1, 1)):
            if ("-z" if sg < 0 else "+z") in K.HIDE:
                continue
            flush_box(sec, "soviet_dark", "z", zf, sg, a0, a1, 0.0, y1 - 0.1, 0.035)
    drift(sec, x0, x1, z0, z1, [sd for sd in ("-z", "+z") if sd not in K.TOUCH])


def spawn_shield(sec, s, theme):
    """Precast T-wall blast barrier with the PVPSPINARENA banner on the spawn side."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "soviet", x0, x1, y0, y1 - 0.06, z0, z1, skip=("-y", "+y"))
    box(sec, "hazard", x0 - 0.012, x1 + 0.012, 0.0, 0.3, z0 - 0.012, z1 + 0.012, skip=("-y", "+y"))
    snow_cap(sec, x0, x1, z0, z1, y1 - 0.06, t=0.08, over=0.03, cell=0.5)
    spawn_x, sg = (x0, -1) if theme == "west" else (x1, 1)
    banner(sec, "x", spawn_x, sg, (z0 + z1) / 2, 0.5, 1.2, 1.9)
    # Lifting loops on top and panel joints.
    for zz in (z0 + 1.0, z1 - 1.0):
        for side_x, ssg in ((x0, -1), (x1, 1)):
            flush_box(sec, "soviet_dark", "x", side_x, ssg, zz - 0.04, zz + 0.04, 0.3, y1 - 0.06, 0.02)
    drift(sec, x0, x1, z0, z1, ["-x", "+x"])


def guard_hut(sec, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    mat = "soviet_warm" if theme == "west" else "cladding"
    body(sec, mat, s)
    if theme == "west":
        K.plinth(sec, "soviet_dark", x0, x1, z0, z1, h=0.35, out=0.03)
    else:
        box(sec, "hazard", x0 - 0.015, x1 + 0.015, 0.0, 0.3, z0 - 0.015, z1 + 0.015, skip=("-y", "+y") + K.hidden())
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.05)
    box(sec, "steel" if theme != "west" else "soviet_dark", gx0, gx1, y1 - 0.2, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.12, over=0.0, cell=0.6)
    # Spawn-side window and door (faces the spawn pad: +z side for the north hut).
    cx = (x0 + x1) / 2
    zf, sg = (z1, 1) if s["z"] < 0 else (z0, -1)
    window(sec, "z", zf, sg, cx - 1.2, 1.1, 1.3, 1.0, lit=True, frame="steel")
    door(sec, "z", zf, sg, cx + 1.2, 0.0, w=1.0, h=2.05, mat="steel_olive" if theme == "west" else "steel_grey")
    courtyard_x, csg = (x1, 1) if theme == "west" else (x0, -1)
    window(sec, "x", courtyard_x, csg, (z0 + z1) / 2, 1.2, 1.0, 0.9, lit=False)
    lamp(sec, "z", zf, sg, cx, 2.6, power=0.6)
    icicles(sec, "z", zf + sg * 0.05, sg, x0, x1, y1 - 0.2, length=0.22)
    drift(sec, x0, x1, z0, z1, [sd for sd in free_sides()])


def container_kind(sec, s, mat):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    K.container(sec, s, mat, doors_toward=-1 if s["x"] > 0 else 1)
    snow_cap(sec, x0 + 0.02, x1 - 0.02, z0 + 0.02, z1 - 0.02, y1 - 0.02, t=0.09, over=0.03, cell=0.6)
    drift(sec, x0, x1, z0, z1, list(free_sides()), depth=0.45, h=0.12)
    # Ice sheets down the corrugated sides? Keep the silhouette: only icicles under the roof rail (> 2.4 m).
    for side, (pl, sg, a0, a1) in (("-z", (z0, -1, x0 + 0.2, x1 - 0.2)), ("+z", (z1, 1, x0 + 0.2, x1 - 0.2))):
        if side not in K.HIDE and (a1 - a0) > 1.5:
            icicles(sec, "z", pl + sg * 0.0, sg, a0, a1, y1 - 0.12, every=0.4, length=0.18)


def crate_stack(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    K.crate_stack(sec, s)
    snow_cap(sec, x0 + 0.01, x1 - 0.01, z0 + 0.01, z1 - 0.01, y1 - 0.01, t=0.08, over=0.03, cell=0.5)
    drift(sec, x0, x1, z0, z1, list(free_sides()), depth=0.4, h=0.1)


def crate(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    nx = max(1, round((x1 - x0) / 1.3))
    if nx > 1:
        box(sec, "wood", x0 + 0.06, x1 - 0.06, y0, y1 - 0.06, z0 + 0.06, z1 - 0.06, skip=("-y",))
    for i in range(nx):
        K.crate(sec, x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx, y0, y1, z0, z1)
    snow_cap(sec, x0 + 0.01, x1 - 0.01, z0 + 0.01, z1 - 0.01, y1 - 0.01, t=0.07, over=0.03, cell=0.4)
    drift(sec, x0, x1, z0, z1, list(free_sides()), depth=0.35, h=0.09)


def generator_stack(sec, s):
    """Centre: a diesel generator set in an olive enclosure with louvres, fuel tank, control
    panel and exhaust; work-light mast and festive string on top (above the cover)."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel_olive", x0, x1, 0.25, y1 - 0.08, z0, z1, skip=("-y", "+y"))
    box(sec, "steel", x0, x1, 0.0, 0.25, z0, z1, skip=("-y",))  # skid
    box(sec, "steel_olive", x0 - 0.03, x1 + 0.03, y1 - 0.08, y1, z0 - 0.03, z1 + 0.03, chamfer=0.015)
    snow_cap(sec, x0 - 0.03, x1 + 0.03, z0 - 0.03, z1 + 0.03, y1, t=0.10, over=0.0, cell=0.5)
    # Louvre grilles on the long faces (dark recesses, slats proud 3 cm).
    for xf, sg in ((x0, -1), (x1, 1)):
        for k in range(2):
            zc = z0 + (z1 - z0) * (0.28 + 0.44 * k)
            quad_on(sec, "steel", "x", xf + sg * 0.008, sg, zc - 0.6, zc + 0.6, 0.6, 2.0)
            for j in range(9):
                yy = 0.68 + j * 0.15
                flush_box(sec, "steel_olive", "x", xf, sg, zc - 0.6, zc + 0.6, yy, yy + 0.05, 0.03)
    # Control panel and hazard decal on the courtyard ends.
    for zf, sg in ((z0, -1), (z1, 1)):
        flush_box(sec, "steel_grey", "z", zf, sg, -0.5, 0.5, 0.9, 1.7, 0.04)
        quad_on(sec, "lamp", "z", zf + sg * 0.052, sg, -0.35, -0.25, 1.5, 1.58)
        quad_on(sec, "hazard", "z", zf + sg * 0.012, sg, x0 + 0.1, x1 - 0.1, 0.3, 0.42, uvs=uvq(0, 3, 0, 0.12, "z", sg))
    # Exhaust stack and work-light mast (above the top: hides nothing).
    cylinder(sec, "steel", x1 - 0.5, z0 + 0.6, y1, y1 + 0.9, 0.09, n=8, caps=(False, True))
    mx, mz = x0 + 0.4, z1 - 0.4
    cylinder(sec, "steel_grey", mx, mz, y1, y1 + 2.4, 0.05, 0.04, n=6)
    box(sec, "steel", mx - 0.5, mx + 0.5, y1 + 2.4, y1 + 2.48, mz - 0.03, mz + 0.03)
    for dx in (-0.4, 0.4):
        box(sec, "steel", mx + dx - 0.13, mx + dx + 0.13, y1 + 2.48, y1 + 2.72, mz - 0.1, mz + 0.06)
        quad_on(sec, "lamp", "z", mz - 0.105, -1, mx + dx - 0.1, mx + dx + 0.1, y1 + 2.52, y1 + 2.68)
    LAMPS.append(((x0 + x1) / 2, (z0 + z1) / 2, 5.5, 0.32, (1.0, 0.86, 0.66)))
    light_string(sec, (mx, y1 + 2.3, mz), (x1 - 0.1, y1 + 0.15, z0 + 0.1), sag=0.2)
    light_string(sec, (mx, y1 + 2.3, mz), (x1 - 0.1, y1 + 0.15, z1 - 0.1), sag=0.2)
    drift(sec, x0, x1, z0, z1, ["-x", "+x", "-z", "+z"], depth=0.55, h=0.13)


def transformer(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel_grey", x0 + 0.06, x1 - 0.06, 0.3, y1 - 0.25, z0 + 0.06, z1 - 0.06, skip=("-y",))
    box(sec, "soviet_dark", x0, x1, 0.0, 0.3, z0, z1, skip=("-y",))  # plinth
    # Cooling fins fill the envelope on the long faces.
    for zf, sg in ((z0, -1), (z1, 1)):
        n = 14
        for i in range(n):
            a = x0 + 0.15 + (x1 - x0 - 0.3) * (i + 0.5) / n
            zi = zf + 0.06 * -sg
            lo, hi = sorted((zi, zf))
            box(sec, "steel_grey", a - 0.02, a + 0.02, 0.45, y1 - 0.45, lo, hi)
        quad_on(sec, "hazard", "z", zf + sg * 0.006, sg, (x0 + x1) / 2 - 0.2, (x0 + x1) / 2 + 0.2, 1.4, 1.75, uvs=uvq(0, 0.4, 0, 0.35, "z", sg))
    box(sec, "steel_grey", x0, x1, y1 - 0.25, y1, z0, z1, chamfer=0.02)
    snow_cap(sec, x0, x1, z0, z1, y1, t=0.08, over=0.03, cell=0.5)
    # Insulators on top.
    for i in range(3):
        cx = x0 + (x1 - x0) * (i + 1) / 4
        cylinder(sec, "steel_red", cx, (z0 + z1) / 2, y1 + 0.08, y1 + 0.6, 0.07, 0.05, n=8)
    drift(sec, x0, x1, z0, z1, ["-x", "+x", "-z", "+z"], depth=0.45, h=0.12)


def truck(sec, s):
    """Snowed-in army truck (cab east, canvas bed west) filling the cover box; snow is piled
    under the chassis so the bulletproof volume reads as solid."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    cab = x1 - 1.45
    # Chassis and snow bank under it.
    box(sec, "steel", x0 + 0.05, x1 - 0.05, 0.45, 0.85, z0 + 0.25, z1 - 0.25, skip=())
    box(sec, "snow", x0 + 0.02, x1 - 0.02, 0.0, 0.5, z0 + 0.05, z1 - 0.05, skip=("-y",), chamfer=0.12)
    # Wheels (dark), proud of the bank.
    for wx in (x0 + 0.7, x0 + 1.7, x1 - 0.8):
        for zf, sg in ((z0, -1), (z1, 1)):
            zc = zf - sg * 0.18
            for i in range(10):
                a0 = 2 * math.pi * i / 10
                a1 = 2 * math.pi * (i + 1) / 10
                r = 0.5
                p = lambda a, zz: (wx + r * math.cos(a), 0.52 + r * math.sin(a), zz)
                face(sec, "rubber", [p(a0, zc), p(a1, zc), p(a1, zf), p(a0, zf)], out=(math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0))
            pts = [(wx + 0.5 * math.cos(2 * math.pi * i / 10), 0.52 + 0.5 * math.sin(2 * math.pi * i / 10), zf) for i in range(10)]
            face(sec, "rubber", pts, out=(0, 0, sg))
            face(sec, "steel_olive", [(wx + 0.25 * math.cos(2 * math.pi * i / 8), 0.52 + 0.25 * math.sin(2 * math.pi * i / 8), zf + sg * 0.01) for i in range(8)], out=(0, 0, sg))
    # Cab: olive steel, windscreen, hood, snow on the roof.
    box(sec, "steel_olive", cab, x1, 0.85, 2.45, z0 + 0.04, z1 - 0.04, skip=("-y",))
    quad_on(sec, "glass", "x", x1 + 0.008, 1, z0 + 0.2, z1 - 0.2, 1.65, 2.3)
    for zf, sg in ((z0 + 0.04, -1), (z1 - 0.04, 1)):
        quad_on(sec, "glass", "z", zf + sg * 0.008, sg, cab + 0.15, cab + 0.95, 1.7, 2.3)
    snow_cap(sec, cab, x1, z0 + 0.04, z1 - 0.04, 2.45, t=0.12, over=0.02, cell=0.5)
    box(sec, "steel", x1 - 0.06, x1 + 0.025, 0.6, 1.2, z0 + 0.1, z1 - 0.1)  # bumper
    for zz in (z0 + 0.35, z1 - 0.35):
        quad_on(sec, "lamp", "x", x1 + 0.006, 1, zz - 0.12, zz + 0.12, 1.25, 1.4)
    # Bed: steel sides and a canvas tilt over hoops (full box height: solid cover).
    box(sec, "steel_olive", x0, cab - 0.05, 0.85, 1.35, z0 + 0.05, z1 - 0.05, skip=("-y",))
    n = 6

    def tilt(i, k):
        u, v = i / n, k / n
        x = x0 + 0.02 + (cab - 0.07 - x0 - 0.02) * u
        ang = math.pi * v
        zc, rz = (z0 + z1) / 2, (z1 - z0) / 2 - 0.02
        sag = 0.04 * math.sin(u * math.pi * 4) ** 2
        return (x, 1.35 + (y1 - 0.12 - 1.35) * math.sin(ang) ** 0.3 - sag * math.sin(ang), zc - rz * math.cos(ang))

    for i in range(n):
        for k in range(n):
            face(sec, "canvas_olive", [tilt(i, k), tilt(i + 1, k), tilt(i + 1, k + 1), tilt(i, k + 1)], out=(0, 1, (k + 0.5) / n * 2 - 1))
    for xx, sg in ((x0 + 0.02, -1), (cab - 0.07, 1)):
        ring = [tilt(0 if sg < 0 else n, k) for k in range(n + 1)]
        face(sec, "canvas_olive", [(xx, 1.35, z0 + 0.02)] + [(xx, p[1], p[2]) for p in ring] + [(xx, 1.35, z1 - 0.02)], out=(sg, 0, 0))
    # Snow lying on the tilt: a curved layer 4-9 cm above the canvas over its upper half.
    for i in range(n):
        for k in range(1, n - 1):
            def lift(p, kk):
                return (p[0], p[1] + 0.04 + 0.05 * math.sin(math.pi * kk / n), p[2])
            face(sec, "snow", [lift(tilt(i, k), k), lift(tilt(i + 1, k), k), lift(tilt(i + 1, k + 1), k + 1),
                               lift(tilt(i, k + 1), k + 1)], out=(0, 1, (k + 0.5) / n * 2 - 1))
    drift(sec, x0, x1, z0, z1, ["-z", "+z", "-x", "+x"], depth=0.5, h=0.14)


def tote(sec, s):
    """IBC tote (1000 l): white tank in a galvanised cage on a steel pallet. The cage sits on the
    collision faces, the tank 3 cm inside, so the cover reads as solid from every side."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel_grey", x0, x1, 0.0, 0.14, z0, z1, skip=("-y",))
    top = y1 - 0.07
    box(sec, "tote_tank", x0 + 0.03, x1 - 0.03, 0.14, top, z0 + 0.03, z1 - 0.03, skip=("-y",), chamfer=0.04)
    cylinder(sec, "steel_grey", (x0 + x1) / 2, (z0 + z1) / 2, top, top + 0.05, 0.12, n=10)
    b = 0.018
    for yy in (0.42, 0.72, top - 0.01):
        for (ax0, ax1, az0, az1) in ((x0, x1, z0, z0 + b), (x0, x1, z1 - b, z1), (x0, x0 + b, z0 + b, z1 - b), (x1 - b, x1, z0 + b, z1 - b)):
            box(sec, "steel_grey", ax0, ax1, yy - 0.015, yy + 0.015, az0, az1)
    # Uprights 4 mm inside the rails (never sharing a plane with them); corners once.
    for i in range(4):
        t = i / 3
        e = 0.004
        posts = [(x0 + e + (x1 - x0 - b - 2 * e) * t, z0 + e), (x0 + e + (x1 - x0 - b - 2 * e) * t, z1 - b - e)]
        if 0 < i < 3:
            posts += [(x0 + e, z0 + e + (z1 - z0 - b - 2 * e) * t), (x1 - b - e, z0 + e + (z1 - z0 - b - 2 * e) * t)]
        for (px, pz) in posts:
            box(sec, "steel_grey", px, px + b, 0.14, top + 0.01, pz, pz + b, skip=("-y",))
    # Outlet valve at the bottom of the courtyard-facing side (inside the cage).
    zc = z0 + 0.03
    cylinder(sec, "steel_red", (x0 + x1) / 2, zc + 0.01, 0.2, 0.3, 0.035, n=8)
    snow_cap(sec, x0 + 0.05, x1 - 0.05, z0 + 0.05, z1 - 0.05, top, t=0.06, over=0.0, cell=0.5)
    drift(sec, x0, x1, z0, z1, list(free_sides()), depth=0.35, h=0.1)


def jersey(sec, s):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    K.jersey(sec, s)
    snow_cap(sec, x0 + 0.05, x1 - 0.05, z0 + (z1 - z0) * 0.11, z1 - (z1 - z0) * 0.11, y1, t=0.05, over=0.0, cell=0.5)
    drift(sec, x0, x1, z0, z1, ["-z", "+z"], depth=0.4, h=0.1)


def annex(sec, s, theme):
    """Barracks annex (entrance block) / east stair house: door toward the corridor."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    body(sec, "soviet" if theme == "west" else "cladding", s)
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.08)
    box(sec, "soviet_dark" if theme == "west" else "steel", gx0, gx1, y1 - 0.22, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.12, over=0.0, cell=0.6)
    door(sec, "z", z1, 1, (x0 + x1) / 2, 0.0, w=1.2, h=2.2, mat="steel_olive" if theme == "west" else "steel_blue")
    lamp(sec, "z", z1, 1, x0 + 0.5 if theme == "west" else x1 - 0.5, 2.55)
    icicles(sec, "z", z1 + 0.08, 1, x0, x1, y1 - 0.22, length=0.25)
    cside, csg = (x1, 1) if theme == "west" else (x0, -1)
    window(sec, "x", cside, csg, (z0 + z1) / 2, 1.5, 0.9, 1.0, lit=True)
    drift(sec, x0, x1, z0, z1, list(free_sides()))


def guardhouse(sec, s, theme):
    """South band west: a long concrete guardhouse facing the lower corridor."""
    soviet_building(sec, s, -1, theme="warm", door_at=s["x"] + 2.4, lit_bias=0.55, roof_extra=roof_vents)


def shed(sec, s):
    """South band east: corrugated industrial shed with a roll-up door and strip windows."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    zf = z0
    body(sec, "cladding", s)
    bx0, bx1, bz0, bz1 = grow(x0, x1, z0, z1, 0.03)
    box(sec, "soviet_dark", bx0, bx1, 0.0, 0.5, bz0, bz1, skip=("-y", "+y") + K.hidden())
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.08)
    box(sec, "steel", gx0, gx1, y1 - 0.2, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.12, over=0.0, cell=0.8)
    a = (x0 + x1) / 2
    quad_on(sec, "roof_metal", "z", zf - 0.015, -1, a - 1.6, a + 1.6, 0.5, 3.4, uvs=uvq(0, 1.3, 0, 1.4, "z", -1))
    box(sec, "steel_yellow", a - 1.75, a + 1.75, 3.4, 3.6, zf - 0.05, zf)
    quad_on(sec, "windows", "z", zf - 0.012, -1, x0 + 0.6, a - 2.4, 4.0, 4.8, uvs=uvq(0, 0.5, 0, 1, "z", -1))
    quad_on(sec, "windows", "z", zf - 0.012, -1, a + 2.4, x1 - 0.6, 4.0, 4.8, uvs=uvq(0.5, 1, 0, 1, "z", -1))
    lamp(sec, "z", zf, -1, a - 2.2, 3.2)
    lamp(sec, "z", zf, -1, a + 2.2, 3.2)
    icicles(sec, "z", zf - 0.08, -1, x0, x1, y1 - 0.2)
    light_string(sec, (x0 + 0.3, y1 - 0.3, zf - 0.12), (x1 - 0.3, y1 - 0.3, zf - 0.12), sag=0.4)
    banner(sec, "z", zf, -1, x1 - 1.4, 1.0, 1.1, 2.0)


def warehouse_end(sec, s, theme):
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    body(sec, "cladding", s)
    box(sec, "soviet_dark", x0, x1, 0.0, 0.6, z0 - 0.03, z0, skip=("-y", "+z"))
    gx0, gx1, gz0, gz1 = grow(x0, x1, z0, z1, 0.05)
    box(sec, "steel", gx0, gx1, y1 - 0.2, y1, gz0, gz1, skip=K.hidden())
    snow_cap(sec, gx0, gx1, gz0, gz1, y1, t=0.10, over=0.0, cell=0.6)
    inner, sg = (x1, 1) if theme == "west" else (x0, -1)
    lamp(sec, "x", inner, sg, z0 + 1.2, 3.1, power=0.5)
    drift(sec, x0, x1, z0, z1, ["-z"])


def warehouse_roof(sec, s):
    """Loading-bay canopy (bullet-only solid above the bay): corrugated top under snow, steel
    fascia beam with the festive string, and the warehouse front rising behind it."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel", x0, x1, y0, y0 + 0.12, z0, z0 + 0.25)  # fascia beam
    box(sec, "roof_metal", x0, x1, y0 + 0.12, y1, z0, z1, skip=("+z",))
    snow_cap(sec, x0, x1, z0, z1, y1, t=0.16, over=0.0, cell=0.8)
    icicles(sec, "z", z0, -1, x0, x1, y0, every=0.3, length=0.35)
    light_string(sec, (x0 + 0.2, y0 - 0.02, z0 - 0.01), (x1 - 0.2, y0 - 0.02, z0 - 0.01), sag=0.3, spacing=0.3)
    # Warehouse front above the canopy (z = 16, outside the playable rectangle).
    wz = 16.0
    box("background", "cladding", -7.96, 7.96, y1, 8.6, wz - 0.02, wz + 8.0, skip=("-y",))
    quad_on("background", "banner_wide", "z", wz - 0.04, -1, -5.6, 5.6, 4.6, 7.4, uvs=uvq(0, 1, 0, 1, "z", -1))
    box("background", "steel", -5.7, 5.7, 7.4, 7.5, wz - 0.08, wz - 0.02, skip=("+z",))
    snow_cap("background", -8.0, 8.0, wz, wz + 8.0, 8.6, t=0.2, over=0.05, cell=1.6)
    icicles("background", "z", wz - 0.05, -1, -8.0, 8.0, 8.6)
    for a in (-6.5, 6.5):
        lamp("background", "z", wz, -1, a, 6.0, power=0.0)
    # Back wall of the bay (the boundary, z = 16): roll-up doors flush on the wall.
    for a in (-4.0, 0.0, 4.0):
        quad_on("perimeter", "roof_metal", "z", wz - 0.012, -1, a - 1.5, a + 1.5, 0.0, 3.3, uvs=uvq(0, 1.2, 0, 1.4, "z", -1))
    box("perimeter", "steel_yellow", -7.0, 7.0, 3.3, 3.45, wz - 0.05, wz, skip=("+z",))
    quad_on("perimeter", "soviet_dark", "z", wz - 0.006, -1, -7.0, 7.0, 0.0, 3.3, uvs=uvq(0, 4.6, 0, 1.1, "z", -1))
    LAMPS.append((0.0, 14.6, 4.5, 0.35, (1.0, 0.8, 0.55)))


def pillar(sec, s):
    """Square hollow-section steel column filling its collision box, bolted base, hazard wrap."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    box(sec, "steel", x0 + 0.01, x1 - 0.01, 0.3, y1, z0 + 0.01, z1 - 0.01, skip=("-y",), chamfer=0.02)
    box(sec, "hazard", x0, x1, 0.0, 0.3, z0, z1, skip=("-y", "+y"))
    snow_cap(sec, x0 + 0.01, x1 - 0.01, z0 + 0.01, z1 - 0.01, y1, t=0.04, over=0.0, cell=0.4)


def pallets(sec, s):
    """Pallet stack under a strapped canvas-wrapped load, filling the cover box."""
    x0, x1, y0, y1, z0, z1 = faces_of(s)
    j = 0
    while j * 0.15 + 0.13 <= y1 - 0.42:
        yy = j * 0.15
        box(sec, "wood_dark", x0 + 0.02 * (j % 2), x1 - 0.02 * ((j + 1) % 2), yy, yy + 0.13, z0, z1, skip=("-y",) if j == 0 else ())
        j += 1
    box(sec, "canvas_olive", x0 + 0.05, x1 - 0.05, y1 - 0.4, y1 - 0.26, z0 + 0.05, z1 - 0.05, skip=("-y",))
    box(sec, "wood", x0 + 0.1, x1 - 0.1, y1 - 0.26, y1, z0 + 0.1, z1 - 0.1, skip=("-y",))


def dress(L, sec, s):
    kind, theme = s["kind"], s.get("theme") or "centre"
    K.TOUCH = K.touching(s, L["solids"] + L["walls"])
    K.HIDE = K.touching(s, L["solids"] + L["walls"], full=True)
    if kind == "barracks":
        if theme == "west":
            soviet_building(sec, s, 1, door_at=-10.5, lit_bias=0.6, roof_extra=roof_vents)
        else:
            watchtower(sec, s)
    elif kind == "comms-building":
        comms_building(sec, s)
    elif kind == "guardhouse":
        guardhouse(sec, s, theme)
    elif kind == "shed":
        shed(sec, s)
    elif kind == "warehouse-end":
        warehouse_end(sec, s, theme)
    elif kind == "warehouse-roof":
        warehouse_roof(sec, s)
    elif kind == "pillar":
        pillar(sec, s)
    elif kind == "pallets":
        pallets(sec, s)
    elif kind == "walkway":
        walkway(sec, s)
    elif kind == "stair":
        stair(sec, s)
    elif kind == "railing":
        railing(sec, s)
    elif kind == "fence":
        fence(sec, s)
    elif kind == "spawn-shield":
        spawn_shield(sec, s, theme)
    elif kind in ("guard-hut", "cabin"):
        guard_hut(sec, s, theme)
    elif kind == "annex":
        annex(sec, s, theme)
    elif kind == "container":
        mat = {"fuel-store-w": "container_blue", "fuel-store-e": "container_blue", "lane-container-w": "container_red",
               "lane-container-e": "container_green", "corridor-container-w": "container_orange",
               "corridor-container-e": "container_blue"}.get(s["id"], "container_green")
        container_kind(sec, s, mat)
    elif kind == "crate-stack":
        crate_stack(sec, s)
    elif kind == "crate":
        crate(sec, s)
    elif kind == "generator-stack":
        generator_stack(sec, s)
    elif kind == "transformer":
        transformer(sec, s)
    elif kind == "truck":
        truck(sec, s)
    elif kind == "tote":
        tote(sec, s)
    elif kind == "jersey-barrier":
        jersey(sec, s)
    else:
        box(sec, "soviet", *faces_of(s), skip=("-y",))
    K.TOUCH = set()
    K.HIDE = set()


# ------------------------------------------------------------------------------- ground, perimeter
def ground(A, solids, walls):
    """Trodden snow over the playable rectangle on a 0.5 m grid (baked AO from every solid), the
    spawn pads (icy concrete with worn paint), and a second UV set for the baked light map."""
    import numpy as np
    hw, hd = A["width"] / 2, A["depth"] / 2
    step = 0.5
    xs = np.arange(-hw, hw + 1e-6, step)
    zs = np.arange(-hd, hd + 1e-6, step)
    gx, gz = np.meshgrid(xs, zs, indexing="ij")
    dist = np.full(gx.shape, 9.0)
    for o in list(solids) + list(walls):
        if o["y"] - o["h"] / 2 > 0.05 or o["h"] < 0.4:
            continue
        dx = np.maximum(np.abs(gx - o["x"]) - o["w"] / 2, 0)
        dz = np.maximum(np.abs(gz - o["z"]) - o["d"] / 2, 0)
        dist = np.minimum(dist, np.hypot(dx, dz))
    ao = 1 - 0.32 * np.exp(-dist / 0.5)
    for i in range(len(xs)):
        for k in range(len(zs)):
            K.AO[(round(float(xs[i]), 3), round(float(zs[k]), 3))] = float(ao[i, k])
    for i in range(len(xs) - 1):
        for k in range(len(zs) - 1):
            x0, x1, z0, z1 = float(xs[i]), float(xs[i + 1]), float(zs[k]), float(zs[k + 1])
            cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
            if any(abs(cx - o["x"]) + step / 2 <= o["w"] / 2 and abs(cz - o["z"]) + step / 2 <= o["d"] / 2
                   and o["y"] - o["h"] / 2 < 0.05 for o in solids):
                continue
            face("ground", "snowpack", [(x0, 0, z0), (x0, 0, z1), (x1, 0, z1), (x1, 0, z0)], out=(0, 1, 0), offset=(0, 0))
    # Spawn pads: icy cleared concrete (8 mm) with worn paint (alpha-tested, 15 mm) above the snow.
    for sx, u0 in ((-18.2, 0.0), (18.2, 0.5)):
        face("ground", "ice", [(sx - 1.8, 0.008, -2.9), (sx - 1.8, 0.008, 2.9), (sx + 1.8, 0.008, 2.9), (sx + 1.8, 0.008, -2.9)],
             out=(0, 1, 0))
        x0, x1, z0, z1 = sx - 1.5, sx + 1.5, -1.5, 1.5
        if sx < 0:
            # Read facing +x (toward the courtyard): image up = +x, image right = +z.
            pts = [(x0, 0.015, z0), (x0, 0.015, z1), (x1, 0.015, z1), (x1, 0.015, z0)]
        else:
            # Read facing -x: image up = -x, image right = -z.
            pts = [(x1, 0.015, z1), (x1, 0.015, z0), (x0, 0.015, z0), (x0, 0.015, z1)]
        face("ground", "padmarks", pts, out=(0, 1, 0), uvs=[(u0, 0), (u0 + 0.5, 0), (u0 + 0.5, 1), (u0, 1)])
        LAMPS.append((sx, 0.0, 3.0, 0.12, (0.9, 0.95, 1.0)))


def perimeter(L):
    """West/east boundary behind the spawns: a concrete wall (3.2 m) topped by chain-link and
    barbed wire to the bullet height, floodlight poles; north/south: building backs."""
    for w in L["walls"]:
        x0, x1, y0, y1, z0, z1 = faces_of(w)
        if w["id"] in ("wall-west", "wall-east"):
            east = w["id"] == "wall-east"
            inner = x0 if east else x1
            sign = -1 if east else 1
            box("perimeter", "fence", x0, x1, 0, 3.2, z0, z1, skip=("-y", "+y"))
            box("perimeter", "soviet_dark", x0 - 0.04, x1 + 0.04, 3.2, 3.32, z0, z1)
            snow_cap("perimeter", x0 - 0.04, x1 + 0.04, z0, z1, 3.32, t=0.07, over=0.0, cell=1.2)
            # Chain-link: posts and a dark mesh band (single quads facing in), barbed wire on top.
            for k in range(int((z1 - z0) / 2.8) + 1):
                zz = z0 + k * 2.8
                box("perimeter", "steel", inner - sign * 0.3 - 0.04, inner - sign * 0.3 + 0.04, 3.32, 5.6, zz - 0.04, zz + 0.04)
            quad_on("perimeter", "wire", "x", inner - sign * 0.3, sign, z0, z1, 3.5, 5.3, uvs=uvq(0, 1, 0, 1, "x", sign))
            for yy in (5.45, 5.6):
                box("perimeter", "steel", inner - sign * 0.3 - 0.01, inner - sign * 0.3 + 0.01, yy, yy + 0.02, z0, z1)
            # Spawn wall: banner and lamps (light the pads), festive string.
            banner("perimeter", "x", inner, sign, 0.0, 0.6, 1.6, 2.4)
            for zz in (-6.5, 6.5):
                lamp("perimeter", "x", inner, sign, zz, 2.6, power=0.55)
            light_string("perimeter", (inner + sign * 0.08, 3.1, -12.0), (inner + sign * 0.08, 3.1, -2.0), sag=0.35)
            light_string("perimeter", (inner + sign * 0.08, 3.1, 2.0), (inner + sign * 0.08, 3.1, 12.0), sag=0.35)
            drift("perimeter", x0, x1, z0, z1, ["+x" if not east else "-x"], depth=0.6, h=0.15)
        else:
            # North/south: concrete backs and roofs of the band buildings beyond the boundary.
            zsg = -1 if z0 < 0 else 1
            inner = "+z" if zsg < 0 else "-z"
            # The north inner face is hidden by the band; the south one is the loading bay's back wall.
            box("perimeter", "soviet", -20.4, 20.4, 0, 6.4, min(z0, z0 + zsg * 4), max(z1, z1 + zsg * 4),
                skip=("-y", "+y") + ((inner,) if zsg < 0 else ()))
            snow_cap("perimeter", -20.4, 20.4, min(z0, z0 + zsg * 4), max(z1, z1 + zsg * 4), 6.4, t=0.1, cell=2.0)


# ------------------------------------------------------------------------------- background
def terrain(L):
    """Snow fields beyond the walls: a coarse rolling ring out to 140 m, low near the walls."""
    hw, hd = L["arena"]["width"] / 2 + 0.8, L["arena"]["depth"] / 2 + 0.8
    rings = [0, 6, 14, 28, 50, 85, 140]

    def height(x, z, r):
        if r <= 6:
            return 0.0
        n = math.sin(x * 0.05 + 1.3) * math.cos(z * 0.06 + 0.4) + 0.5 * math.sin(x * 0.11 + z * 0.07)
        return max(0.0, (r - 6) * 0.06 + n * min(1.0, (r - 6) / 20) * 3.0)

    segs = 40
    for j in range(len(rings) - 1):
        r0, r1 = rings[j], rings[j + 1]
        for i in range(segs):
            a0, a1 = 2 * math.pi * i / segs, 2 * math.pi * (i + 1) / segs

            def P(a, r):
                # Squircle around the arena rectangle so the first ring hugs the walls.
                cx, sz = math.cos(a), math.sin(a)
                k = max(abs(cx) / hw, abs(sz) / hd) if r == 0 else 0
                if r == 0:
                    x, z = cx / k, sz / k
                else:
                    base = 1 / max(abs(cx) / hw, abs(sz) / hd)
                    x, z = cx * (base + r), sz * (base + r)
                return (x, height(x, z, r), z)

            p00, p10, p11, p01 = P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1)
            face("background", "snow", [p00, p10, p11, p01], out=(0, 1, 0), tile=6.0)


def mountains():
    """Ridges on the horizon (110-230 m): jagged low-poly bands, snow fields over rock."""
    for (cx, cz, length, height, yaw, depth) in (
        (-30, -128, 200, 50, 0.08, 34), (84, -112, 150, 38, -0.6, 34), (142, 15, 170, 46, 1.45, 34),
        (90, 135, 180, 36, 2.6, 34), (-60, 142, 200, 44, 3.1, 34), (-150, 22, 175, 52, 1.6, 34),
        (-128, -90, 140, 32, 0.9, 34)):
        n = 22
        ca, sa = math.cos(yaw), math.sin(yaw)
        prof = []
        for i in range(n + 1):
            t = i / n
            peak = height * (0.45 + 0.55 * math.sin(t * math.pi)) * (0.75 + 0.25 * math.sin(i * 1.7 + cx * 0.01)) * (
                0.85 + 0.15 * math.sin(i * 3.1))
            prof.append((-length / 2 + length * t, peak))
        def W(u, y, v):
            return (cx + u * ca - v * sa, y, cz + u * sa + v * ca)
        for i in range(n):
            (u0, h0), (u1, h1) = prof[i], prof[i + 1]
            mid0 = (u0 + 0.0, h0 * 0.55, -depth * 0.25)
            front = [W(u0, -2, depth), W(u1, -2, depth), W(u1, h1, 0), W(u0, h0, 0)]
            face("background", "mountain", front, out=(-sa, 0.4, ca), tile=60.0)
            back = [W(u0, h0, 0), W(u1, h1, 0), W(u1, -2, -depth), W(u0, -2, -depth)]
            face("background", "mountain", back, out=(sa, 0.4, -ca), tile=60.0)


PINE_SPOTS = []


def pine_mesh():
    """One snow-laden pine: trunk + 6 jagged cone tiers (needles) with snow caps on each tier."""
    saved, K.BUCKETS = K.BUCKETS, {}
    cylinder("pine", "pine_bark", 0, 0, 0, 2.0, 0.22, 0.16, n=7, caps=(False, False), tile=1.5)
    tiers = 5
    for t in range(tiers):
        f = t / tiers
        y0 = 1.2 + f * 7.5
        r = 3.0 * (1 - f) + 0.6
        top = y0 + 2.6 - f * 0.5
        n = 10
        rim = []
        for i in range(n):
            a = 2 * math.pi * i / n + t * 0.4
            rr = r * (1.0 if i % 2 == 0 else 0.78)
            rim.append((rr * math.cos(a), y0 - (0.25 if i % 2 == 0 else 0.05), rr * math.sin(a)))
        apex = (0, top, 0)
        for i in range(n):
            a, b = rim[i], rim[(i + 1) % n]
            face("pine", "pine", [apex, b, a], out=((a[0] + b[0]) / 2, 0.6, (a[2] + b[2]) / 2), tile=1.2)
            face("pine", "pine", [(0, y0 + 0.3, 0), a, b], out=(0, -1, 0), tile=1.2)
        # Snow cap: an inner cone hugging the upper 60% of the tier, 4 cm proud of the needles.
        snow_rim = []
        for i in range(n):
            a = 2 * math.pi * i / n + t * 0.4 + 0.13
            rr = r * (0.62 if i % 2 == 0 else 0.5)
            k = rr / r
            ys = top - (top - y0) * k + 0.05 + (0.04 if i % 3 == 0 else 0)
            snow_rim.append((rr * math.cos(a), ys, rr * math.sin(a)))
        sapex = (0, top + 0.06, 0)
        for i in range(n):
            a, b = snow_rim[i], snow_rim[(i + 1) % n]
            face("pine", "snow", [sapex, b, a], out=((a[0] + b[0]) / 2, 0.8, (a[2] + b[2]) / 2), tile=2.0)
    built, K.BUCKETS = K.BUCKETS, saved
    return built


def christmas_tree(x, z, scale=1.15):
    """A decorated pine outside the boundary (north-west corner): warm strings ringing each
    tier just outside the needles, and a lit star."""
    PINE_SPOTS.append((x, z, scale, 0.3))
    sec = "background"
    for t in range(5):
        f = t / 5
        y0 = 1.2 + f * 7.5
        r = 3.0 * (1 - f) + 0.6
        top = y0 + 2.6 - f * 0.5
        y = y0 + 0.45
        rad = r * (top - y) / (top - y0) + 0.1
        n = 16
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            light_string(sec, (x + rad * scale * math.cos(a0), y * scale, z + rad * scale * math.sin(a0)),
                         (x + rad * scale * math.cos(a1), y * scale, z + rad * scale * math.sin(a1)),
                         sag=0.06, spacing=0.45, palette=("warm", "amber", "red", "warm", "green"))
    top = (1.2 + 4 / 5 * 7.5 + 2.6 - 4 / 5 * 0.5) * scale
    box(sec, "lamp", x - 0.18, x + 0.18, top + 0.05, top + 0.45, z - 0.18, z + 0.18)


def utility_pole(x, z, h=9.0):
    sec = "background"
    cylinder(sec, "wood_dark", x, z, 0, h, 0.14, 0.11, n=7)
    box(sec, "wood_dark", x - 1.1, x + 1.1, h - 0.6, h - 0.45, z - 0.06, z + 0.06)
    for dx in (-0.9, 0.0, 0.9):
        cylinder(sec, "steel_grey", x + dx, z, h - 0.45, h - 0.25, 0.04, n=5)
    snow_cap(sec, x - 1.1, x + 1.1, z - 0.06, z + 0.06, h - 0.45, t=0.03, over=0.0, cell=0.8)


def distant_structures():
    sec = "background"
    # Radar dome and a hangar on the eastern ridge, a pylon line to the south-west.
    cx, cz, r = 95, -60, 7
    for j in range(6):
        a0, a1 = math.pi / 2 * j / 6, math.pi / 2 * (j + 1) / 6
        cylinder(sec, "snow", cx, cz, 12 + r * math.sin(a0), 12 + r * math.sin(a1), r * math.cos(a0), r * math.cos(a1),
                 n=16, caps=(False, False), tile=6)
    cylinder(sec, "soviet", cx, cz, 0, 12, r * 0.85, n=16, caps=(False, False), tile=4)
    box(sec, "cladding", 70, 95, 0, 9, 40, 58, skip=("-y",))
    snow_cap(sec, 70, 95, 40, 58, 9, t=0.3, cell=4.0)
    for i in range(5):
        x, z = -60 - i * 28, 70 + i * 18
        for dx in (-2.0, 2.0):
            box(sec, "steel_grey", x + dx - 0.15, x + dx + 0.15, 0, 22, z - 0.15, z + 0.15, skip=("-y",))
        box(sec, "steel_grey", x - 4.5, x + 4.5, 20, 20.4, z - 0.2, z + 0.2)
    for (x, z) in ((-34, -28), (34, 30), (-36, 24)):
        box(sec, "soviet", x - 1.5, x + 1.5, 0, 8, z - 1.5, z + 1.5, skip=("-y",))
        box(sec, "steel", x - 2.0, x + 2.0, 8, 8.2, z - 2.0, z + 2.0)
        box(sec, "steel", x - 1.8, x + 1.8, 8.2, 9.4, z - 1.8, z + 1.8, skip=("-y",))
        quad_on(sec, "windows", "z", z + 1.83, 1, x - 1.6, x + 1.6, 8.3, 9.2, uvs=uvq(0, 0.5, 0, 1, "z", 1))
        box(sec, "soviet_dark", x - 2.2, x + 2.2, 9.4, 9.6, z - 2.2, z + 2.2)
        snow_cap(sec, x - 2.2, x + 2.2, z - 2.2, z + 2.2, 9.6, t=0.15, cell=1.5)


CROSSING = [
    # Festive strings across the corridors, from band facades down to fence posts (above reach
    # except where they meet the fence top, inside the fence's footprint).
    ((-11.0, 5.9, -13.4), (-11.0, 2.95, -9.58)), ((11.0, 5.9, -13.4), (11.0, 2.95, -9.58)),
    ((-5.0, 6.5, -13.35), (-4.0, 2.95, -9.58)), ((5.0, 6.5, -13.35), (4.0, 2.95, -9.58)),
    ((-10.8, 5.1, 13.4), (-10.8, 2.95, 9.58)), ((10.8, 5.1, 13.4), (10.8, 2.95, 9.58)),
    ((-5.0, 3.58, 13.25), (-4.2, 2.95, 9.58)), ((5.0, 3.58, 13.25), (4.2, 2.95, 9.58)),
]


def background(L):
    for p0, p1 in CROSSING:
        sec = K.section_of((p0[0] + p1[0]) / 2, (p0[2] + p1[2]) / 2)
        light_string(sec, p0, p1, sag=0.25, spacing=0.34)
        # Steel stub on the fence coping that carries the string end.
        box(K.section_of(p1[0], p1[2]), "steel", p1[0] - 0.025, p1[0] + 0.025, 2.4, p1[1] + 0.02, p1[2] - 0.025, p1[2] + 0.025)
    terrain(L)
    mountains()
    distant_structures()
    for z in (-26, -8, 8, 26):
        utility_pole(-24.5, z)
        utility_pole(24.5, z)
    for i in range(3):
        light_string("background", (-24.5, 8.6, -26 + i * 18 + 0.0), (-24.5, 8.6, -8 + i * 18), sag=0.9, spacing=0.6,
                     palette=("warm",))
    christmas_tree(-23.5, -19.5)
    hw, hd = L["arena"]["width"] / 2, L["arena"]["depth"] / 2
    # Pine belts around the compound (outside the walls), denser further out.
    rr = random.Random(5)
    for ring, count in ((4.0, 26), (12.0, 32), (24.0, 38)):
        for i in range(count):
            a = 2 * math.pi * i / count + rr.uniform(-0.05, 0.05)
            base = 1 / max(abs(math.cos(a)) / (hw + 1), abs(math.sin(a)) / (hd + 1))
            r = base + ring + rr.uniform(0, 7)
            x, z = math.cos(a) * r, math.sin(a) * r
            if abs(x + 23.5) < 4 and abs(z + 19.5) < 4:
                continue
            PINE_SPOTS.append((x, z, rr.uniform(0.75, 1.35), rr.uniform(0, math.tau)))


# ------------------------------------------------------------------------------- build
ALL_SOLIDS = []


def validate(L):
    """arena_kit.validate with the ground-snow exception (drifts below DRIFT_MAX)."""
    bad = K.validate(L)
    return [b for b in bad if b[2][1] > DRIFT_MAX + 1e-6]


FACE_TINT = {}  # bucket key -> per-face linear RGB multiplier (tint families)


def merge_tint_families():
    """Fold each tint family's buckets into its base material's bucket, per section."""
    merged = {}
    for (sec, mat, sh), b in list(K.BUCKETS.items()):
        base = TINT_FAMILY.get(mat, mat)
        tint = MATS[mat][2] if mat in TINT_FAMILY else (1, 1, 1)
        key = (sec, base, sh)
        d = merged.setdefault(key, K.Bucket())
        start = len(d.verts)
        d.verts.extend(b.verts)
        d.faces.extend(tuple(i + start for i in f) for f in b.faces)
        d.uvs.extend(b.uvs)
        FACE_TINT.setdefault(key, []).extend([tint] * len(b.faces))
    K.BUCKETS.clear()
    K.BUCKETS.update(merged)


def emit_bucket(name, b, mat, to_blender, ground=False, tints=None):
    """arena_kit.emit_bucket (UVs, baked AO as linear vertex colour, flat shading) with per-face
    tints multiplied into the vertex colour, and the frost material set."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([to_blender(*v) for v in b.verts], [], b.faces)
    uv = me.uv_layers.new(name="UVMap")
    for poly, uvs in zip(me.polygons, b.uvs):
        for li, (u, v) in zip(poly.loop_indices, uvs):
            uv.data[li].uv = (u, v)
    col = me.color_attributes.new("Color", "BYTE_COLOR", "CORNER")
    for pi, poly in enumerate(me.polygons):
        tr, tg, tb = tints[pi] if tints else (1, 1, 1)
        for li in poly.loop_indices:
            x, y, z = b.verts[me.loops[li].vertex_index]
            if name.startswith("ground"):
                a = K.AO.get((round(x, 3), round(z, 3)), 1.0)
            elif name.startswith("pine") or mat in ("lamp", "banner", "banner_wide", "glass"):
                a = 1.0
            else:
                t = min(1.0, max(0.0, y / 1.4))
                a = 0.74 + 0.26 * t * t * (3 - 2 * t)
            # Snow takes lighter AO; emissive and decal surfaces none.
            if mat == "snow":
                a = 0.86 + 0.14 * min(1.0, max(0.0, (a - 0.74) / 0.26))
            elif mat in ("bulbs", "windows", "lamp", "padmarks", "wire"):
                a = 1.0
            col.data[li].color = (a * tr, a * tg, a * tb, 1.0)
    me.materials.append(make_material(mat))
    for p in me.polygons:
        p.use_smooth = False
    # Snow and emissive surfaces: lighter AO than the arena's masonry rule.
    if mat in ("snow", "bulbs", "windows", "lamp", "padmarks", "wire"):
        col = me.color_attributes["Color"]
        for li, c in enumerate(col.data):
            v = c.color[0]
            v = 1.0 if mat != "snow" else 0.86 + 0.14 * min(1.0, (v - 0.74) / 0.26)
            c.color = (v, v, v, 1.0)
    if ground:
        uv = me.uv_layers.new(name="UVLight")
        W, D = ARENA["width"] + 4, ARENA["depth"] + 4
        for poly in me.polygons:
            for li in poly.loop_indices:
                x, y, z = b.verts[me.loops[li].vertex_index]
                # glTF v = z / D + 0.5 (image rows run +z); Blender stores v flipped.
                uv.data[li].uv = (x / W + 0.5, 1 - (z / D + 0.5))
        me.uv_layers.active = me.uv_layers["UVMap"]
    me.validate(clean_customdata=False)
    return me


def build(L, section, to_blender):
    K.BUCKETS.clear()
    ARENA.update(L["arena"])
    ALL_SOLIDS[:] = L["solids"]
    K.ALL_SOLIDS[:] = L["solids"]
    for s in L["solids"]:
        dress(L, K.section_of(s["x"], s["z"]), s)
    ground(L["arena"], L["solids"], L["walls"])
    perimeter(L)
    background(L)
    # Baked ground light map from every lamp / lit window placed above.
    lamps_path = os.path.join(HERE, "build", "lamps.json")
    json.dump({"arena": L["arena"], "lamps": LAMPS}, open(lamps_path, "w"))
    import importlib.util
    spec = importlib.util.spec_from_file_location("frost_textures", os.path.join(HERE, "textures.py"))
    FT = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(FT)
    FT.lightpool(lamps_path)
    bad = validate(L)
    if bad:
        print(f"VALIDATE: {len(bad)} dressing vertices outside collision (first 12):")
        seen = {}
        for b in bad:
            seen.setdefault((b[0], b[1]), []).append(b[2])
        for k, v in list(seen.items())[:12]:
            print("   ", k, len(v), v[:3])
    else:
        print("VALIDATE: dressing matches collision within 6 cm below 2.9 m (ground snow excepted)")
    merge_tint_families()
    for key in [k for k in K.BUCKETS if k[0] not in ("ground", "background", "perimeter")]:
        b = K.BUCKETS[key]
        if sum(len(f) - 2 for f in b.faces) < 400:
            dkey = ("details", key[1], key[2])
            d = K.BUCKETS.setdefault(dkey, K.Bucket())
            base = len(d.verts)
            d.verts.extend(b.verts)
            d.faces.extend(tuple(i + base for i in f) for f in b.faces)
            d.uvs.extend(b.uvs)
            FACE_TINT.setdefault(dkey, []).extend(FACE_TINT.pop(key, [(1, 1, 1)] * len(b.faces)))
            del K.BUCKETS[key]
    stats = {"triangles": 0}
    for (sec, mat, shadow), b in list(K.BUCKETS.items()):
        me = emit_bucket(f"{sec}-{mat}", b, mat, to_blender, ground=(sec == "ground" and mat == "snowpack"),
                         tints=FACE_TINT.get((sec, mat, shadow)))
        o = bpy.data.objects.new(me.name, me)
        if sec == "background" or mat in ("bulbs", "wire", "windows", "lamp", "padmarks"):
            o["noShadow"] = True
        section(sec).objects.link(o)
        stats["triangles"] += sum(len(f) - 2 for f in b.faces)
    pine = pine_mesh()
    meshes = {mat: emit_bucket(f"pine-{mat}", b, mat, to_blender) for (_, mat, _), b in pine.items()}
    pine_tris = sum(sum(len(f) - 2 for f in b.faces) for b in pine.values())
    for i, (x, z, scale, yaw) in enumerate(PINE_SPOTS):
        for mat, me in meshes.items():
            o = bpy.data.objects.new(f"pine-{i}-{mat}", me)
            o.location = to_blender(x, 0, z)
            o.rotation_euler = (0, 0, yaw)
            o.scale = (scale, scale, scale)
            o["instance"] = True
            o["noShadow"] = True
            section("background").objects.link(o)
    stats["triangles"] += pine_tris * len(PINE_SPOTS)
    stats["pines"] = len(PINE_SPOTS)
    stats["violations"] = len(bad)
    stats["lamps"] = len(LAMPS)
    print("KIT STATS", stats)
    return stats
