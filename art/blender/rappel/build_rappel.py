"""Build the rappel animation in Blender (owner, 2026-11-15: "use blend to build the animation").

A control rig is built on the police character's own joints, with IK on the arms and legs. The
clips are keyed on it in a small scene (a wall, a roof's edge, the rope): over the edge, braced
on the wall, the wall jump, the climb back up, the landing. The body's point moves through each
clip exactly as the game's server moves it (src/lib/fps/br/rappel.ts: the same numbers are
copied below), so a boot planted on the wall stays where it is while the body goes past.

Written out:
  - public/fps/locomotion/rappel-v1.json: per clip and frame, each bone's rotation and the
    hips' place in the character's root space (as the other clips there), which boots are on
    the wall and which hands hold the rope. src/lib/fps/rappel-clip.ts plays it on both
    characters.
  - a .blend with the police character animated (every clip on one timeline, a marker each).
  - optional preview pictures (--preview <dir>): Cycles stills of chosen frames.

  python art/blender/rappel/build_rappel.py -- public/fps/models/police-swat.glb \\
      public/fps/locomotion/rappel-v1.json [--blend out.blend] [--preview dir] [--only clip]

Blender 4.2+ (or the bpy module). Frames: Blender's (x right of the character… the character
faces −y, z up). The wall is the plane y = 0, the building behind it (y < 0), its roof at
z = TOP; the game's root space is (x, z, −y) of the root empty's.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
SRC, OUT = argv[0], argv[1]
opt = lambda name: argv[argv.index(name) + 1] if name in argv else None
BLEND, PREVIEW, ONLY = opt("--blend"), opt("--preview"), opt("--only")
FPS = 30

# ---------------------------------------------------------------- the game's numbers (rappel.ts)
STAND_OFF = 0.8
HIP = 0.95
S_TOP = 0.95
LAND_HANG = 1.25
LAND_OFF = 0.6
ON_MS, LAND_MS = 1700, 650
HOP = {"crouch": 130, "air": 600, "absorb": 170}
HOP_MS = sum(HOP.values())
DROP, OUT_SWING = 2.7, 0.95
ASCEND = 1.1
TOP = 12.0


def ease(t):
    c = max(0.0, min(1.0, t))
    return c * c * (3 - 2 * c)


def hop_at(ms, drop=DROP, out=OUT_SWING):
    """rappel.ts hopAt: (down, out) of the body's point `ms` into a hop."""
    c, a, b = HOP["crouch"], HOP["air"], HOP["absorb"]
    if ms < c:
        k = ms / c
        return 0.06 * ease(k), -0.14 * ease(k)
    if ms < c + a:
        k = (ms - c) / a
        down = 0.06 + (drop - 0.12) * ease(k**1.2)
        swing = math.sin(math.pi * k * (1.25 - 0.25 * k))
        return down, -0.14 * (1 - ease(k * 5)) + out * swing - 0.16 * ease((k - 0.8) / 0.2)
    k = min(1.0, (ms - c - a) / b)
    return drop - 0.06 * (1 - ease(k)), -0.16 * (1 - ease(k))


def over_edge(k, stood_y=-0.75):
    """rappel.ts overEdge with no parapet: the body's point (y out from the wall, z)."""
    walk, over = ease(k / 0.34), ease((k - 0.34) / 0.66)
    y = stood_y + (-0.3 - stood_y) * walk
    y = y + (STAND_OFF - y) * over
    down = ease((k - 0.52) / 0.48)
    return y, TOP + (TOP - HIP - S_TOP - TOP) * down


# ---------------------------------------------------------------- the character and its joints
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.parent is None:
        bpy.data.objects.remove(o)  # the importer's bone-shape sphere
game = next(o for o in bpy.data.objects if o.type == "ARMATURE")
scene = bpy.context.scene
scene.render.fps = FPS

SIDES = ("Left", "Right")
CHILD = {"Hips": "Spine", "Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head", "Head": "HeadTop_End"}
for s in SIDES:
    CHILD.update({s + "Shoulder": s + "Arm", s + "Arm": s + "ForeArm", s + "ForeArm": s + "Hand", s + "Hand": s + "HandMiddle1",
                  s + "UpLeg": s + "Leg", s + "Leg": s + "Foot", s + "Foot": s + "ToeBase"})
# Driven bones, parents first (the order of the clip's tracks).
BONES = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"] + [
    s + b for s in SIDES for b in ("Shoulder", "Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot")]
PARENT = {"Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck"}
for s in SIDES:
    PARENT.update({s + "Shoulder": "Spine2", s + "Arm": s + "Shoulder", s + "ForeArm": s + "Arm", s + "Hand": s + "ForeArm",
                   s + "UpLeg": "Hips", s + "Leg": s + "UpLeg", s + "Foot": s + "Leg"})

GW = game.matrix_world
J = {b.name: (GW @ b.head_local).copy() for b in game.data.bones}
UNIT = J["Hips"].z
ANKLE = J["LeftFoot"].z  # the ankle over the sole
ARM = (J["LeftForeArm"] - J["LeftArm"]).length + (J["LeftHand"] - J["LeftForeArm"]).length
LEG = (J["LeftLeg"] - J["LeftUpLeg"]).length + (J["LeftFoot"] - J["LeftLeg"]).length

