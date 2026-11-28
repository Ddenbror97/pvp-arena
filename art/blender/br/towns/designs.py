"""
The rebuilt first towns' 48 houses, twelve per town, each town its own architecture (and none
like the island's other own buildings: Bayview's white flat-roofed villas, Fisher's Cove's
narrow harbour houses, the military base's blocks):

  Northstar Town   New England main street: red-brick walk-ups and corner shops with cornices,
                   painted clapboard triple-deckers with stacked porches, a Victorian with its
                   corner tower, Second Empire mansards, colonials and saltboxes under shingles.
  Millhaven        The mill town: dark brick lofts with steel windows and water tanks, worker
                   rows, a corner tavern, a tenement with its fire escape, a sawtooth workshop,
                   corrugated-steel container flats, a foreman's hip-roofed house.
  Crossroads       The junction town of the plains: adobe and stucco, Pueblo terraces stepping
                   up, a Mission front, a motor-court gallery, Old West false fronts over
                   boardwalks, a Monterey balcony, ranch houses under hip and gambrel roofs.
  Riverwood        The lumber town by the river: board-and-batten and log, steep gables over
                   stone ground floors, decks on posts, a fire-lookout tower, chalets with
                   balconies round every floor, a boathouse, a mercantile.

Every house has two or more storeys, a stair to every one and a roof top to stand on (a deck
on its flat roof behind a parapet or a rail, a mansard's deck, a lower wing's or a porch's
roof, a tower top). Plans keep a hall beside each stair: the flights stack along one wall and
the walk round the well to the next flight stays clear on every floor (the walk routes in
build_towns.py follow it; scripts/br/map-audit/towns-walk.ts walks them).
"""
import math

from townkit import SLAB, flight_len

TOWNS = {}
DESIGNS = {}
WT = 0.25


def design(did, town):
    def reg(f):
        DESIGNS[did] = f
        TOWNS.setdefault(town, []).append(did)
        return f
    return reg


# ---------------------------------------------------------------------------------- colours
def rgb(h):
    """sRGB hex to linear (the tints are linear)."""
    h = h.lstrip("#")
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 3) for i in (0, 2, 4))


WHITE = rgb("f2f0ea")
CREAM = rgb("efe4cc")
BLACK = rgb("2a2a2c")
CHARCOAL = rgb("3c3d40")
GREEN_DARK = rgb("2f4a3a")
NAVY = rgb("27354d")
OXBLOOD = rgb("6e2723")
RUST = rgb("8a4a2c")
STEEL = rgb("4a5055")
TERRA = rgb("b5623e")
ADOBE = rgb("c9a27c")
SAND = rgb("ddc49c")
CLAY = rgb("b97a55")
WOOD_DARK = rgb("5a3e2b")
WOOD_MID = rgb("8a6040")
CEDAR = rgb("9a5a38")


# ---------------------------------------------------------------------------------- the plan
class Plan:
    """A main block w × d (centred, front +z) with its stair along z beside one side wall, a
    hall beside the stair (the front door into it), rooms the other side of the hall wall."""

    def __init__(self, w, d, floors, fh=3.0, side="right", sw=1.15, land=1.15, roof=True, name="main", x=0.0, z=0.0,
                 off=0.0):
        self.w, self.d, self.floors, self.fh, self.side, self.name = w, d, floors, fh, side, name
        X, Z = w / 2, d / 2
        self.x0, self.z0, self.x1, self.z1 = x - X, z - Z, x + X, z + Z
        if side == "right":
            self.c1 = self.x1 - WT - off
            self.c0 = self.c1 - sw
            self.hall = self.c0 - 1.3
            self.walk = self.c0 - 0.6
            self.far_wall = self.x0 + WT
        else:
            self.c0 = self.x0 + WT + off
            self.c1 = self.c0 + sw
            self.hall = self.c1 + 1.3
            self.walk = self.c1 + 0.6
            self.far_wall = self.x1 - WT
        self.a0 = self.z1 - WT - land
        self.a1 = self.a0 - flight_len(fh)
        if self.a1 - (self.z0 + WT) < 1.15:
            raise ValueError(f"{w}x{d}: too shallow for the stair ({self.a1 - (self.z0 + WT):.2f} m landing)")
        self.roof = roof

    @property
    def rect(self):
        return (self.x0, self.z0, self.x1, self.z1)

    def stair(self, **kw):
        return dict(vol=self.name, axis="z", a0=self.a0, a1=self.a1, c0=self.c0, c1=self.c1, roof=self.roof, **kw)

    def rooms(self):
        """The rooms' x range (beside the hall)."""
        if self.side == "right":
            return (self.x0 + WT, self.hall - 0.08)
        return (self.hall + 0.08, self.x1 - WT)

    def parts(self, floors=None, hall=True, split=None, doors=None, divide=True, extra=()):
        """The hall wall (doorways into the front and back rooms) and the wall between them."""
        out = []
        fl = list(floors if floors is not None else range(self.floors))
        r0, r1 = self.rooms()
        zr = split if split is not None else (self.z0 + self.z1) / 2 - 0.3
        if hall and r1 - r0 >= 2.4:
            ds = doors if doors is not None else [round((zr + self.z1 - WT) / 2, 2), round((zr + self.z0 + WT) / 2, 2)]
            out.append(dict(vol=self.name, axis="z", at=self.hall, frm=self.z0 + WT, to=self.z1 - WT, doors=ds, floors=fl))
            if divide and r1 - r0 >= 3.0:
                out.append(dict(vol=self.name, axis="x", at=zr, frm=r0, to=r1, doors=[], floors=fl))
        out += list(extra)
        return out


def vol(name, rect, floors, roof, **kw):
    return dict(name=name, rect=rect, floors=floors, roof=roof, **kw)


def flat(parapet=1.0, **kw):
    return dict(type="flat", parapet=parapet, **kw)


def gable(pitch=0.6, m="shingle", tint=CHARCOAL, over=0.45, along=None, **kw):
    return dict(type="gable", pitch=pitch, m=m, tint=tint, over=over, along=along, **kw)


def hip(pitch=0.5, m="shingle", tint=CHARCOAL, over=0.5, along=None, **kw):
    return dict(type="hip", pitch=pitch, m=m, tint=tint, over=over, along=along, **kw)


# ---------------------------------------------------------------------------------- decorations
def chimney(x, z, w=0.9, d=0.7, top=None, m=None, tint=None, cap=CHARCOAL):
    """A chimney stack from the first floor up through the roof (in the walls' own material
    unless given: another material is another draw)."""
    def f(B):
        nonlocal m, tint
        if m is None:
            m, tint = B.wall
        y1 = top if top is not None else max(v.top for v in B.vols) + 3.4
        B.k.box([x - w / 2, B.Y(1), z - d / 2, x + w / 2, y1, z + d / 2], m, tint, "shell")
        B.k.box([x - w / 2 - 0.08, y1, z - d / 2 - 0.08, x + w / 2 + 0.08, y1 + 0.14, z + d / 2 + 0.08], "paint", cap,
                "shell", collide=False)
        B.far.box([x - w / 2, B.Y(1), z - d / 2, x + w / 2, y1, z + d / 2], m, tint, "far", collide=False)
    return f


def water_tank(x, z, vname="main", r=1.25, h=2.4, legs=2.2, tint=WOOD_MID, roof=OXBLOOD, m="wood"):
    """A rooftop water tank on a steel stand (the walk-ups' and lofts' landmark)."""
    def f(B):
        y = B.by[vname].top
        for dx in (-r * 0.7, r * 0.7):
            for dz in (-r * 0.7, r * 0.7):
                B.k.box([x + dx - 0.07, y, z + dz - 0.07, x + dx + 0.07, y + legs, z + dz + 0.07], "paint", STEEL, "shell")
        B.k.box([x - r, y + legs - 0.12, z - r, x + r, y + legs, z + r], "paint", STEEL, "shell")
        B.k.cyl(x, z, r, y + legs, y + legs + h, m, tint, "shell", seg=10)
        # Its conical roof.
        n = 10
        ring = [(x + (r + 0.08) * math.cos(2 * math.pi * i / n), z + (r + 0.08) * math.sin(2 * math.pi * i / n)) for i in range(n)]
        for i in range(n):
            a, b = ring[i], ring[(i + 1) % n]
            B.k.poly([(a[0], y + legs + h, a[1]), (x, y + legs + h + 0.9, z), (b[0], y + legs + h, b[1])][::-1], "paint", roof,
                     "shell")
        B.far.box([x - r, y + legs, z - r, x + r, y + legs + h + 0.5, z + r], m, tint, "far", collide=False)
    return f


def ac_units(spots, vname="main"):
    """Air-conditioning boxes on a roof (cover)."""
    def f(B):
        y = B.by[vname].top
        for x, z, turn in spots:
            w, d = (1.1, 0.8) if turn == 0 else (0.8, 1.1)
            B.k.box([x - w / 2, y, z - d / 2, x + w / 2, y + 0.95, z + d / 2], "paint", rgb("b9bcbd"), "shell")
            B.k.box([x - 0.3, y + 0.95, z - 0.3, x + 0.3, y + 1.0, z + 0.3], "paint", rgb("3a3c3e"), "near", collide=False)
    return f


def pergola(x0, z0, x1, z1, vname="main", h=2.4, tint=WOOD_MID, along="x"):
    def f(B):
        y = B.by[vname].top
        for x in (x0 + 0.08, x1 - 0.08):
            for z in (z0 + 0.08, z1 - 0.08):
                B.k.box([x - 0.08, y, z - 0.08, x + 0.08, y + h, z + 0.08], "paint", tint, "shell")
        # The two beams across the slats, on the posts (slats along x lie on beams along z).
        if along == "x":
            for x in (x0 + 0.08, x1 - 0.08):
                B.k.box([x - 0.06, y + h - 0.2, z0, x + 0.06, y + h, z1], "paint", tint, "shell", collide=False)
        else:
            for z in (z0 + 0.08, z1 - 0.08):
                B.k.box([x0, y + h - 0.2, z - 0.06, x1, y + h, z + 0.06], "paint", tint, "shell", collide=False)
        n = max(2, int((x1 - x0 if along == "z" else z1 - z0) / 0.5))
        for i in range(n + 1):
            if along == "x":
                z = z0 + (z1 - z0) * i / n
                B.k.box([x0 - 0.2, y + h, z - 0.04, x1 + 0.2, y + h + 0.14, z + 0.04], "paint", tint, "near", collide=False)
            else:
                x = x0 + (x1 - x0) * i / n
                B.k.box([x - 0.04, y + h, z0 - 0.2, x + 0.04, y + h + 0.14, z1 + 0.2], "paint", tint, "near", collide=False)
    return f


def planters(spots, vname="main", green=rgb("4f7a3a"), box=rgb("8a6a4a")):
    def f(B):
        y = B.by[vname].top
        for x0, z0, x1, z1 in spots:
            B.k.box([x0, y, z0, x1, y + 0.55, z1], "paint", box, "shell")
            B.k.box([x0 + 0.06, y + 0.55, z0 + 0.06, x1 - 0.06, y + 0.75, z1 - 0.06], "paint", green, "shell", collide=False)
    return f


def solar(x0, z0, x1, z1, vname="main", tilt=0.35, y=None):
    def f(B):
        yy = B.by[vname].top if y is None else y
        dz = z1 - z0
        rise = dz * math.tan(tilt)
        B.k.poly([(x0, yy + 0.4, z1), (x1, yy + 0.4, z1), (x1, yy + 0.4 + rise, z0), (x0, yy + 0.4 + rise, z0)], "paint",
                 rgb("1c2a3c"), "shell")
        for x in (x0 + 0.1, x1 - 0.1):
            B.k.box([x - 0.04, yy, z0 + 0.1, x + 0.04, yy + 0.4 + rise, z0 + 0.18], "paint", STEEL, "shell", collide=False)
            B.k.box([x - 0.04, yy, z1 - 0.18, x + 0.04, yy + 0.4, z1 - 0.1], "paint", STEEL, "shell", collide=False)
    return f


def awning(vname, side, a0, a1, y, depth, tint, valance=True):
    def f(B):
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"]
        if g["axis"] == "x":
            pts = [(a0, y, p), (a1, y, p), (a1, y - 0.5, p + sg * depth), (a0, y - 0.5, p + sg * depth)]
        else:
            pts = [(p, y, a0), (p, y, a1), (p + sg * depth, y - 0.5, a1), (p + sg * depth, y - 0.5, a0)]
        B.k.poly(pts if sg > 0 else pts[::-1], "paint", tint, "shell", both=True)
        if valance:
            e = p + sg * depth
            b = [a0, y - 0.82, e - 0.02, a1, y - 0.5, e + 0.02] if g["axis"] == "x" else [e - 0.02, y - 0.82, a0, e + 0.02, y - 0.5, a1]
            B.k.box(b, "paint", tint, "shell", collide=False)
    return f


def sign(vname, side, a0, a1, y, h, tint, letters=None):
    """A painted sign board over a shopfront (letters: a lighter band across it)."""
    def f(B):
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"]
        b = [a0, y, p, a1, y + h, p + sg * 0.1] if g["axis"] == "x" else [p, y, a0, p + sg * 0.1, y + h, a1]
        B.k.box(b, "paint", tint, "shell", collide=False)
        if letters:
            m = (a1 - a0) * 0.12
            b = ([a0 + m, y + h * 0.35, p + sg * 0.1, a1 - m, y + h * 0.65, p + sg * 0.12] if g["axis"] == "x"
                 else [p + sg * 0.1, y + h * 0.35, a0 + m, p + sg * 0.12, y + h * 0.65, a1 - m])
            B.k.box(b, "paint", letters, "near", collide=False)
    return f


