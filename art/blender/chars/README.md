# Police and Terrorist characters

Source for `public/fps/models/police-operator.glb` (seat A) and
`public/fps/models/terrorist-insurgent.glb` (seat B). Everything here is original, script-built
work: body, clothing, boots, gloves, gear, textures and skeleton.

```
./build.sh            # rebuild both .blend files and install both GLBs (≈1 min each)
```

Needs bpy 5.x (`BLENDER_PY`, default `/root/bpyenv/bin/python`) with numpy, scikit-image and
Pillow, plus `../node_modules/.bin/gltf-transform` (`npm i` in `art/blender`).

| File | What it does |
| --- | --- |
| `skeleton.py` | 25-bone Mixamo-named A-pose skeleton (Hips … HeadTop_End, Shoulder/Arm/ForeArm/Hand, UpLeg/Leg/Foot/ToeBase). The names are the ones `authored-character.ts` already drives, so the procedural stride, crouch, jump, two-bone leg IK, rifle-grip arm IK and death collapse work unchanged. |
| `body_sdf.py` | Clothed body as a signed-distance field (lofted torso, deltoids, sleeves, gloved grip hands, trousers with knees, calves and a cargo pocket on the terrorist, boots, mock-neck collar), meshed by marching cubes. `STYLES` holds the fitted police uniform and the looser insurgent jacket and trousers. |
| `materials.py` | Procedural PBR textures (1K albedo, normal, roughness): twill, ripstop, Cordura with MOLLE webbing, pebbled leather, helmet polymer, printed POLICE patch. Albedo is neutral and tinted per role through the glTF base colour factor, so both characters share one texture design. |
| `gear.py` | Hard-surface gear. Police: plate carrier with cummerbund and shoulder straps, three mag pouches, radio and antenna, POLICE patches, duty belt, drop holster, knee pads. Its head kit holds a high-cut helmet with rails and NVG mount, a comms headset with boom mic and ballistic glasses. Terrorist: coyote chest rig with three AK mag pouches, H-harness, belt and hip pouch. |
| `build_character.py` | Mesh, decimate to 16k body tris, per-region materials, UVs, gear, armature, distance-based skin weights (gear rigid to its bone), GLB export. |
| `preview.py` | Turnaround renders, fitted like the game. Pass `cycles` for a path-traced preview. |

## How it fits the game

- The game scales the body so the head centre (the midpoint between Head and HeadTop_End) sits on
  the 1.6 m head hitbox. Height and eye line therefore stay CS:GO-like: eyes at 1.6 m, crown about
  1.78 m, 1.79 m with the helmet.
- The face is the existing CC0 head (`reference-head-webp.glb`). It is fitted at runtime and its
  neck tucks into the uniform's collar.
- The `head-kit` node is exported unskinned in head-centre space, with the face toward glTF −Z. The
  runtime moves it into the fitted-head group, so the helmet, headset and glasses follow the head
  exactly.
- The terrorist's face covering is still the runtime balaclava and shemagh from `head-wrap.ts`.
- Hitboxes, combat, interpolation, the first-person viewmodel and reload are untouched; only the
  third-person body asset changed.
- Rollback: set `CHARACTER_SET = "legacy"` in `src/lib/fps/model-assets.ts`. The old
  `tactical-body.glb` and its runtime tinting and dressing path are still in place.

## Budget

| | Police | Terrorist |
| --- | --- | --- |
| Body tris (skinned) | 16,000 | 16,000 |
| Gear tris (skinned, rigid) | 4,656 | 3,112 |
| Head kit tris | 5,440 | 0 |
| Bones | 25 | 25 |
| GLB | 1.97 MB | 1.60 MB |

## Limitations

These are procedural, script-built characters. They are clean and readable at gameplay distance,
but are not sculpted or photogrammetry assets:

- no hand-sculpted fabric folds or baked high-to-low normal maps;
- the gloves are a fixed grip pose (fingers are not rigged);
- the base faces are one CC0 head shared by both teams.

Swapping in a sculpted body later only needs the same bone names, the A-pose and a `head-kit` node.
