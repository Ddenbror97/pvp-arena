"""
Grenade first-person control rig, clips and preview cameras (imported by build_grenades.py).

Authored in glTF axes (x right, y up, z toward the viewer) and converted with g2b; the clip root is
the first-person camera (metres). The game reads these nodes (each clip animates all of them):

- `G_Hand`: the right palm's centre and the hand's turn (local +x along the hand, wrist →
  knuckles; local +y out of the palm). The game puts the right glove's palm exactly here and the
  grenade in the palm: the grenade's `GR_<t>_Grip` node coincides with G_Hand (the model scaled by
  GRENADE_SCALE), so the grenade can never float out of or sink into the hand.
- `G_HandL`: where the left thumb and index finger meet (the pinch point) and the left hand's
  turn (same axes) while the left hand is free.
- `G_Mix`: x = how far the left pinch point is on the ring's pinch point instead of on G_HandL
  (1 while pulling: the fingers stay on the ring as it comes out).
- `G_Pull`: x = how far the pin is out (0 home, 1 clear of the fuse); y = the ring is carried
  away by the left hand (1 after it comes free).
- `G_Fingers`: x = right grip (0 open, 1 closed round the grenade); y = left pinch (0 relaxed,
  1 thumb and index pinched).
- `G_ElbowR`, `G_ElbowL`: where each elbow is from its wrist (camera space, a direction): the
  forearms turn toward them (wind-ups lift the elbow; the hold keeps it low).

Clips per grenade type `<t>` (he, smoke, fire), 60 fps keys; the game plays them on the server's
clocks (rules.ts):
  <t>_equip (0.45 s), <t>_idle (3 s loop), <t>_walk (0.8 s loop), <t>_sprint (0.66 s loop),
  <t>_pin_pull (0.45 s), <t>_cock_over / _cock_medium / _cock_under (0.17 s: the wind-up, after
  the pin, primeMs = 0.62 s from the press), <t>_throw_overhand / _throw_medium /
  _throw_underhand / _jump_throw (0.52 s: release at releaseMs, then the follow-through and
  <t>_throw_recovery from 0.3 s), <t>_inspect (3.2 s).
Cues (scene extras `grenades.cues`): [time, name]: "pin-grab", "pin-out", "release", "inspect-turn".
"""
import bpy, json, math
from mathutils import Matrix, Quaternion, Vector

FPS = 60
GRENADE_SCALE = 1.35
PULL_TRAVEL = 1.3  # the pin comes out this many pin lengths
# Rules (src/lib/fps/grenades/rules.ts): keep in step.
EQUIP_S = 0.45
PIN_S = 0.45
PRIME_S = 0.62
RELEASE = {"overhand": 0.12, "medium": 0.11, "underhand": 0.14, "jump": 0.12}
THROW_S = 0.52
RECOVERY_FROM = 0.30

def g2b(v):
    v = Vector(v)
    return Vector((v.x, -v.z, v.y))

def frame_quat(along, palm):
    """glTF rotation whose local +x is `along` and +y is `palm` (made square)."""
    x = Vector(along).normalized()
    y = Vector(palm) - x * Vector(palm).dot(x)
    y.normalize()
    z = x.cross(y)
    return Matrix((x, y, z)).transposed().to_quaternion()

def gltf_to_blender_matrix(pos, quat, scale=1.0):
    """Blender matrix of a node with glTF translation `pos` and glTF rotation `quat`."""
    m = quat.to_matrix()
    x, y, z = m.col[0], m.col[1], m.col[2]
    bx, bz, by = g2b(x), g2b(y), -g2b(z)
    out = Matrix((bx, by, bz)).transposed().to_4x4() @ Matrix.Scale(scale, 4)
    out.translation = g2b(pos)
    return out

def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3

def ease_in(t):
    t = max(0.0, min(1.0, t))
    return t * t * t

