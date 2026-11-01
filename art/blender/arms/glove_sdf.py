"""
Tactical glove volume, sculpted as a signed distance field around the shipped FPRig hand bones.

Everything here is in real metres in a per-hand frame centred on the wrist joint (Hand_<side>);
`HandFrame.to_world` maps back to glTF scene units. At runtime the viewmodel root is scaled
0.52 and the hand 0.85 (fitted-rifle-hands.ts), so one scene unit of hand = 0.442 m.

The field is built from anatomical parts (finger phalanges as tapered round cones, a tapered
and arched palm, thenar/hypothenar pads, the thumb web) blended with smooth unions, plus the glove
construction on top (neoprene cuff, closure tab, moulded knuckle guard). Every part carries
the bone it rides on, so skin weights fall straight out of the same field.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field

import numpy as np

HAND_SCALE = 0.52 * 0.85  # metres per scene unit for anything under Hand_<side>
FINGERS = {"index": 5, "middle": 9, "ring": 13, "little": 17}
THUMB = 20
# Gloved radii (m) at MCP, PIP, DIP, tip for the middle finger; others are scaled.
FINGER_RADII = np.array([0.0096, 0.0092, 0.0085, 0.0077])  # slim enough to sit on the AK without clipping
FINGER_SCALE = {"index": 0.98, "middle": 1.0, "ring": 0.95, "little": 0.84}
# Neoprene cuff: superellipse matching the runtime forearm (n = 2.4), plus wall and clearance.
CUFF_HALF_WIDTH = 0.0338
CUFF_HALF_DEPTH = 0.0236
CUFF_LENGTH = 0.024  # past the wrist joint, towards the elbow
CUFF_START = 0.010  # towards the fingers, where the cuff blends into the hand


def _norm(v):
    return v / np.linalg.norm(v)


def _dot(a, b):
    return np.einsum("...i,...i->...", a, b)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def smax(a, b, k):
    return -smin(-a, -b, k)


def round_cone(p, a, b, r1, r2):
    """Inigo Quilez's exact round-cone distance, vectorised over p (..., 3)."""
    ba = b - a
    l2 = float(ba @ ba)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    w = pa * l2 - y[..., None] * ba
    x2 = _dot(w, w)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d_end = np.sqrt(x2 + z2) * il2 - r2
    d_start = np.sqrt(x2 + y2) * il2 - r1
    d_mid = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    return np.where(np.sign(z) * a2 * z2 > k, d_end, np.where(np.sign(y) * a2 * y2 < k, d_start, d_mid))


def squash(p, origin, axis, n, s):
    """Scale the component of (p - origin) along n (made orthogonal to axis) by 1/s about origin."""
    n = _norm(n - (n @ axis) * axis)
    q = p - origin
    c = q @ n
    return p + ((1.0 / s) - 1.0) * c[..., None] * n


@dataclass
class Part:
    name: str
    bones: dict  # bone name -> weight share
    chain: str  # parts that may blend weights with each other share a chain
    dist: object = field(repr=False)  # p -> distance


