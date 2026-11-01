# Pool preview and FPS gameplay polish — pending release

Status: local branch codex/fps-match-audio-movement-polish. Do not merge or deploy until the user explicitly releases the hold.

## Changes

- PoolTable has an explicit interactive flag. The lobby disables both canvas gestures and the global cue-overhang listeners, while retaining the rendered cue. Practice and paid tables retain their default controls.
- Newly created human FPS rooms and rematches use BO13, first to seven. The existing sideVersion=1 halftime logic switches sides after round six, once, without swapping player identity or scores. UI, product explanations, relevant guides, and public-result parsing reflect this format.
- Migration 20261101232818 expands both match and immutable result-intent score constraints. Missing the latter would prevent a seven-win result from being recorded before payout. Session, ledger, self-exclusion, balance, stake, fee, and function privileges are preserved.
- Existing BO5/BO9 rooms remain unchanged and can be explicitly joined and settled. Existing idempotency receipts still replay. Old clients cannot create new short rooms; a stale short rematch invitation cannot charge under the new BO13 confirmation. No historical scores are rewritten.
- Remote footsteps carry server simulation time and a coarse audible bearing, without exposing source coordinates. They wait for the rendered opponent timeline, and stereo direction follows current local camera yaw rather than the last server yaw. Duplicates and stale background/reconnect cues are discarded. Shift walking remains silent; crouching remains quiet; local volume reduction remains.
- Wood and metal boot responses are baked once from the existing recorded footsteps, using damping and material resonances rather than pitch alone. Four variations per surface, no extra asset requests, at most 24 voices and 12 pending steps. Spatial updates run only while needed; synthesis does not run in the render loop.
- Shared jump impulse is 6.8 m/s with 14 m/s² gravity: approximately 1.54 m clearance at the fixed tick. Tested on 1.3/1.45 m crates; 2.2 m cover remains inaccessible from the ground. A takeoff cannot receive an additional stair boost. Existing continuous vertical presentation is retained.
- World rifles omit the POV rig and loose sleeves/watch. Opponent wrists use weapon-space orientations with per-source knuckle-basis correction; cached finger poses cover both Mixamo and Valve finger names. Grasp-centre markers are offset to actual character wrists. First-person arms/animations and hit volumes are unchanged.

## Validation

- 473 FPS unit tests passed, with one existing skipped test, excluding the separate Durable Object transport suite.
- All 24 isolated Durable Object WebSocket tests pass. Checks cover BO13 human admission, solo bot autonomy, strict-session behavior and event timestamps. A bot need not enter an idle human's line of sight within twelve seconds: the autonomy check now uses server-generated, coordinate-redacted footsteps.
- Browser checks cover read-only lobby gestures (including outside-table cue dragging), playable Pool Practice on desktop/mobile, audio timeline/panning, original first-person assets, both character rigs, and both rifles at close range. Wrist-to-grasp separation is checked through crouch, pitch and reload states. Screenshots are under test-results/fps-close-world-A.png and fps-close-world-B.png.
- Supabase staging rehearsal rolls back all synthetic entries, result intents and payouts. Checks cover legacy retries/join/settlement, new-room restrictions, BO13 create/rematch, rejection of six-win finals, exactly-once 7–6 settlement, unchanged 5% fee, ACLs and financial invariants.
- The migration was temporarily applied to the isolated test project before the release hold, then removed/restored to match its currently deployed app. The final rehearsal is transaction-only. Production database and deployments were not changed.
- TypeScript, edited-file lint, local production build and the guide validator pass. All 1,212 guides validate; existing missing-source warnings remain recorded rather than filled with invented citations.

- Hosted two-user acceptance is held with deployment; it has not been claimed as completed for this branch. The release entry test now asserts BO13 from both the live snapshot and stored room.

## Eventual release

The migration, website and match server must ship together, after existing matches finish. The migration is backward-compatible with historical rooms but new clients must not reach the old BO5/BO9 runtime/database. Use the repository's protected production configuration preparation and verification workflow; preserve financial flags and restricted session access. This note is not authorization to deploy.
