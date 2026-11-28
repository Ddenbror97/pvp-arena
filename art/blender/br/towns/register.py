#!/usr/bin/env python3
"""
Register the rebuilt towns' houses with the island's asset lists, from what build_towns.py
wrote (art/br/towns/blender/<id>.json):

  art/br/assets/kit.json               a procedural asset each (collision: its authored boxes)
  art/br/building-access-routes.json   each house's walk routes (in at the door, up every flight
                                       and out on to the roof), walked by the access tests at
                                       every placement and all four turns

    python3 art/blender/br/towns/register.py

(Both files are json.dumps(indent=2), as the other builders write them.)
"""
import glob
import json
import os

SRC = "art/br/towns/blender"
metas = []
for f in sorted(glob.glob(f"{SRC}/*.json")):
    with open(f) as fh:
        metas.append(json.load(fh))
ids = {m["id"] for m in metas}

KIT = "art/br/assets/kit.json"
with open(KIT) as fh:
    kit = json.load(fh)
kit["assets"] = [a for a in kit["assets"] if a["id"] not in ids]
for m in metas:
    kit["assets"].append({
        "id": m["id"],
        "procedural": "art/blender/br/build_towns.mjs",
        "class": "building",
        "ring": "dwelling",
        "collision": "boxes",
        "use": f"{m['use']} (modelled in Blender, 2026-11-27)",
    })
with open(KIT, "w") as fh:
    fh.write(json.dumps(kit, indent=2, ensure_ascii=False) + "\n")

ROUTES = "art/br/building-access-routes.json"
with open(ROUTES) as fh:
    routes = json.load(fh)
routes = [r for r in routes if r[0] not in ids]
for m in metas:
    for r in m["routes"]:
        routes.append([m["id"], r])
with open(ROUTES, "w") as fh:
    fh.write(json.dumps(routes, indent=2) + "\n")
print(f"{len(metas)} houses: kit.json and {sum(len(m['routes']) for m in metas)} routes")
os.sys.exit(0)
