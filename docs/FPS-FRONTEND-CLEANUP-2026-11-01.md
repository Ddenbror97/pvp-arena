# PvPStrike frontend cleanup — 2026-11-01

This cleanup follows the switch to the Aim Arena map and the fitted SWAT and terrorist
characters. Before removing anything, references were checked across `src`, `workers`,
`scripts`, `tests` and `docs`.

## Removed

- **Old character runtime** (`authored-character.ts`):
  - the `CHARACTER_SET` switch;
  - the legacy cloth-tint shader;
  - the shared CC0 head and its neck taper;
  - the runtime police cap, cap badge, aviators and chest badge;
  - the runtime balaclava, shemagh and neck cowl.
  The SWAT and terrorist models carry their own heads and gear, so the loader now only loads,
  scales, positions and poses one GLB per seat.
- **`head-wrap.ts`.** It was only used by the runtime shemagh and balaclava.
- **Unused models (12.6 MB).** The game no longer loads the shared head, so each match also
  downloads 1.7 MB less:
  - `tactical-body.glb`;
  - `police-operator.glb`;
  - `terrorist-insurgent.glb`;
  - `reference-head-webp.glb`.
- **Old map textures and images (1.2 MB):**
  - `floor-final.webp`, `sky-final.webp` and `concrete-albedo-v2.webp`, all unreferenced since
    the map rebuild;
  - `arena-reference.png`;
  - `lobby-gameplay.jpg`, and `strike-capture.spec.ts`, the opt-in spec that only regenerated
    that unused image.
- **Script-built operator Blender sources** (`art/blender/chars/*.py`, `police.blend`,
  `terrorist.blend`). `fit_sourced.py` and the source licences remain.
- **Two unused locals:** `matrix` in `authored-viewmodel.ts` and the `mergeVertices` import in
  `fitted-rifle-hands.ts`.
- **Old map name in the UI.** "THE FOUNDRY" is now "AIM ARENA" in the lobby, the round break
  and the match header.

## Changed tests

- `fps-heads.spec.ts` was removed, because the shared head no longer exists.
- `fps-operators.spec.ts` is now `fps-character-models.spec.ts`. It checks that:
  - each seat loads its own model and materials;
  - the head centre sits on the 1.6 m head hitbox;
  - the crown is between 1.66 and 1.82 m, measured on the posed skinned mesh;
  - grip reach, the body volume, kneeling, the stride and the death collapse all hold.
- `fps-characters.spec.ts` uses the new `head-center` marker.

## Kept on purpose

- `character-rig.ts`: the loading/failure fallback rig.
- The CC0 AK audio mixes and `build-ak-audio.mjs`: a licence-clean alternative to the
  active reference extracts.
- `arena-showcase.webp`: the lobby key art.
- The stylesheets: an audit found no unused FPS selectors (see the 2026-10-31 cleanup).

## Verification

- `tsc`: clean apart from the pre-existing missing generated guide catalogue.
- `tsc --noUnusedLocals` on the FPS code: clean.
- `eslint`: one existing warning.
- FPS unit tests: 30 files and 309 tests pass.
- e2e:
  - passing: `fps-character-models`, the `fps-characters` head-height test,
    `fps-authored-assets`, `fps-combat` and `fps-motion-continuity`;
  - `fps-characters` hit/headshot fails identically on `main`;
  - `fps-lobby` needs the `:4180` app server, which is not available in this environment.
- In-game screenshots from both seats show both characters correctly.

To deploy, run `npm run deploy` (frontend only). The match Worker is unchanged.
