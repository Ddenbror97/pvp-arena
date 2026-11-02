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

Animation is authored on a rig-agnostic control rig, so the same clips drive both teams'
existing arms (the runtime retargets them):
  KR_Hand     wrist pivot offset (translation, rotation) from the hand's rest pose
  KR_Knife    knife rotation about the finger ring (spins, flips) in hand space
  KR_Fingers  translation.x = grip closure (1 closed on the handle, 0 open for a spin)
  KR_View     viewmodel framing: offset toward screen centre / small camera-local tilt
Clips are named karambit_*; sound cues (frame-accurate, from the same keys) are written to the
scene extras as {"cues": {clip: [[seconds, sound], ...]}}.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Euler, Matrix, Quaternion, Vector

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

# =============================================================================== control rig
controls = {}
for name, rot_mode in (("KR_Hand", "QUATERNION"), ("KR_Knife", "XYZ"), ("KR_Fingers", "QUATERNION"),
                       ("KR_View", "QUATERNION")):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.02
    e.rotation_mode = rot_mode
    sc.collection.objects.link(e)
    controls[name] = e


def q_game(rx, ry, rz):
    """Rotation given as game-space Euler XYZ (radians) → Blender-space quaternion."""
    m = Euler((rx, ry, rz), "XYZ").to_matrix()
    return (to_blender @ m @ to_blender.transposed()).to_quaternion()


def ease_keys(fcurves, interpolation="BEZIER"):
    for fc in fcurves:
        for k in fc.keyframe_points:
            k.interpolation = interpolation
            k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"


CLIPS = {}


def clip(name, length, hand_pos=(), hand_rot=(), knife=(), fingers=(), view_pos=(), view_rot=(), cues=(),
         loop=False):
    """Key a clip. Tracks are lists of (seconds, value); values in game space:
    hand_pos/view_pos (x, y, z) metres; hand_rot/view_rot Euler (x, y, z) radians; knife = angle
    (radians) about the ring axis (+x, positive tips the blade forward and up); fingers 0..1.
    Missing tracks hold rest. Every track gets a key at 0 and at `length`."""
    act = bpy.data.actions.new(name)
    rest = {"KR_Hand": ((0, 0, 0), (0, 0, 0)), "KR_View": ((0, 0, 0), (0, 0, 0))}

    def full(track, default):
        keys = list(track) or [(0, default)]
        if keys[0][0] > 0:
            keys.insert(0, (0, keys[0][1] if loop else default))
        if keys[-1][0] < length:
            keys.append((length, keys[0][1] if loop else keys[-1][1]))
        return keys

    for obj_name, pos, rot in (("KR_Hand", hand_pos, hand_rot), ("KR_View", view_pos, view_rot)):
        o = controls[obj_name]
        o.animation_data_create()
        o.animation_data.action = act
        for t, v in full(pos, (0, 0, 0)):
            o.location = B(v)
            o.keyframe_insert("location", frame=1 + t * FPS)
        for t, v in full(rot, (0, 0, 0)):
            o.rotation_quaternion = q_game(*v)
            o.keyframe_insert("rotation_quaternion", frame=1 + t * FPS)
    k = controls["KR_Knife"]
    k.animation_data_create()
    k.animation_data.action = act
    for t, a in full(knife, 0.0):
        # Game +x is Blender +x: a turn about the ring axis is a plain Blender x rotation.
        k.rotation_euler = (a, 0, 0)
        k.keyframe_insert("rotation_euler", frame=1 + t * FPS)
    f = controls["KR_Fingers"]
    f.animation_data_create()
    f.animation_data.action = act
    for t, v in full(fingers, 1.0):
        f.location = (v, 0, 0)
        f.keyframe_insert("location", frame=1 + t * FPS)
    for o in controls.values():
        o.animation_data.action = act
    fcurves = [fc for layer in act.layers for strip in layer.strips for bag in strip.channelbags
               for fc in bag.fcurves] if hasattr(act, "layers") else list(act.fcurves)
    ease_keys(fcurves)
    if loop:
        for fc in fcurves:
            fc.modifiers.new("CYCLES")
    CLIPS[name] = {"length": length, "cues": [[round(t, 4), n] for t, n in cues], "loop": loop}
    for o in controls.values():
        tr = o.animation_data.nla_tracks.new()
        tr.name = name
        strip = tr.strips.new(name, 1, act)
        try:
            strip.action_slot = o.animation_data.action_slot
        except AttributeError:
            pass
        tr.mute = True
        o.animation_data.action = None


