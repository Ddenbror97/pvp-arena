# Battle Royale render audit: FPS, stability and H1Z1-level quality (2026-11-09)

Branch `ground-blur-2026-11-09` (PR #115), after main `84ca73bd`. Goal set by the owner: more
FPS and steadier frames while keeping the environment's texture quality, toward the look of
H1Z1.

## What was measured, and how

- **Per-view draw cost** with the real island renderers (`scripts/br/explorer`, headless,
  SwiftShader): draw calls, triangles, the largest contributors, programs and textures, at
  six fixed views (plane altitude, parachute at 250 m and 80 m, on foot in a field, in town,
  low over the strait).
- **Look**, before and after each change, from the same views.
- **Leaks** with `scripts/br/leak-check` (three mount/dispose cycles of the full arena), on both
  depth paths.
- **Not measurable here: GPU time.** The software renderer says nothing about a real GPU's
  frame time, and the full arena with 100 operator rigs crashes it. The owner's PC is the
  reference (F3 shows GPU ms in game; `scripts/br/render-profile` runs on Windows Chrome).

| View | Draws | Triangles | Props | Trees | Terrain |
|---|---|---|---|---|---|
| Plane, 2.6 km up | 214 | 1.16 M | — | — | — |
| Parachute, 250 m | 170 | 0.72 M | 0.40 M | — | — |
| Parachute, 80 m over town | 222 | 1.37 M | 1.17 M | 22 k | 92 k |
| On foot, field | 198 | 0.77 M | 0.40 M | 64 k | 119 k |
| On foot, town | 249 | 1.60 M | 1.27 M | 35 k | 112 k |

34 shader programs. Largest single contributors: houses at their far LOD (320 × 461
triangles), and **power pylons, about 100 k triangles per town view** (4.4 k each even at the
far LOD). Draw counts and triangles are not the limit on a mid-range GPU; the fragment side
is (below).

## Findings

### 1. The blurry ground after the lobby (fixed)

The adaptive budget was fed loading stalls during the lobby, fell to 0.6 and switched the
ground textures off for the rest of the match. Fixed in the first commit of this branch: the
budget ignores isolated stalls, BR adapts only once the match leaves the lobby (as 1v1 and
Bomb do), and the ground textures shorten but never switch off.

### 2. The ground is a blur from the parachute even at full quality (fixed)

The zones' real tile textures exist only within 140 m of the camera, measured in 3D. Above
140 m nothing is in range, so from the parachute and the plane the whole ground was the baked
aerial albedo, 2.4 m per texel: grey and green smears.

**Mid-field layer** (`terrain.ts`, `MID`): from the near range out to 1.1 km, the aerial colour
is modulated by the dominant zone's real texture at 8× its tile size (two rotated samples, so
the repeat never shows as a lattice; the ratio to the layer's mean is compressed so dark
layers do not saturate) plus its normal map. Colours stay the aerial bake's; the ground gains
a surface grain from the air and in the middle distance. Two or three texture fetches for
pixels in that band; nothing changes on foot within 140 m.

### 3. Logarithmic depth defeats early-Z (opt-in fix, the owner decides)

`logarithmicDepthBuffer: true` makes every fragment shader write its own depth. That turns off
the GPU's early depth test, so every hidden fragment of terrain, buildings and leaves is shaded
in full before it is discarded. In a forest or a town that is most of the fragment work.

**Reversed-Z** (`scene-target.ts`) replaces it: a 32-bit float depth buffer, which three can
only give an offscreen target, so the scene renders into a 4× MSAA half-float target and one
fullscreen pass applies the same ACES tone mapping and exposure to the canvas. Depth precision
is better than log depth at every distance, and early-Z works again. Needs `EXT_clip_control`
(desktop Chrome, Edge, Firefox); elsewhere the arena keeps log depth.

Found and fixed on the way: the sky and the mountain ranges pin themselves to the far plane
(`xyww`), which is the *near* plane under reversed-Z (they covered the island); the ranges'
"just in front of the far plane" was only 12 km away in reversed depth; and a resize left the
target unbound for one frame (black).

**Why it is opt-in:** it changes the far haze. When drawing to the canvas, three mixes fog
*after* tone mapping and sRGB encoding, with a linear fog colour. Far geometry therefore never
reaches the background haze: there is a visible band at the horizon from the air, and the
distant sea stays deep blue. In the reversed-Z path fog is mixed in linear light, as intended:
no band, but the far field fades fully into the haze and reads hazier. The fog distances were
tuned against the current look.