def cornice(vname, tint, h=0.45, depth=0.32, sides=("front", "left", "right", "back"), y=None):
    """A heavy cornice under the parapet (the walk-ups' and main street's)."""
    def f(B):
        v = B.by[vname]
        yy = (v.top if y is None else y) - 0.15
        for s in sides:
            g = B.face(vname, s)
            o = g["out"]
            sg = o[0] + o[2]
            p = g["plane"]
            for i, (hh, dd) in enumerate(((h, depth), (h * 0.4, depth * 0.55))):
                y0 = yy - (h if i == 0 else h + 0.25)
                if g["axis"] == "x":
                    b = [v.x0 - dd, y0, p, v.x1 + dd, y0 + hh, p + sg * dd]
                else:
                    b = [p, y0, v.z0, p + sg * dd, y0 + hh, v.z1]
                B.k.box(b, "paint", tint, "shell", collide=False)
    return f


def band(vname, y, tint, sides=("front", "left", "right", "back"), h=0.18, depth=0.06):
    """A string course round the walls at height y."""
    def f(B):
        v = B.by[vname]
        for s in sides:
            g = B.face(vname, s)
            o = g["out"]
            sg = o[0] + o[2]
            p = g["plane"]
            b = ([v.x0 - depth, y, p, v.x1 + depth, y + h, p + sg * depth] if g["axis"] == "x"
                 else [p, y, v.z0, p + sg * depth, y + h, v.z1])
            B.k.box(b, "paint", tint, "near", collide=False)
    return f


def balcony(vname, side, floor, a0, a1, depth, tint, rail=BLACK, slab="paint"):
    """A balcony slab on the wall at storey `floor` (its door is in the spec), rails round it."""
    def f(B):
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"]
        y = B.Y(floor)
        if g["axis"] == "x":
            B.k.box([a0, y - 0.2, p, a1, y, p + sg * depth], slab, tint, "shell")
            e = p + sg * depth
            B.k.box([a0, y, e - sg * 0.05, a1, y + 1.05, e], "paint", rail, "shell", visible=False)
            B.k.box([a0, y + 0.97, e - sg * 0.06, a1, y + 1.05, e], "paint", rail, "shell", collide=False)
            for x in (a0, a1 - 0.05):
                B.k.box([x, y, p, x + 0.05, y + 1.05, e], "paint", rail, "shell", visible=False)
                B.k.box([x, y + 0.97, p, x + 0.05, y + 1.05, e], "paint", rail, "shell", collide=False)
                B.k.box([x, y, e - sg * 0.06, x + 0.05, y + 1.05, e], "paint", rail, "shell", collide=False)
            for i in range(1, int((a1 - a0) / 0.14)):
                x = a0 + i * 0.14
                B.k.box([x - 0.015, y, e - sg * 0.04, x + 0.015, y + 1.0, e - sg * 0.01], "paint", rail, "near", collide=False)
        else:
            B.k.box([p, y - 0.2, a0, p + sg * depth, y, a1], slab, tint, "shell")
            e = p + sg * depth
            B.k.box([e - sg * 0.05, y, a0, e, y + 1.05, a1], "paint", rail, "shell", visible=False)
            B.k.box([e - sg * 0.06, y + 0.97, a0, e, y + 1.05, a1], "paint", rail, "shell", collide=False)
            for z in (a0, a1 - 0.05):
                B.k.box([p, y, z, e, y + 1.05, z + 0.05], "paint", rail, "shell", visible=False)
                B.k.box([p, y + 0.97, z, e, y + 1.05, z + 0.05], "paint", rail, "shell", collide=False)
                B.k.box([e - sg * 0.06, y, z, e, y + 1.05, z + 0.05], "paint", rail, "shell", collide=False)
            for i in range(1, int((a1 - a0) / 0.14)):
                z = a0 + i * 0.14
                B.k.box([e - sg * 0.04, y, z - 0.015, e - sg * 0.01, y + 1.0, z + 0.015], "paint", rail, "near", collide=False)
    return f


def bay(vname, side, a0, a1, depth, floors, m, tint, trim=WHITE, cap=CHARCOAL):
    """A box bay window over storeys `floors` (solid, its windows dark panes in frames)."""
    def f(B):
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"]
        y0 = B.Y(floors[0]) - 0.2
        y1 = B.Y(floors[-1] + 1) - 0.3
        e = p + sg * depth
        b = [a0, y0, p, a1, y1, e] if g["axis"] == "x" else [p, y0, a0, e, y1, a1]
        B.k.box(b, m, tint, "shell")
        B.far.box(b, m, tint, "far", collide=False)
        cb = ([a0 - 0.1, y1, p, a1 + 0.1, y1 + 0.2, e + sg * 0.1] if g["axis"] == "x"
              else [p, y1, a0 - 0.1, e + sg * 0.1, y1 + 0.2, a1 + 0.1])
        B.k.box(cb, "paint", cap, "shell", collide=False)
        for L in floors:
            yy = B.Y(L)
            ww = (a1 - a0) * 0.62
            c = (a0 + a1) / 2
            if g["axis"] == "x":
                gl = [(c - ww / 2, yy + 0.8, e), (c + ww / 2, yy + 0.8, e), (c + ww / 2, yy + 2.2, e), (c - ww / 2, yy + 2.2, e)]
                B.k.poly(gl if sg > 0 else gl[::-1], "paint", (0.1, 0.13, 0.16), "shell")
                B.k.box([c - ww / 2 - 0.08, yy + 0.72, e, c + ww / 2 + 0.08, yy + 0.8, e + sg * 0.06], "paint", trim, "near", collide=False)
                B.k.box([c - 0.03, yy + 0.8, e, c + 0.03, yy + 2.2, e + sg * 0.03], "paint", trim, "near", collide=False)
            else:
                gl = [(e, yy + 0.8, c + ww / 2), (e, yy + 0.8, c - ww / 2), (e, yy + 2.2, c - ww / 2), (e, yy + 2.2, c + ww / 2)]
                B.k.poly(gl if sg > 0 else gl[::-1], "paint", (0.1, 0.13, 0.16), "shell")
                B.k.box([e, yy + 0.72, c - ww / 2 - 0.08, e + sg * 0.06, yy + 0.8, c + ww / 2 + 0.08], "paint", trim, "near", collide=False)
                B.k.box([e, yy + 0.8, c - 0.03, e + sg * 0.03, yy + 2.2, c + 0.03], "paint", trim, "near", collide=False)
    return f


def dormers(vname, side, centres, w=1.3, tint=WHITE, roof_tint=CHARCOAL, m="shingle"):
    """Dormers on a gable or hip roof's slope (drawn; the roof's own collision steps carry them)."""
    def f(B):
        v = B.by[vname]
        R = v.roof
        ov = R.get("over", 0.45)
        pitch = R.get("pitch", 0.6)
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"]
        top = v.top
        for c in centres:
            # Its face 0.9 m in from the wall line, its sill on the slope there.
            face = p - sg * 0.9
            ys = top + 0.15
            yt = ys + 1.4
            back = p - sg * (0.9 + 1.6)
            if g["axis"] == "x":
                B.k.box([c - w / 2, ys - 0.6, min(face, back), c + w / 2, yt, max(face, back)], "paint", tint, "shell", collide=False)
                gl = [(c - w / 2 + 0.2, ys + 0.1, face + sg * 0.01), (c + w / 2 - 0.2, ys + 0.1, face + sg * 0.01),
                      (c + w / 2 - 0.2, yt - 0.2, face + sg * 0.01), (c - w / 2 + 0.2, yt - 0.2, face + sg * 0.01)]
                B.k.poly(gl if sg > 0 else gl[::-1], "paint", (0.1, 0.13, 0.16), "shell")
                for s2 in (-1, 1):
                    pts = [(c - (w / 2 + 0.15) * -s2, yt, face + sg * 0.15), (c, yt + 0.55, face + sg * 0.15),
                           (c, yt + 0.55, back), (c - (w / 2 + 0.15) * -s2, yt, back)]
                    B.k.poly(B._facing(pts, (s2, 1, 0)), m, roof_tint, "shell")
            else:
                B.k.box([min(face, back), ys - 0.6, c - w / 2, max(face, back), yt, c + w / 2], "paint", tint, "shell", collide=False)
                gl = [(face + sg * 0.01, ys + 0.1, c + w / 2 - 0.2), (face + sg * 0.01, ys + 0.1, c - w / 2 + 0.2),
                      (face + sg * 0.01, yt - 0.2, c - w / 2 + 0.2), (face + sg * 0.01, yt - 0.2, c + w / 2 - 0.2)]
                B.k.poly(gl if sg > 0 else gl[::-1], "paint", (0.1, 0.13, 0.16), "shell")
                for s2 in (-1, 1):
                    pts = [(face + sg * 0.15, yt, c + (w / 2 + 0.15) * s2), (face + sg * 0.15, yt + 0.55, c),
                           (back, yt + 0.55, c), (back, yt, c + (w / 2 + 0.15) * s2)]
                    B.k.poly(B._facing(pts, (0, 1, s2)), m, roof_tint, "shell")
        del pitch, ov
    return f


def vigas(vname, side, y, n, tint=WOOD_DARK, out=0.45):
    """Pueblo roof beams' ends through the wall under the parapet."""
    def f(B):
        v = B.by[vname]
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"]
        a0, a1 = g["a0"] + 0.6, g["a1"] - 0.6
        for i in range(n):
            c = a0 + (a1 - a0) * (i + 0.5) / n
            b = [c - 0.11, y, p, c + 0.11, y + 0.22, p + sg * out] if g["axis"] == "x" else [p, y, c - 0.11, p + sg * out, y + 0.22, c + 0.11]
            B.k.box(b, "paint", tint, "shell", collide=False)
        del v
    return f


def false_front(vname, h, tint, m=None, step=True, trim=WHITE):
    """An Old West false front: the front wall carried up square above the gable, stepped."""
    def f(B):
        v = B.by[vname]
        mm, tt = (m, tint) if m else v.wall
        g = B.face(vname, "front")
        p = g["plane"]
        top = v.top
        B.k.box([v.x0, top, p - 0.25, v.x1, top + h, p], mm, tt, "shell")
        B.far.box([v.x0, top, p - 0.25, v.x1, top + h, p], mm, tt, "far", collide=False)
        if step:
            B.k.box([v.x0 + 1.2, top + h, p - 0.25, v.x1 - 1.2, top + h + 0.6, p], mm, tt, "shell")
        B.k.box([v.x0 - 0.12, top + h - 0.25, p, v.x1 + 0.12, top + h, p + 0.2], "paint", trim, "shell", collide=False)
    return f


def lamp(x, y, z, tint=BLACK):
    def f(B):
        B.k.box([x - 0.12, y, z - 0.12, x + 0.12, y + 0.4, z + 0.12], "paint", tint, "near", collide=False)
        B.k.box([x - 0.08, y + 0.06, z - 0.08, x + 0.08, y + 0.32, z + 0.08], "paint", rgb("ffe7a8"), "near", collide=False)
    return f


def steps(x, z, w, along="x", n=1, tint=rgb("9a9890")):
    """A stoop of n steps in front of a door at ground level, up to the ground floor (its plinth's
    top): the top step level with the sill, not a lip in the doorway."""
    def f(B):
        top = B.Y(0)
        for i in range(n):
            d = 0.3 * (n - i)
            if along == "x":
                B.k.box([x - w / 2, top * i / n, z, x + w / 2, top * (i + 1) / n, z + d], "concrete", tint, "shell")
    return f


def fire_escape(vname, side, a0, a1, floors, depth=1.2, tint=rgb("2b2b2d")):
    """A fire escape's balconies outside storeys `floors` (walkable, railed; its doors are in the
    spec) and the drop ladders' frames between them (drawn)."""
    def f(B):
        for L in floors:
            balcony(vname, side, L, a0, a1, depth, tint, rail=tint, slab="paint")(B)
        g = B.face(vname, side)
        o = g["out"]
        sg = o[0] + o[2]
        p = g["plane"] + sg * (depth - 0.3)
        for L in floors[:-1]:
            ya, yb = B.Y(L), B.Y(L + 1)
            if g["axis"] == "x":
                B.k.beam((a1 - 0.4, ya, p), (a0 + 0.4, yb, p), 0.08, 0.08, "paint", tint, "shell")
                B.k.beam((a1 - 0.4, ya, p - sg * 0.5), (a0 + 0.4, yb, p - sg * 0.5), 0.08, 0.08, "paint", tint, "shell")
            else:
                B.k.beam((p, ya, a1 - 0.4), (p, yb, a0 + 0.4), 0.08, 0.08, "paint", tint, "shell")
                B.k.beam((p - sg * 0.5, ya, a1 - 0.4), (p - sg * 0.5, yb, a0 + 0.4), 0.08, 0.08, "paint", tint, "shell")
    return f


def sawtooth(vname, n, h=1.6, tint=rgb("6d7277"), glass=(0.25, 0.32, 0.38)):
    """North-light sawtooth roof teeth on a flat roof (each a glazed vertical face and a slope),
    along x; drawn with their own collision."""
    def f(B):
        v = B.by[vname]
        top = v.top
        x0, x1 = v.x0 + 0.3, v.x1 - 0.3
        z0, z1 = v.z0 + 0.3, v.z1 - 0.3
        tw = (z1 - z0) / n
        for i in range(n):
            za = z0 + i * tw
            zb = za + tw
            # Glazed face at za (facing -z, north), slope down to zb.
            B.k.poly([(x1, top, za), (x0, top, za), (x0, top + h, za), (x1, top + h, za)], "paint", glass, "shell")
            pts = [(x0, top + h, za), (x0, top, zb), (x1, top, zb), (x1, top + h, za)]
            B.k.poly(B._facing(pts, (0, 1, 0)), "metal", tint, "shell")
            B.far.poly(B._facing(pts, (0, 1, 0)), "metal", tint, "far")
            for s, x in ((-1, x0), (1, x1)):
                tri = [(x, top, za), (x, top, zb), (x, top + h, za)]
                B.k.poly(B._facing(tri, (s, 0, 0)), v.wall[0], v.wall[1], "shell")
            for j in range(3):
                zz0 = za + tw * j / 3
                zz1 = za + tw * (j + 1) / 3
                B.k.solids.append([round(x0, 3), round(top, 3), round(zz0, 3), round(x1, 3), round(top + h * (1 - (j + 1) / 3) + 0.05, 3), round(zz1, 3)])
    return f