# ---------------------------------------------------------------- the control rig
arm_data = bpy.data.armatures.new("rappel-ctrl")
ctrl = bpy.data.objects.new("rappel-ctrl", arm_data)
scene.collection.objects.link(ctrl)
bpy.context.view_layer.objects.active = ctrl
bpy.ops.object.mode_set(mode="EDIT")
# The character's arms are dead straight at rest (a T-pose), and a straight chain gives the IK
# solver nothing to bend: the control rig's elbows sit a little behind the line (the way an
# elbow goes), and STRAIGHT below takes that out again when the clip is sampled.
ELBOW_BACK = Vector((0, 0.03, 0))
CJ = dict(J)
for s in SIDES:
    CJ[s + "ForeArm"] = J[s + "ForeArm"] + ELBOW_BACK
for name in BONES:
    eb = arm_data.edit_bones.new(name)
    eb.head = CJ[name]
    eb.tail = CJ[CHILD[name]]
    # Bend axes: the limbs' x axes are the body's side-to-side axis (knees and elbows hinge on it).
    eb.align_roll(Vector((0, -1, 0)) if name.endswith(("Arm", "ForeArm", "Hand", "Shoulder")) else Vector((0, -1, 0)))
    if name in PARENT:
        eb.parent = arm_data.edit_bones[PARENT[name]]
bpy.ops.object.mode_set(mode="OBJECT")
REST = {n: (ctrl.matrix_world @ ctrl.data.bones[n].matrix_local).copy() for n in BONES}
REST_Q = {n: REST[n].to_quaternion() for n in BONES}
# Each control bone's rest as it would be along the character's own bone (the arms: see above).
STRAIGHT = {
    n: (CJ[CHILD[n]] - CJ[n]).normalized().rotation_difference((J[CHILD[n]] - J[n]).normalized()) @ REST_Q[n] for n in BONES
}


def empty(name, size=0.06, kind="PLAIN_AXES"):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type, e.empty_display_size = kind, size
    e.rotation_mode = "QUATERNION"
    scene.collection.objects.link(e)
    return e


root = empty("root", 0.25, "ARROWS")
C_hips = empty("C_hips", 0.12, "CUBE")
T = {}
for s in SIDES:
    T["hand" + s] = empty("T_hand_" + s, 0.05, "SPHERE")
    T["foot" + s] = empty("T_foot_" + s, 0.07, "CUBE")
    T["elbow" + s] = empty("P_elbow_" + s, 0.04)
    T["knee" + s] = empty("P_knee_" + s, 0.04)
    T["hand" + s]["grip"] = 0.0
    T["foot" + s]["plant"] = 0.0
E_head = empty("E_head", 0.1, "CONE")

bpy.context.view_layer.objects.active = ctrl
bpy.ops.object.mode_set(mode="POSE")
for pb in ctrl.pose.bones:
    pb.rotation_mode = "QUATERNION"


def signed_angle(u, v, normal):
    angle = u.angle(v)
    return -angle if u.cross(v).angle(normal) < 1 else angle


def pole_angle(base, tip, pole):
    """The IK constraint's pole angle for a chain base → tip, at rest (the usual construction)."""
    normal = (tip.tail - base.head).cross(pole - base.head)
    projected = normal.cross(base.tail - base.head)
    return signed_angle(base.x_axis, projected, base.tail - base.head)


def copy_world(pb, target, loc=False):
    if loc:
        c = pb.constraints.new("COPY_LOCATION")
        c.target = target
    c = pb.constraints.new("COPY_ROTATION")
    c.target = target


copy_world(ctrl.pose.bones["Hips"], C_hips, loc=True)
copy_world(ctrl.pose.bones["Head"], E_head)
REST_POLE = {}
POLED = []
for s in SIDES:
    side = 1 if s == "Left" else -1
    for limb, mid, end, pole_at in (
        ("hand", "ForeArm", "Hand", J[s + "ForeArm"] + Vector((0, 0.5, -0.2))),
        ("foot", "Leg", "Foot", J[s + "Leg"] + Vector((side * 0.1, -0.6, 0))),
    ):
        base = ctrl.pose.bones[s + ("Arm" if limb == "hand" else "UpLeg")]
        pb = ctrl.pose.bones[s + mid]
        c = pb.constraints.new("IK")
        c.target = T[limb + s]
        c.pole_target = T[("elbow" if limb == "hand" else "knee") + s]
        c.chain_count = 2
        c.use_stretch = False
        c.pole_angle = pole_angle(base.bone, pb.bone, pole_at)
        POLED.append((s, limb, c))
        REST_POLE[limb + s] = pole_at
        copy_world(ctrl.pose.bones[s + end], T[limb + s])
bpy.ops.object.mode_set(mode="OBJECT")


def settle_poles():
    """Each elbow and knee on its pole's side of the limb: the angle above is the usual
    construction, and it does not hold for every roll a chain can have, so it is measured on a
    bent test pose instead of trusted."""
    C_hips.location, C_hips.rotation_quaternion = J["Hips"], REST_Q["Hips"]  # the body at rest
    wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
    for s, limb, c in POLED:
        tgt, pole = T[limb + s], T[("elbow" if limb == "hand" else "knee") + s]
        a, m, e = (s + n for n in (("Arm", "ForeArm", "Hand") if limb == "hand" else ("UpLeg", "Leg", "Foot")))
        tgt.location = J[a].lerp(J[e], 0.7) + (Vector((0, -0.1, -0.1)) if limb == "hand" else Vector((0, 0, 0)))
        pole.location = REST_POLE[limb + s]

        def side_of():
            bpy.context.view_layer.update()
            ce = ctrl.evaluated_get(bpy.context.evaluated_depsgraph_get())
            at = lambda n: (ce.matrix_world @ ce.pose.bones[n].matrix).translation
            mid = at(a).lerp(at(e), 0.5)
            return (at(m) - mid).normalized().dot((pole.location - mid).normalized())

        # The angle that puts the joint most squarely at its pole (a sweep, then a finer one).
        best = (-2, c.pole_angle)
        for span, steps in ((math.pi, 24), (math.pi / 12, 20)):
            centre = best[1]
            for i in range(-steps, steps + 1):
                c.pole_angle = wrap(centre + span * i / steps)
                best = max(best, (side_of(), c.pole_angle))
        c.pole_angle = best[1]
        assert best[0] > 0.9, (s, limb, best)
        tgt.location = (0, 0, 0)
        pole.location = (0, 0, 0)
    C_hips.location, C_hips.rotation_quaternion = (0, 0, 0), (1, 0, 0, 0)


