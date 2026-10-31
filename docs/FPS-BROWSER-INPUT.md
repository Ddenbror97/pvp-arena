# Browser input and AK-47 release

## Changes

- Integrate horizontal camera movement every display frame using the same collision rules as prediction. Keep fixed-step network commands, server aim, damage and results authoritative. Bound cosmetic reconciliation to 15 cm and snap respawns.
- Prefer raw pointer movement and fall back to ordinary pointer capture only when raw movement is unsupported. Permission errors still reject.
- Stop traversing the static arena's world transforms every frame; explicitly update the camera and visible character rig. Keep the independent weapon pass and existing antialiasing.
- Request a desynchronized WebGL2 context where supported. This is a browser hint, not a guarantee of physical input latency.
- Reduce drawing in an unfocused window to at most 15 frames per second. Continue processing snapshots and neutral fixed-step commands when the browser schedules animation callbacks. Browser suspension of hidden tabs remains outside application control.
- Adjust resolution when more than 5% of a 1.5-second sample exceeds 18.5 ms. Retain the existing resolution floor and slow quality recovery.
- Present first-shot muzzle, weapon kick and audio immediately on an eligible click. Retain a short tap until one command is sent. Match confirmation by shot sequence to avoid duplicate feedback. Cosmetic prediction cannot award a hit or change ammunition, fire rate or damage.
- Spawn new combat-v2 matches with 100 server-owned Kevlar. Torso damage retains 77.5% of this game's existing unarmored damage, rounded down; each armor point can absorb two damage. AK-47 chest/stomach damage becomes 26/23, while head/legs remain 50/20. Vests replenish each round. Checkpoints without `armorVersion` retain their original damage rules.

## Counter-Strike reference and deliberate differences

Valve's published AK-47 game data, mirrored in [GameTracking-CS2](https://github.com/SteamDatabase/GameTracking-CS2/blob/master/game/csgo/pak01_dir/scripts/weapons.vdata), records 36 damage, a 1.55 armor ratio, full automatic fire and a 0.1-second cycle. This game's vest uses the corresponding 0.775 health penetration factor. Its pre-existing damage tuning and two-headshot rule are retained; it does not copy Counter-Strike's one-hit AK headshots, stomach multiplier, weapon economy or penetration through cover. [Valve's recovery explanation](https://blog.counter-strike.net/second-shot/) supports keeping distinct tap, burst and spray recovery.

## Validation scope

Unit tests cover collision, camera integration, pointer API fallback, damage/armor exhaustion, legacy checkpoints, armor reset and feedback eligibility/deduplication. Real-renderer browser tests exercise movement with mouse look and delayed snapshots, focus/resume, brief taps, audio deduplication, culling and six bot rounds.

Chrome and Edge tests use installed browser channels. Firefox uses Playwright's patched Firefox. Tests run serially to avoid global pointer-capture and GPU contention. Synthetic mouse events measure scheduling behavior, not physical mouse-to-photon latency. Results depend on the workstation and display; they do not certify every driver or machine.

Windows Playwright WebKit passes rendering, focus throttling and capture-error handling. Its MiniBrowser rejects real pointer capture even on an isolated canvas, so native Safari gameplay requires a macOS test. No simulated pointer lock is used to claim a pass.

Release artifacts are retained in ignored `test-results/browser-*` directories. Production verification uses private, zero-stake QA accounts; hosted staging settlement uses only the synthetic test ledger. No customer withdrawal or paid production wager is initiated.
