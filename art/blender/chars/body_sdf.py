"""
Signed-distance clothed bodies for the Terrorist and Police characters (numpy, no Blender).

The clothed figure is one smooth field: a lofted superellipse torso (chest, waist, pelvis),
deltoid and trapezius masses, sleeves and trouser legs as tapered capsules along the
skeleton, cuffs, knee and seat volume, boots and gloved hands closed in a grip. Each part
also reports its own distance so the mesher can assign fabric/boot/glove/skin materials and
the skinner can weight by the nearest bone. Role styles change cut and fit: the police
uniform is fitted with a bloused trouser over boots; the insurgent wears a looser jacket and
baggier cargo trousers with low tactical shoes.
"""
import numpy as np
from skeleton import joints

J = {k: np.array(v, float) for k, v in joints().items()}


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def round_cone(p, a, b, r1, r2):
    """Capsule with linearly varying radius from a (r1) to b (r2)."""
    ba = b - a
    l2 = ba @ ba
    t = np.clip(((p - a) @ ba) / l2, 0, 1)
    q = p - (a + t[:, None] * ba)
    return np.linalg.norm(q, axis=1) - (r1 + (r2 - r1) * t)


def ellipsoid(p, c, r):
    q = (p - c) / r
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / r, axis=1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)


def round_box(p, c, half, r):
    q = np.abs(p - c) - (half - r)
    return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(q.max(1), 0) - r


def loft(p, prof, n=2.4):
    """Torso: superellipse cross-sections (a = half width x, b = half depth y, c = centre y)."""
    z = p[:, 2]
    zs, a, b, c = (np.array(v) for v in zip(*prof))
    A = np.interp(z, zs, a)
    B = np.interp(z, zs, b)
    C = np.interp(z, zs, c)
    x = np.abs(p[:, 0]) / A
    y = np.abs(p[:, 1] - C) / B
    rho = (x**n + y**n) ** (1 / n)
    d = (rho - 1) * np.minimum(A, B) * 0.92
    d = smax(d, zs[0] - z, 0.02)
    return smax(d, z - zs[-1], 0.03)


# ------------------------------------------------------------------------------------ styles
STYLES = {
    "police": {
        # Fitted uniform shirt over a lean athletic torso.
        "torso": [
            (0.86, 0.150, 0.105, 0.005), (0.95, 0.168, 0.112, 0.004), (1.04, 0.152, 0.100, 0.002),
            (1.14, 0.158, 0.106, -0.004), (1.25, 0.178, 0.116, -0.010), (1.34, 0.188, 0.116, -0.008),
            (1.42, 0.180, 0.104, 0.000), (1.47, 0.085, 0.072, 0.008),
        ],
        "sleeve": (0.056, 0.046, 0.042, 0.035),  # upper start/end, forearm start/end radii
        "thigh": (0.090, 0.064), "shin": (0.062, 0.050),
        "hem": 0.20,  # trousers bloused into boots at this height
        "boot_top": 0.22,
        "baggy": 0.0,
    },
    "terrorist": {
        # Looser field jacket, slightly bulkier through the chest and waist.
        "torso": [
            (0.86, 0.156, 0.110, 0.005), (0.95, 0.174, 0.118, 0.004), (1.04, 0.162, 0.110, 0.0),
            (1.14, 0.168, 0.114, -0.004), (1.25, 0.184, 0.122, -0.010), (1.34, 0.192, 0.120, -0.008),
            (1.42, 0.184, 0.108, 0.000), (1.47, 0.088, 0.075, 0.008),
        ],
        "sleeve": (0.060, 0.051, 0.047, 0.039),
        "thigh": (0.096, 0.070), "shin": (0.068, 0.058),
        "hem": 0.12,  # trousers break over low tactical shoes
        "boot_top": 0.13,
        "baggy": 1.0,
    },
}