settle_poles()

# ---------------------------------------------------------------- keying
RX = lambda deg: Quaternion((1, 0, 0), math.radians(deg))
RY = lambda deg: Quaternion((0, 1, 0), math.radians(deg))
RZ = lambda deg: Quaternion((0, 0, 1), math.radians(deg))


def key_obj(o, frame, loc=None, rot=None, props=None):
    if loc is not None:
        o.location = loc
        o.keyframe_insert("location", frame=frame)
    if rot is not None:
        o.rotation_quaternion = rot
        o.keyframe_insert("rotation_quaternion", frame=frame)
    for k, v in (props or {}).items():
        o[k] = float(v)
        o.keyframe_insert(f'["{k}"]', frame=frame)


def key_bone(name, frame, add):
    """An extra turn of a bone on top of its parent's, given in the body's own axes at rest."""
    pb = ctrl.pose.bones[name]
    pb.rotation_quaternion = REST_Q[name].inverted() @ add @ REST_Q[name]
    pb.keyframe_insert("rotation_quaternion", frame=frame)


# The hands on the rope, braced: the guide hand on it in front of the chest, the brake hand
# holding its tail at the hip (from the body's point).
HAND_L = (0.03, -0.14, 1.23)
HAND_R = (-0.27, 0.0, 0.95)


class Pose:
    """One key pose, in the body's point's frame (y out from the wall is +, the wall at y = 0
    in the world): everything a key holds. Lengths in metres on the police character."""

    def __init__(self, **kw):
        # The pelvis: offset from its place over the body's point, lean back (deg), turn, roll.
        self.hips = kw.get("hips", (0, 0, 0))
        self.lean = kw.get("lean", 26)
        self.turn = kw.get("turn", 0)
        self.roll = kw.get("roll", 0)
        # The spine's further lean back, turn and roll, shared out over its three bones.
        self.spine = kw.get("spine", (16, 0, 0))
        # The head, on top of the chest: nod forward (deg), turn, tilt.
        self.head = kw.get("head", (30, 0, 0))
        self.shoulders = kw.get("shoulders", (0, 0))  # each shoulder's shrug (deg)
        # Hands: the wrist's place from the body's point (x, y, z), and how firmly on the rope.
        self.hand = {"Left": kw.get("handL", HAND_L), "Right": kw.get("handR", HAND_R)}
        self.grip = {"Left": kw.get("gripL", 1), "Right": kw.get("gripR", 1)}
        self.elbow = {"Left": kw.get("elbowL", (0.55, 0.15, 0.85)), "Right": kw.get("elbowR", (-0.75, 0.55, 1.1))}
        # Feet: the ankle's place in the WORLD when given as ("w", x, y, z), else from the body's
        # point; the boot's pitch (deg: 90 = sole flat on the wall, toes up) and toes turned out.
        self.foot = {"Left": kw.get("footL"), "Right": kw.get("footR")}
        self.plant = {"Left": kw.get("plantL", 1), "Right": kw.get("plantR", 1)}
        self.boot = {"Left": kw.get("bootL", (90, 12)), "Right": kw.get("bootR", (90, 12))}
        self.knee = {"Left": kw.get("kneeL", (0.45, -0.35, 1.75)), "Right": kw.get("kneeR", (-0.45, -0.35, 1.75))}


def put(frame, at, yaw, p: Pose):
    """Key a pose with the body's point at world `at` (y, z), the body turned `yaw` (deg) from
    facing the wall."""
    turn = RZ(yaw)
    origin = Vector((0, at[0], at[1]))
    world = lambda v: origin + turn @ Vector(v)
    key_obj(root, frame, loc=origin, rot=turn)
    pelvis = turn @ RZ(p.turn) @ RX(p.lean) @ RY(p.roll)
    key_obj(C_hips, frame, loc=world((p.hips[0], p.hips[1], HIP + p.hips[2])), rot=pelvis @ REST_Q["Hips"])
    for name in ("Spine", "Spine1", "Spine2"):
        key_bone(name, frame, RZ(p.spine[1] / 3) @ RX(p.spine[0] / 3) @ RY(p.spine[2] / 3))
    key_bone("Neck", frame, RX(-p.head[0] * 0.35) @ RZ(p.head[1] * 0.4))
    chest = pelvis @ RZ(p.spine[1]) @ RX(p.spine[0]) @ RY(p.spine[2])
    key_obj(E_head, frame, rot=chest @ RZ(p.head[1]) @ RX(-p.head[0]) @ RY(p.head[2]) @ REST_Q["Head"])
    for s in SIDES:
        side = 1 if s == "Left" else -1
        key_bone(s + "Shoulder", frame, RY(-side * p.shoulders[0 if s == "Left" else 1]))
        # The hand lies along the forearm, the palm turned in to the rope.
        hand = world(p.hand[s])
        fore = (hand - world((side * 0.19, 0.3, 1.36))).normalized()
        rest_dir = (J[s + "HandMiddle1"] - J[s + "Hand"]).normalized()
        hq = rest_dir.rotation_difference(fore)
        key_obj(T["hand" + s], frame, loc=hand, rot=hq @ REST_Q[s + "Hand"], props={"grip": p.grip[s]})
        key_obj(T["elbow" + s], frame, loc=world(p.elbow[s]))
        f = p.foot[s]
        ankle = Vector(f[1:]) if f[0] == "w" else world(f)
        pitch, toe = p.boot[s]
        boot = turn @ RY(side * toe * (pitch / 90)) @ RZ(side * toe * (1 - pitch / 90)) @ RX(-pitch)
        key_obj(T["foot" + s], frame, loc=ankle, rot=boot @ REST_Q[s + "Foot"], props={"plant": p.plant[s]})
        key_obj(T["knee" + s], frame, loc=world(p.knee[s]))


