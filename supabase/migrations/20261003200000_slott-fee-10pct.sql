-- 10% house fee on new P2P Slott matches. Each match copies fee_bps at creation,
-- so a match already open keeps the fee it was created with. 1000 is the
-- configured maximum (slot_config.fee_bps between 0 and 1000).
update public.slot_config set fee_bps = 1000;