def rail_line(x0, z0, x1, z1, y, tint=BLACK):
    """A guard rail 1.05 m high from (x0, z0) to (x1, z1) (axis-aligned) at height y."""
    def f(B):
        if abs(z1 - z0) < 1e-6:
            B.k.box([min(x0, x1), y, z0 - 0.03, max(x0, x1), y + 1.05, z0 + 0.03], "paint", tint, "shell")
        else:
            B.k.box([x0 - 0.03, y, min(z0, z1), x0 + 0.03, y + 1.05, max(z0, z1)], "paint", tint, "shell")
    return f


def ext_stair(axis, a0, a1, c0, c1, y, rise, tint=rgb("8c8a84"), rail=BLACK, side=None):
    """An outside stair flight (walkable) with a rail on its open side."""
    def f(B):
        B.k.flight(axis, a0, a1, c0, c1, y, rise, "concrete", tint, "shell")
        # The flight's underside, so it reads solid from the side (drawn).
        oc = c1 if side != "lo" else c0
        a = (a0, y + 1.0, oc) if axis == "x" else (oc, y + 1.0, a0)
        b = (a1, y + rise + 1.0, oc) if axis == "x" else (oc, y + rise + 1.0, a1)
        B.k.beam(a, b, 0.06, 0.06, "paint", rail, "shell")
    return f


def all_(*fs):
    def f(B):
        for g in fs:
            g(B)
    return f


# ---------------------------------------------------------------------------------- a house
def house(*, town, title, use, P, wall, trim, roof, vols_extra=(), doors=(), holes=(), parts=None, deco=(),
          win=None, loot=6, plinth=None, stairs_extra=(), links=(), back_door=True, front_door=True,
          rail=None, soffit=None, ridge=None, routes=(), main_wall=None, **kw):
    spec = dict(
        town=town, title=title, use=use, fh=P.fh, wall=wall, trim=trim,
        plinth=plinth or ("paint", rgb("8f8c86")),
        volumes=[vol(P.name, P.rect, P.floors, roof, **({"wall": main_wall} if main_wall else {}))] + list(vols_extra),
        doors=([dict(vol=P.name, side="front", at=round(P.walk, 2))] if front_door else [])
        + ([dict(vol=P.name, side="back", at=round(P.walk, 2), route=False)] if back_door else []) + list(doors),
        holes=list(holes),
        links=list(links),
        stairs=[P.stair()] + list(stairs_extra),
        parts=parts if parts is not None else P.parts(),
        deco=list(deco),
        win=win or {},
        loot=loot,
        routes=list(routes),
        **kw,
    )
    if rail:
        spec["railTint"] = rail
    if soffit:
        spec["soffit"] = soffit
    if ridge:
        spec["ridge"] = ridge
    return spec


def wing(P, side, length, depth, floors, roof, name="wing", at=None, **kw):
    """A volume against the main block's side (centred on `at` along it), within its length."""
    if side in ("left", "right"):
        c = at if at is not None else (P.z0 + P.z1) / 2
        z0, z1 = c - length / 2, c + length / 2
        assert z0 >= P.z0 - 1e-6 and z1 <= P.z1 + 1e-6, "wing longer than the side"
        x0, x1 = (P.x0 - depth, P.x0) if side == "left" else (P.x1, P.x1 + depth)
    else:
        c = at if at is not None else (P.x0 + P.x1) / 2
        x0, x1 = c - length / 2, c + length / 2
        assert x0 >= P.x0 - 1e-6 and x1 <= P.x1 + 1e-6, "wing longer than the side"
        z0, z1 = (P.z0 - depth, P.z0) if side == "back" else (P.z1, P.z1 + depth)
    return vol(name, (round(x0, 3), round(z0, 3), round(x1, 3), round(z1, 3)), floors, roof, **kw)


def porch(P, side, a0, a1, depth, floors=1, roof=None, name="porch", **kw):
    """An open volume (posts, a deck) against a side of the main block from a0 to a1."""
    if side == "front":
        r = (a0, P.z1, a1, P.z1 + depth)
    elif side == "back":
        r = (a0, P.z0 - depth, a1, P.z0)
    elif side == "left":
        r = (P.x0 - depth, a0, P.x0, a1)
    else:
        r = (P.x1, a0, P.x1 + depth, a1)
    return vol(name, tuple(round(q, 3) for q in r), floors, roof or flat(), open=True, **kw)


# ================================================================================== NORTHSTAR
NS = "northstar-town"
BRICK_RED = rgb("f0e6e0")
BRICK_DARK = rgb("c8b8b0")


@design("ns-brick-walkup", NS)
def _ns_walkup():
    P = Plan(14, 11, 4, side="right")
    return house(
        town=NS, title="Brick walk-up", P=P,
        use="Northstar Town: a four-storey red-brick walk-up, two flats a floor, stacked balconies at the back, "
            "a heavy cornice, a roof deck with a water tank and a pergola",
        wall=("brick", BRICK_RED), trim=CREAM, roof=flat(1.0, coping=CREAM),
        doors=[dict(vol="main", side="back", at=-3.5, floor=L, route=False) for L in (1, 2, 3)],
        win={"step": 2.3, "w": 1.1, "head": 2.3, "muntins": True},
        parts=P.parts(doors=[2.2, -2.6]),
        deco=[cornice("main", CREAM), band("main", P.fh + 0.15 - 0.3, CREAM),
              *[balcony("main", "back", L, -4.6, -2.4, 1.1, BRICK_DARK) for L in (1, 2, 3)],
              water_tank(-4.0, -2.6), pergola(-5.9, 1.2, -2.2, 4.4), ac_units([(1.2, 3.8, 0)]),
              steps(P.walk, P.z1, 1.6), lamp(P.walk - 1.0, 2.2, P.z1 + 0.05)],
        loot=10,
    )


@design("ns-corner-store", NS)
def _ns_corner():
    P = Plan(13, 12, 3, side="right")
    r0, r1 = P.rooms()
    return house(
        town=NS, title="Corner store with flats", P=P,
        use="Northstar Town: a three-storey brick corner store, the shop's glass front and awning on the street, "
            "two floors of flats over it, a roof terrace with planters",
        wall=("brick", rgb("e8d6c8")), trim=GREEN_DARK, roof=flat(1.0, coping=CREAM),
        doors=[dict(vol="main", side="front", at=round((r0 + r1) / 2, 2), w=1.3, route=False)],
        holes=[dict(vol="main", side="front", floor=0, a=r0 + 0.4, b=(r0 + r1) / 2 - 0.9, y0=0.35, y1=2.7),
               dict(vol="main", side="front", floor=0, a=(r0 + r1) / 2 + 0.9, b=r1 - 0.3, y0=0.35, y1=2.7),
               dict(vol="main", side="left", floor=0, a=1.0, b=4.6, y0=0.35, y1=2.7)],
        win={"step": 2.4, "w": 1.15, "floors": {"all": [1, 2]}, "muntins": True},
        parts=P.parts(floors=[1, 2], doors=[2.6, -2.8]) + [dict(vol="main", axis="z", at=P.hall, frm=P.z0 + WT,
                                                                 to=P.z1 - WT, doors=[], floors=[0])],
        deco=[awning("main", "front", r0, r1, 3.1, 1.6, GREEN_DARK), awning("main", "left", 0.6, 5.0, 3.1, 1.4, GREEN_DARK),
              sign("main", "front", r0 + 0.5, r1 - 0.5, 3.15, 0.7, CREAM, letters=GREEN_DARK),
              cornice("main", CREAM, h=0.4), planters([(-5.8, 2.2, -4.0, 4.9), (-3.6, 4.2, 0.4, 4.9)]),
              ac_units([(-4.0, -1.0, 0), (-1.5, -1.0, 0)])],
        loot=10,
    )


@design("ns-triple-decker", NS)
def _ns_triple():
    P = Plan(9, 12, 3, side="left")
    return house(
        town=NS, title="Triple-decker", P=P,
        use="Northstar Town: a New England triple-decker in painted clapboard, a flat on each floor, porches "
            "stacked three high across the front, a roof deck behind the parapet",
        wall=("siding", rgb("a9c0cf")), trim=WHITE, roof=flat(0.9, coping=WHITE),
        vols_extra=[porch(P, "front", P.x0, P.x1, 2.2, floors=3, roof=flat(), deck=rgb("6f5a48"), post=("paint", WHITE),
                          postSize=0.22, round=True, gaps=[("front", -0.2, 1.4)])],
        doors=[dict(vol="main", side="front", at=1.6, floor=L, route=False) for L in (1, 2)],
        win={"step": 2.2, "w": 1.0, "shutters": NAVY},
        parts=P.parts(doors=[2.6, -2.4]),
        deco=[cornice("main", WHITE, h=0.35, depth=0.25), ac_units([(2.6, -3.6, 1)]), planters([(1.0, -5.4, 3.9, -4.9)])],
        loot=9,
    )


@design("ns-victorian", NS)
def _ns_victorian():
    P = Plan(11, 10, 2, side="left", roof=False)
    tw = (P.x1, P.z1 - 7.2, P.x1 + 4.6, P.z1)
    c1 = tw[2] - WT
    ts = dict(vol="tower", axis="z", a0=tw[3] - WT - 1.0, a1=tw[3] - WT - 1.0 - flight_len(3.0), c0=c1 - 1.1, c1=c1, roof=False)
    return house(
        town=NS, title="Victorian with tower", P=P,
        use="Northstar Town: a painted Victorian, two storeys under a steep gable, its three-storey corner tower "
            "under a slate roof, a porch across the front with a sun deck on its roof",
        wall=("siding", rgb("e8d0a8")), trim=WHITE, roof=gable(0.75, tint=rgb("50443e"), along="z"),
        vols_extra=[vol("tower", tw, 3, dict(type="hip", pitch=1.0, m="slate", tint=rgb("3e4a5a"), over=0.35),
                        wall=("siding", rgb("d9b8c4"))),
                    porch(P, "front", P.x0, P.x1 - 0.01, 2.4, roof=flat(), deck=rgb("7a6550"), post=("paint", WHITE),
                          round=True, postSize=0.2, gaps=[("front", P.walk - 0.9, P.walk + 0.9)])],
        stairs_extra=[ts],
        links=[dict(a="main", b="tower", floor=0, at=0.4), dict(a="main", b="tower", floor=1, at=0.4)],
        doors=[dict(vol="main", side="front", at=-1.0, floor=1, route=False),
               dict(vol="tower", side="front", at=round(c1 - 1.1 - 0.6, 2))],
        win={"step": 2.1, "w": 0.95, "head": 2.35, "muntins": True, "shutters": rgb("4a5a3e")},
        parts=P.parts(doors=[2.2, -2.2]),
        deco=[chimney(-1.5, -2.8, top=10.2), band("main", 3.0, WHITE, sides=("front", "back", "left")),
              band("tower", 3.0, WHITE), band("tower", 6.0, WHITE)],
        loot=8, ridge=rgb("3a3130"),
    )


@design("ns-colonial", NS)
def _ns_colonial():
    P = Plan(12, 9, 2, side="right", roof=False)
    return house(
        town=NS, title="Colonial", P=P,
        use="Northstar Town: a symmetrical clapboard colonial, two storeys under a shingle gable with three "
            "dormers and a brick chimney at each end, black shutters; the kitchen wing's roof a deck off the "
            "upstairs landing",
        wall=("siding", WHITE), trim=WHITE, roof=gable(0.62, tint=CHARCOAL),
        vols_extra=[wing(P, "left", 6.5, 5.0, 1, flat(edge="rail"), wall=("siding", rgb("e8e6e0")))],
        links=[dict(a="main", b="wing", floor=0, at=-0.6)],
        doors=[dict(vol="main", side="left", at=-0.6, floor=1, route=False), dict(vol="wing", side="back", at=-8.0, route=False)],
        win={"step": 2.3, "w": 1.0, "head": 2.3, "muntins": True, "shutters": BLACK},
        parts=P.parts(doors=[2.0, -2.0]),
        deco=[dormers("main", "front", [-3.6, 0.0, 3.6]), chimney(-3.2, -2.9, top=10.4), chimney(1.6, -2.9, top=10.4),
              steps(P.walk, P.z1, 1.8, n=2), lamp(P.walk - 1.1, 2.3, P.z1 + 0.05), lamp(P.walk + 1.1, 2.3, P.z1 + 0.05)],
        loot=7,
    )


@design("ns-mansard-flats", NS)
def _ns_mansard():
    P = Plan(13, 11, 3, side="right", off=0.65)
    return house(
        town=NS, title="Mansard flats", P=P,
        use="Northstar Town: a cream-brick Second Empire block, three storeys and a slate mansard with dormers "
            "round a roof deck, a bay window up the front",
        wall=("brickpale", rgb("f5eee0")), trim=rgb("e4dccb"),
        roof=dict(type="mansard", h=1.5, inset=0.6, m="slate", tint=rgb("4a4f5a"), dormers={"front": 3, "back": 3, "left": 2}),
        win={"step": 2.2, "w": 1.0, "head": 2.4, "muntins": True, "skip": [("main", "front", -4.6, -1.2)]},
        parts=P.parts(doors=[2.4, -2.6]),
        deco=[bay("main", "front", -4.4, -1.4, 0.8, [1, 2], "brickpale", rgb("f5eee0")), band("main", 3.0, rgb("e4dccb")),
              planters([(-5.3, -4.4, -2.0, -3.9)]), ac_units([(-3.5, 1.0, 0)]), steps(P.walk, P.z1, 1.6, n=2)],
        loot=10,
    )


