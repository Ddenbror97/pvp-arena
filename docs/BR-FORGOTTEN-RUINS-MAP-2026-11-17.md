# Forgotten Ruins map release

Built on PR #268 (`1370c74f`), including the coastal towns and seagull ambience.
Release the site and dedicated BR Worker together: world revision `ruins-v1`, height.v3,
landcover.v2, world.v2 and surface-v2. No database or secret change.

The loading art is `src/assets/fps/project-island-loading-v4.webp`. It adds the pyramid,
temple town, jungle and cenote south of Riverwood and east of Southern Military Base.
The entire island and the ocean extension remain visible. `loading.ts` imports the new
version so old cached loading art cannot mask the addition.

The M map and minimap read the exact Forgotten Ruins coordinates (2420, 1790) and name from
world.v2.json. Temple footprints now use pale weathered stone colors. Both pictures are
generated from the current terrain, roads and placed buildings; no static location pins.

The real tactical-map builder was captured at 2048 px in headless Chrome, with its terrain
worker enabled. Forgotten Ruins, Riverwood, Southern Military Base, Fisher's Cove and
Bayview labels were verified; no page errors. This is a map render, not a live signed-in
production-match test.

## Loading artwork provenance

Generated with the built-in imagegen edit tool using loading-v3 as the edit target.
Converted to WebP for delivery; the source PNG remains in Codex's generated_images folder.

Final prompt:

> Edit this existing Project Island game loading-screen map image. Deliver a high-resolution wide landscape image in the same approximately 2.33:1 aspect ratio (1914x822 reference). Preserve the full island and all existing coastlines, framing, ocean extension, ocean texture, mountains, towns, roads, labels and their exact spellings and positions. Do not crop the island or add icons, pins, UI, borders or bars. Make one geographically precise addition: FORGOTTEN RUINS, an ancient Maya stone temple town in dense tropical rainforest, on the mainland SOUTH of RIVERWOOD, EAST of SOUTHERN MILITARY BASE and WEST of EAST WORKS. The new site's center in this reference image is approximately 62% of image width and 61% of image height (around x1187 y501 in the 1914x822 image); only edit a small patch surrounding that center, about 90px wide by 75px high at reference size. It must NOT go on the southern airfield island. Show a stepped limestone pyramid, several smaller stone temple roofs and jungle clearings, with a small turquoise cenote. Match the existing bird's-eye terrain rendering, sunlight, detail scale and colors. Place the exact text 'FORGOTTEN RUINS' clearly in two compact lines in the same ivory uppercase sans-serif lettering with subtle dark shadow as the other place names, without overlapping SOUTHERN MILITARY BASE or EAST WORKS. Keep all existing labels, including RIVERWOOD, EAST WORKS and SOUTHERN MILITARY BASE, untouched and readable. This is a precise local map update, not a redesign.
