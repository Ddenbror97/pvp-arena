# Supplied C4 keypad and explosion recordings — 2026-11-03

The owner-supplied keypad recording is sliced into three 85 ms keypress variants and played by the existing `press:*` C4 animation cues. Both the Terrorist plant and Police defuse use the same cues, including the kit's faster defuse. There is no long typing loop to continue after cancellation or completion. Confirmation and handling cues remain separate.

The owner-supplied explosion replaces the generated C4 blast once decoded. Leading silence is removed, its natural tail is retained (2.541 s), and the mono sample is normalized to a 0.94 peak: +11.86 dB relative to the downmixed source. Playback respects game volume/mute and uses the existing compressor. No source samples clip. Failed downloads retain the generated fallback.

All four WAV files are loaded only with Bomb Defusal audio; the 1v1 sound set and HE grenade blast are unchanged. No database, damage, countdown, plant or defuse timing changes.

Rebuild from the original files:

```
node scripts/fps/import-c4-recordings.mjs "<keypad recording.mp3>" "<explosion recording.mp3>"
```

Validation: `node scripts/fps/bomb-harness/c4-audio.mjs` checks decoding and actual buffer playback in Chromium and Firefox, three keypad cues, the boosted explosion, mute behaviour and no Bomb recording downloads in 1v1. C4 animation and Bomb rules tests, typecheck and the configured production build also pass.

Release: app only. Build with the production VITE environment loaded, run the production config guard, deploy the site, then verify audio asset hashes and hydrated homepage/game entry routes.
