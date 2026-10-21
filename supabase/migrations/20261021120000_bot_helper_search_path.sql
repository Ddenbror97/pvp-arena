-- The security suite allows one unpinned function: slot_tick_worker, which
-- schema-qualifies every reference. These three helpers are immutable and do
-- not read tables, but they were created without a search_path.
alter function public._poker_bot_bitcount(int) set search_path = public;
alter function public._poker_bot_roll(bigint, int, text, int) set search_path = public;
alter function public._poker_bot_delay_ms(text, int) set search_path = public;