class HandFrame:
    """Landmarks of one hand in metres, wrist-centred, with an anatomical frame."""

    def __init__(self, rig: dict, side: str):
        self.side = side
        J = rig["joints"]
        world = lambda name: np.array(J[name]["world"]).reshape(4, 4).T  # column-major -> row
        hand = world(f"Hand_{side}")
        self.wrist_world = hand[:3, 3].copy()
        self.hand_rot = hand[:3, :3] / np.linalg.norm(hand[:3, :3], axis=0)
        self.bind_space = np.array(rig["bindSpace"]).reshape(4, 4).T
        pos = lambda name: (world(name)[:3, 3] - self.wrist_world) * HAND_SCALE
        bone = lambda i: f"Bone_{side}.{i:03d}"
        self.bone = bone
        self.joints = {}
        for finger, base in FINGERS.items():
            self.joints[finger] = [pos(bone(base)), pos(bone(base + 1)), pos(bone(base + 2)), pos(bone(base + 2) + "_end")]
        self.joints["thumb"] = [pos(bone(THUMB)), pos(bone(THUMB + 1)), pos(bone(THUMB + 2)), pos(bone(THUMB + 2) + "_end")]
        # Hand axis: Hand_<side> local +Y points at the fingers; runtime extrudes the forearm along -Y.
        self.along = _norm(self.hand_rot[:, 1])
        mcp = {f: self.joints[f][0] for f in FINGERS}
        across = mcp["index"] - mcp["little"]
        self.across = _norm(across - (across @ self.along) * self.along)  # little -> index (thumb side)
        # Palm side, checked against the posed grips (fingertips wrap toward it on both hands).
        # The bind pose cannot be trusted for this: its left fingers are bent backwards.
        self.palmar = -np.cross(self.along, self.across)
        self.mcp = mcp
        self.bind_joints = {k: [j.copy() for j in v] for k, v in self.joints.items()}
        self.segments = {}  # bone -> (joint in sculpt pose, joint in bind pose, R: sculpt dir -> bind dir)
        self.relax_fingers()

    def relax_fingers(self):
        """Sculpting pose: the rig's bind pose has the fingers clawed and crossing over each other
        and onto the back of the hand. The glove is sculpted (and weighted, and textured) on a
        relaxed, slightly spread hand with the same bone lengths, then skinned into the bind pose
        (to_bind), so no two fingers ever share a surface."""
        centre = np.mean([self.mcp[f] @ self.across for f in FINGERS])
        for finger, base in FINGERS.items():
            j = self.bind_joints[finger]
            lengths = [np.linalg.norm(j[k + 1] - j[k]) for k in range(3)]
            spread = np.radians(9.0) * (self.mcp[finger] @ self.across - centre) / 0.03
            d = _norm(self.along * np.cos(spread) + self.across * np.sin(spread))
            new = [j[0].copy()]
            for k, curl in enumerate((14.0, 22.0, 16.0)):
                c = np.radians(curl)
                d = _norm(d * np.cos(c) + _norm(self.palmar - (self.palmar @ d) * d) * np.sin(c))
                new.append(new[-1] + d * lengths[k])
            self.joints[finger] = new
            for k in range(3):
                a_dir = _norm(new[k + 1] - new[k])
                b_dir = _norm(j[k + 1] - j[k])
                self.segments[self.bone(base + k)] = (new[k], j[k], _rotation_between(a_dir, b_dir))

    def to_bind(self, p, n, bones, weights):
        """Skin sculpt-pose points p / normals n (N,3 metres) into the bind pose."""
        out_p = np.zeros_like(p)
        out_n = np.zeros_like(n)
        for k in range(weights.shape[1]):
            w = weights[:, k][:, None]
            for name in np.unique(bones[:, k]):
                m = bones[:, k] == name
                if not m.any():
                    continue
                if name in self.segments:
                    ja, jb, R = self.segments[name]
                    q = jb + (p[m] - ja) @ R.T
                    nn = n[m] @ R.T
                else:
                    q, nn = p[m], n[m]
                out_p[m] += w[m] * q
                out_n[m] += w[m] * nn
        out_n /= np.linalg.norm(out_n, axis=-1, keepdims=True) + 1e-12
        return out_p, out_n

    def local(self, p):
        """Wrist-centred metres -> (across, along, palmar) coordinates."""
        return np.stack([p @ self.across, p @ self.along, p @ self.palmar], axis=-1)

    def to_world(self, p):
        return self.wrist_world + np.asarray(p) / HAND_SCALE


def _rotation_between(a, b):
    """Rotation matrix taking unit vector a onto unit vector b (minimal rotation)."""
    v = np.cross(a, b)
    c = float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def superellipse(u, v, a, b, n=2.4):
    """Approximate distance to a superellipse |u/a|^n + |v/b|^n = 1 (scaled by the mean radius)."""
    f = (np.abs(u) / a) ** n + (np.abs(v) / b) ** n
    return (f ** (1.0 / n) - 1.0) * np.minimum(a, b)