TAU = math.tau
# --- equip: the hand comes up from the lower right, the knife turns into view hanging on the
# index finger, flips once round the ring and the fingers close on it.
clip("karambit_equip", 0.6,
     hand_pos=[(0, (0.08, -0.2, 0.05)), (0.18, (0.025, -0.045, 0.015)), (0.42, (-0.006, 0.008, 0)), (0.6, (0, 0, 0))],
     hand_rot=[(0, (-0.7, -0.35, -0.9)), (0.22, (-0.12, -0.1, -0.25)), (0.44, (0.04, 0.02, 0.03)), (0.6, (0, 0, 0))],
     knife=[(0, -0.6), (0.16, -0.4), (0.42, TAU - 0.15), (0.6, TAU)],
     fingers=[(0, 0.35), (0.14, 0.15), (0.36, 0.1), (0.46, 1.0)],
     cues=[(0.02, "equip"), (0.2, "flip"), (0.45, "catch")])
# --- idle: breathing, small wrist adjustments, a little blade sway, occasional finger tension.
clip("karambit_idle", 4.0, loop=True,
     hand_pos=[(0, (0, 0, 0)), (1.0, (0.0015, 0.0045, 0.001)), (2.0, (0, 0.001, 0)), (3.0, (-0.001, 0.004, -0.001)), (4.0, (0, 0, 0))],
     hand_rot=[(0, (0, 0, 0)), (1.1, (0.012, -0.006, 0.01)), (2.2, (0.002, 0.004, -0.004)), (3.1, (0.01, 0.002, 0.012)), (4.0, (0, 0, 0))],
     knife=[(0, 0), (1.3, 0.02), (2.6, -0.012), (4.0, 0)],
     fingers=[(0, 1.0), (2.4, 1.0), (2.6, 0.93), (2.85, 1.0), (4.0, 1.0)])
# --- trick 1: classic finger spin round the index finger, back to the grip.
clip("karambit_idle_spin", 1.25,
     hand_pos=[(0.12, (0, 0.012, 0)), (0.5, (-0.012, 0.02, -0.01)), (0.95, (0, 0.006, 0))],
     hand_rot=[(0.12, (0.08, 0.05, 0.12)), (0.55, (0.16, 0.08, 0.2)), (1.0, (0.02, 0, 0.02))],
     knife=[(0.16, 0), (0.24, -0.25), (0.78, TAU), (0.9, TAU + 0.06), (1.25, TAU)],
     fingers=[(0.1, 1.0), (0.2, 0.1), (0.72, 0.1), (0.84, 1.0)],
     view_pos=[(0.15, (-0.025, 0.01, 0)), (0.8, (-0.03, 0.012, 0)), (1.25, (0, 0, 0))],
     view_rot=[(0.15, (0, 0.03, 0)), (0.8, (0, 0.04, 0)), (1.25, (0, 0, 0))],
     cues=[(0.24, "spin"), (0.83, "catch")])
