# Gameplay resilience release — 2026-10-31

## Changes

- AK-47 feedback runs immediately on mouse-down and continues at weapon cadence while held. Delayed authoritative snapshots reconcile predicted audiovisual events without a second bang. Audio samples decode before Ready; resume remains in the user's gesture. Server ammunition, damage, recoil, and fire-rate rules remain authoritative.
- Wall trims, container skins, and crossing braces now have distinct surface depths. Existing instancing is retained; no extra shadow pass or collider change.
- Poker controls and slot status use stable element boundaries around changing text. Browser translation can replace text nodes without React subsequently inserting beside or removing a detached text node. Translation remains available. Generic Button preserves Radix asChild behavior.
- Pool, poker, and slot state reads have an eight-second abort/deadline so existing query recovery can issue a fresh read. This helper is restricted to reads; wagers and payment mutations are not retried through it.

## Reproduction and validation

The supplied screenshot shows the application's error boundary, with browser translation active. Tests replacing text nodes as translation does reproduced insertBefore failures in the actual Poker ActionBar and BuyInDialog and a removeChild failure in the slot status. All three pass after the markup fix under Chrome 6x CPU throttling, with six repeated transitions. This establishes an application compatibility fault consistent with the screenshot; the exact historical exception on the other laptop is unavailable.

Chrome and Firefox passed brief-trigger and held automatic-fire tests with 180 ms delayed snapshots, including actual audio-source starts and no duplicate shot sounds. Both passed surface-depth assertions and rendered views; each completed six bot rounds and movement/look testing.

A complete hosted Chrome-versus-Firefox pool rack passed with 18 accepted shots (nine per seat), ball-in-hand, foul/turn handoffs, interruption/reload recovery, called eight, replay hash verification in both fairness UIs, and exactly one 190-cent synthetic payout plus 10-cent fee. No production wager was used. A later harness correction follows the UI's default legal cue position when the resting cue is illegal.

The combined hosted staging build passes interrupted initial loading and a deliberately stalled first pool_state request followed by automatic recovery. Unit suite: 722 tests pass. TypeScript passes. Database integration suites require an isolated TEST_DATABASE_URL and were not run against production; the unconfigured all-project invocation correctly refused those suites. Changed-source lint passes with development-only Fast Refresh warnings.

## Release scope

Frontend application deployment only. Preserve the existing FPS runtime deployment, Durable Object namespace, secret bindings (including the repaired Base RPC), database migrations, financial configuration, and cash settings. Production verification uses zero-stake private QA and read-only financial/configuration checks. Native Safari gameplay and the girlfriend's physical machine are not directly measured by these tests.
