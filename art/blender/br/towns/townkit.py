"""
The rebuilt first towns' houses (owner, 2026-11-27: "re-build 4 major citys … i dont want to
have the sketch houses because they are boring no secound floors … build 12 diffrent
apartment/houses for each nighberhood with multible floors and roof topps, diffrent design from
current own build buildings in bayview"; "build in blender in the cloud").

The geometry kit the designs (designs.py) are written in: plain Python, no Blender. A building is
one or more volumes (boxes of storeys on one plinth: a main block, a wing, a tower, a porch-top
room) sharing one storey height, so their floors line up and a door on an upper floor can open
on to a lower volume's roof. Each volume has its own roof: flat (a parapet or a rail round a
deck), gable, hip, pyramid, gambrel, shed (one slope) or a mansard ring round a flat deck.
Every storey is reached by a stair (straight flights stacked in one footprint, as the island's
other procedural buildings), and every building has a roof top someone can stand on: a deck on
its flat roof (a stair house over the top flight), a lower volume's roof (a terrace), a tower
top or a porch roof.

Parts are boxes, polygons and cylinders in game model space (metres, y up, front +z at turn 0,
pivot at the bottom centre), each with a material key, a tint (linear) and a level of detail:

  near   the near LOD only: walls with their openings, interiors, stairs, trim
  shell  the near and middle LODs: roofs, plinths, balconies, porches, chimneys, roof plant
  mid    the middle LOD only: each storey's walls whole, the openings as dark panes on them
  far    the far LOD (one draw; the far facade atlas textures it later)

and collision is axis-aligned boxes (the game's solids). blend.py turns the parts into Blender
meshes; build_towns.mjs turns Blender's export into the game's three LODs.
"""
import math

SLAB = 0.22
RISE_MAX = 0.19
TREAD = 0.27
# Interior surfaces (the game paints each placement's walls and floors its own way:
# interior-style.ts; these are what the middle LOD and Blender's renders show).
INT = (0.92, 0.88, 0.8)
CEIL = (0.95, 0.94, 0.91)
FLO = (0.62, 0.46, 0.32)
DARK_GLASS = (0.07, 0.09, 0.11)
DARK_DOOR = (0.16, 0.11, 0.08)
GLASS = (0.3, 0.4, 0.46)

OPP = {"front": "back", "back": "front", "left": "right", "right": "left"}


def flight_len(h):
    return math.ceil(h / RISE_MAX - 1e-9) * TREAD


def r3(v):
    return round(v + 0.0, 3)


class Kit:
    """Recorded parts and collision boxes."""

    def __init__(self):
        self.parts = []
        self.solids = []

    def box(self, b, m, tint=(1, 1, 1), lod="shell", collide=True, visible=True, skip=(), faces=None):
        x0, x1 = sorted((b[0], b[3]))
        y0, y1 = sorted((b[1], b[4]))
        z0, z1 = sorted((b[2], b[5]))
        bb = [r3(x0), r3(y0), r3(z0), r3(x1), r3(y1), r3(z1)]
        if bb[3] - bb[0] < 1e-3 or bb[4] - bb[1] < 1e-3 or bb[5] - bb[2] < 1e-3:
            return
        if visible:
            self.parts.append(
                {"t": "box", "b": bb, "m": m, "tint": tuple(tint), "lod": lod, "skip": set(skip), "faces": faces or {}}
            )
        if collide:
            self.solids.append(bb)

    def poly(self, pts, m, tint=(1, 1, 1), lod="shell", both=False):
        """A planar polygon, counter-clockwise seen from the side it shows."""
        p = [tuple(r3(c) for c in q) for q in pts]
        self.parts.append({"t": "poly", "p": p, "m": m, "tint": tuple(tint), "lod": lod})
        if both:
            self.parts.append({"t": "poly", "p": list(reversed(p)), "m": m, "tint": tuple(tint), "lod": lod})

    def cyl(self, cx, cz, r, y0, y1, m, tint=(1, 1, 1), lod="shell", seg=8, collide=True, top=True):
        self.parts.append(
            {"t": "cyl", "c": (r3(cx), r3(cz)), "r": r, "y": (r3(y0), r3(y1)), "seg": seg, "m": m,
             "tint": tuple(tint), "lod": lod, "top": top}
        )
        if collide:
            q = r * 0.9
            self.solids.append([r3(cx - q), r3(y0), r3(cz - q), r3(cx + q), r3(y1), r3(cz + q)])

    def beam(self, a, b, w, h, m, tint=(1, 1, 1), lod="near"):
        """A sloped bar between two points (a rail, a stringer), drawn only."""
        self.parts.append({"t": "beam", "a": tuple(map(r3, a)), "b": tuple(map(r3, b)), "w": w, "h": h, "m": m,
                           "tint": tuple(tint), "lod": lod})

    def flight(self, axis, a0, a1, c0, c1, y, rise, m, tint=(1, 1, 1), lod="near", cc=None):
        """A straight flight from a0 to a1, rising `rise` from y: its treads drawn (no thicker
        than 0.35 m, so a flight stacked above leaves head room), its collision a ramp of 5 cm
        slices a quarter riser over the line through the treads' backs (as the fortress's and
        Blackwater's stairs: tread boxes jolted the body a riser every other tick). `cc`: the ramp's
        extent across (c0, c1), where the treads run along a wall: the ramp stops short of it, so a
        window there (a breakable pane, glass_panes.mjs) does not cut every slice in two."""
        rc0, rc1 = cc or (c0, c1)
        steps = math.ceil(rise / RISE_MAX - 1e-9)
        run = (a1 - a0) / steps
        r = rise / steps
        for k in range(steps):
            pa = a0 + k * run
            pb = pa + run
            top = y + (k + 1) * r
            lo = max(y, top - 0.35)
            self.box([pa, lo, c0, pb, top, c1] if axis == "x" else [c0, lo, pa, c1, top, pb], m, tint, lod, collide=False)
        length = abs(a1 - a0)
        tread = length / steps
        d = 1 if a1 > a0 else -1
        count = max(1, math.ceil(rise / 0.05))
        for i in range(count):
            d0, d1 = length * i / count, length * (i + 1) / count
            at = min(y + rise, max(y, y + r / 4 + r * ((d0 + d1) / 2) / tread))
            pa, pb = a0 + d * d0, a0 + d * d1
            lo_, hi_ = min(pa, pb), max(pa, pb)
            b = [lo_, max(y, at - 0.35), rc0, hi_, at, rc1] if axis == "x" else [rc0, max(y, at - 0.35), lo_, rc1, at, hi_]
            self.solids.append([r3(q) for q in b])
        return steps


class Vol:
    def __init__(self, i, d, B):
        self.i = i
        self.name = d.get("name", f"v{i}")
        self.x0, self.z0, self.x1, self.z1 = d["rect"]
        self.floors = d["floors"]
        self.roof = d.get("roof", {"type": "flat"})
        self.wall = d.get("wall", B.wall)
        self.win = {**B.win, **d.get("win", {})}
        self.top = B.Y(self.floors)
        self.open = d.get("open", False)
        self.d = d

    def side(self, s, wt):
        x0, z0, x1, z1 = self.x0, self.z0, self.x1, self.z1
        return {
            "front": dict(axis="x", a0=x0, a1=x1, c0=z1 - wt, c1=z1, plane=z1, out=(0, 0, 1), inner="z0", outer="z1"),
            "back": dict(axis="x", a0=x0, a1=x1, c0=z0, c1=z0 + wt, plane=z0, out=(0, 0, -1), inner="z1", outer="z0"),
            "left": dict(axis="z", a0=z0, a1=z1, c0=x0, c1=x0 + wt, plane=x0, out=(-1, 0, 0), inner="x1", outer="x0"),
            "right": dict(axis="z", a0=z0, a1=z1, c0=x1 - wt, c1=x1, plane=x1, out=(1, 0, 0), inner="x0", outer="x1"),
        }[s]


def interval_minus(segs, cut):
    out = []
    for a, b in segs:
        if cut[1] <= a or cut[0] >= b:
            out.append((a, b))
            continue
        if cut[0] > a:
            out.append((a, cut[0]))
        if cut[1] < b:
            out.append((cut[1], b))
    return [(a, b) for a, b in out if b - a > 1e-3]


