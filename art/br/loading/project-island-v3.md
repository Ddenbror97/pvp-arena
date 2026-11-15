# Project Island ocean extension v3

Runtime asset: src/assets/fps/project-island-loading-v3.webp (1914 x 822, quality 94 WebP, 487360 bytes).
Generated with built-in imagegen, editing v2. The full island sits inside an expanded continuous ocean canvas, allowing CSS cover to crop water instead of the northern mountains or southern island. One image replaces the blurred duplicate and feathered-edge treatment. Existing BR intent preload uses the new hashed asset.

## Generation brief

Outpaint the existing map to an ultrawide 21:9 scene. Preserve north-up geography, complete northern and southern islands, neighborhoods and geographic labels. Extend matching detailed deep-blue ocean and coastal shallows around all four sides. Leave water above Iron Peaks and below Island Village, and substantial water on both sides, so 16:10 through 21:9 cover crops retain the entire landmass. No artificial frame, blurred side panels, mirrored or stretched strips, extra land, icons, UI, progress bar, watermark or added labels.

## Visual review

Rendered the actual loading-screen CSS locally at 1534x728, 1920x1080, 1280x800 and 2560x1080. Entire island remains visible, including Iron Peaks and the southern coastline. Continuous water fills the viewport; no image-boundary seams. Gameplay maps and server data are unchanged.
