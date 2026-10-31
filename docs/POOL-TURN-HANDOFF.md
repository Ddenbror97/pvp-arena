# Confirmed-shot replay handoff

A human opponent's accepted shot could leave the receiving browser stuck on
“Balls moving” after the animation ended. The database had already transferred
the turn, but `frames` still blocked cue input on that browser. A later timeout
discarded the held picture and abruptly exposed the newer authoritative rack.

The received-event path reused optimistic-preview bookkeeping without marking
the replay as server-confirmed. Its completion callback therefore waited for a
second acknowledgement. Polls returning the same state hash did not rerun the
effect, so that acknowledgement never arrived. The shooting browser used the
optimistic acknowledgement branch and could show a different picture.

Received replays now verify the accepted event hash and mark confirmation before
playing. Animation completion releases the cue immediately. An invalid local
reconstruction is discarded in favor of the authoritative table rather than
holding an unverified picture. Optimistic local shots still wait for the actual
server acknowledgement; turn authorization, physics, shot clocks and settlement
rules are unchanged. No database migration or historical match rewrite is needed.

`pool-turn-handoff.spec.ts` runs only with explicit isolated-staging opt-in and
uses two authenticated browser contexts, normal mouse gestures, actual shot RPCs
and polling. It waits for the remote animation to begin and end on each browser,
then verifies that the second player's shot is accepted. Its clock is scoped to
the test match, and teardown forfeits only that synthetic staging match.

The unchanged hosted build reproduced the first remote replay remaining locked
beyond 18 seconds. The fixed build passed the two-player exchange. The unit suite
passed 707 tests; accepted replay hash checks cover both v7 and v8 physics.