def build_parts(h: HandFrame):
    parts: list[Part] = []
    hand_bone = f"Hand_{h.side}"
    A, Y, P = h.across, h.along, h.palmar

    # --- Fingers -------------------------------------------------------------------------
    for finger, base in FINGERS.items():
        j = h.joints[finger]
        r = FINGER_RADII * FINGER_SCALE[finger]
        tip_dir = _norm(j[3] - j[2])
        tip = j[3] - tip_dir * r[3] * 0.55
        segs = [(j[0] - _norm(j[1] - j[0]) * 0.006, j[1], r[0], r[1]), (j[1], j[2], r[1], r[2]), (j[2], tip, r[2], r[3])]
        for k, (a, b, ra, rb) in enumerate(segs):
            axis = _norm(b - a)

            def dist(p, a=a, b=b, ra=ra, rb=rb, axis=axis, k=k):
                # Fingers are wider than deep; the pad side is fuller toward the tip.
                q = squash(p, a, axis, P, 1.04 if k < 2 else 1.14)
                return round_cone(q, a, b, ra, rb)

            parts.append(Part(f"{finger}{k}", {h.bone(base + k): 1.0}, finger, dist))

    # --- Thumb ---------------------------------------------------------------------------
    t = h.joints["thumb"]
    thumb_tip = t[3] - _norm(t[3] - t[2]) * 0.0098 * 0.55
    for k, (a, b, ra, rb) in enumerate([(t[0], t[1], 0.0130, 0.0110), (t[1], t[2], 0.0107, 0.0099), (t[2], thumb_tip, 0.0097, 0.0087)]):
        axis = _norm(b - a)

        def dist(p, a=a, b=b, ra=ra, rb=rb, axis=axis):
            return round_cone(squash(p, a, axis, P, 1.1), a, b, ra, rb)

        parts.append(Part(f"thumb{k}", {h.bone(THUMB + k): 1.0}, "thumb", dist))

    # --- Palm: tapered, arched slab between wrist and knuckles ----------------------------
    mcp_y = np.mean([h.mcp[f] @ Y for f in FINGERS])
    mcp_a = [h.mcp[f] @ A for f in FINGERS]
    mcp_p = np.mean([h.mcp[f] @ P for f in FINGERS])
    a_lo, a_hi = min(mcp_a) - 0.004, max(mcp_a) + 0.004

    def palm(p):
        l = h.local(p)
        a, y, pp = l[..., 0], l[..., 1], l[..., 2]
        s = np.clip(y / mcp_y, 0, 1)
        centre_a = (a_lo + a_hi) / 2 + 0.002 * (1 - s)
        half_w = 0.029 + (0.5 * (a_hi - a_lo) - 0.029) * s ** 0.8
        # The back of the hand arches across the metacarpals; the palm cups slightly.
        arch = 0.010 * ((a - centre_a) / 0.04) ** 2
        centre_p = mcp_p * s + 0.002 + arch
        half_d = 0.0118 + 0.0022 * np.sin(np.pi * s)
        du = np.abs(a - centre_a) - half_w
        dv = np.abs(pp - centre_p) - half_d
        dy = np.maximum(-y - 0.004, y - mcp_y - 0.002)
        rr = 0.0095
        q = np.stack([np.maximum(du + rr, 0), np.maximum(dv + rr, 0), np.maximum(dy + rr, 0)], -1)
        return np.linalg.norm(q, axis=-1) + np.minimum(np.maximum(np.maximum(du, dv), dy) + rr, 0) - rr

    parts.append(Part("palm", {hand_bone: 1.0}, "palm", palm))

    # Metacarpal heads: knuckle rounding on the back of the hand.
    for finger in FINGERS:
        c = h.mcp[finger] - P * 0.0015 - Y * 0.004
        r = 0.0098 * FINGER_SCALE[finger] ** 0.5

        def knuckle(p, c=c, r=r):
            return np.linalg.norm(p - c, axis=-1) - r

        parts.append(Part(f"knuckle-{finger}", {hand_bone: 1.0}, "palm", knuckle))

    # Thenar eminence: the thick muscle pad at the base of the thumb, palm side.
    c0 = t[0] * 0.55 + P * 0.006 + A * -0.004
    c1 = t[1] * 0.85 + h.mcp["index"] * 0.0 + P * 0.006

    def thenar(p):
        return round_cone(p, c0, c1, 0.0165, 0.0115)

    parts.append(Part("thenar", {hand_bone: 0.8, h.bone(THUMB): 0.2}, "thumb", thenar))

    # Hypothenar: the pad along the little-finger edge of the palm.
    hy0 = A * (a_lo + 0.006) + Y * 0.012 + P * 0.008
    hy1 = h.mcp["little"] * 0.85 + P * 0.006 + A * -0.002

    def hypothenar(p):
        return round_cone(p, hy0, hy1, 0.0125, 0.0105)

    parts.append(Part("hypothenar", {hand_bone: 1.0}, "palm", hypothenar))

    # Thumb–index web (first dorsal interosseous).
    w0 = t[1] - _norm(t[1] - t[0]) * 0.004
    w1 = h.mcp["index"] - Y * 0.012

    def web(p):
        # A membrane, not a tube: thin palm-to-back, it only fills the crotch of the thumb.
        return round_cone(squash(p, w0, _norm(w1 - w0), P, 1.7), w0, w1, 0.0064, 0.0074)

    parts.append(Part("web", {hand_bone: 0.7, h.bone(THUMB): 0.3}, "thumb", web))

    # --- Neoprene cuff: superellipse tube along -Y from the wrist ----------------------------
    def cuff(p):
        l = h.local(p)
        a, y, pp = l[..., 0], l[..., 1], l[..., 2]
        # Gentle taper into the wrist, a hair of flare at the open end.
        s = np.clip((CUFF_START - y) / (CUFF_START + CUFF_LENGTH), 0, 1)
        grow = 1.0 - 0.035 * s ** 2  # the edge hugs the wrist instead of standing off it
        d = superellipse(a, pp - 0.001, CUFF_HALF_WIDTH * grow, CUFF_HALF_DEPTH * grow)
        dy = np.maximum(y - CUFF_START, -y - CUFF_LENGTH)
        rr = 0.0018
        return np.minimum(np.maximum(d, dy + rr), 0) + np.linalg.norm(np.stack([np.maximum(d + rr, 0), np.maximum(dy + rr, 0)], -1), axis=-1) - rr

    parts.append(Part("cuff", {hand_bone: 1.0}, "palm", cuff))
    return parts, {"mcp_y": mcp_y, "a_lo": a_lo, "a_hi": a_hi, "mcp_p": mcp_p}