class Pose:
    """One frame of the rig (glTF camera space)."""
    def __init__(self, hp, ha, hn, lp, la, ln, er, el, grip=1.0, pinch=0.0, pull=0.0, carry=0.0, mix=0.0):
        self.hp, self.lp = Vector(hp), Vector(lp)
        self.hq, self.lq = frame_quat(ha, hn), frame_quat(la, ln)
        self.er, self.el = Vector(er).normalized(), Vector(el).normalized()
        self.grip, self.pinch, self.pull, self.carry, self.mix = grip, pinch, pull, carry, mix

    def copy(self):
        p = Pose.__new__(Pose)
        p.__dict__.update({k: (v.copy() if hasattr(v, "copy") else v) for k, v in self.__dict__.items()})
        return p

    def moved(self, dp=(0, 0, 0), rot=None, dl=(0, 0, 0), lrot=None, **values):
        p = self.copy()
        p.hp = p.hp + Vector(dp)
        if rot:
            p.hq = rot @ p.hq
        p.lp = p.lp + Vector(dl)
        if lrot:
            p.lq = lrot @ p.lq
        for k, v in values.items():
            setattr(p, k, v)
        return p

def blend(a, b, u):
    p = a.copy()
    p.hp = a.hp.lerp(b.hp, u)
    p.lp = a.lp.lerp(b.lp, u)
    p.hq = a.hq.slerp(b.hq, u)
    p.lq = a.lq.slerp(b.lq, u)
    p.er = a.er.lerp(b.er, u).normalized()
    p.el = a.el.lerp(b.el, u).normalized()
    for k in ("grip", "pinch", "pull", "carry", "mix"):
        setattr(p, k, getattr(a, k) + (getattr(b, k) - getattr(a, k)) * u)
    return p

def path(keys, t, shape=ease):
    """Pose at `t` along [(time, pose, shape?)] (piecewise; each segment's own easing)."""
    if t <= keys[0][0]:
        return keys[0][1]
    for i in range(1, len(keys)):
        t0, a = keys[i - 1][0], keys[i - 1][1]
        t1, b = keys[i][0], keys[i][1]
        s = keys[i][2] if len(keys[i]) > 2 else shape
        if t <= t1:
            return blend(a, b, s((t - t0) / max(1e-6, t1 - t0)))
    return keys[-1][1]

def axis_rot(axis, degrees):
    return Quaternion(Vector(axis).normalized(), math.radians(degrees))

# ---------------------------------------------------------------- poses
# Right hand: palm on the grenade's lever side, the grenade upright in front of it (its axis is
# along × palm), knuckles forward and a little left and up; the wrist low right.
ELBOW_R_LOW = (0.45, -0.85, 0.3)
ELBOW_L_LOW = (-0.5, -0.8, 0.35)

META = {}

def centre_offset(t, q):
    """Grenade centre (mid-body) relative to the palm (G_Hand) for hand rotation q (glTF)."""
    m = META[t]
    grip_local = gltf_to_blender_matrix(m["grip"], frame_quat((0, 0, -1), (-1, 0, 0)))
    root = gltf_to_blender_matrix((0, 0, 0), q) @ Matrix.Scale(GRENADE_SCALE, 4) @ grip_local.inverted()
    b = root @ g2b((0, m["height"] * (0.36 if t == "he" else 0.42), 0))
    return Vector((b.x, b.z, -b.y))

def hold_at(t, centre, q):
    """Palm position that puts the grenade's centre at `centre` (camera space)."""
    return Vector(centre) - centre_offset(t, q)

# Hand frames (glTF camera space): knuckles forward, a little left and up; palm facing left and a
# little toward the viewer, so the grenade stands in front of the palm with its top tipped toward
# the eye (the fuse, ring and lever in view).
READY_Q = {
    "he": frame_quat((-0.36, 0.32, -0.88), (-0.9, -0.12, -0.25)),
    "cyl": frame_quat((-0.30, 0.26, -0.92), (-0.93, -0.08, -0.28)),
}
READY_CENTRE = {"he": (0.165, -0.105, -0.40), "cyl": (0.175, -0.095, -0.42)}
LEFT_READY = dict(lp=(0.015, -0.175, -0.37), la=(0.45, 0.62, -0.64), ln=(0.45, -0.2, -0.87))

def shape(t):
    return "he" if t == "he" else "cyl"

def ready(t):
    """Ready (idle) pose per type: the round HE a little lower and turned more to show its ring;
    the cylinders more upright."""
    q = READY_Q[shape(t)]
    hp = hold_at(t, READY_CENTRE[shape(t)], q)
    x = q.to_matrix()
    return Pose(
        hp=hp, ha=x.col[0], hn=x.col[1],
        er=ELBOW_R_LOW, el=ELBOW_L_LOW, **LEFT_READY,
    )