# --- trick 2: reverse grip flip: release, half-turn round the ring to a reverse hold (blade up),
# a wrist turn to show it, half-turn back and catch.
clip("karambit_reverse_grip", 1.7,
     hand_pos=[(0.1, (0, 0.01, 0)), (0.5, (-0.02, 0.03, -0.01)), (1.1, (-0.03, 0.035, -0.015)), (1.5, (0, 0.006, 0))],
     hand_rot=[(0.1, (0.05, 0, 0.1)), (0.5, (0.1, -0.1, 0.35)), (1.05, (0.12, 0.15, 0.45)), (1.5, (0, 0, 0.02))],
     knife=[(0.14, 0), (0.48, math.pi), (1.1, math.pi), (1.42, TAU), (1.7, TAU)],
     fingers=[(0.1, 1.0), (0.18, 0.15), (0.5, 0.55), (1.05, 0.55), (1.15, 0.15), (1.4, 0.15), (1.48, 1.0)],
     view_rot=[(0.15, (0, 0, 0)), (0.6, (0, 0, -0.035)), (1.1, (0, 0.01, -0.04)), (1.6, (0, 0, 0))],
     cues=[(0.18, "flip"), (0.5, "catch-soft"), (1.15, "flip"), (1.47, "catch")])
# --- trick 3: fast double rotation and a satisfying catch.
clip("karambit_double_flip", 1.15,
     hand_pos=[(0.08, (0, 0.015, 0)), (0.45, (-0.008, 0.03, -0.012)), (0.9, (0, 0.004, 0))],
     hand_rot=[(0.08, (0.1, 0, 0.08)), (0.45, (0.22, 0.05, 0.12)), (0.9, (0, 0, 0))],
     knife=[(0.12, 0), (0.18, -0.3), (0.68, 2 * TAU), (0.78, 2 * TAU + 0.08), (1.15, 2 * TAU)],
     fingers=[(0.08, 1.0), (0.15, 0.08), (0.64, 0.08), (0.74, 1.0)],
     view_rot=[(0.1, (0, 0, 0)), (0.55, (0.035, 0, 0)), (1.15, (0, 0, 0))],
     cues=[(0.17, "spin"), (0.45, "spin"), (0.74, "catch")])
# --- trick 4: blade inspection: brought toward screen centre, turned slowly to catch the light,
# the tip examined, lowered again.
clip("karambit_inspect_blade", 2.7,
     hand_pos=[(0.3, (-0.07, 0.05, 0.02)), (1.0, (-0.09, 0.065, 0.03)), (1.9, (-0.085, 0.06, 0.028)), (2.45, (-0.01, 0.005, 0))],
     hand_rot=[(0.3, (0.0, 0.6, 0.0)), (1.0, (-0.4, 0.4, -0.5)), (1.5, (-0.5, 0.0, 0.0)), (1.95, (0.0, 0.0, -0.7)), (2.5, (0, 0, 0))],
     knife=[(0, 0), (1.4, 0.15), (1.8, 0.1), (2.7, 0)],
     view_pos=[(0.3, (-0.04, 0.02, 0)), (2.0, (-0.04, 0.02, 0)), (2.6, (0, 0, 0))],
     cues=[(0.25, "cloth"), (2.3, "cloth")])
# --- trick 5 / manual inspect: wrist roll, ring spin, reverse transition, final catch, then a
# close blade inspection near centre screen.
clip("karambit_freestyle", 3.4,
     hand_pos=[(0.15, (0.0, 0.02, 0)), (0.6, (-0.03, 0.04, -0.01)), (1.3, (-0.05, 0.05, -0.01)), (2.0, (-0.06, 0.05, 0.0)),
               (2.6, (-0.075, 0.055, 0.025)), (3.15, (0, 0.005, 0))],
     hand_rot=[(0.15, (0.05, 0, -0.9)), (0.55, (0.1, 0.3, -0.2)), (1.0, (0.15, 0.2, -0.1)), (1.6, (0.1, -0.1, -0.3)),
               (2.1, (0.0, 0.2, -0.2)), (2.6, (-0.4, 0.4, -0.5)), (3.15, (0, 0, 0))],
     knife=[(0.5, 0), (0.62, -0.25), (1.15, TAU), (1.45, TAU + math.pi), (1.9, TAU + math.pi), (2.2, 2 * TAU),
            (3.4, 2 * TAU)],
     fingers=[(0.5, 1.0), (0.58, 0.1), (1.12, 0.1), (1.2, 0.6), (1.4, 0.15), (1.9, 0.55), (2.15, 0.15), (2.26, 1.0)],
     view_pos=[(0.2, (-0.02, 0.01, 0)), (2.6, (-0.05, 0.025, 0)), (3.3, (0, 0, 0))],
     view_rot=[(0.2, (0, 0, -0.03)), (1.0, (0.02, 0.02, 0.02)), (2.6, (0, 0.03, -0.02)), (3.3, (0, 0, 0))],
     cues=[(0.12, "cloth"), (0.62, "spin"), (1.2, "catch-soft"), (1.45, "flip"), (2.22, "catch")])
