"""
Shared humanoid skeleton for the PvPStrike Terrorist and Police characters.

Bone names match the Mixamo convention the game's procedural animation already drives
(authored-character.ts: Hips, Spine*, Neck, Head, HeadTop_End, Left/Right Shoulder, Arm,
ForeArm, Hand, UpLeg, Leg, Foot, ToeBase, Toe_End), so idle/stride/strafe/jump/crouch, the
two-bone leg IK and the weapon-grip arm IK work unchanged.

Coordinates are Blender metres: z up, the character faces -Y (glTF +Z, like Mixamo), the
character's left is +X. Rest pose is an A-pose (arms 45° down), which skins shoulders far
better than a T-pose. Proportions follow an adult male of 1.80 m; the game rescales so the
head centre sits on the 1.6 m head hitbox (CS:GO-like eye height, ≈1.72 m crown).
"""
import math

A = math.radians(45)
_d = (math.cos(A), 0.0, -math.sin(A))


def _add(p, d, s):
    return (p[0] + d[0] * s, p[1] + d[1] * s, p[2] + d[2] * s)


def joints():
    j = {
        "Hips": (0.0, 0.0, 0.98),
        "Spine": (0.0, 0.0, 1.06),
        "Spine1": (0.0, 0.0, 1.18),
        "Spine2": (0.0, 0.0, 1.30),
        "Neck": (0.0, 0.01, 1.48),
        "Head": (0.0, 0.0, 1.575),
        "HeadTop_End": (0.0, 0.0, 1.80),
    }
    for side, s in (("Left", 1), ("Right", -1)):
        d = (_d[0] * s, _d[1], _d[2])
        shoulder = (0.035 * s, 0.0, 1.44)
        arm = (0.175 * s, 0.01, 1.43)
        fore = _add(arm, d, 0.295)
        hand = _add(fore, d, 0.255)
        j.update({
            f"{side}Shoulder": shoulder,
            f"{side}Arm": arm,
            f"{side}ForeArm": fore,
            f"{side}Hand": hand,
            f"{side}HandEnd": _add(hand, d, 0.17),
            f"{side}UpLeg": (0.095 * s, 0.0, 0.935),
            f"{side}Leg": (0.102 * s, -0.008, 0.505),
            f"{side}Foot": (0.106 * s, 0.02, 0.088),
            f"{side}ToeBase": (0.108 * s, -0.105, 0.022),
            f"{side}Toe_End": (0.108 * s, -0.19, 0.022),
        })
    return j


# (bone, head joint, tail joint, parent)
BONES = [
    ("Hips", "Hips", "Spine", None),
    ("Spine", "Spine", "Spine1", "Hips"),
    ("Spine1", "Spine1", "Spine2", "Spine"),
    ("Spine2", "Spine2", "Neck", "Spine1"),
    ("Neck", "Neck", "Head", "Spine2"),
    ("Head", "Head", "HeadTop_End", "Neck"),
    ("HeadTop_End", "HeadTop_End", None, "Head"),
]
for _side in ("Left", "Right"):
    BONES += [
        (f"{_side}Shoulder", f"{_side}Shoulder", f"{_side}Arm", "Spine2"),
        (f"{_side}Arm", f"{_side}Arm", f"{_side}ForeArm", f"{_side}Shoulder"),
        (f"{_side}ForeArm", f"{_side}ForeArm", f"{_side}Hand", f"{_side}Arm"),
        (f"{_side}Hand", f"{_side}Hand", f"{_side}HandEnd", f"{_side}ForeArm"),
        (f"{_side}UpLeg", f"{_side}UpLeg", f"{_side}Leg", "Hips"),
        (f"{_side}Leg", f"{_side}Leg", f"{_side}Foot", f"{_side}UpLeg"),
        (f"{_side}Foot", f"{_side}Foot", f"{_side}ToeBase", f"{_side}Leg"),
        (f"{_side}ToeBase", f"{_side}ToeBase", f"{_side}Toe_End", f"{_side}Foot"),
        (f"{_side}Toe_End", f"{_side}Toe_End", None, f"{_side}ToeBase"),
    ]