# Braced on the wall: the stance every clip on the wall starts from and comes back to.
FOOT_Z = HIP - 0.14  # the ankles' height over the body's point
FOOT_X = 0.21
on_wall = lambda side, z: ("w", side * FOOT_X, ANKLE, z)


def braced(root_z, **kw):
    base = dict(footL=on_wall(1, root_z + FOOT_Z), footR=on_wall(-1, root_z + FOOT_Z))
    base.update(kw)
    return Pose(**base)


CLIPS = {}  # name → (first frame, frames, loop)
cursor = [1]


def clip(name, frames, loop=False):
    start = cursor[0]
    CLIPS[name] = (start, frames, loop)
    m = scene.timeline_markers.new(name, frame=start)
    cursor[0] = start + frames + (0 if loop else 1) + 8
    return start


# ---- idle: braced, breathing, a look down the wall and back up it (2 s loop)
f0 = clip("idle", 60, loop=True)
Z = TOP - HIP - 4.0
for f, (breath, look, nod) in {0: (0, 0, 30), 15: (1, -14, 38), 30: (0, -6, 26), 45: (1, 16, 34), 60: (0, 0, 30)}.items():
    put(f0 + f, (STAND_OFF, Z), 0, braced(Z, hips=(0, 0.012 * breath, 0.006 * breath), spine=(16 + 1.5 * breath, look * 0.3, 0), head=(nod, look, 0)))


# ---- the wall jump: the knees bend, off the wall and down on the rope, back onto it
def hop_clip(name, lead, twist):
    """`lead`: which boot comes back to the wall first (1 left, −1 right); `twist`: how far the
    body turns in the air (deg), to look where it is going."""
    f0 = clip(name, 27)
    Z0 = TOP - HIP - 4.0
    at = lambda f: (lambda d, o: (STAND_OFF + o, Z0 - d))(*hop_at(f * 1000 / FPS))
    w0, w1 = Z0 + FOOT_Z, Z0 - DROP + FOOT_Z
    start = dict(footL=on_wall(1, w0), footR=on_wall(-1, w0))
    end = dict(footL=on_wall(1, w1), footR=on_wall(-1, w1))
    air = lambda y, z, spread=0.19: dict(footL=(spread, y, z), footR=(-spread, y, z), plantL=0, plantR=0)
    keys = {
        0: Pose(**start),
        # The knees bend, the hips come in to the wall, the chest over them.
        2: Pose(**start, lean=24, spine=(13, 0, 0), head=(36, 0, 0)),
        4: Pose(**start, lean=19, spine=(8, 0, 0), head=(42, 0, 0), kneeL=(0.55, -0.3, 1.9), kneeR=(-0.55, -0.3, 1.9),
                handR=(-0.27, 0.02, 0.97)),
        # Pushed straight: the last of the boots on the wall, heels off it.
        5: Pose(**start, lean=24, spine=(13, 0, 0), bootL=(72, 8), bootR=(72, 8), handR=(-0.3, 0.04, 0.92)),
        # Off: the legs trail to the wall, the brake hand lets the rope run.
        6: Pose(**air(-0.66, 0.6, 0.18), lean=25, spine=(13, twist * 0.3, 0), bootL=(60, 6), bootR=(60, 6),
                handR=(-0.34, 0.08, 0.86), head=(38, twist * 0.5, 0)),
        10: Pose(**air(-0.5, 0.42), lean=16, turn=twist * 0.5, spine=(12, twist * 0.5, 0), bootL=(35, 8), bootR=(30, 8),
                 handL=(0.03, -0.15, 1.3), handR=(-0.36, 0.1, 0.8), head=(44, twist, 0), shoulders=(4, 2),
                 kneeL=(0.4, -0.9, 1.2), kneeR=(-0.4, -0.9, 1.2)),
        13: Pose(**air(-0.42, 0.34, 0.2), lean=13, turn=twist * 0.6, spine=(12, twist * 0.5, 0), bootL=(28, 8), bootR=(34, 8),
                 handL=(0.03, -0.15, 1.31), handR=(-0.37, 0.11, 0.78), head=(46, twist, 0), shoulders=(5, 3),
                 kneeL=(0.4, -0.9, 1.1), kneeR=(-0.4, -0.9, 1.1)),
        # The wall coming back: the legs swing up and forward to meet it.
        16: Pose(**air(-0.6, 0.54, 0.21), lean=18, turn=twist * 0.3, spine=(13, twist * 0.2, 0), bootL=(55, 10), bootR=(55, 10),
                 handL=(0.03, -0.14, 1.27), handR=(-0.36, 0.1, 0.8), head=(40, twist * 0.4, 0),
                 kneeL=(0.45, -0.6, 1.5), kneeR=(-0.45, -0.6, 1.5)),
        19: Pose(**air(-0.74, 0.7, 0.21), lean=23, spine=(14, 0, 0), bootL=(78, 12), bootR=(78, 12),
                 handR=(-0.3, 0.04, 0.9), head=(34, 0, 0)),
        # On it: the boots take the wall, the knees give.
        21: Pose(**end, lean=24, spine=(13, 0, 0), head=(34, 0, 0)),
        23: Pose(**end, lean=18, spine=(7, 0, 0), head=(42, 0, 0), kneeL=(0.55, -0.3, 1.9), kneeR=(-0.55, -0.3, 1.9),
                 handR=(-0.26, 0.0, 0.98)),
        25: Pose(**end, lean=23, spine=(12, 0, 0), head=(34, 0, 0)),
        27: Pose(**end),
    }
    # One boot back on the wall a frame before the other.
    late = "R" if lead > 0 else "L"
    early = keys[19]
    first = on_wall(1 if lead > 0 else -1, w1)
    early.foot["Left" if lead > 0 else "Right"] = (first[0], first[1], first[2] + 0.1, first[3])
    early.boot["Left" if lead > 0 else "Right"] = (86, 12)
    for f, p in keys.items():
        put(f0 + f, at(f), 0, p)
    # (The body's point every frame, as the server moves it: not eased between the keys above.)
    for f in range(28):
        y, z = at(f)
        key_obj(root, f0 + f, loc=Vector((0, y, z)))
    return late


