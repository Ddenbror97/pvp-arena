# FPS / render audit — remaining bottlenecks (2026-11-03)

Scope: all five maps, with the new 5v5 Bomb Defusal (Sandgate) as the focus — ten operators,
an 80 × 80 m map, and a room that filters a snapshot per player. Branch `map06-bomb-defusal`.

Machine: this session's container (headless Chromium on SwiftShader, software rendering; Node
for the room). Draw calls, triangles, shader programs and room CPU are exact; software frame
times are only useful as ratios. Real-GPU frame times are **not** measured here: the owner's
laptop was not linked during the audit. The benchmark page that measures them (all four 1v1
maps plus `sandgate-5v5`) is published privately as the "Sandgate GPU Benchmark" artifact.

## Tools added

- `scripts/fps/bomb-bench` — room cost in Node: bots + simulation step + one filtered snapshot
  per human, 8 minutes of play, 1/5/10 humans; snapshot size and downlink.
- `scripts/fps/bomb-harness/audit.mjs` — the real bomb renderer with an in-page room: draw cost
  with 0/4/9 operators in view, a JS CPU profile, and every shader program compiled after Ready
  (plants and detonates a bomb too).
- `scripts/fps/compile-check` — the 1v1 renderer, two minutes of scripted play per map (moving,
  turning, firing, knife, deaths, round restarts): shader programs compiled after Ready.

## Found and fixed

| #   | Bottleneck                                                                                                                                                                                                          | Where                                  | Before                                                                    | After                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Line of sight in the room: 9 full nearest-hit traces with allocations per recipient × enemy × snapshot (88% of room CPU)                                                                                            | `bomb/visibility.ts`                   | Room tick p99 44.3 ms with 10 humans (133% of the 33 ms tick; max 234 ms) | 2.7 ms (8%); identical answers on 40,000 random pairs           |
| 2   | Two point lights in the bomb scene (bomb LED, explosion). Light count is in every material's shader key: the bomb appearing recompiled every visible material mid-round, and every fragment shaded two extra lights | `bomb/bomb-renderer.ts`                | 111 programs; recompiles at plant/drop                                    | 83 programs; none after Ready; map-only software frame ≈ halved |
| 3   | Operator parts hidden until their first update (world rifle, flash, body) compiled on first sight of an enemy                                                                                                       | `bomb/bomb-renderer.ts`                | 4 programs compiled mid-round                                             | 0                                                               |
| 4   | 1v1: the brass casing shader compiled when the player died with casings in flight (drawn without the muzzle light)                                                                                                  | `renderer.ts`, `shell-casings.ts`      | 1 late compile on every map                                               | 0 on Dustfront, Frostline, Crossfire, Lost Trail                |
| 5   | Remote operators drew the full first-person rifle files (arms removed at runtime)                                                                                                                                   | new `ak47-world.glb`, `m4a1-world.glb` | AK ≈30k, M4 ≈35k triangles, 2–4K textures                                 | AK 6.5k, M4 12.3k, 512 px; nine operators 615k → 403k triangles |
| 6   | Room dropped inputs after a client frame hitch > ~130 ms (backlog 4)                                                                                                                                                | `workers/fps/bomb.ts`                  | movement lost on a hitch                                                  | backlog 8, as the 1v1 room                                      |

Fix 5 applies to Bomb Defusal only; the 1v1 keeps the full rifle files. Fix 4 is in the shared
1v1 renderer (casings hide with the rifle when the player dies; compiled before Ready).

## Measurements after the fixes

Room (Node, 8 minutes of bot play per row):

| Humans | Tick p99 | Tick max | Budget used (p99) | Snapshot | Downlink per player |
| ------ | -------- | -------- | ----------------- | -------- | ------------------- |
| 1      | 1.8 ms   | 7 ms     | 5.5%              | 3.4 KB   | 96 KB/s             |
| 5      | 1.9 ms   | 5 ms     | 5.8%              | 3.4 KB   | 97 KB/s             |
| 10     | 2.7 ms   | 36 ms    | 8.1%              | 3.4 KB   | 98 KB/s             |

Client, Sandgate mid plaza (real renderer, 480 × 270):

| Operators in view          | Draw calls | Triangles | Programs | Compiled after Ready |
| -------------------------- | ---------- | --------- | -------- | -------------------- |
| 0                          | 141        | 221k      | 83       | 0                    |
| 4 Police                   | 185        | 348k      | 83       | 0                    |
| 9 (4 Police, 5 Terrorists) | 250        | 403k      | 83       | 0                    |

Per operator: Police ≈ 11 draws / 32k triangles (body 19.4k + M4 12.3k), Terrorist ≈ 13 draws /
11k. JS per frame is small: the profile with nine operators is > 95% idle in software rendering;
no frame-loop hot spot.

For scale, the 1v1 full game on a real GPU (RTX 2050, 1080p, 2026-11-02): Lost Trail
184–191 draws / 383–391k triangles at 144 fps (GPU p95 1.5–1.8 ms). A Sandgate frame with nine
operators in view is in the same range.

## Remaining (measured, not changed)

1. **Real-GPU numbers for Sandgate 5v5** — not measured. Run the Sandgate GPU Benchmark artifact
   on the laptop (window visible and focused).
2. **Police operator body: 19.4k triangles, 3 draws, 2K textures.** Five on a side. A simplified
   world LOD (as for the rifles) would cut ~50k triangles with every Police in view. Not done:
   it touches the skinned character the 1v1 shares.
3. **Operator draw calls (11–13 each).** The rifle stays split into its animated parts
   (magazine, charging handle). Merging the static parts would bring each operator to ~5–6.
4. **Sandgate texture memory ≈ 244 MB** (Lost Trail 117 MB), file 10 MB (Lost Trail 3 MB). Fine on
   a 4 GB GPU; on integrated graphics and slow connections, 1K textures on secondary surfaces
   would roughly halve both. Kept for now: the plan asked for a higher texture standard.
5. **Snapshot bandwidth ≈ 97 KB/s per player** (≈ 1 MB/s per full room). ~40% of each snapshot is
   scoreboard data that rarely changes (names, kills, deaths); sending it only on change would
   cut that. Not a bottleneck on normal connections.
6. **Room tick max 36 ms** once in 8 minutes with 10 humans (garbage collection). Not repeatable
   at p99.
