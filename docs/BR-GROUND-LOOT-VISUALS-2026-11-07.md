# BR ground-loot visuals — 2026-11-07

Scopes and muzzle attachments previously appeared as coloured rectangular cases; wearable pickups were primitive boxes. Floor pickups now reuse the authored, credited accessory and gear models, with a separately baked floor LOD. Equipped models remain unchanged.

- Silencer, compensator, flash hider, three sights and two scopes have their actual textured silhouettes, side-resting poses and physical sizes.
- Helmets rest upright; vests and bags lie face-up with their empty thickness compressed, rather than standing as filled character equipment.
- Ammo has bevelled can/carton bodies, lid edges, ribs, clasp/handle, stencil labels and two brass rounds beside the sniper carton.
- A small soft contact shadow and a thin rarity ring replace the large filled coloured disc. Pickup positions and server validation do not change.
- One instanced mesh per item type is retained; material groups are bounded. Empty batches are hidden. Accessories are baked once during loading, with quantized attributes decoded before transformation. Loading completion marks the renderer dirty, and late completion after disposal cannot resurrect meshes.
- Generated canvas/contact textures and owned materials/geometries are disposed. Shared pack textures stay owned by their loader.

## Asset reproduction and attribution

Run `node art/blender/br/build_ground_loot.mjs` with the existing root and art/blender dependencies installed. Sources are `attachments.glb` and `gear.glb`; existing CC BY credits in `public/fps/br/models/ATTRIBUTION.md` and `ATTRIBUTION-gear.md` apply to their floor derivatives. Output: `ground-loot-v1.glb`, approximately 1.11 MB, 17 pieces, no powered sight reticle quads, 256 px textures. Each mesh stays below 2,800 triangles. The baker uses silhouette simplification and a floor LOD for the most fragmented high-poly gear. Original assets are retained.

## Verification

31 focused geometry, budget, quantized-attribute, indoor-loot and inventory/loot tests pass. Native Chrome rendered checks confirm all inspected bases rest at zero height, one and 200 instanced scopes both use five scene draw calls with the same scene child count, steady updates compile no new programs, and disposal removes the loot root. The 12-item inspection scene uses 21 draws and about 14,000 triangles. These are bounded draw/geometry checks, not a claim of identical FPS on every computer.

Native in-game checks successfully picked up server-rolled loot inside a house, cabin, raised mobile home and fire-station upper floor with zero page errors.

App-only release. No match-worker protocol or database changes.
