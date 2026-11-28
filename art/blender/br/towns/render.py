"""Cycles renders of the rebuilt towns' houses (for the owner; not used by the game)."""
import math
import os

import bpy
from mathutils import Vector

OUT = "art/br/towns/renders"


def setup(w=1600, h=900, samples=24):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX" if "AgX" in [v.identifier for v in sc.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
    world = bpy.data.worlds.get("towns") or bpy.data.worlds.new("towns")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.55, 0.68, 0.85, 1)
    bg.inputs["Strength"].default_value = 0.9
    sc.world = world
    sun = bpy.data.objects.get("sun")
    if not sun:
        ld = bpy.data.lights.new("sun", "SUN")
        ld.energy = 3.2
        ld.angle = math.radians(2)
        sun = bpy.data.objects.new("sun", ld)
        sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(-35))
    ground = bpy.data.objects.get("ground")
    if not ground:
        me = bpy.data.meshes.new("ground")
        me.from_pydata([(-2000, -2000, 0), (2000, -2000, 0), (2000, 2000, 0), (-2000, 2000, 0)], [], [(0, 1, 2, 3)])
        ground = bpy.data.objects.new("ground", me)
        mat = bpy.data.materials.new("ground")
        mat.use_nodes = True
        mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.3, 0.38, 0.22, 1)
        me.materials.append(mat)
        sc.collection.objects.link(ground)
        ground.location.z = -0.01


def camera(loc, target, lens=35):
    sc = bpy.context.scene
    cam = bpy.data.objects.get("cam")
    if not cam:
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
        sc.collection.objects.link(cam)
    cam.data.lens = lens
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam


def shot(path, loc, target, lens=35, **kw):
    setup(**kw)
    camera(loc, target, lens)
    bpy.context.scene.render.filepath = os.path.abspath(path)
    bpy.ops.render.render(write_still=True)


def towns(made, TOWNS):
    """One render per town: its twelve as laid out by build_towns.layout (rows of four, 28 m)."""
    os.makedirs(OUT, exist_ok=True)
    for town, ids in TOWNS.items():
        objs = [o for i in ids if i in made for o in made[i][0] if not (o.name.endswith(".far") or o.name.endswith(".mid"))]
        if not objs:
            continue
        xs = [o.location.x for o in objs]
        ys = [o.location.y for o in objs]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        # Only this town's buildings visible.
        for o in bpy.data.objects:
            if o.type == "MESH" and o.name not in ("ground",):
                o.hide_render = o not in objs
        shot(f"{OUT}/{town}.png", (cx - 20, cy - 95, 62), (cx, cy - 6, 4), lens=30)
