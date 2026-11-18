# Old Fortress map release

Built on main `8be55feb` (PR #282), including the Old Fortress and its reported geometry fixes.
Release the site and the dedicated BR Worker together: world revision `fort-v1`,
height.v4, landcover.v3, world.v3, surface-v3, models.fort-v1 and collision.fort-v1.
Doors remain v26. No database, secret or feature-flag changes.

The loading artwork is `src/assets/fps/project-island-loading-v5.webp` (1914 x 822,
281,350 bytes). It adds a stone hilltop fortress and the label OLD FORTRESS while
preserving the full island and extended ocean framing. `loading.ts` imports the
new filename, producing a new content hash for preloading and display.

The M map and minimap already consume the current world metadata and the fortress
stone/courtyard palette included on main. Both draw OLD FORTRESS at world
(-1080, 1810), grid D7, south-southwest of Blackwater Prison and east of Murder Cabins.
The real 2048 px tactical-map builder was rendered in headless Chrome with its
terrain worker enabled. Distinct map and minimap canvases were both verified to
draw OLD FORTRESS; existing neighbouring labels remained present, with no page
errors. Captures were visually checked. All 18 fortress traversal/layout tests
pass and TypeScript passes. This is local map-render and simulation evidence;
a live signed-in multiplayer traversal was not performed here.

## Artwork provenance and final prompt

Built-in image-generation edit tool, using project-island-loading-v4.webp as the
edit target. The generated PNG remains in Codex generated_images. Browser canvas
was used only to encode the unchanged output pixels as WebP at quality 0.88.
No CLI image-generation fallback or external API key was used.

> Edit the supplied Project Island loading-screen map artwork, keeping its exact wide 1914:822 landscape composition. This is a precise local addition, not a redesign. Preserve the ENTIRE island including Iron Peaks and the southern Superstore/Airfield island, all existing coastlines, the extended ocean on both sides, clouds, lighting, color palette, roads, buildings, and every existing label with its current spelling and location. No crop, border, bars, pins, icons, legend or UI. Add ONE medieval stone hilltop complex called OLD FORTRESS on the mainland: south-southwest of BLACKWATER PRISON, east of MURDER CABINS, northwest of SOUTHERN MILITARY BASE, and north-northeast of ARENA. In the 1914x822 reference, center its stone fortress at approximately x818,y490 (42.7% across, 59.6% down), only changing the small forest patch around that location, roughly 80 px wide and 65 px tall. Show a rectangular weathered pale-gray stone citadel on a rocky ledge, a central keep and courtyard, round corner towers and smaller square wall towers, crenellated curtain walls and a narrow entrance bridge. Match the existing richly detailed bird's-eye painted terrain, scale and sunlight. Add the exact readable label 'OLD FORTRESS' above this local structure, at approximately x818,y457, in the same compact ivory uppercase sans-serif with a dark shadow as other place names. Do NOT confuse this fortress with the existing Blackwater Prison. Keep BLACKWATER PRISON, MURDER CABINS, ARENA, SOUTHERN MILITARY BASE and FORGOTTEN RUINS unchanged and unobscured. All other pixels and geographical features should stay as close as possible to the reference.