@design("ns-rowhouses", NS)
def _ns_rows():
    A = Plan(7, 12, 3, side="left", name="a", x=-3.5)
    B_ = Plan(7, 12, 3, side="right", name="b", x=3.5)
    spec = house(
        town=NS, title="Brick row houses", P=A,
        use="Northstar Town: a pair of brick row houses, three storeys each with a stoop and a bay window, "
            "their own stairs to two roof decks behind one parapet",
        wall=("brick", rgb("d8c0b4")), trim=WHITE, roof=flat(1.0, coping=WHITE),
        vols_extra=[vol("b", B_.rect, 3, flat(1.0, coping=WHITE))],
        doors=[dict(vol="b", side="front", at=round(B_.walk, 2), to="b"), dict(vol="b", side="back", at=round(B_.walk, 2), route=False)],
        stairs_extra=[B_.stair()],
        parts=A.parts(hall=False) + B_.parts(hall=False),
        win={"step": 2.0, "w": 0.95, "head": 2.4, "muntins": True,
             "skip": [("a", "front", -5.8, -3.0), ("b", "front", 3.0, 5.8)]},
        deco=[bay("a", "front", -5.6, -3.2, 0.7, [1, 2], "brick", rgb("d8c0b4")),
              bay("b", "front", 3.2, 5.6, 0.7, [1, 2], "brick", rgb("d8c0b4")),
              cornice("a", WHITE, h=0.35, sides=("front", "back", "left")), cornice("b", WHITE, h=0.35, sides=("front", "back", "right")),
              steps(A.walk, A.z1, 1.5, n=2), steps(B_.walk, B_.z1, 1.5, n=2),
              rail_line(0, -5.75, 0, -1.0, 9.15 - 0.0 + 0.0), planters([(-6.4, -5.6, -4.2, -5.1), (4.2, -5.6, 6.4, -5.1)], vname="a")],
        loot=8,
    )
    return spec


@design("ns-garden-apartments", NS)
def _ns_garden():
    P = Plan(15, 11, 3, side="left")
    return house(
        town=NS, title="Garden apartments", P=P,
        use="Northstar Town: a three-storey brick and clapboard apartment house, a two-storey wing whose roof is "
            "the top flat's terrace, balconies to the garden, a roof deck with a pergola",
        wall=("brick", rgb("e0cfc2")), trim=WHITE, roof=flat(1.0, coping=WHITE),
        vols_extra=[wing(P, "right", 8.0, 6.0, 2, flat(1.05, coping=WHITE), wall=("siding", rgb("c9d4c0")), at=P.z0 + 4.0)],
        links=[dict(a="main", b="wing", floor=0, at=P.z0 + 2.6), dict(a="main", b="wing", floor=1, at=P.z0 + 2.6)],
        doors=[dict(vol="main", side="right", at=P.z0 + 2.6, floor=2, route=False), dict(vol="wing", side="front", at=10.5, route=False)],
        parts=P.parts(doors=[2.4, -2.4]) + [dict(vol="main", axis="z", at=2.4, frm=P.z0 + WT, to=P.z1 - WT, doors=[-3.4, 2.6])],
        win={"step": 2.4, "w": 1.2},
        deco=[*[balcony("main", "front", L, 3.4, 6.2, 1.0, WHITE) for L in (1, 2)],
              pergola(-6.2, -4.2, -2.4, -1.0), planters([(9.2, -5.2, 13.2, -4.8)], vname="wing"), ac_units([(4.5, -3.5, 0)])],
        loot=11,
    )


@design("ns-saltbox", NS)
def _ns_saltbox():
    P = Plan(10, 9, 2, side="left", roof=False)
    return house(
        town=NS, title="Saltbox", P=P,
        use="Northstar Town: a saltbox in grey clapboard, two storeys in front and the long roof sweeping down "
            "over the back; a flat-roofed garage wing whose roof is a deck off the upstairs",
        wall=("siding", rgb("b8b6ae")), trim=WHITE, roof=gable(0.62, tint=rgb("4a3d36")),
        vols_extra=[wing(P, "back", 10.0, 3.4, 1, dict(type="shed", high="front", rise=1.6, m="shingle", tint=rgb("4a3d36"), over=0.4),
                         name="lean"),
                    wing(P, "right", 6.0, 4.0, 1, flat(edge="rail"), wall=("siding", rgb("a8a69e")), name="garage")],
        links=[dict(a="main", b="lean", floor=0, at=1.5), dict(a="main", b="garage", floor=0, at=1.2)],
        doors=[dict(vol="main", side="right", at=1.2, floor=1, route=False), dict(vol="garage", side="front", at=7.0, w=2.6, entrance=False)],
        win={"step": 2.2, "w": 0.95, "muntins": True, "shutters": rgb("2f3a44")},
        parts=P.parts(doors=[2.0, -1.8]),
        back_door=False,
        deco=[chimney(0.4, 0.0, top=9.6), lamp(P.walk + 0.9, 2.3, P.z1 + 0.05)],
        loot=7,
    )


@design("ns-fourplex", NS)
def _ns_fourplex():
    P = Plan(13, 10, 2, side="right", roof=False)
    return house(
        town=NS, title="Hip-roofed fourplex", P=P,
        use="Northstar Town: a sage-green fourplex, two flats a floor either side of its hall, under a hipped "
            "shingle roof; a sun porch at the back whose roof is the upstairs flats' deck",
        wall=("siding", rgb("a7b79a")), trim=CREAM, roof=hip(0.52, tint=rgb("3f3833")),
        vols_extra=[porch(P, "back", P.x0 + 0.5, P.x1 - 3.0, 2.8, roof=flat(), deck=rgb("6a5444"), post=("paint", CREAM), round=True)],
        doors=[dict(vol="main", side="back", at=-3.0, floor=1, route=False), dict(vol="main", side="back", at=0.5, route=False)],
        win={"step": 2.3, "w": 1.05, "muntins": True},
        parts=P.parts(doors=[2.4, -2.0]) + [dict(vol="main", axis="z", at=-1.6, frm=P.z0 + WT, to=P.z1 - WT, doors=[2.2, -2.4])],
        deco=[chimney(-1.6, -1.2, top=10.2), steps(P.walk, P.z1, 1.8, n=2), awning("main", "front", P.walk - 1.2, P.walk + 1.2, 2.9, 1.0, GREEN_DARK)],
        loot=8,
    )


@design("ns-main-street", NS)
def _ns_main():
    P = Plan(16, 12, 4, side="left")
    r0, r1 = P.rooms()
    m = (r0 + r1) / 2
    return house(
        town=NS, title="Main street block", P=P,
        use="Northstar Town: a four-storey main street block in dark brick, two shopfronts under awnings, three "
            "floors of flats with a two-tone cornice, a roof deck with a pergola and a water tank",
        wall=("brick", rgb("b89a90")), trim=rgb("e8e0d0"), roof=flat(1.1, coping=rgb("e8e0d0")),
        doors=[dict(vol="main", side="front", at=round(m - 2.2, 2), route=False), dict(vol="main", side="front", at=round(m + 3.4, 2), route=False)],
        holes=[dict(vol="main", side="front", floor=0, a=r0 + 0.3, b=m - 3.0, y0=0.35, y1=2.8),
               dict(vol="main", side="front", floor=0, a=m - 1.4, b=m + 2.6, y0=0.35, y1=2.8),
               dict(vol="main", side="front", floor=0, a=m + 4.2, b=r1 - 0.3, y0=0.35, y1=2.8)],
        win={"step": 2.2, "w": 1.05, "head": 2.4, "floors": {"all": [1, 2, 3], "back": [0, 1, 2, 3]}, "muntins": True},
        parts=P.parts(floors=[1, 2, 3], doors=[2.6, -2.8]) + [
            dict(vol="main", axis="z", at=P.hall, frm=P.z0 + WT, to=P.z1 - WT, doors=[], floors=[0]),
            dict(vol="main", axis="z", at=m + 0.8, frm=P.z0 + WT, to=P.z1 - WT, doors=[-3.0], floors=[0])],
        deco=[awning("main", "front", r0, m + 0.4, 3.2, 1.6, OXBLOOD), awning("main", "front", m + 1.2, r1, 3.2, 1.6, NAVY),
              sign("main", "front", r0 + 0.3, m, 3.25, 0.6, CREAM, letters=OXBLOOD),
              sign("main", "front", m + 1.4, r1 - 0.3, 3.25, 0.6, CREAM, letters=NAVY),
              cornice("main", rgb("e8e0d0"), h=0.55, depth=0.4), band("main", 3.55, rgb("e8e0d0")),
              water_tank(5.2, -3.0), pergola(-3.0, -5.2, 2.0, -2.4), ac_units([(3.0, 2.8, 0), (5.0, 2.8, 0)])],
        loot=12,
    )


@design("ns-cottage-tower", NS)
def _ns_cottage_tower():
    P = Plan(10, 9, 2, side="right", roof=False)
    tw = (P.x0 - 4.4, P.z0, P.x0, P.z0 + 7.0)
    c0 = tw[0] + WT
    return house(
        town=NS, title="Cottage with lookout tower", P=P,
        use="Northstar Town: a two-storey clapboard cottage with a three-storey brick lookout tower at its back "
            "corner, the tower's top a railed lookout with a hipped stair house",
        wall=("siding", rgb("d8c7a6")), trim=WHITE, roof=gable(0.7, tint=rgb("5a4a40"), along="z"),
        vols_extra=[vol("tower", tw, 3, flat(edge="rail"), wall=("brick", rgb("e4d2c6")))],
        stairs_extra=[dict(vol="tower", axis="z", a0=tw[3] - WT - 1.0, a1=tw[3] - WT - 1.0 - flight_len(3.0),
                           c0=c0, c1=c0 + 1.1, roof=True, house=dict(roof="hip", roofMat=("shingle", rgb("5a4a40"))))],
        links=[dict(a="tower", b="main", floor=0, at=P.z0 + 2.2), dict(a="tower", b="main", floor=1, at=P.z0 + 2.2)],
        doors=[dict(vol="tower", side="front", at=round(c0 + 1.1 + 0.6, 2))],
        win={"step": 2.1, "w": 0.95, "muntins": True, "shutters": rgb("3a4a5c")},
        parts=P.parts(doors=[2.0, -1.8]),
        deco=[chimney(1.8, -0.5, top=9.8), steps(P.walk, P.z1, 1.6, n=1)],
        loot=7,
    )


def wainscot(vname, h, m, tint, sides=("front", "back", "left", "right")):
    """A stone or brick base course on the walls' outside up to h (drawn, 4 cm proud)."""
    def f(B):
        v = B.by[vname]
        for s in sides:
            g = B.face(vname, s)
            o = g["out"]
            sg = o[0] + o[2]
            p = g["plane"]
            b = ([v.x0 - 0.04, 0.0, p, v.x1 + 0.04, h, p + sg * 0.04] if g["axis"] == "x"
                 else [p, 0.0, v.z0, p + sg * 0.04, h, v.z1])
            B.k.box(b, m, tint, "shell", collide=False, skip={"bottom"})
    return f


def ladder(x, z, y0, y1, along="x", tint=WOOD_DARK):
    """A pueblo ladder leant on a wall (drawn only)."""
    def f(B):
        for d in (-0.25, 0.25):
            a = (x + (d if along == "x" else 0), y0, z + (0 if along == "x" else d))
            b = (x + (d if along == "x" else 0), y1, z + (0 if along == "x" else d) - 0.3)
            B.k.beam(a, b, 0.07, 0.07, "paint", tint, "shell")
        for i in range(1, int((y1 - y0) / 0.35)):
            yy = y0 + i * 0.35
            if along == "x":
                B.k.box([x - 0.25, yy, z - 0.3 * i * 0.35 / (y1 - y0) - 0.02, x + 0.25, yy + 0.04, z - 0.3 * i * 0.35 / (y1 - y0) + 0.02],
                        "paint", tint, "near", collide=False)
    return f


# ================================================================================== MILLHAVEN
MH = "millhaven"
DBRICK = rgb("c4a69c")
SOOT = rgb("a8918a")


@design("mh-mill-lofts", MH)
def _mh_lofts():
    P = Plan(18, 12, 4, side="right")
    return house(
        town=MH, title="Mill lofts", P=P,
        use="Millhaven: a four-storey red-brick mill converted to lofts, tall steel-framed windows, the old "
            "loading door, brick bands at every floor, a roof deck under the water tank",
        wall=("brick", DBRICK), trim=STEEL, roof=flat(1.2, coping=rgb("8c8a84")),
        holes=[dict(vol="main", side="front", floor=0, a=-6.8, b=-4.4, y0=0.0, y1=2.8, glass=False)],
        win={"step": 2.7, "w": 1.7, "sill": 0.7, "head": 2.6, "muntins": True},
        parts=P.parts(doors=[2.6, -2.8]) + [dict(vol="main", axis="z", at=-2.0, frm=P.z0 + WT, to=P.z1 - WT, doors=[2.6, -2.8])],
        deco=[*[band("main", P.fh * L + 0.05, SOOT) for L in (1, 2, 3)], cornice("main", rgb("8c8a84"), h=0.35, depth=0.2),
              water_tank(-5.0, -2.4, r=1.5, h=2.8, tint=rgb("6b4a35")), ac_units([(2.0, 3.6, 0), (4.0, 3.6, 0), (-1.0, 3.6, 0)]),
              solar(-7.6, 1.4, -2.6, 4.4), lamp(P.walk - 1.0, 2.4, P.z1 + 0.05)],
        loot=12,
    )