hop_clip("hop", 1, 7)
hop_clip("hop2", -1, -9)

# ---- the climb: walking up the wall on the rope, hand over hand (0.9 m a cycle; a loop)
CLIMB = 0.9
f0 = clip("climb", 24, loop=True)
Zc = TOP - HIP - 6.0
HIGH, LOW = 0.33, -0.12


def climb_foot(f, phase):
    """A boot's key at frame f: planted for 14 frames (the body rising past it), 10 to step up."""
    g = (f - phase) % 24
    cycle = (f - phase) // 24
    base = Zc + FOOT_Z + HIGH + cycle * CLIMB + (phase / 24) * CLIMB
    if g <= 14:
        return ("w", 0, ANKLE, base), 1, (90, 12)
    k = (g - 14) / 10
    return ("w", 0, ANKLE + 0.14 * math.sin(math.pi * k), base + CLIMB * ease(k)), 0, (90 - 28 * math.sin(math.pi * k), 12)


for f in range(0, 25, 2):
    z = Zc + CLIMB * f / 24
    a = 2 * math.pi * f / 24
    (wl, pl, bl), (wr, pr, br) = climb_foot(f, 0), climb_foot(f, 12)
    # A hand reaches up the rope while the other foot steps, grips, and pulls down past the chest.
    reach = lambda g: (1.14 + 0.3 * (ease(((g % 24) - 2) / 9) if (g % 24) < 12 else 1 - ease(((g % 24) - 13) / 11)))
    grip = lambda g: 0.25 if 2 <= (g % 24) <= 10 else 1
    put(f0 + f, (STAND_OFF, z), 0, Pose(
        footL=("w", FOOT_X, wl[2], wl[3]), plantL=pl, bootL=bl,
        footR=("w", -FOOT_X, wr[2], wr[3]), plantR=pr, bootR=br,
        lean=25 + 2 * math.cos(2 * a), turn=5 * math.sin(a), roll=3 * math.sin(a),
        spine=(15, -8 * math.sin(a), -3 * math.sin(a)), head=(18, 4 * math.sin(a), 0),
        handL=(0.05, -0.17, reach(f)), gripL=grip(f), handR=(-0.05, -0.15, reach(f + 12) - 0.04), gripR=grip(f + 12),
        elbowR=(-0.6, 0.2, 0.85), shoulders=(6 * max(0, math.sin(a)), 6 * max(0, -math.sin(a))),
    ))

# ---- over the edge: turn to the roof, take the rope, sit back on it and walk down the first of the wall
f0 = clip("on", 51)
REST_FOOT = lambda side, lift=0.0: (side * 0.097, -0.014, ANKLE + lift)
STAND = dict(hips=(0, 0, UNIT - HIP), lean=0, spine=(0, 0, 0), head=(0, 0, 0), handL=(0.27, 0.03, 0.93), handR=(-0.27, 0.03, 0.93),
             gripL=0, gripR=0, elbowL=(0.5, 0.8, 1.1), elbowR=(-0.5, 0.8, 1.1), footL=REST_FOOT(1), footR=REST_FOOT(-1),
             plantL=0, plantR=0, bootL=(0, 8), bootR=(0, 8), kneeL=(0.12, -1, 0.6), kneeR=(-0.12, -1, 0.6))
