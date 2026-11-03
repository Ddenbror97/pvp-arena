"""
C4 control rig, clips and preview cameras (imported by build_c4.py).

Everything is authored in glTF axes (x right, y up, z toward the viewer) and converted with g2b;
the clip root is the first-person camera (metres). The game reads these nodes:

- `C4_Device`: the device (camera space; scale = C4_SCALE). Its children are in device space
  (real-size metres, see build_c4.py): the model `C4`, and
  - `C4_Tip`: where the right index fingertip's pad must be. The game places the right wrist so
    the pad lands exactly there, so every press touches the authored key.
  - `C4_HandR`: right-hand orientation (local +x along the hand, wrist → knuckles; local +y
    out of the palm).
  - `C4_PalmL`: left palm centre and orientation (same axes); the game places the left wrist so
    the palm lands there.
- `C4_Fingers`: x = right index flex (0 extended, 1 pressing), y = right hand relaxed/open
  (0 pointing pose, 1 relaxed), z = left grip (1 closed on the device, 0 open).

Clips (60 fps keys; the game samples them on the server's clock):
- `c4_plant` (PLANT_S = 3.2 s, the server's plantMs): equip 0–0.42, secure 0.42–0.74, code
  0.74–2.36, confirm 2.36–2.72, place 2.72–3.2. The sub-ranges are also exported as
  `c4_equip`, `c4_plant_start`, `c4_keypad_entry`, `c4_plant_confirm`, `c4_place`.
- `c4_plant_complete` (0.3 s): after the server confirms, the hands drop away.
- `c4_plant_cancel` (0.3 s): interrupted; device and hands drop out of view from the hold pose.

Cues (scene extras `c4.cues`): [time, name] per clip: "press:<key>" at each contact, "power",
"armed", "place", "grab", "release". The game drives the LCD, LEDs and sounds from them.
"""
import bpy, json, math
from mathutils import Matrix, Vector

FPS = 60
PLANT_S = 3.2
C4_SCALE = 1.7
# Fictional entry: seven digits, then the confirmation key.
CODE = ["2", "7", "4", "9", "1", "6", "0"]
CONTACTS = [0.80, 1.015, 1.245, 1.455, 1.70, 1.915, 2.14]
CONFIRM = ("hash", 2.50)
HOVER = 0.016  # fingertip pad above the key cap before / after a press (device metres)
PRESS_DEPTH = 0.0011  # pad below the cap top at full press (the key travels with it)

def g2b(v):
    v = Vector(v)
    return Vector((v.x, -v.z, v.y))

def basis(along, palm):
    """Rotation whose local +x is `along` and +y is `palm` (made square), glTF axes."""
    x = Vector(along).normalized()
    y = Vector(palm) - x * Vector(palm).dot(x)
    y.normalize()
    z = x.cross(y)
    return x, y, z

def gltf_matrix(pos, axes, scale=1.0):
    """Blender world/local matrix for a node whose glTF local axes are `axes` at glTF `pos`."""
    x, y, z = axes
    # glTF local x → Blender local x; glTF local y → Blender local z; glTF local z → Blender -y.
    bx, bz, by = g2b(x), g2b(y), -g2b(z)
    m = Matrix((bx, by, bz)).transposed().to_4x4()
    m = m @ Matrix.Scale(scale, 4)
    m.translation = g2b(pos)
    return m

def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3

def lerp(a, b, t):
    return a + (b - a) * t

def vlerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)

def track(points, t, shape=ease):
    """Piecewise eased interpolation through [(time, value)] (value: float or Vector)."""
    if t <= points[0][0]:
        return points[0][1]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t <= t1:
            u = shape((t - t0) / max(1e-6, t1 - t0))
            return vlerp(v0, v1, u) if isinstance(v0, Vector) else lerp(v0, v1, u)
    return points[-1][1]

def rotate(v, axis, angle):
    return Matrix.Rotation(angle, 3, Vector(axis)) @ Vector(v)

# ---------------------------------------------------------------- poses (glTF axes)
# Device held in the left hand at chest height, face tipped toward the eye.
HOLD_POS = Vector((-0.06, -0.1, -0.5))
HOLD_FACE = Vector((0.14, 0.6, 1.0))
HOLD_TOP = Vector((-0.12, 1.0, -0.4))
def device_axes(face, top):
    z = Vector(face).normalized()
    y = Vector(top) - z * Vector(top).dot(z)
    y.normalize()
    return y.cross(z), y, z  # x = y × z