@design("mh-worker-row", MH)
def _mh_row():
    U = [Plan(6.2, 9.4, 2, side=("left" if i % 2 == 0 else "right"), roof=False, name=f"u{i}", x=(i - 1) * 6.2) for i in range(3)]
    tints = [rgb("c8b07a"), rgb("8fa3a8"), rgb("b8846c")]
    vols = [vol(u.name, u.rect, 2, gable(0.62, tint=rgb("3a3836"), along="z", over=0.35), wall=("siding", t))
            for u, t in zip(U[1:], tints[1:])]
    front = porch(U[0], "front", U[0].x0, U[2].x1, 2.2, roof=flat(), deck=rgb("6a5242"), post=("paint", WHITE), postSize=0.16,
                  gaps=[("front", u.walk - 0.8, u.walk + 0.8) for u in U])
    return house(
        town=MH, title="Worker row", P=U[0],
        use="Millhaven: a row of three mill workers' houses in faded clapboard, two storeys under their own gables, "
            "one long porch across the front whose roof is a deck off every upstairs",
        wall=("siding", tints[0]), trim=WHITE, roof=gable(0.62, tint=rgb("3a3836"), along="z", over=0.35),
        vols_extra=vols + [front],
        doors=[*[dict(vol=u.name, side="front", at=round(u.walk, 2), to=u.name) for u in U[1:]],
               *[dict(vol=u.name, side="back", at=round(u.walk, 2), route=False) for u in U[1:]],
               *[dict(vol=u.name, side="front", at=round((u.x0 + u.x1) / 2 + (1.0 if u.side == "left" else -1.0), 2), floor=1, route=False) for u in U]],
        stairs_extra=[u.stair() for u in U[1:]],
        parts=[],
        win={"step": 2.0, "w": 0.95, "muntins": True},
        deco=[*[chimney((u.x0 + u.x1) / 2, -1.5, w=0.6, d=0.6, top=9.3) for u in U]],
        loot=6,
    )


@design("mh-company-house", MH)
def _mh_company():
    P = Plan(10, 8.4, 2, side="right", roof=False)
    return house(
        town=MH, title="Company house", P=P,
        use="Millhaven: a mustard clapboard company house, two storeys under a steep side gable, a side porch "
            "with a shed roof, and a flat-roofed back kitchen whose roof is a deck off the upstairs",
        wall=("siding", rgb("d2b070")), trim=WHITE, roof=gable(0.72, tint=rgb("40403e"), along="x"),
        vols_extra=[wing(P, "back", 6.0, 3.6, 1, flat(edge="rail"), wall=("siding", rgb("c4a466")), at=-1.4, name="kitchen"),
                    porch(P, "left", P.z0 + 0.6, P.z1 - 0.6, 2.0, roof=dict(type="shed", high="right", rise=0.6, m="metal",
                                                                                tint=rgb("6a6d70"), over=0.25),
                          post=("paint", WHITE))],
        links=[dict(a="main", b="kitchen", floor=0, at=-2.6)],
        doors=[dict(vol="main", side="back", at=-2.6, floor=1, route=False), dict(vol="main", side="left", at=0.8, route=False)],
        back_door=False,
        win={"step": 2.2, "w": 0.95, "muntins": True},
        parts=P.parts(doors=[2.0, -1.6]),
        deco=[chimney(-2.0, 0.0, w=0.7, d=0.6, top=9.0)],
        loot=6,
    )


@design("mh-corner-tavern", MH)
def _mh_tavern():
    P = Plan(13, 13, 3, side="left")
    r0, r1 = P.rooms()
    return house(
        town=MH, title="Corner tavern", P=P,
        use="Millhaven: a three-storey brick corner tavern, its saloon's glass front and painted sign on two "
            "streets, two floors of rooms over it, a roof deck with a pergola",
        wall=("brick", rgb("b99486")), trim=OXBLOOD, roof=flat(1.1, coping=rgb("a8a49a")),
        doors=[dict(vol="main", side="front", at=round(r1 - 1.6, 2), route=False), dict(vol="main", side="right", at=-1.5, route=False)],
        holes=[dict(vol="main", side="front", floor=0, a=r0 + 0.5, b=r1 - 2.6, y0=0.4, y1=2.7),
               dict(vol="main", side="right", floor=0, a=0.0, b=5.0, y0=0.4, y1=2.7)],
        win={"step": 2.3, "w": 1.05, "head": 2.4, "muntins": True, "floors": {"all": [1, 2], "back": [0, 1, 2], "left": [0, 1, 2]}},
        parts=P.parts(floors=[1, 2], doors=[2.8, -2.8]) + [dict(vol="main", axis="z", at=P.hall, frm=P.z0 + WT, to=P.z1 - WT, doors=[], floors=[0])],
        deco=[sign("main", "front", r0 + 0.5, r1 - 0.4, 3.2, 0.7, OXBLOOD, letters=CREAM),
              sign("main", "right", -0.5, 5.5, 3.2, 0.7, OXBLOOD, letters=CREAM),
              awning("main", "front", r0, r1, 3.1, 1.3, rgb("3a2a22")), cornice("main", rgb("a8a49a"), h=0.4),
              pergola(-1.8, -5.6, 4.4, -2.0), chimney(4.6, 2.0, w=0.8, d=0.8, top=11.4), lamp(r1 - 0.6, 2.5, P.z1 + 0.05)],
        loot=10,
    )


@design("mh-tenement", MH)
def _mh_tenement():
    P = Plan(8.4, 14, 4, side="left")
    return house(
        town=MH, title="Tenement", P=P,
        use="Millhaven: a narrow four-storey brick tenement, a flat on each floor, its fire escape's balconies "
            "down the side with doors on to them, a heavy cornice, the tank on the roof",
        wall=("brick", rgb("a87e72")), trim=rgb("d8d0c0"), roof=flat(1.0, coping=rgb("d8d0c0")),
        doors=[dict(vol="main", side="right", at=-3.0, floor=L, route=False) for L in (1, 2, 3)],
        win={"step": 2.1, "w": 0.95, "head": 2.3, "muntins": True},
        parts=P.parts(doors=[3.2, -3.2]),
        deco=[fire_escape("main", "right", -4.6, -1.2, [1, 2, 3]), cornice("main", rgb("d8d0c0"), h=0.6, depth=0.45),
              water_tank(1.8, -4.4, r=1.1, h=2.2), ac_units([(2.6, 2.0, 1)]), steps(P.walk, P.z1, 1.5, n=2)],
        loot=9,
    )


@design("mh-container-flats", MH)
def _mh_container():
    P = Plan(7.4, 12.2, 3, side="right")
    lo = vol("low", (P.x0 - 6.4, P.z0, P.x0, P.z0 + 9.6), 2, flat(edge="rail", railTint=rgb("e0a020")), wall=("metal", rgb("2f7f86")))
    return house(
        town=MH, title="Container flats", P=P,
        use="Millhaven: flats stacked from shipping containers' corrugated steel, a rust-red three-storey block "
            "and a teal two-storey one, railed roof decks on both, yellow rails",
        wall=("metal", rgb("a8452c")), trim=rgb("e0a020"), roof=flat(edge="rail", railTint=rgb("e0a020")),
        vols_extra=[lo],
        links=[dict(a="main", b="low", floor=0, at=P.z0 + 3.0), dict(a="main", b="low", floor=1, at=P.z0 + 3.0)],
        doors=[dict(vol="main", side="left", at=P.z0 + 6.0, floor=2, route=False), dict(vol="low", side="front", at=P.x0 - 3.2, route=False)],
        win={"step": 2.8, "w": 1.6, "sill": 0.8, "head": 2.3},
        parts=P.parts(hall=False),
        rail=rgb("e0a020"),
        deco=[*[band("main", P.fh * L + 0.12, rgb("6e2a1c"), h=0.12) for L in (1, 2)], band("low", 3.27, rgb("1d5257"), h=0.12),
              planters([(P.x0 - 5.6, P.z0 + 1.0, P.x0 - 3.6, P.z0 + 1.6)], vname="low"), ac_units([(-1.6, -4.6, 0)])],
        loot=9,
    )


@design("mh-foreman-house", MH)
def _mh_foreman():
    P = Plan(11, 9.6, 2, side="left", roof=False)
    return house(
        town=MH, title="Foreman's house", P=P,
        use="Millhaven: the mill foreman's two-storey brick house under a hipped roof with a dormer, a deep front "
            "porch on brick piers whose railed roof is the upstairs' deck",
        wall=("brick", rgb("c7a090")), trim=CREAM, roof=hip(0.5, tint=rgb("3b3634"), over=0.55),
        vols_extra=[porch(P, "front", P.x0 + 1.0, P.x1 - 1.0, 2.6, roof=flat(), deck=rgb("6b4f40"), post=("brick", rgb("b88e80")),
                          postSize=0.42, gaps=[("front", P.walk - 0.9, P.walk + 0.9)])],
        doors=[dict(vol="main", side="front", at=1.6, floor=1, route=False)],
        win={"step": 2.2, "w": 1.0, "muntins": True},
        parts=P.parts(doors=[2.0, -2.0]),
        deco=[dormers("main", "back", [0.0], tint=CREAM), chimney(2.6, -1.4, w=0.8, d=0.7, top=10.0)],
        loot=7,
    )


@design("mh-sawtooth-works", MH)
def _mh_sawtooth():
    P = Plan(8.0, 12.0, 3, side="right")
    shop = vol("shop", (P.x0 - 10.0, P.z0, P.x0, P.z1), 2, flat(0.6), wall=("brick", rgb("b49084")))
    return house(
        town=MH, title="Sawtooth workshop and flats", P=P,
        use="Millhaven: a two-storey brick workshop under a sawtooth roof of north lights, its roller door on the "
            "street, and a three-storey block of flats beside it with a roof deck",
        wall=("brick", rgb("c2a090")), trim=STEEL, roof=flat(1.0, coping=rgb("8c8a84")),
        vols_extra=[shop],
        links=[dict(a="main", b="shop", floor=0, at=-3.0), dict(a="main", b="shop", floor=1, at=-3.0)],
        holes=[dict(vol="shop", side="front", floor=0, a=P.x0 - 7.6, b=P.x0 - 4.2, y0=0.0, y1=2.9, glass=False)],
        win={"step": 2.6, "w": 1.6, "sill": 0.8, "head": 2.5, "muntins": True},
        parts=P.parts(),
        deco=[sawtooth("shop", 4), sign("shop", "front", P.x0 - 8.0, P.x0 - 2.0, 3.3, 0.6, rgb("3c4a3c"), letters=CREAM),
              cornice("main", rgb("8c8a84"), h=0.3, depth=0.2), ac_units([(2.0, -4.4, 0)])],
        loot=11,
    )


@design("mh-dutch-duplex", MH)
def _mh_duplex():
    A = Plan(7.6, 11.4, 3, side="left", name="a", x=-3.8)
    B_ = Plan(7.6, 11.4, 3, side="right", name="b", x=3.8)
    return house(
        town=MH, title="Stepped-gable duplex", P=A,
        use="Millhaven: a pair of three-storey brick houses behind a stepped Dutch gable front, a door each, "
            "their own stairs up to two roof decks behind it",
        wall=("brick", rgb("b88a7c")), trim=rgb("e2dacb"), roof=flat(1.0, coping=rgb("e2dacb")),
        vols_extra=[vol("b", B_.rect, 3, flat(1.0, coping=rgb("e2dacb")))],
        doors=[dict(vol="b", side="front", at=round(B_.walk, 2)), dict(vol="b", side="back", at=round(B_.walk, 2), route=False)],
        stairs_extra=[B_.stair()],
        parts=A.parts(hall=False) + B_.parts(hall=False),
        win={"step": 2.0, "w": 0.95, "head": 2.4, "muntins": True},
        deco=[false_front("a", 1.4, None, step=True, trim=rgb("e2dacb")), false_front("b", 1.4, None, step=True, trim=rgb("e2dacb")),
              band("a", 3.0, rgb("e2dacb")), band("b", 3.0, rgb("e2dacb")), band("a", 6.0, rgb("e2dacb")), band("b", 6.0, rgb("e2dacb")),
              rail_line(0, -5.45, 0, -0.5, 9.15), steps(A.walk, A.z1, 1.4, n=1), steps(B_.walk, B_.z1, 1.4, n=1)],
        loot=8,
    )


@design("mh-garage-flats", MH)
def _mh_garage():
    P = Plan(12, 10, 3, side="left")
    return house(
        town=MH, title="Garage with flats", P=P,
        use="Millhaven: a mechanic's garage, its two roller doors on the street, two floors of flats over it in "
            "brick and corrugated steel, a railed roof deck",
        wall=("brick", rgb("c09a8c")), trim=rgb("e0a020"), roof=flat(edge="rail", railTint=BLACK),
        holes=[dict(vol="main", side="front", floor=0, a=-1.8, b=1.2, y0=0.0, y1=2.8, glass=False),
               dict(vol="main", side="front", floor=0, a=2.0, b=5.0, y0=0.0, y1=2.8, glass=False)],
        win={"step": 2.4, "w": 1.3, "floors": {"all": [1, 2], "back": [0, 1, 2], "left": [0, 1, 2]}},
        parts=P.parts(floors=[1, 2], doors=[2.4, -2.2]) + [dict(vol="main", axis="z", at=P.hall, frm=P.z0 + WT, to=P.z1 - WT, doors=[-2.6], floors=[0])],
        deco=[wainscot("main", 3.15, "metal", rgb("5e6a70"), sides=("front",)), sign("main", "front", -1.8, 5.0, 3.25, 0.55, rgb("e0a020"), letters=BLACK),
              ac_units([(3.5, -3.0, 0), (3.5, -1.6, 0)]), solar(-1.6, -4.4, 3.6, -2.6)],
        loot=9,
    )


@design("mh-gambrel-house", MH)
def _mh_gambrel():
    P = Plan(10, 9.0, 2, side="right", roof=False)
    return house(
        town=MH, title="Gambrel house", P=P,
        use="Millhaven: a pale-brick Dutch colonial, two storeys under a barn-like gambrel roof, and a flat-roofed "
            "sun room at the side whose roof is a railed terrace off the upstairs",
        wall=("brickpale", rgb("e9dccb")), trim=WHITE, roof=dict(type="gambrel", along="x", m="shingle", tint=rgb("3f4340")),
        vols_extra=[wing(P, "left", 6.4, 4.0, 1, flat(edge="rail"), wall=("siding", rgb("dfe4dc")), at=-0.8, name="sun")],
        links=[dict(a="main", b="sun", floor=0, at=-1.6)],
        doors=[dict(vol="main", side="left", at=-1.6, floor=1, route=False), dict(vol="sun", side="front", at=-7.0, route=False)],
        win={"step": 2.2, "w": 1.0, "muntins": True, "shutters": rgb("2f4a3a")},
        parts=P.parts(doors=[2.0, -1.8]),
        deco=[chimney(-2.6, -1.6, top=10.2, m="brickpale", tint=rgb("e9dccb"))],
        loot=7,
    )


