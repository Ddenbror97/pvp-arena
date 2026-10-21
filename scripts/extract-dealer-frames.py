"""Cut both dealer sprite sheets into aligned transparent frames.

The sheets already have a real alpha channel. This script does not invent
pixels and does not repaint the background. It separates poses on measured
head gaps, keeps the largest subject in each cell, and places every pose on
one canvas so the crown and the head center stay put.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/poker/dealer"
FRAMES = OUT / "frames"
SOURCE = OUT / "source"
# Originals live next to the frames. The attachment paths are only a fallback
# for a checkout that has not copied them in yet.
ATTACH = {
    "a": Path("/home/ubuntu/.cursor/projects/workspace/assets/713c07c6-83e5-4f87-ad83-848ff36ea482.png"),
    "b": Path("/home/ubuntu/.cursor/projects/workspace/assets/730f8985-7836-454e-b593-5da9490feb2e.png"),
}


def sheet_file(sheet_id: str) -> Path:
    local = SOURCE / f"sheet-{sheet_id}.png"
    if local.exists():
        return local
    attach = ATTACH[sheet_id]
    if not attach.exists():
        raise SystemExit(f"missing dealer sheet {sheet_id}: {local}")
    SOURCE.mkdir(parents=True, exist_ok=True)
    Image.open(attach).save(local)
    return local

# Head x-spans measured on a band where neighboring hair does not bridge.
# y bands are the solid body of each row, from the eroded-mask split.
SHEETS = [
    {
        "id": "a",
        "path": sheet_file("a"),
        "rows": [
            {
                "y0": 0,
                "y1": 668,
                "heads": [(19, 259), (276, 521), (533, 774), (780, 1022), (1034, 1263)],
                "names": [
                    "idle",
                    "wink",
                    "shuffle-look",
                    "deal-center",
                    "deal-side",
                ],
            },
            {
                "y0": 668,
                "y1": 1240,
                "heads": [(31, 264), (287, 515), (540, 763), (794, 1010), (1043, 1264)],
                "names": [
                    "cards-fan",
                    "waiting",
                    "celebrate",
                    "disappointed",
                    "point",
                ],
            },
        ],
    },
    {
        "id": "b",
        "path": sheet_file("b"),
        "rows": [
            {
                "y0": 0,
                "y1": 358,
                "heads": [(67, 216), (288, 435), (527, 678), (798, 948), (1012, 1161), (1205, 1350)],
                "names": [
                    "shuffle-01",
                    "shuffle-02",
                    "shuffle-03",
                    "shuffle-04",
                    "shuffle-05",
                    "deal-reach",
                ],
            },
            {
                "y0": 358,
                "y1": 708,
                "heads": [
                    (8, 204),
                    (218, 411),
                    (448, 643),
                    (668, 862),
                    (894, 1111),
                    (1135, 1348),
                    (1352, 1535),
                ],
                "names": [
                    "deal-02",
                    "deal-03",
                    "deal-04",
                    "deal-05",
                    "deal-06",
                    "deal-square",
                    "cards-fan-b",
                ],
            },
            {
                "y0": 708,
                "y1": 1024,
                "heads": [
                    (36, 177),
                    (223, 366),
                    (414, 550),
                    (602, 739),
                    (801, 936),
                    (992, 1128),
                    (1177, 1315),
                    (1370, 1509),
                ],
                "names": [
                    "fan-b2",
                    "wait-b2",
                    "point-b2",
                    "thoughtful",
                    "celebrate-b2",
                    "playful",
                    "playful-2",
                    "blow-kiss",
                ],
            },
        ],
    },
]


def label_largest(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    labels = np.zeros((h, w), np.int32)
    parent = [0]

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    nid = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x]:
                continue
            left = labels[y, x - 1] if x else 0
            up = labels[y - 1, x] if y else 0
            if left and up:
                a, b = find(left), find(up)
                if a != b:
                    parent[max(a, b)] = min(a, b)
                labels[y, x] = min(a, b)
            elif left or up:
                labels[y, x] = left or up
            else:
                nid += 1
                parent.append(nid)
                parent[nid] = nid
                labels[y, x] = nid
    if nid == 0:
        return np.zeros_like(mask)
    counts: dict[int, int] = {}
    ys, xs = np.nonzero(labels)
    roots = np.empty(len(ys), np.int32)
    for i, (y, x) in enumerate(zip(ys, xs)):
        r = find(int(labels[y, x]))
        roots[i] = r
        counts[r] = counts.get(r, 0) + 1
    keep = max(counts, key=counts.get)
    out = np.zeros_like(mask)
    for i, (y, x) in enumerate(zip(ys, xs)):
        if roots[i] == keep:
            out[y, x] = True
    return out


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    m = mask
    for _ in range(radius):
        p = np.pad(m, 1, constant_values=False)
        m = p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | p[1:-1, 1:-1]
    return m


def cells_for(width: int, heads: list[tuple[int, int]]) -> list[tuple[int, int]]:
    centers = [((a + b) / 2) for a, b in heads]
    bounds = [0]
    for c0, c1 in zip(centers, centers[1:]):
        bounds.append(int(round((c0 + c1) / 2)))
    bounds.append(width)
    return list(zip(bounds, bounds[1:]))


def extract_cell(image: Image.Image, box: tuple[int, int, int, int]) -> tuple[Image.Image, dict]:
    x0, y0, x1, y1 = box
    crop = image.crop((x0, y0, x1, y1)).convert("RGBA")
    arr = np.array(crop)
    alpha = arr[:, :, 3]
    core = label_largest(alpha > 24)
    keep = dilate(core, 2)
    # Drop anything outside the subject, including a neighbor clipped into the cell.
    arr[:, :, 3] = np.where(keep, alpha, 0)
    # A cut through a neighbor leaves a hard edge. If the subject itself touches
    # the cell side, record it so a bad split is visible in the manifest.
    touch_l = int(core[:, :3].sum()) if core.shape[1] > 3 else 0
    touch_r = int(core[:, -3:].sum()) if core.shape[1] > 3 else 0
    ys, xs = np.nonzero(core)
    if len(xs) == 0:
        raise RuntimeError(f"empty cell {box}")
    crown = int(ys.min())
    # Head center: opaque pixels in the top portion of the figure, which is hair
    # and face, not the arms.
    top = ys.min() + max(8, int((ys.max() - ys.min()) * 0.22))
    head_mask = core.copy()
    head_mask[top + 1 :, :] = False
    hys, hxs = np.nonzero(head_mask)
    if len(hxs) < 10:
        hxs, hys = xs, ys
    anchor_x = float(np.median(hxs))
    anchor_y = float(crown)
    # Face width at the lower end of the head band, for scale matching.
    band_y = min(int(np.percentile(hys, 80)), core.shape[0] - 1)
    face_w = int(core[max(0, band_y - 2) : band_y + 3].any(axis=0).sum())
    out = Image.fromarray(arr, "RGBA")
    return out, {
        "anchor": [anchor_x, anchor_y],
        "faceWidth": face_w,
        "touchLeft": touch_l,
        "touchRight": touch_r,
        "opaque": int((alpha_of(arr) > 16).sum()),
    }


def alpha_of(arr: np.ndarray) -> np.ndarray:
    return arr[:, :, 3]


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        for x in range(w):
            dark = ((x // cell) + (y // cell)) % 2 == 0
            px[x, y] = (28, 28, 32, 255) if dark else (210, 210, 214, 255)
    return img


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)
    raw: list[dict] = []
    for sheet in SHEETS:
        image = Image.open(sheet["path"]).convert("RGBA")
        # Preserve the source sheets next to the frames.
        dest = SOURCE / f"sheet-{sheet['id']}.png"
        if not dest.exists():
            image.save(dest)
        width, _height = image.size
        for row_i, row in enumerate(sheet["rows"]):
            spans = cells_for(width, row["heads"])
            if len(spans) != len(row["names"]):
                raise SystemExit(f"{sheet['id']} row {row_i}: {len(spans)} cells, {len(row['names'])} names")
            for name, (x0, x1), head in zip(row["names"], spans, row["heads"]):
                frame, meta = extract_cell(image, (x0, row["y0"], x1, row["y1"]))
                meta.update(
                    {
                        "id": name,
                        "sheet": sheet["id"],
                        "row": row_i,
                        "sourceBox": [x0, row["y0"], x1, row["y1"]],
                        "head": list(head),
                        "image": frame,
                    }
                )
                raw.append(meta)
                print(
                    f"{name:16} {frame.size} face {meta['faceWidth']:3d} "
                    f"touch {meta['touchLeft']:4d}/{meta['touchRight']:4d} opaque {meta['opaque']}"
                )

    a_face = np.median([r["faceWidth"] for r in raw if r["sheet"] == "a" and r["faceWidth"] > 8])
    b_face = np.median([r["faceWidth"] for r in raw if r["sheet"] == "b" and r["faceWidth"] > 8])
    scale_b = float(a_face / b_face) if b_face else 1
    print(f"scale B by {scale_b:.3f} so face width {b_face:.1f} matches A {a_face:.1f}")

    placed = []
    for rec in raw:
        scale = scale_b if rec["sheet"] == "b" else 1.0
        img: Image.Image = rec["image"]
        if abs(scale - 1) > 0.01:
            img = img.resize(
                (max(1, int(round(img.width * scale))), max(1, int(round(img.height * scale)))),
                Image.Resampling.LANCZOS,
            )
        ax = rec["anchor"][0] * scale
        ay = rec["anchor"][1] * scale
        placed.append({**rec, "scaled": img, "ax": ax, "ay": ay, "scale": scale})

    # Common canvas: every crown and head center lands on the same point.
    min_x = min(p["ax"] - 0 for p in placed)  # placeholder
    left = max(p["ax"] for p in placed)
    right = max(p["scaled"].width - p["ax"] for p in placed)
    up = max(p["ay"] for p in placed)
    down = max(p["scaled"].height - p["ay"] for p in placed)
    pad = 2
    canvas_w = int(np.ceil(left + right + pad * 2))
    canvas_h = int(np.ceil(up + down + pad * 2))
    origin_x = pad + left
    origin_y = pad + up
    print("canvas", canvas_w, canvas_h, "anchor", origin_x, origin_y)

    manifest_frames = []
    canvases = []
    for p in placed:
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        ox = int(round(origin_x - p["ax"]))
        oy = int(round(origin_y - p["ay"]))
        canvas.alpha_composite(p["scaled"], (ox, oy))
        # A one-pixel bridge from a neighbor is already gone. Drop anything that
        # is still disconnected from the body, such as a stray column.
        arr = np.array(canvas)
        body = label_largest(arr[:, :, 3] > 16)
        if int((~body & (arr[:, :, 3] > 16)).sum()) > 0:
            arr[:, :, 3] = np.where(body, arr[:, :, 3], 0)
            canvas = Image.fromarray(arr, "RGBA")
        out_path = FRAMES / f"{p['id']}.webp"
        canvas.save(out_path, "WEBP", quality=88, method=6)
        canvases.append(canvas)
        manifest_frames.append(
            {
                "id": p["id"],
                "sheet": p["sheet"],
                "file": f"frames/{p['id']}.webp",
                "sourceBox": p["sourceBox"],
                "head": p["head"],
                "scale": round(p["scale"], 4),
                "anchor": [round(origin_x, 2), round(origin_y, 2)],
                "offset": [ox, oy],
                "touchLeft": p["touchLeft"],
                "touchRight": p["touchRight"],
                "opaque": p["opaque"],
            }
        )
        # Flag a hard cut: a lot of subject pixels in the outer 3px means the
        # cell boundary sliced the body rather than a gap.
        if p["touchLeft"] > 40 or p["touchRight"] > 40:
            print(f"  WARN edge contact {p['id']} L{p['touchLeft']} R{p['touchRight']}")

    manifest = {
        "canvas": {"w": canvas_w, "h": canvas_h},
        "anchor": [round(origin_x, 2), round(origin_y, 2)],
        "scale": {"a": 1, "b": round(scale_b, 4)},
        "frames": manifest_frames,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))

    # Contact sheet: checkerboard and the dark table color.
    cols = 7
    thumb_w = 180
    thumb_h = int(thumb_w * canvas_h / canvas_w)
    rows = int(np.ceil(len(canvases) / cols))
    sheet_w = cols * thumb_w
    sheet_h = rows * (thumb_h + 22)
    for label, bg in (
        ("checker", None),
        ("felt", (18, 10, 40, 255)),
    ):
        board = Image.new("RGBA", (sheet_w, sheet_h), (12, 8, 24, 255))
        draw = ImageDraw.Draw(board)
        for i, (canvas, rec) in enumerate(zip(canvases, manifest_frames)):
            c, r = i % cols, i // cols
            x, y = c * thumb_w, r * (thumb_h + 22)
            cell_bg = checker((thumb_w, thumb_h), 10) if bg is None else Image.new("RGBA", (thumb_w, thumb_h), bg)
            thumb = canvas.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            cell_bg.alpha_composite(thumb)
            board.alpha_composite(cell_bg, (x, y))
            draw.text((x + 4, y + thumb_h + 4), rec["id"], fill=(235, 230, 255, 255))
        board.convert("RGB").save(OUT / f"contact-{label}.webp", "WEBP", quality=80, method=6)
        board.convert("RGB").save(f"/tmp/dealer-contact-{label}.jpg", quality=85)

    # Alignment proof: stack every frame at low alpha. Heads should land together.
    stack = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    acc = np.zeros((canvas_h, canvas_w, 4), np.float32)
    for canvas in canvases:
        acc += np.array(canvas).astype(np.float32) * (1 / len(canvases))
    Image.fromarray(acc.astype(np.uint8), "RGBA").save("/tmp/dealer-stack.png")
    print("frames", len(manifest_frames))


if __name__ == "__main__":
    main()
