DO $$
DECLARE r jsonb; s crypto_settings;
BEGIN
  -- Production recorded version 20260925042424, so this body does not run
  -- again there. A fresh database has no such deposit: return before any
  -- settings change or credit.
  IF NOT EXISTS (
    SELECT 1 FROM public.crypto_deposits WHERE id = '8ea66488-f2ed-4c7a-abda-79d9d079c06f'
  ) THEN
    RAISE NOTICE 'skip controlled credit: historical deposit is absent';
    RETURN;
  END IF;
  IF (
    SELECT status FROM public.crypto_deposits WHERE id = '8ea66488-f2ed-4c7a-abda-79d9d079c06f'
  ) = 'CREDITED' THEN
    RAISE NOTICE 'skip controlled credit: deposit already credited';
    RETURN;
  END IF;
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