@design("mh-block-flats", MH)
def _mh_block():
    A = Plan(18, 11, 4, side="left")
    Bp = Plan(18, 11, 4, side="right")
    return house(
        town=MH, title="Block of flats", P=A,
        use="Millhaven: a four-storey block of workers' flats in brick and concrete bands, two stairs, balconies on "
            "every floor to the street, a roof deck with two stair houses and the plant",
        wall=("brick", rgb("b9a296")), trim=rgb("bdbab2"), roof=flat(1.1, coping=rgb("bdbab2")),
        doors=[dict(vol="main", side="front", at=round(Bp.walk, 2), route=False), dict(vol="main", side="back", at=round(Bp.walk, 2), route=False),
               *[dict(vol="main", side="front", at=x, floor=L, route=False) for L in (1, 2, 3) for x in (-2.6, 2.6)]],
        stairs_extra=[dict(Bp.stair(), **{"from": ("main", "front", round(Bp.walk, 2))})],
        parts=[dict(vol="main", axis="z", at=A.hall, frm=A.z0 + WT, to=A.z1 - WT, doors=[2.4, -2.4]),
               dict(vol="main", axis="z", at=Bp.hall, frm=Bp.z0 + WT, to=Bp.z1 - WT, doors=[2.4, -2.4]),
               dict(vol="main", axis="z", at=0.0, frm=A.z0 + WT, to=A.z1 - WT, doors=[-3.4]),
               dict(vol="main", axis="x", at=-0.6, frm=A.hall + 0.08, to=Bp.hall - 0.08, doors=[-1.6, 1.6])],
        win={"step": 2.4, "w": 1.25},
        deco=[*[band("main", A.fh * L + 0.05, rgb("bdbab2"), h=0.3, depth=0.08) for L in (1, 2, 3)],
              *[balcony("main", "front", L, x - 1.4, x + 1.4, 1.1, rgb("a9a69e"), rail=STEEL) for L in (1, 2, 3) for x in (-2.6, 2.6)],
              ac_units([(-2.0, -3.6, 0), (0.0, -3.6, 0), (2.0, -3.6, 0)]), water_tank(0.0, 2.6, r=1.3)],
        loot=14,
    )


# ================================================================================== CROSSROADS
CR = "crossroads"


@design("cr-pueblo-terraces", CR)
def _cr_pueblo():
    P = Plan(7.6, 9.0, 3, side="left", x=-4.0, z=-0.5)
    mid = vol("mid", (P.x1, P.z0 + 1.0, P.x1 + 6.0, P.z1), 2, flat(1.0, coping=rgb("c09a72")), wall=("stucco", ADOBE))
    low = vol("low", (P.x1 + 6.0, P.z0 + 2.0, P.x1 + 11.0, P.z1), 1, flat(1.0, coping=rgb("c09a72")), wall=("stucco", rgb("d6b28c")))
    return house(
        town=CR, title="Pueblo terraces", P=P,
        use="Crossroads: a Pueblo Revival house in adobe stucco stepping up in three blocks, one, two and three "
            "storeys, each roof a terrace off the floor above, the beams' ends through the walls, ladders",
        wall=("stucco", rgb("c69d78")), trim=rgb("6b4a32"), roof=flat(1.0, coping=rgb("c09a72")),
        vols_extra=[mid, low],
        links=[dict(a="main", b="mid", floor=0, at=1.6), dict(a="main", b="mid", floor=1, at=1.6),
               dict(a="mid", b="low", floor=0, at=2.2)],
        doors=[dict(vol="main", side="right", at=-1.8, floor=2, route=False), dict(vol="mid", side="right", at=0.6, floor=1, route=False),
               dict(vol="low", side="front", at=P.x1 + 8.5, route=False)],
        win={"step": 2.6, "w": 0.9, "sill": 1.0, "head": 2.1},
        parts=P.parts(hall=False),
        rail=rgb("6b4a32"),
        deco=[vigas("main", "front", P.Y(3) - 0.6 if hasattr(P, "Y") else 9.5, 4), vigas("mid", "front", 6.5 - 0.55, 4),
              vigas("low", "front", 3.15 - 0.55, 3), vigas("main", "left", 9.15 - 0.55, 4),
              ladder(P.x1 + 3.0, P.z1 - 0.2, 0.2, 3.9), ladder(P.x1 + 8.6, P.z0 + 2.2, 3.15, 6.6, along="x"),
              planters([(P.x1 + 7.0, P.z0 + 2.6, P.x1 + 8.4, P.z0 + 3.2)], vname="low", green=rgb("6d8a46"), box=rgb("a8754e"))],
        loot=8,
    )


@design("cr-mission-house", CR)
def _cr_mission():
    P = Plan(11, 10, 2, side="right", roof=False)
    return house(
        town=CR, title="Mission house", P=P,
        use="Crossroads: a white stucco Mission house, two storeys under a clay-tile gable behind a stepped "
            "Mission parapet on the street, an arcaded porch whose roof is a terrace with a tiled rail",
        wall=("stucco", rgb("f0e8da")), trim=rgb("8a5a3a"), roof=gable(0.45, m="rooftile", tint=rgb("e8b090"), along="z", over=0.4),
        vols_extra=[porch(P, "front", P.x0 + 0.5, P.x1 - 0.5, 2.6, roof=flat(), deck=rgb("a06a4a"), post=("stucco", rgb("f0e8da")),
                          postSize=0.5, gaps=[("front", P.walk - 0.9, P.walk + 0.9)])],
        doors=[dict(vol="main", side="front", at=-1.6, floor=1, route=False)],
        win={"step": 2.6, "w": 1.0, "sill": 0.9, "head": 2.2},
        parts=P.parts(doors=[2.2, -2.0]),
        deco=[false_front("main", 2.6, None, step=True, trim=rgb("8a5a3a")), chimney(-2.4, -2.6, w=0.7, d=0.7, top=10.6,
                                                                                    m="stucco", tint=rgb("f0e8da"), cap=rgb("b5623e"))],
        loot=7, ridge=rgb("b5623e"),
    )


@design("cr-motor-court", CR)
def _cr_motor():
    P = Plan(17, 8.2, 2, side="left")
    gal = porch(P, "front", P.x0, P.x1, 2.0, floors=2, roof=dict(type="shed", high="back", rise=0.5, m="metal", tint=rgb("2f6a6a"), over=0.3),
                deck=rgb("8a8478"), post=("paint", rgb("2f6a6a")), postSize=0.18, name="gallery")
    ga0 = P.x1 - 0.15
    ga1 = ga0 - flight_len(3.0)
    return house(
        town=CR, title="Motor court flats", P=P,
        use="Crossroads: the old motor court's two-storey block, rooms off a covered gallery reached by its own "
            "outside stair, teal posts, a roof deck up the inside stair",
        wall=("stucco", rgb("e8d4b0")), trim=rgb("2f6a6a"), roof=flat(0.9, coping=rgb("2f6a6a")),
        vols_extra=[gal],
        stairs_extra=[dict(vol="gallery", axis="x", a0=ga0, a1=ga1, c0=P.z1 + 0.7, c1=P.z1 + 1.9, roof=False, route=False)],
        doors=[*[dict(vol="main", side="front", at=x, floor=1, route=False) for x in (-6.4, -3.0, 0.8)],
               *[dict(vol="main", side="front", at=x, route=False) for x in (-1.0, 3.6)]],
        win={"step": 2.4, "w": 1.2, "sill": 1.0, "head": 2.2},
        parts=P.parts(doors=[2.2, -2.0]) + [dict(vol="main", axis="z", at=x, frm=P.z0 + WT, to=P.z1 - WT, doors=[]) for x in (2.0, 6.0)],
        routes=[[[ga0 + 1.6, P.z1 + 1.3], [ga0 + 0.4, P.z1 + 1.3], [ga1 - 0.45, P.z1 + 1.3], [0.8, P.z1 + 1.2],
                 [0.8, P.z1 - 1.2]]],
        deco=[sign("main", "left", -2.0, 2.0, 5.0, 1.0, rgb("2f6a6a"), letters=rgb("f2d36b")), ac_units([(2.0, -2.6, 0), (5.0, -2.6, 0)])],
        loot=11,
    )


@design("cr-feed-store", CR)
def _cr_feed():
    P = Plan(10, 12, 2, side="right", roof=False)
    return house(
        town=CR, title="False-front feed store", P=P,
        use="Crossroads: an Old West feed store, its square false front high over a tin gable, a boardwalk porch "
            "under a tin roof along the street, rooms upstairs and a flat-roofed back store whose roof is a deck",
        wall=("batten", rgb("c9b08c")), trim=rgb("7a2a22"), roof=gable(0.55, m="metal", tint=rgb("8a8e90"), along="z", over=0.3),
        vols_extra=[porch(P, "front", P.x0, P.x1, 2.6, roof=dict(type="shed", high="back", rise=0.5, m="metal", tint=rgb("8a8e90"), over=0.25),
                          deck=rgb("7a5c40"), post=("paint", rgb("6a4a32"))),
                    wing(P, "back", 7.0, 4.0, 1, flat(edge="rail"), at=-1.2, name="store", wall=("batten", rgb("b89e7c")))],
        links=[dict(a="main", b="store", floor=0, at=-2.6)],
        doors=[dict(vol="main", side="back", at=-2.6, floor=1, route=False)],
        back_door=False,
        holes=[dict(vol="main", side="front", floor=0, a=-4.2, b=-1.6, y0=0.4, y1=2.6), dict(vol="main", side="front", floor=0, a=-0.6, b=1.4, y0=0.4, y1=2.6)],
        win={"step": 2.4, "w": 1.0, "muntins": True, "floors": {"all": [1], "back": [0, 1], "left": [0, 1], "right": [0, 1]}},
        parts=P.parts(doors=[2.4, -2.6]),
        deco=[false_front("main", 2.8, None, step=False, trim=rgb("7a2a22")),
              sign("main", "front", -4.4, 3.2, 6.6, 1.1, rgb("7a2a22"), letters=rgb("efe0b8"))],
        loot=8,
    )


@design("cr-trading-post", CR)
def _cr_trading():
    P = Plan(13, 10, 2, side="left")
    gal = porch(P, "front", P.x0, P.x1, 2.4, floors=2, roof=flat(), deck=rgb("6e5240"), post=("paint", rgb("5a4030")), name="gallery")
    return house(
        town=CR, title="Trading post", P=P,
        use="Crossroads: a two-storey adobe-brick trading post with a double gallery across its front, the upper "
            "gallery's roof a railed terrace, a stair house on the flat roof",
        wall=("brickpale", rgb("e0bfa0")), trim=rgb("5a4030"), roof=flat(1.0, coping=rgb("8a6a50")),
        vols_extra=[gal],
        doors=[*[dict(vol="main", side="front", at=x, floor=1, route=False) for x in (-1.0, 3.6)]],
        holes=[dict(vol="main", side="front", floor=0, a=0.4, b=4.8, y0=0.4, y1=2.6)],
        win={"step": 2.4, "w": 1.0, "head": 2.3},
        parts=P.parts(doors=[2.0, -2.0]),
        deco=[sign("main", "front", -2.6, 4.6, 6.2, 0.7, rgb("5a4030"), letters=rgb("efd9a8")), vigas("main", "left", 5.7, 4),
              vigas("main", "right", 5.7, 4)],
        loot=9,
    )


@design("cr-hacienda", CR)
def _cr_hacienda():
    P = Plan(13, 9.4, 2, side="right", roof=False)
    bal = porch(P, "front", P.x0 + 1.0, P.x1 - 1.0, 1.8, floors=2,
                roof=dict(type="shed", high="back", rise=0.4, m="rooftile", tint=rgb("e8a888"), over=0.2), deck=rgb("6a4a34"),
                post=("paint", rgb("5a3c28")), postSize=0.18, name="balcony")
    return house(
        town=CR, title="Monterey hacienda", P=P,
        use="Crossroads: an ochre Monterey hacienda, two storeys under a clay-tile hip roof, a timber balcony on "
            "posts the length of the upstairs, and a flat-roofed wing whose roof is a tiled terrace",
        wall=("stucco", rgb("e6c48a")), trim=rgb("5a3c28"), roof=hip(0.4, m="rooftile", tint=rgb("e8a888"), over=0.6),
        vols_extra=[bal, wing(P, "left", 6.6, 4.4, 1, flat(1.0, coping=rgb("b5623e")), at=-1.0, name="wing", wall=("stucco", rgb("dcb87e")))],
        links=[dict(a="main", b="wing", floor=0, at=-2.0)],
        doors=[dict(vol="main", side="left", at=-2.0, floor=1, route=False), *[dict(vol="main", side="front", at=x, floor=1, route=False) for x in (-3.0, 1.0)]],
        win={"step": 2.6, "w": 1.0, "muntins": True, "shutters": rgb("3e5a3a")},
        parts=P.parts(doors=[2.0, -2.0]),
        deco=[chimney(-3.6, -2.0, w=0.8, d=0.8, top=9.8, m="stucco", tint=rgb("e6c48a"), cap=rgb("b5623e"))],
        loot=8, ridge=rgb("b5623e"),
    )


