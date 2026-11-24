# Performance lab (production performance audit, 2026-11-24)

Two bundles for measuring the battle royale on real graphics hardware against the deployed
site's island files. Build them with

    node scripts/br/perf-lab/build.mjs <outDir>

and serve them from anywhere the browser can fetch (the audit used a commit on a throwaway
branch, fetched from raw.githubusercontent.com).

## Loading a bundle

Open a page of the site without a content security policy, e.g.
`https://pvpspinarena.com/robots.txt?loot=1&vehicles=1&immortal=1` (the query is read by the
game bench: the match's loot, its parked vehicles, and players kept alive in the gas during
long runs). In the console:

```js
window.__labTier = "low"; // low | balanced | standard; leave unset to let the game decide
window.__labSize = [1536, 864]; // game area in CSS px (the laptop's full screen at 125 %)
const src = await fetch(BUNDLE_URL).then((r) => r.text());
await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
```

One tier per page load: reload the page before changing it.

## world.js: the island renderer alone

`await labWorld.run({ size: [w, h], items })` with items such as
`{ name, kind: "pan", at: [x, z] }` (a full turn on open ground at eye height) or
`{ name, kind: "fly", from: [x, z], to: [x, z], agl }`. Every frame is drawn as fast as the
browser allows (not held to the display); per item it reports the GPU time per frame (timer
queries), the script's time to select and submit a frame, and the throughput frame time
(batches of 10 frames timed to the end of the GPU's work: what an uncapped loop would show).
No players, weapon or HUD. Results also on `window.__lab`.

## game.js: the real client

The whole BR client (br-arena.ts and its React HUD) connected to the shared match running in
the page (scripts/br/client-sim), scripted through `SCENARIOS` in game.tsx: warm-up, plane,
freefall, canopy, a look round and a run at each location, crowds of 5–40 players in Downtown,
firing, grenades, the AWP scope, the inventory and tactical map, swimming, the zip line and
driving. Displayed frames are recorded by patches.ts: frame intervals (FPS, 1 % and 0.1 %
lows, p95/p99), the client's script time per frame, the arena's own GPU timer results, all
WebGL draw calls, long tasks and the JS heap. The in-page match's own step (the stand-in for
the Cloudflare room) is timed apart as `serverMsPerSec`: in a real match that work is on the
server, so client frame rates here are slightly pessimistic.

`window.__lab.status` reads `done` when the suite has finished.

## What these numbers are not

- Not SwiftShader: a run is only a benchmark on a real GPU (check `env.gpu`).
- `world.js` frame times are GPU-bound equivalents of the world alone, not gameplay FPS.
- The display caps `game.js` at its refresh rate (144 Hz on the owner's laptop).
