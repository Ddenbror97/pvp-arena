-- Cover the FPS ledger's remaining foreign-key lookups without changing money or permissions.
create index if not exists fps_audit_ledger_tx_idx on public.fps_audit(ledger_tx_id);
create index if not exists fps_entries_ledger_tx_idx on public.fps_entries(ledger_tx_id);
create index if not exists fps_matches_rematch_idx on public.fps_matches(rematch_id);
create index if not exists fps_matches_winner_idx on public.fps_matches(winner_id);
create index if not exists fps_result_intents_winner_idx on public.fps_result_intents(winner_id);
