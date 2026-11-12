# BR: the sun, the sky, the water's reflection, waves and their sound (2026-11-12)

Owner: "Upgrade the sun and the water reflection for the battle royale. ensure keep GPU/FPS
optimizated", with a checklist ("Realistic Sun & Water Reflections"), then "follow the
checklist", "if you find any other better implament go ahead", "waves aswell", and a recording:
"use this water wave ambiet sound, should hear it when getting 10-15 yards away from any water
with waves, light sound, realistic synced correctly with the water".

**Machine.** Headless Chromium on a software renderer: the pictures are right, the GPU cost is
not measurable here (see "Cost" and "Not verified").

## What changed

**One sun** (`src/lib/fps/br/sun.ts`). The light, the sky and the water each had their own copy
of the sun's bearing and colour. They now share one: a bearing and a height give the direction,
the light's colour and strength, and the glare's colour (warmer and weaker low in the sky, by the
air the light crosses). At the island's 41° it is the light the island always had, so the land
looks as before. The sun is configurable in one place; it does not move during a match.

**Sky** (`atmosphere.ts`). The gradient was three colours and a glow. It is now written from how
air scatters: the haze band at the horizon, blue deepening upwards and deepest at right angles to
the sun, paler and warmer towards it, a halo round the sun, a real disc (far brighter than white,
rolled off by the ACES tone mapping the game already had) and a thin layer of drifting cloud lit
from the sun's side. Still one draw over the pixels the world leaves open, no texture.

**Water's reflection** (`water.ts`). The water mirrored one flat colour. Each pixel now mirrors
the sky in the direction its wave faces, with the same function the sky is drawn with: pale under
the sun, blue away from it, the horizon's haze at grazing angles (the sea now meets the sky
without a seam), and the clouds' shapes. The sun's image is worked out from the waves' slopes: a
glitter path that lengthens towards the horizon, narrows under a high sun, follows the camera,
breaks up with the waves and is the sun's colour. All of it is done before tone mapping (it used
to be mixed into the finished pixel, which darkened the sky's colours and cut the sun off at
white).

**Waves.** Five travelling wave trains (41 m swell down to 1.7 m), each moving at the speed water
waves of its length do, plus wavelets within 70 m, on top of the drifting noise that was there.
They are worked out per pixel: the water stays the level sheet swimming and boats stand on.
Each train fades out before it is a couple of pixels long. Lakes and rivers have no swell and
lower waves.

**Sound.** The recording is cut to a 16 s loop (199 KB). It fades in from 15 yards (13.7 m) of
any water, full within 2 m and in the water; a little quieter inland; not from the air. The loop
has a wave every 8 s, and the wash of foam on the shore now runs on that same clock, so a wave is
heard as the foam comes up the bank.

## The checklist

| Section           | Done                                                                                                                      | Done another way                                                                                   | Left out, and why                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1. Sun            | directional light, warm low sun, realistic sky shader, horizon haze, glare, ACES                                          | scattering as a closed formula instead of a simulation; bloom as the glare drawn in the sky itself | HDR render targets and a bloom pass (below)                                |
| 2. Water surface  | custom shader, animated waves in several layers, procedural normals, Fresnel, depth colour, small ripples                 | "transparency" as the drawn bed and caustics from #172                                             | screen-space distortion (needs the scene as a texture: a second pass)      |
| 3. Sun reflection | follows the sun, glitter path, reacts to waves, shimmer, Fresnel, width from roughness, not a solid line, falloff, colour | the sky's mirror image from the sky's own function instead of SSR or a planar pass                 | SSR, ray tracing, a reflection pass, temporal accumulation (below)         |
| 4. Atmosphere     | Rayleigh and Mie as terms of the sky, horizon glow, sky and water consistent, fog in the haze's colour (already)          | clouds as a thin layer, not volumes                                                                | cloud shadows, god rays                                                    |
| 5. Post           | no heavy sharpening or bloom to wash the water out; reflections follow the camera, no ghosting (nothing is accumulated)   | —                                                                                                  | exposure adaptation, lens flare, colour grading, TAA                       |
| 6. Performance    | WebGL2, no new buffers or textures, nothing updated that is not drawn, distance fades on every wave                       | —                                                                                                  | reflection quality settings (there is no pass to scale)                    |
| 7. Dynamic sun    | one configurable sun, synchronised light, sky and water; colour and brightness from its height                            | —                                                                                                  | a moving sun (the island's shading, and its baked look, are for this hour) |
| 8. Advanced       | PBR materials (already), caustics (already)                                                                               | —                                                                                                  | IBL, planar reflections, SSGI, contact shadows                             |

Why the passes are left out: SSR, planar reflections, bloom, TAA and SSGI each draw the scene
again or run a full-screen pass every frame. On the owner's RTX 2050 the game runs 104–140 fps
with the GPU at 3 ms; a planar reflection alone would roughly double the draw calls (the game is
CPU-limited in wide views), and SSR cannot show what matters most on open water, the sky, because
the sky above the frame is not on the screen. Mirroring the sky's own function gives the sky's
reflection exactly, everywhere, for a dozen operations a pixel. What it cannot show is the land's
and buildings' reflection in still water.

## Cost

No new draw call, pass, render target or texture. Per water pixel: the sky function once (no
lookups), five sines for the trains (each behind its distance fade), two noise lookups for
wavelets within 70 m and two for the clouds' image where the water is mirror enough; the glitter
keeps its branch. Per sky pixel: six noise lookups for clouds above the horizon. The sky is drawn
last, over open sky only, as before.

## Not verified

- **GPU time and frame rate on a graphics card.** Check F3 after deploy (the GPU figure over open
  sea, looking at the sun) against 3.1 ms before.
- **By eye in a match, and the sound by ear.** Pictures are stills from the explorer; the loop
  was built and levelled, not listened to.
- **The foam and the sound together.** They share a clock by construction; along a bank the foam's
  arrival is spread over a second or two, so it is "about together", not frame-exact.

## Tools

`VIEW_FILE=<views.json> node scripts/br/explorer/capture.mjs <outDir>`: the explorer from given
viewpoints (`{ "name": [[x, y, z], [lookX, lookY, lookZ]] }`). Tests: `tests/br-sun.test.ts`,
`tests/br-water.test.ts`, `tests/br-atmosphere.test.ts`.
