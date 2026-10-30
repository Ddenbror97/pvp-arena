-- Commit new enum values before RPC bodies use them. No existing game is changed.
alter type public.tx_kind add value if not exists 'fps_entry';
alter type public.tx_kind add value if not exists 'fps_settlement';
alter type public.tx_kind add value if not exists 'fps_refund';