# Right hand while typing (device space): hand axis toward the top-left and into the face,
# palm facing the keypad.
TYPE_ALONG = Vector((-0.62, 0.6, -0.5))
TYPE_PALM = Vector((-0.1, -0.3, -1.0))
# Left hand: palm on the device's left side, fingers round the back, thumb on the face.
LEFT_PALM_AT = Vector((-0.0835, -0.025, 0.035))
LEFT_ALONG = Vector((0.0, 0.4, -0.92))
LEFT_PALM = Vector((1.0, 0.0, 0.0))

def build(scene, root, model):
    keys = {k: Vector(v) for k, v in model["keys"].items()}
    scene.render.fps = FPS
    def empty(name, parent=None, size=0.01):
        e = bpy.data.objects.new(name, None)
        e.empty_display_size = size
        scene.collection.objects.link(e)
        if parent:
            e.parent = parent
        return e
    device = empty("C4_Device", size=0.05)
    root.parent = device
    tip = empty("C4_Tip", device, 0.006)
    hand_r = empty("C4_HandR", device, 0.03)
    palm_l = empty("C4_PalmL", device, 0.03)
    fingers = empty("C4_Fingers", None, 0.01)
    rig = [device, tip, hand_r, palm_l, fingers]

    # ------------------------------------------------ plant timeline (device-space targets)
    hover = lambda k, dx=0.0, dy=0.0: keys[k] + Vector((dx, dy, HOVER))
    contact = lambda k: keys[k] + Vector((0, 0, -PRESS_DEPTH))
    presses = list(zip(CODE, CONTACTS)) + [CONFIRM]
    # Fingertip path: off the lower right, onto the first key, each press, then to the device's
    # right edge to guide it down.
    tip_path = [
        (0.0, Vector((0.16, -0.20, 0.06))),
        (0.30, Vector((0.10, -0.12, 0.07))),
        (0.62, hover(presses[0][0], 0.003, -0.004)),
    ]
    flex_path = [(0.0, 0.0)]
    relax_path = [(0.0, 1.0), (0.36, 1.0), (0.62, 0.0)]
    cues = [(0.43, "power"), (0.08, "grab")]
    for i, (k, c) in enumerate(presses):
        last = i == len(presses) - 1
        hold = 0.085 if last else 0.045 + 0.012 * (i % 3)
        # arrive above the key, reach the cap, push, hold, lift
        drift = Vector((0.0015 * math.sin(i * 1.7), 0.0012 * math.cos(i * 2.3), 0))
        tip_path += [
            (c - 0.07, hover(k) + drift),
            (c, keys[k] + Vector((0, 0, 0.0002))),
            (c + 0.03, contact(k)),
            (c + 0.03 + hold, contact(k)),
            (c + 0.08 + hold, hover(k) + drift * 0.5 + Vector((0, 0, -0.004))),
        ]
        flex_path += [(c - 0.07, 0.12), (c + 0.03, 0.95), (c + 0.03 + hold, 0.95), (c + 0.08 + hold, 0.2)]
        cues.append((c + 0.012, f"press:{k}"))
    cues += [(CONFIRM[1] + 0.06, "armed")]
    # Guide the device down: fingertip to the right edge, relax the hand.
    edge = Vector((0.083, -0.03, 0.05))
    tip_path += [(2.86, edge + Vector((0.01, 0.0, 0.02))), (3.0, edge), (PLANT_S, edge)]
    flex_path += [(2.80, 0.1), (PLANT_S, 0.1)]
    relax_path += [(2.66, 0.0), (2.9, 1.0), (PLANT_S, 1.0)]
    grip_path = [(0.0, 0.55), (0.42, 1.0), (2.95, 1.0), (PLANT_S, 0.15)]
    cues += [(2.80, "place"), (3.05, "release")]
    tip_path.sort(key=lambda p: p[0])
    flex_path.sort(key=lambda p: p[0])

    face0, top0 = HOLD_FACE, HOLD_TOP
    def device_at(t):
        # Equip: rises from below the frame, tipped down, settles with a little overshoot.
        up = ease_out(t / 0.42)
        settle = math.sin(min(1.0, max(0.0, (t - 0.30) / 0.30)) * math.pi) * 0.012
        pos = vlerp(HOLD_POS + Vector((0.04, -0.30, 0.06)), HOLD_POS, up) + Vector((0, settle, 0))
        tilt = lerp(-0.9, 0.0, up)
        # Secure: tips toward the eye a touch (keypad readable).
        tilt += 0.06 * ease((t - 0.42) / 0.3)
        # Typing: tiny reaction to each press (the left hand absorbs it).
        for k, c in presses:
            d = t - c
            if -0.02 < d < 0.2:
                pos += Vector((0, -0.0025, -0.0015)) * math.sin(max(0.0, d) / 0.2 * math.pi)
        # Place: both hands lower it forward and down out of view, face turning up.
        down = ease((t - 2.72) / (PLANT_S - 2.72))
        pos += Vector((0.0, -0.36, -0.10)) * down
        tilt += -0.55 * down
        face = rotate(face0, (1, 0, 0), tilt)
        top = rotate(top0, (1, 0, 0), tilt)
        return pos, device_axes(face, top)
    def hand_r_at(t):
        # Wrist adjusts per key: yaw by column, pitch by row (device z and x axes).
        col = {"1": -1, "4": -1, "7": -1, "star": -1, "2": 0, "5": 0, "8": 0, "0": 0}.get
        row = {"1": 0, "2": 0, "3": 0, "4": 1, "5": 1, "6": 1, "7": 2, "8": 2, "9": 2}.get
        yaw_path, pitch_path = [(0.0, 0.25)], [(0.0, -0.2)]
        for k, c in presses:
            yaw_path.append((c - 0.07, 0.07 * (col(k, 1))))
            pitch_path.append((c - 0.07, -0.05 * (row(k, 3) - 1.5)))
        yaw_path += [(2.8, 0.0), (PLANT_S, -0.2)]
        pitch_path += [(2.8, 0.0), (PLANT_S, 0.35)]
        along = rotate(rotate(TYPE_ALONG, (0, 0, 1), track(yaw_path, t)), (1, 0, 0), track(pitch_path, t))
        palm = rotate(rotate(TYPE_PALM, (0, 0, 1), track(yaw_path, t)), (1, 0, 0), track(pitch_path, t))
        # Guiding the device: hand turns palm-left onto the right edge.
        g = ease((t - 2.74) / 0.25)
        along = vlerp(along, Vector((0.05, 0.5, -0.85)), g)
        palm = vlerp(palm, Vector((-1.0, 0.0, -0.1)), g)
        return basis(along, palm)
    def palm_l_at(t):
        squeeze = 0.0
        for k, c in presses:
            d = t - c
            if 0 < d < 0.18:
                squeeze += 0.03 * math.sin(d / 0.18 * math.pi)
        along = rotate(LEFT_ALONG, (1, 0, 0), squeeze)
        pos = LEFT_PALM_AT.copy()
        # Release at the end: palm slides off the side.
        r = ease((t - 2.98) / (PLANT_S - 2.98))
        pos += Vector((-0.04, -0.02, 0.02)) * r
        return pos, basis(along, LEFT_PALM)

    def key_frame(t, action_name):
        pos, axes = device_at(t)
        device.matrix_basis = gltf_matrix(pos, axes, C4_SCALE)
        tip.matrix_basis = Matrix.Translation(g2b(track(tip_path, t)))
        hand_r.matrix_basis = gltf_matrix(Vector(), hand_r_at(t))
        p, a = palm_l_at(t)
        palm_l.matrix_basis = gltf_matrix(p, a)
        # glTF x/y/z = Blender x/z/-y: flex → x, relax → y (Blender z), grip → z (Blender -y).
        fingers.location = Vector((track(flex_path, t), -track(grip_path, t), track(relax_path, t)))

    for obj in rig:
        obj.rotation_mode = "QUATERNION"
    actions = []
    # One action per clip covering all rig nodes: Blender 4.4+ slotted actions export one glTF
    # animation per action, with a slot per object.
    def clip(name, t0, t1, at=key_frame):
        action = bpy.data.actions.new(name)
        frames = int(round((t1 - t0) * FPS))
        for obj in rig:
            obj.animation_data_create()
            obj.animation_data.action = action
        for f in range(frames + 1):
            at(t0 + f / FPS, name)
            for obj in rig:
                obj.keyframe_insert("location", frame=f)
                obj.keyframe_insert("rotation_quaternion", frame=f)
                obj.keyframe_insert("scale", frame=f)
        action.use_fake_user = True
        actions.append(action)
        return action

    clip("c4_plant", 0.0, PLANT_S)
    for name, a, b in [
        ("c4_equip", 0.0, 0.42),
        ("c4_plant_start", 0.42, 0.74),
        ("c4_keypad_entry", 0.74, 2.36),
        ("c4_plant_confirm", 2.36, 2.72),
        ("c4_place", 2.72, PLANT_S),
    ]:
        clip(name, a, b)
    # Complete: from the end of the plant, hands drop away (device already out of view).
    def complete_at(t, _):
        key_frame(PLANT_S, _)
        drop = ease(t / 0.3)
        device.matrix_basis = Matrix.Translation(g2b(Vector((0, -0.12 * drop, 0)))) @ device.matrix_basis
        fingers.location = Vector((0.1, -0.15 * (1 - drop), 1.0))
    clip("c4_plant_complete", 0.0, 0.3, complete_at)
    # Cancel: from the hold pose (the game cross-fades into it from wherever the plant was).
    def cancel_at(t, _):
        key_frame(1.2, _)
        drop = ease(t / 0.3)
        pos, axes = device_at(1.2)
        pos = pos + Vector((0.03, -0.34, 0.05)) * drop
        face = rotate(axes[2], (1, 0, 0), -0.7 * drop)
        top = rotate(axes[1], (1, 0, 0), -0.7 * drop)
        device.matrix_basis = gltf_matrix(pos, device_axes(face, top), C4_SCALE)
        tip.matrix_basis = Matrix.Translation(g2b(track(tip_path, 1.2) + Vector((0.05, -0.08, 0.06)) * drop))
        fingers.location = Vector((0.15 * (1 - drop), -lerp(1.0, 0.3, drop), drop))
    clip("c4_plant_cancel", 0.0, 0.3, cancel_at)

    defuse_rig, defuse_actions, defuse_cues = build_defuse(scene, device, keys, empty)
    actions.extend(defuse_actions)
    cues_defuse = defuse_cues
    # Every clip goes on its own NLA track (same name on each rig node it animates) so the glTF
    # export writes one animation per clip; the scene keeps showing the plant (.blend, cameras).
    for obj in rig + defuse_rig:
        obj.animation_data_create()
        obj.animation_data.action = None
        for action in actions:
            slot = next((s for s in action.slots if s.identifier == f"OB{obj.name}"), None)
            if not slot:
                continue
            track_ = obj.animation_data.nla_tracks.new()
            track_.name = action.name
            strip = track_.strips.new(action.name, 0, action)
            strip.action_slot = slot
            track_.mute = action.name not in ("c4_plant", "c4_defuse")

    scene.frame_start, scene.frame_end = 0, int(PLANT_S * FPS)

    cue_table = {
        "c4_plant": sorted([[round(t, 4), n] for t, n in cues]),
        "c4_plant_complete": [],
        "c4_plant_cancel": [[0.0, "cancel"]],
        **cues_defuse,
    }
    scene["c4"] = json.dumps(
        {
            "scale": C4_SCALE,
            "plantSeconds": PLANT_S,
            "defuseSeconds": DEFUSE_S,
            "defuseFixed": [DEFUSE_HEAD, DEFUSE_TAIL],
            "code": CODE + [CONFIRM[0]],
            "cues": cue_table,
            "model": model,
        }
    )
    add_cameras(scene, device)
    print("C4 CLIPS", [a.name for a in actions], "cues", len(cues), "defuse cues", len(cues_defuse["c4_defuse"]))

