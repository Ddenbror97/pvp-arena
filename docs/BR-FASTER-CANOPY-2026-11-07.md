# Faster parachute glide — 2026-11-07

## Research and tuning

Reviewed Activision's official [Warzone Parachute Techniques](https://blog.activision.com/call-of-duty/2020-05/Warzone-Parachute-Techniques) guide. It explains choosing a landing point, glide versus rapid descent, free-look and a controlled landing; it does not publish exact comparable flight constants. The following are Project Island tuning choices, informed by that control separation.

- Full forward glide: 13 → 18 m/s (46.8 → 64.8 km/h, +38.5%).
- Neutral cruise: 8 → 11 m/s.
- Dive forward speed: 22 → 26 m/s. Dive sink rate remains 34 m/s.
- Cruise turning: 0.96 → 1.28 rad/s, preserving approximately the previous turning radius (13.5 → 14.1 m) at the faster cruise speed.
- Forward response: time constant 0.45 → 0.33 s. Active S braking has a separate 0.22 s response; the original 3 m/s precision approach speed remains.
- Glide descent, flare/recovery heights, vertical dive recovery, mouse/free-look controls, plane timing and ground movement remain unchanged. No parachute-cut mechanic added.

All flight physics stays in shared `stepDrop`, used by the authoritative Worker and client replay. No per-frame rendering complexity is added. The 5:1 steady glide ratio gives a theoretical 1.5 km reach from 300 m / 4 km from 800 m before accounting for deployment, turns, obstacles and terrain.

## Validation and release

32 flight, canopy-look, prediction-replay and input-continuity tests pass. This includes real island land/roof/water transitions and bot drop plans. Additional flat-world checks verify 64.8 km/h without diagonal boosts, stopping below 5 m/s within 0.51 s and under 5 m of travel, and exact replay across steering/braking/dive inputs.

Two real Durable Object tests pass: stale gameplay rules are refused, and two players jump and see each other's parachutes while forged state/early jumps are rejected.

Native Chrome mouse/keyboard verification exercises full forward glide, a right turn, right-drag free-look without changing flight course, and active braking. Raw predicted position leads the dev simulator's authoritative position by its unacknowledged input window; the check accounts for that lead rather than treating it as reconciliation error. The deterministic replay test compares equal simulation times.

BR rules version increases to 5: deploy site and match Worker together using the generated production config. Older clients must reload before BR admission. No database migration. BR remains admin-only; aim-map and Bomb Defusal physics are unchanged.