def rect_minus(r, h):
    if not h:
        return [r]
    x0, z0, x1, z1 = r
    hx0, hz0, hx1, hz1 = h
    if hx1 <= x0 or hx0 >= x1 or hz1 <= z0 or hz0 >= z1:
        return [r]
    out = []
    if hz0 > z0:
        out.append((x0, z0, x1, hz0))
    if hz1 < z1:
        out.append((x0, hz1, x1, z1))
    if hx0 > x0:
        out.append((x0, max(z0, hz0), hx0, min(z1, hz1)))
    if hx1 < x1:
        out.append((hx1, max(z0, hz0), x1, min(z1, hz1)))
    return [q for q in out if q[2] - q[0] > 1e-3 and q[3] - q[1] > 1e-3]


class Building:
    """
    Spec keys (designs.py):
      fh, base, wt              storey height (3.0), plinth (0.15), wall thickness (0.25)
      wall (m, tint)            outer walls; a volume may have its own
      trim                      frames, sills, copings, fascias
      plinth (m, tint)
      volumes [{name, rect (x0, z0, x1, z1), floors, roof, wall, win}]
      doors   [{vol, side, at, floor=0, w=1.3, h=2.3, entrance=True}]
      links   [{a, b, floor, at, w=1.2}]   doorways in the wall two volumes share
      win     {step, w, sill, head, glass, muntins, shutters (tint), skip [(vol, side, a, b)],
               floors {vol: [L…]}}
      holes   [{vol, side, floor, a, b, y0, y1, glass=True}]
      stairs  [{vol, axis, a0, a1, c0, c1, roof=False, house={…}}]
      parts   [{vol, axis, at, frm, to, doors [centre…], floors [L…]}]  partitions
      deco    [f(ctx)]
    """

    def __init__(self, S):
        self.S = S
        self.k = Kit()
        self.far = Kit()
        self.fh = S.get("fh", 3.0)
        self.base = S.get("base", 0.15)
        self.wt = S.get("wt", 0.25)
        self.wall = S.get("wall", ("plaster", (0.9, 0.88, 0.84)))
        self.trim = S.get("trim", (0.92, 0.91, 0.88))
        self.win = {"step": 2.6, "w": 1.2, "sill": 0.9, "head": 2.2, "glass": True, **S.get("win", {})}
        self.vols = [Vol(i, d, self) for i, d in enumerate(S["volumes"])]
        self.by = {v.name: v for v in self.vols}
        self.doors = [{"w": 1.3, "h": 2.3, "floor": 0, "entrance": True, **d} for d in S.get("doors", [])]
        self.links = [{"w": 1.2, **d} for d in S.get("links", [])]
        self.holes = S.get("holes", [])
        self.stairs = S.get("stairs", [])
        self.entrances = []
        self.routes = []
        self.house_rects = {}
        self.house_doors = {}

    def Y(self, L):
        return self.base + L * self.fh

    # ------------------------------------------------------------------ adjacency
    def neighbours(self, v, s, opens=False):
        """Volumes across side s of v: [(w, a0, a1)] overlapping along the side's axis (open
        volumes, porches and galleries, only when asked: they never share a wall)."""
        g = v.side(s, self.wt)
        out = []
        for w in self.vols:
            if w is v or ((w.open or v.open) and not opens):
                continue
            h = w.side(OPP[s], self.wt)
            if abs(h["plane"] - g["plane"]) > 1e-6:
                continue
            a0, a1 = max(g["a0"], h["a0"]), min(g["a1"], h["a1"])
            if a1 - a0 > 0.05:
                out.append((w, a0, a1))
        return out

    def draws(self, v, w):
        """Whether v draws the wall it shares with w (the taller, or the first of equals)."""
        return v.floors > w.floors or (v.floors == w.floors and v.i < w.i)

    def side_state(self, v, s, L):
        """(skip, party): the intervals of side s another volume's wall stands in at storey L
        (a taller neighbour's, or an equal one's listed first), and those v draws as a shared
        wall [(w, a0, a1)]. Open volumes draw none."""
        g = v.side(s, self.wt)
        if v.open:
            return [(g["a0"], g["a1"])], []
        skip, party = [], []
        for w, a0, a1 in self.neighbours(v, s):
            if w.floors <= L:
                continue
            if self.draws(w, v):
                skip.append((a0, a1))
            else:
                party.append((w, a0, a1))
        return skip, party

    def drawn(self, v, s, L):
        """The intervals of side s that v draws at storey L."""
        g = v.side(s, self.wt)
        segs = [(g["a0"], g["a1"])]
        for a, b in self.side_state(v, s, L)[0]:
            segs = interval_minus(segs, (a, b))
        return segs

    # ------------------------------------------------------------------ walls
    def run(self, axis, a0, a1, c0, c1, y0, y1, holes, m, tint, faces, lod="near", trim=None, out=None):
        """A wall from a0 to a1 along axis at cross c0..c1 with holes (a, b, ya, yb, glass)."""
        k = self.k
        if lod != "near":
            # (The middle LOD never shows a room: its faces need not be the rooms' material.)
            faces = {f: ("paint", t) if m_ == "int" else (m_, t) for f, (m_, t) in faces.items()}
            if m == "int":
                m = "paint"
        cuts = sorted({a0, a1, *[q for h in holes for q in (h[0], h[1]) if a0 <= q <= a1]})
        B = (lambda pa, ya, pb, yb: [pa, ya, c0, pb, yb, c1]) if axis == "x" else (
            lambda pa, ya, pb, yb: [c0, ya, pa, c1, yb, pb])
        for i in range(len(cuts) - 1):
            a, b = cuts[i], cuts[i + 1]
            if b - a < 1e-3:
                continue
            mid = (a + b) / 2
            h = next((q for q in holes if q[0] < mid < q[1]), None)
            if not h:
                k.box(B(a, y0, b, y1), m, tint, lod, collide=False, faces=faces)
                continue
            if h[2] > y0:
                k.box(B(a, y0, b, min(h[2], y1)), m, tint, lod, collide=False, faces=faces)
            if h[3] < y1:
                k.box(B(a, max(h[3], y0), b, y1), m, tint, lod, collide=False, faces=faces)
            if h[4]:
                # (No collision: glass_panes.mjs makes it a breakable pane, which is solid until shot.)
                c = (c0 + c1) / 2
                k.box([a, h[2], c - 0.03, b, h[3], c + 0.03] if axis == "x" else [c - 0.03, h[2], a, c + 0.03, h[3], b],
                      "glass", GLASS, "near", collide=False)
        # The wall's collision in horizontal bands (2026-11-27, the island's collision payload): one
        # box under a row of windows and one over it, piers between them, rather than a column of
        # three boxes per window as drawn.
        ys = sorted({y0, y1, *[q for h in holes for q in (h[2], h[3]) if y0 < q < y1]})
        bands = []
        for j in range(len(ys) - 1):
            ya, yb = ys[j], ys[j + 1]
            if yb - ya < 1e-3:
                continue
            ym = (ya + yb) / 2
            solid = [(a0, a1)]
            for h in holes:
                if h[2] < ym < h[3]:
                    solid = interval_minus(solid, (h[0], h[1]))
            solid = [(a, b) for a, b in solid if b - a >= 1e-3]
            if bands and bands[-1][2] == solid:
                bands[-1][1] = yb
            else:
                bands.append([ya, yb, solid])
        for ya, yb, solid in bands:
            for a, b in solid:
                k.box(B(a, ya, b, yb), m, tint, lod, visible=False)

    def wall_holes(self, v, s, L, party):
        """Openings in v's side s on storey L: doors, extra holes, windows; party intervals none."""
        g = v.side(s, self.wt)
        y0 = self.Y(L)
        out = []
        for q in self.doors:
            if q["vol"] == v.name and q["side"] == s and q["floor"] == L:
                out.append([q["at"] - q["w"] / 2, q["at"] + q["w"] / 2, y0, y0 + q["h"], False, "door"])
        for h in self.holes:
            if h["vol"] == v.name and h["side"] == s and h["floor"] == L:
                out.append([h["a"], h["b"], y0 + h["y0"], y0 + h["y1"], h.get("glass", True),
                            "door" if not h.get("glass", True) else "shop"])
        W = v.win
        floors = (W.get("floors") or {})
        if W.get("none") or (floors and L not in floors.get(s, floors.get("all", [L]))):
            return out
        sides = W.get("sides")
        if sides and s not in sides:
            return out
        # Windows along the side, evenly spaced, clear of corners, openings and party walls.
        lo, hi = g["a0"] + 0.5 + self.wt, g["a1"] - 0.5 - self.wt
        length = hi - lo
        step = W["step"]
        cnt = max(0, int((length + step - W["w"]) // step))
        mid = (lo + hi) / 2
        for i in range(cnt):
            c = mid + (i - (cnt - 1) / 2) * step
            a, b = c - W["w"] / 2, c + W["w"] / 2
            if a < lo - 1e-6 or b > hi + 1e-6:
                continue
            if any(a < h[1] + 0.35 and b > h[0] - 0.35 for h in out):
                continue
            if any(a < p1 + 0.3 and b > p0 - 0.3 for _, p0, p1 in party):
                continue
            if any(sv == v.name and sd == s and a < q and b > p for sv, sd, p, q in self.win.get("skip", [])):
                continue
            out.append([a, b, y0 + W["sill"], y0 + W["head"], W["glass"], "win"])
        return out

    def walls(self):
        wt = self.wt
        for v in self.vols:
            if v.open:
                continue
            m, tint = v.wall
            for L in range(v.floors):
                y0 = 0 if L == 0 else self.Y(L)
                y1 = self.Y(L + 1)
                dr = {s: self.drawn(v, s, L) for s in ("front", "back", "left", "right")}
                # The front and back walls own the corners where they stand.
                own = {
                    ("back", "x0"): any(a <= v.x0 + 1e-6 for a, _ in dr["back"]),
                    ("back", "x1"): any(b >= v.x1 - 1e-6 for _, b in dr["back"]),
                    ("front", "x0"): any(a <= v.x0 + 1e-6 for a, _ in dr["front"]),
                    ("front", "x1"): any(b >= v.x1 - 1e-6 for _, b in dr["front"]),
                }
                for s in ("front", "back", "left", "right"):
                    g = v.side(s, wt)
                    party = self.side_state(v, s, L)[1]
                    holes = self.wall_holes(v, s, L, party)
                    for a0, a1 in dr[s]:
                        if g["axis"] == "z":
                            xe = "x0" if s == "left" else "x1"
                            if a0 <= v.z0 + 1e-6 and own[("back", xe)]:
                                a0 = v.z0 + wt
                            if a1 >= v.z1 - 1e-6 and own[("front", xe)]:
                                a1 = v.z1 - wt
                        if a1 - a0 < 1e-3:
                            continue
                        ext = [(a0, a1)]
                        for _, p0, p1 in party:
                            ext = interval_minus(ext, (p0, p1))
                        inner = {g["inner"]: ("int", INT)}
                        for e0, e1 in ext:
                            hs = [h for h in holes if h[0] < e1 and h[1] > e0]
                            self.run(g["axis"], e0, e1, g["c0"], g["c1"], y0, y1, hs, m, tint, inner)
                            self.mid_wall(g, e0, e1, y0, y1, hs, m, tint, top=(L == v.floors - 1))
                            self.trims(g, hs)
                        for w, p0, p1 in party:
                            p0, p1 = max(p0, a0), min(p1, a1)
                            if p1 - p0 < 1e-3:
                                continue
                            lk = [[q["at"] - q["w"] / 2, q["at"] + q["w"] / 2, self.Y(L), self.Y(L + 1) - SLAB - 0.01, False]
                                  for q in self.links if q["floor"] == L and {q["a"], q["b"]} == {v.name, w.name}]
                            both = {g["inner"]: ("int", INT), g["outer"]: ("int", INT)}
                            self.run(g["axis"], p0, p1, g["c0"], g["c1"], y0, y1, lk, "int", INT, both)
        return self

    def mid_wall(self, g, a0, a1, y0, y1, holes, m, tint, top):
        """The middle LOD's storey of wall: whole, its openings dark panes 1.5 cm out."""
        skip = {g["inner"], "bottom"} | (set() if top else {"top"})
        b = [a0, y0, g["c0"], a1, y1, g["c1"]] if g["axis"] == "x" else [g["c0"], y0, a0, g["c1"], y1, a1]
        self.k.box(b, m, tint, "mid", collide=False, skip=skip)
        o = g["out"]
        f = g["plane"] + 0.015 * (o[0] + o[2])
        for h in holes:
            col = DARK_DOOR if h[5] == "door" else DARK_GLASS
            if g["axis"] == "x":
                pts = [(h[0], h[2], f), (h[1], h[2], f), (h[1], h[3], f), (h[0], h[3], f)]
                if o[2] < 0:
                    pts = list(reversed(pts))
            else:
                pts = [(f, h[2], h[1]), (f, h[2], h[0]), (f, h[3], h[0]), (f, h[3], h[1])]
                if o[0] < 0:
                    pts = list(reversed(pts))
            self.k.poly(pts, "paint", col, "mid")

    def trims(self, g, holes):
        """Sills and heads under and over windows, frames round doors, shutters, muntins."""
        k = self.k
        o = g["out"]
        sg = o[0] + o[2]
        face = g["plane"]
        tr = self.trim
        W = self.win

        def pr(p0, ya, p1, yb, depth):
            if g["axis"] == "x":
                return [p0, ya, face, p1, yb, face + sg * depth]
            return [face, ya, p0, face + sg * depth, yb, p1]

        for h in holes:
            if h[5] == "win":
                k.box(pr(h[0] - 0.08, h[2] - 0.07, h[1] + 0.08, h[2], 0.09), "paint", tr, "near", collide=False)
                k.box(pr(h[0] - 0.06, h[3], h[1] + 0.06, h[3] + 0.12, 0.05), "paint", tr, "near", collide=False)
                if W.get("muntins"):
                    mid_y = (h[2] + h[3]) / 2
                    c = (g["c0"] + g["c1"]) / 2
                    if g["axis"] == "x":
                        k.box([h[0], mid_y - 0.03, c - 0.05, h[1], mid_y + 0.03, c + 0.05], "paint", tr, "near", collide=False)
                    else:
                        k.box([c - 0.05, mid_y - 0.03, h[0], c + 0.05, mid_y + 0.03, h[1]], "paint", tr, "near", collide=False)
                if W.get("shutters"):
                    st = W["shutters"]
                    sw = (h[1] - h[0]) * 0.45
                    k.box(pr(h[0] - 0.1 - sw, h[2], h[0] - 0.1, h[3], 0.04), "paint", st, "near", collide=False)
                    k.box(pr(h[1] + 0.1, h[2], h[1] + 0.1 + sw, h[3], 0.04), "paint", st, "near", collide=False)
            elif h[5] == "door" and h[1] - h[0] < 2.0:
                k.box(pr(h[0] - 0.12, h[2], h[0], h[3] + 0.12, 0.07), "paint", tr, "near", collide=False)
                k.box(pr(h[1], h[2], h[1] + 0.12, h[3] + 0.12, 0.07), "paint", tr, "near", collide=False)
                k.box(pr(h[0], h[3], h[1], h[3] + 0.12, 0.07), "paint", tr, "near", collide=False)
            elif h[5] == "shop":
                k.box(pr(h[0] - 0.1, h[3], h[1] + 0.1, h[3] + 0.18, 0.08), "paint", tr, "near", collide=False)
                k.box(pr(h[0] - 0.1, h[2] - 0.12, h[1] + 0.1, h[2], 0.08), "paint", tr, "near", collide=False)

    # ------------------------------------------------------------------ floors, stairs
    def inner_rects(self, v, L):
        """v's floor area within the walls of storey L: its rect less a wall's thickness along
        every interval of a side v draws there."""
        wt = self.wt
        rects = [(v.x0, v.z0, v.x1, v.z1)]
        for s in ("front", "back", "left", "right"):
            for a0, a1 in self.drawn(v, s, L):
                strip = {"front": (a0, v.z1 - wt, a1, v.z1), "back": (a0, v.z0, a1, v.z0 + wt),
                         "left": (v.x0, a0, v.x0 + wt, a1), "right": (v.x1 - wt, a0, v.x1, a1)}[s]
                new = []
                for q in rects:
                    new += rect_minus(q, strip)
                rects = new
        return rects

    def inner_rect(self, v, L):
        """The bounding box of inner_rects (for rails and the stair's sides)."""
        rs = self.inner_rects(v, L)
        return (min(q[0] for q in rs), min(q[1] for q in rs), max(q[2] for q in rs), max(q[3] for q in rs))

    def stair_of(self, v):
        return [s for s in self.stairs if s["vol"] == v.name]

    @staticmethod
    def well(st):
        if st["axis"] == "x":
            return (min(st["a0"], st["a1"]), min(st["c0"], st["c1"]), max(st["a0"], st["a1"]), max(st["c0"], st["c1"]))
        return (min(st["c0"], st["c1"]), min(st["a0"], st["a1"]), max(st["c0"], st["c1"]), max(st["a0"], st["a1"]))

    def ceiling(self, r, y):
        x0, z0, x1, z1 = r
        self.k.poly([(x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0)][::-1], "int", CEIL, "near")

    def floors_and_stairs(self):
        k = self.k
        for v in self.vols:
            sts = self.stair_of(v)
            ir0 = self.inner_rect(v, 0)
            # The ground floor's finish, its plinth.
            if not v.open:
                for q in self.inner_rects(v, 0):
                    k.box([q[0], self.base - 0.02, q[1], q[2], self.base + 0.005, q[3]], "flo", FLO, "near",
                          collide=False, skip={"bottom"})
            for L in range(1, v.floors + 1):
                roof = L == v.floors
                rects = list(self.inner_rects(v, L - 1))
                for st in sts:
                    if not roof or st.get("roof"):
                        new = []
                        for q in rects:
                            new += rect_minus(q, self.well(st))
                        rects = new
                y = self.Y(L)
                for q in rects:
                    # Drawn down to the ceiling or soffit under it, 1–2 cm lower (the slab's
                    # bottom face is not drawn): at a stair well's edge or an open side the gap
                    # between them showed the sky through the slab (map audit 2026-11-27,
                    # art/blender/br/towns/audit.py). Its collision stays the slab.
                    k.solids.append([r3(q[0]), r3(y - SLAB), r3(q[1]), r3(q[2]), r3(y), r3(q[3])])
                    lo = y - SLAB - (0.01 if v.open else 0.02)
                    if roof:
                        rt = v.roof.get("type", "flat")
                        if rt in ("flat", "mansard") and v.open:
                            k.box([q[0], lo, q[1], q[2], y, q[3]], "paint", v.d.get("deck", (0.55, 0.42, 0.3)),
                                  "shell", skip={"bottom"}, collide=False)
                        elif rt in ("flat", "mansard"):
                            k.box([q[0], lo, q[1], q[2], y, q[3]], "concrete",
                                  v.roof.get("deckTint", (0.62, 0.61, 0.58)), "shell", skip={"bottom"}, collide=False)
                        else:
                            k.box([q[0], lo, q[1], q[2], y, q[3]], "paint", (0.5, 0.48, 0.45),
                                  "shell" if v.open else "near", skip={"bottom"}, collide=False)
                    elif v.open:
                        k.box([q[0], lo, q[1], q[2], y, q[3]], "paint", v.d.get("deck", (0.55, 0.42, 0.3)),
                              "shell", skip={"bottom"}, collide=False)
                    else:
                        k.box([q[0], lo, q[1], q[2], y, q[3]], "flo", FLO, "near", skip={"bottom"}, collide=False)
                    if v.open:
                        x0_, z0_, x1_, z1_ = q
                        self.k.poly([(x0_, y - SLAB - 0.01, z0_), (x1_, y - SLAB - 0.01, z0_), (x1_, y - SLAB - 0.01, z1_),
                                     (x0_, y - SLAB - 0.01, z1_)], "paint", self.S.get("soffit", (0.45, 0.38, 0.32)), "shell")
                    else:
                        self.ceiling(q, y - SLAB - 0.02)
            for st in sts:
                self.stair(v, st)
        return self

    def stair(self, v, st):
        k = self.k
        n = v.floors - 1 + (1 if st.get("roof") else 0)
        axis = st["axis"]
        c0, c1 = min(st["c0"], st["c1"]), max(st["c0"], st["c1"])
        rail_tint = self.S.get("railTint", (0.24, 0.2, 0.17))
        # The walk-back side: away from the outer wall the flight runs beside.
        lo_wall = (c0 - (v.x0 if axis == "z" else v.z0)) < self.wt + 0.15
        open_c = c1 if lo_wall else c0
        # The ramp clear of the walls' windows: a pane's opening runs 0.2 m either side of its
        # glass (glass_panes.mjs), and a ramp in it would be cut slice by slice.
        i0, i1 = (v.x0, v.x1) if axis == "z" else (v.z0, v.z1)
        clear = max(self.wt, self.wt / 2 + 0.21)
        cc = (max(c0, i0 + clear), min(c1, i1 - clear))
        for L in range(n):
            y = self.Y(L)
            k.flight(axis, st["a0"], st["a1"], c0, c1, y, self.fh, "flo", FLO, "near", cc=cc)
            # Its handrail on the open side (drawn), and the stringer under it.
            a = (st["a0"], y + 0.95, open_c) if axis == "x" else (open_c, y + 0.95, st["a0"])
            b = (st["a1"], y + self.fh + 0.95, open_c) if axis == "x" else (open_c, y + self.fh + 0.95, st["a1"])
            k.beam(a, b, 0.06, 0.06, "paint", rail_tint, "near")
            for p, q in ((st["a0"], 0), (st["a1"], 1)):
                post = (p, open_c)
                px, pz = (post[0], post[1]) if axis == "x" else (post[1], post[0])
                k.box([px - 0.04, y + q * self.fh, pz - 0.04, px + 0.04, y + q * self.fh + 1.0, pz + 0.04],
                      "paint", rail_tint, "near", collide=False)
        well = self.well(st)
        if not st.get("roof") and v.floors > 1:
            # The top floor's well: a rail round its open edges, the arrival end left open.
            y = self.Y(v.floors - 1)
            x0, z0, x1, z1 = well
            irt = self.inner_rect(v, v.floors - 1)
            edges = [("z", x0, z0, z1), ("z", x1, z0, z1), ("x", z0, x0, x1), ("x", z1, x0, x1)]
            for ax, c, p0, p1 in edges:
                on_wall = (c <= irt[0] + 0.05 or c >= irt[2] - 0.05) if ax == "z" else (c <= irt[1] + 0.05 or c >= irt[3] - 0.05)
                if on_wall:
                    continue
                exit_ = (axis == "x" and ax == "z" and abs(c - st["a1"]) < 1e-3) or (
                    axis == "z" and ax == "x" and abs(c - st["a1"]) < 1e-3)
                if exit_:
                    continue
                k.box([c - 0.04, y, p0, c + 0.04, y + 1.0, p1] if ax == "z" else [p0, y, c - 0.04, p1, y + 1.0, c + 0.04],
                      "paint", rail_tint, "near")
        if st.get("roof"):
            self.stair_house(v, st)

    def stair_house(self, v, st):
        """The stair house over the top flight on a flat roof: walls, a door on to the deck, a roof."""
        k, far = self.k, self.far
        wm, wtint = v.wall
        top = v.top
        x0, z0, x1, z1 = self.well(st)
        H = st.get("house", {})
        h = H.get("h", 2.6)
        axis = st["axis"]
        d = 1 if st["a1"] > st["a0"] else -1
        if "rect" in H:
            r = list(H["rect"])
        else:
            ext = 1.6
            r = [x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2]
            if axis == "x":
                if d > 0:
                    r[2] += ext
                else:
                    r[0] -= ext
            elif d > 0:
                r[3] += ext
            else:
                r[1] -= ext
        r = [max(r[0], v.x0), max(r[1], v.z0), min(r[2], v.x1), min(r[3], v.z1)]
        rx0, rz0, rx1, rz1 = r
        self.house_rects.setdefault(v.name, []).append(r)
        HY = top + h
        # The door: in the end wall past the arrival when there is room to walk out to the
        # parapet, else in the side wall toward the roof's middle, on the landing.
        exit_side = {("x", 1): "x1", ("x", -1): "x0", ("z", 1): "z1", ("z", -1): "z0"}[(axis, d)]
        PI = 0.3 if v.roof.get("type") != "mansard" else v.roof.get("inset", 0.55) + 0.32
        gap = {"x0": rx0 - v.x0 - PI, "x1": v.x1 - PI - rx1, "z0": rz0 - v.z0 - PI, "z1": v.z1 - PI - rz1}
        door_at = H.get("doorAt")
        if "doorSide" in H:
            exit_side = H["doorSide"]
        elif gap[exit_side] < 1.2:
            land = (sorted((st["a1"], rx1 - 0.2 if d > 0 else rx0 + 0.2)) if axis == "x"
                    else sorted((st["a1"], rz1 - 0.2 if d > 0 else rz0 + 0.2)))
            door_at = (land[0] + land[1]) / 2
            mx, mz = (rx0 + rx1) / 2, (rz0 + rz1) / 2
            exit_side = ("z1" if mz < (v.z0 + v.z1) / 2 else "z0") if axis == "x" else (
                "x1" if mx < (v.x0 + v.x1) / 2 else "x0")
        if door_at is None:
            door_at = ((rx0 + rx1) / 2) if exit_side in ("z0", "z1") else ((rz0 + rz1) / 2)
        st["_door"] = (exit_side, door_at, r)
        t = 0.2
        win = H.get("windows", False)
        sides = {
            "z1": ("x", rx0, rx1, rz1 - t, rz1, "z0"),
            "z0": ("x", rx0, rx1, rz0, rz0 + t, "z1"),
            "x0": ("z", rz0 + t, rz1 - t, rx0, rx0 + t, "x1"),
            "x1": ("z", rz0 + t, rz1 - t, rx1 - t, rx1, "x0"),
        }
        for sd, (ax, a0, a1, c0, c1, inner) in sides.items():
            holes = []
            if sd == exit_side:
                c = door_at if door_at is not None else (a0 + a1) / 2
                holes.append([c - 0.65, c + 0.65, top, top + 2.25, False])
            elif win and a1 - a0 > 2.2:
                c = (a0 + a1) / 2
                holes.append([c - 0.6, c + 0.6, top + 0.9, top + 2.0, True])
            self.run(ax, a0, a1, c0, c1, top, HY, holes, wm, wtint, {inner: ("int", INT)}, lod="shell")
        roof = H.get("roof", "flat")
        if roof == "flat":
            k.box([rx0 - 0.12, HY, rz0 - 0.12, rx1 + 0.12, HY + 0.2, rz1 + 0.12], "concrete", (0.55, 0.55, 0.53),
                  "shell", skip={"bottom"})
            far.box([rx0, top, rz0, rx1, HY + 0.2, rz1], wm, wtint, "far", collide=False, skip={"bottom"})
        else:
            rm, rt = H.get("roofMat", ("metal", (0.4, 0.42, 0.44)))
            self.hip_or_gable(rx0 - 0.15, rz0 - 0.15, rx1 + 0.15, rz1 + 0.15, HY, 0.5, roof, rm, rt, "shell",
                              along=H.get("along", "x"))
            far.box([rx0, top, rz0, rx1, HY, rz1], wm, wtint, "far", collide=False, skip={"bottom"})
        self.ceiling((rx0 + t, rz0 + t, rx1 - t, rz1 - t), HY - 0.02)

    # ------------------------------------------------------------------ partitions
    def partitions(self):
        for p in self.S.get("parts", []):
            v = self.by[p["vol"]]
            for L in p.get("floors", range(v.floors)):
                y0 = self.Y(L)
                y1 = self.Y(L + 1) - SLAB
                holes = [[c - 0.5, c + 0.5, y0, y0 + 2.15, False] for c in p.get("doors", [])]
                holes += [[a, b, y0, y1 - 0.001, False] for a, b in p.get("gaps", [])]
                both = {"x0": ("int", INT), "x1": ("int", INT), "z0": ("int", INT), "z1": ("int", INT)}
                if p["axis"] == "x":
                    self.run("x", p["frm"], p["to"], p["at"] - 0.08, p["at"] + 0.08, y0, y1, holes, "int", INT, both)
                else:
                    self.run("z", p["frm"], p["to"], p["at"] - 0.08, p["at"] + 0.08, y0, y1, holes, "int", INT, both)
        return self

    # ------------------------------------------------------------------ roofs
    def edge_open(self, v, s, floors=None):
        """Intervals of v's roof edge s (or its floor `floors` edge) with nothing as tall or
        taller against them."""
        g = v.side(s, self.wt)
        segs = [(g["a0"], g["a1"])]
        f = v.floors if floors is None else floors
        for w, a0, a1 in self.neighbours(v, s, opens=True):
            if w.open and not v.open:
                continue
            if floors is not None:
                if w.floors > f:
                    segs = interval_minus(segs, (a0, a1))
                continue
            if w.floors > v.floors or (w.floors == v.floors and w.roof.get("type", "flat") in ("flat", "mansard")):
                segs = interval_minus(segs, (a0, a1))
        return segs

    def roofs(self):
        for v in self.vols:
            t = v.roof.get("type", "flat")
            if t == "flat":
                self.flat_roof(v)
            elif t == "mansard":
                self.mansard(v)
            elif t in ("gable", "hip", "pyramid"):
                ov = v.roof.get("over", 0.45)
                along = v.roof.get("along") or ("x" if v.x1 - v.x0 >= v.z1 - v.z0 else "z")
                if t == "pyramid":
                    along = "x"
                rm, rt = v.roof.get("m", "shingle"), v.roof.get("tint", (0.32, 0.3, 0.3))
                self.hip_or_gable(v.x0 - ov, v.z0 - ov, v.x1 + ov, v.z1 + ov, v.top, v.roof.get("pitch", 0.6),
                                  "gable" if t == "gable" else "hip", rm, rt, "shell", along=along, vol=v, over=ov)
            elif t == "gambrel":
                self.gambrel(v)
            elif t == "shed":
                self.shed(v)
            else:
                raise ValueError(t)
            # The far LOD's body (flat roofs: to the parapet's top).
            if v.open:
                y = v.top
                self.far.box([v.x0, y - SLAB, v.z0, v.x1, y, v.z1], "paint", v.d.get("deck", (0.55, 0.42, 0.3)), "far",
                             collide=False)
                continue
            ph = v.roof.get("parapet", 1.0) if t in ("flat", "mansard") else 0
            if t == "mansard":
                ph = v.roof.get("h", 1.4)
            self.far.box([v.x0, 0, v.z0, v.x1, v.top + ph, v.z1], v.wall[0], v.wall[1], "far", collide=False,
                         skip={"bottom"} | ({"top"} if t not in ("flat", "mansard") else set()),
                         faces={"top": ("concrete", (0.6, 0.6, 0.58))} if t in ("flat", "mansard") else None)
        return self

    def flat_roof(self, v):
        k = self.k
        R = v.roof
        top = v.top
        wm, wtint = v.wall
        style = R.get("edge", "rail" if v.open else "parapet")
        ph = R.get("parapet", 1.0)
        pt = 0.22
        cop = R.get("coping", self.trim)
        for s in ("front", "back", "left", "right"):
            g = v.side(s, pt)
            segs = self.edge_open(v, s)
            for hr in self.house_rects.get(v.name, []):
                # Where a stair house stands on the edge, its wall is the edge.
                on = {"front": abs(hr[3] - v.z1) < 1e-3, "back": abs(hr[1] - v.z0) < 1e-3,
                      "left": abs(hr[0] - v.x0) < 1e-3, "right": abs(hr[2] - v.x1) < 1e-3}[s]
                if on:
                    segs = interval_minus(segs, (hr[0], hr[2]) if g["axis"] == "x" else (hr[1], hr[3]))
            for a0, a1 in segs:
                if g["axis"] == "z":
                    # (The front and back parapets own the corners.)
                    a0 = max(a0, v.z0 + pt) if not self.neighbours(v, "back") or a0 > v.z0 + 1e-3 else a0
                    a1 = min(a1, v.z1 - pt) if not self.neighbours(v, "front") or a1 < v.z1 - 1e-3 else a1
                    a0 = max(a0, v.z0 + pt)
                    a1 = min(a1, v.z1 - pt)
                if a1 - a0 < 0.05:
                    continue
                if style == "parapet":
                    b = [a0, top, g["c0"], a1, top + ph, g["c1"]] if g["axis"] == "x" else [g["c0"], top, a0, g["c1"], top + ph, a1]
                    k.box(b, wm, wtint, "shell", skip={"bottom", "top"})
                    o = 0.04
                    cb = ([a0 - (o if s in ("front", "back") else 0), top + ph, g["c0"] - o, a1 + (o if s in ("front", "back") else 0), top + ph + 0.08, g["c1"] + o]
                          if g["axis"] == "x" else [g["c0"] - o, top + ph, a0, g["c1"] + o, top + ph + 0.08, a1])
                    k.box(cb, "concrete", cop, "shell", collide=False, skip={"bottom"})
                else:
                    # A rail: posts every 1.5 m, two rails, solid to 1.05 m for players.
                    rt = R.get("railTint", (0.18, 0.18, 0.2))
                    c = (g["c0"] + g["c1"]) / 2
                    n = max(1, int(math.ceil((a1 - a0) / 1.5)))
                    for i in range(n + 1):
                        p = a0 + (a1 - a0) * i / n
                        p = min(max(p, a0 + 0.03), a1 - 0.03)
                        k.box([p - 0.03, top, c - 0.03, p + 0.03, top + 1.05, c + 0.03] if g["axis"] == "x" else [c - 0.03, top, p - 0.03, c + 0.03, top + 1.05, p + 0.03],
                              "paint", rt, "shell", collide=False)
                    for yy in (0.5, 1.0):
                        k.box([a0, top + yy, c - 0.025, a1, top + yy + 0.05, c + 0.025] if g["axis"] == "x" else [c - 0.025, top + yy, a0, c + 0.025, top + yy + 0.05, a1],
                              "paint", rt, "shell", collide=False)
                    # Collision: a thin solid rail the height of the posts.
                    self.k.solids.append([r3(x) for x in ([a0, top, c - 0.05, a1, top + 1.05, c + 0.05] if g["axis"] == "x" else [c - 0.05, top, a0, c + 0.05, top + 1.05, a1])])

    def mansard(self, v):
        """A mansard ring round a flat deck: steep slate slopes from the wall heads, a coping on top."""
        k, far = self.k, self.far
        R = v.roof
        top = v.top
        h = R.get("h", 1.4)
        inset = R.get("inset", 0.55)
        rm, rt = R.get("m", "slate"), R.get("tint", (0.42, 0.44, 0.48))
        cop = R.get("coping", self.trim)
        x0, z0, x1, z1 = v.x0, v.z0, v.x1, v.z1
        ov = 0.06
        P = [(x0 - ov, z0 - ov), (x1 + ov, z0 - ov), (x1 + ov, z1 + ov), (x0 - ov, z1 + ov)]
        Q = [(x0 + inset, z0 + inset), (x1 - inset, z0 + inset), (x1 - inset, z1 - inset), (x0 + inset, z1 - inset)]
        th = 0.22
        Qi = [(x0 + inset + th, z0 + inset + th), (x1 - inset - th, z0 + inset + th), (x1 - inset - th, z1 - inset - th),
              (x0 + inset + th, z1 - inset - th)]
        for i in range(4):
            a, b = P[i], P[(i + 1) % 4]
            c, d = Q[(i + 1) % 4], Q[i]
            # Outward-facing slope (counter-clockwise seen from outside).
            pts = [(a[0], top, a[1]), (d[0], top + h, d[1]), (c[0], top + h, c[1]), (b[0], top, b[1])]
            k.poly(pts, rm, rt, "shell")
            far.poly(pts, rm, rt, "far")
            # The ring's top (coping) and its inner face toward the deck.
            ci, di = Qi[(i + 1) % 4], Qi[i]
            k.poly([(d[0], top + h + 0.06, d[1]), (di[0], top + h + 0.06, di[1]), (ci[0], top + h + 0.06, ci[1]),
                    (c[0], top + h + 0.06, c[1])], "concrete", cop, "shell")
            k.poly([(di[0], top, di[1]), (ci[0], top, ci[1]), (ci[0], top + h + 0.06, ci[1]),
                    (di[0], top + h + 0.06, di[1])], v.wall[0], v.wall[1], "shell")
        # Its eave band (a cornice under the slopes).
        for s in ("front", "back", "left", "right"):
            g = v.side(s, 0)
            o = g["out"]
            sg = o[0] + o[2]
            f = g["plane"]
            if g["axis"] == "x":
                k.box([x0 - 0.12, top - 0.3, f, x1 + 0.12, top, f + sg * 0.12], "paint", cop, "shell", collide=False)
            else:
                k.box([f, top - 0.3, z0, f + sg * 0.12, top, z1], "paint", cop, "shell", collide=False)
        # Collision: solid bands round the deck, the slope's height, in two steps.
        for (bx0, bz0, bx1, bz1) in [(x0, z0, x1, z0 + inset + th), (x0, z1 - inset - th, x1, z1),
                                     (x0, z0 + inset + th, x0 + inset + th, z1 - inset - th),
                                     (x1 - inset - th, z0 + inset + th, x1, z1 - inset - th)]:
            k.solids.append([r3(bx0), r3(top), r3(bz0), r3(bx1), r3(top + h + 0.06), r3(bz1)])
        # Dormers on the slopes (drawn only).
        for s, n in R.get("dormers", {}).items():
            g = v.side(s, 0)
            o = g["out"]
            sg = o[0] + o[2]
            a0, a1 = g["a0"] + 1.2, g["a1"] - 1.2
            for i in range(n):
                c = a0 + (a1 - a0) * (i + 0.5) / n
                face = g["plane"] - sg * (inset * 0.35)
                b = ([c - 0.55, top + 0.25, face - sg * 0.6, c + 0.55, top + 1.25, face]
                     if g["axis"] == "x" else [face - sg * 0.6, top + 0.25, c - 0.55, face, top + 1.25, c + 0.55])
                k.box(b, "paint", cop, "shell", collide=False)
                gl = ([c - 0.38, top + 0.42, face, c + 0.38, top + 1.08, face + sg * 0.01]
                      if g["axis"] == "x" else [face, top + 0.42, c - 0.38, face + sg * 0.01, top + 1.08, c + 0.38])
                k.box(gl, "paint", DARK_GLASS, "shell", collide=False)
                cap = ([c - 0.68, top + 1.25, face - sg * 0.7, c + 0.68, top + 1.38, face + sg * 0.08]
                       if g["axis"] == "x" else [face - sg * 0.7, top + 1.25, c - 0.68, face + sg * 0.08, top + 1.38, c + 0.68])
                k.box(cap, rm, rt, "shell", collide=False)

    def hip_or_gable(self, x0, z0, x1, z1, top, pitch, kind, rm, rt, lod, along="x", vol=None, over=0.45):
        """A gable (ridge along `along`, gable ends over the end walls) or hip roof over the rect
        (eaves included), its slopes meeting the wall heads `over` in from the eaves."""
        k, far = self.k, self.far
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        HL = (x1 - x0) / 2 if along == "x" else (z1 - z0) / 2  # along the ridge
        HS = (z1 - z0) / 2 if along == "x" else (x1 - x0) / 2  # across it
        ws = HS - over  # the wall's half width
        tn = math.tan(pitch)
        ridgeY = top + ws * tn
        eaveY = top - over * tn
        rl = HL if kind == "gable" else max(0.0, HL - HS)  # the ridge's half length

        def P(a, c, y):
            return (cx + a, y, cz + c) if along == "x" else (cx + c, y, cz + a)

        under = self.S.get("soffit", (0.45, 0.38, 0.32))
        fascia = self.trim
        for s in (-1, 1):
            pts = [P(-HL, s * HS, eaveY), P(HL, s * HS, eaveY), P(rl, 0, ridgeY), P(-rl, 0, ridgeY)]
            if rl < 1e-6:
                pts = [pts[0], pts[1], pts[2]]
            # Counter-clockwise seen from above-outside: order by side.
            pts = pts if (s < 0) == (along == "x") else pts[::-1]
            pts = self._facing(pts, (0, 1, 0))
            k.poly(pts, rm, rt, lod)
            far.poly(pts, rm, rt, "far")
            low = [(p[0], p[1] - 0.12, p[2]) for p in pts]
            k.poly(low[::-1], "paint", under, lod)
            # The fascia along the eave.
            if along == "x":
                k.box([cx - HL, eaveY - 0.24, cz + s * HS - 0.04, cx + HL, eaveY + 0.02, cz + s * HS + 0.04], "paint",
                      fascia, lod, collide=False)
            else:
                k.box([cx + s * HS - 0.04, eaveY - 0.24, cz - HL, cx + s * HS + 0.04, eaveY + 0.02, cz + HL], "paint",
                      fascia, lod, collide=False)
        if kind == "hip":
            for s in (-1, 1):
                pts = [P(s * HL, -HS, eaveY), P(s * HL, HS, eaveY), P(s * rl, 0, ridgeY)]
                pts = self._facing(pts, (0, 1, 0))
                k.poly(pts, rm, rt, lod)
                far.poly(pts, rm, rt, "far")
                k.poly([(p[0], p[1] - 0.12, p[2]) for p in pts][::-1], "paint", under, lod)
                if along == "x":
                    k.box([cx + s * HL - 0.04, eaveY - 0.24, cz - HS, cx + s * HL + 0.04, eaveY + 0.02, cz + HS], "paint",
                          fascia, lod, collide=False)
                else:
                    k.box([cx - HS, eaveY - 0.24, cz + s * HL - 0.04, cx + HS, eaveY + 0.02, cz + s * HL + 0.04], "paint",
                          fascia, lod, collide=False)
        elif not (vol is not None and vol.open and not vol.d.get("gableEnds")):
            # The gable ends: the triangle over each end wall, in the wall's material.
            wl = HL - over * 0.6 if vol is None else (HL - over * (1 if vol is not None else 0.6))
            wm, wtint = (vol.wall if vol else self.wall)
            for s in (-1, 1):
                endc = (HL - over) if vol else HL
                e = s * endc
                tri = [P(e, -ws, top), P(e, ws, top), P(e, 0, ridgeY - 0.08)]
                out = (s, 0, 0) if along == "x" else (0, 0, s)
                tri = self._facing(tri, out)
                k.poly(tri, wm, wtint, lod)
                k.poly([(p[0] - out[0] * 0.01, p[1], p[2] - out[2] * 0.01) for p in tri[::-1]], "int", INT, "near")
                far.poly(tri, wm, wtint, "far")
                # Its collision: a stack of boxes inside the gable wall.
                t = self.wt
                e0, e1 = (e - t, e) if s > 0 else (e, e + t)
                for i in range(1, 5):
                    hw = ws * (1 - (i - 1) / 4)
                    ya = top + (ridgeY - 0.1 - top) * ((i - 1) / 4)
                    yb = top + (ridgeY - 0.1 - top) * (i / 4)
                    b = ([cx + e0, ya, cz - hw, cx + e1, yb, cz + hw] if along == "x" else [cx - hw, ya, cz + e0, cx + hw, yb, cz + e1])
                    k.solids.append([r3(q) for q in b])
            del wl
        # The ridge cap.
        k.box([*P(-rl - 0.05, -0.14, ridgeY - 0.05)[:1], ridgeY - 0.05, P(-rl, -0.14, 0)[2], *P(rl + 0.05, 0.14, 0)[:1],
               ridgeY + 0.08, P(rl, 0.14, 0)[2]] if along == "x" else
              [cx - 0.14, ridgeY - 0.05, cz - rl - 0.05, cx + 0.14, ridgeY + 0.08, cz + rl + 0.05],
              "paint", self.S.get("ridge", (0.25, 0.23, 0.22)), lod, collide=False)
        # Collision: nested boxes stepping up under the slopes.
        steps = 8
        for i in range(steps):
            hc = ws * (1 - i / steps)
            y1 = ridgeY - hc * tn - 0.12
            if y1 <= top + 0.05:
                continue
            hl = (HL - over) if kind == "gable" else max(0.2, (HL - over) - (ws - hc))
            b = [cx - hl, top, cz - hc, cx + hl, y1, cz + hc] if along == "x" else [cx - hc, top, cz - hl, cx + hc, y1, cz + hl]
            k.solids.append([r3(q) for q in b])
        return ridgeY

    @staticmethod
    def _facing(pts, want):
        a, b, c = pts[0], pts[1], pts[2]
        u = [b[i] - a[i] for i in range(3)]
        w = [c[i] - a[i] for i in range(3)]
        n = (u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0])
        if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0:
            return pts[::-1]
        return pts

    def gambrel(self, v):
        """A barn's two-pitched roof: steep lower slopes to a knee, shallow upper ones to the ridge."""
        k, far = self.k, self.far
        R = v.roof
        ov = R.get("over", 0.35)
        along = R.get("along") or ("x" if v.x1 - v.x0 >= v.z1 - v.z0 else "z")
        rm, rt = R.get("m", "shingle"), R.get("tint", (0.3, 0.29, 0.29))
        cx, cz = (v.x0 + v.x1) / 2, (v.z0 + v.z1) / 2
        HL = ((v.x1 - v.x0) if along == "x" else (v.z1 - v.z0)) / 2 + ov * 0.6
        ws = ((v.z1 - v.z0) if along == "x" else (v.x1 - v.x0)) / 2
        top = v.top
        lower, upper = R.get("lower", 1.1), R.get("upper", 0.35)
        kd = R.get("knee", ws * 0.4)
        kneeY = top + kd * math.tan(lower)
        ridgeY = kneeY + (ws - kd) * math.tan(upper)
        eaveY = top - ov * math.tan(lower)
        prof = [(-(ws + ov), eaveY), (-(ws - kd), kneeY), (0, ridgeY), (ws - kd, kneeY), (ws + ov, eaveY)]

        def P(a, c, y):
            return (cx + a, y, cz + c) if along == "x" else (cx + c, y, cz + a)

        for i in range(4):
            (c0, y0), (c1, y1) = prof[i], prof[i + 1]
            pts = self._facing([P(-HL, c0, y0), P(HL, c0, y0), P(HL, c1, y1), P(-HL, c1, y1)], (0, 1, 0))
            k.poly(pts, rm, rt, "shell")
            far.poly(pts, rm, rt, "far")
            k.poly([(p[0], p[1] - 0.12, p[2]) for p in pts][::-1], "paint", self.S.get("soffit", (0.45, 0.38, 0.32)), "shell")
        wm, wtint = v.wall
        for s in (-1, 1):
            e = s * (HL - ov * 0.6)
            pts = [P(e, -ws, top), P(e, ws, top), P(e, ws - kd, kneeY), P(e, 0, ridgeY - 0.08), P(e, -(ws - kd), kneeY)]
            out = (s, 0, 0) if along == "x" else (0, 0, s)
            pts = self._facing(pts, out)
            k.poly(pts, wm, wtint, "shell")
            k.poly([(p[0] - out[0] * 0.01, p[1], p[2] - out[2] * 0.01) for p in pts[::-1]], "int", INT, "near")
            far.poly(pts, wm, wtint, "far")
            t = self.wt
            e0, e1 = (e - t, e) if s > 0 else (e, e + t)
            for j in range(1, 6):
                yb = top + (ridgeY - top) * j / 5
                # The profile's half width at height yb.
                if yb <= kneeY:
                    hw = ws - (yb - top) / math.tan(lower)
                else:
                    hw = (ws - kd) - (yb - kneeY) / math.tan(upper)
                hw = max(0.1, hw)
                ya = top + (ridgeY - top) * (j - 1) / 5
                b = [cx + e0, ya, cz - hw, cx + e1, yb, cz + hw] if along == "x" else [cx - hw, ya, cz + e0, cx + hw, yb, cz + e1]
                k.solids.append([r3(q) for q in b])
        for j in range(1, 8):
            yb = top + (ridgeY - top) * j / 8 - 0.1
            hw = (ws - (yb - top) / math.tan(lower)) if yb <= kneeY else ((ws - kd) - (yb - kneeY) / math.tan(upper))
            if hw < 0.2:
                continue
            hl = HL - ov * 0.6
            b = [cx - hl, top, cz - hw, cx + hl, yb, cz + hw] if along == "x" else [cx - hw, top, cz - hl, cx + hw, yb, cz + hl]
            k.solids.append([r3(q) for q in b])
        k.box([cx - HL, ridgeY - 0.05, cz - 0.13, cx + HL, ridgeY + 0.08, cz + 0.13] if along == "x" else
              [cx - 0.13, ridgeY - 0.05, cz - HL, cx + 0.13, ridgeY + 0.08, cz + HL], "paint",
              self.S.get("ridge", (0.25, 0.23, 0.22)), "shell", collide=False)

    def shed(self, v):
        """One slope, high over the back wall (or `high`), its side walls carried up under it."""
        k, far = self.k, self.far
        R = v.roof
        ov = R.get("over", 0.5)
        high = R.get("high", "back")
        rm, rt = R.get("m", "metal"), R.get("tint", (0.35, 0.37, 0.4))
        top = v.top
        rise = R.get("rise", 1.4)
        x0, z0, x1, z1 = v.x0, v.z0, v.x1, v.z1
        span = (z1 - z0) if high in ("back", "front") else (x1 - x0)
        slope = rise / span

        def yat(x, z):
            if high == "back":
                return top + rise - (z - z0) * slope
            if high == "front":
                return top + (z - z0) * slope
            if high == "left":
                return top + rise - (x - x0) * slope
            return top + (x - x0) * slope

        e = [(x0 - ov, z0 - ov), (x1 + ov, z0 - ov), (x1 + ov, z1 + ov), (x0 - ov, z1 + ov)]
        pts = self._facing([(px, yat(px, pz), pz) for px, pz in e], (0, 1, 0))
        k.poly(pts, rm, rt, "shell")
        far.poly(pts, rm, rt, "far")
        k.poly([(p[0], p[1] - 0.12, p[2]) for p in pts][::-1], "paint", self.S.get("soffit", (0.45, 0.38, 0.32)), "shell")
        wm, wtint = v.wall
        # The walls carried up under the slope: two triangles' worth of infill and the high wall.
        t = self.wt
        if high in ("back", "front"):
            for s, xx in ((-1, x0), (1, x1)):
                tri = [(xx, top, z0), (xx, top, z1), (xx, yat(xx, z1), z1), (xx, yat(xx, z0), z0)]
                tri = self._facing(tri, (s, 0, 0))
                k.poly(tri, wm, wtint, "shell")
                k.poly([(p[0] - s * 0.01, p[1], p[2]) for p in tri[::-1]], "int", INT, "near")
                far.poly(tri, wm, wtint, "far")
            zz = z0 if high == "back" else z1
            band = self._facing([(x0, top, zz), (x1, top, zz), (x1, top + rise, zz), (x0, top + rise, zz)],
                                (0, 0, -1 if high == "back" else 1))
            k.poly(band, wm, wtint, "shell")
            far.poly(band, wm, wtint, "far")
        else:
            for s, zz in ((-1, z0), (1, z1)):
                tri = [(x0, top, zz), (x1, top, zz), (x1, yat(x1, zz), zz), (x0, yat(x0, zz), zz)]
                tri = self._facing(tri, (0, 0, s))
                k.poly(tri, wm, wtint, "shell")
                k.poly([(p[0], p[1], p[2] - s * 0.01) for p in tri[::-1]], "int", INT, "near")
                far.poly(tri, wm, wtint, "far")
            xx = x0 if high == "left" else x1
            band = self._facing([(xx, top, z0), (xx, top, z1), (xx, top + rise, z1), (xx, top + rise, z0)],
                                (-1 if high == "left" else 1, 0, 0))
            k.poly(band, wm, wtint, "shell")
            far.poly(band, wm, wtint, "far")
        # Collision: steps under the slope.
        n = 6
        for i in range(n):
            if high in ("back", "front"):
                za = z0 + span * i / n
                zb = z0 + span * (i + 1) / n
                y1 = min(yat(x0, za), yat(x0, zb)) - 0.12
                k.solids.append([r3(x0), r3(top), r3(za), r3(x1), r3(y1), r3(zb)])
            else:
                xa = x0 + span * i / n
                xb = x0 + span * (i + 1) / n
                y1 = min(yat(xa, z0), yat(xb, z0)) - 0.12
                k.solids.append([r3(xa), r3(top), r3(z0), r3(xb), r3(y1), r3(z1)])
        del t

    # ------------------------------------------------------------------ the rest
    def plinths(self):
        pm, ptint = self.S.get("plinth", ("concrete", (0.6, 0.6, 0.58)))
        for v in self.vols:
            o = {s: (0.0 if self.neighbours(v, s) else 0.03) for s in ("front", "back", "left", "right")}
            self.k.box([v.x0 - o["left"], 0, v.z0 - o["back"], v.x1 + o["right"], self.base, v.z1 + o["front"]], pm,
                       ptint, "shell")
        return self

    def outputs(self):
        """Entrances (the doors the game hangs: exterior doors at most 1.4 m wide), footprint, aprons."""
        for q in self.doors:
            if not q["entrance"] or q["w"] > 1.4:
                continue
            v = self.by[q["vol"]]
            g = v.side(q["side"], self.wt)
            c = r3((g["c0"] + g["c1"]) / 2)
            y0 = r3(self.Y(q["floor"]))
            y1 = r3(self.Y(q["floor"]) + q["h"])
            if g["axis"] == "x":
                self.entrances.append({"x": q["at"], "z": c, "y0": y0, "y1": y1, "along": "x", "width": q["w"]})
            else:
                self.entrances.append({"x": c, "z": q["at"], "y0": y0, "y1": y1, "along": "z", "width": q["w"]})
        return self

    def open_volumes(self):
        """Porches and galleries: posts, rails round their upper decks, the deck boards."""
        k = self.k
        for v in self.vols:
            if not v.open:
                continue
            post = v.d.get("post", ("paint", self.trim))
            pr = v.d.get("postSize", 0.2)
            rail = v.d.get("rail", self.S.get("railTint", (0.24, 0.2, 0.17)))
            deck = v.d.get("deck", (0.55, 0.42, 0.3))
            # The deck (its plinth is the step up).
            k.box([v.x0, self.base - 0.02, v.z0, v.x1, self.base + 0.01, v.z1], "paint", deck, "shell", collide=False,
                  skip={"bottom"})
            # Posts at the corners off the house and every ~2.8 m along the open edges.
            pts = set()
            for s in ("front", "back", "left", "right"):
                if any(not w.open for w, _, _ in self.neighbours(v, s, opens=True)):
                    continue
                g = v.side(s, pr)
                n = max(1, round((g["a1"] - g["a0"]) / 2.8))
                for i in range(n + 1):
                    a = g["a0"] + (g["a1"] - g["a0"]) * i / n
                    a = min(max(a, g["a0"] + pr / 2), g["a1"] - pr / 2)
                    c = (g["c0"] + g["c1"]) / 2
                    pts.add((round(a, 3), round(c, 3)) if g["axis"] == "x" else (round(c, 3), round(a, 3)))
            gaps = v.d.get("gaps", [])
            # (No post in front of a ground-floor door of the house behind it.)
            door_lines = []
            for q in self.doors:
                if q["floor"] != 0:
                    continue
                w = self.by[q["vol"]]
                g = w.side(q["side"], self.wt)
                face = {"front": v.z0, "back": v.z1, "left": v.x1, "right": v.x0}[q["side"]]
                if abs(g["plane"] - face) < 1e-3:
                    door_lines.append((g["axis"], q["at"]))
            pts = {p for p in pts if not any((ax == "x" and abs(p[0] - at) < 0.85) or (ax == "z" and abs(p[1] - at) < 0.85)
                                             for ax, at in door_lines)}
            for L in range(v.floors):
                y0 = self.base if L == 0 else self.Y(L)
                y1 = self.Y(L + 1) - SLAB
                for x, z in pts:
                    if v.d.get("round"):
                        k.cyl(x, z, pr / 2, y0, y1, post[0], post[1], "shell", seg=8)
                    else:
                        k.box([x - pr / 2, y0, z - pr / 2, x + pr / 2, y1, z + pr / 2], post[0], post[1], "shell")
                # Rails round the upper decks (and the ground deck where asked), gaps for steps.
                if L == 0 and not v.d.get("railGround"):
                    continue
                y = y0
                for s in ("front", "back", "left", "right"):
                    for a0, a1 in self.edge_open(v, s, floors=L):
                        g = v.side(s, 0.1)
                        segs = [(a0, a1)]
                        for gs, ga, gb in gaps:
                            if gs == s and L == 0:
                                segs = interval_minus(segs, (ga, gb))
                        c = (g["c0"] + g["c1"]) / 2
                        for p0, p1 in segs:
                            b = [p0, y, c - 0.04, p1, y + 1.0, c + 0.04] if g["axis"] == "x" else [c - 0.04, y, p0, c + 0.04, y + 1.0, p1]
                            k.box(b, "paint", rail, "shell", visible=False)
                            for ya, yb in ((y + 0.94, y + 1.02), (y + 0.06, y + 0.12)):
                                bb = [p0, ya, c - 0.05, p1, yb, c + 0.05] if g["axis"] == "x" else [c - 0.05, ya, p0, c + 0.05, yb, p1]
                                k.box(bb, "paint", rail, "shell", collide=False)
                            # Balusters (drawn, near only).
                            ln = p1 - p0
                            for j in range(1, int(ln / 0.4)):
                                q = p0 + j * ln / int(ln / 0.4)
                                bb = [q - 0.02, y, c - 0.02, q + 0.02, y + 0.95, c + 0.02] if g["axis"] == "x" else [c - 0.02, y, q - 0.02, c + 0.02, y + 0.95, q + 0.02]
                                k.box(bb, "paint", rail, "near", collide=False)
        return self

    def build(self):
        self.walls()
        self.open_volumes()
        self.floors_and_stairs()
        self.partitions()
        self.roofs()
        self.plinths()
        for f in self.S.get("deco", []):
            f(self)
        self.outputs()
        return self

    def translate(self, dx, dz):
        """Move everything by (dx, dz) (the pivot to the footprint's middle)."""
        for kit in (self.k, self.far):
            for P in kit.parts:
                if P["t"] == "box":
                    b = P["b"]
                    P["b"] = [r3(b[0] + dx), b[1], r3(b[2] + dz), r3(b[3] + dx), b[4], r3(b[5] + dz)]
                elif P["t"] == "poly":
                    P["p"] = [(r3(p[0] + dx), p[1], r3(p[2] + dz)) for p in P["p"]]
                elif P["t"] == "cyl":
                    P["c"] = (r3(P["c"][0] + dx), r3(P["c"][1] + dz))
                elif P["t"] == "beam":
                    P["a"] = (r3(P["a"][0] + dx), P["a"][1], r3(P["a"][2] + dz))
                    P["b"] = (r3(P["b"][0] + dx), P["b"][1], r3(P["b"][2] + dz))
            kit.solids = [[r3(b[0] + dx), b[1], r3(b[2] + dz), r3(b[3] + dx), b[4], r3(b[5] + dz)] for b in kit.solids]
        for e in self.entrances:
            e["x"] = r3(e["x"] + dx)
            e["z"] = r3(e["z"] + dz)

    # ------------------------------------------------------------------ helpers for deco and routes
    def face(self, vname, side):
        v = self.by[vname]
        return v.side(side, self.wt)