# ---------------------------------------------------------------- Police defuse
DEFUSE_S = 10.0  # the room's defuseMs without a kit; a kit (5 s) time-warps the middle
DEFUSE_HEAD = 1.2  # approach + stabilise: never warped
DEFUSE_TAIL = 0.6  # final confirmation: never warped
DEFUSE_KEYS = ["1", "5", "9", "3", "7", "2", "8", "4", "6", "0", "star", "5"]
DEFUSE_CONTACTS = [1.32, 1.98, 2.55, 3.32, 3.9, 4.62, 5.18, 5.95, 6.5, 7.28, 7.85, 8.6]
DEFUSE_CONFIRM = ("hash", 9.72)
# Work frame (rotated about the device's face normal so the viewer is at -Y): the hands come from
# the viewer's side whichever way the planted bomb lies.
D_ALONG = Vector((-0.28, 0.8, -0.55))
D_PALM = Vector((0.05, 0.25, -1.0))
D_LEFT_AT = Vector((-0.046, -0.05, 0.07))
D_LEFT_ALONG = Vector((0.35, 0.9, -0.15))
D_LEFT_PALM = Vector((0.0, 0.0, -1.0))

def build_defuse(scene, device, keys, empty):
    """The Police defuse on the planted (world-anchored) device; see the module docstring."""
    work = empty("C4_DWork", device, 0.02)
    tip_key = empty("C4_DTipKey", device, 0.006)
    tip_free = empty("C4_DTipFree", work, 0.006)
    hand_r = empty("C4_DHandR", work, 0.03)
    palm_l = empty("C4_DPalmL", work, 0.03)
    fingers = empty("C4_DFingers", None, 0.01)
    mix = empty("C4_DMix", None, 0.01)
    rig = [work, tip_key, tip_free, hand_r, palm_l, fingers, mix]
    for obj in rig:
        obj.rotation_mode = "QUATERNION"
    presses = list(zip(DEFUSE_KEYS, DEFUSE_CONTACTS)) + [DEFUSE_CONFIRM]
    hover = lambda k: keys[k] + Vector((0, 0, HOVER))
    key_path = [(0.0, hover(presses[0][0]) + Vector((0, -0.02, 0.03)))]
    flex_path = [(0.0, 0.0)]
    cues = [(0.15, "grab")]
    for i, (k, c) in enumerate(presses):
        last = i == len(presses) - 1
        hold = 0.11 if last else 0.05 + 0.015 * (i % 4)
        drift = Vector((0.0012 * math.sin(i * 2.1), 0.001 * math.cos(i * 1.3), 0))
        approach = 0.12 if i else 0.25
        key_path += [
            (c - approach, hover(k) + drift),
            (c, keys[k] + Vector((0, 0, 0.0002))),
            (c + 0.035, keys[k] + Vector((0, 0, -PRESS_DEPTH))),
            (c + 0.035 + hold, keys[k] + Vector((0, 0, -PRESS_DEPTH))),
            (c + 0.09 + hold, hover(k) + drift * 0.5 + Vector((0, 0, -0.004))),
        ]
        # Between presses the hand settles a little higher (reading the display).
        if not last and presses[i + 1][1] - c > 0.6:
            key_path.append((c + 0.3 + hold, hover(k) + Vector((0, -0.006, 0.006))))
        flex_path += [(c - approach, 0.12), (c + 0.035, 0.95), (c + 0.035 + hold, 0.95), (c + 0.09 + hold, 0.2)]
        cues.append((c + 0.012, f"press:{k}"))
    key_path.sort(key=lambda p: p[0])
    flex_path.sort(key=lambda p: p[0])
    free_path = [(0.0, Vector((0.12, -0.32, 0.16))), (0.55, Vector((0.05, -0.12, 0.09))), (DEFUSE_S, Vector((0.05, -0.12, 0.09)))]
    mix_path = [(0.0, 0.0), (0.45, 0.0), (1.0, 1.0), (DEFUSE_S, 1.0)]
    relax_path = [(0.0, 1.0), (0.6, 1.0), (1.05, 0.0), (DEFUSE_S, 0.0)]
    grip_path = [(0.0, 0.0), (0.7, 0.0), (1.05, 0.4), (DEFUSE_S, 0.4)]
    left_path = [(0.0, D_LEFT_AT + Vector((-0.06, -0.22, 0.12))), (0.75, D_LEFT_AT + Vector((0, -0.01, 0.012))), (1.05, D_LEFT_AT), (DEFUSE_S, D_LEFT_AT)]

    def at(t, _):
        work.matrix_basis = Matrix.Identity(4)
        tip_key.matrix_basis = Matrix.Translation(g2b(track(key_path, t)))
        tip_free.matrix_basis = Matrix.Translation(g2b(track(free_path, t)))
        yaw = 0.0
        for k, c in presses:
            if t >= c - 0.12:
                yaw = 0.06 * ({"1": -1, "4": -1, "7": -1, "star": -1, "3": 1, "6": 1, "9": 1, "hash": 1}.get(k, 0))
        sway = 0.02 * math.sin(t * 1.7)
        along = rotate(D_ALONG, (0, 0, 1), yaw + sway)
        palm = rotate(D_PALM, (0, 0, 1), yaw + sway)
        hand_r.matrix_basis = gltf_matrix(Vector(), basis(along, palm))
        press_react = 0.0
        for k, c in presses:
            d = t - c
            if 0 < d < 0.2:
                press_react += 0.0015 * math.sin(d / 0.2 * math.pi)
        palm_l.matrix_basis = gltf_matrix(track(left_path, t) + Vector((0, 0, -press_react)), basis(D_LEFT_ALONG, D_LEFT_PALM))
        fingers.location = Vector((track(flex_path, t), -track(grip_path, t), track(relax_path, t)))
        mix.location = Vector((track(mix_path, t), 0, 0))

    actions = []
    def clip(name, t0, t1, fn=at):
        action = bpy.data.actions.new(name)
        frames = int(round((t1 - t0) * FPS))
        for obj in rig:
            obj.animation_data_create()
            obj.animation_data.action = action
        for f in range(frames + 1):
            fn(t0 + f / FPS, name)
            for obj in rig:
                obj.keyframe_insert("location", frame=f)
                obj.keyframe_insert("rotation_quaternion", frame=f)
                obj.keyframe_insert("scale", frame=f)
        action.use_fake_user = True
        actions.append(action)

    clip("c4_defuse", 0.0, DEFUSE_S)
    for name, a, b in [
        ("c4_defuse_start", 0.0, 0.6),
        ("c4_defuse_reach", 0.6, DEFUSE_HEAD),
        ("c4_defuse_keypad", DEFUSE_HEAD, DEFUSE_S - DEFUSE_TAIL),
        ("c4_defuse_confirm", DEFUSE_S - DEFUSE_TAIL, DEFUSE_S),
    ]:
        clip(name, a, b)
    def withdraw(t, length):
        """From the end pose, both hands lift off and come back toward the viewer, out of view."""
        at(DEFUSE_S, None)
        u = ease(t / length)
        mix.location = Vector((lerp(1.0, 0.0, ease(t / (length * 0.4))), 0, 0))
        tip_free.matrix_basis = Matrix.Translation(g2b(vlerp(Vector((0.04, -0.03, 0.1)), Vector((0.14, -0.45, 0.2)), u)))
        palm_l.matrix_basis = gltf_matrix(D_LEFT_AT + Vector((-0.08, -0.4, 0.18)) * u, basis(D_LEFT_ALONG, D_LEFT_PALM))
        fingers.location = Vector((0.1 * (1 - u), -lerp(0.4, 0.0, u), u))
    clip("c4_defuse_complete", 0.0, 0.6, lambda t, _: withdraw(t, 0.6))
    clip("c4_defuse_cancel", 0.0, 0.35, lambda t, _: withdraw(t, 0.35))
    cue_table = {
        "c4_defuse": sorted([[round(t, 4), n] for t, n in cues]),
        "c4_defuse_complete": [[0.0, "safe"]],
        "c4_defuse_cancel": [[0.0, "cancel"]],
    }
    return rig, actions, cue_table