def gloved_hand(p, side):
    """Gloved hand closed in a weapon grip: palm block plus four curled fingers and a thumb."""
    s = 1 if side == "Left" else -1
    h0, h1 = J[f"{side}Hand"], J[f"{side}HandEnd"]
    ax = (h1 - h0) / np.linalg.norm(h1 - h0)  # along the hand
    out = np.array([s * 1.0, 0, 0.0])
    out = out - ax * (out @ ax)
    out /= np.linalg.norm(out)  # back of the hand faces outward
    fwd = np.cross(ax, out) * s  # thumb side (toward the front)
    palm_c = h0 + ax * 0.045
    # Palm: a rounded slab, wider than deep.
    q = p - palm_c
    local = np.stack([q @ fwd, q @ out, q @ ax], 1)
    d = round_box(local, np.zeros(3), np.array([0.042, 0.019, 0.05]), 0.016)
    # Fingers curl from the knuckle line toward the palm side, round a ~2 cm grip.
    for k, off in enumerate((0.03, 0.01, -0.01, -0.028)):
        base = palm_c + ax * 0.05 + fwd * off
        r = 0.0095 - k * 0.0006
        a = base
        b = base + ax * 0.026 - out * 0.012
        c = b - out * 0.026 + ax * 0.004
        e = c - ax * 0.018 - out * 0.004
        d = smin(d, round_cone(p, a, b, r, r * 0.95), 0.006)
        d = smin(d, round_cone(p, b, c, r * 0.95, r * 0.9), 0.004)
        d = smin(d, round_cone(p, c, e, r * 0.9, r * 0.85), 0.004)
    t0 = palm_c + fwd * 0.04 - ax * 0.02
    t1 = t0 + fwd * 0.012 + ax * 0.03 - out * 0.01
    t2 = t1 + ax * 0.026 - out * 0.016
    d = smin(d, round_cone(p, t0, t1, 0.013, 0.011), 0.008)
    d = smin(d, round_cone(p, t1, t2, 0.011, 0.009), 0.004)
    # Cuff: a short flared gauntlet over the sleeve end.
    d = smin(d, round_cone(p, h0 - ax * 0.035, h0 + ax * 0.01, 0.040, 0.036), 0.01)
    return d


def boot(p, side, style):
    s = 1 if side == "Left" else -1
    foot, toe = J[f"{side}Foot"], J[f"{side}Toe_End"]
    # Foot volume: heel to toe on the ground, tapered toward the toe box.
    heel = np.array([foot[0], foot[1] + 0.035, 0.045])
    toe_c = np.array([toe[0] - s * 0.004, toe[1] + 0.03, 0.04])
    d = round_cone(p, heel, toe_c, 0.050, 0.044)
    d = smax(d, -p[:, 2], 0.004)  # flat sole on the ground
    d = smax(d, p[:, 2] - 0.115, 0.03)
    # Ankle shaft up to the boot top.
    shaft = round_cone(p, np.array([foot[0], foot[1] + 0.01, 0.06]), np.array([foot[0], foot[1] + 0.0, style["boot_top"]]),
                       0.052, 0.050)
    d = smin(d, shaft, 0.03)
    return d


def body_parts(p, role):
    st = STYLES[role]
    parts = {}
    torso = loft(p, st["torso"])
    for side, s in (("Left", 1), ("Right", -1)):
        # Shoulder/deltoid and trapezius slope.
        delt = ellipsoid(p, J[f"{side}Arm"] + np.array([s * 0.005, 0.0, 0.0]), np.array([0.07, 0.068, 0.066]))
        trap = round_cone(p, np.array([s * 0.06, 0.012, 1.465]), J[f"{side}Arm"] + np.array([-s * 0.02, 0.01, 0.02]), 0.045, 0.05)
        torso = smin(torso, smin(delt, trap, 0.04), 0.045)
    parts["top"] = torso
    sl = st["sleeve"]
    for side in ("Left", "Right"):
        up = round_cone(p, J[f"{side}Arm"], J[f"{side}ForeArm"], sl[0], sl[1])
        fo = round_cone(p, J[f"{side}ForeArm"], J[f"{side}Hand"] - (J[f"{side}HandEnd"] - J[f"{side}Hand"]) * 0.12, sl[2], sl[3])
        # Bicep and forearm muscle mass under the sleeve.
        mid = J[f"{side}Arm"] * 0.55 + J[f"{side}ForeArm"] * 0.45
        up = smin(up, ellipsoid(p, mid, np.array([0.058, 0.06, 0.06]) * (1 + 0.06 * st["baggy"])), 0.03)
        fmid = J[f"{side}ForeArm"] * 0.7 + J[f"{side}Hand"] * 0.3
        fo = smin(fo, ellipsoid(p, fmid, np.array([0.05, 0.05, 0.05])), 0.03)
        parts[f"sleeve{side}"] = smin(up, fo, 0.025)
        parts[f"glove{side}"] = gloved_hand(p, side)
        th = st["thigh"]
        sh = st["shin"]
        thigh = round_cone(p, J[f"{side}UpLeg"] + np.array([0, 0, 0.03]), J[f"{side}Leg"], th[0], th[1])
        knee = ellipsoid(p, J[f"{side}Leg"] + np.array([0, -0.01, 0]), np.array([0.064, 0.066, 0.07]) * (1 + 0.08 * st["baggy"]))
        shin_end = np.array([J[f"{side}Foot"][0], J[f"{side}Foot"][1], st["hem"]])
        shin = round_cone(p, J[f"{side}Leg"], shin_end, sh[0], sh[1])
        calf = ellipsoid(p, J[f"{side}Leg"] * 0.62 + shin_end * 0.38 + np.array([0, 0.018, 0]), np.array([0.056, 0.058, 0.09]))
        leg = smin(smin(thigh, knee, 0.04), smin(shin, calf, 0.035), 0.03)
        if st["baggy"]:
            # Cargo pocket volume on the outer thigh.
            pocket = round_box(p, J[f"{side}UpLeg"] * 0.45 + J[f"{side}Leg"] * 0.55 + np.array([0.065 * (1 if side == "Left" else -1), -0.01, 0.0]),
                               np.array([0.03, 0.06, 0.085]), 0.02)
            leg = smin(leg, pocket, 0.02)
        parts[f"leg{side}"] = leg
        parts[f"boot{side}"] = boot(p, side, st)
    # Seat and crotch volume joining the legs to the pelvis.
    parts["pelvis"] = smin(ellipsoid(p, np.array([0, 0.015, 0.90]), np.array([0.165, 0.12, 0.10])),
                           round_cone(p, np.array([0, 0, 0.84]), np.array([0, 0, 0.98]), 0.11, 0.13), 0.04)
    parts["neck"] = round_cone(p, J["Neck"] + np.array([0, 0, -0.03]), J["Head"] + np.array([0, -0.005, 0.0]), 0.06, 0.054)
    # Mock-neck collar of the shirt/jacket: the game's realistic head tucks its neck into it.
    parts["collar"] = smax(round_cone(p, J["Neck"] + np.array([0, 0, -0.04]), J["Neck"] + np.array([0, -0.004, 0.085]), 0.08, 0.07),
                           p[:, 2] - (J["Neck"][2] + 0.085), 0.006)
    return parts