LIP = lambda side, y=-0.08, z=0.0: ("w", side * 0.14, y, TOP + ANKLE + z)
Zb = TOP - HIP - S_TOP
ON = {
    0: (STAND, {}),
    # Turning to the roof, a step to the edge with each foot, the hands coming to the rope.
    6: (STAND, dict(hips=(0, 0, -0.03), lean=3, head=(18, 0, 0), handL=(0.2, -0.22, 1.02), handR=(-0.22, -0.16, 0.95),
                    footL=REST_FOOT(1, 0.07), elbowL=(0.6, 0.4, 0.9), elbowR=(-0.6, 0.5, 0.9))),
    12: (STAND, dict(hips=(0, 0.04, -0.08), lean=6, spine=(5, 0, 0), head=(24, 0, 0), handL=(0.04, -0.3, 1.14), gripL=0.7,
                     handR=(-0.12, -0.24, 0.98), gripR=0.7, footR=REST_FOOT(-1, 0.07), elbowL=(0.55, 0.2, 0.85), elbowR=(-0.6, 0.4, 0.9))),
    # At the edge, heels on it, the rope taken up.
    17: (STAND, dict(hips=(0, 0.14, -0.06), lean=8, spine=(5, 0, 0), head=(20, 0, 0), handL=(0.03, -0.24, 1.2), gripL=1,
                     handR=(-0.26, 0.05, 0.95), gripR=1, footL=LIP(1), footR=LIP(-1), elbowL=(0.55, 0.15, 0.85), elbowR=(-0.75, 0.55, 1.1))),
    # Sitting back on the rope, over the drop.
    22: ({}, dict(hips=(0, 0.26, -0.12), lean=24, spine=(8, 0, 0), head=(26, 0, 0), handL=(0.03, -0.1, 1.2), footL=LIP(1), footR=LIP(-1),
                  plantL=0, plantR=0, bootL=(8, 8), bootR=(8, 8), kneeL=(0.3, -0.8, 1.5), kneeR=(-0.3, -0.8, 1.5))),
    27: ({}, dict(hips=(0, 0.3, -0.2), lean=40, spine=(10, 0, 0), head=(30, 12, 0), handL=(0.03, -0.02, 1.16), footL=LIP(1), footR=LIP(-1),
                  plantL=0, plantR=0, bootL=(28, 8), bootR=(28, 8), kneeL=(0.35, -0.5, 1.8), kneeR=(-0.35, -0.5, 1.8))),
    # The first boot down onto the wall.
    31: ({}, dict(hips=(0, 0.22, -0.12), lean=50, spine=(6, 0, 0), head=(34, 16, 0), handL=(0.03, -0.06, 1.2), footL=LIP(1, -0.05, -0.01),
                  footR=("w", -0.2, 0.2, TOP - 0.12), plantL=0, plantR=0, bootL=(50, 8), bootR=(70, 10))),
    34: ({}, dict(hips=(0, 0.12, -0.06), lean=48, spine=(8, 0, 0), head=(36, 10, 0), footL=LIP(1, -0.03, -0.025),
                  footR=on_wall(-1, TOP - 0.35), plantL=0, plantR=1, bootL=(70, 8))),
    38: ({}, dict(hips=(0, 0.06, -0.03), lean=44, spine=(10, 0, 0), head=(36, 0, 0), footL=("w", 0.2, 0.22, TOP - 0.42),
                  footR=on_wall(-1, TOP - 0.35), plantL=0, plantR=1, bootL=(72, 10))),
    41: ({}, dict(lean=40, spine=(12, 0, 0), head=(34, 0, 0), footL=on_wall(1, TOP - 0.78), footR=on_wall(-1, TOP - 0.35))),
    45: ({}, dict(lean=34, spine=(14, 0, 0), head=(32, 0, 0), footL=on_wall(1, TOP - 0.78), footR=("w", -FOOT_X, 0.24, Zb + FOOT_Z + 0.42),
                  plantR=0, bootR=(70, 10))),
    47: ({}, dict(lean=31, spine=(15, 0, 0), head=(30, 0, 0), footL=on_wall(1, TOP - 0.78), footR=on_wall(-1, Zb + FOOT_Z))),
    49: ({}, dict(lean=28, footL=("w", FOOT_X, 0.22, Zb + FOOT_Z + 0.16), footR=on_wall(-1, Zb + FOOT_Z), plantL=0, bootL=(72, 10))),
    51: ({}, dict(footL=on_wall(1, Zb + FOOT_Z), footR=on_wall(-1, Zb + FOOT_Z))),
}
for f, (base, extra) in ON.items():
    k = f / 51
    put(f0 + f, over_edge(k), 180 * (1 - ease(k / 0.34)), Pose(**{**base, **extra}))
# (The body's point every frame, as the server moves it: not eased between the keys above.)
for f in range(52):
    k = f / 51
    y, z = over_edge(k)
    key_obj(root, f0 + f, loc=Vector((0, y, z)), rot=RZ(180 * (1 - ease(k / 0.34))))

# ---- the landing: off the wall, the feet down under the hips, the knees taking the floor
f0 = clip("land", 20)
FLOOR = 0.0
Zl = FLOOR + LAND_HANG - HIP
FLOORED = lambda side: ("w", side * 0.1, LAND_OFF - 0.014, FLOOR + ANKLE)
LAND = {
    0: braced(Zl),
    3: Pose(footL=(0.17, -0.55, 0.55), footR=(-0.17, -0.55, 0.55), plantL=0, plantR=0, bootL=(60, 8), bootR=(60, 8), lean=22),
    8: Pose(footL=(0.13, -0.2, 0.27), footR=(-0.13, -0.16, 0.24), plantL=0, plantR=0, bootL=(22, 8), bootR=(18, 8), lean=12,
            spine=(8, 0, 0), head=(34, 0, 0), kneeL=(0.2, -1, 0.9), kneeR=(-0.2, -1, 0.9)),
    12: Pose(footL=FLOORED(1), footR=FLOORED(-1), plantL=0, plantR=0, bootL=(0, 8), bootR=(0, 8), hips=(0, 0, -0.16), lean=6,
             spine=(6, 0, 0), head=(24, 0, 0), kneeL=(0.15, -1, 0.6), kneeR=(-0.15, -1, 0.6), handR=(-0.27, 0.0, 0.9)),
    15: Pose(footL=FLOORED(1), footR=FLOORED(-1), plantL=0, plantR=0, bootL=(0, 8), bootR=(0, 8), hips=(0, 0.04, -0.3), lean=-8,
             spine=(10, 0, 0), head=(10, 0, 0), kneeL=(0.18, -1, 0.5), kneeR=(-0.18, -1, 0.5), handL=(0.2, -0.2, 0.95), gripL=0.2,
             handR=(-0.27, 0.0, 0.8), gripR=0.2, elbowL=(0.6, 0.4, 0.9)),
    18: Pose(**{**STAND, "footL": FLOORED(1), "footR": FLOORED(-1), "hips": (0, 0.01, -0.12), "lean": -3, "spine": (4, 0, 0),
                "handL": (0.26, -0.04, 0.9), "handR": (-0.27, 0.02, 0.86)}),
    20: Pose(**{**STAND, "footL": FLOORED(1), "footR": FLOORED(-1)}),
}
for f, p in LAND.items():
    k = f / 20
    put(f0 + f, (STAND_OFF + (LAND_OFF - STAND_OFF) * ease(k), Zl + (FLOOR - Zl) * (k * k * 0.6 + ease(k) * 0.4)), 0, p)
