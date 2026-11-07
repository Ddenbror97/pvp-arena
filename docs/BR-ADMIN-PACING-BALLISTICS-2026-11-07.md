# Project Island admin preview, pacing and ballistics — 2026-11-07

## Release behavior

Battle Royale is an admin preview. The public lobby shows **Coming soon**, while database admins can enter. UI gating is backed by server admission and a fresh match-Worker role lookup; a previously issued ticket is insufficient. Roles come from `public.has_role`, never editable account metadata. Other practice and cash modes keep their existing access rules. The reported cash-creation failure was withdrawn by the user; no financial function or database schema was changed.

New matches fly for 50 seconds. The first circle is withheld from every client until the flight finishes, including early jumpers and spectators. The eight-phase full closing schedule is 27m30s after takeoff, or 28m30s including the warm-up. A surviving winner can end the match earlier. Existing checkpoints retain their original route and zone clock; legacy checkpoints restore the previous 30-second route and 1,330-second zone schedule.

The central reload countdown is removed; ammunition, reload animation, reload sound and the small RELOADING state remain. Healing retains its progress indicator. Long luminous shot streaks are removed, including their geometry and per-frame lifetime updates. Muzzle flashes and shot sounds remain.

## Research and original BR tuning

Primary references:

- [PUBG Support: ballistics](https://support.pubg.com/hc/en-us/articles/115004202434-How-are-the-ballistics-applied): gravity causes distance-dependent drop.
- [PUBG Update 42.1](https://pubg.com/en/news/10179?category=patch_notes): velocity changes affect moving-target engagement and drop.
- [Activision: Ready, Aim, Fire](https://blog.activision.com/ru/call-of-duty/2019-10/The-Basics-of-Call-of-Duty-Modern-Warfare-Ready-Aim-Fire): hip fire offers immediate close-range response, while ADS improves accuracy at range; recoil still needs control.
- [Warzone Season 02 Reloaded](https://www.callofduty.com/patchnotes/2026/03/call-of-duty-bo7-warzone-season-02-reloaded-patch-notes): bullet velocity/drop are independently tuned gameplay properties.

These sources establish behavior, not a complete transferable formula. The implementation uses original tuning, not a claim to reproduce PUBG, H1Z1 or Warzone exactly. Scope is the three Battle Royale rifles (AK-47, M4, AWP), not arena cash weapon balance.

BR muzzle velocities are AK 715 m/s, M4 880 m/s and AWP 900 m/s, with gravity 9.81 m/s². For a level shot without drag or zeroing, time is distance / velocity and drop is 0.5 × gravity × time². At 300 m this gives roughly 0.86 m / 0.57 m / 0.55 m drop respectively. Existing maximum weapon reaches remain enforced.

Stationary rifle hip spread is 1.2 degrees; settled iron-sight or optic ADS is 0.08 degrees, reached over 180 ms. AWP spread is 2.5 degrees hip / 0.035 degrees settled ADS. Movement, jumping and sustained fire widen the cone; crouching narrows it. Optic magnification does not create an accuracy advantage over settled iron sights. Local sound and recoil feedback still start immediately.

The server advances bounded physical projectiles with swept curved segments and nearest-cover collision. Flight time is real; damage is not an instant hit with a cosmetic delay. Target movement and bounded lag compensation are resolved in the shared simulation. No luminous tracer renderer is needed for these projectiles.

## Rollout

Both artifacts are required. Generate the production configuration while preserving the live Worker variables, Hyperdrive, Durable Object bindings, secret bindings, schedules and observability. Never deploy development `workers/fps/wrangler.jsonc` directly. No database migration is required. BR rules version 2 rejects a mismatched client/server timing contract and asks for a reload.

Validation and deployment evidence are recorded in the release PR and local `.wrangler/br-admin-ballistics-*` reports. Do not claim real-GPU FPS or cross-region latency from server unit benchmarks.
