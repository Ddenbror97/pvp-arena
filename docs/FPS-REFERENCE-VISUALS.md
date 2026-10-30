# Reference field and AK presentation

This pass follows the supplied `ingame.png` composition and uses the supplied
`AK47.png` as actual weapon artwork. Both supplied files were verified as
byte-identical to the existing `public/fps/arena-reference.png` and
`public/fps/rifle-reference.png` assets. The arena screenshot is not projected
over gameplay or used to conceal missing 3D geometry.

## Field

`arena-architecture.ts` adds upper industrial decks/rails, framed side displays,
vertical banners, sign towers, floodlight housings, reinforced case faces,
native-brand floor markings, purple light strips and closed service panels.
It also builds an atmospheric sky and actual distant terrain geometry outside
the playable facility. Mountains are noninteractive background scenery, not
additional playable terrain. Native logos come from the existing brand asset.

The sixteen existing cover colliders and 24 × 32 metre floor are unchanged.
Upper decks are not advertised as walkable routes. Structural upper geometry
uses `STRUCTURES` in the shared map and participates in authoritative bullet
occlusion; tests verify it stays outside the playable floor and blocks a beam
ray. Repeated box details are grouped by material/shadow policy into static
instanced draws, preserving their individual transforms and appearance.

The floor gets a smoother, slightly metallic finish and material-specific
reflections. A texture-loading bug that retained the initial CanvasTexture
fallback was corrected by assigning the loaded texture object and updating
the consuming materials. Concrete and weapon artwork now actually reach the
rendered materials rather than only updating image metadata.

## Weapon

`weapon.ts` constructs a volumetric AK silhouette with beveled receiver,
handguard, stock, curved magazine, pistol grip, trigger guard, actual front-sight
apertures, round barrel/gas tube, rivets, charging handle and rear sight. The
supplied image is UV-projected onto the furniture faces; it is not a flat
weapon sprite. First-person and opponent weapons use the same kit/materials.

The existing renderer/controller handles viewmodel pose, recoil, fire, ammo
and reload. It now animates magazine movement and charging-handle response,
adds connected sleeves/grip fingers, and places muzzle effects using the shared
barrel-end coordinate. The HUD identifies the rifle as AK-47 / PVP Edition.
Weapon statistics, hit detection, authentication and money operations are
unchanged. The pistol remains available.

A side-view PNG is not an original 3D production asset. This is reconstructed
geometry with the exact supplied skin on its visible furniture; hidden/top
surfaces use authored metal materials. Character meshes and reload/grip poses
remain stylized/procedural. This does not claim parity with a shipped CS:GO
asset/animation set; an exact AAA match needs fully authored, rigged assets.

## Stability and verification

A visual check caught negative first-frame delta time after expensive scene
initialization. It could extrapolate the opponent far off-map. `frameDelta`
now clamps to 0–100 ms, with a regression test. Local browser fixtures also
use bounded server-clock catch-up and wait for actual input acknowledgements;
they do not fabricate authenticated production play.

Validation: 616 unit tests and nine Chrome tests, including source image
dimensions/URL, volumetric thickness, sight apertures, UV bounds, both spawn
views, opponent rendering, aiming, full-auto/release, reload, crouch, impacts,
pointer lock and disposal. Targeted lint, casino/worker TypeScript and the
production build were checked. A local 120-frame probe measured a 13.9 ms median
and 20.9 ms p95 interval during this pass; these are workstation observations,
not guarantees across hardware or deployed network conditions.

Deploy the casino and standalone match Worker from the same shared-map revision.
This pass is saved locally and is not deployed. Existing authenticated staging,
financial concurrency and cash-release gates in `FPS-OPERATIONS.md` still apply.