# Smooth-union radius per part pair class.
K_FINGER_JOINT = 0.0045
FINGER_GAP = 0.0042
K_FINGER_PALM = 0.007
K_PALM = 0.012


def evaluate(h: HandFrame, parts, info, p, want_parts=False):
    """Full glove field at points p (..., 3). Returns distance (and per-part distances)."""
    d_parts = {part.name: part.dist(p) for part in parts}
    # Fingers: phalanges join with a tight blend, then the finger joins the palm softly.
    raw = []
    for finger in list(FINGERS) + ["thumb"]:
        chain = [d_parts[f"{finger}{k}"] for k in range(3)]
        raw.append(smin(smin(chain[0], chain[1], K_FINGER_JOINT), chain[2], K_FINGER_JOINT))
    # In the clawed bind pose neighbouring fingers overlap. Split every overlap along the
    # bisector with a real gap, so each finger is its own closed surface (squashed flat where
    # it pressed on its neighbour) and nothing bridges two fingers when the IK spreads them.
    fingers = []
    for i, d in enumerate(raw):
        others = np.min(np.stack([raw[j] for j in range(len(raw)) if j != i]), 0)
        fingers.append(np.maximum(d, (d - others + FINGER_GAP) * 0.5))
        d_parts[f"finger-{i}"] = fingers[-1]
    palm = d_parts["palm"]
    for name in ("thenar", "hypothenar", "web"):
        palm = smin(palm, d_parts[name], K_PALM)
    for finger in FINGERS:
        palm = smin(palm, d_parts[f"knuckle-{finger}"], 0.006)
    # The clawed bind pose curls fingertips into the palm: split the outer phalanges from it too.
    order = list(FINGERS) + ["thumb"]
    tip_fields = [np.minimum(d_parts[f"{f}1"], d_parts[f"{f}2"]) for f in order]
    tips = np.min(np.stack(tip_fields), 0)
    # Symmetric bisector split: the fingertip is trimmed where it pressed into the palm and the
    # palm where the fingertip lay on it, leaving a clean gap between them.
    raw_palm = palm
    for i, f in enumerate(order):
        trim = (tip_fields[i] - raw_palm + FINGER_GAP) * 0.5
        fingers[i] = np.where(tip_fields[i] < d_parts[f"{f}0"], np.maximum(fingers[i], trim), fingers[i])
        d_parts[f"finger-{i}"] = fingers[i]
    palm = np.maximum(palm, (palm - tips + FINGER_GAP) * 0.5)
    d_parts["palm-split"] = palm
    # Only the first phalanx blends into the palm; the finger itself joins with a hard union,
    # so no two fingers, and no fingertip and palm, share a surface the IK could tear apart.
    hand = palm
    for f, d in zip(order, fingers):
        hand = np.minimum(hand, np.minimum(smin(palm, np.maximum(d_parts[f"{f}0"], d), K_FINGER_PALM), d))
    body = smin(hand, d_parts["cuff"], 0.014)
    d = glove_features(h, info, p, body, palm, d_parts, tips)
    d_parts["body"] = body
    d_parts["total"] = d
    return (d, d_parts) if want_parts else d