**A/B on the owner's PC:** in the browser console on the site,
`localStorage.setItem("br-depth", "reversed")`, reload, play, F3 for GPU ms; remove the key to go
back. In the explorer: `?depth=reversed`. If the GPU time drops and the look is wanted (or the
fog is retuned), flipping the default is a one-line change in `br-arena.ts`.

### 4. Smaller fixes

- The dev overlay (F3) showed the draw calls and triangles of the *last* render pass (the
  weapon viewmodel or the inventory portrait), not the scene. It now shows the scene pass.
- `scripts/br/render-profile` disabled the budget by patching a line that no longer exists; it
  matches the new line again.
- `scripts/br/leak-check --reversed` checks the opt-in path.

### Checked, nothing to change

- No material uses glass transmission (which would render the whole scene twice per frame).
  Physical materials are confined to the first-person weapons and car clear-coat.
- The frame loop allocates nothing per frame beyond a ≤ 100-element sort; input is sent at
  30 Hz.
- LOD tables and switch distances are sensible per class; houses are 4.3 k / 1.2 k / 461
  triangles by LOD.

## H1Z1: what makes its look, and where Project Island stands

H1Z1 (King of the Kill, later Z1 Battle Royale) runs on Daybreak's ForgeLight engine (also
PlanetSide 2): DirectX 11, volumetric lighting and fog, cloud shadows, dynamic reflections,
real-time radiosity, a seamless world, and PhysX for vehicles and particles. Its user settings
are render distance, texture, model, shadow, lighting, flora, effects and particle quality, and
ambient occlusion; competitive players lower flora and shadows first, which says those are both
the expensive features and the look-defining ones.

| | H1Z1 | Project Island now |
|---|---|---|
| Ground texture | Splatted detail textures with normal maps across the visible terrain | Real tiles within 140 m; **mid-field grain to 1.1 km (new)**; aerial bake beyond |
| Ground flora (grass clumps) | Dense near the player; a signature of the look | None; bushes per 60 m cell |
| Sun shadows | Yes, near the player | **None** (`shadowMap` never enabled) |
| Ambient occlusion | Optional SSAO | Baked into some models only |
| Fog / atmosphere | Volumetric fog and lighting | Linear fog, sky, mountain ranges |
| Trees | LODs and impostors | Real models to 60 m, impostors to 1.5 km |
| Draw distance | Long, hazed | 1.3–3 km slider, 14 km far plane |

## Roadmap, ranked by value for the goal

1. **Decide reversed-Z** (above). Expected the largest GPU win available without touching
   content; it also removes the horizon band. Needs only the owner's A/B.
2. **Sun shadows near the player.** The biggest missing piece of the H1Z1 look. One shadow map
   about 120 m around the player for characters, trees and props, the static part refreshed at
   a low rate, the terrain's far field unshadowed. Shadows also reveal players behind cover, so
   the same for everyone (no setting that turns them off).
3. **Ground flora.** Instanced grass cards within 40–60 m, faded by distance, on the grass and
   field zones. Concealment is gameplay: it must draw the same for everyone at every view
   distance (like rocks and bushes today), and prone players must not be fully hidden by it.
4. **Compressed textures (KTX2 / Basis).** The terrain alone holds about 180 MB of RGBA8 in
   VRAM (albedo array 72 MB, normals 18 MB, aerial surface 89 MB with mipmaps); BC7/ASTC cut
   that 4–8× and remove the main-thread image decode, a source of the loading hitches the
   budget used to misread. Needs the Basis transcoder hosted with the site.
5. **Pylon far LOD.** 4.4 k triangles each at every distance, about 100 k per town view; a
   600 m+ billboard or a 300-triangle lattice silhouette.
6. **Fog retune** if reversed-Z becomes the default: fog *start* further out, or the
   "air clear" opened further, so the parachute view keeps its contrast.

## Files

`src/lib/fps/presentation.ts` (budget stalls), `src/lib/fps/br/br-arena.ts` (budget gating,
ground range floor, scene target, overlay counts), `src/lib/fps/br/terrain.ts` (mid field),
`src/lib/fps/br/scene-target.ts` (new), `src/lib/fps/br/atmosphere.ts` (far plane under
reversed-Z), `scripts/br/explorer/entry.ts`, `scripts/br/leak-check/capture.mjs`,
`scripts/br/render-profile/capture.mjs`, `tests/fps-presentation.test.ts`.