# --- inspect (F): the freestyle flourish, then a closer blade inspection.
clip("karambit_inspect", 5.6,
     hand_pos=[(0.15, (0.0, 0.02, 0)), (0.6, (-0.03, 0.04, -0.01)), (1.3, (-0.05, 0.05, -0.01)), (2.0, (-0.06, 0.05, 0.0)),
               (2.6, (-0.08, 0.06, 0.025)), (3.4, (-0.095, 0.07, 0.035)), (4.3, (-0.09, 0.065, 0.03)), (5.3, (0, 0.004, 0))],
     hand_rot=[(0.15, (0.05, 0, -0.9)), (0.55, (0.1, 0.3, -0.2)), (1.0, (0.15, 0.2, -0.1)), (1.6, (0.1, -0.1, -0.3)),
               (2.1, (0.0, 0.2, -0.2)), (2.7, (0.0, 0.6, 0.0)), (3.4, (-0.4, 0.4, -0.5)), (4.0, (-0.5, 0.0, 0.0)),
               (4.6, (0.0, 0.0, -0.7)), (5.35, (0, 0, 0))],
     knife=[(0.5, 0), (0.62, -0.25), (1.15, TAU), (1.45, TAU + math.pi), (1.9, TAU + math.pi), (2.2, 2 * TAU),
            (3.9, 2 * TAU + 0.15), (5.6, 2 * TAU)],
     fingers=[(0.5, 1.0), (0.58, 0.1), (1.12, 0.1), (1.2, 0.6), (1.4, 0.15), (1.9, 0.55), (2.15, 0.15), (2.26, 1.0)],
     view_pos=[(0.2, (-0.02, 0.01, 0)), (2.6, (-0.05, 0.025, 0)), (4.5, (-0.05, 0.025, 0)), (5.5, (0, 0, 0))],
     view_rot=[(0.2, (0, 0, -0.03)), (1.0, (0.02, 0.02, 0.02)), (2.4, (0, 0.03, -0.02)), (5.5, (0, 0, 0))],
     cues=[(0.12, "cloth"), (0.62, "spin"), (1.2, "catch-soft"), (1.45, "flip"), (2.22, "catch"), (5.1, "cloth")])
# --- movement layers (additive over idle; weights set by the runtime from real movement).
clip("karambit_walk", 0.8, loop=True,
     hand_pos=[(0, (0, 0, 0)), (0.2, (0.006, -0.009, 0)), (0.4, (0, 0, 0)), (0.6, (-0.006, -0.009, 0)), (0.8, (0, 0, 0))],
     hand_rot=[(0, (0, 0, 0)), (0.2, (0.015, 0.01, 0.02)), (0.4, (0, 0, 0)), (0.6, (0.015, -0.01, -0.02)), (0.8, (0, 0, 0))])
clip("karambit_strafe", 0.8, loop=True,
     hand_pos=[(0, (0.012, 0, 0)), (0.4, (0.016, -0.004, 0)), (0.8, (0.012, 0, 0))],
     hand_rot=[(0, (0, 0, -0.06)), (0.4, (0.01, 0, -0.075)), (0.8, (0, 0, -0.06))])
