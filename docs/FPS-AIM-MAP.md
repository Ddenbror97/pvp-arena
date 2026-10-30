# Foundry aim-map upgrade

The existing 24 × 32 metre arena, Three.js renderer, fixed-step controller and
authoritative match service remain in use. No replacement game/physics engine,
wallet changes, database migrations or external asset dependencies were added.

## Cover and layout

`src/lib/fps/map.ts` is the common source for rendering, movement and bullet
collision. Sixteen cover solids form a layout mirrored across both axes:
two tall steel containers, two concrete blast walls protecting the central
spawn sightline, four timber crates, four 1.25 m concrete barriers and four
0.65 m low crates. Outer lanes remain open for flanking. Spawns stay at
`(0, 13)` and `(0, -13)` and continue alternating each round.

All physical cover is actual box geometry, decorated with instanced steel ribs,
braces, seams and door hardware contained by the same solid envelopes. Main
cover skins are inset one millimetre; this is a conservative collision skin,
not a bullet gap. Wall supports are contained within the perimeter wall solids.
Paint, banners, decals and lights are surface decoration rather than extra
physical obstacles. The perimeter and floor are also shared bullet solids.

`collision.ts` holds the existing slab-ray algorithm, now reused for both
world and player volumes. The nearest solid intercepts the shot before a
farther player. There is no penetration. Server-authored impact events contain
the surface, object ID, exact hit point and outward normal; browsers cannot
submit impacts or damage. Tick-start stance/positions are used consistently
for both players' shots.

## Crouching and traversal

Ctrl is now a real authoritative stance: 0.95 m eye height, lower head/body
hit volumes and 48% movement speed, reproduced by local prediction and opponent
pose. Standing eye height remains 1.6 m. Crouch overrides sprint speed; sprint
behavior otherwise remains unchanged. Low barriers fully protect a crouched
head but expose a standing head. Crouched players cannot shoot through their
own cover. Both side-peeking routes and covered/exposed states are tested.

The same movement function resolves axes against solid faces so players slide
along them instead of stopping one step away. A small contact tolerance prevents
rounding from treating a player touching a corner as inside it. The existing
jump/gravity integration now lands at crossed cover tops, allows another jump
from supported cover, and falls when leaving support. Only sufficiently low
objects can be reached by the existing jump impulse; tall cover is not vaulted.

The optional `crouch` boolean preserves old input-shape acceptance. Deploy the
casino and match Worker from this revision together: old clients cannot display
the new layout/stance correctly. Cash/public release remains subject to the
staging gates in `FPS-OPERATIONS.md`.

## Rendering and feedback

The arena uses generated concrete albedo, procedural weathered steel and timber
textures, roughness and bump detail, PCF sun shadows and restrained purple
wall branding. A one-time PMREM capture of the arena supplies rough metallic
reflections; players are excluded, so reflections do not reveal opponents.
These are authored/generated materials, not photogrammetry or scanned assets.
Texture coordinates use the same three-metre material scale across differently
sized cover and walls. A procedural concrete fallback keeps the arena usable if
the image fails to load. The generated asset is delivered as a 667,488-byte WebP.

The built-in imagegen tool generated `public/fps/concrete-albedo-v2.webp`
(PNG output compressed to WebP for delivery). Final prompt:

> Use case: photorealistic-natural. Asset type: seamless square diffuse/albedo material texture for actual 3D concrete walls and floors in an industrial tactical FPS training arena. Generate one flat orthographic close-up of weathered poured concrete, edge to edge, evenly lit with no directional shadows, no perspective, no objects or scene. Neutral cool medium-gray concrete with subtle warm aggregate, natural pores, fine hairline cracks, muted wear, faint irregular dust and restrained stains at varied scales. Believable photographic material microdetail without high contrast or large identifying patches. Seamless tileable edges on all four sides. No lettering, no borders, no graphics, no painted stripes, no logos, no vignette. Square 1024x1024 material image, not a rendered environment screenshot.

`impacts.ts` uses fixed pools of 96 marks and 96 particles. Concrete produces
soft dust, metal brief sparks, and wood small brown splinters. Marks align to
the reported surface normal; particles start just outside that surface. The
existing audio context adds material-dependent synthesized impact tones, not
recorded material samples. Events remain deduplicated, and resource cleanup
disposes pooled buffers, textures, instanced meshes and reflection/shadow targets.

## Verification

- 614 unit tests passed, including 26 new cover/traversal/stance tests.
- Seven real workerd WebSocket tests passed again, including crouch acknowledgement,
  reconnect, a complete match, spectators and settlement recovery.
- Eight Chrome tests passed: both spawn views, Ctrl stance, all three cover
  materials and floor impacts, existing pointer lock/aiming/fire/reload, route
  startup and local frame timing. Fixtures use the real renderer/controller and
  simulation; they do not impersonate authenticated deployed users.
- Targeted ESLint, casino/worker TypeScript checks and production build passed.

The local frame probe samples 120 animation frames and rejects major stalls;
its result is under `test-results/fps-frame-timing.json`. It is not a hardware
certification or Internet/capacity benchmark. Authenticated staging matches,
deployment-region latency and hardware performance still need verification
before public cash play. This upgrade has not been deployed.
