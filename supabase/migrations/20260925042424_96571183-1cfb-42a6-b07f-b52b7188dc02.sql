DO $$
DECLARE r jsonb; s crypto_settings;
BEGIN
  SELECT * INTO s FROM crypto_settings FOR UPDATE;
  IF NOT s.watch_only OR s.withdrawals_enabled OR s.real_play_enabled THEN
    RAISE EXCEPTION 'unexpected settings before controlled credit';
  END IF;
  IF (SELECT status FROM crypto_deposits WHERE id='8ea66488-f2ed-4c7a-abda-79d9d079c06f') <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'deposit not CONFIRMED';
  END IF;
  UPDATE crypto_settings SET watch_only = false;
  r := public.crypto_credit_deposit('8ea66488-f2ed-4c7a-abda-79d9d079c06f'::uuid, NULL);
  UPDATE crypto_settings SET watch_only = true;
  IF r->>'status' <> 'CREDITED' OR (r->>'cents')::bigint <> 450 THEN
    RAISE EXCEPTION 'controlled credit failed: %', r;
  END IF;
END $$;