def glove_features(h: HandFrame, info, p, body, palm, d_parts, tips):
    """Raised construction on the glove surface: knuckle guard and cuff closure tab."""
    l = h.local(p)
    a, y, pp = l[..., 0], l[..., 1], l[..., 2]
    mcp_y, a_lo, a_hi = info["mcp_y"], info["a_lo"], info["a_hi"]
    centre = (a_lo + a_hi) / 2
    half = (a_hi - a_lo) / 2 + 0.006
    # Knuckle guard outline on the back of the hand: a rounded band whose front edge scallops
    # between the knuckles and whose rear edge sweeps back toward the wrist in the middle.
    u = (a - centre) / half
    front = mcp_y + 0.006 - 0.004 * np.cos(np.clip(u, -1, 1) * np.pi * 1.5) ** 2
    rear = mcp_y - 0.034 + 0.008 * u ** 2
    outline = np.maximum(np.maximum(y - front, rear - y), np.abs(a - centre) - half)
    dorsal = pp + 0.002  # back of the hand only
    # The moulded guard sits on the palm only, split from any fingertip curled near it.
    shell = palm - 0.0032
    guard = smax(smax(shell, outline, 0.0035), dorsal, 0.004)
    guard = np.maximum(guard, (guard - tips + FINGER_GAP) * 0.5)
    d = smin(body, guard, 0.0012)
    # Short, snug cuff with no strap: the glove simply ends just past the wrist.
    return d


def part_distances(parts, d_parts):
    """Per-part distances (N, parts), with each finger's parts trimmed where the finger was split
    from its neighbour, so a point on the flattened contact face belongs to its own finger."""
    order = list(FINGERS) + ["thumb"]
    cols = []
    for part in parts:
        d = d_parts[part.name]
        if part.chain in order and part.name[-1].isdigit() and f"finger-{order.index(part.chain)}" in d_parts:
            d = np.maximum(d, d_parts[f"finger-{order.index(part.chain)}"])
        elif part.chain == "palm" and part.name != "cuff" and "palm-split" in d_parts:
            d = np.maximum(d, d_parts["palm-split"])
        cols.append(d)
    return np.stack(cols, -1)


