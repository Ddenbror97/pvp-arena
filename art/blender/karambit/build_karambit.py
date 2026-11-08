"""
Karambit (secondary slot) for the first-person and third-person knife: model, attachment
markers and the animation clips, in one GLB.

  python build_karambit.py -- <source scene.gltf> <out.glb> [--blend out.blend]

Source: "Karambit" by Diamonddogkz, CC BY 4.0 (public/fps/models/ATTRIBUTION.md). Downloaded
from Sketchfab as glTF; not committed (see README.md).

Knife space (glTF, metres, y up), the frame every runtime consumer uses:
  origin  the finger ring's centre (the index finger passes through it along x)
  -y      along the handle from the ring toward the guard and blade
  -z      the finger-groove side of the handle; the blade curves toward +z
Markers (empties under "Karambit"): RingCenter, HandleMid, Guard, BladeTip.

The animation (a rig-agnostic control rig and the karambit_* clips) is added afterwards by
animate_karambit.py, which build.sh runs on the saved .blend.
"""
import bpy, math, os, sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]
BLEND = argv[argv.index("--blend") + 1] if "--blend" in argv else None
LENGTH = 0.19  # overall knife length, metres (ring to blade tip)
FPS = 60

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = FPS


def B(v):
    """Game/glTF (x, y up, z) → Blender (x, -z, y)."""
    return Vector((v[0], -v[2], v[1]))


# =============================================================================== knife mesh
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
for o in meshes:
    o.data = o.data.copy()
    o.data.transform(o.matrix_world)
    o.parent = None  # before resetting: clearing the parent keeps the local matrix
    o.matrix_world = Matrix.Identity(4)
if len(meshes) > 1:
    with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes):
        bpy.ops.object.join()
knife = meshes[0]
for o in list(bpy.data.objects):
    if o is not knife:
        bpy.data.objects.remove(o, do_unlink=True)
knife.name = knife.data.name = "Karambit"
me = knife.data
pts = [v.co.copy() for v in me.vertices]
ymin, ymax = min(p.y for p in pts), max(p.y for p in pts)
L = ymax - ymin
frac = lambda p: (p.y - ymin) / L
# Source layout (measured by slicing along y): ring 0–0.2 of the length, handle 0.2–0.7 with the
# finger grooves on +z, blade from ~0.72 curving down (-z) to the tip.
ring = [p for p in pts if frac(p) < 0.2]
ring_centre = sum(ring, Vector()) / len(ring)
ring_centre.x = 0.0
tip = min(pts, key=lambda p: p.z)
guard_y = ymin + 0.71 * L
guard = [p for p in pts if abs(p.y - guard_y) < 0.02 * L]
guard_centre = Vector((0, guard_y, (min(p.z for p in guard) + max(p.z for p in guard)) / 2))
mid_y = ymin + 0.42 * L
mid = [p for p in pts if abs(p.y - mid_y) < 0.03 * L]
handle_mid = Vector((0, mid_y, (min(p.z for p in mid) + max(p.z for p in mid)) / 2))
# Source (Blender coords) → knife space in Blender coords. Knife space in glTF is
# (x, y, z) = (src x, -src y, -src z) about the ring centre: a 180° turn about x keeps it
# right-handed. In Blender coordinates that glTF frame is (x, -z, y) of it.
s = LENGTH / L
to_game = Matrix(((1, 0, 0), (0, -1, 0), (0, 0, -1)))  # src → glTF axes (x, -y, -z)
to_blender = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))  # glTF (x, y, z) → Blender (x, -z, y)
R = (to_blender @ to_game).to_4x4()


def place(p):
    return R @ ((p - ring_centre) * s)


me.transform(Matrix.Scale(s, 4) @ Matrix.Translation(-ring_centre))
me.transform(R)
me.update()
# Smooth shading with crisp creases; the source normals are kept where they exist.
for poly in me.polygons:
    poly.use_smooth = True
markers = {
    "RingCenter": Vector((0, 0, 0)),
    "HandleMid": place(handle_mid),
    "Guard": place(guard_centre),
    "BladeTip": place(tip),
}
for name, at in markers.items():
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.01
    e.location = at
    e.parent = knife
    sc.collection.objects.link(e)
sc.collection.objects.link(knife) if knife.name not in sc.collection.objects else None
print("KNIFE tris", sum(len(p.vertices) - 2 for p in me.polygons), "markers",
      {k: [round(x, 4) for x in v] for k, v in markers.items()})

# The control rig and the animation clips are keyed by animate_karambit.py (karambit_clips.py),
# which build.sh runs on the saved .blend.
# The game ships 1K textures (build.sh); keep the .blend at the same resolution so it stays small.
for image in bpy.data.images:
    if image.size[0] > 1024 or image.size[1] > 1024:
        w, h = image.size
        image.scale(max(1, w * 1024 // max(w, h)), max(1, h * 1024 // max(w, h)))
        image.pack()
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_yup=True, export_extras=True,
                          export_animation_mode="ACTIONS", export_force_sampling=True,
                          export_optimize_animation_size=True, export_image_format="AUTO",
                          export_materials="EXPORT", use_active_scene=True)
print("exported", OUT)