for f in range(21):
    k = f / 20
    key_obj(root, f0 + f, loc=Vector((0, STAND_OFF + (LAND_OFF - STAND_OFF) * ease(k), Zl + (FLOOR - Zl) * (k * k * 0.6 + ease(k) * 0.4))))

FRAMES = cursor[0]
scene.frame_start, scene.frame_end = 1, FRAMES


# ---------------------------------------------------------------- sampling and export
def to_game_v(v):
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]


def to_game_q(q):
    return [round(q.x, 4), round(q.z, 4), round(-q.y, 4), round(q.w, 4)]


def sample(frame):
    """The control rig at a frame: per driven bone its turn from rest in the root's space, the
    hips' place there (hip heights), the boots on the wall, the hands on the rope."""
    scene.frame_set(frame)
    dg = bpy.context.evaluated_depsgraph_get()
    ce = ctrl.evaluated_get(dg)
    rq = root.matrix_world.to_quaternion().inverted()
    rot, world_delta = [], {}
    for name in BONES:
        m = ce.matrix_world @ ce.pose.bones[name].matrix
        d = m.to_quaternion() @ STRAIGHT[name].inverted()
        world_delta[name] = d
        rot.append(rq @ d @ rq.inverted() if False else rq @ d)
    hips_w = (ce.matrix_world @ ce.pose.bones["Hips"].matrix).translation
    hips = root.matrix_world.inverted() @ hips_w
    return {
        "rot": rot,
        "delta": world_delta,
        "hips_w": hips_w.copy(),
        "hips": hips / UNIT,
        "plant": [round(T["foot" + s]["plant"], 3) for s in SIDES],
        "grip": [round(T["hand" + s]["grip"], 3) for s in SIDES],
        "root": root.matrix_world.copy(),
    }


def export():
    out = {
        "version": 1,
        "source": "art/blender/rappel/build_rappel.py (authored in Blender on the police character's joints)",
        "fps": FPS,
        "unit": round(UNIT, 4),
        "bones": BONES,
        "restDir": [to_game_v((J[CHILD[b]] - J[b]).normalized()) for b in BONES],
        "clips": {},
    }
    for name, (start, frames, loop) in CLIPS.items():
        rows = [sample(start + i) for i in range(frames if loop else frames + 1)]
        # Each bone's track on one side of the quaternion sphere, frame to frame.
        prev = None
        flat = []
        for r in rows:
            qs = [q.copy() for q in r["rot"]]
            if prev:
                for i, q in enumerate(qs):
                    if q.dot(prev[i]) < 0:
                        q.negate()
            prev = qs
            flat.append([c for q in qs for c in to_game_q(q)])
        out["clips"][name] = {
            "loop": loop,
            "rot": flat,
            "hips": [to_game_v(r["hips"]) for r in rows],
            "plant": [r["plant"] for r in rows],
            "grip": [r["grip"] for r in rows],
        }
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    return out


# ---------------------------------------------------------------- the character follows (preview, .blend)
GAME_REST = {b.name: (GW @ b.matrix_local).copy() for b in game.data.bones}
ORDER = [b.name for b in game.data.bones]  # parents first


def pose_game(s, frame=None):
    """Put the game's own skeleton in a sampled pose (what the game does with the clip)."""
    posed = {}
    for name in ORDER:
        b = game.data.bones[name]
        pb = game.pose.bones[name]
        pb.rotation_mode = "QUATERNION"
        natural = (posed[b.parent.name] @ GAME_REST[b.parent.name].inverted() @ GAME_REST[name]) if b.parent else GAME_REST[name]
        want = natural.copy()
        if name in s["delta"]:
            rot = (s["delta"][name] @ GAME_REST[name].to_quaternion()).to_matrix().to_4x4()
            pos = s["hips_w"] if name == "Hips" else natural.translation
            want = Matrix.Translation(pos) @ rot
        basis = natural.inverted() @ want
        pb.rotation_quaternion = basis.to_quaternion()
        pb.location = basis.translation
        posed[name] = want
        if frame is not None and name in s["delta"]:
            pb.keyframe_insert("rotation_quaternion", frame=frame)
            if name == "Hips":
                pb.keyframe_insert("location", frame=frame)


# ---------------------------------------------------------------- the set, and pictures of it
def material(name, rgb, rough=0.8):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    return m


def build_set():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -3, TOP / 2))
    wall = bpy.context.object
    wall.name, wall.scale = "building", (14, 6, TOP)
    wall.data.materials.append(material("wall", (0.55, 0.5, 0.42)))
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    bpy.context.object.data.materials.append(material("ground", (0.3, 0.32, 0.28)))
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 3.2
    so = bpy.data.objects.new("sun", sun)
    so.rotation_euler = Euler((math.radians(52), 0, math.radians(-128)))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.72, 0.86, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    scene.world = world


