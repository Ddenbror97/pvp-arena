"""Stage one asset's glTF files out of an untrusted download zip, for process_assets.mjs.

    python3 -I art/br/assets/stage.py <zip> <gltf member> <empty destination directory>

Only the glTF JSON, the buffers and the images it references are written, each to a sanitised
path inside the destination. Nothing from the zip is executed. Members over 600 MB, absolute
paths and paths escaping the destination are refused.
"""

from __future__ import annotations

import json
import posixpath
import sys
import zipfile
from pathlib import Path

LIMIT = 600 * 1024 * 1024


def main() -> None:
    zpath, member, dest = sys.argv[1], sys.argv[2], Path(sys.argv[3]).resolve()
    dest.mkdir(parents=True, exist_ok=True)
    if any(dest.iterdir()):
        raise SystemExit(f"destination not empty: {dest}")
    with zipfile.ZipFile(zpath) as z:
        names = {i.filename: i for i in z.infolist()}
        info = names.get(member)
        if info is None:
            raise SystemExit(f"{member} not in {zpath}")
        base = posixpath.dirname(member)

        def write(rel: str) -> None:
            rel = posixpath.normpath(rel)
            if rel.startswith("/") or rel.startswith("..") or "\\" in rel:
                raise SystemExit(f"unsafe path {rel}")
            src = posixpath.join(base, rel) if base else rel
            item = names.get(src)
            if item is None:
                print(f"missing {src}", file=sys.stderr)
                return
            if item.file_size > LIMIT:
                raise SystemExit(f"member too large: {src}")
            out = (dest / rel).resolve()
            if dest not in out.parents:
                raise SystemExit(f"escapes destination: {rel}")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(z.read(item))

        if member.lower().endswith(".glb"):
            write(posixpath.basename(member))
            return
        doc = json.loads(z.read(info))
        (dest / "scene.gltf").write_text(json.dumps(doc))
        from urllib.parse import unquote

        for b in doc.get("buffers", []):
            if "uri" in b and not b["uri"].startswith("data:"):
                write(unquote(b["uri"]))
        for im in doc.get("images", []):
            if "uri" in im and not im["uri"].startswith("data:"):
                write(unquote(im["uri"]))


if __name__ == "__main__":
    main()
