# Live human anti-cheat calibration

## Behaviour

All three server-authoritative modes save cumulative calibration samples during play. Kills request a save, coalesced at most once per five seconds; other observations save every 30 seconds. Disconnect and completion request a save immediately. Requests run through waitUntil, never awaited by simulation or snapshots. Failed requests retain their newest pending sample for a bounded retry on the next checkpoint. A sudden room/process loss can lose observations since the last successful checkpoint; already persisted samples remain usable.

Only human-controlled actors contribute aim statistics and kills. Before 5v5 hands a seat back to a bot, it captures the departing human and clears their aim/protocol tally. BR captures disconnects immediately and clears the human's aim/canary/protocol tally when its reconnect window expires. A returning human after takeover gets a new segment; a normal reconnect within the BR grace period continues the existing segment. Worker restarts also create a new segment instead of overwriting earlier observations.

Each segment stores its latest cumulative payload, including shots/misses, hits/head hits, kills, aim families, canary context and protocol counts. Sequence and non-regressing counter checks make duplicate/out-of-order requests safe. Reports read during play use a non-mutating spray snapshot.

## Calibration versus enforcement

The new fps_ac_progress table is calibration-only. It does not call the evaluator, increment account match votes, or issue restrictions. Existing finished-match enforcement submission remains unchanged. Rollout stays in Shadow. Human shots against bots are human samples; bot-controlled shooting is excluded. Do not treat kills, head-hit share or one account as a sufficient calibration population.

fps_ac_calibration is the deduplicated reading surface: one human/match, summing disjoint segments, with historical final reports only when no live segments exist for that match. Do not sum this view with fps_ac_evidence. Raw aim distribution/context remains in progress.detail, per segment; correlations/confidence scores must not be naively added across segments. An early leave is partial, not a match completion. Historical kill counts are unknown and displayed as a dash.

The admin Anti-cheat page shows the latest 100 player/match calibration summaries, including unfinished matches. It refreshes every 30 seconds and uses the existing admin step-up requirement. Raw progress and the view are inaccessible to browser roles; the checkpoint RPC is executable only by service_role. It uses SECURITY DEFINER because production service_role cannot read auth.users, with a fixed search path and browser EXECUTE revoked.

## Validation and rollout

Hosted Supabase TEST: all 12 anti-cheat database integration tests passed, including cumulative/retry ordering, independent restart segments, final-report deduplication, no partial enforcement votes and browser/admin access controls. Focused DB checks repeated after the production permission adjustment. Real workerd tests exercise early leave in 1v1 and 5v5, plus session/reconnect/restart lifecycles in all three modes. Aim/checkpoint tests cover live reads during a spray, queued saves and disabled collection.

Migration: 20261115034727_fps_ac_live_calibration.sql. Apply before deploying both match Workers and the site. No wallet, game rules, movement, world assets, grants to the Hyperdrive session role, or enforcement-mode changes.

Rollback: redeploy the previous site/Worker versions. The additive tables/RPCs can remain; they are inert without the new callers. Do not drop recorded evidence to roll back a deployment.
