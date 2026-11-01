# Police and Terrorist characters

## Characters in the game

| Seat | GLB | Source | Tris |
| --- | --- | --- | --- |
| A Police | `police-swat.glb` | "Game Ready Swat Character" by dolon56, CC BY 4.0 | 19,450 |
| B Terrorist | `terrorist-fighter.glb` | "Terrorist 1 Rig" by fake gman, listed CC BY 4.0 (see the note in ATTRIBUTION.md) | 4,503 |

Download each model as glTF from Sketchfab, unzip it into `sources/swat` or
`sources/terrorist` (only `license.txt` is committed), then run:

```
python fit_sourced.py -- sources/swat/scene.gltf police build/out/police-src.glb
python fit_sourced.py -- sources/terrorist/scene.gltf terrorist build/out/terrorist-src.glb
# then gltf-transform dedup + prune into public/fps/models/police-swat.glb / terrorist-fighter.glb
```

`fit_sourced.py` does the following:

- bakes the Sketchfab node transforms into metres;
- renames the rig to plain Mixamo names (it maps the Valve-style terrorist rig);
- puts `HeadTop_End` at the crown, so the head centre lands on the 1.6 m head hitbox;
- converts spec/gloss materials to metal/rough PBR;
- caps textures at 2K.

The models keep their own heads and gear; the runtime only scales, positions and poses them.

## Earlier character sets

The script-built operator characters and the previous shared Mixamo body (with the CC0 head and the
runtime cap, badge, balaclava and shemagh) were removed in the post-launch cleanup. They are
still in git history at commit `6cb7f50` (`art/blender/chars/*.py`, `src/lib/fps/head-wrap.ts`,
`public/fps/models/{tactical-body,police-operator,terrorist-insurgent,reference-head-webp}.glb`).
