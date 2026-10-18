-- A draw refund is one ledger transaction. Every awarded bonus on that match
-- records that same return_tx_id. The unique constraint rejected the second
-- event, the settle savepoint rolled the refund back, and retries hit the
-- same constraint, leaving both stakes locked in SETTLEMENT.
-- The RETURNED check still requires a return transaction. The refund itself
-- stays idempotent on slot:{game}:draw.

alter table public.slot_bonus_events
  drop constraint if exists slot_bonus_events_return_tx_id_key;