@design("cr-adobe-courtyard", CR)
def _cr_adobe():
    P = Plan(9, 11, 2, side="left")
    wg = vol("wing", (P.x1, P.z0, P.x1 + 8.0, P.z0 + 5.6), 1, flat(1.0, coping=rgb("b48e6a")), wall=("stucco", rgb("d2ac84")))
    portal = vol("portal", (P.x1, P.z0 + 5.6, P.x1 + 4.0, P.z1), 1, flat(), open=True, deck=rgb("8a6a50"), post=("paint", WOOD_DARK))
    return house(
        town=CR, title="Adobe with portal", P=P,
        use="Crossroads: an adobe house round a corner of its yard, a two-storey block and a one-storey wing, a "
            "timber portal in the corner, the wing's roof a terrace, beams through the walls",
        wall=("stucco", rgb("cfa47c")), trim=WOOD_DARK, roof=flat(1.0, coping=rgb("b48e6a")),
        vols_extra=[wg, portal],
        links=[dict(a="main", b="wing", floor=0, at=P.z0 + 2.6)],
        doors=[dict(vol="main", side="right", at=P.z0 + 2.6, floor=1, route=False), dict(vol="main", side="right", at=P.z1 - 2.4, route=False),
               dict(vol="wing", side="front", at=P.x1 + 6.0, route=False)],
        win={"step": 2.6, "w": 0.9, "sill": 1.0, "head": 2.1},
        parts=P.parts(doors=[2.4, -2.4]),
        rail=WOOD_DARK,
        deco=[vigas("main", "front", 5.6, 4), vigas("wing", "front", 2.6, 4), vigas("main", "left", 5.6, 4),
              planters([(P.x1 + 5.4, P.z0 + 0.8, P.x1 + 7.0, P.z0 + 1.4)], vname="wing", green=rgb("6d8a46"), box=rgb("a8754e"))],
        loot=8,
    )


@design("cr-ranch-two", CR)
def _cr_ranch():
    P = Plan(14, 9, 2, side="right", roof=False)
    return house(
        town=CR, title="Two-storey ranch", P=P,
        use="Crossroads: a long two-storey ranch house, a stone base under board-and-batten, a low hipped tin roof, "
            "a porch the whole front under a shed roof, a railed deck on the carport's roof",
        wall=("batten", rgb("b39a7a")), trim=rgb("e8e0d0"), roof=hip(0.42, m="metal", tint=rgb("7c4a3a"), over=0.7),
        vols_extra=[porch(P, "front", P.x0, P.x1, 2.4, roof=dict(type="shed", high="back", rise=0.5, m="metal", tint=rgb("7c4a3a"), over=0.2),
                          deck=rgb("7a5c44"), post=("paint", rgb("e8e0d0")), postSize=0.16),
                    porch(P, "left", P.z0 + 0.4, P.z1 - 0.4, 3.6, roof=flat(), deck=rgb("6a5040"), post=("paint", rgb("e8e0d0")), name="carport")],
        doors=[dict(vol="main", side="left", at=0.0, floor=1, route=False)],
        win={"step": 2.5, "w": 1.3},
        parts=P.parts(doors=[2.0, -2.0]) + [dict(vol="main", axis="z", at=-2.4, frm=P.z0 + WT, to=P.z1 - WT, doors=[2.0, -2.0])],
        deco=[wainscot("main", 1.0, "stone", rgb("c8bca8")), chimney(-4.6, -2.0, w=1.0, d=0.8, top=9.4, m="stone", tint=rgb("c8bca8"))],
        loot=7,
    )


@design("cr-foursquare", CR)
def _cr_foursquare():
    P = Plan(10, 10, 2, side="left", roof=False)
    return house(
        town=CR, title="Prairie foursquare", P=P,
        use="Crossroads: a white prairie foursquare, two storeys under a pyramid tin roof with a dormer on every "
            "side, a wrap-round porch whose railed roof is a deck off the upstairs",
        wall=("siding", rgb("f0ece2")), trim=rgb("7a3a2e"), roof=hip(0.5, m="metal", tint=rgb("8c9294"), over=0.6),
        vols_extra=[porch(P, "front", P.x0, P.x1, 2.4, roof=flat(), deck=rgb("6c5444"), post=("paint", WHITE), round=True,
                          gaps=[("front", P.walk - 0.9, P.walk + 0.9)]),
                    porch(P, "right", P.z0 + 1.0, P.z1, 2.4, roof=flat(), deck=rgb("6c5444"), post=("paint", WHITE), round=True, name="side")],
        doors=[dict(vol="main", side="front", at=2.0, floor=1, route=False), dict(vol="main", side="right", at=1.6, floor=1, route=False)],
        win={"step": 2.2, "w": 1.0, "muntins": True},
        parts=P.parts(doors=[2.2, -2.0]),
        deco=[dormers("main", "front", [0.0], tint=WHITE, roof_tint=rgb("8c9294"), m="metal"),
              dormers("main", "back", [0.0], tint=WHITE, roof_tint=rgb("8c9294"), m="metal"), chimney(-2.6, -2.6, top=10.0)],
        loot=7,
    )


@design("cr-stucco-duplex", CR)
def _cr_duplex():
    A = Plan(7.4, 10.4, 2, side="left", name="a", x=-3.7)
    B_ = Plan(7.4, 10.4, 2, side="right", name="b", x=3.7)
    return house(
        town=CR, title="Stucco duplex", P=A,
        use="Crossroads: a pair of terracotta-capped stucco houses, two storeys each, arched-looking deep doorways, "
            "their own stairs to two roof terraces, a carport pergola",
        wall=("stucco", rgb("e8b48c")), trim=TERRA, roof=flat(1.0, coping=TERRA),
        vols_extra=[vol("b", B_.rect, 2, flat(1.0, coping=TERRA), wall=("stucco", rgb("d6c08c")))],
        doors=[dict(vol="b", side="front", at=round(B_.walk, 2)), dict(vol="b", side="back", at=round(B_.walk, 2), route=False)],
        stairs_extra=[B_.stair()],
        parts=A.parts(hall=False) + B_.parts(hall=False),
        win={"step": 2.3, "w": 1.0, "sill": 1.0, "head": 2.2},
        deco=[rail_line(0, -4.95, 0, -0.5, 6.15), pergola(-3.6, -4.4, -0.8, -1.4, vname="a"), pergola(0.8, -4.4, 3.6, -1.4, vname="b"),
              vigas("a", "front", 5.6, 3), vigas("b", "front", 5.6, 3)],
        loot=7,
    )


@design("cr-barn-lofts", CR)
def _cr_barn():
    P = Plan(10, 11, 2, side="right", roof=False)
    return house(
        town=CR, title="Barn lofts", P=P,
        use="Crossroads: a red board-and-batten barn turned into lofts, two storeys under a big gambrel roof with "
            "its hay hood, white trim, a flat-roofed annex whose roof is a railed deck",
        wall=("batten", rgb("c0473a")), trim=WHITE, roof=dict(type="gambrel", along="z", m="metal", tint=rgb("6b6f72")),
        vols_extra=[wing(P, "left", 7.0, 4.4, 1, flat(edge="rail"), at=-0.8, name="annex", wall=("batten", rgb("b2453a")))],
        links=[dict(a="main", b="annex", floor=0, at=-1.6)],
        doors=[dict(vol="main", side="left", at=-1.6, floor=1, route=False), dict(vol="annex", side="front", at=-7.4, route=False)],
        holes=[dict(vol="main", side="front", floor=0, a=-3.6, b=-0.8, y0=0.0, y1=2.6, glass=False)],
        win={"step": 2.4, "w": 1.0, "muntins": True},
        parts=P.parts(doors=[2.4, -2.4]),
        deco=[band("main", 3.0, WHITE, h=0.14)],
        loot=8,
    )


@design("cr-desert-modern", CR)
def _cr_modern():
    P = Plan(12, 9.6, 2, side="left")
    return house(
        town=CR, title="Desert modern house", P=P,
        use="Crossroads: a desert modern house, two storeys of sand stucco and cedar battens, a wide window wall, "
            "the flat roof's deck under a pergola with a glass-free rail, planters",
        wall=("stucco", rgb("e4d2b0")), trim=rgb("3a3a3a"), roof=flat(edge="rail", railTint=rgb("2a2a2a")),
        holes=[dict(vol="main", side="front", floor=1, a=-0.6, b=4.6, y0=0.4, y1=2.5), dict(vol="main", side="front", floor=0, a=0.6, b=4.6, y0=0.3, y1=2.5)],
        win={"step": 2.8, "w": 1.6, "sill": 0.8, "head": 2.4},
        parts=P.parts(doors=[2.2, -2.0]),
        deco=[wainscot("main", 6.15, "batten", rgb("a8724e"), sides=("left",)), pergola(-1.0, -4.0, 4.8, -0.4),
              planters([(-1.0, 3.4, 4.8, 4.0)]), awning("main", "front", -6.2, 6.2, 6.0, 1.2, rgb("3a3a3a"), valance=False)],
        loot=7,
    )


# ================================================================================== RIVERWOOD
RW = "riverwood"
STAIN = rgb("8a5a3e")
STAIN_DARK = rgb("5e3e2a")
RUBBLE = rgb("b8b0a4")


@design("rw-timber-lodge", RW)
def _rw_lodge():
    P = Plan(13, 10, 3, side="right", roof=False)
    return house(
        town=RW, title="Timber lodge", P=P,
        use="Riverwood: a three-storey timber lodge, stone below and dark board-and-batten above, a steep shingle "
            "gable with a dormer, a deck on posts round the first floor, and a side wing's railed roof deck",
        wall=("batten", STAIN), trim=rgb("e8dcc0"), roof=gable(0.85, tint=rgb("3a3634"), over=0.6),
        vols_extra=[porch(P, "front", P.x0, P.x1, 2.4, floors=2, roof=flat(), deck=rgb("6a4a34"), post=("paint", STAIN_DARK), postSize=0.24,
                          name="deck"),
                    wing(P, "left", 6.0, 4.0, 1, flat(edge="rail", railTint=STAIN_DARK), at=-1.6, name="wing", wall=("rubble", RUBBLE))],
        links=[dict(a="main", b="wing", floor=0, at=-2.4)],
        doors=[*[dict(vol="main", side="front", at=x, floor=1, route=False) for x in (-3.0, 1.0)], dict(vol="main", side="left", at=-2.4, floor=1, route=False)],
        win={"step": 2.4, "w": 1.1, "muntins": True},
        parts=P.parts(doors=[2.0, -2.0]),
        rail=STAIN_DARK,
        deco=[wainscot("main", 3.15, "rubble", RUBBLE), dormers("main", "front", [-1.0], tint=STAIN, roof_tint=rgb("3a3634")),
              chimney(-4.6, -2.6, w=1.0, d=0.9, top=14.8, m="rubble", tint=RUBBLE)],
        loot=9,
    )


@design("rw-boathouse", RW)
def _rw_boat():
    P = Plan(10, 13, 3, side="left", roof=False)
    return house(
        town=RW, title="Boathouse flats", P=P,
        use="Riverwood: a boathouse on the river street, its big boat door below, two floors of flats above in "
            "weathered battens, a tin gable to the street, decks off both floors",
        wall=("batten", rgb("9a8a78")), trim=rgb("2f4a3a"), roof=gable(0.7, m="metal", tint=rgb("5d6a64"), along="z", over=0.5),
        vols_extra=[wing(P, "right", 7.0, 4.0, 1, flat(edge="rail", railTint=rgb("2f4a3a")), at=1.0, name="shed", wall=("batten", rgb("8a7a68")))],
        links=[dict(a="main", b="shed", floor=0, at=2.6)],
        doors=[dict(vol="main", side="right", at=2.6, floor=1, route=False), dict(vol="shed", side="front", at=7.0, route=False),
               dict(vol="main", side="front", at=2.0, floor=2, route=False)],
        holes=[dict(vol="main", side="front", floor=0, a=0.4, b=4.4, y0=0.0, y1=2.9, glass=False)],
        win={"step": 2.4, "w": 1.1},
        parts=P.parts(doors=[2.6, -2.6]),
        rail=rgb("2f4a3a"),
        deco=[balcony("main", "front", 2, 0.4, 4.4, 1.2, rgb("6a5a4a"), rail=rgb("2f4a3a")),
              sign("main", "front", -4.0, -1.0, 2.9, 0.5, rgb("2f4a3a"), letters=rgb("e8dcc0"))],
        loot=9,
    )


@design("rw-log-house", RW)
def _rw_log():
    P = Plan(11, 9, 2, side="right", roof=False)
    return house(
        town=RW, title="Log house", P=P,
        use="Riverwood: a two-storey log house, a steep gable with a dormer, a fieldstone chimney up the end wall, "
            "a porch under a shed roof, and a railed deck over the back porch",
        wall=("wood", rgb("c08860")), trim=rgb("e8dcc0"), roof=gable(0.78, m="shingle", tint=rgb("4a4038"), over=0.55),
        vols_extra=[porch(P, "front", P.x0 + 0.5, P.x1 - 0.5, 2.2, roof=dict(type="shed", high="back", rise=0.6, m="shingle",
                                                                                   tint=rgb("4a4038"), over=0.25), deck=rgb("6a4c36"),
                          post=("wood", rgb("a07050")), postSize=0.26),
                    porch(P, "back", P.x0 + 1.0, P.x1 - 4.0, 2.6, roof=flat(), deck=rgb("6a4c36"), post=("wood", rgb("a07050")), postSize=0.26,
                          name="backporch")],
        doors=[dict(vol="main", side="back", at=-1.0, floor=1, route=False)],
        win={"step": 2.2, "w": 1.0, "muntins": True},
        parts=P.parts(doors=[2.0, -2.0]),
        rail=rgb("6a4c36"),
        deco=[dormers("main", "front", [-1.5], tint=rgb("c08860"), roof_tint=rgb("4a4038")),
              chimney(-6.0, 0.0, w=1.2, d=1.4, top=11.6)],
        loot=7,
    )