def rope_curve(s):
    """The rope for a picture: over the edge to the guide hand, the device, the brake hand, down."""
    old = bpy.data.objects.get("rope")
    if old:
        bpy.data.objects.remove(old)
    hands = [T["hand" + side].matrix_world.translation.copy() for side in SIDES]
    device = s["hips_w"] + s["root"].to_quaternion() @ Vector((0, -0.17, 0.07))
    pts = [Vector((0, -1.2, TOP + 0.02)), Vector((0, 0, TOP + 0.01)), hands[0], device, hands[1],
           hands[1] + Vector((0.03, -0.25, -1.2)), Vector((0.0, 0.25, 0.02))]
    cu = bpy.data.curves.new("rope", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.011
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (*v, 1)
    o = bpy.data.objects.new("rope", cu)
    o.data.materials.append(bpy.data.materials.get("rope") or material("rope", (0.05, 0.07, 0.05), 0.9))
    scene.collection.objects.link(o)


VIEWS = {
    # name: (where the camera is from the body's point, lens mm)
    "side": ((3.4, 0.5, 0.6), 50),
    "rear": ((0.3, 3.6, 1.0), 50),
    "above": ((0.7, 1.9, 3.4), 42),
    "diag": ((-2.4, 2.6, 0.1), 50),
    "front": ((2.0, -0.4, -1.6), 50),
    "wide": ((5.5, 4.5, 1.5), 28),
}


def render(frame, view, path):
    s = sample(frame)
    pose_game(s)
    rope_curve(s)
    cam = bpy.data.objects.get("cam")
    if not cam:
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
        scene.collection.objects.link(cam)
        scene.camera = cam
    off, lens = VIEWS[view]
    centre = s["root"].translation + Vector((0, -0.25, 0.95))
    cam.location = centre + Vector(off)
    cam.data.lens = lens
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def preview(shots):
    build_set()
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = int(opt("--samples") or 12)
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = 420, 520
    scene.view_settings.view_transform = "Standard"
    for e in [root, C_hips, E_head, *T.values(), ctrl]:
        e.hide_render = True
    os.makedirs(PREVIEW, exist_ok=True)
    for name, frames, views in shots:
        start = CLIPS[name][0]
        for f in frames:
            for v in views:
                render(start + f, v, os.path.join(PREVIEW, f"{name}-{f:03d}-{v}.png"))


def probe(name, f):
    """Where the control rig's arms and legs are at a frame, against what was asked of them."""
    start = CLIPS[name][0]
    scene.frame_set(start + f)
    ce = ctrl.evaluated_get(bpy.context.evaluated_depsgraph_get())
    at = lambda n: (ce.matrix_world @ ce.pose.bones[n].matrix).translation
    tail = lambda n: ce.matrix_world @ ce.pose.bones[n].tail
    r = lambda v: tuple(round(c, 3) for c in v)
    print(f"-- {name} {f}: root {r(root.matrix_world.translation)} hips {r(at('Hips'))} chest {r(at('Spine2'))} head {r(at('Head'))}")
    for s in SIDES:
        print(f"   {s} arm: shoulder {r(at(s + 'Arm'))} elbow {r(at(s + 'ForeArm'))} wrist {r(at(s + 'Hand'))} target {r(T['hand' + s].matrix_world.translation)}"
              f" miss {round((at(s + 'Hand') - T['hand' + s].matrix_world.translation).length, 3)} pole {r(T['elbow' + s].matrix_world.translation)}")
        print(f"   {s} leg: hip {r(at(s + 'UpLeg'))} knee {r(at(s + 'Leg'))} ankle {r(at(s + 'Foot'))} target {r(T['foot' + s].matrix_world.translation)}"
              f" miss {round((at(s + 'Foot') - T['foot' + s].matrix_world.translation).length, 3)}")


def reach_report():
    """The worst miss of each hand and foot from its target over each clip (m): a target out of
    reach shows here before it shows in the game."""
    for name, (start, frames, loop) in CLIPS.items():
        worst = {}
        for i in range(frames + 1):
            scene.frame_set(start + i)
            ce = ctrl.evaluated_get(bpy.context.evaluated_depsgraph_get())
            for s in SIDES:
                for limb, bone in (("hand", "Hand"), ("foot", "Foot")):
                    d = ((ce.matrix_world @ ce.pose.bones[s + bone].matrix).translation - T[limb + s].matrix_world.translation).length
                    if d > worst.get(limb + s, (0, 0))[0]:
                        worst[limb + s] = (round(d, 3), i)
        print("reach", name, worst)


data = export()
if opt("--probe"):
    for item in opt("--probe").split(","):
        n, f = item.split(":")
        probe(n, int(f))
if "--reach" in sys.argv:
    reach_report()
print("rappel:", {k: len(v["rot"]) for k, v in data["clips"].items()}, "unit", round(UNIT, 3), "arm", round(ARM, 3), "leg", round(LEG, 3), os.path.getsize(OUT), "bytes")
if PREVIEW:
    shots = json.loads(opt("--shots")) if opt("--shots") else [(n, [0], ["side"]) for n in CLIPS]
    preview([s for s in shots if not ONLY or s[0] == ONLY])
if BLEND:
    # The character keyed frame by frame, so the file plays without this script.
    for f in range(1, FRAMES + 1):
        pose_game(sample(f), frame=f)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND), compress=True)
    print("saved", BLEND, os.path.getsize(BLEND))