clip("karambit_sprint", 0.56, loop=True,
     hand_pos=[(0, (0.01, -0.03, 0.02)), (0.14, (0.03, -0.012, -0.02)), (0.28, (0.01, -0.03, 0.02)), (0.42, (-0.012, -0.012, 0.03)),
               (0.56, (0.01, -0.03, 0.02))],
     hand_rot=[(0, (-0.25, 0.05, 0.1)), (0.14, (-0.12, 0.12, 0.2)), (0.28, (-0.25, 0.05, 0.1)), (0.42, (-0.3, -0.04, 0.0)),
               (0.56, (-0.25, 0.05, 0.1))],
     knife=[(0, 0.1), (0.28, 0.14), (0.56, 0.1)])
clip("karambit_land", 0.38,
     hand_pos=[(0, (0, 0, 0)), (0.07, (0, -0.035, 0.01)), (0.2, (0, 0.006, 0)), (0.38, (0, 0, 0))],
     hand_rot=[(0, (0, 0, 0)), (0.07, (0.08, 0, 0.02)), (0.38, (0, 0, 0))])
# --- attacks (presentation only: the server owns timing, reach and damage).
clip("karambit_slash", 0.4,
     hand_pos=[(0, (0, 0, 0)), (0.05, (0.05, 0.06, 0.02)), (0.13, (-0.1, 0.0, -0.08)), (0.2, (-0.14, -0.04, -0.05)),
               (0.4, (0, 0, 0))],
     hand_rot=[(0, (0, 0, 0)), (0.05, (0.2, -0.3, 0.5)), (0.13, (-0.1, 0.45, -0.4)), (0.2, (-0.1, 0.55, -0.5)),
               (0.4, (0, 0, 0))],
     knife=[(0, 0), (0.05, -0.3), (0.13, -1.0), (0.22, -0.9), (0.4, 0)],
     view_rot=[(0, (0, 0, 0)), (0.12, (-0.006, 0.012, 0.01)), (0.4, (0, 0, 0))],
     cues=[(0.05, "slash")])
clip("karambit_stab", 0.72,
     hand_pos=[(0, (0, 0, 0)), (0.13, (0.02, 0.02, 0.07)), (0.2, (-0.05, 0.03, -0.2)), (0.3, (-0.05, 0.03, -0.19)),
               (0.72, (0, 0, 0))],
     hand_rot=[(0, (0, 0, 0)), (0.13, (0.25, 0.1, 0.2)), (0.2, (0.35, 0.15, 0.15)), (0.3, (0.3, 0.15, 0.15)), (0.72, (0, 0, 0))],
     knife=[(0, 0), (0.13, 0.2), (0.2, -1.15), (0.3, -1.1), (0.72, 0)],
     view_pos=[(0, (0, 0, 0)), (0.2, (0, 0, -0.01)), (0.45, (0, 0, 0))],
     cues=[(0.13, "stab")])
clip("karambit_unequip", 0.25,
     hand_pos=[(0, (0, 0, 0)), (0.25, (0.08, -0.22, 0.05))],
     hand_rot=[(0, (0, 0, 0)), (0.25, (-0.6, -0.2, -0.6))])

# Static rest of the control rig (the clips key every channel; this is what a viewer sees).
for name, o in controls.items():
    o.location = (1, 0, 0) if name == "KR_Fingers" else (0, 0, 0)
    if o.rotation_mode == "QUATERNION":
        o.rotation_quaternion = (1, 0, 0, 0)
    else:
        o.rotation_euler = (0, 0, 0)
sc.frame_start, sc.frame_end = 1, int(1 + 5.6 * FPS)
sc["cues"] = json.dumps({k: v["cues"] for k, v in CLIPS.items()})
sc["clips"] = json.dumps({k: {"length": v["length"], "loop": v["loop"]} for k, v in CLIPS.items()})
print("CLIPS", ", ".join(f"{k} {v['length']}s" for k, v in CLIPS.items()))
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