@design("rw-mill-row", RW)
def _rw_row():
    U = [Plan(6.4, 9.4, 2, side=("left" if i % 2 == 0 else "right"), name=f"u{i}", x=(i - 1) * 6.4) for i in range(3)]
    tints = [rgb("8a6a50"), rgb("6e7a62"), rgb("9a7458")]
    vols = [vol(u.name, u.rect, 2, flat(1.0, coping=STAIN_DARK), wall=("batten", t)) for u, t in zip(U[1:], tints[1:])]
    front = porch(U[0], "front", U[0].x0, U[2].x1, 2.0, roof=dict(type="shed", high="back", rise=0.4, m="metal", tint=rgb("5e6460"), over=0.2),
                  deck=rgb("6a4c36"), post=("paint", STAIN_DARK), postSize=0.16)
    return house(
        town=RW, title="Mill row", P=U[0],
        use="Riverwood: three lumber-mill workers' houses in a row, stained board-and-batten in three colours, two "
            "storeys and a roof deck each, one porch under a tin roof across the front",
        wall=("batten", tints[0]), trim=rgb("e8dcc0"), roof=flat(1.0, coping=STAIN_DARK),
        vols_extra=vols + [front],
        doors=[*[dict(vol=u.name, side="front", at=round(u.walk, 2)) for u in U[1:]],
               *[dict(vol=u.name, side="back", at=round(u.walk, 2), route=False) for u in U[1:]]],
        stairs_extra=[u.stair() for u in U[1:]],
        parts=[],
        win={"step": 2.0, "w": 0.95},
        deco=[rail_line(U[0].x1, U[0].z0 + 0.25, U[0].x1, U[0].z0 + 3.0, 6.15, STAIN_DARK),
              rail_line(U[1].x1, U[1].z0 + 0.25, U[1].x1, U[1].z0 + 3.0, 6.15, STAIN_DARK)],
        loot=6,
    )


@design("rw-lookout-house", RW)
def _rw_lookout():
    P = Plan(7.6, 8.0, 4, side="left", roof=True)
    return house(
        town=RW, title="Fire lookout house", P=P,
        use="Riverwood: an old fire lookout turned house, a four-storey timber tower with its glazed lookout room "
            "on top, a railed deck round the roof, a stone-based cabin at its foot",
        wall=("batten", rgb("7a6450")), trim=rgb("d9c9a0"), roof=flat(edge="rail", railTint=STAIN_DARK),
        stairs_extra=[],
        vols_extra=[wing(P, "right", 6.0, 4.6, 1, gable(0.7, m="metal", tint=rgb("5d6a64"), over=0.4, along="x"), at=-0.6, name="cabin",
                         wall=("rubble", RUBBLE))],
        links=[dict(a="main", b="cabin", floor=0, at=-1.4)],
        win={"step": 2.2, "w": 1.1},
        parts=[],
        rail=STAIN_DARK,
        deco=[band("main", 3.0, rgb("d9c9a0")), band("main", 6.0, rgb("d9c9a0")), band("main", 9.0, rgb("d9c9a0")),
              water_tank(1.8, -2.4, r=0.9, h=1.8, legs=1.6, m="paint", tint=rgb("6a5a48"))],
        loot=7,
    )


@design("rw-craftsman", RW)
def _rw_craftsman():
    P = Plan(11, 10, 2, side="left", roof=False)
    return house(
        town=RW, title="Craftsman house", P=P,
        use="Riverwood: a sage-green craftsman house, two storeys under a low gable with deep eaves on brackets, a "
            "dormer, tapered porch columns on stone piers, a railed deck on the porch roof",
        wall=("siding", rgb("8fa080")), trim=rgb("e8e0c8"), roof=gable(0.5, m="shingle", tint=rgb("5a4a3e"), over=0.9, along="x"),
        vols_extra=[porch(P, "front", P.x0 + 0.5, P.x1 - 0.5, 2.6, roof=flat(), deck=rgb("6a5444"), post=("paint", rgb("b8ad98")), postSize=0.46,
                          gaps=[("front", P.walk - 0.9, P.walk + 0.9)])],
        doors=[dict(vol="main", side="front", at=1.4, floor=1, route=False)],
        win={"step": 2.2, "w": 1.05, "muntins": True},
        parts=P.parts(doors=[2.2, -2.2]),
        deco=[dormers("main", "back", [0.0], tint=rgb("8fa080"), roof_tint=rgb("5a4a3e")), chimney(3.2, -2.4, w=0.9, d=0.7, top=10.0)],
        loot=7,
    )


@design("rw-chalet", RW)
def _rw_chalet():
    P = Plan(11, 11, 3, side="right", roof=False)
    return house(
        town=RW, title="Chalet", P=P,
        use="Riverwood: a three-storey alpine chalet, its wide gable to the street, balconies with flower boxes "
            "along every upper floor, a stone ground floor, a flat-roofed side wing whose roof is a deck",
        wall=("batten", rgb("a26c46")), trim=rgb("f0e6d0"), roof=gable(0.55, m="shingle", tint=rgb("4a3c34"), over=0.9, along="z"),
        vols_extra=[wing(P, "left", 6.0, 4.0, 1, flat(edge="rail", railTint=STAIN_DARK), at=-2.0, name="wing", wall=("rubble", RUBBLE))],
        links=[dict(a="main", b="wing", floor=0, at=-3.0)],
        doors=[*[dict(vol="main", side="front", at=-2.0, floor=L, route=False) for L in (1, 2)], dict(vol="main", side="left", at=-3.0, floor=1, route=False)],
        win={"step": 2.2, "w": 1.0, "muntins": True, "shutters": rgb("2f5a3a")},
        parts=P.parts(doors=[2.4, -2.4]),
        rail=STAIN_DARK,
        deco=[wainscot("main", 3.15, "rubble", RUBBLE), *[balcony("main", "front", L, -5.4, 5.4, 1.2, rgb("6a4a34"), rail=STAIN_DARK) for L in (1, 2)],
              *[planters([(-5.3, 5.5 + 0.6, -3.0, 5.5 + 1.0)], vname="main") for _ in ()]],
        loot=9,
    )


@design("rw-split-modern", RW)
def _rw_split():
    P = Plan(8.0, 11, 3, side="left", roof=False)
    lo = vol("low", (P.x1, P.z0 + 1.0, P.x1 + 6.6, P.z1), 2, flat(edge="rail", railTint=rgb("2a2a2a")), wall=("batten", rgb("b07a52")))
    return house(
        town=RW, title="Split timber house", P=P,
        use="Riverwood: a modern timber house of two blocks, three and two storeys, cedar battens and big glass, "
            "the tall block under a single steep slope, the low block's roof a railed deck off its top floor",
        wall=("batten", rgb("8e5e40")), trim=rgb("2a2a2a"), roof=dict(type="shed", high="front", rise=1.8, m="metal", tint=rgb("3a3e42"), over=0.4),
        vols_extra=[lo],
        stairs_extra=[],
        links=[dict(a="main", b="low", floor=0, at=1.6), dict(a="main", b="low", floor=1, at=1.6)],
        doors=[dict(vol="main", side="right", at=0.0, floor=2, route=False), dict(vol="low", side="front", at=P.x1 + 4.0, route=False)],
        win={"step": 2.6, "w": 1.6, "sill": 0.6, "head": 2.5},
        parts=P.parts(hall=False),
        deco=[planters([(P.x1 + 4.4, P.z0 + 1.6, P.x1 + 6.2, P.z0 + 2.2)], vname="low")],
        loot=8,
    )


@design("rw-river-flats", RW)
def _rw_flats():
    P = Plan(15, 11, 3, side="right")
    return house(
        town=RW, title="River flats", P=P,
        use="Riverwood: a three-storey timber block of flats over the river street, stacked balconies on every "
            "floor, a green roof deck with planters and a pergola",
        wall=("batten", rgb("9e7650")), trim=rgb("e6dcc4"), roof=flat(edge="rail", railTint=STAIN_DARK),
        doors=[*[dict(vol="main", side="front", at=x, floor=L, route=False) for L in (1, 2) for x in (-4.8, -0.4)]],
        win={"step": 2.4, "w": 1.2},
        parts=P.parts(doors=[2.4, -2.4]) + [dict(vol="main", axis="z", at=-2.6, frm=P.z0 + WT, to=P.z1 - WT, doors=[2.6, -2.6])],
        rail=STAIN_DARK,
        deco=[*[balcony("main", "front", L, x - 1.5, x + 1.5, 1.2, rgb("6a4a34"), rail=STAIN_DARK) for L in (1, 2) for x in (-4.8, -0.4)],
              pergola(-6.6, -4.6, -2.2, -1.2), planters([(-6.6, 3.6, -1.0, 4.4), (0.0, -4.8, 3.0, -4.2)])],
        loot=11,
    )


@design("rw-cabin-duplex", RW)
def _rw_cabins():
    A = Plan(7.4, 9.0, 2, side="left", name="a", x=-3.7, roof=False)
    B_ = Plan(7.4, 9.0, 2, side="right", name="b", x=3.7, roof=False)
    front = porch(A, "front", A.x0, B_.x1, 2.2, roof=flat(), deck=rgb("6a4c36"), post=("wood", rgb("a07050")), postSize=0.24,
                  gaps=[("front", A.walk - 0.8, A.walk + 0.8), ("front", B_.walk - 0.8, B_.walk + 0.8)])
    return house(
        town=RW, title="Twin log cabins", P=A,
        use="Riverwood: two log cabins under one porch, two storeys each under their own steep gables to the "
            "street, the porch's railed roof a deck off both upstairs",
        wall=("wood", rgb("b07e58")), trim=rgb("e8dcc0"), roof=gable(0.8, m="shingle", tint=rgb("4a4038"), along="z", over=0.35),
        vols_extra=[vol("b", B_.rect, 2, gable(0.8, m="shingle", tint=rgb("4a4038"), along="z", over=0.35), wall=("wood", rgb("a0704c"))), front],
        doors=[dict(vol="b", side="front", at=round(B_.walk, 2)), dict(vol="b", side="back", at=round(B_.walk, 2), route=False),
               dict(vol="a", side="front", at=-1.6, floor=1, route=False), dict(vol="b", side="front", at=1.6, floor=1, route=False)],
        stairs_extra=[B_.stair()],
        parts=A.parts(hall=False) + B_.parts(hall=False),
        win={"step": 2.2, "w": 1.0, "muntins": True},
        rail=rgb("6a4c36"),
        deco=[chimney(-5.8, -2.4, w=0.9, d=0.9, top=10.4), chimney(5.8, -2.4, w=0.9, d=0.9, top=10.4)],
        loot=6,
    )


@design("rw-mercantile", RW)
def _rw_merc():
    P = Plan(12, 12, 2, side="left", roof=False)
    r0, r1 = P.rooms()
    return house(
        town=RW, title="Mercantile", P=P,
        use="Riverwood: the riverside mercantile, its gable to the street with the store's sign, display windows "
            "under a deep porch whose railed roof is the upstairs flat's balcony, a back storeroom with a roof deck",
        wall=("siding", rgb("c8b89a")), trim=rgb("6a2a22"), roof=gable(0.62, m="metal", tint=rgb("7a2a26"), along="z", over=0.4),
        vols_extra=[porch(P, "front", P.x0, P.x1, 2.8, roof=flat(), deck=rgb("6a4c36"), post=("paint", rgb("e8dcc0")),
                          gaps=[("front", P.walk - 0.9, P.walk + 0.9), ("front", (r0 + r1) / 2 - 0.9, (r0 + r1) / 2 + 0.9)]),
                    wing(P, "back", 7.0, 4.0, 1, flat(edge="rail"), at=2.0, name="store", wall=("batten", rgb("9a8a70")))],
        links=[dict(a="main", b="store", floor=0, at=3.6)],
        doors=[dict(vol="main", side="front", at=round((r0 + r1) / 2, 2), route=False), dict(vol="main", side="front", at=-1.6, floor=1, route=False),
               dict(vol="main", side="back", at=3.6, floor=1, route=False)],
        back_door=False,
        holes=[dict(vol="main", side="front", floor=0, a=r0 + 0.3, b=(r0 + r1) / 2 - 0.9, y0=0.4, y1=2.6),
               dict(vol="main", side="front", floor=0, a=(r0 + r1) / 2 + 0.9, b=r1 - 0.3, y0=0.4, y1=2.6)],
        win={"step": 2.4, "w": 1.0, "muntins": True, "floors": {"all": [1], "left": [0, 1], "right": [0, 1], "back": [0, 1]}},
        parts=P.parts(doors=[2.4, -2.4]),
        deco=[sign("main", "front", -4.6, 4.6, 6.4, 0.9, rgb("6a2a22"), letters=rgb("efe0b8"))],
        loot=9,
    )


@design("rw-stone-cottage", RW)
def _rw_stone():
    P = Plan(10, 9, 2, side="right", roof=False)
    return house(
        town=RW, title="Stone cottage", P=P,
        use="Riverwood: a fieldstone cottage, two storeys under a steep slate gable with two dormers, a stone "
            "chimney, a timber deck on posts at the side whose roof is a railed terrace",
        wall=("rubble", rgb("c4bcb0")), trim=rgb("e8dcc0"), roof=gable(0.9, m="slate", tint=rgb("4a4e56"), over=0.35),
        vols_extra=[porch(P, "left", P.z0 + 0.5, P.z1 - 0.5, 3.0, roof=flat(), deck=rgb("6a4c36"), post=("wood", rgb("8a6040")), postSize=0.24,
                          name="deck")],
        doors=[dict(vol="main", side="left", at=0.6, floor=1, route=False), dict(vol="main", side="left", at=-2.0, route=False)],
        win={"step": 2.2, "w": 0.95, "muntins": True, "shutters": rgb("2f4a5a")},
        parts=P.parts(doors=[2.0, -1.8]),
        rail=rgb("6a4c36"),
        deco=[dormers("main", "front", [-2.0, 2.0], tint=rgb("e8dcc0"), roof_tint=rgb("4a4e56"), m="slate"),
              chimney(5.4, -1.6, w=1.0, d=1.0, top=11.6, m="rubble", tint=rgb("c4bcb0"))],
        loot=7,
    )
