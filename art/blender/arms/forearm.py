"""
The runtime forearm surface (src/lib/fps/fitted-rifle-hands.ts: forearmRadius), in Python, so
accessories authored here sit exactly on the arm the game builds.

Authoring frame (Blender, metres): +X thumb side, +Y along the forearm toward the elbow
(0 = wrist joint), +Z back of the arm (dorsal). glTF export turns that into the runtime's
canonical arm space (x thumb, y dorsal, z toward the hand), and wrapOntoForearm() bends it onto
each posed arm (the left arm's posed frame has the canonical handedness; the right is mirrored).
"""
import numpy as np

PROFILE = [(0, 0.0318, 0.0207), (0.18, 0.0329, 0.0217), (0.42, 0.0392, 0.0276), (0.68, 0.0472, 0.035), (0.86, 0.0493, 0.0376), (1, 0.0461, 0.0392)]
RADIAL_BULGE = 0.0055
RADIAL_MASS = 0.35
GLOVE_CUFF_LENGTH = 0.024
# Typical posed wrist→elbow path length (m); t = along / LENGTH.
LENGTH = 0.335


def smoothstep(x, a, b):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def profile(t):
    t = np.clip(np.asarray(t, float), 0, 1)
    w = np.zeros_like(t)
    d = np.zeros_like(t)
    for (t0, w0, d0), (t1, w1, d1) in zip(PROFILE, PROFILE[1:]):
        m = (t >= t0) & (t <= t1)
        k = smoothstep(t[m], t0, t1)
        w[m] = w0 + (w1 - w0) * k
        d[m] = d0 + (d1 - d0) * k
    return w, d


def twist(t):
    return -0.32 * smoothstep(t, 0.15, 1)


def radius(t, theta):
    """Surface radius (m) at length fraction t and angle theta (0 thumb, pi/2 dorsal)."""
    t = np.asarray(t, float)
    theta = np.asarray(theta, float)
    w, d = profile(t)
    local = theta - twist(t)
    r = 1 / ((np.abs(np.cos(local)) / w) ** 2.4 + (np.abs(np.sin(local)) / d) ** 2.4) ** (1 / 2.4)
    bulge = RADIAL_BULGE * np.exp(-(((t - 0.74) / 0.2) ** 2)) * np.maximum(0, np.cos(theta - RADIAL_MASS)) ** 3
    groove = 0.0018 * np.maximum(0, np.cos(theta - np.pi)) ** 6 * smoothstep(t, 0.2, 0.6)
    return r + bulge - groove


def surface_point(along, theta, offset=0.0):
    """Point on (or `offset` m outside) the arm, authoring frame."""
    t = np.asarray(along, float) / LENGTH
    r = radius(t, theta) + offset
    return np.stack([np.cos(theta) * r, np.asarray(along, float) * np.ones_like(r), np.sin(theta) * r], -1)