def bone_weights(h: HandFrame, parts, d_parts, tau=0.0035, max_influences=4):
    """Per-point weights from the field: soft-min of part distances within the nearest chain."""
    names = [part.name for part in parts]
    D = part_distances(parts, d_parts)
    nearest = np.argmin(D, axis=-1)
    chains = np.array([part.chain for part in parts])
    # A point may blend between parts of its own chain, and between a finger base and the palm.
    # A point blends within its own finger; finger bases and the palm blend with each other, but
    # never one finger with another (they move independently under the IK).
    allowed = chains[None, :] == chains[nearest][:, None]
    base = np.array([part.name.endswith("0") for part in parts])
    palm = chains == "palm"
    near = nearest
    allowed |= (base[near][:, None] & palm[None, :]) | (palm[near][:, None] & base[None, :])
    dmin = D[np.arange(len(D)), nearest]
    # The thumb swings far from its bind pose: spread its blend over the thenar and web so the
    # skin stretches evenly instead of tearing at one row of triangles.
    thumbish = np.isin(chains[nearest], ["thumb"]) | np.isin(np.array(names)[nearest], ["palm", "hypothenar"])
    t = np.where(thumbish, tau * 2.6, tau)[:, None]
    W = np.where(allowed, np.exp(-(D - dmin[:, None]) / t), 0.0)
    # Raised construction (knuckle guard, cuff strap and tab) rides the hand bone only.
    if "body" in d_parts:
        on_feature = d_parts["body"] - d_parts["total"] > 0.0008
        hand_col = np.array([part.name == "palm" for part in parts])
        W[on_feature] = hand_col.astype(float)
    W /= W.sum(-1, keepdims=True)
    bones: dict[str, np.ndarray] = {}
    for i, part in enumerate(parts):
        for bone, share in part.bones.items():
            bones[bone] = bones.get(bone, 0) + W[:, i] * share
    names_b = list(bones)
    B = np.stack([bones[b] for b in names_b], -1)
    order = np.argsort(-B, axis=-1)[:, :max_influences]
    top = np.take_along_axis(B, order, -1)
    top[top < 0.02] = 0
    top /= top.sum(-1, keepdims=True)
    return names_b, order, top


def grid_field(h: HandFrame, parts, info, voxel, pad=0.012, chunk=2_000_000):
    """Dense field on an axis-aligned grid (in the wrist-centred metre frame)."""
    pts = np.concatenate([np.array(v) for v in h.joints.values()])
    cuff_end = -h.along * CUFF_LENGTH
    corners = []
    for sa in (-1, 1):
        for sp in (-1, 1):
            corners.append(cuff_end + sa * h.across * CUFF_HALF_WIDTH * 1.1 + sp * h.palmar * CUFF_HALF_DEPTH * 1.1)
    pts = np.concatenate([pts, np.array(corners), [np.zeros(3)]])
    lo = pts.min(0) - 0.03 - pad
    hi = pts.max(0) + 0.03 + pad
    shape = np.ceil((hi - lo) / voxel).astype(int) + 1
    axes = [lo[i] + np.arange(shape[i]) * voxel for i in range(3)]
    out = np.empty(shape, np.float32)
    nyz = shape[1] * shape[2]
    step = max(1, chunk // nyz)
    Yg, Zg = np.meshgrid(axes[1], axes[2], indexing="ij")
    for i0 in range(0, shape[0], step):
        xs = axes[0][i0 : i0 + step]
        P = np.stack(np.broadcast_arrays(xs[:, None, None], Yg[None], Zg[None]), -1).reshape(-1, 3)
        out[i0 : i0 + len(xs)] = evaluate(h, parts, info, P).reshape(len(xs), shape[1], shape[2])
    return out, lo


def surface(h: HandFrame, voxel):
    from skimage import measure

    parts, info = build_parts(h)
    field_, lo = grid_field(h, parts, info, voxel)
    verts, faces, normals, _ = measure.marching_cubes(field_, 0.0, spacing=(voxel,) * 3, allow_degenerate=False)
    verts = verts + lo
    return verts, faces, parts, info


def load_rig(path):
    with open(path) as f:
        return json.load(f)