def add_cameras(scene, device):
    """Preview cameras A–F (Blender only; the game always uses its own first-person camera)."""
    def cam(name, pos, look, lens=35):
        c = bpy.data.objects.new(name, bpy.data.cameras.new(name))
        c.data.lens = lens
        c.data.clip_start = 0.01
        scene.collection.objects.link(c)
        c.location = g2b(pos)
        direction = g2b(look) - g2b(pos)
        c.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return c
    keypad = HOLD_POS + Vector((0.0, 0.03, 0.08))
    a = cam("Cam_A_FirstPerson", (0, 0, 0), (0, -0.02, -1), lens=20.8)  # 60° vertical on 16:9
    cam("Cam_B_Keypad", keypad + Vector((0.05, 0.10, 0.16)), keypad, 50)
    cam("Cam_C_LeftThreeQuarter", keypad + Vector((-0.32, 0.12, 0.22)), keypad, 35)
    cam("Cam_D_RightThreeQuarter", keypad + Vector((0.34, 0.10, 0.22)), keypad, 35)
    cam("Cam_E_Side", keypad + Vector((0.45, 0.0, -0.02)), keypad, 35)
    cam("Cam_F_Showcase", keypad + Vector((-0.2, 0.25, 0.5)), keypad, 28)
    scene.camera = a

def render_previews(scene, out):
    import os
    os.makedirs(out, exist_ok=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x, scene.render.resolution_y = 640, 360
    for cam in [o for o in scene.objects if o.type == "CAMERA"]:
        scene.camera = cam
        for t in (0.5, 1.2, 2.55):
            scene.frame_set(int(t * FPS))
            scene.render.filepath = os.path.join(out, f"{cam.name}-{t:.2f}.png")
            bpy.ops.render.render(write_still=True)
