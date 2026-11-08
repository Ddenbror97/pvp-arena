"""
Karambit first-person animation (two hands): re-keys the control rig in karambit.blend and
exports the GLB the game loads. The knife mesh and its markers come from build_karambit.py and
are not touched here.

  python animate_karambit.py -- <karambit.blend> <out.glb> [--save]

The clips drive a rig-agnostic control rig (empties); the game applies it to each team's own
arms (src/lib/fps/karambit-viewmodel.ts), on top of the two-hand stance defined there
(KARAMBIT_STANCE). Values are in game space (glTF: x right, y up, z toward the viewer; the
viewmodel camera looks down -z):

  KR_Hand      right wrist: position offset from the stance (metres, camera space) and a turn in
               the hand's own frame (Euler x, y, z radians: x rolls about the hand's axis
               (wrist to knuckles), y turns about the palm normal, z bends the wrist about the
               third axis)
  KR_HandL     the same for the left wrist
  KR_Elbow     position: right elbow offset from the stance's (camera space); the forearm aims at
               the elbow, so moving it changes where the forearm enters the screen
  KR_ElbowL    the same for the left elbow
  KR_Knife     knife turn about the finger ring (Euler x radians; spins and flips)
  KR_Fingers   right fingers closed on the handle: position (middle, ring, little), 1 closed,
               0 open (the index finger never leaves the ring)
  KR_Thumb     position.x: right thumb, 1 over the fingers, 0 open
  KR_FingersL  left hand: position.x curl (0 relaxed, 1 a loose fist), .y open (0 relaxed, 1
               fingers extended and spread)
  KR_View      whole-viewmodel offset (metres, camera space); never the aim

Every clip keys every channel from frame 0. Sound cues (seconds) go to the scene extras as
{"cues": {clip: [[seconds, sound], ...]}}.
"""
import bpy, json, math, os, sys
from mathutils import Euler, Matrix, Quaternion, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
BLEND_IN, OUT = argv[0], argv[1]
SAVE = "--save" in argv
FPS = 60
TAU = math.tau

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(BLEND_IN))
sc = bpy.context.scene
sc.render.fps = FPS

to_blender = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))  # glTF (x, y, z) -> Blender (x, -z, y)


def B(v):
    return to_blender @ Vector(v)


def q_game(rx, ry, rz):
    """Game-space Euler XYZ (three.js order: R = Rx Ry Rz) -> Blender-space quaternion."""
    m = (Matrix.Rotation(rx, 3, "X") @ Matrix.Rotation(ry, 3, "Y") @ Matrix.Rotation(rz, 3, "Z"))
    return (to_blender @ m @ to_blender.transposed()).to_quaternion()


# ------------------------------------------------------------------------------- control rig
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
CONTROL_NAMES = ("KR_Hand", "KR_HandL", "KR_Elbow", "KR_ElbowL", "KR_Knife", "KR_Fingers", "KR_Thumb",
                 "KR_FingersL", "KR_View")
controls = {}
for name in CONTROL_NAMES:
    o = bpy.data.objects.get(name)
    if o is None:
        o = bpy.data.objects.new(name, None)
        o.empty_display_size = 0.02
        sc.collection.objects.link(o)
    o.animation_data_clear()
    o.rotation_mode = "XYZ" if name == "KR_Knife" else "QUATERNION"
    controls[name] = o
REST = {
    "KR_Fingers": (1, 1, 1),
    "KR_Thumb": (1, 0, 0),
}


def ease(fcurves):
    for fc in fcurves:
        for k in fc.keyframe_points:
            k.interpolation = "BEZIER"
            k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"
        fc.update()


CLIPS = {}


def full(track, default, length, loop):
    """A key at 0 and at `length` (a loop closes on its first value; missing tracks hold rest)."""
    keys = sorted(track, key=lambda k: k[0]) or [(0, default)]
    if keys[0][0] > 0:
        keys.insert(0, (0, keys[0][1] if loop else default))
    if keys[-1][0] < length:
        keys.append((length, keys[0][1] if loop else keys[-1][1]))
    return keys


def shifted(track, delay, length):
    """The same curve `delay` seconds later (clamped to the clip), for finger-by-finger ripples."""
    out = {}
    for t, v in track:
        out[round(min(length, max(0.0, t + delay)), 4)] = v
    return sorted(out.items())


# Finger ripple: the little finger leads, the middle finger trails (seconds).
RIPPLE = {"little": -0.035, "ring": 0.0, "middle": 0.035, "thumb": 0.05}