def placed(t, base, centre, rot):
    """`base` turned by `rot` (camera space) with the grenade's centre moved to `centre`."""
    q = rot @ base.hq
    p = base.copy()
    p.hq = q
    p.hp = hold_at(t, centre, q)
    return p

def offscreen_right(p):
    return p.moved(dp=(0.16, -0.42, 0.12), rot=axis_rot((0, 0, 1), -35), grip=0.55)

def offscreen_left(p):
    return p.moved(dl=(-0.22, -0.30, 0.10), lrot=axis_rot((0, 0, 1), 30), pinch=0.0)

COCKED = {
    # Overhand: the grenade back and up beside the head, the elbow out and lifted.
    "over": ((0.26, 0.08, -0.36), lambda: axis_rot((1, 0, 0), -22) @ axis_rot((0, 0, 1), -22), (0.9, 0.1, 0.4)),
    # Underhand: low, the wrist cocked back.
    "under": ((0.15, -0.23, -0.40), lambda: axis_rot((1, 0, 0), -28) @ axis_rot((0, 1, 0), 10), (0.35, -0.55, 0.75)),
    "medium": ((0.22, -0.06, -0.37), lambda: axis_rot((1, 0, 0), 14) @ axis_rot((0, 0, 1), -10), (0.7, -0.45, 0.55)),
}

def cocked(t, kind):
    centre, rot, elbow = COCKED[kind]
    return placed(t, ready(t), centre, rot()).moved(er=Vector(elbow).normalized())

