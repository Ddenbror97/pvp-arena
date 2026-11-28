"""
Build the rebuilt towns' houses in Blender (headless, `bpy`), and write what the game's pipeline
takes from them:

  art/br/towns/blender/<id>.glb     the building as Blender exports it (LODs as objects
                                     <id>.near / .shell / .mid / .far)
  art/br/towns/blender/<id>.json    its collision boxes, entrances, footprint, door aprons and
                                     walk routes (model space)
  art/br/towns/towns.blend          every building, laid out town by town (with --blend)
  art/br/towns/renders/<town>.png   a Cycles render of each town's twelve (with --render)

    /path/to/python-with-bpy art/blender/br/towns/build_towns.py [id …] [--blend] [--render]

Run from the repository root. Then `node art/blender/br/build_towns.mjs` makes the game's LODs.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import blend  # noqa: E402
from designs import DESIGNS, TOWNS  # noqa: E402
from townkit import Building  # noqa: E402

OUT = "art/br/towns/blender"


def routes_of(B):
    """Walk routes (model x, z): from 1.2 m outside the first entrance on the ground, in, to the
    foot of each stair, up every flight (round the well each floor) and out on the roof."""
    out = []
    for st in B.stairs:
        v = B.by[st["vol"]]
        if "from" in st:
            f = tuple(st["from"])
            d = next((q for q in B.doors if (q["vol"], q["side"]) == f[:2] and q["floor"] == 0
                      and (len(f) < 3 or abs(q["at"] - f[2]) < 0.01)), None)
        else:
            d = next((q for q in B.doors if q["floor"] == 0 and q["entrance"] and q.get("route", True)
                      and (q["vol"] == v.name or q.get("to") == v.name)), None)
        if not d or not st.get("route", True):
            continue
        dv = B.by[d["vol"]]
        g = dv.side(d["side"], B.wt)
        o = g["out"]
        out_d = 1.2
        # Past a porch or gallery in front of the door (the walk starts on the ground).
        for w in B.vols:
            if not w.open:
                continue
            if g["axis"] == "x":
                if w.x0 - 0.4 < d["at"] < w.x1 + 0.4 and abs((w.z0 if o[2] > 0 else w.z1) - g["plane"]) < 1e-3:
                    out_d = max(out_d, (w.z1 - w.z0) + 1.0)
            elif w.z0 - 0.4 < d["at"] < w.z1 + 0.4 and abs((w.x0 if o[0] > 0 else w.x1) - g["plane"]) < 1e-3:
                out_d = max(out_d, (w.x1 - w.x0) + 1.0)
        if g["axis"] == "x":
            outside = (d["at"], g["plane"] + o[2] * out_d)
            inside = (d["at"], g["plane"] - o[2] * 1.2)
        else:
            outside = (g["plane"] + o[0] * out_d, d["at"])
            inside = (g["plane"] - o[0] * 1.2, d["at"])
        axis = st["axis"]
        c0, c1 = sorted((st["c0"], st["c1"]))
        cm = (c0 + c1) / 2
        dirn = 1 if st["a1"] > st["a0"] else -1
        before = st["a0"] - dirn * 0.45
        after = st["a1"] + dirn * 0.4
        lo_wall = (c0 - (v.x0 if axis == "z" else v.z0)) < B.wt + 0.15
        side_c = (c1 + 0.55) if lo_wall else (c0 - 0.55)

        def P(a, c):
            return (round(c, 2), round(a, 2)) if axis == "z" else (round(a, 2), round(c, 2))

        pts = [outside, inside] + [tuple(p) for p in st.get("via", [])] + [P(before, cm)]
        n = v.floors - 1 + (1 if st.get("roof") else 0)
        for L in range(n):
            pts.append(P(after, cm))
            if L < n - 1:
                pts += [P(after, side_c), P(before, side_c), P(before, cm)]
        if st.get("roof") and "_door" in st:
            # Out of the stair house's door on to the deck.
            side, at, r = st["_door"]
            t = 0.2
            if side in ("z0", "z1"):
                zw = r[3] if side == "z1" else r[1]
                sg = 1 if side == "z1" else -1
                pts += [(at, zw - sg * 0.55), (at, zw + sg * 1.0)]
            else:
                xw = r[2] if side == "x1" else r[0]
                sg = 1 if side == "x1" else -1
                pts += [(xw - sg * 0.55, at), (xw + sg * 1.0, at)]
            del t
        if st.get("roof") and "exit" in st:
            pts += [tuple(p) for p in st["exit"]]
        out.append([[round(x, 2), round(z, 2)] for x, z in pts])
    for extra in B.S.get("routes", []):
        out.append([[round(x, 2), round(z, 2)] for x, z in extra])
    return out


def build(did):
    spec = DESIGNS[did]()
    spec["id"] = did
    B = Building(spec).build()
    routes = routes_of(B)

    def extent():
        xs = [p for b in B.k.solids for p in (b[0], b[3])]
        zs = [p for b in B.k.solids for p in (b[2], b[5])]
        for P in B.k.parts:
            if P["t"] == "box":
                xs += [P["b"][0], P["b"][3]]
                zs += [P["b"][2], P["b"][5]]
            elif P["t"] == "poly":
                xs += [p[0] for p in P["p"]]
                zs += [p[2] for p in P["p"]]
        return min(xs), max(xs), min(zs), max(zs)

    # The pivot to the footprint's middle (the layout places buildings by their footprint).
    x0, x1, z0, z1 = extent()
    cx, cz = round((x0 + x1) / 2, 2), round((z0 + z1) / 2, 2)
    B.translate(-cx, -cz)
    routes = [[[round(x - cx, 2), round(z - cz, 2)] for x, z in r] for r in routes]
    ys = [b[4] for b in B.k.solids]
    # The footprint the layout keeps clear (walls, roofs, porches, eaves).
    x0, x1, z0, z1 = extent()
    foot = [round(max(-x0, x1) * 2, 2), round(max(-z0, z1) * 2, 2)]
    aprons = []
    for q in B.doors:
        if q["floor"] != 0 or not q["entrance"]:
            continue
        g = B.by[q["vol"]].side(q["side"], B.wt)
        o = g["out"]
        aprons.append([round(q["at"] - cx, 2), round(g["plane"] + o[2] * 1.2 - cz, 2)] if g["axis"] == "x"
                      else [round(g["plane"] + o[0] * 1.2 - cx, 2), round(q["at"] - cz, 2)])
    meta = {
        "id": did,
        "title": spec["title"],
        "use": spec["use"],
        "town": spec["town"],
        "foot": foot,
        "height": round(max(ys), 2),
        "aprons": aprons,
        "entrances": B.entrances,
        "routes": routes,
        "boxes": B.k.solids,
        "loot": spec.get("loot", 6),
        "floors": max(v.floors for v in B.vols),
    }
    return B, meta


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    ids = args or list(DESIGNS)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    made = {}
    for did in ids:
        B, meta = build(did)
        coll = bpy.data.collections.new(did)
        scene.collection.children.link(coll)
        objs = blend.make(B, did, coll)
        blend.export(objs, f"{OUT}/{did}.glb")
        with open(f"{OUT}/{did}.json", "w") as f:
            json.dump(meta, f, separators=(",", ":"))
            f.write("\n")
        tris = sum(len(o.data.polygons) for o in objs)
        print(f"{did:24s} {meta['foot']} h {meta['height']}  {len(meta['boxes'])} boxes  {tris} faces  "
              f"{len(meta['entrances'])} doors  {len(meta['routes'])} routes")
        made[did] = (objs, meta)
    if "--blend" in flags or "--render" in flags:
        layout(made)
    if "--blend" in flags:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath("art/br/towns/towns.blend"), compress=True)
    if "--render" in flags:
        import render

        render.towns(made, TOWNS)


def layout(made):
    """Each town's twelve in a row of three by four, the towns side by side (the .blend only)."""
    by_town = {}
    for did, (objs, meta) in made.items():
        by_town.setdefault(meta["town"], []).append((did, objs, meta))
    ox = 0
    for town, items in by_town.items():
        for i, (did, objs, meta) in enumerate(items):
            col, row = i % 4, i // 4
            for ob in objs:
                ob.location = (ox + col * 28, -row * 28, 0)
                # Only the near and middle LODs in the scene's view; the far one hidden.
                ob.hide_render = ob.name.endswith(".far") or ob.name.endswith(".mid")
                ob.hide_set(ob.name.endswith(".far") or ob.name.endswith(".mid"))
        ox += 4 * 28 + 40


if __name__ == "__main__":
    main()
