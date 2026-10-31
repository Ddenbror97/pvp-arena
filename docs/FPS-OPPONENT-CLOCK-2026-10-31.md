# Opponent update clock

The match timer previously awaited `fps_check_sessions` before every simulation
step. A delayed database response held the room's `busy` flag, skipped interval
callbacks, and then advanced several physics steps together. Client interpolation
cannot restore the intermediate poses that this scheduling never transmitted.

Session reads now run beside the fixed clock. A successful read releases only its
captured connection IDs and input sequence watermarks. Commands received after
that capture need a later database read. Expired JWTs and closed/replaced sockets
are filtered on every tick; a failed read clears pending commands and pauses the
room through the existing outage path. Reads remain serialized. Slow reads start
their successor immediately; fast reads are limited by the simulation timer.

Command freshness is measured at the validation request's start, so the RPC's own
wait cannot discard an otherwise fresh command. The eight-command queue, 1200 ms
RPC timeout, hard age bound, fixed movement budget and 200 ms shot rewind cap remain
bounded. A replacement socket's commands wait for its own validation instead of
being discarded against the previous connection's watermark.

## Verification

- Real Durable Object WebSocket regression, with 120 ms session reads: the original
  blocking implementation measured 19.14 simulation ticks/second and failed the
  >27 Hz assertion. The final implementation measured 29.13 Hz, a maximum 76 ms
  snapshot gap, and movement in 87.9% of consecutive snapshots during a continuous
  input stream. These are local fault-injection measurements, not regional player
  latency guarantees. The regression checks clock rate, snapshot gaps and movement.
- All 788 unit tests passed, including revocation, a positive read crossing logout,
  original JWT expiry, transient/prolonged authorization outages, reconnect,
  visibility redaction, authoritative combat and settlement.
- Four Chrome/Firefox browser checks passed for nearby opponent interpolation and
  AK bore/crosshair alignment. These use the isolated renderer fixture.
- TypeScript, changed-file ESLint and diff whitespace checks passed.

This is a shared runtime change for both PvP and Practice. No client interpolation
delay, damage, hitbox, ledger, schema, fee or stake changes are included. Deploy the
runtime after existing rooms drain; rollback is the preceding runtime version
`1dd2c947-e762-47a5-888c-50d8edb62da4` after another drain.