def build(scene, models, meta):
    META.update(meta)
    scene.render.fps = FPS
    def empty(name, size=0.01):
        e = bpy.data.objects.new(name, None)
        e.empty_display_size = size
        scene.collection.objects.link(e)
        return e
    hand = empty("G_Hand", 0.03)
    hand_l = empty("G_HandL", 0.03)
    mix = empty("G_Mix")
    pull = empty("G_Pull")
    fingers = empty("G_Fingers")
    elbow_r = empty("G_ElbowR")
    elbow_l = empty("G_ElbowL")
    rig = [hand, hand_l, mix, pull, fingers, elbow_r, elbow_l]

    def ring_point(t, p):
        """The ring's pinch point in camera space for pose p (the grenade in the right palm)."""
        m = meta[t]
        grip_local = gltf_to_blender_matrix(m["grip"], frame_quat((0, 0, -1), (-1, 0, 0)))
        hand_world = gltf_to_blender_matrix(p.hp, p.hq)
        root = hand_world @ Matrix.Scale(GRENADE_SCALE, 4) @ grip_local.inverted()
        pinch = Vector(m["pinch"]) + Vector(m["pull"]) * m["pinLength"] * PULL_TRAVEL * p.pull
        b = root @ g2b(pinch)
        return Vector((b.x, b.z, -b.y))

    actions, cues = [], {}

    def key_pose(p, frame):
        hand.matrix_basis = gltf_to_blender_matrix(p.hp, p.hq)
        hand_l.matrix_basis = gltf_to_blender_matrix(p.lp, p.lq)
        mix.location = Vector((p.mix, 0, 0))
        pull.location = Vector((p.pull, p.carry, 0))
        fingers.location = Vector((p.grip, p.pinch, 0))
        elbow_r.location = g2b(p.er)
        elbow_l.location = g2b(p.el)
        for o in rig:
            o.keyframe_insert("location", frame=frame)
            if o in (hand, hand_l):
                o.rotation_mode = "QUATERNION"
                o.keyframe_insert("rotation_quaternion", frame=frame)

    def clip(name, seconds, at, loop=False):
        action = bpy.data.actions.new(name)
        for o in rig:
            o.animation_data_create()
            o.animation_data.action = action
        frames = int(round(seconds * FPS))
        for f in range(frames + 1):
            key_pose(at(min(seconds, f / FPS)), f)
        for o in rig:
            o.animation_data.action = None
        actions.append(action)
        return action

    for t in models:
        R = ready(t)
        # ------------------------------------------------ equip: up from the lower right
        start = offscreen_left(offscreen_right(R))
        settle = R.moved(dp=(-0.006, 0.008, -0.004), rot=axis_rot((0, 0, 1), 3))
        equip = [
            (0.0, start),
            (0.30, settle, ease_out),
            (0.45, R),
        ]
        # The left hand comes in a little behind the right.
        def equip_at(time, keys=equip):
            p = path(keys, time)
            q = blend(offscreen_left(R), R, ease_out((time - 0.08) / 0.32))
            p.lp, p.lq, p.el, p.pinch = q.lp, q.lq, q.el, q.pinch
            p.grip = 0.55 + 0.45 * ease((time - 0.12) / 0.25)
            return p
        clip(f"{t}_equip", EQUIP_S, equip_at)
        cues[f"{t}_equip"] = [[0.0, "draw"], [0.24, "grip"]]

        # ------------------------------------------------ idle / walk / sprint loops
        def idle_at(time):
            w = 2 * math.pi * time / 3.0
            p = R.moved(
                dp=(0.0025 * math.sin(w + 0.7), 0.0045 * math.sin(w), 0.002 * math.sin(2 * w)),
                rot=axis_rot((0, 0, 1), 1.2 * math.sin(w + 0.3)) @ axis_rot((1, 0, 0), 0.8 * math.sin(2 * w)),
                dl=(0.002 * math.sin(w + 1.2), 0.004 * math.sin(w + 0.4), 0),
            )
            # A small re-grip half-way through.
            p.grip = 1.0 - 0.07 * math.exp(-(((time - 1.5) / 0.18) ** 2))
            return p
        clip(f"{t}_idle", 3.0, idle_at, loop=True)

        def walk_at(time, period=0.8, amp=1.0, base=R):
            w = 2 * math.pi * time / period
            bob = abs(math.sin(w))
            return base.moved(
                dp=(0.006 * amp * math.sin(w), -0.010 * amp * bob, 0.004 * amp * bob),
                rot=axis_rot((0, 0, 1), 2.0 * amp * math.sin(w)) @ axis_rot((1, 0, 0), -2.5 * amp * bob),
                dl=(0.005 * amp * math.sin(w + 0.4), -0.012 * amp * bob, 0),
            )
        clip(f"{t}_walk", 0.8, walk_at, loop=True)
        sprint_base = R.moved(
            dp=(0.03, -0.09, 0.05), rot=axis_rot((1, 0, 0), -18) @ axis_rot((0, 0, 1), -14),
            dl=(-0.05, -0.12, 0.05), er=Vector((0.4, -0.75, 0.55)).normalized(),
        )
        clip(f"{t}_sprint", 0.66, lambda time: walk_at(time, 0.66, 2.0, sprint_base), loop=True)

        # ------------------------------------------------ pin pull (from the hold press)
        # The right hand brings the grenade in toward the middle and turns the ring to the left
        # hand (the fingers stay closed on the lever).
        present = placed(t, R, Vector(READY_CENTRE[shape(t)]) + Vector((-0.075, 0.035, 0.01)), axis_rot((0, 1, 0), -15))
        def pin_at(time, t=t, present=present):
            p = blend(R, present, ease(time / 0.14))
            if time > 0.30:
                p = blend(present, R.moved(dp=(0.0, 0.005, 0.0)), ease((time - 0.30) / 0.15))
            # The right hand braces against the pull (small tug toward the left hand).
            tug = math.exp(-(((time - 0.24) / 0.06) ** 2))
            p = p.moved(dp=(-0.006 * tug, 0.004 * tug, 0))
            p.pull = ease((time - 0.17) / 0.13)
            p.carry = 1.0 if time >= 0.30 else 0.0
            p.pinch = ease((time - 0.10) / 0.07)
            ring = ring_point(t, p)
            # Left hand: reach the ring (0–0.14), pinch, pull with it, then drop away with it.
            reach_q = frame_quat((0.6, 0.45, -0.66), (0.3, -0.2, -0.93))
            away = Vector((-0.24, -0.40, -0.30))
            if time < 0.30:
                p.mix = ease((time - 0.02) / 0.12)
                came = R
                p.lp = came.lp.lerp(ring + Vector((-0.02, -0.01, 0.01)), ease(time / 0.14))
                p.lq = came.lq.slerp(reach_q, ease(time / 0.14))
            else:
                p.mix = 0.0
                u = ease_in((time - 0.30) / 0.15)
                ring_end = ring_point(t, p.moved(pull=1.0))
                p.lp = ring_end.lerp(away, u)
                p.lq = reach_q.slerp(frame_quat((0.5, -0.2, -0.85), (0.2, -0.8, -0.5)), u)
            # The left elbow swings out to the side to reach across.
            wide = Vector((-0.55, -0.78, 0.3)).normalized()
            k = ease(time / 0.14) if time < 0.30 else 1 - ease((time - 0.30) / 0.15)
            p.el = R.el.lerp(wide, k).normalized()
            return p
        clip(f"{t}_pin_pull", PIN_S, pin_at)
        cues[f"{t}_pin_pull"] = [[0.12, "pin-grab"], [0.30, "pin-out"]]
        pinned = pin_at(PIN_S)

        # ------------------------------------------------ cock (wind-up) per kind
        for kind, label in (("over", "over"), ("medium", "medium"), ("under", "under")):
            target = cocked(t, kind).moved(pull=1.0, carry=1.0, pinch=pinned.pinch)
            target.lp, target.lq = pinned.lp + Vector((-0.04, -0.06, 0.02)), pinned.lq
            def cock_at(time, target=target):
                return blend(pinned, target, ease(time / (PRIME_S - PIN_S)))
            clip(f"{t}_cock_{label}", PRIME_S - PIN_S, cock_at)

        # ------------------------------------------------ throws (from the wind-up)
        def throw_clip(name, kind, release, at_release, follow, gone_at, lift=0.0):
            """From the wind-up: the arm drives the grenade forward to the release point, follows
            through, then drops out of view (the recovery). Each target: (centre, rotation, elbow)."""
            c = cocked(t, kind).moved(pull=1.0, carry=1.0, pinch=0.0)
            c.lp, c.lq = pinned.lp + Vector((-0.04, -0.08, 0.02)), pinned.lq
            c = placed(t, c, Vector(COCKED[kind][0]) + Vector((0, lift, 0)), Quaternion())
            def target(spec, base):
                centre, rot, elbow = spec
                return placed(t, base, Vector(centre) + Vector((0, lift, 0)), rot).moved(er=Vector(elbow).normalized())
            rel = target(at_release, c)
            through = target(follow, c).moved(grip=0.0)
            gone = target(gone_at, through)
            keys = [
                (0.0, c),
                (release, rel, ease_in),
                (RECOVERY_FROM, through, ease_out),
                (THROW_S, gone, ease_in),
            ]
            def throw_at(time):
                p = path(keys, time)
                # Fingers hold until the release frame, then fly open.
                p.grip = 1.0 if time < release - 0.02 else max(0.0, 1.0 - (time - release + 0.02) / 0.05)
                return p
            clip(f"{t}_{name}", THROW_S, throw_at)
            cues[f"{t}_{name}"] = [[release, "release"]]
            return throw_at

        down_r = (0.2, -0.9, 0.4)
        throw_clip(
            "throw_overhand", "over", RELEASE["overhand"],
            ((0.06, 0.03, -0.72), axis_rot((1, 0, 0), -60), (0.5, -0.7, 0.5)),
            ((-0.16, -0.36, -0.55), axis_rot((1, 0, 0), -100) @ axis_rot((0, 0, 1), 25), down_r),
            ((-0.05, -0.85, -0.35), axis_rot((1, 0, 0), -25), down_r),
        )
        throw_clip(
            "throw_medium", "medium", RELEASE["medium"],
            ((0.05, -0.02, -0.70), axis_rot((1, 0, 0), -40), (0.55, -0.65, 0.5)),
            ((-0.10, -0.30, -0.55), axis_rot((1, 0, 0), -70) @ axis_rot((0, 0, 1), 18), down_r),
            ((0.0, -0.85, -0.38), axis_rot((1, 0, 0), -25), down_r),
        )
        throw_clip(
            "throw_underhand", "under", RELEASE["underhand"],
            ((0.07, -0.08, -0.66), axis_rot((1, 0, 0), 35), (0.3, -0.85, 0.45)),
            ((0.03, -0.04, -0.64), axis_rot((1, 0, 0), 50), (0.3, -0.85, 0.45)),
            ((0.06, -0.80, -0.45), axis_rot((1, 0, 0), -20), down_r),
        )
        throw_clip(
            "jump_throw", "over", RELEASE["jump"],
            ((0.06, 0.03, -0.72), axis_rot((1, 0, 0), -55), (0.5, -0.65, 0.55)),
            ((-0.14, -0.30, -0.55), axis_rot((1, 0, 0), -95) @ axis_rot((0, 0, 1), 22), down_r),
            ((-0.05, -0.85, -0.35), axis_rot((1, 0, 0), -25), down_r),
            lift=0.05,
        )

        # ------------------------------------------------ inspect (does nothing to the grenade)
        centre = R.moved(dp=(-0.07, 0.07, 0.06), rot=axis_rot((0, 1, 0), 35) @ axis_rot((1, 0, 0), 12))
        turned = centre.moved(rot=axis_rot((0, 1, 0), -70), grip=0.92)
        top = turned.moved(dp=(0, 0.02, 0.01), rot=axis_rot((1, 0, 0), 38), grip=0.9)
        keys = [
            (0.0, R),
            (0.55, centre),
            (1.25, turned),
            (1.55, turned.moved(grip=1.0)),
            (2.2, top),
            (3.2, R),
        ]
        def inspect_at(time, keys=keys):
            p = path(keys, time)
            # The left hand eases off a little while the right turns the grenade.
            q = blend(R, R.moved(dl=(-0.03, -0.05, 0.01)), math.sin(math.pi * min(1, time / 3.2)))
            p.lp, p.lq = q.lp, q.lq
            return p
        clip(f"{t}_inspect", 3.2, inspect_at)
        cues[f"{t}_inspect"] = [[0.55, "inspect-turn"], [1.55, "grip"], [2.2, "inspect-turn"]]

    # The recovery sub-ranges (exported as their own clips too, like the C4's phases).
    # Every clip goes on its own NLA track so the exporter writes one animation per clip.
    for obj in rig:
        obj.animation_data_create()
        obj.animation_data.action = None
        for action in actions:
            slot = next((s for s in action.slots if s.identifier == f"OB{obj.name}"), None)
            if not slot:
                continue
            track = obj.animation_data.nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, 0, action)
            strip.action_slot = slot
            track.mute = action.name != "he_idle"
    scene.frame_start, scene.frame_end = 0, int(3.0 * FPS)
    scene["grenades"] = json.dumps(
        {
            "scale": GRENADE_SCALE,
            "pullTravel": PULL_TRAVEL,
            "primeSeconds": PRIME_S,
            "pinSeconds": PIN_S,
            "throwSeconds": THROW_S,
            "recoveryFrom": RECOVERY_FROM,
            "release": RELEASE,
            "cues": cues,
            "models": meta,
        }
    )
    add_cameras(scene)
    print("GRENADE CLIPS", len(actions), sorted(a.name for a in actions)[:12])

