DO $$
DECLARE r1 jsonb; r2 jsonb; inv jsonb;
BEGIN
  -- Production recorded version 20260925042002 after this cutover, so a later
  -- edit of this file does not run there and does not move balances.
  -- A fresh database does not have the two historical deposits. Skip instead
  -- of inserting them or crediting anyone. When both confirmed, uncredited
  -- deposits are present, the original cutover still runs.
  IF (
    SELECT count(*) FROM public.crypto_deposits
    WHERE tx_hash IN (
      '0xc948435f306a17ee06a42ae73a9233e33b0af77993ed30d9ae13c75278f2d947',
      '0xade51fcf975f1a9227b779afe2e9ddb1d3085ee1ccc71a42b44f0d11ca6e69fc'
    )
      AND status = 'CONFIRMED'
      AND ledger_tx_id IS NULL
  ) IS DISTINCT FROM 2 THEN
    RAISE NOTICE 'skip money cutover: historical deposits are not present';
  ELSE
    r1 := public._money_migrate_v1();
    RAISE NOTICE 'migrate: %', r1;
    inv := public.money_real_invariants();
    RAISE NOTICE 'invariants: %', inv;
    r2 := public._money_finalize_v1();
    RAISE NOTICE 'finalize: %', r2;
    IF public._money_state() <> 'FINALIZED' THEN
      RAISE EXCEPTION 'money migration did not reach FINALIZED: %', public._money_state();
    END IF;
  END IF;
END $$;

CREATE POLICY "No client access to money migrations" ON public.money_migrations
  FOR SELECT TO authenticated USING (false);