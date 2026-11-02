"""
Re-author the glove textures on the shipped glove mesh, without rebuilding the mesh.

  python retexture_gloves.py -- <rig.json> <outdir> [--size 2048] [--reuse-bakes]

Opens gloves.blend (the game meshes glove_L / glove_R with the UV atlas the GLBs ship), recovers
the sculpt field's parts per hand (glove_sdf.surface) for the panel classification, and runs
glove_textures.build on those meshes. The output glove_basecolor / normal / orm PNGs fit the
existing UVs, so they can replace the glove textures in the viewmodel GLBs directly
(../replace_textures.mjs): mesh, UVs, skin and rig stay byte-identical.
"""
import bpy, sys, os
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import glove_sdf as G

argv = sys.argv[sys.argv.index("--") + 1:]
rig_path, outdir = argv[:2]
SIZE = int(argv[argv.index("--size") + 1]) if "--size" in argv else 2048
HP_VOXEL = 0.0007
os.makedirs(outdir, exist_ok=True)
rig = G.load_rig(rig_path)
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(__file__), "gloves.blend"))


def to_blender(p):
    p = np.asarray(p)
    return np.stack([p[..., 0], -p[..., 2], p[..., 1]], -1)


def from_blender(p):
    p = np.asarray(p)
    return np.stack([p[..., 0], p[..., 2], -p[..., 1]], -1)


hands = {}
for side in ("L", "R"):
    h = G.HandFrame(rig, side)
    parts, info = G.build_parts(h)
    hands[side] = (h, bpy.data.objects[f"glove_{side}"], parts, info)
import glove_textures  # noqa: E402

glove_textures.build(hands, outdir, SIZE, HP_VOXEL, to_blender, from_blender, reuse="--reuse-bakes" in argv)
print("RETEXTURED", outdir)