GROUPS = {
    "top": ["top", "sleeveLeft", "sleeveRight", "collar"],
    "pants": ["pelvis", "legLeft", "legRight"],
    "boots": ["bootLeft", "bootRight"],
    "gloves": ["gloveLeft", "gloveRight"],
    "skin": ["neck"],
}


def field(p, role):
    parts = body_parts(p, role)
    d = parts["top"]
    for side in ("Left", "Right"):
        d = smin(d, parts[f"sleeve{side}"], 0.03)
    legs = smin(parts["legLeft"], parts["legRight"], 0.02)
    lower = smin(legs, parts["pelvis"], 0.05)
    d = smin(d, lower, 0.04)
    for side in ("Left", "Right"):
        d = smin(d, parts[f"boot{side}"], 0.015)
        d = smin(d, parts[f"glove{side}"], 0.012)
    # The bare neck is the realistic head's own (it tucks into the collar), so the body ends
    # at the collar's flat top instead of carrying a second, mismatched skin neck.
    d = smin(d, parts["collar"], 0.02)
    # Fabric: a little low-frequency drape so large panels are not mathematically smooth.
    wob = (np.sin(p[:, 0] * 41 + p[:, 2] * 13) * np.sin(p[:, 1] * 37 - p[:, 2] * 29)) * 0.0012
    return d + wob, parts


def labels(p, role):
    _, parts = field(p, role)
    names = list(GROUPS)
    dist = np.stack([np.min(np.stack([parts[k] for k in GROUPS[g]]), 0) for g in names], 1)
    lab = np.argmin(dist, 1)
    # The trousers start at the belt line; above it the torso field is the shirt/jacket.
    z = p[:, 2]
    top_i, pants_i = names.index("top"), names.index("pants")
    lab = np.where((lab == top_i) & (z < 0.985), pants_i, lab)
    lab = np.where((lab == pants_i) & (z > 1.0) & (np.abs(p[:, 0]) < 0.25), top_i, lab)
    lab = np.where(lab == names.index("skin"), top_i, lab)
    return [names[i] for i in lab]


def grid_mesh(role, voxel=0.006):
    from skimage import measure
    lo = np.array([-0.78, -0.28, -0.01])
    hi = np.array([0.78, 0.28, 1.62])
    n = np.ceil((hi - lo) / voxel).astype(int) + 1
    xs, ys, zs = (np.linspace(lo[i], lo[i] + (n[i] - 1) * voxel, n[i]) for i in range(3))
    vol = np.empty(tuple(n), np.float32)
    for i in range(0, n[0], 24):
        X, Y, Z = np.meshgrid(xs[i:i + 24], ys, zs, indexing="ij")
        pts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
        vol[i:i + 24] = field(pts, role)[0].reshape(X.shape)
    verts, faces, normals, _ = measure.marching_cubes(vol, 0.0, spacing=(voxel,) * 3, allow_degenerate=False)
    verts += lo
    return verts, faces
