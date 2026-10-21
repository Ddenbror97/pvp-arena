"""Cut the four-pose arm strip onto the existing dealer canvas.

The strip is one transparent row. The first two poses are separate shapes.
The last two touch at the outer elbows, so those pixels are split by distance
through the figure back to each head. Faces are scaled to the idle frame and
the crown is placed on the shared anchor. The original strip is kept at
source/sheet-c.png.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/poker/dealer"
FRAMES = OUT / "frames"
SOURCE = OUT / "source"
ATTACH = Path("/home/ubuntu/.cursor/projects/workspace/assets/6d561196-8095-4403-857d-fe5c2084e638.png")
CANVAS = (640, 674)
ANCHOR = (236.32, 74.0)
NAMES = ["deal-out-1", "deal-out-2", "deal-back-1", "deal-back-2"]
SEEDS = [(80, 290), (80, 832), (80, 1359), (80, 1896)]


def source_file() -> Path:
    SOURCE.mkdir(parents=True, exist_ok=True)
    dest = SOURCE / "sheet-c.png"
    if not dest.exists():
        if not ATTACH.exists():
            raise SystemExit(f"missing arm strip: {dest}")
        Image.open(ATTACH).save(dest)
    return dest


def snap(opaque: np.ndarray, y: int, x: int) -> tuple[int, int]:
    h, w = opaque.shape
    if opaque[y, x]:
        return y, x
    for radius in range(1, 40):
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx]:
                    return ny, nx
    raise RuntimeError(f"no opaque pixel near {(x, y)}")


def label_heads(alpha: np.ndarray) -> np.ndarray:
    opaque = alpha > 16
    h, w = opaque.shape
    labels = np.full((h, w), -1, np.int16)
    dist = np.full((h, w), np.int32(10**9))
    seen = np.zeros((h, w), np.uint8)
    queue: deque[tuple[int, int]] = deque()
    for index, (y, x) in enumerate(SEEDS):
        sy, sx = snap(opaque, y, x)
        labels[sy, sx] = index
        dist[sy, sx] = 0
        seen[sy, sx] = 1
        queue.append((sy, sx))
    while queue:
        y, x = queue.popleft()
        step = int(dist[y, x]) + 1
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if ny < 0 or nx < 0 or ny >= h or nx >= w or seen[ny, nx] or not opaque[ny, nx]:
                continue
            seen[ny, nx] = 1
            dist[ny, nx] = step
            labels[ny, nx] = labels[y, x]
            queue.append((ny, nx))
    partial = np.argwhere((alpha > 0) & (labels < 0))
    for y, x in partial:
        for radius in range(1, 5):
            window = labels[
                max(0, y - radius) : min(h, y + radius + 1),
                max(0, x - radius) : min(w, x + radius + 1),
            ]
            vals = window[window >= 0]
            if len(vals):
                labels[y, x] = np.bincount(vals.astype(np.int32)).argmax()
                break
    return labels


def figure_metrics(mask: np.ndarray) -> tuple[float, float, int]:
    ys, xs = np.nonzero(mask)
    crown = int(ys.min())
    top = crown + max(8, int((ys.max() - ys.min()) * 0.22))
    head = mask.copy()
    head[top + 1 :] = False
    hxs = np.nonzero(head)[1]
    band = min(int(np.percentile(np.nonzero(head)[0], 80)), mask.shape[0] - 1)
    face = int(mask[max(0, band - 2) : band + 3].any(axis=0).sum())
    return float(np.median(hxs)), float(crown), face


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    width, height = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    for y in range(height):
        for x in range(width):
            dark = ((x // cell) + (y // cell)) % 2 == 0
            px[x, y] = (28, 28, 32, 255) if dark else (210, 210, 214, 255)
    return img


def main() -> None:
    image = Image.open(source_file()).convert("RGBA")
    arr = np.array(image)
    labels = label_heads(arr[:, :, 3])
    idle = np.array(Image.open(FRAMES / "idle.webp"))
    _, _, idle_face = figure_metrics(idle[:, :, 3] > 24)
    faces = [figure_metrics(labels == i)[2] for i in range(4)]
    scale = idle_face / float(np.median(faces))
    print(f"scale {scale:.4f} to face {idle_face} from {faces}")

    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["frames"] = [frame for frame in manifest["frames"] if frame.get("sheet") != "c"]
    manifest.setdefault("scale", {})["c"] = round(scale, 4)

    for index, name in enumerate(NAMES):
        mask = labels == index
        ax, ay, _face = figure_metrics(mask)
        ys, xs = np.nonzero(mask)
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        sub = arr[y0:y1, x0:x1].copy()
        sub[:, :, 3] = np.where(mask[y0:y1, x0:x1], sub[:, :, 3], 0)
        crop = Image.fromarray(sub, "RGBA")
        scaled = crop.resize(
            (max(1, int(round(crop.width * scale))), max(1, int(round(crop.height * scale)))),
            Image.Resampling.LANCZOS,
        )
        sax = (ax - x0) * scale
        say = (ay - y0) * scale
        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        ox = int(round(ANCHOR[0] - sax))
        oy = int(round(ANCHOR[1] - say))
        canvas.alpha_composite(scaled, (ox, oy))
        canvas.save(FRAMES / f"{name}.webp", "WEBP", quality=88, method=6)
        manifest["frames"].append(
            {
                "id": name,
                "sheet": "c",
                "file": f"frames/{name}.webp",
                "sourceBox": [x0, y0, x1, y1],
                "head": [int(round(ax)) - 40, int(round(ax)) + 40],
                "scale": round(scale, 4),
                "anchor": [ANCHOR[0], ANCHOR[1]],
                "offset": [ox, oy],
                "touchLeft": int(mask[:, x0 : x0 + 3].sum()),
                "touchRight": int(mask[:, x1 - 3 : x1].sum()),
                "opaque": int((mask & (arr[:, :, 3] > 16)).sum()),
            }
        )
        print(f"{name} {crop.size} -> offset {ox},{oy}")

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    write_contact(manifest)
    print("frames", len(manifest["frames"]))


def write_contact(manifest: dict) -> None:
    canvases = [Image.open(OUT / frame["file"]).convert("RGBA") for frame in manifest["frames"]]
    canvas_w = manifest["canvas"]["w"]
    canvas_h = manifest["canvas"]["h"]
    cols = 7
    thumb_w = 180
    thumb_h = int(thumb_w * canvas_h / canvas_w)
    rows = int(np.ceil(len(canvases) / cols))
    sheet_w = cols * thumb_w
    sheet_h = rows * (thumb_h + 22)
    for label, bg in (("checker", None), ("felt", (18, 10, 40, 255))):
        board = Image.new("RGBA", (sheet_w, sheet_h), (12, 8, 24, 255))
        draw = ImageDraw.Draw(board)
        for i, (canvas, rec) in enumerate(zip(canvases, manifest["frames"])):
            c, r = i % cols, i // cols
            x, y = c * thumb_w, r * (thumb_h + 22)
            cell = checker((thumb_w, thumb_h), 10) if bg is None else Image.new("RGBA", (thumb_w, thumb_h), bg)
            cell.alpha_composite(canvas.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS))
            board.alpha_composite(cell, (x, y))
            draw.text((x + 4, y + thumb_h + 4), rec["id"], fill=(235, 230, 255, 255))
        board.convert("RGB").save(OUT / f"contact-{label}.webp", "WEBP", quality=80, method=6)


if __name__ == "__main__":
    main()