# ---------------------------------------------------------------- preview cameras
CAMERAS = {
    # name: (glTF position, glTF look-at) around the right hand's ready pose; the game's capture
    # script uses the same set (scripts/fps/grenade-capture).
    "A_first_person": ((0, 0, 0), (0.05, -0.12, -0.6)),
    "B_right_close": ((0.55, -0.10, -0.30), (0.14, -0.15, -0.40)),
    "C_left_close": ((-0.45, -0.05, -0.20), (0.08, -0.15, -0.40)),
    "D_front_three_quarter": ((0.35, 0.05, -1.05), (0.10, -0.15, -0.40)),
    "E_top_down": ((0.12, 0.45, -0.38), (0.12, -0.15, -0.40)),
    "F_over_shoulder": ((0.35, 0.25, 0.55), (0.05, -0.15, -0.6)),
    "G_slow_close": ((0.30, -0.02, -0.65), (0.12, -0.12, -0.40)),
    "H_projectile": ((1.2, 0.6, -1.5), (0.0, 0.0, -3.0)),
}

def add_cameras(scene):
    for name, (pos, at) in CAMERAS.items():
        cam = bpy.data.cameras.new(name)
        cam.lens_unit = "FOV"
        cam.angle = math.radians(70 if name.startswith("A") else 45)
        cam.clip_start = 0.01
        obj = bpy.data.objects.new(name, cam)
        scene.collection.objects.link(obj)
        p, a = g2b(pos), g2b(at)
        obj.location = p
        obj.rotation_euler = (a - p).to_track_quat("-Z", "Z").to_euler()

def render_previews(scene, models, out):
    pass