def clip(name, length, r_pos=(), r_rot=(), l_pos=(), l_rot=(), r_elbow=(), l_elbow=(), knife=(), grip=(), thumb=None,
         l_curl=(), l_open=(), view=(), cues=(), loop=False):
    act = bpy.data.actions.new(name)
    for o in controls.values():
        o.animation_data_create()
        o.animation_data.action = act

    def key_pos(obj, track, default):
        o = controls[obj]
        for t, v in full(track, default, length, loop):
            o.location = B(v)
            o.keyframe_insert("location", frame=1 + t * FPS)

    def key_rot(obj, track):
        o = controls[obj]
        prev = None
        for t, v in full(track, (0, 0, 0), length, loop):
            q = q_game(*v)
            if prev is not None and prev.dot(q) < 0:
                q.negate()  # stay in one hemisphere so the keys interpolate the short way
            prev = q.copy()
            o.rotation_quaternion = q
            o.keyframe_insert("rotation_quaternion", frame=1 + t * FPS)

    key_pos("KR_Hand", r_pos, (0, 0, 0))
    key_rot("KR_Hand", r_rot)
    key_pos("KR_HandL", l_pos, (0, 0, 0))
    key_rot("KR_HandL", l_rot)
    key_pos("KR_Elbow", r_elbow, (0, 0, 0))
    key_pos("KR_ElbowL", l_elbow, (0, 0, 0))
    key_pos("KR_View", view, (0, 0, 0))
    key_rot("KR_View", ())
    k = controls["KR_Knife"]
    for t, a in full(knife, 0.0, length, loop):
        k.rotation_euler = (a, 0, 0)  # game +x is Blender +x
        k.keyframe_insert("rotation_euler", frame=1 + t * FPS)
    # Right fingers: one authored grip curve, rippled finger by finger.
    g = full(grip, 1.0, length, loop)
    per = {f: dict(shifted(g, RIPPLE[f], length)) for f in ("middle", "ring", "little")}
    times = sorted(set().union(*[set(d) for d in per.values()]))

    def at(d, t):
        ks = sorted(d.items())
        if t <= ks[0][0]:
            return ks[0][1]
        for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
            if t0 <= t <= t1:
                u = (t - t0) / (t1 - t0) if t1 > t0 else 1
                u = u * u * (3 - 2 * u)
                return v0 + (v1 - v0) * u
        return ks[-1][1]

    f = controls["KR_Fingers"]
    for t in times:
        f.location = B((at(per["middle"], t), at(per["ring"], t), at(per["little"], t)))
        f.keyframe_insert("location", frame=1 + t * FPS)
    th = controls["KR_Thumb"]
    tk = full(thumb, 1.0, length, loop) if thumb is not None else shifted(g, RIPPLE["thumb"], length)
    for t, v in tk:
        th.location = B((v, 0, 0))
        th.keyframe_insert("location", frame=1 + t * FPS)
    fl = controls["KR_FingersL"]
    curl = dict(full(l_curl, 0.0, length, loop))
    opened = dict(full(l_open, 0.0, length, loop))
    for t in sorted(set(curl) | set(opened)):
        fl.location = B((at(curl, t), at(opened, t), 0))
        fl.keyframe_insert("location", frame=1 + t * FPS)
    fcurves = ([fc for layer in act.layers for strip in layer.strips for bag in strip.channelbags
                for fc in bag.fcurves] if hasattr(act, "layers") else list(act.fcurves))
    ease(fcurves)
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


exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "karambit_clips.py")).read(),
             "karambit_clips.py", "exec"))

# Static rest of the control rig (what a viewer of the .blend sees).
for name, o in controls.items():
    o.location = B(REST.get(name, (0, 0, 0)))
    if o.rotation_mode == "QUATERNION":
        o.rotation_quaternion = (1, 0, 0, 0)
    else:
        o.rotation_euler = (0, 0, 0)
sc.frame_start, sc.frame_end = 1, int(1 + max(c["length"] for c in CLIPS.values()) * FPS)
sc["cues"] = json.dumps({k: v["cues"] for k, v in CLIPS.items()})
sc["clips"] = json.dumps({k: {"length": v["length"], "loop": v["loop"]} for k, v in CLIPS.items()})
print("CLIPS", ", ".join(f"{k} {v['length']}s" for k, v in CLIPS.items()))
if SAVE:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND_IN))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_yup=True, export_extras=True,
                          export_animation_mode="ACTIONS", export_force_sampling=True,
                          export_optimize_animation_size=False, export_image_format="AUTO",
                          export_materials="EXPORT", use_active_scene=True)
print("exported", OUT)
