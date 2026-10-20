-- New ledger kinds for the house bot bankroll.
-- Postgres will not let the next migration use these values until this one commits.

alter type public.account_kind add value if not exists 'bot_bankroll';
alter type public.tx_kind add value if not exists 'bot_fund';
alter type public.tx_kind add value if not exists 'bot_sweep';
