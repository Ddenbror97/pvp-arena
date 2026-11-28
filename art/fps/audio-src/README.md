# FPS audio sources kept out of the deploy

Files the audio build scripts read or write that no game mode requests (moved out of
`public/fps/audio` by the post-development cleanup, 2026-11-28):

- `awp-bolt-v1.wav`: input of `scripts/fps/build-awp-reload-audio.mjs`.
- `awp-reload-empty-v4.wav`: input of `scripts/fps/build-owner-shell-bolt-audio.mjs`
  (it writes `awp-reload-empty-v5.wav`, the one the game plays).
- `ak-reload-empty-v1.wav`, `ak-reload-tactical-v1.wav`: the synthesised reloads
  `scripts/fps/build-ak-audio.mjs` writes; the game plays the recorded
  `ak-reload-reference-*-v1.wav` instead.
